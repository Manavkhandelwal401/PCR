package com.phantom.CodeReviewer.repository;

import com.phantom.CodeReviewer.entity.ReviewTask;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

@Repository
public interface ReviewTaskRepository extends JpaRepository<ReviewTask, Long> {

    List<ReviewTask> findByJobIdOrderBySequenceOrderAsc(String jobId);

    Optional<ReviewTask> findByIdempotencyKey(String idempotencyKey);

    boolean existsByRepositoryIdAndCommitShaAndFilePathAndStatus(Long repositoryId, String commitSha, String filePath, String status);

    Optional<ReviewTask> findFirstByJobIdAndStatusInOrderBySequenceOrderAsc(String jobId, Collection<String> statuses);

    @Query("SELECT t FROM ReviewTask t WHERE t.jobId = :jobId AND t.status IN ('PENDING', 'WAITING') AND (t.nextRunAt IS NULL OR t.nextRunAt <= :now) ORDER BY t.sequenceOrder ASC")
    List<ReviewTask> findEligibleTasksForJob(@Param("jobId") String jobId, @Param("now") LocalDateTime now);

    @Query("SELECT t FROM ReviewTask t WHERE t.status = 'IN_PROGRESS' AND t.heartbeatAt < :staleThreshold")
    List<ReviewTask> findOrphanedTasks(@Param("staleThreshold") LocalDateTime staleThreshold);

    long countByJobIdAndStatus(String jobId, String status);

    long countByJobId(String jobId);

    @Modifying
    @Query("UPDATE ReviewTask t SET t.status = 'PENDING', t.retryCount = t.retryCount + 1, t.heartbeatAt = :now WHERE t.id = :taskId")
    void resetOrphanedTask(@Param("taskId") Long taskId, @Param("now") LocalDateTime now);
}
