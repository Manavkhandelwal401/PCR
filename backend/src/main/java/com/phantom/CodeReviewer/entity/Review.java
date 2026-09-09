package com.phantom.CodeReviewer.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "code-reviews")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Review{
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_email")
    private String userEmail;

    private String repositoryName;
    private Long pullRequestNumber;

    @Column(columnDefinition = "TEXT")
    private String codeDiff;

    @Column(columnDefinition = "TEXT")
    private String aiComment;

    private String severity;
    private int qualityRating;

    @Column(length = 32)
    private String status = "COMPLETED"; // "PROCESSING", "COMPLETED", "FAILED"

    @Column(name = "engine_version", length = 32)
    private String engineVersion;

    private LocalDateTime createdAt = LocalDateTime.now();
}
