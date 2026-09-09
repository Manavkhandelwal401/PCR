package com.phantom.CodeReviewer.service;

import org.junit.jupiter.api.Test;
import java.util.ArrayList;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

public class FourDimensionScoringTest {

    @Test
    void testExampleA_FourHighLogicDefects_CleanOtherCategories() {
        // Example from instructions:
        // Logic has HIGH defects (evaluating to ~4.0-5.0), Syntax clean (10), Performance clean (10), Security clean (10).
        // Weighted score should remain around 8.5/10 and NOT collapse to 3/10!
        AiReviewService service = new AiReviewService(null, null, null);

        List<AiReviewService.FindingDetail> findings = new ArrayList<>();
        findings.add(new AiReviewService.FindingDetail("LOGIC", "HIGH", "Line 10", "Missing boundary check leading to off-by-one error", "Wrong calculation"));
        findings.add(new AiReviewService.FindingDetail("LOGIC", "HIGH", "Line 25", "Infinite recursion condition on negative inputs", "StackOverflowError"));
        findings.add(new AiReviewService.FindingDetail("LOGIC", "HIGH", "Line 40", "State mutation bypasses atomic synchronization", "Inconsistent state"));
        findings.add(new AiReviewService.FindingDetail("LOGIC", "HIGH", "Line 55", "Unreachable branch prevents fallback processing", "Dead code"));

        // Call private calculateFinalMetricsFromFindings via reflection or package-private helper
        try {
            java.lang.reflect.Method method = AiReviewService.class.getDeclaredMethod("calculateFinalMetricsFromFindings", String.class, List.class);
            method.setAccessible(true);
            AiReviewService.AiReviewResponse response = (AiReviewService.AiReviewResponse) method.invoke(service, "Test report", findings);

            assertNotNull(response);
            assertEquals("HIGH", response.severity(), "Final severity should be HIGH since there are HIGH logic defects and no CRITICAL defects");
            
            // Logic dimension has 4 HIGH findings => dimension score is 4.0
            // Syntax = 10.0, Perf = 10.0, Sec = 10.0
            // Weighted: 0.30(4.0) + 0.20(10.0) + 0.20(10.0) + 0.30(10.0) = 1.2 + 2.0 + 2.0 + 3.0 = 8.2 / 10
            // Integer quality rating = 8.
            assertTrue(response.qualityRating() >= 8, "Quality rating must remain strong (~8/10), NOT collapsed to 3! Actual: " + response.qualityRating());
            assertTrue(response.comment().contains("Quality Scorecard & Assessment Breakdown"), "Comment must include the scorecard breakdown");
            assertTrue(response.comment().contains("Weighted Score Calculation"), "Comment must include calculation formula");
            System.out.println("Test Example A Passed! Rating=" + response.qualityRating() + ", Severity=" + response.severity());
        } catch (Exception e) {
            fail("Reflection test failed: " + e.getMessage());
        }
    }

    @Test
    void testExampleB_TwoHighLogicDefects_CleanOtherCategories() {
        // Example A in user prompt:
        // Logic: 2 HIGH findings -> 5.0/10
        // Syntax: Clean -> 10.0
        // Performance: Clean -> 10.0
        // Security: Clean -> 10.0
        // Weighted score: 0.30(5) + 0.20(10) + 0.20(10) + 0.30(10) = 8.5/10
        AiReviewService service = new AiReviewService(null, null, null);

        List<AiReviewService.FindingDetail> findings = new ArrayList<>();
        findings.add(new AiReviewService.FindingDetail("LOGIC", "HIGH", "Line 10", "Incorrect sort comparator violating transitivity", "Wrong ordering"));
        findings.add(new AiReviewService.FindingDetail("LOGIC", "HIGH", "Line 25", "Division by zero when input is empty", "ArithmeticException"));

        try {
            java.lang.reflect.Method method = AiReviewService.class.getDeclaredMethod("calculateFinalMetricsFromFindings", String.class, List.class);
            method.setAccessible(true);
            AiReviewService.AiReviewResponse response = (AiReviewService.AiReviewResponse) method.invoke(service, "Test report", findings);

            assertNotNull(response);
            assertEquals("HIGH", response.severity());
            // 8.5 rounds to 8 or 9
            assertTrue(response.qualityRating() >= 8 && response.qualityRating() <= 9, "Quality rating should be 8 or 9 (rounded from 8.5). Actual: " + response.qualityRating());
            assertTrue(response.comment().contains("8.5/10"), "Exact fractional calculation should show 8.5/10");
            System.out.println("Test Example B (User Prompt Example A) Passed! Rating=" + response.qualityRating() + ", Score=8.5/10");
        } catch (Exception e) {
            fail("Reflection test failed: " + e.getMessage());
        }
    }

    @Test
    void testCriticalSecurityVulnerability() {
        AiReviewService service = new AiReviewService(null, null, null);

        List<AiReviewService.FindingDetail> findings = new ArrayList<>();
        findings.add(new AiReviewService.FindingDetail("SECURITY", "CRITICAL", "Line 42", "SQL Injection in raw query concatenation", "Arbitrary DB access"));

        try {
            java.lang.reflect.Method method = AiReviewService.class.getDeclaredMethod("calculateFinalMetricsFromFindings", String.class, List.class);
            method.setAccessible(true);
            AiReviewService.AiReviewResponse response = (AiReviewService.AiReviewResponse) method.invoke(service, "Test report", findings);

            assertEquals("CRITICAL", response.severity(), "Severity must be CRITICAL when critical security flaw exists");
            // Security score = 3.5 -> Weighted: 0.30(10) + 0.20(10) + 0.20(10) + 0.30(3.5) = 3.0 + 2.0 + 2.0 + 1.05 = 8.05 -> ~8.1
            // Final severity is CRITICAL
            assertTrue(response.comment().contains("CRITICAL"));
            System.out.println("Test Critical Security Passed! Severity=" + response.severity());
        } catch (Exception e) {
            fail("Reflection test failed: " + e.getMessage());
        }
    }

    @Test
    void testCleanInspectionAllCategories() {
        AiReviewService service = new AiReviewService(null, null, null);

        List<AiReviewService.FindingDetail> findings = new ArrayList<>();

        try {
            java.lang.reflect.Method method = AiReviewService.class.getDeclaredMethod("calculateFinalMetricsFromFindings", String.class, List.class);
            method.setAccessible(true);
            AiReviewService.AiReviewResponse response = (AiReviewService.AiReviewResponse) method.invoke(service, "Test report", findings);

            assertEquals("GOOD", response.severity());
            assertEquals(10, response.qualityRating());
            assertTrue(response.comment().contains("10.0/10"));
            System.out.println("Test Clean Passed! Rating=" + response.qualityRating() + ", Severity=" + response.severity());
        } catch (Exception e) {
            fail("Reflection test failed: " + e.getMessage());
        }
    }
}
