package com.phantom.CodeReviewer.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.kafka.support.SendResult;
import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.TimeUnit;

@Service
@Slf4j
public class KafkaProducerService {
    private static final String TOPIC = "code-review-topic";

    @Autowired
    private KafkaTemplate<String, Map<String, Object>> kafkaTemplate;

    public void sendWebhookEvent(Map<String, Object> payLoad){
        try {
            CompletableFuture<SendResult<String, Map<String, Object>>> future = kafkaTemplate.send(TOPIC, payLoad);
            SendResult<String, Map<String, Object>> result = future.get(5, TimeUnit.SECONDS);
            log.info("--> Webhook payload successfully published to Kafka topic {} [partition: {}, offset: {}]",
                    TOPIC, result.getRecordMetadata().partition(), result.getRecordMetadata().offset());
        } catch (Exception e) {
            log.error("CRITICAL: Failed to publish message to Kafka topic {}: {}", TOPIC, e.getMessage(), e);
            throw new RuntimeException("Kafka producer failed to publish review event: " + e.getMessage(), e);
        }
    }
}
