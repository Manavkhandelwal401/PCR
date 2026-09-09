package com.phantom.CodeReviewer.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "review_jobs", indexes = {
        @Index(name = "idx_review_jobs_repo_status", columnList = "repository_id, status"),
        @Index(name = "idx_review_jobs_next_run", columnList = "status, next_run_at"),
        @Index(name = "idx_review_jobs_priority", columnList = "priority, status")
})
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReviewJob {

    @Id
    @Column(length = 64)
    private String id; // UUID

    @Column(name = "repository_id", nullable = false)
    private Long repositoryId;

    @Column(name = "user_id", nullable = false)
    private String userId;

    @Column(name = "review_type", nullable = false, length = 32)
    private String reviewType; // "BACKGROUND" or "USER_REQUESTED"

    @Column(nullable = false, length = 16)
    private String priority; // "HIGH", "NORMAL", "LOW"

    @Column(nullable = false, length = 32)
    private String status; // "QUEUED", "DISCOVERING", "RUNNING", "WAITING", "PAUSED", "COMPLETED", "FAILED", "CANCELLED"

    @Column(name = "commit_sha", length = 64)
    private String commitSha;

    @Column(name = "current_folder", length = 512)
    private String currentFolder;

    @Column(name = "current_file", length = 512)
    private String currentFile;

    @Builder.Default
    private int completedFiles = 0;

    @Builder.Default
    private int totalFiles = 0;

    @Builder.Default
    private int remainingFiles = 0;

    @Builder.Default
    private int progressPercentage = 0;

    @Column(name = "delay_between_steps_ms", nullable = false)
    private long delayBetweenStepsMs; // 10000 (User) or 60000 (Background)

    @Column(name = "next_run_at")
    private LocalDateTime nextRunAt; // Recoverable DB-backed timestamp for rate-limit delay

    @Column(name = "heartbeat_at")
    private LocalDateTime heartbeatAt; // Updated during active execution to detect worker crashes

    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    private LocalDateTime startedAt;

    private LocalDateTime pausedAt;

    private LocalDateTime completedAt;

    @Column(name = "error_message", columnDefinition = "TEXT")
    private String errorMessage;
}
