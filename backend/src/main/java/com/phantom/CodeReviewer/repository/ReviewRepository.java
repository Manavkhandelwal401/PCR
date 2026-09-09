package com.phantom.CodeReviewer.repository;

import com.phantom.CodeReviewer.entity.Review;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ReviewRepository extends JpaRepository<Review, Long> {
    List<Review> findByUserEmailOrderByCreatedAtDesc(String userEmail);
    java.util.Optional<Review> findByIdAndUserEmail(Long id, String userEmail);
    long countByUserEmail(String userEmail);
    long countByUserEmailAndIdLessThanEqual(String userEmail, Long id);
    long countByUserEmailAndSeverityIgnoreCase(String userEmail, String severity);
    List<Review> findAllByOrderByCreatedAtDesc();
    long countBySeverityIgnoreCase(String severity);
    List<Review> findByStatusAndCreatedAtBefore(String status, java.time.LocalDateTime cutoff);
    java.util.Optional<Review> findFirstByUserEmailAndRepositoryNameAndCodeDiffAndStatusOrderByCreatedAtDesc(
            String userEmail, String repositoryName, String codeDiff, String status);
    java.util.Optional<Review> findFirstByUserEmailAndRepositoryNameAndCodeDiffAndStatusAndEngineVersionOrderByCreatedAtDesc(
            String userEmail, String repositoryName, String codeDiff, String status, String engineVersion);
}

