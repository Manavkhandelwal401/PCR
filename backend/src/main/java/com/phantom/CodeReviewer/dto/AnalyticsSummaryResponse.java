package com.phantom.CodeReviewer.dto;

public record AnalyticsSummaryResponse(
        long totalReviews,
        double averageQualityRating,
        long criticalIssuesCount,
        long totalIssuesFound,
        long meanLatencyMs,
        long highIssuesCount,
        long moderateIssuesCount,
        long lowIssuesCount,
        long goodIssuesCount
) {}
