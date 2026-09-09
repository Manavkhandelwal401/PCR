package com.phantom.CodeReviewer.service;

import com.phantom.CodeReviewer.entity.*;
import com.phantom.CodeReviewer.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class ReviewOrchestratorService {

    private final ReviewJobRepository reviewJobRepository;
    private final ReviewTaskRepository reviewTaskRepository;
    private final ConnectedRepositoryRepository connectedRepositoryRepository;
    private final RepositoryNodeRepository repositoryNodeRepository;
    private final RepositoryTreeService repositoryTreeService;
    private final GitHubService gitHubService;
    private final UserRepository userRepository;

    private static final List<String> ACTIVE_STATUSES = List.of("QUEUED", "DISCOVERING", "RUNNING", "WAITING");

    /**
     * Deprecated: Automatic background review on repository connect has been removed.
     * All repository reviews are now triggered manually per-file via Repository Explorer.
     * This method is retained as a safe no-op to prevent broken references.
     */
    @Transactional
    public ReviewJob triggerBackgroundReview(ConnectedRepository repo, String userAccessToken) {
        log.info("--> Automatic background review disabled for repository: {}. Reviews occur manually via Repository Explorer.", repo.getFullName());
        return null;
    }

    /**
     * Create a HIGH PRIORITY USER_REQUESTED review job.
     * Preempts / pauses any conflicting background job on the same repository!
     * Delay: 10,000ms (10 seconds) between file reviews.
     */
    @Transactional
    public ReviewJob triggerUserRequestedReview(ConnectedRepository repo, String userAccessToken) {
        log.info("--> [PRIORITY] User Requested Review clicked for repository: {}", repo.getFullName());

        // 1. Guard against duplicate concurrent user reviews on the same repository
        boolean hasActiveUserJob = reviewJobRepository.existsByRepositoryIdAndReviewTypeAndStatusIn(
                repo.getId(), "USER_REQUESTED", ACTIVE_STATUSES
        );
        if (hasActiveUserJob) {
            throw new IllegalStateException("A user review is already currently active or queued for this repository.");
        }

        // 2. Priority Preemption: Pause any running background job for this repository
        Optional<ReviewJob> activeBkgOpt = reviewJobRepository.findFirstByRepositoryIdAndReviewTypeAndStatusInOrderByCreatedAtDesc(
                repo.getId(), "BACKGROUND", ACTIVE_STATUSES
        );
        if (activeBkgOpt.isPresent()) {
            ReviewJob bkgJob = activeBkgOpt.get();
            log.info("--> [PREEMPTION] Pausing Background Review Job {} for Repo {} to yield to User Review",
                    bkgJob.getId(), repo.getFullName());
            bkgJob.setStatus("PAUSED");
            bkgJob.setPausedAt(LocalDateTime.now());
            reviewJobRepository.save(bkgJob);
        }

        // 3. Fetch latest commit SHA
        String commitSha = gitHubService.getLatestCommitSha(repo.getFullName(), repo.getDefaultBranch(), userAccessToken);
        repo.setLatestCommitSha(commitSha);
        connectedRepositoryRepository.save(repo);

        // 4. Create High Priority User Review Job
        String jobId = UUID.randomUUID().toString();
        ReviewJob userJob = ReviewJob.builder()
                .id(jobId)
                .repositoryId(repo.getId())
                .userId(repo.getUserId())
                .reviewType("USER_REQUESTED")
                .priority("HIGH")
                .status("DISCOVERING")
                .commitSha(commitSha)
                .delayBetweenStepsMs(10_000L) // 10 seconds delay
                .createdAt(LocalDateTime.now())
                .startedAt(LocalDateTime.now())
                .heartbeatAt(LocalDateTime.now())
                .build();

        reviewJobRepository.save(userJob);

        // 5. Populate tasks with incremental change detection
        populateJobTaskQueue(userJob, repo, commitSha, userAccessToken);

        return userJob;
    }

    /**
     * Decompose the repository and build the ordered review tasks
     */
    private void populateJobTaskQueue(ReviewJob job, ConnectedRepository repo, String commitSha, String userAccessToken) {
        try {
            // Discover tree & persist nodes
            List<RepositoryNode> nodes = repositoryTreeService.discoverAndBuildTree(repo, commitSha, userAccessToken);

            // Filter out folders to get inspectable files
            List<RepositoryNode> fileNodes = nodes.stream()
                    .filter(n -> "FILE".equalsIgnoreCase(n.getNodeType()))
                    .sorted(Comparator.comparing(RepositoryNode::getPath))
                    .toList();

            List<ReviewTask> tasks = new ArrayList<>();
            int sequence = 1;

            for (RepositoryNode fileNode : fileNodes) {
                // Check if file is already reviewed for this exact commit in this repository
                boolean isAlreadyReviewed = reviewTaskRepository.existsByRepositoryIdAndCommitShaAndFilePathAndStatus(
                        repo.getId(), commitSha, fileNode.getPath(), "COMPLETED"
                );

                String initialStatus = isAlreadyReviewed ? "SKIPPED" : (sequence == 1 ? "PENDING" : "WAITING");

                // Idempotency key scoped to the job + file path to prevent DB unique constraint collisions on re-review
                String taskJobIdempotencyKey = job.getId() + ":" + fileNode.getPath();

                ReviewTask task = ReviewTask.builder()
                        .jobId(job.getId())
                        .repositoryId(repo.getId())
                        .nodeId(fileNode.getId())
                        .filePath(fileNode.getPath())
                        .folderPath(fileNode.getParentPath())
                        .fileHash(fileNode.getFileHash())
                        .commitSha(commitSha)
                        .idempotencyKey(taskJobIdempotencyKey)
                        .sequenceOrder(sequence++)
                        .status(initialStatus)
                        .nextRunAt(sequence == 1 ? LocalDateTime.now() : null)
                        .heartbeatAt(LocalDateTime.now())
                        .build();

                tasks.add(task);
            }

            reviewTaskRepository.saveAll(tasks);

            long totalCount = tasks.size();
            long skippedCount = tasks.stream().filter(t -> "SKIPPED".equals(t.getStatus())).count();

            job.setTotalFiles((int) totalCount);
            job.setCompletedFiles((int) skippedCount);
            job.setRemainingFiles((int) (totalCount - skippedCount));
            job.setProgressPercentage(totalCount > 0 ? (int) ((skippedCount * 100) / totalCount) : 100);
            job.setStatus(job.getRemainingFiles() == 0 ? "COMPLETED" : "RUNNING");
            job.setNextRunAt(LocalDateTime.now());
            reviewJobRepository.save(job);

            log.info("--> Queued {} file review tasks for Job {} (Already skipped/cached: {})",
                    totalCount, job.getId(), skippedCount);

        } catch (Exception e) {
            log.error("Failed to populate review tasks for Job {}: {}", job.getId(), e.getMessage(), e);
            job.setStatus("FAILED");
            job.setErrorMessage(e.getMessage());
            reviewJobRepository.save(job);
        }
    }

    /**
     * Check if a paused background job can be resumed after priority user review completes
     */
    @Transactional
    public void resumePausedBackgroundJobIfAny(Long repositoryId) {
        Optional<ReviewJob> pausedOpt = reviewJobRepository.findFirstByRepositoryIdAndReviewTypeAndStatusInOrderByCreatedAtDesc(
                repositoryId, "BACKGROUND", List.of("PAUSED")
        );

        if (pausedOpt.isPresent()) {
            ReviewJob pausedJob = pausedOpt.get();
            log.info("--> [RESUMPTION] Resuming paused Background Review Job {} for repo {}", pausedJob.getId(), repositoryId);
            pausedJob.setStatus("RUNNING");
            pausedJob.setNextRunAt(LocalDateTime.now().plusSeconds(60)); // Resume with 1-minute delay
            pausedJob.setHeartbeatAt(LocalDateTime.now());
            reviewJobRepository.save(pausedJob);
        }
    }
}
