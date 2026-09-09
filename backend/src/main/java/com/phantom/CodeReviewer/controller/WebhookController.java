package com.phantom.CodeReviewer.controller;

import tools.jackson.databind.ObjectMapper;
import com.phantom.CodeReviewer.service.KafkaProducerService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/webhook")
public class WebhookController {

    @Autowired
    private KafkaProducerService kafkaProducerService;

    @Autowired
    private ObjectMapper objectMapper;

    @Value("${github.webhook.secret:}")
    private String webhookSecret;

    @GetMapping("/health-check")
    public String check(){
        return "Everything is Good!!";
    }

    @PostMapping("/github")
    public ResponseEntity<String> handleGithubWebhook(
            @RequestHeader("X-GitHub-Event") String eventType,
            @RequestHeader(value = "X-Hub-Signature-256", required = false) String signatureHeader,
            @RequestBody byte[] rawPayload) {

        System.out.println("Received GitHub Event: " + eventType);

        // Security check: Webhook secret must be configured in environment; reject unauthenticated calls
        if (webhookSecret == null || webhookSecret.trim().isEmpty()) {
            System.err.println("CRITICAL: GitHub Webhook received but GITHUB_WEBHOOK_SECRET is not configured on backend. Rejecting.");
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                    .body("Webhook receiver is not configured with a verification secret.");
        }

        if (signatureHeader == null || !signatureHeader.startsWith("sha256=")) {
            System.err.println("Webhook verification failed: Missing or invalid X-Hub-Signature-256 header");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Missing or invalid X-Hub-Signature-256 header");
        }

        String expectedSignature = "sha256=" + calculateHmacSha256(rawPayload, webhookSecret.trim());
        if (!MessageDigest.isEqual(expectedSignature.getBytes(StandardCharsets.UTF_8), signatureHeader.getBytes(StandardCharsets.UTF_8))) {
            System.err.println("Webhook verification failed: Signature mismatch");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Invalid payload signature");
        }

        try {
            Map<String, Object> payLoad = objectMapper.readValue(rawPayload, Map.class);

            if("pull_request".equals(eventType)) {
                String action = (String) payLoad.get("action");

                if ("opened".equals(action) || "synchronize".equals(action)) {
                    kafkaProducerService.sendWebhookEvent(payLoad);
                }
            }
            return ResponseEntity.ok("Webhook received successfully");
        } catch (Exception e) {
            System.err.println("Error parsing webhook payload: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("Invalid JSON payload");
        }
    }

    private String calculateHmacSha256(byte[] data, String secret) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            SecretKeySpec secretKeySpec = new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256");
            mac.init(secretKeySpec);
            byte[] hash = mac.doFinal(data);
            StringBuilder hexString = new StringBuilder();
            for (byte b : hash) {
                String hex = Integer.toHexString(0xff & b);
                if (hex.length() == 1) hexString.append('0');
                hexString.append(hex);
            }
            return hexString.toString();
        } catch (Exception e) {
            throw new RuntimeException("Failed to calculate HMAC-SHA256: " + e.getMessage(), e);
        }
    }
}