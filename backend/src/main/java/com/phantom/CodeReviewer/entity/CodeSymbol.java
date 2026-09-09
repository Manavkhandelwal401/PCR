package com.phantom.CodeReviewer.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "code_symbols", indexes = {
        @Index(name = "idx_symbols_node", columnList = "node_id"),
        @Index(name = "idx_symbols_repo", columnList = "repository_id")
})
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CodeSymbol {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "node_id", nullable = false)
    private Long nodeId;

    @Column(name = "repository_id", nullable = false)
    private Long repositoryId;

    @Column(name = "symbol_name", nullable = false)
    private String symbolName; // e.g. "AuthService", "generateJWT"

    @Column(nullable = false, length = 32)
    private String kind; // CLASS, INTERFACE, METHOD, FUNCTION, API_ENDPOINT, VARIABLE

    private Integer lineStart;

    private Integer lineEnd;

    private String signature;

    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();
}
