package com.phantom.CodeReviewer.service;

import com.phantom.CodeReviewer.entity.Review;
import com.phantom.CodeReviewer.repository.ReviewRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Service;

import java.util.Map;

@Service
@RequiredArgsConstructor
public class KafkaConsumerService {

    private final AiReviewService aiReviewService;

    private final ReviewRepository reviewRepository;

    private final GitHubService githubService;

    @KafkaListener(topics = "code-review-topic", groupId = "code-reviewer-group")
    public void consumeWebhookEvent(Map<String, Object> payload) {
        System.out.println("--> Consumed webhook event from Kafka! Processing review...");

        try {
            // 1. Correctly extract installation ID from nested GitHub payload
            Map<String, Object> installationMap = (Map<String, Object>) payload.get("installation");
            Long installationId = (installationMap != null && installationMap.get("id") != null) ?
                    ((Number) installationMap.get("id")).longValue() : null;

            Map<String, Object> repoMap = (Map<String, Object>) payload.get("repository");
            String repoName = repoMap != null ? (String) repoMap.get("full_name") : null;

            Map<String, Object> prMap = (Map<String, Object>) payload.get("pull_request");
            Long prNumber = (prMap != null && prMap.get("number") != null) ?
                    ((Number) prMap.get("number")).longValue() : null;

            if (installationId == null || repoName == null || prNumber == null) {
                System.err.println("Missing required PR metadata in Kafka consumer payload. Skipping.");
                return;
            }

            // 2. Fetch real code diff
            System.out.println("Fetching real code diff for Repo: " + repoName + ", PR#: " + prNumber);
            String codeDiff = githubService.getPullRequestDiff(installationId, repoName, prNumber);

            if (codeDiff == null || codeDiff.isEmpty()) {
                System.err.println("Failed to fetch code diff or no code changes detected.");
                return;
            }

            // 3. AI Review call (Assuming AiReviewService now returns the parsed JSON object)
            // Make sure your AiReviewService returns an object with comment, severity, and qualityRating fields
            AiReviewService.AiReviewResponse aiResponse = aiReviewService.reviewCode(codeDiff);

            // 4. Database save (Dynamic data mapped from AI)
            String userEmail = (String) payload.get("user_email");

            Review review = new Review();
            review.setUserEmail(userEmail);
            review.setRepositoryName(repoName);
            review.setPullRequestNumber(prNumber);
            review.setCodeDiff(codeDiff);
            review.setAiComment(aiResponse.comment());
            review.setSeverity(aiResponse.severity());         // Dynamically set by AI
            review.setQualityRating(aiResponse.qualityRating()); // Dynamically set by AI

            reviewRepository.save(review);
            System.out.println("--> Async Review completed and saved via Kafka worker for Repo: " + repoName + " (User: " + userEmail + ")");

            githubService.postCommentToPullRequest(installationId, repoName, prNumber, aiResponse.comment());

        } catch (Exception e) {
            System.err.println("CRITICAL: Error processing Kafka consumer event: " + e.getMessage());
            e.printStackTrace();
            // Do not silently swallow consumer failure; rethrow to allow Spring Kafka error handler/retry/dead-letter to handle it
            if (e instanceof RuntimeException re) {
                throw re;
            }
            throw new RuntimeException("Kafka message processing failed: " + e.getMessage(), e);
        }
    }
}