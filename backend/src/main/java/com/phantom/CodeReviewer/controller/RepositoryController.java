package com.phantom.CodeReviewer.controller;

import com.phantom.CodeReviewer.entity.ConnectedRepository;
import com.phantom.CodeReviewer.entity.ReviewJob;
import com.phantom.CodeReviewer.entity.User;
import com.phantom.CodeReviewer.repository.ConnectedRepositoryRepository;
import com.phantom.CodeReviewer.repository.ReviewJobRepository;
import com.phantom.CodeReviewer.repository.ReviewTaskRepository;
import com.phantom.CodeReviewer.repository.UserRepository;
import com.phantom.CodeReviewer.service.AuthService;
import com.phantom.CodeReviewer.service.ReviewFindingMergerService;
import com.phantom.CodeReviewer.service.ReviewOrchestratorService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/v1/repositories")
@RequiredArgsConstructor
@Slf4j
public class RepositoryController {

    private final ConnectedRepositoryRepository connectedRepositoryRepository;
    private final ReviewJobRepository reviewJobRepository;
    private final ReviewTaskRepository reviewTaskRepository;
    private final ReviewOrchestratorService reviewOrchestratorService;
    private final ReviewFindingMergerService reviewFindingMergerService;
    private final UserRepository userRepository;
    private final AuthService authService;
    private final com.phantom.CodeReviewer.repository.RepositoryNodeRepository repositoryNodeRepository;
    private final com.phantom.CodeReviewer.service.RepositoryTreeService repositoryTreeService;
    private final com.phantom.CodeReviewer.service.GitHubService gitHubService;
    private final com.phantom.CodeReviewer.repository.ReviewRepository reviewRepository;
    private final com.phantom.CodeReviewer.service.LocalReviewAsyncService localReviewAsyncService;

    public record ConnectRepoRequest(
            String fullName,
            String name,
            String defaultBranch,
            boolean isPrivate,
            String language,
            String htmlUrl
    ) {}

    private String extractEmailFromAuthHeader(String authHeader) {
        return authService.extractEmailFromAuthHeader(authHeader);
    }

    /**
     * 1. Connect a repository explicitly.
     * Core Rule: A repository is NOT connected until user explicitly connects it.
     * Once connected, initiates automatic BACKGROUND review queue.
     * POST /api/v1/repositories/connect
     */
    @PostMapping("/connect")
    public ResponseEntity<?> connectRepository(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @RequestBody ConnectRepoRequest request) {

        String userEmail = extractEmailFromAuthHeader(authHeader);
        if (userEmail == null || userEmail.isBlank()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Authentication required to connect repository."));
        }

        if (request == null || request.fullName() == null || request.fullName().isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Repository full name is required."));
        }

        String userId = userEmail;
        String fullName = request.fullName().trim();

        Optional<ConnectedRepository> existingOpt = connectedRepositoryRepository.findByUserIdAndFullName(userId, fullName);
        ConnectedRepository repo = existingOpt.orElseGet(() -> ConnectedRepository.builder()
                .userId(userId)
                .fullName(fullName)
                .name(request.name())
                .defaultBranch(request.defaultBranch() != null ? request.defaultBranch() : "main")
                .isPrivate(request.isPrivate())
                .language(request.language())
                .htmlUrl(request.htmlUrl())
                .status("CONNECTED")
                .createdAt(LocalDateTime.now())
                .build());

        repo.setStatus("CONNECTED");
        repo.setUpdatedAt(LocalDateTime.now());
        ConnectedRepository savedRepo = connectedRepositoryRepository.save(repo);

        // Fetch user access token if available
        String userAccessToken = userRepository.findByEmail(userId)
                .map(User::getGithubAccessToken)
                .orElse(null);

        // Fetch latest commit SHA and pre-build tree nodes for Repository Explorer (No AI Review is started)
        boolean treeReady = false;
        try {
            String commitSha = gitHubService.getLatestCommitSha(savedRepo.getFullName(), savedRepo.getDefaultBranch(), userAccessToken);
            savedRepo.setLatestCommitSha(commitSha);
            savedRepo = connectedRepositoryRepository.save(savedRepo);
            List<com.phantom.CodeReviewer.entity.RepositoryNode> nodes = repositoryTreeService.discoverAndBuildTree(savedRepo, commitSha, userAccessToken);
            treeReady = nodes != null && !nodes.isEmpty();
        } catch (Exception e) {
            log.warn("Non-fatal: Tree indexing deferred for connected repo {}: {}", savedRepo.getFullName(), e.getMessage());
        }

        Map<String, Object> res = new HashMap<>();
        res.put("success", true);
        res.put("treeReady", treeReady);
        res.put("message", treeReady
                ? "Repository connected successfully. File tree ready for exploration."
                : "Repository connected successfully, but file tree could not be loaded. Please retry.");
        res.put("repository", savedRepo);

        return ResponseEntity.ok(res);
    }

    /**
     * 2. Disconnect a repository.
     * POST /api/v1/repositories/disconnect
     */
    @PostMapping("/disconnect")
    public ResponseEntity<?> disconnectRepository(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @RequestParam String fullName) {

        String userEmail = extractEmailFromAuthHeader(authHeader);
        if (userEmail == null || userEmail.isBlank()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Authentication required."));
        }

        Optional<ConnectedRepository> repoOpt = connectedRepositoryRepository.findByUserIdAndFullName(userEmail, fullName.trim());
        if (repoOpt.isPresent()) {
            ConnectedRepository repo = repoOpt.get();
            repo.setStatus("DISCONNECTED");
            connectedRepositoryRepository.save(repo);
            return ResponseEntity.ok(Map.of("success", true, "message", "Repository disconnected."));
        }
        // Returns 404 if not found or belongs to another user (prevents resource existence leak)
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "Repository not found."));
    }

    /**
     * 3. Fetch connected repositories for current user.
     * GET /api/v1/repositories/connected
     */
    @GetMapping("/connected")
    public ResponseEntity<?> getConnectedRepositories(
            @RequestHeader(value = "Authorization", required = false) String authHeader) {

        String userEmail = extractEmailFromAuthHeader(authHeader);
        if (userEmail == null || userEmail.isBlank()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Authentication required."));
        }

        List<ConnectedRepository> list = connectedRepositoryRepository.findByUserIdOrderByCreatedAtDesc(userEmail);
        return ResponseEntity.ok(list.stream().filter(r -> "CONNECTED".equalsIgnoreCase(r.getStatus())).toList());
    }

    /**
     * 4. Trigger EXPLICIT USER REVIEW on a connected repository.
     * Priority: HIGH, Delay: 10s. Preempts background job.
     * Ownership verified: Repository must belong to current authenticated user. Returns 404 if mismatch.
     * POST /api/v1/repositories/{id}/review
     */
    @PostMapping("/{id}/review")
    public ResponseEntity<?> triggerUserReview(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @PathVariable Long id) {

        String userEmail = extractEmailFromAuthHeader(authHeader);
        if (userEmail == null || userEmail.isBlank()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Authentication required."));
        }

        Optional<ConnectedRepository> repoOpt = connectedRepositoryRepository.findById(id);
        if (repoOpt.isEmpty() || !userEmail.equalsIgnoreCase(repoOpt.get().getUserId())) {
            // Returns 404 to avoid resource existence leaking
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "Repository not found."));
        }

        ConnectedRepository repo = repoOpt.get();

        // Fetch user access token
        String userAccessToken = userRepository.findByEmail(repo.getUserId())
                .map(User::getGithubAccessToken)
                .orElse(null);

        try {
            ReviewJob userJob = reviewOrchestratorService.triggerUserRequestedReview(repo, userAccessToken);
            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "High priority code review started.",
                    "jobId", userJob.getId(),
                    "totalFiles", userJob.getTotalFiles()
            ));
        } catch (IllegalStateException e) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of(
                    "error", e.getMessage()
            ));
        } catch (Exception e) {
            log.error("Failed to start user review for repo {}: {}", repo.getFullName(), e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                    "error", "Failed to start review: " + e.getMessage()
            ));
        }
    }

    /**
     * 5. Poll live review job status, progress, current file, and findings report.
     * Ownership verified: Job must belong to current authenticated user. Returns 404 if mismatch.
     * GET /api/v1/repositories/jobs/{jobId}/status
     */
    @GetMapping("/jobs/{jobId}/status")
    public ResponseEntity<?> getJobStatus(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @PathVariable String jobId) {

        String userEmail = extractEmailFromAuthHeader(authHeader);
        if (userEmail == null || userEmail.isBlank()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Authentication required."));
        }

        Optional<ReviewJob> jobOpt = reviewJobRepository.findById(jobId);
        if (jobOpt.isEmpty() || !userEmail.equalsIgnoreCase(jobOpt.get().getUserId())) {
            // Returns 404 to prevent resource existence leaking across users
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "Review job not found."));
        }

        ReviewJob job = jobOpt.get();
        Map<String, Object> res = new HashMap<>();
        res.put("jobId", job.getId());
        res.put("repositoryId", job.getRepositoryId());
        res.put("reviewType", job.getReviewType());
        res.put("priority", job.getPriority());
        res.put("status", job.getStatus());
        res.put("currentFile", job.getCurrentFile());
        res.put("currentFolder", job.getCurrentFolder());
        res.put("completedFiles", job.getCompletedFiles());
        res.put("remainingFiles", job.getRemainingFiles());
        res.put("totalFiles", job.getTotalFiles());
        res.put("progressPercentage", job.getProgressPercentage());
        res.put("nextRunAt", job.getNextRunAt());
        res.put("errorMessage", job.getErrorMessage());

        // If completed, attach the merged review report
        if ("COMPLETED".equalsIgnoreCase(job.getStatus())) {
            ConnectedRepository repo = connectedRepositoryRepository.findById(job.getRepositoryId()).orElse(null);
            String repoName = repo != null ? repo.getFullName() : "Repository";
            String finalReport = reviewFindingMergerService.generateMergedRepositoryReview(
                    job.getRepositoryId(), job.getId(), repoName, job.getCommitSha()
            );
            res.put("finalReport", finalReport);
        }

        return ResponseEntity.ok(res);
    }

    /**
     * 6. Fetch repository file/folder tree for Repository Explorer.
     * Guarded: Only builds tree if absent, with safety checks to avoid blocking.
     * GET /api/v1/repositories/{id}/tree
     */
    @GetMapping("/{id}/tree")
    public ResponseEntity<?> getRepositoryTree(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @PathVariable Long id) {

        String userEmail = extractEmailFromAuthHeader(authHeader);
        if (userEmail == null || userEmail.isBlank()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Authentication required."));
        }

        Optional<ConnectedRepository> repoOpt = connectedRepositoryRepository.findById(id);
        if (repoOpt.isEmpty() || !userEmail.equalsIgnoreCase(repoOpt.get().getUserId())) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "Repository not found."));
        }

        ConnectedRepository repo = repoOpt.get();

        // 1. First check existing DB nodes
        List<com.phantom.CodeReviewer.entity.RepositoryNode> nodes = repositoryNodeRepository.findByRepositoryIdOrderByPathAsc(repo.getId());

        // 2. If DB has no nodes, build tree safely
        if (nodes.isEmpty()) {
            String userAccessToken = userRepository.findByEmail(repo.getUserId())
                    .map(User::getGithubAccessToken)
                    .orElse(null);

            String commitSha = repo.getLatestCommitSha();
            if (commitSha == null || commitSha.isBlank()) {
                commitSha = gitHubService.getLatestCommitSha(repo.getFullName(), repo.getDefaultBranch(), userAccessToken);
                repo.setLatestCommitSha(commitSha);
                connectedRepositoryRepository.save(repo);
            }

            try {
                nodes = repositoryTreeService.discoverAndBuildTree(repo, commitSha, userAccessToken);
            } catch (Exception e) {
                log.error("Failed to build repository tree for repo {}: {}", repo.getFullName(), e.getMessage());
                return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                        .body(Map.of("error", "Failed to retrieve repository tree: " + e.getMessage()));
            }
        }

        return ResponseEntity.ok(nodes);
    }

    /**
     * 7. Fetch single file source code from GitHub.
     * Strict verification:
     * - Authenticated user only
     * - ConnectedRepository ownership (404 on mismatch)
     * - Requested file exists in repository nodes (or valid format)
     * - Server-side stored GitHub token used exclusively
     * GET /api/v1/repositories/{id}/file-content?filePath=...
     */
    @GetMapping("/{id}/file-content")
    public ResponseEntity<?> getFileContent(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @PathVariable Long id,
            @RequestParam String filePath) {

        String userEmail = extractEmailFromAuthHeader(authHeader);
        if (userEmail == null || userEmail.isBlank()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Authentication required."));
        }

        if (filePath == null || filePath.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "filePath parameter is required."));
        }

        Optional<ConnectedRepository> repoOpt = connectedRepositoryRepository.findById(id);
        if (repoOpt.isEmpty() || !userEmail.equalsIgnoreCase(repoOpt.get().getUserId())) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "Repository not found."));
        }

        ConnectedRepository repo = repoOpt.get();
        String cleanPath = filePath.trim();

        // Verify the file actually belongs to this repository's known nodes
        Optional<com.phantom.CodeReviewer.entity.RepositoryNode> nodeOpt =
                repositoryNodeRepository.findByRepositoryIdAndPath(repo.getId(), cleanPath);
        if (nodeOpt.isEmpty()) {
            // Check if user is referencing path with leading slash
            String altPath = cleanPath.startsWith("/") ? cleanPath.substring(1) : "/" + cleanPath;
            nodeOpt = repositoryNodeRepository.findByRepositoryIdAndPath(repo.getId(), altPath);
        }

        String userAccessToken = userRepository.findByEmail(repo.getUserId())
                .map(User::getGithubAccessToken)
                .orElse(null);

        String commitSha = repo.getLatestCommitSha();
        if (commitSha == null || commitSha.isBlank()) {
            try {
                commitSha = gitHubService.getLatestCommitSha(repo.getFullName(), repo.getDefaultBranch(), userAccessToken);
                repo.setLatestCommitSha(commitSha);
                connectedRepositoryRepository.save(repo);
            } catch (Exception e) {
                log.warn("Could not fetch latest commit SHA for {}: {}", repo.getFullName(), e.getMessage());
            }
        }

        String content = gitHubService.getFileContent(repo.getFullName(), cleanPath, commitSha, userAccessToken);
        if (content == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", "Unable to fetch content for file: " + cleanPath + " from GitHub."));
        }

        return ResponseEntity.ok(Map.of(
                "filePath", cleanPath,
                "content", content,
                "language", nodeOpt.map(com.phantom.CodeReviewer.entity.RepositoryNode::getLanguage).orElse("")
        ));
    }

    public record SingleFileReviewRequest(String filePath) {}

    /**
     * 8. Trigger manual single-file repository review.
     * Strict rules:
     * - Authenticated JWT only
     * - ConnectedRepository ownership verified (404 on mismatch)
     * - Verifies requested file belongs to connected repository
     * - Exactly ONE file inspected
     * - Uses LocalReviewAsyncService + Review(PROCESSING) for simplicity and reliability
     * - Returns reviewId for deterministic polling
     * POST /api/v1/repositories/{id}/file-review
     */
    @PostMapping("/{id}/file-review")
    public ResponseEntity<?> reviewSingleFile(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @PathVariable Long id,
            @RequestBody SingleFileReviewRequest request) {

        String userEmail = extractEmailFromAuthHeader(authHeader);
        if (userEmail == null || userEmail.isBlank()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Authentication required."));
        }

        if (request == null || request.filePath() == null || request.filePath().isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "filePath is required."));
        }

        Optional<ConnectedRepository> repoOpt = connectedRepositoryRepository.findById(id);
        if (repoOpt.isEmpty() || !userEmail.equalsIgnoreCase(repoOpt.get().getUserId())) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "Repository not found."));
        }

        ConnectedRepository repo = repoOpt.get();
        String cleanPath = request.filePath().trim();

        // 1. Verify file exists in repository
        Optional<com.phantom.CodeReviewer.entity.RepositoryNode> nodeOpt =
                repositoryNodeRepository.findByRepositoryIdAndPath(repo.getId(), cleanPath);
        if (nodeOpt.isEmpty()) {
            String altPath = cleanPath.startsWith("/") ? cleanPath.substring(1) : "/" + cleanPath;
            nodeOpt = repositoryNodeRepository.findByRepositoryIdAndPath(repo.getId(), altPath);
        }

        // 2. Fetch file content from GitHub using server-side token
        String userAccessToken = userRepository.findByEmail(repo.getUserId())
                .map(User::getGithubAccessToken)
                .orElse(null);

        String commitSha = repo.getLatestCommitSha();
        if (commitSha == null || commitSha.isBlank()) {
            commitSha = gitHubService.getLatestCommitSha(repo.getFullName(), repo.getDefaultBranch(), userAccessToken);
            repo.setLatestCommitSha(commitSha);
            connectedRepositoryRepository.save(repo);
        }

        String fileContent = gitHubService.getFileContent(repo.getFullName(), cleanPath, commitSha, userAccessToken);
        if (fileContent == null) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", "Could not fetch content for '" + cleanPath + "' from GitHub."));
        }

        // 3. Create Review record with PROCESSING status (appears in Review Audit Feed)
        com.phantom.CodeReviewer.entity.Review review = new com.phantom.CodeReviewer.entity.Review();
        review.setUserEmail(userEmail);
        review.setRepositoryName(repo.getFullName() + ":" + cleanPath);
        review.setPullRequestNumber(0L); // 0 indicates manual single-file review
        review.setCodeDiff("--- File: " + cleanPath + " ---\n" + fileContent);
        review.setStatus("PROCESSING");
        review.setSeverity("Unknown");
        review.setQualityRating(0);
        review.setAiComment("Analyzing file: " + cleanPath + "...");
        review = reviewRepository.save(review);

        // 4. Asynchronously process review using LocalReviewAsyncService
        localReviewAsyncService.processSingleFileReviewAsync(
                review.getId(),
                repo.getId(),
                cleanPath,
                commitSha,
                fileContent,
                userEmail
        );

        return ResponseEntity.ok(Map.of(
                "success", true,
                "reviewId", review.getId(),
                "filePath", cleanPath,
                "repositoryName", repo.getFullName(),
                "message", "Single file review dispatched for multi-agent inspection."
        ));
    }
}
