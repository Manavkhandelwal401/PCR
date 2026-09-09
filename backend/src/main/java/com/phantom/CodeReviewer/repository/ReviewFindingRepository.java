package com.phantom.CodeReviewer.repository;

import com.phantom.CodeReviewer.entity.ReviewFinding;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface ReviewFindingRepository extends JpaRepository<ReviewFinding, Long> {

    List<ReviewFinding> findByReviewJobIdOrderByCreatedAtAsc(String reviewJobId);

    List<ReviewFinding> findByRepositoryIdAndIsResolvedFalseOrderByCreatedAtDesc(Long repositoryId);

    List<ReviewFinding> findByRepositoryIdAndFilePath(Long repositoryId, String filePath);

    @org.springframework.transaction.annotation.Transactional
    @Modifying
    @Query("UPDATE ReviewFinding f SET f.isResolved = true, f.resolvedAt = :resolvedAt WHERE f.repositoryId = :repoId AND f.filePath = :filePath AND f.isResolved = false")
    void markFindingsResolvedForFile(@Param("repoId") Long repoId, @Param("filePath") String filePath, @Param("resolvedAt") LocalDateTime resolvedAt);
}
