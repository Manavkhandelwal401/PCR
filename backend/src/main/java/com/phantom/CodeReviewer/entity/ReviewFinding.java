package com.phantom.CodeReviewer.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "review_findings", indexes = {
        @Index(name = "idx_findings_repo_file", columnList = "repository_id, file_path, is_resolved"),
        @Index(name = "idx_findings_job", columnList = "review_job_id")
})
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReviewFinding {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "repository_id", nullable = false)
    private Long repositoryId;

    @Column(name = "review_job_id", nullable = false, length = 64)
    private String reviewJobId;

    @Column(name = "file_path", nullable = false, length = 512)
    private String filePath;

    @Column(name = "commit_sha", length = 64)
    private String commitSha;

    @Column(name = "file_hash", length = 64)
    private String fileHash;

    @Column(nullable = false, length = 32)
    private String category; // LOGIC, SYNTAX, PERFORMANCE, SECURITY

    @Column(nullable = false, length = 32)
    private String severity; // CRITICAL, HIGH, MODERATE, LOW

    @Column(name = "finding_comment", columnDefinition = "TEXT", nullable = false)
    private String findingComment;

    @Builder.Default
    private boolean isResolved = false;

    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    private LocalDateTime resolvedAt;
}
