package com.phantom.CodeReviewer.controller;

import com.phantom.CodeReviewer.entity.Review;
import com.phantom.CodeReviewer.repository.ReviewRepository;
import com.phantom.CodeReviewer.service.AuthService;
import com.phantom.CodeReviewer.service.KafkaProducerService;
import com.phantom.CodeReviewer.service.LocalReviewAsyncService;
import io.jsonwebtoken.Claims;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@RestController
@RequestMapping("/api/v1/reviews")
@RequiredArgsConstructor
@Slf4j
public class ReviewController {

    private final KafkaProducerService kafkaProducerService;
    private final LocalReviewAsyncService localReviewAsyncService;
    private final ReviewRepository reviewRepository;
    private final AuthService authService;

    @Value("${github.app.id:4816887}")
    private Long defaultInstallationId;

    // Pattern to match GitHub PR URLs: https://github.com/:owner/:repo/pull/:prNumber
    private static final Pattern GITHUB_PR_PATTERN =
            Pattern.compile("https?://github\\.com/([^/]+/[^/]+)/pull/(\\d+)(?:/.*)?", Pattern.CASE_INSENSITIVE);

    public record GithubPrRequest(String prUrl) {}

    private String extractEmailFromAuthHeader(String authHeader) {
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            return null;
        }
        try {
            String token = authHeader.substring(7).trim();
            Claims claims = authService.validateToken(token);
            return claims.getSubject() != null ? claims.getSubject().toLowerCase().trim() : null;
        } catch (Exception e) {
            return null;
        }
    }

    /**
     * Submit a GitHub Pull Request URL for automated code inspection.
     * POST /api/v1/reviews/github
     */
    @PostMapping("/github")
    public ResponseEntity<Map<String, Object>> submitGithubPr(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @RequestBody GithubPrRequest request) {

        String userEmail = extractEmailFromAuthHeader(authHeader);
        if (userEmail == null || userEmail.isBlank()) {
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("success", false);
            errorResponse.put("message", "Authentication required. Please sign in to submit a PR for review.");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(errorResponse);
        }

        if (request == null || request.prUrl() == null || request.prUrl().isBlank()) {
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("success", false);
            errorResponse.put("message", "Pull request URL must not be empty.");
            return ResponseEntity.badRequest().body(errorResponse);
        }

        String prUrl = request.prUrl().trim();
        Matcher matcher = GITHUB_PR_PATTERN.matcher(prUrl);

        if (!matcher.find()) {
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("success", false);
            errorResponse.put("message", "Invalid GitHub Pull Request URL format. Expected: https://github.com/{owner}/{repo}/pull/{number}");
            return ResponseEntity.badRequest().body(errorResponse);
        }

        String repositoryName = matcher.group(1);
        long pullRequestNumber = Long.parseLong(matcher.group(2));

        log.info("Extracted PR Metadata - Repo: {}, PR#: {}, User: {}", repositoryName, pullRequestNumber, userEmail);

        // Construct standard GitHub webhook-like payload for KafkaConsumerService
        Map<String, Object> kafkaPayload = new HashMap<>();
        kafkaPayload.put("action", "synchronize");
        if (userEmail != null) {
            kafkaPayload.put("user_email", userEmail);
        }

        Map<String, Object> repoMap = new HashMap<>();
        repoMap.put("full_name", repositoryName);
        kafkaPayload.put("repository", repoMap);

        Map<String, Object> prMap = new HashMap<>();
        prMap.put("number", pullRequestNumber);
        kafkaPayload.put("pull_request", prMap);

        Map<String, Object> installationMap = new HashMap<>();
        installationMap.put("id", defaultInstallationId);
        kafkaPayload.put("installation", installationMap);

        // Dispatch to Kafka topic
        kafkaProducerService.sendWebhookEvent(kafkaPayload);

        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("message", "Review queued successfully. Invariant inspection dispatched via Kafka.");
        response.put("repository", repositoryName);
        response.put("pullRequestNumber", pullRequestNumber);

        return ResponseEntity.status(HttpStatus.ACCEPTED).body(response);
    }

    // Explicit allowlist of source-code and text file extensions supported by the multi-agent AI inspection pipeline
    public static final java.util.Set<String> SUPPORTED_EXTENSIONS = java.util.Set.of(
            "java", "js", "jsx", "ts", "tsx", "py", "go", "c", "cpp", "cc", "h", "hpp",
            "cs", "rs", "php", "rb", "kt", "kts", "swift", "scala", "sql", "sh", "bash",
            "html", "css", "scss", "json", "xml", "yaml", "yml", "properties", "md", "txt"
    );

    private String getFileExtension(String filename) {
        if (filename == null) return "";
        int lastDot = filename.lastIndexOf('.');
        if (lastDot < 0 || lastDot == filename.length() - 1) return "";
        return filename.substring(lastDot + 1).toLowerCase().trim();
    }

    /**
     * Submit local source files for static code inspection.
     * POST /api/v1/reviews/upload
     */
    @PostMapping("/upload")
    public ResponseEntity<Map<String, Object>> submitLocalFiles(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @RequestParam("files") List<MultipartFile> files) {

        String userEmail = extractEmailFromAuthHeader(authHeader);
        if (userEmail == null || userEmail.isBlank()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of(
                    "success", false,
                    "message", "Authentication required. Please sign in to submit files for review."
            ));
        }

        if (files == null || files.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "message", "No files uploaded. Please select at least one file."
            ));
        }

        if (files.size() > 5) {
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "message", "Maximum 5 files allowed per review request."
            ));
        }

        // Validate file extension against allowed source-code/text extensions (Defensive Layer 2)
        for (MultipartFile file : files) {
            String originalFilename = file.getOriginalFilename() != null ? file.getOriginalFilename() : "file";
            String ext = getFileExtension(originalFilename);
            if (ext.isEmpty() || !SUPPORTED_EXTENSIONS.contains(ext)) {
                return ResponseEntity.badRequest().body(Map.of(
                        "success", false,
                        "message", "Unsupported file type: " + originalFilename + ". Please upload a supported source-code/text file."
                ));
            }
        }

        // Validate individual file size (5MB max) and total size (15MB max)
        final long MAX_FILE_SIZE = 5 * 1024 * 1024L;   // 5 MB
        final long MAX_TOTAL_SIZE = 15 * 1024 * 1024L; // 15 MB
        long totalUploadSize = 0;

        for (MultipartFile file : files) {
            if (file.getSize() > MAX_FILE_SIZE) {
                return ResponseEntity.badRequest().body(Map.of(
                        "success", false,
                        "message", "File '" + (file.getOriginalFilename() != null ? file.getOriginalFilename() : "file") +
                                   "' exceeds the maximum individual file size limit of 5MB."
                ));
            }
            totalUploadSize += file.getSize();
        }

        if (totalUploadSize > MAX_TOTAL_SIZE) {
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "message", "Total upload size exceeds the maximum allowed limit of 15MB."
            ));
        }

        StringBuilder combinedContent = new StringBuilder();
        int validFilesCount = 0;

        for (MultipartFile file : files) {
            if (file.isEmpty()) {
                continue;
            }
            try {
                String originalFilename = file.getOriginalFilename() != null ? file.getOriginalFilename() : "unknown_file";
                String content = new String(file.getBytes(), StandardCharsets.UTF_8);

                combinedContent.append("\n\n--- File: ").append(originalFilename).append(" ---\n");
                combinedContent.append(content);
                validFilesCount++;
            } catch (Exception e) {
                log.error("Failed to read uploaded file: {}", file.getOriginalFilename(), e);
            }
        }

        if (validFilesCount == 0) {
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "message", "All uploaded files were empty or unreadable."
            ));
        }

        // Create pending review entity with PROCESSING status
        Review review = new Review();
        review.setUserEmail(userEmail);
        review.setRepositoryName("Local Upload");
        review.setPullRequestNumber(0L);
        review.setCodeDiff(combinedContent.toString());
        review.setStatus("PROCESSING");
        review.setSeverity("Unknown");
        review.setQualityRating(0);
        review.setAiComment("Analyzing files...");
        review = reviewRepository.save(review);

        // Asynchronously dispatch to local review processor with review ID and user identity
        localReviewAsyncService.processLocalReviewAsync(review.getId(), combinedContent.toString(), validFilesCount, userEmail);

        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("message", "Files accepted for review. Multi-agent code inspection is running asynchronously.");
        response.put("fileCount", validFilesCount);
        response.put("reviewId", review.getId());

        return ResponseEntity.status(HttpStatus.ACCEPTED).body(response);
    }

    /**
     * Fetch list of latest code reviews (authenticated-only).
     * GET /api/v1/reviews/history
     */
    @GetMapping("/history")
    public ResponseEntity<?> getReviewHistory(
            @RequestHeader(value = "Authorization", required = false) String authHeader) {

        String userEmail = extractEmailFromAuthHeader(authHeader);
        if (userEmail == null || userEmail.isBlank()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of(
                    "error", "Authentication required to view review history."
            ));
        }

        List<Review> reviews = reviewRepository.findByUserEmailOrderByCreatedAtDesc(userEmail);
        if (reviews.size() > 50) {
            reviews = reviews.subList(0, 50);
        }
        return ResponseEntity.ok(reviews);
    }

    /**
     * Fetch a single review by ID with strict ownership check (authenticated-only).
     * Returns 404 on ownership mismatch or non-existent to avoid resource existence leaking.
     * GET /api/v1/reviews/{id}
     */
    @GetMapping("/{id}")
    public ResponseEntity<?> getReviewById(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @PathVariable Long id) {

        String userEmail = extractEmailFromAuthHeader(authHeader);
        if (userEmail == null || userEmail.isBlank()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of(
                    "error", "Authentication required to view review details."
            ));
        }

        // Returns 404 if not found or if the review belongs to another user
        Optional<Review> reviewOpt = reviewRepository.findByIdAndUserEmail(id, userEmail);
        if (reviewOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        Review r = reviewOpt.get();
        long userReviewNumber = reviewRepository.countByUserEmailAndIdLessThanEqual(userEmail, r.getId());

        Map<String, Object> res = new HashMap<>();
        res.put("id", r.getId());
        res.put("userEmail", r.getUserEmail());
        res.put("repositoryName", r.getRepositoryName());
        res.put("pullRequestNumber", r.getPullRequestNumber());
        res.put("codeDiff", r.getCodeDiff());
        res.put("aiComment", r.getAiComment());
        res.put("severity", r.getSeverity());
        res.put("qualityRating", r.getQualityRating());
        res.put("status", r.getStatus());
        res.put("engineVersion", r.getEngineVersion());
        res.put("createdAt", r.getCreatedAt());
        res.put("userReviewNumber", userReviewNumber > 0 ? userReviewNumber : 1);

        return ResponseEntity.ok(res);
    }
}



