package com.phantom.CodeReviewer.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "code_dependencies", indexes = {
        @Index(name = "idx_deps_source", columnList = "source_node_id"),
        @Index(name = "idx_deps_target", columnList = "target_node_id"),
        @Index(name = "idx_deps_repo", columnList = "repository_id")
})
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CodeDependency {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "repository_id", nullable = false)
    private Long repositoryId;

    @Column(name = "source_node_id", nullable = false)
    private Long sourceNodeId;

    @Column(name = "target_node_id")
    private Long targetNodeId;

    @Column(name = "target_path", length = 512)
    private String targetPath; // e.g. "com.phantom.CodeReviewer.service.AuthService"

    @Column(nullable = false, length = 32)
    private String dependencyType; // IMPORT, INHERITANCE, CALL, INJECTION

    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();
}
