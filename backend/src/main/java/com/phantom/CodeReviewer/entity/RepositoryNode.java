package com.phantom.CodeReviewer.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "repository_nodes", indexes = {
        @Index(name = "idx_repo_nodes_repo_path", columnList = "repository_id, path", unique = true),
        @Index(name = "idx_repo_nodes_parent", columnList = "repository_id, parent_path")
})
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RepositoryNode {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "repository_id", nullable = false)
    private Long repositoryId;

    @Column(name = "node_type", nullable = false, length = 16)
    private String nodeType; // FOLDER, FILE

    @Column(nullable = false, length = 512)
    private String path; // e.g. "src/main/java/com/phantom/CodeReviewer/service/AuthService.java"

    @Column(nullable = false, length = 256)
    private String name; // e.g. "AuthService.java"

    @Column(name = "parent_path", length = 512)
    private String parentPath; // e.g. "src/main/java/com/phantom/CodeReviewer/service"

    @Column(name = "file_hash", length = 64)
    private String fileHash; // SHA-256 or Git blob SHA for change detection

    private String language;

    private Long sizeBytes;

    private String lastReviewedCommitSha;

    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    @Builder.Default
    private LocalDateTime updatedAt = LocalDateTime.now();
}
