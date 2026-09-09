package com.phantom.CodeReviewer.repository;

import com.phantom.CodeReviewer.entity.ReviewJob;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

@Repository
public interface ReviewJobRepository extends JpaRepository<ReviewJob, String> {

    List<ReviewJob> findByRepositoryIdOrderByCreatedAtDesc(Long repositoryId);

    List<ReviewJob> findByUserIdOrderByCreatedAtDesc(String userId);

    boolean existsByRepositoryIdAndReviewTypeAndStatusIn(Long repositoryId, String reviewType, Collection<String> statuses);

    Optional<ReviewJob> findFirstByRepositoryIdAndReviewTypeAndStatusInOrderByCreatedAtDesc(
            Long repositoryId, String reviewType, Collection<String> statuses);

    List<ReviewJob> findByStatusInOrderByPriorityAscCreatedAtAsc(Collection<String> statuses);

    @Query("SELECT j FROM ReviewJob j WHERE j.status = 'WAITING' AND j.nextRunAt <= :now ORDER BY j.priority ASC, j.nextRunAt ASC")
    List<ReviewJob> findEligibleWaitingJobs(@Param("now") LocalDateTime now);

    @Query("SELECT j FROM ReviewJob j WHERE j.status = 'RUNNING' AND j.heartbeatAt < :staleThreshold")
    List<ReviewJob> findStaleRunningJobs(@Param("staleThreshold") LocalDateTime staleThreshold);
}
