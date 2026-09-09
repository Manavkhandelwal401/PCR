package com.phantom.CodeReviewer.service;

import com.phantom.CodeReviewer.entity.Review;
import com.phantom.CodeReviewer.repository.ReviewRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Slf4j
public class LocalReviewAsyncService {

    private final AiReviewService aiReviewService;
    private final ReviewRepository reviewRepository;

    @Async
    public void processLocalReviewAsync(Long reviewId, String combinedFileContent, int fileCount, String userEmail) {
        log.info("--> Starting asynchronous local code review #{} for {} file(s) [User: {}]", reviewId, fileCount, userEmail);
        try {
            // Check cache: If an identical review for this user and content already exists with COMPLETED status and matching engine version, reuse it
            String currentVersion = aiReviewService.getEngineVersion();
            java.util.Optional<Review> cachedOpt = reviewRepository
                    .findFirstByUserEmailAndRepositoryNameAndCodeDiffAndStatusAndEngineVersionOrderByCreatedAtDesc(
                            userEmail, "Local Upload", combinedFileContent, "COMPLETED", currentVersion);

            if (cachedOpt.isPresent()) {
                Review cached = cachedOpt.get();
                log.info("--> [REVIEW-CACHE-HIT] Exact match found for local upload (Cached Review #{})! Reusing results.", cached.getId());
                boolean saved = tryUpdateReview(reviewId, r -> {
                    r.setAiComment(cached.getAiComment());
                    r.setSeverity(cached.getSeverity());
                    r.setQualityRating(cached.getQualityRating());
                    r.setEngineVersion(currentVersion);
                    r.setStatus("COMPLETED");
                });
                if (saved) {
                    log.info("--> Successfully served cached review #{} for user {}", reviewId, userEmail);
                    return;
                } else {
                    markReviewFailed(reviewId, "Database persistence failed after retries.");
                    return;
                }
            }

            // Cache miss: Run unified multi-perspective inspection on the combined file content with progress heartbeat
            AiReviewService.AiReviewResponse aiResponse = aiReviewService.reviewSingleFileUnified(combinedFileContent, (chunk, total) -> {
                tryUpdateReview(reviewId, r -> {
                    r.setCreatedAt(java.time.LocalDateTime.now());
                    r.setAiComment("Analyzing files: section " + chunk + " of " + total + " in progress across token windows...");
                });
            });

            if (aiResponse == null || !aiResponse.success()) {
                String errorMsg = (aiResponse != null && aiResponse.comment() != null)
                        ? aiResponse.comment()
                        : "AI analysis failed to complete.";
                throw new RuntimeException(errorMsg);
            }

            // Engine version is persisted cleanly in review entity without polluting the markdown comment
            String versionedComment = aiResponse.comment();

            // Persist the completed review with retry to handle transient DB connection glitches
            boolean saved = tryUpdateReview(reviewId, r -> {
                r.setAiComment(versionedComment);
                r.setSeverity(aiResponse.severity() != null ? aiResponse.severity() : "Unknown");
                r.setQualityRating(aiResponse.qualityRating());
                r.setEngineVersion(currentVersion);
                r.setStatus("COMPLETED");
            });

            if (saved) {
                log.info("--> Successfully completed and saved Local Upload review #{} for user {}. Severity: {}, Quality: {}/10",
                        reviewId, userEmail, aiResponse.severity(), aiResponse.qualityRating());
            } else {
                log.error("--> Failed to save completed review #{} after retries. Escalating to FAILED.", reviewId);
                markReviewFailed(reviewId, "Failed to save completed review results into database.");
            }

        } catch (Exception e) {
            log.error("--> Error during asynchronous local code review #{}: {}", reviewId, e.getMessage(), e);
            markReviewFailed(reviewId, "Analysis failed: " + (e.getMessage() != null ? e.getMessage() : "Internal processing error"));
        }
    }

    private final com.phantom.CodeReviewer.repository.ReviewFindingRepository reviewFindingRepository;

    @Async
    public void processSingleFileReviewAsync(Long reviewId, Long repoId, String filePath, String commitSha, String fileContent, String userEmail) {
        log.info("--> Starting asynchronous single-file repository review #{} for repoId: {}, file: {} [User: {}]",
                reviewId, repoId, filePath, userEmail);
        try {
            String promptContext = "--- File: " + filePath + " ---\n" + fileContent;
            String currentVersion = aiReviewService.getEngineVersion();

            // Check cache: Check if an identical review for this file & content already exists with matching engine version
            String repoTarget = reviewRepository.findById(reviewId).map(Review::getRepositoryName).orElse(null);
            if (repoTarget != null) {
                java.util.Optional<Review> cachedOpt = reviewRepository
                        .findFirstByUserEmailAndRepositoryNameAndCodeDiffAndStatusAndEngineVersionOrderByCreatedAtDesc(
                                userEmail, repoTarget, promptContext, "COMPLETED", currentVersion);

                if (cachedOpt.isPresent()) {
                    Review cached = cachedOpt.get();
                    String cachedJobId = "manual-file-review-" + cached.getId();
                    java.util.List<com.phantom.CodeReviewer.entity.ReviewFinding> prevFindings = reviewFindingRepository.findByReviewJobIdOrderByCreatedAtAsc(cachedJobId);
                    boolean expectFindings = hasReportedIssues(cached.getAiComment(), cached.getSeverity());

                    // If the cached review reported defects but its discrete findings were pruned or never created,
                    // invalidate the cache and run a fresh AI inspection to ensure complete repository health sync.
                    if (expectFindings && (prevFindings == null || prevFindings.isEmpty())) {
                        log.warn("--> [REVIEW-CACHE-STALE] Cached Review #{} reported defects but findings are missing from DB. Invalidating cache and re-running AI review.", cached.getId());
                    } else {
                        log.info("--> [REVIEW-CACHE-HIT] Exact match found for file {} (Cached Review #{})! Reusing results.", filePath, cached.getId());

                        // Reconcile ReviewFinding table on cache hit so repository health is always synchronized
                        boolean replaySuccess = true;
                        try {
                            java.time.LocalDateTime now = java.time.LocalDateTime.now();
                            reviewFindingRepository.markFindingsResolvedForFile(repoId, filePath, now);

                            if (prevFindings != null && !prevFindings.isEmpty()) {
                                java.util.List<com.phantom.CodeReviewer.entity.ReviewFinding> toReplay = new java.util.ArrayList<>();
                                for (com.phantom.CodeReviewer.entity.ReviewFinding pf : prevFindings) {
                                    toReplay.add(com.phantom.CodeReviewer.entity.ReviewFinding.builder()
                                            .repositoryId(repoId)
                                            .reviewJobId("manual-file-review-" + reviewId)
                                            .filePath(filePath)
                                            .commitSha(commitSha != null ? commitSha : "HEAD")
                                            .category(pf.getCategory())
                                            .severity(pf.getSeverity())
                                            .findingComment(pf.getFindingComment())
                                            .isResolved(false)
                                            .createdAt(now)
                                            .build());
                                }
                                reviewFindingRepository.saveAll(toReplay);
                            }
                        } catch (Exception cfe) {
                            log.error("Failed to reconcile/replay findings for cache-hit file {}: {}", filePath, cfe.getMessage(), cfe);
                            replaySuccess = false;
                        }

                        if (!replaySuccess) {
                            markReviewFailed(reviewId, "Failed to synchronize repository findings during cache replay.");
                            return;
                        }

                        boolean saved = tryUpdateReview(reviewId, r -> {
                            r.setAiComment(cached.getAiComment());
                            r.setSeverity(cached.getSeverity());
                            r.setQualityRating(cached.getQualityRating());
                            r.setEngineVersion(currentVersion);
                            r.setStatus("COMPLETED");
                        });
                        if (saved) {
                            log.info("--> Successfully served cached single-file review #{} for user {}", reviewId, userEmail);
                            return;
                        } else {
                            markReviewFailed(reviewId, "Database persistence failed after retries.");
                            return;
                        }
                    }
                }
            }

            // Pass chunk progress callback to keep Review alive and update status across token windows
            AiReviewService.AiReviewResponse aiResponse = aiReviewService.reviewSingleFileUnified(promptContext, (chunk, total) -> {
                tryUpdateReview(reviewId, r -> {
                    r.setCreatedAt(java.time.LocalDateTime.now());
                    r.setAiComment("Analyzing file: " + filePath + " (chunk " + chunk + " of " + total + " in progress)...");
                });
            });

            if (aiResponse == null || !aiResponse.success()) {
                String errMsg = (aiResponse != null && aiResponse.comment() != null)
                        ? aiResponse.comment()
                        : "AI evaluation failed or returned empty.";
                throw new RuntimeException(errMsg);
            }

            // Engine version is persisted cleanly in review entity without polluting the markdown comment
            String versionedComment = aiResponse.comment();

            // 1. Reconcile findings strictly for this repository and this exact file path
            // Save INDIVIDUAL discrete ReviewFinding records for each discovered defect
            boolean findingsPersisted = true;
            try {
                java.time.LocalDateTime now = java.time.LocalDateTime.now();
                reviewFindingRepository.markFindingsResolvedForFile(repoId, filePath, now);

                if (aiResponse.findings() != null && !aiResponse.findings().isEmpty()) {
                    java.util.List<com.phantom.CodeReviewer.entity.ReviewFinding> newFindings = new java.util.ArrayList<>();
                    for (AiReviewService.FindingDetail fd : aiResponse.findings()) {
                        String defectComment = "- **[" + fd.target() + "] [Severity: " + fd.severity() + "]**: " + fd.description();
                        String cat = fd.category() != null ? fd.category() : "CODE_INSPECTION";
                        if (cat.length() > 32) cat = cat.substring(0, 32);
                        String sev = fd.severity() != null ? fd.severity() : "MODERATE";
                        if (sev.length() > 32) sev = sev.substring(0, 32);
                        String cleanFilePath = filePath.length() > 512 ? filePath.substring(0, 512) : filePath;

                        newFindings.add(com.phantom.CodeReviewer.entity.ReviewFinding.builder()
                                .repositoryId(repoId)
                                .reviewJobId("manual-file-review-" + reviewId)
                                .filePath(cleanFilePath)
                                .commitSha(commitSha != null && commitSha.length() <= 64 ? commitSha : (commitSha != null ? commitSha.substring(0, 64) : "HEAD"))
                                .category(cat)
                                .severity(sev)
                                .findingComment(defectComment)
                                .isResolved(false)
                                .createdAt(now)
                                .build());
                    }
                    reviewFindingRepository.saveAll(newFindings);
                }
            } catch (Exception fe) {
                log.warn("Non-fatal: Failed to persist discrete review findings for file {}: {}. Continuing review completion.", filePath, fe.getMessage());
            }

            // 2. Persist the completed review record in PostgreSQL
            boolean saved = tryUpdateReview(reviewId, r -> {
                r.setAiComment(versionedComment);
                r.setSeverity(aiResponse.severity() != null ? aiResponse.severity() : "Unknown");
                r.setQualityRating(aiResponse.qualityRating());
                r.setEngineVersion(currentVersion);
                r.setStatus("COMPLETED");
            });

            if (saved) {
                log.info("--> Successfully completed single-file review #{} for file {} (User: {})", reviewId, filePath, userEmail);
            } else {
                log.error("--> Failed to save completed single-file review #{} after retries. Escalating to FAILED.", reviewId);
                markReviewFailed(reviewId, "Failed to persist completed review to database.");
            }
        } catch (Exception e) {
            log.error("--> Error during single-file review #{}: {}", reviewId, e.getMessage(), e);
            markReviewFailed(reviewId, "Analysis failed: " + (e.getMessage() != null ? e.getMessage() : "Internal processing error"));
        }
    }


    private void markReviewFailed(Long reviewId, String reason) {
        tryUpdateReview(reviewId, r -> {
            r.setStatus("FAILED");
            r.setAiComment(reason);
        });
    }

    private boolean hasReportedIssues(String comment, String severity) {
        if (comment == null || comment.isBlank()) {
            return false;
        }
        String sev = severity != null ? severity.toUpperCase() : "";
        if (sev.contains("CRITICAL") || sev.contains("HIGH") || sev.contains("MODERATE") || sev.contains("LOW")) {
            return true;
        }
        boolean logicClean = comment.contains("✅ No logic issues");
        boolean syntaxClean = comment.contains("✅ No syntax issues");
        boolean perfClean = comment.contains("✅ No performance issues");
        boolean secClean = comment.contains("✅ No security risks");
        return !(logicClean && syntaxClean && perfClean && secClean);
    }

    /**
     * Helper to update a review record with retry against transient DB connection drops
     */
    private boolean tryUpdateReview(Long reviewId, java.util.function.Consumer<Review> updater) {
        for (int attempt = 1; attempt <= 3; attempt++) {
            try {
                Review review = reviewRepository.findById(reviewId).orElse(null);
                if (review != null) {
                    updater.accept(review);
                    reviewRepository.save(review);
                    return true;
                }
                return false;
            } catch (Exception ex) {
                log.warn("DB update attempt {}/3 failed for review #{}: {}", attempt, reviewId, ex.getMessage());
                if (attempt < 3) {
                    try {
                        Thread.sleep(1000L * attempt);
                    } catch (InterruptedException ie) {
                        Thread.currentThread().interrupt();
                        break;
                    }
                }
            }
        }
        return false;
    }
}
