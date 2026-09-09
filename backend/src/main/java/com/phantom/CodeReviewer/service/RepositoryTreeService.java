package com.phantom.CodeReviewer.service;

import com.phantom.CodeReviewer.entity.*;
import com.phantom.CodeReviewer.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
@RequiredArgsConstructor
@Slf4j
public class RepositoryTreeService {

    private final RepositoryNodeRepository repositoryNodeRepository;
    private final CodeSymbolRepository codeSymbolRepository;
    private final CodeDependencyRepository codeDependencyRepository;
    private final GitHubService gitHubService;

    // Supported source code extensions for inspection
    private static final Set<String> SUPPORTED_EXTENSIONS = Set.of(
            "java", "ts", "tsx", "js", "jsx", "py", "go", "rs", "cpp", "c", "cs", "rb", "php", "sql", "kt", "swift"
    );

    // Regex patterns for lightweight semantic symbol extraction (Zero extra heavy AST overhead)
    private static final Pattern JAVA_CLASS_PATTERN = Pattern.compile("\\b(class|interface|enum|record)\\s+([A-Za-z0-9_]+)");
    private static final Pattern JAVA_METHOD_PATTERN = Pattern.compile("\\b(public|protected|private|static|final|synchronized|abstract)\\s+[\\w<>\\[\\]]+\\s+([A-Za-z0-9_]+)\\s*\\(");
    private static final Pattern JS_FUNCTION_PATTERN = Pattern.compile("\\b(function\\s+([A-Za-z0-9_]+)|const\\s+([A-Za-z0-9_]+)\\s*=\\s*(async\\s*)?\\([^)]*\\)\\s*=>)");
    private static final Pattern IMPORT_PATTERN = Pattern.compile("^\\s*(import|from)\\s+['\"]?([A-Za-z0-9_./@-]+)['\"]?", Pattern.MULTILINE);

    /**
     * Discover and build or update the abstract repository tree in PostgreSQL.
     * Decomposes repository into folders and files with parent-child relationships and hashes.
     */
    @Transactional
    public List<RepositoryNode> discoverAndBuildTree(ConnectedRepository repo, String commitSha, String userAccessToken) {
        log.info("--> Decomposing repository tree for {} at commit {}", repo.getFullName(), commitSha);

        List<Map<String, Object>> gitTree = gitHubService.getRepositoryTree(repo.getFullName(), commitSha, userAccessToken);
        if (gitTree.isEmpty()) {
            log.warn("Git tree was empty or unreadable for repository {}", repo.getFullName());
            return Collections.emptyList();
        }

        List<RepositoryNode> nodesToSave = new ArrayList<>();
        Map<String, RepositoryNode> nodeMap = new HashMap<>();

        for (Map<String, Object> item : gitTree) {
            String path = (String) item.get("path");
            String type = (String) item.get("type"); // "blob" or "tree"
            String sha = (String) item.get("sha");
            Number sizeNum = (Number) item.get("size");
            Long size = sizeNum != null ? sizeNum.longValue() : 0L;

            if (path == null || path.isBlank() || isIgnoredPath(path)) {
                continue;
            }

            boolean isFolder = "tree".equalsIgnoreCase(type);
            String nodeType = isFolder ? "FOLDER" : "FILE";

            // Extract file extension and language
            String extension = "";
            String language = "";
            int lastDot = path.lastIndexOf('.');
            if (lastDot > 0 && lastDot < path.length() - 1) {
                extension = path.substring(lastDot + 1).toLowerCase();
                language = extension;
            }

            // Only index folders and supported source files
            if (!isFolder && !SUPPORTED_EXTENSIONS.contains(extension)) {
                continue;
            }

            String name = path;
            String parentPath = "";
            int lastSlash = path.lastIndexOf('/');
            if (lastSlash >= 0) {
                name = path.substring(lastSlash + 1);
                parentPath = path.substring(0, lastSlash);
            }

            Optional<RepositoryNode> existingOpt = repositoryNodeRepository.findByRepositoryIdAndPath(repo.getId(), path);
            RepositoryNode node = existingOpt.orElseGet(() -> RepositoryNode.builder()
                    .repositoryId(repo.getId())
                    .path(path)
                    .build());

            node.setNodeType(nodeType);
            node.setName(name);
            node.setParentPath(parentPath);
            node.setFileHash(sha);
            node.setLanguage(language);
            node.setSizeBytes(size);
            node.setUpdatedAt(LocalDateTime.now());

            nodesToSave.add(node);
        }

        List<RepositoryNode> savedNodes = repositoryNodeRepository.saveAll(nodesToSave);
        log.info("--> Successfully indexed {} abstract nodes (folders & files) for repo {}", savedNodes.size(), repo.getFullName());

        return savedNodes;
    }

    /**
     * Extract semantic symbols (classes, methods, functions) and dependencies (imports) for a file
     */
    @Transactional
    public void extractSymbolsAndDependencies(RepositoryNode fileNode, String fileContent) {
        if (fileContent == null || fileContent.isBlank()) return;

        // Clear existing symbols and dependencies for this specific file node to prevent duplicate accumulation on re-review
        if (fileNode.getId() != null) {
            codeSymbolRepository.deleteByNodeId(fileNode.getId());
            codeDependencyRepository.deleteBySourceNodeId(fileNode.getId());
        }

        List<CodeSymbol> symbols = new ArrayList<>();
        List<CodeDependency> dependencies = new ArrayList<>();

        String[] lines = fileContent.split("\r?\n");

        for (int i = 0; i < lines.length; i++) {
            String line = lines[i].trim();
            int lineNumber = i + 1;

            // Extract Classes / Interfaces
            Matcher classMatcher = JAVA_CLASS_PATTERN.matcher(line);
            if (classMatcher.find()) {
                symbols.add(CodeSymbol.builder()
                        .nodeId(fileNode.getId())
                        .repositoryId(fileNode.getRepositoryId())
                        .symbolName(classMatcher.group(2))
                        .kind(classMatcher.group(1).toUpperCase())
                        .lineStart(lineNumber)
                        .signature(line)
                        .build());
            }

            // Extract Methods
            Matcher methodMatcher = JAVA_METHOD_PATTERN.matcher(line);
            if (methodMatcher.find()) {
                symbols.add(CodeSymbol.builder()
                        .nodeId(fileNode.getId())
                        .repositoryId(fileNode.getRepositoryId())
                        .symbolName(methodMatcher.group(2))
                        .kind("METHOD")
                        .lineStart(lineNumber)
                        .signature(line)
                        .build());
            }

            // Extract JS/TS functions
            Matcher jsMatcher = JS_FUNCTION_PATTERN.matcher(line);
            if (jsMatcher.find()) {
                String fnName = jsMatcher.group(2) != null ? jsMatcher.group(2) : jsMatcher.group(3);
                if (fnName != null) {
                    symbols.add(CodeSymbol.builder()
                            .nodeId(fileNode.getId())
                            .repositoryId(fileNode.getRepositoryId())
                            .symbolName(fnName)
                            .kind("FUNCTION")
                            .lineStart(lineNumber)
                            .signature(line)
                            .build());
                }
            }

            // Extract Imports / Dependencies
            Matcher importMatcher = IMPORT_PATTERN.matcher(line);
            if (importMatcher.find()) {
                String target = importMatcher.group(2);
                dependencies.add(CodeDependency.builder()
                        .repositoryId(fileNode.getRepositoryId())
                        .sourceNodeId(fileNode.getId())
                        .targetPath(target)
                        .dependencyType("IMPORT")
                        .build());
            }
        }

        if (!symbols.isEmpty()) {
            codeSymbolRepository.saveAll(symbols);
        }
        if (!dependencies.isEmpty()) {
            codeDependencyRepository.saveAll(dependencies);
        }
    }

    private boolean isIgnoredPath(String path) {
        String lower = path.toLowerCase();
        return lower.startsWith(".git/") ||
                lower.contains("node_modules/") ||
                lower.contains("target/") ||
                lower.contains("build/") ||
                lower.contains("dist/") ||
                lower.contains(".idea/") ||
                lower.contains(".vscode/") ||
                lower.endsWith(".png") ||
                lower.endsWith(".jpg") ||
                lower.endsWith(".svg") ||
                lower.endsWith(".ico") ||
                lower.endsWith(".lock") ||
                lower.endsWith("package-lock.json");
    }
}
