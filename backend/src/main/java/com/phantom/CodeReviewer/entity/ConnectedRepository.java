package com.phantom.CodeReviewer.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "connected_repositories", uniqueConstraints = {
        @UniqueConstraint(columnNames = {"user_id", "full_name"})
})
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ConnectedRepository {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private String userId; // User email or unique identifier

    @Column(name = "full_name", nullable = false)
    private String fullName; // e.g. "owner/repo"

    private String name;

    private String defaultBranch;

    private String latestCommitSha;

    private String lastAnalyzedCommitSha;

    private boolean isPrivate;

    private String language;

    private String htmlUrl;

    @Builder.Default
    private String status = "CONNECTED"; // CONNECTED, DISCONNECTED

    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    @Builder.Default
    private LocalDateTime updatedAt = LocalDateTime.now();
}
