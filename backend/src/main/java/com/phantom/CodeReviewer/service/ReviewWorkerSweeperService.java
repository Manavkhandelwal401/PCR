package com.phantom.CodeReviewer.service;

import com.phantom.CodeReviewer.entity.*;
import com.phantom.CodeReviewer.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class ReviewWorkerSweeperService {

    private final ReviewJobRepository reviewJobRepository;
    private final ReviewTaskRepository reviewTaskRepository;
    private final ConnectedRepositoryRepository connectedRepositoryRepository;
    private final RepositoryNodeRepository repositoryNodeRepository;
    private final ReviewFindingRepository reviewFindingRepository;
    private final AiReviewService aiReviewService;
    private final GitHubService gitHubService;
    private final RepositoryTreeService repositoryTreeService;
    private final ReviewFindingMergerService reviewFindingMergerService;
    private final ReviewOrchestratorService reviewOrchestratorService;
    private final UserRepository userRepository;
    private final ReviewWorkerTransactionalHelper reviewWorkerTransactionalHelper;
    private final ReviewRepository reviewRepository;

    /**
     * Periodic Sweeper running every 2000ms.
     * The DB is the single source of truth:
     * 1. Detects and resets crashed/abandoned IN_PROGRESS tasks (heartbeat older than 3 minutes)
     * 2. Queries next eligible task where status IN ('PENDING', 'WAITING') AND (nextRunAt IS NULL OR nextRunAt <= NOW())
     * 3. Prioritizes USER_REQUESTED (HIGH) over BACKGROUND (LOW) jobs
     * 4. Enforces the exact 10s (User) or 60s (Background) delay by updating nextRunAt in DB
     */
    @Scheduled(fixedDelay = 2000)
    public void sweepAndProcessNextTasks() {
        recoverOrphanedTasks();

        LocalDateTime now = LocalDateTime.now();

        // 1. Fetch active jobs, sorted by Priority (HIGH first) then creation time
        List<ReviewJob> activeJobs = reviewJobRepository.findByStatusInOrderByPriorityAscCreatedAtAsc(
                List.of("RUNNING", "WAITING")
        );

        for (ReviewJob job : activeJobs) {
            // Check if job level delay is still in the future
            if (job.getNextRunAt() != null && job.getNextRunAt().isAfter(now)) {
                continue;
            }

            // Find next eligible task for this job
            List<ReviewTask> eligibleTasks = reviewTaskRepository.findEligibleTasksForJob(job.getId(), now);
            if (eligibleTasks.isEmpty()) {
                // Check if all tasks in job are finished
                checkAndFinalizeJobIfDone(job);
                continue;
            }

            ReviewTask taskToProcess = eligibleTasks.get(0);
            processSingleFileTask(job, taskToProcess);
            // Process at most one task per sweep cycle to ensure rate-controlled concurrency
            break;
        }
    }

    /**
     * Process an individual file review unit with DB checkpointing before & after.
     * Database operations are delegated to reviewWorkerTransactionalHelper for genuine @Transactional boundary.
     */
    public void processSingleFileTask(ReviewJob job, ReviewTask task) {
        log.info("--> [WORKER] Executing Task #{}: File {} for Job {} (Priority: {})",
                task.getSequenceOrder(), task.getFilePath(), job.getId(), job.getPriority());

        // Step 1: Mark IN_PROGRESS with current heartbeat timestamp in an active transaction
        reviewWorkerTransactionalHelper.markTaskInProgress(task, job);

        try {
            Optional<ConnectedRepository> repoOpt = connectedRepositoryRepository.findById(job.getRepositoryId());
            if (repoOpt.isEmpty()) {
                reviewWorkerTransactionalHelper.markTaskPermanentlyFailed(task, job, "Repository not found in database.");
                return;
            }
            ConnectedRepository repo = repoOpt.get();

            // Fetch user access token if available
            String userAccessToken = userRepository.findByEmail(job.getUserId())
                    .map(User::getGithubAccessToken)
                    .orElse(null);

            // Step 2: Fetch raw file content from GitHub
            String fileContent = gitHubService.getFileContent(repo.getFullName(), task.getFilePath(), task.getCommitSha(), userAccessToken);

            // If null is returned, the GitHub API call failed or encountered an error. Must retry, NOT mark COMPLETED!
            if (fileContent == null) {
                log.warn("Failed to fetch file content from GitHub for file: {}. Queuing task for retry.", task.getFilePath());
                throw new RuntimeException("GitHub API failed to fetch file content for " + task.getFilePath() + "; queuing retry.");
            }

            // Genuinely empty file ("" or only whitespace) fetched successfully from GitHub
            if (fileContent.isBlank()) {
                log.info("File {} is genuinely empty. Marking COMPLETED without LLM call.", task.getFilePath());
                reviewWorkerTransactionalHelper.completeTaskWithoutFindings(task, job);
                return;
            }

            // Step 3: Extract symbols and dependencies to knowledge tree
            if (task.getNodeId() != null) {
                repositoryNodeRepository.findById(task.getNodeId()).ifPresent(node ->
                        repositoryTreeService.extractSymbolsAndDependencies(node, fileContent)
                );
            }

            // Step 4: Perform LLM Review on this file (Targeted Context - Minimizes Token Consumption!)
            String filePromptContext = "--- File: " + task.getFilePath() + " ---\n" + fileContent;
            AiReviewService.AiReviewResponse aiResponse = aiReviewService.reviewCode(filePromptContext);

            // Verify genuine AI analysis success before modifying findings state
            if (aiResponse == null || !aiResponse.success()) {
                String errorDetails = (aiResponse != null && aiResponse.comment() != null)
                        ? aiResponse.comment()
                        : "AI analysis returned null or unsuccessful status.";
                log.warn("AI review did not succeed for file {}: {}. Preserving existing findings and queuing retry.",
                        task.getFilePath(), errorDetails);
                throw new RuntimeException("AI inspection failed: " + errorDetails);
            }

            // Step 5 & 6: Finding Reconciliation + Task completion in a single genuine transaction
            // (Successful analysis -> resolve obsolete findings -> persist new verified findings -> complete task)
            boolean hasDefects = hasReportedIssues(aiResponse);
            reviewWorkerTransactionalHelper.reconcileFindingsAndCompleteTask(task, job, repo.getId(), hasDefects, aiResponse);

        } catch (Exception e) {
            log.error("Error reviewing file task {}: {}", task.getFilePath(), e.getMessage(), e);
            reviewWorkerTransactionalHelper.handleTaskFailure(task, job, e.getMessage());
        }
    }

    /**
     * Determines whether the multi-agent AI response detected actual issues.
     * Evaluates across all 4 agents and overall metrics rather than checking only the logic agent.
     */
    private boolean hasReportedIssues(AiReviewService.AiReviewResponse aiResponse) {
        if (aiResponse == null || aiResponse.comment() == null || aiResponse.comment().isBlank()) {
            return false;
        }

        String comment = aiResponse.comment();
        // If overall severity is flagged as Critical, High, or Moderate, issues exist
        String sev = aiResponse.severity() != null ? aiResponse.severity().toUpperCase() : "";
        if (sev.contains("CRITICAL") || sev.contains("HIGH") || sev.contains("MODERATE") || sev.contains("LOW")) {
            return true;
        }

        // Check if all 4 agents reported clean passes
        boolean logicClean = comment.contains("✅ No logic issues");
        boolean syntaxClean = comment.contains("✅ No syntax issues");
        boolean perfClean = comment.contains("✅ No performance issues");
        boolean secClean = comment.contains("✅ No security risks");

        // If any agent found an issue (i.e. did not output clean pass), findings exist
        return !(logicClean && syntaxClean && perfClean && secClean);
    }

    private void checkAndFinalizeJobIfDone(ReviewJob job) {
        long pendingOrWaiting = reviewTaskRepository.countByJobIdAndStatus(job.getId(), "PENDING") +
                reviewTaskRepository.countByJobIdAndStatus(job.getId(), "WAITING") +
                reviewTaskRepository.countByJobIdAndStatus(job.getId(), "IN_PROGRESS");

        if (pendingOrWaiting == 0) {
            long failedTasksCount = reviewTaskRepository.countByJobIdAndStatus(job.getId(), "FAILED");

            if (failedTasksCount > 0) {
                // If any tasks failed permanently, mark the job as FAILED
                job.setStatus("FAILED");
                job.setCompletedAt(LocalDateTime.now());
                job.setErrorMessage("Review job encountered " + failedTasksCount + " failed file task(s).");
                job.setRemainingFiles(0);
                reviewJobRepository.save(job);

                log.error("--> [JOB FAILED] Review Job {} terminated with {} failed task(s) for repo ID {}",
                        job.getId(), failedTasksCount, job.getRepositoryId());
            } else {
                job.setStatus("COMPLETED");
                job.setCompletedAt(LocalDateTime.now());
                job.setProgressPercentage(100);
                job.setRemainingFiles(0);
                reviewJobRepository.save(job);

                log.info("--> [JOB COMPLETED] Review Job {} finished successfully for repo ID {}", job.getId(), job.getRepositoryId());
            }

            // If a User Requested review completed or terminated, check and resume any paused background job!
            if ("USER_REQUESTED".equals(job.getReviewType())) {
                reviewOrchestratorService.resumePausedBackgroundJobIfAny(job.getRepositoryId());
            }
        }
    }

    /**
     * Recover orphaned IN_PROGRESS tasks left behind by crashed workers or application restarts
     */
    private void recoverOrphanedTasks() {
        LocalDateTime staleThreshold = LocalDateTime.now().minusMinutes(3);
        List<ReviewTask> orphaned = reviewTaskRepository.findOrphanedTasks(staleThreshold);

        for (ReviewTask task : orphaned) {
            log.warn("--> [RECOVERY] Detected crashed/stale IN_PROGRESS task #{} for file {}. Resetting to PENDING.",
                    task.getId(), task.getFilePath());
            reviewWorkerTransactionalHelper.resetOrphanedTask(task.getId(), LocalDateTime.now());
        }

        // Recover any orphaned local reviews stuck in PROCESSING (e.g. JVM crash/reboot during AI review)
        // 15-minute threshold gives safe headroom for 4-agent parallel inspection and Groq rate-limiting
        try {
            LocalDateTime reviewCutoff = LocalDateTime.now().minusMinutes(15);
            List<Review> staleReviews = reviewRepository.findByStatusAndCreatedAtBefore("PROCESSING", reviewCutoff);
            for (Review r : staleReviews) {
                log.warn("--> [RECOVERY] Detected stuck PROCESSING local review #{}. Marking as FAILED.", r.getId());
                r.setStatus("FAILED");
                r.setAiComment("Analysis timed out or worker restarted during processing.");
                reviewRepository.save(r);
            }
        } catch (Exception e) {
            log.warn("Error checking stale local reviews: {}", e.getMessage());
        }
    }
}
