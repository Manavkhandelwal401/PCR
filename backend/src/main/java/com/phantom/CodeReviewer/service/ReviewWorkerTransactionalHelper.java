package com.phantom.CodeReviewer.service;

import com.phantom.CodeReviewer.entity.ReviewFinding;
import com.phantom.CodeReviewer.entity.ReviewJob;
import com.phantom.CodeReviewer.entity.ReviewTask;
import com.phantom.CodeReviewer.repository.ReviewFindingRepository;
import com.phantom.CodeReviewer.repository.ReviewJobRepository;
import com.phantom.CodeReviewer.repository.ReviewTaskRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class ReviewWorkerTransactionalHelper {

    private final ReviewJobRepository reviewJobRepository;
    private final ReviewTaskRepository reviewTaskRepository;
    private final ReviewFindingRepository reviewFindingRepository;

    @Transactional
    public void markTaskInProgress(ReviewTask task, ReviewJob job) {
        task.setStatus("IN_PROGRESS");
        task.setHeartbeatAt(LocalDateTime.now());
        reviewTaskRepository.save(task);

        job.setCurrentFile(task.getFilePath());
        job.setCurrentFolder(task.getFolderPath());
        job.setHeartbeatAt(LocalDateTime.now());
        reviewJobRepository.save(job);
    }

    @Transactional
    public void reconcileFindingsAndCompleteTask(
            ReviewTask task,
            ReviewJob job,
            Long repoId,
            boolean hasDefects,
            AiReviewService.AiReviewResponse aiResponse
    ) {
        // 1. Resolve old findings for this file in current repo
        reviewFindingRepository.markFindingsResolvedForFile(repoId, task.getFilePath(), LocalDateTime.now());

        // 2. Persist new finding if issues detected
        if (hasDefects) {
            ReviewFinding finding = ReviewFinding.builder()
                    .repositoryId(repoId)
                    .reviewJobId(job.getId())
                    .filePath(task.getFilePath())
                    .commitSha(task.getCommitSha())
                    .fileHash(task.getFileHash())
                    .category("CODE_INSPECTION")
                    .severity(aiResponse.severity() != null ? aiResponse.severity() : "MODERATE")
                    .findingComment(aiResponse.comment())
                    .isResolved(false)
                    .createdAt(LocalDateTime.now())
                    .build();

            reviewFindingRepository.save(finding);
        }

        // 3. Mark task completed and schedule next task delay
        LocalDateTime now = LocalDateTime.now();
        task.setStatus("COMPLETED");
        task.setUpdatedAt(now);
        reviewTaskRepository.save(task);

        int completed = job.getCompletedFiles() + 1;
        int remaining = Math.max(0, job.getTotalFiles() - completed);
        int progress = job.getTotalFiles() > 0 ? (completed * 100) / job.getTotalFiles() : 100;

        job.setCompletedFiles(completed);
        job.setRemainingFiles(remaining);
        job.setProgressPercentage(progress);
        job.setHeartbeatAt(now);

        long delaySeconds = job.getDelayBetweenStepsMs() / 1000L;
        LocalDateTime nextEligible = now.plusSeconds(delaySeconds);

        job.setNextRunAt(nextEligible);
        reviewJobRepository.save(job);

        log.info("--> [DELAY SCHEDULED] Job {} task finished. Next run at {} (+{}s delay)",
                job.getId(), nextEligible, delaySeconds);

        Optional<ReviewTask> nextTaskOpt = reviewTaskRepository.findFirstByJobIdAndStatusInOrderBySequenceOrderAsc(
                job.getId(), List.of("PENDING", "WAITING")
        );
        nextTaskOpt.ifPresent(next -> {
            next.setStatus("WAITING");
            next.setNextRunAt(nextEligible);
            reviewTaskRepository.save(next);
        });
    }

    @Transactional
    public void completeTaskWithoutFindings(ReviewTask task, ReviewJob job) {
        LocalDateTime now = LocalDateTime.now();
        task.setStatus("COMPLETED");
        task.setUpdatedAt(now);
        reviewTaskRepository.save(task);

        int completed = job.getCompletedFiles() + 1;
        int remaining = Math.max(0, job.getTotalFiles() - completed);
        int progress = job.getTotalFiles() > 0 ? (completed * 100) / job.getTotalFiles() : 100;

        job.setCompletedFiles(completed);
        job.setRemainingFiles(remaining);
        job.setProgressPercentage(progress);
        job.setHeartbeatAt(now);

        long delaySeconds = job.getDelayBetweenStepsMs() / 1000L;
        LocalDateTime nextEligible = now.plusSeconds(delaySeconds);

        job.setNextRunAt(nextEligible);
        reviewJobRepository.save(job);

        Optional<ReviewTask> nextTaskOpt = reviewTaskRepository.findFirstByJobIdAndStatusInOrderBySequenceOrderAsc(
                job.getId(), List.of("PENDING", "WAITING")
        );
        nextTaskOpt.ifPresent(next -> {
            next.setStatus("WAITING");
            next.setNextRunAt(nextEligible);
            reviewTaskRepository.save(next);
        });
    }

    @Transactional
    public void handleTaskFailure(ReviewTask task, ReviewJob job, String error) {
        int retry = task.getRetryCount() + 1;
        task.setRetryCount(retry);
        task.setErrorMessage(error);
        task.setUpdatedAt(LocalDateTime.now());

        if (retry >= task.getMaxRetries()) {
            task.setStatus("FAILED");
            log.error("Task {} permanently failed after {} retries.", task.getFilePath(), retry);
        } else {
            task.setStatus("WAITING");
            task.setNextRunAt(LocalDateTime.now().plusSeconds(30)); // 30s backoff
            log.warn("Task {} failed. Scheduled retry #{} at {}", task.getFilePath(), retry, task.getNextRunAt());
        }
        reviewTaskRepository.save(task);
    }

    @Transactional
    public void markTaskPermanentlyFailed(ReviewTask task, ReviewJob job, String error) {
        task.setStatus("FAILED");
        task.setErrorMessage(error);
        reviewTaskRepository.save(task);
    }

    @Transactional
    public void resetOrphanedTask(Long taskId, LocalDateTime now) {
        reviewTaskRepository.resetOrphanedTask(taskId, now);
    }
}
