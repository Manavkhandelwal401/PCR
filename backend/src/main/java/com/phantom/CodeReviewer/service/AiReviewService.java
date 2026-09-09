package com.phantom.CodeReviewer.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpStatusCodeException;
import org.springframework.web.client.RestTemplate;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import java.util.*;
import java.util.concurrent.atomic.AtomicInteger;

@Service
public class AiReviewService {

    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;
    private final AtomicInteger keyIndex = new AtomicInteger(0);

    @Value("${groq.api.key}")
    private String[] groqApiKeys;

    @Value("${groq.api.url}")
    private String groqApiUrl;

    @Value("${groq.model:openai/gpt-oss-120b}")
    private String primaryModel;

    @Value("${groq.fallback-model:llama-3.1-8b-instant}")
    private String fallbackModel;

    @Value("${groq.safe-tpm-limit:10000}")
    private int groqSafeTpmLimit;

    @Value("${groq.rpm.limit:30}")
    private int groqRpmLimit;

    @Value("${groq.max-chunk-tokens:2000}")
    private int maxChunkTokens;

    @Value("${groq.max-response-tokens:600}")
    private int maxResponseTokens;

    public static final String ENGINE_VERSION = "v2.2";

    public AiReviewService(
            RestTemplate restTemplate,
            ObjectMapper objectMapper,
            @org.springframework.beans.factory.annotation.Qualifier("aiTaskExecutor") java.util.concurrent.Executor aiTaskExecutor
    ) {
        this.restTemplate = restTemplate;
        this.objectMapper = objectMapper;
    }

    public String getEngineVersion() {
        return ENGINE_VERSION;
    }

    // =====================================================================
    // GLOBAL THREAD-SAFE RATE LIMITER (Organization-wide shared token budget)
    // =====================================================================
    /**
     * Shared organization-level limiter.
     * Enforces that ALL AI calls combined across all threads stay strictly under groqSafeTpmLimit
     * and groqRpmLimit over a 60-second sliding window.
     */
    private final Object rateLimiterLock = new Object();
    private final Queue<Long> requestTimestamps = new LinkedList<>();
    private final Queue<TokenStamp> tokenTimestamps = new LinkedList<>();

    private record TokenStamp(long timestamp, int tokens) {}

    /**
     * Acquires budget for a request.
     * Throws IllegalStateException immediately if the request itself can NEVER fit in the safe TPM budget.
     * If it can fit, waits up to maxWaitMs (45 seconds) for the sliding window to clear tokens.
     */
    private void acquireRateLimitBudget(int totalEstimatedCost) {
        final long WINDOW_MS = 60_000L;

        // If the request itself exceeds the entire safe per-request/minute budget, fail immediately.
        if (totalEstimatedCost > groqSafeTpmLimit) {
            System.err.println("--> [AI-REVIEW] [RATE-LIMIT] Request cost (" + totalEstimatedCost +
                    " tokens) exceeds safe organization ceiling (" + groqSafeTpmLimit + "). Failing immediately.");
            throw new IllegalStateException("Input too large for current AI review budget (" + totalEstimatedCost + " > " + groqSafeTpmLimit + ").");
        }

        long waitStartTime = System.currentTimeMillis();
        long lastLogTime = 0;

        synchronized (rateLimiterLock) {
            while (true) {
                long now = System.currentTimeMillis();

                // Prune expired entries older than 60s
                long cutoff = now - WINDOW_MS;
                while (!requestTimestamps.isEmpty() && requestTimestamps.peek() < cutoff) {
                    requestTimestamps.poll();
                }
                while (!tokenTimestamps.isEmpty() && tokenTimestamps.peek().timestamp() < cutoff) {
                    tokenTimestamps.poll();
                }

                // Calculate current token consumption in the active 60s sliding window
                int currentTokensInWindow = 0;
                for (TokenStamp ts : tokenTimestamps) {
                    currentTokensInWindow += ts.tokens();
                }

                // Check if request fits within the safe limits (RPM & safe TPM)
                if (requestTimestamps.size() < groqRpmLimit &&
                        (currentTokensInWindow + totalEstimatedCost) <= groqSafeTpmLimit) {
                    // Allowed: record consumption, notify any other waiting callers, and proceed
                    requestTimestamps.add(now);
                    tokenTimestamps.add(new TokenStamp(now, totalEstimatedCost));
                    rateLimiterLock.notifyAll();
                    return;
                }

                // Determine required wait time based on oldest token or request entry
                long oldestTimestamp = now;
                if (!requestTimestamps.isEmpty()) {
                    oldestTimestamp = Math.min(oldestTimestamp, requestTimestamps.peek());
                }
                if (!tokenTimestamps.isEmpty()) {
                    oldestTimestamp = Math.min(oldestTimestamp, tokenTimestamps.peek().timestamp());
                }

                long timeToOldestExpire = Math.max(50L, (oldestTimestamp + WINDOW_MS) - now + 50L);
                // Bounded cooperative wait (100ms - 2000ms): releases lock, prevents thread lockup,
                // and wakes periodically to check window availability and token drain.
                long sleepDuration = Math.max(100L, Math.min(timeToOldestExpire, 2000L));

                if (now - lastLogTime > 10_000L) {
                    long totalWaitSec = (now - waitStartTime) / 1000L;
                    System.out.println("--> [AI-REVIEW] [RATE-LIMIT] Window full (used: " + currentTokensInWindow +
                            ", requested: " + totalEstimatedCost + ", ceiling: " + groqSafeTpmLimit +
                            "). Cooperatively waiting across windows (" + totalWaitSec + "s elapsed, next slice: " + sleepDuration + " ms)...");
                    lastLogTime = now;
                }

                try {
                    rateLimiterLock.wait(sleepDuration);
                } catch (InterruptedException ie) {
                    Thread.currentThread().interrupt();
                    throw new RuntimeException("AI review interrupted while waiting for rate limit window", ie);
                }
            }
        }
    }

    // =====================================================================
    // DETERMINISTIC LINE-BOUNDARY CHUNKING
    // =====================================================================
    public record SourceChunk(int chunkNumber, int totalChunks, int startLine, int endLine, String content) {}

    /**
     * Splits source content into deterministic chunks on line boundaries.
     * Preserves ~10 lines of overlap between adjacent chunks to maintain context across boundaries.
     * Guaranteed that every single line of the file is included without dropping code.
     * NOTE: Takes pure source code content (without file headers) so line numbering matches the actual file lines 1:1.
     */
    public List<SourceChunk> createDeterministicChunks(String pureContent, String filePath) {
        List<SourceChunk> chunks = new ArrayList<>();
        if (pureContent == null || pureContent.isBlank()) {
            return chunks;
        }

        String[] lines = pureContent.split("\r?\n", -1);
        int totalLines = lines.length;

        // Approximate ~3.0 characters per token for code.
        // maxChunkTokens is 1800, so max characters per chunk is roughly ~5,400 chars
        int targetCharLimit = Math.max(1500, maxChunkTokens * 3);
        int overlapLineCount = 10;

        int currentLine = 0;
        List<int[]> ranges = new ArrayList<>();

        while (currentLine < totalLines) {
            int chunkStart = currentLine;
            int chunkEnd = chunkStart;
            int currentChunkChars = 0;

            while (chunkEnd < totalLines) {
                int lineLen = lines[chunkEnd].length() + 1; // +1 for newline
                if (currentChunkChars + lineLen > targetCharLimit && chunkEnd > chunkStart) {
                    break;
                }
                currentChunkChars += lineLen;
                chunkEnd++;
            }

            ranges.add(new int[]{chunkStart, chunkEnd});

            if (chunkEnd >= totalLines) {
                break;
            }

            // Next chunk starts overlapLineCount lines before chunkEnd to preserve cross-boundary semantics
            int nextStart = Math.max(chunkStart + 1, chunkEnd - overlapLineCount);
            currentLine = nextStart;
        }

        int totalChunks = ranges.size();
        for (int i = 0; i < totalChunks; i++) {
            int startIdx = ranges.get(i)[0];
            int endIdx = ranges.get(i)[1];

            StringBuilder sb = new StringBuilder();
            for (int l = startIdx; l < endIdx; l++) {
                // Prepend exact file line number (1-indexed) so AI can cite exact line numbers in its report
                sb.append(String.format("%4d | %s\n", l + 1, lines[l]));
            }

            // 1-indexed line numbers for human and AI reference
            chunks.add(new SourceChunk(i + 1, totalChunks, startIdx + 1, endIdx, sb.toString()));
        }

        return chunks;
    }

    // =====================================================================
    // MAIN REVIEW ENTRYPOINT (Guarantees COMPLETE file analysis)
    // =====================================================================
    public AiReviewResponse reviewCode(String codeDiff) {
        return reviewCode(codeDiff, null);
    }

    public AiReviewResponse reviewCode(String codeDiff, java.util.function.BiConsumer<Integer, Integer> chunkProgressCallback) {
        return reviewSingleFileUnified(codeDiff, chunkProgressCallback);
    }

    // =====================================================================
    // UNIFIED MULTI-PERSPECTIVE INSPECTION (Manual Single-File & Local Upload)
    // 1 LLM call per chunk covering 4 perspectives (Logic, Syntax, Performance, Security).
    // Review all chunks, deduplicate findings, then run final metrics.
    // =====================================================================
    public AiReviewResponse reviewSingleFileUnified(String codeDiff, java.util.function.BiConsumer<Integer, Integer> chunkProgressCallback) {
        long startTime = System.currentTimeMillis();
        System.out.println("--> [AI-REVIEW-UNIFIED] Manual inspection started. Payload size: " + (codeDiff != null ? codeDiff.length() : 0) + " chars.");

        if (codeDiff == null || codeDiff.isBlank()) {
            return new AiReviewResponse("No source code or diff provided for analysis.", "Unknown", 0, false);
        }

        // Separate file header from raw code diff to avoid shifting source line numbers
        String filePath = "source_file";
        String pureCode = codeDiff;
        java.util.regex.Matcher fnMatcher = java.util.regex.Pattern.compile("^--- File: ([^\\n\\r]+) ---\\r?\\n").matcher(codeDiff);
        if (fnMatcher.find()) {
            filePath = fnMatcher.group(1).trim();
            pureCode = codeDiff.substring(fnMatcher.end()); // Strip header line so pureCode begins on actual line 1
        }

        // Step 1: Create deterministic line-boundary chunks on pure code (1:1 line numbers)
        List<SourceChunk> chunks = createDeterministicChunks(pureCode, filePath);
        if (chunks.isEmpty()) {
            return new AiReviewResponse("Empty code payload.", "Unknown", 0, false);
        }

        System.out.println("--> [AI-REVIEW-UNIFIED] Partitioned file into " + chunks.size() +
                " deterministic chunk(s). Selected model: " + primaryModel);

        // Structured findings bucket across all chunks
        List<FindingDetail> rawFindings = new ArrayList<>();

        try {
            // Step 2: Process EVERY chunk sequentially using the unified 4-perspective prompt
            for (SourceChunk chunk : chunks) {
                if (chunkProgressCallback != null) {
                    try {
                        chunkProgressCallback.accept(chunk.chunkNumber(), chunk.totalChunks());
                    } catch (Exception ignored) {}
                }
                System.out.println("--> [AI-REVIEW-UNIFIED] Processing Chunk " + chunk.chunkNumber() + "/" + chunk.totalChunks() +
                        " (Lines " + chunk.startLine() + "-" + chunk.endLine() + ") via unified multi-perspective inspection...");

                String chunkHeader = "--- File: " + filePath + " ---\n" +
                        "[Chunk " + chunk.chunkNumber() + " of " + chunk.totalChunks() + "]\n" +
                        "[Lines " + chunk.startLine() + "-" + chunk.endLine() + "]\n";
                String chunkPayload = chunkHeader + chunk.content();

                String unifiedPrompt = "You are a Principal Software Engineer performing a rigorous production code review.\n" +
                        "REVIEW PRINCIPLE:\n" +
                        "- Be conservative and evidence-based. Report ONLY defects that genuinely cause incorrect behavior, wrong output, runtime crashes, type errors, data corruption, security holes, concurrency issues, resource leaks, or catastrophic algorithmic bottlenecks.\n" +
                        "- Do NOT report personal stylistic preferences, missing comments, minor formatting, or speculative framework issues unless provable.\n" +
                        "CRITICAL OUTPUT FORMAT:\n" +
                        "1. Each line of code in the inspection payload is numbered (e.g. ' 42 | ...'). You MUST specify the line or line range where the issue occurs!\n" +
                        "   IMPORTANT: If the same underlying issue applies across consecutive lines (e.g. lines 297, 298, 299, 300 all have the same unhandled storage call), group them into a single line range: `[Lines 297-300]` instead of repeating the same review bullet across separate lines!\n" +
                        "2. You MUST categorize findings under exactly these four section headers:\n" +
                        "   [LOGIC FINDINGS]\n" +
                        "   [SYNTAX FINDINGS]\n" +
                        "   [PERFORMANCE FINDINGS]\n" +
                        "   [SECURITY FINDINGS]\n" +
                        "3. Under each header, list findings as concise 1-liner bullet points with an EXPLICIT severity tag [Severity: CRITICAL|HIGH|MODERATE].\n" +
                        "   Exact Format:\n" +
                        "   - **[Line <number> OR Lines <start-end> / Target] [Severity: CRITICAL|HIGH|MODERATE]**: [Specific defect description] -> [Runtime impact].\n" +
                        "4. Choose severity objectively:\n" +
                        "   - CRITICAL: Remote code execution, SQL/command injection, authentication/authorization bypass, credential leaks, direct data corruption/loss, unhandled fatal crash.\n" +
                        "   - HIGH: Compilation/syntax errors, wrong calculation logic, broken state mutation, race condition, severe OOM/resource leak.\n" +
                        "   - MODERATE: Minor edge case, non-fatal performance inefficiency, improper resource closure warning.\n" +
                        "5. Do NOT provide multi-line code solutions or boilerplate rewrites. Keep it crisp, factual, and impact-focused.\n" +
                        "6. If no genuine defects exist for a category, output ONLY '✅ No issues.' under that header.\n" +
                        "7. Zero conversational preamble, zero markdown wrappers (no ```).\n\n" +
                        "Code to Inspect:\n" + chunkPayload;

                String unifiedResponse = callGroqAgent("UnifiedInspector", unifiedPrompt);
                parseUnifiedSections(unifiedResponse, rawFindings);
            }

            // Step 3: Deduplicate findings across overlapping chunk boundaries
            List<FindingDetail> findings = deduplicateFindings(rawFindings);

            // Format clean structured report
            String formattedLogic = formatFindingsFromDetails(findings, "LOGIC", "✅ No logic issues detected across all sections.");
            String formattedSyntax = formatFindingsFromDetails(findings, "SYNTAX", "✅ No syntax issues detected across all sections.");
            String formattedPerformance = formatFindingsFromDetails(findings, "PERFORMANCE", "✅ No performance issues detected across all sections.");
            String formattedSecurity = formatFindingsFromDetails(findings, "SECURITY", "✅ No security risks detected across all sections.");

            String mergedComment = "### AI Code Reviewer Feedback\n\n" +
                    "#### 1. Completeness & Logic:  \n" + formattedLogic + "\n\n" +
                    "#### 2. Syntax & Compilation: \n" + formattedSyntax + "\n\n" +
                    "#### 3. Clean Code & Performance: \n" + formattedPerformance + "\n\n" +
                    "#### 4. Security & Vulnerabilities: \n" + formattedSecurity;

            // Step 4: Compute Structured Final Metrics on the deduplicated findings
            System.out.println("--> [AI-REVIEW-UNIFIED] Computing final metrics across deduplicated structured findings (" + findings.size() + " defects found)...");
            AiReviewResponse finalMetrics = calculateFinalMetricsFromFindings(mergedComment, findings);

            long totalDuration = System.currentTimeMillis() - startTime;
            System.out.println("--> [AI-REVIEW-UNIFIED] Whole-file review completed successfully in " + totalDuration +
                    " ms. Severity: " + finalMetrics.severity() + ", Rating: " + finalMetrics.qualityRating() + "/10");

            return finalMetrics;

        } catch (Exception e) {
            long failDuration = System.currentTimeMillis() - startTime;
            System.err.println("--> [AI-REVIEW-UNIFIED] Review pipeline failed after " + failDuration + " ms: " + e.getMessage());
            return new AiReviewResponse("Review analysis failed: " + e.getMessage(), "Unknown", 0, false);
        }
    }

    public record FindingDetail(String category, String severity, String target, String description, String impact) {}

    private void parseUnifiedSections(String unifiedOutput,
                                      List<FindingDetail> findings) {
        if (unifiedOutput == null || unifiedOutput.isBlank()) return;

        String currentSection = null;
        String[] lines = unifiedOutput.split("\r?\n");

        for (String rawLine : lines) {
            String line = rawLine.trim();
            if (line.isEmpty()) continue;

            String upper = line.toUpperCase();
            if (upper.contains("[LOGIC") || upper.contains("### 1.") || upper.contains("LOGIC FINDINGS")) {
                currentSection = "LOGIC";
                continue;
            } else if (upper.contains("[SYNTAX") || upper.contains("### 2.") || upper.contains("SYNTAX FINDINGS")) {
                currentSection = "SYNTAX";
                continue;
            } else if (upper.contains("[PERFORMANCE") || upper.contains("### 3.") || upper.contains("PERFORMANCE FINDINGS")) {
                currentSection = "PERFORMANCE";
                continue;
            } else if (upper.contains("[SECURITY") || upper.contains("### 4.") || upper.contains("SECURITY FINDINGS")) {
                currentSection = "SECURITY";
                continue;
            }

            if (currentSection != null) {
                // Ignore headers, conversational prose, and 'No issues' markers
                if (line.contains("✅") || line.toLowerCase().contains("no issues") || 
                    line.toLowerCase().contains("no defects") || line.toLowerCase().contains("none.") ||
                    line.startsWith("#") || line.startsWith("```")) {
                    continue;
                }

                // STRICT PARSER: Must be a bullet point starting with '-' or '*'
                if (!line.startsWith("-") && !line.startsWith("*")) {
                    continue; // Skip random prose
                }

                String cleanBullet = line.replaceFirst("^[-*]\\s*", "").trim();
                if (cleanBullet.isEmpty() || cleanBullet.length() < 10) {
                    continue;
                }

                // Parse Target / Line and Severity explicitly from bracketed tokens:
                // Format expected: **[Line 42] [Severity: HIGH]**: Defect description -> Runtime impact.
                // Or: **[Line 42 / Target] [Severity: CRITICAL]**: ...
                String target = "General";
                String severity = null;

                // 1. Extract explicit [Severity: CRITICAL|HIGH|MODERATE] tag (avoids fragile keyword guessing)
                java.util.regex.Matcher sevMatcher = java.util.regex.Pattern.compile("\\[Severity:\\s*(CRITICAL|HIGH|MODERATE|LOW)\\]", java.util.regex.Pattern.CASE_INSENSITIVE).matcher(cleanBullet);
                if (sevMatcher.find()) {
                    severity = sevMatcher.group(1).toUpperCase();
                }

                // 2. Extract line / target from first bracket: [Line 42] or [Line 42 / Target]
                java.util.regex.Matcher targetMatcher = java.util.regex.Pattern.compile("\\[([^\\]]+)\\]").matcher(cleanBullet);
                if (targetMatcher.find()) {
                    String bracketContent = targetMatcher.group(1).trim();
                    if (!bracketContent.toUpperCase().startsWith("SEVERITY:")) {
                        target = bracketContent;
                    }
                }

                // 3. Extract description & impact after the markdown bold prefix / colon
                String descAndImpact = cleanBullet;
                int colonIdx = cleanBullet.indexOf("]:");
                if (colonIdx != -1) {
                    descAndImpact = cleanBullet.substring(colonIdx + 2).replaceFirst("^\\*\\*?\\s*", "").trim();
                } else {
                    int lastBracket = cleanBullet.lastIndexOf(']');
                    if (lastBracket != -1 && lastBracket + 1 < cleanBullet.length()) {
                        descAndImpact = cleanBullet.substring(lastBracket + 1).replaceFirst("^[:*\\s]+", "").trim();
                    }
                }

                // 4. If AI omitted explicit [Severity: ...] tag, fall back safely based strictly on section defaults (NO prose keyword guessing)
                if (severity == null) {
                    if ("SECURITY".equals(currentSection)) {
                        severity = "HIGH";
                    } else if ("SYNTAX".equals(currentSection)) {
                        severity = "HIGH";
                    } else if ("LOGIC".equals(currentSection)) {
                        severity = "HIGH";
                    } else {
                        severity = "MODERATE";
                    }
                }

                String lineKey = extractLineKey(target);
                findings.add(new FindingDetail(currentSection, severity, lineKey, descAndImpact, cleanBullet));
            }
        }
    }

    private String extractLineKey(String target) {
        if (target == null) return "Unknown";
        // Support ranges like "Lines 297-300" or "Line 297-300"
        java.util.regex.Matcher rangeMatcher = java.util.regex.Pattern.compile("(?:Lines?\\s*)?(\\d+)\\s*-\\s*(\\d+)", java.util.regex.Pattern.CASE_INSENSITIVE).matcher(target);
        if (rangeMatcher.find()) {
            return "Lines " + rangeMatcher.group(1) + "-" + rangeMatcher.group(2);
        }
        // Support single line "Line 42"
        java.util.regex.Matcher m = java.util.regex.Pattern.compile("(?:Line\\s*)?(\\d+)", java.util.regex.Pattern.CASE_INSENSITIVE).matcher(target);
        if (m.find()) {
            return "Line " + m.group(1);
        }
        return target.trim();
    }

    /**
     * Deduplicate findings across overlapping chunks AND consolidate consecutive lines
     * having the identical defect and impact into a single line range (e.g. Lines 297-300).
     */
    private List<FindingDetail> deduplicateFindings(List<FindingDetail> rawFindings) {
        // Step 1: Dedup exact matches across chunk overlap boundaries
        Map<String, FindingDetail> dedupMap = new LinkedHashMap<>();
        for (FindingDetail f : rawFindings) {
            String normDesc = f.description() != null
                    ? f.description().toLowerCase().replaceAll("[^a-z0-9]", "")
                    : "";
            String key = f.category() + "|" + f.target() + "|" + normDesc;

            if (!dedupMap.containsKey(key)) {
                dedupMap.put(key, f);
            }
        }
        List<FindingDetail> uniqueFindings = new ArrayList<>(dedupMap.values());

        // Step 2: Group consecutive findings that share the same category, severity, and normalized description
        List<FindingDetail> consolidated = new ArrayList<>();
        int i = 0;
        while (i < uniqueFindings.size()) {
            FindingDetail current = uniqueFindings.get(i);
            int startLine = parseSingleLineNumber(current.target());

            if (startLine == -1) {
                // Not a single-line target (already a range or non-numbered target)
                consolidated.add(current);
                i++;
                continue;
            }

            String currentNormDesc = current.description() != null
                    ? current.description().toLowerCase().replaceAll("[^a-z0-9]", "")
                    : "";

            int j = i + 1;
            int lastLine = startLine;

            while (j < uniqueFindings.size()) {
                FindingDetail next = uniqueFindings.get(j);
                int nextLine = parseSingleLineNumber(next.target());

                String nextNormDesc = next.description() != null
                        ? next.description().toLowerCase().replaceAll("[^a-z0-9]", "")
                        : "";

                // Check if next finding is consecutive line, same category, same severity, and same issue description
                if (nextLine == lastLine + 1 &&
                        Objects.equals(current.category(), next.category()) &&
                        Objects.equals(current.severity(), next.severity()) &&
                        Objects.equals(currentNormDesc, nextNormDesc)) {
                    lastLine = nextLine;
                    j++;
                } else {
                    break;
                }
            }

            if (lastLine > startLine) {
                // Consolidate consecutive lines into range (e.g. Lines 297-300)
                String rangeTarget = "Lines " + startLine + "-" + lastLine;
                consolidated.add(new FindingDetail(current.category(), current.severity(), rangeTarget, current.description(), current.impact()));
                i = j;
            } else {
                consolidated.add(current);
                i++;
            }
        }

        return consolidated;
    }

    private int parseSingleLineNumber(String target) {
        if (target == null) return -1;
        // If it's already a range like "Lines 297-300", don't treat as single line
        if (target.contains("-")) return -1;
        java.util.regex.Matcher m = java.util.regex.Pattern.compile("(?:Line\\s*)?(\\d+)", java.util.regex.Pattern.CASE_INSENSITIVE).matcher(target.trim());
        if (m.matches()) {
            try {
                return Integer.parseInt(m.group(1));
            } catch (NumberFormatException ignored) {}
        }
        return -1;
    }

    private String formatFindingsFromDetails(List<FindingDetail> findings, String category, String defaultCleanMessage) {
        List<FindingDetail> filtered = findings.stream().filter(f -> f.category().equals(category)).toList();
        if (filtered.isEmpty()) {
            return defaultCleanMessage;
        }
        StringBuilder sb = new StringBuilder();
        for (FindingDetail f : filtered) {
            sb.append("- **[").append(f.target()).append("] [Severity: ").append(f.severity()).append("]**: ").append(f.description()).append("\n");
        }
        return sb.toString().trim();
    }

    // =====================================================================
    // STANDARDIZED METRICS CALCULATION (Deterministic & Structured)
    // =====================================================================
    private AiReviewResponse calculateFinalMetricsFromFindings(String mergedComment, List<FindingDetail> findings) {
        if (findings == null || findings.isEmpty()) {
            return new AiReviewResponse(mergedComment, "GOOD", 10, true, Collections.emptyList());
        }

        long criticalSec = findings.stream().filter(f -> "SECURITY".equals(f.category()) && "CRITICAL".equals(f.severity())).count();
        long highSec = findings.stream().filter(f -> "SECURITY".equals(f.category()) && "HIGH".equals(f.severity())).count();
        long modSec = findings.stream().filter(f -> "SECURITY".equals(f.category()) && "MODERATE".equals(f.severity())).count();

        long syntaxDefects = findings.stream().filter(f -> "SYNTAX".equals(f.category())).count();
        long logicDefects = findings.stream().filter(f -> "LOGIC".equals(f.category())).count();
        long perfDefects = findings.stream().filter(f -> "PERFORMANCE".equals(f.category())).count();

        String severity;
        int qualityRating;

        if (criticalSec > 0) {
            // Uncompromising critical security vulnerabilities (RCE, injection, auth bypass)
            severity = "CRITICAL";
            qualityRating = Math.max(1, 3 - (int) (criticalSec - 1));
        } else if (highSec > 0 || syntaxDefects > 0 || logicDefects >= 1) {
            // High severity: syntax/compile errors, high-risk security, or any genuine logic bugs
            severity = "HIGH";
            int totalDefects = (int) (highSec + syntaxDefects + logicDefects);
            qualityRating = Math.max(3, 6 - totalDefects);
        } else if (modSec > 0 || perfDefects >= 2) {
            // Moderate severity: moderate security flaw or multiple performance bottlenecks
            severity = "MODERATE";
            qualityRating = Math.max(4, 7 - (int) (modSec + perfDefects / 2));
        } else if (perfDefects == 1) {
            // Low-Moderate: single performance/resource inefficiency
            severity = "MODERATE";
            qualityRating = 8;
        } else {
            severity = "GOOD";
            qualityRating = 10;
        }

        System.out.println("--> [AI-REVIEW-METRICS] Structured Assessment: CriticalSec=" + criticalSec +
                ", HighSec=" + highSec + ", Syntax=" + syntaxDefects + ", Logic=" + logicDefects +
                ", Perf=" + perfDefects + ", ModSec=" + modSec + " => Severity=" + severity + ", QualityRating=" + qualityRating + "/10");

        return new AiReviewResponse(mergedComment, severity, qualityRating, true, findings);
    }

    // =====================================================================
    // CORE GROQ CALLER WITH CONSERVATIVE TOKEN ESTIMATE & ERROR HANDLING
    // =====================================================================
    private String callGroqAgent(String agentName, String prompt) {
        if (groqApiKeys == null || groqApiKeys.length == 0) {
            throw new IllegalStateException("Groq API call aborted: No Groq API keys configured.");
        }

        // Conservative token estimate:
        // Input: ~3.0 chars per token for code/instructions + maxResponseTokens reserve
        int estimatedInputTokens = Math.max(50, (prompt.length() / 3) + 50);
        int totalEstimatedBudget = estimatedInputTokens + maxResponseTokens;

        System.out.println("--> [AI-REVIEW] [" + agentName + "] Estimating: " + estimatedInputTokens +
                " input tokens + " + maxResponseTokens + " response reserve = " + totalEstimatedBudget + " tokens.");

        int maxRetries = 3;
        String currentModel = primaryModel;

        for (int attempt = 0; attempt < maxRetries; attempt++) {
            // Enforce shared global organization rate limiter for initial call & each subsequent retry (Fixes #12)
            acquireRateLimitBudget(totalEstimatedBudget);

            String currentKey = groqApiKeys[Math.abs(keyIndex.getAndIncrement() % groqApiKeys.length)].trim();

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.set("Authorization", "Bearer " + currentKey);

            Map<String, Object> message = new HashMap<>();
            message.put("role", "user");
            message.put("content", prompt);

            Map<String, Object> requestBody = new HashMap<>();
            requestBody.put("model", currentModel);
            requestBody.put("messages", Collections.singletonList(message));
            requestBody.put("temperature", 0.0);

            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestBody, headers);

            try {
                ResponseEntity<String> response = restTemplate.postForEntity(groqApiUrl, entity, String.class);

                JsonNode rootNode = objectMapper.readTree(response.getBody());
                String aiText = rootNode.path("choices").get(0)
                        .path("message")
                        .path("content").asText();

                return aiText.trim();

            } catch (HttpStatusCodeException httpEx) {
                int statusCode = httpEx.getStatusCode().value();

                if (statusCode == 413) {
                    System.err.println("--> [AI-REVIEW] [GROQ 413] Payload too large for model " + currentModel);
                    throw new RuntimeException("Provider rejected request: Payload too large for current context limits (HTTP 413).", httpEx);
                }

                if (statusCode == 429) {
                    long waitSeconds = (long) Math.pow(2, attempt + 1);
                    String retryAfter = httpEx.getResponseHeaders() != null ? httpEx.getResponseHeaders().getFirst("retry-after") : null;
                    if (retryAfter != null) {
                        try {
                            waitSeconds = Math.max(1, Long.parseLong(retryAfter.trim()));
                        } catch (Exception ignored) {}
                    }

                    System.err.println("--> [AI-REVIEW] [GROQ 429] Rate limit hit on attempt " + (attempt + 1) +
                            " for model " + currentModel + ". Backing off " + waitSeconds + "s...");

                    if (attempt >= 1 && !fallbackModel.equals(currentModel)) {
                        System.out.println("--> [AI-REVIEW] Switching to fallback model: " + fallbackModel);
                        currentModel = fallbackModel;
                    }

                    if (attempt == maxRetries - 1) {
                        throw new RuntimeException("AI provider rate limit exceeded (HTTP 429). Please try again in a few moments.", httpEx);
                    }

                    try {
                        Thread.sleep(waitSeconds * 1000L);
                    } catch (InterruptedException ie) {
                        Thread.currentThread().interrupt();
                        throw new RuntimeException("Interrupted during rate limit backoff", ie);
                    }
                } else {
                    System.err.println("--> [AI-REVIEW] Groq HTTP error " + statusCode + ": " + httpEx.getResponseBodyAsString());
                    throw new RuntimeException("AI provider HTTP error (" + statusCode + ")", httpEx);
                }
            } catch (Exception e) {
                System.err.println("--> [AI-REVIEW] Groq invocation failed (attempt " + (attempt + 1) + "): " + e.getMessage());
                if (attempt == maxRetries - 1) {
                    throw new RuntimeException("AI provider request failed: " + e.getMessage(), e);
                }
                try {
                    Thread.sleep(1000L * (attempt + 1));
                } catch (InterruptedException ie) {
                    Thread.currentThread().interrupt();
                    throw new RuntimeException("Interrupted during retry backoff", ie);
                }
            }
        }

        throw new RuntimeException("AI provider call exhausted all retry attempts.");
    }

    public record AiReviewResponse(String comment, String severity, int qualityRating, boolean success, List<FindingDetail> findings) {
        public AiReviewResponse(String comment, String severity, int qualityRating) {
            this(comment, severity, qualityRating, true, Collections.emptyList());
        }
        public AiReviewResponse(String comment, String severity, int qualityRating, boolean success) {
            this(comment, severity, qualityRating, success, Collections.emptyList());
        }
    }
}