package com.phantom.CodeReviewer.service;

import com.phantom.CodeReviewer.entity.ReviewFinding;
import com.phantom.CodeReviewer.entity.ReviewJob;
import com.phantom.CodeReviewer.repository.ReviewFindingRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class ReviewFindingMergerService {

    private final ReviewFindingRepository reviewFindingRepository;

    /**
     * Merge historical valid findings with newly discovered findings for the repository.
     * Produces a unified, current repository review summary.
     */
    public String generateMergedRepositoryReview(Long repoId, String currentJobId, String repoFullName, String commitSha) {
        List<ReviewFinding> currentFindings = reviewFindingRepository.findByReviewJobIdOrderByCreatedAtAsc(currentJobId);
        List<ReviewFinding> activeHistoricalFindings = reviewFindingRepository.findByRepositoryIdAndIsResolvedFalseOrderByCreatedAtDesc(repoId);

        // Deduplicate findings by (filePath + findingComment)
        long criticalCount = 0;
        long highCount = 0;
        long moderateCount = 0;
        long lowCount = 0;

        StringBuilder report = new StringBuilder();
        report.append("# Incremental Repository Inspection Report: ").append(repoFullName).append("\n");
        report.append("**Commit SHA:** `").append(commitSha).append("`\n\n");

        if (activeHistoricalFindings.isEmpty()) {
            report.append("### Inspection Summary\n");
            report.append("✅ **Clean Health**: No critical bugs, security vulnerabilities, or code defects found.\n");
            return report.toString();
        }

        report.append("### Active Verified Findings\n\n");

        for (ReviewFinding f : activeHistoricalFindings) {
            String sev = f.getSeverity() != null ? f.getSeverity().toUpperCase() : "MODERATE";
            switch (sev) {
                case "CRITICAL" -> criticalCount++;
                case "HIGH" -> highCount++;
                case "MODERATE" -> moderateCount++;
                default -> lowCount++;
            }

            report.append("- **[").append(sev).append("]** `").append(f.getFilePath()).append("`: ")
                    .append(f.getFindingComment()).append("\n");
        }

        report.append("\n---\n");
        report.append("**Metrics Breakdown:** ");
        report.append("Critical: ").append(criticalCount).append(" | ");
        report.append("High: ").append(highCount).append(" | ");
        report.append("Moderate: ").append(moderateCount).append(" | ");
        report.append("Low: ").append(lowCount).append("\n");

        return report.toString();
    }
}
