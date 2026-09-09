package com.phantom.CodeReviewer.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "review_tasks", indexes = {
        @Index(name = "idx_review_tasks_dispatch", columnList = "job_id, status, sequence_order"),
        @Index(name = "idx_review_tasks_next_run", columnList = "status, next_run_at"),
        @Index(name = "idx_review_tasks_idempotency", columnList = "idempotency_key", unique = true)
})
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReviewTask {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "job_id", nullable = false, length = 64)
    private String jobId;

    @Column(name = "repository_id", nullable = false)
    private Long repositoryId;

    @Column(name = "node_id")
    private Long nodeId;

    @Column(name = "file_path", nullable = false, length = 512)
    private String filePath;

    @Column(name = "folder_path", length = 512)
    private String folderPath;

    @Column(name = "file_hash", length = 64)
    private String fileHash;

    @Column(name = "commit_sha", length = 64)
    private String commitSha;

    @Column(name = "idempotency_key", nullable = false, length = 256)
    private String idempotencyKey; // repoId:commitSha:filePath

    @Column(name = "sequence_order", nullable = false)
    private int sequenceOrder; // Folder-first sequence order

    @Column(nullable = false, length = 32)
    private String status; // PENDING, WAITING, IN_PROGRESS, COMPLETED, SKIPPED, FAILED

    @Column(name = "next_run_at")
    private LocalDateTime nextRunAt; // Persisted execution delay boundary

    @Column(name = "heartbeat_at")
    private LocalDateTime heartbeatAt; // Timestamp for worker crash detection

    @Builder.Default
    private int retryCount = 0;

    @Builder.Default
    private int maxRetries = 3;

    @Column(name = "error_message", columnDefinition = "TEXT")
    private String errorMessage;

    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    @Builder.Default
    private LocalDateTime updatedAt = LocalDateTime.now();
}
