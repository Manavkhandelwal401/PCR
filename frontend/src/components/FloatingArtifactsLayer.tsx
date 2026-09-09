/**
 * @file src/components/FloatingArtifactsLayer.tsx
 * @description Sparse, scroll-distributed floating dollar bills across the
 *              landing page.
 *
 * Visual rules:
 *   - Never intentionally places more than 4-5 bills in the same viewport area.
 *   - 5-6 visible is acceptable only when an adjacent bill is entering/exiting
 *     at the edge of the viewport.
 *   - All bills use the same size/scale.
 *   - Center bills are significantly more transparent.
 *   - Bills are staggered vertically and horizontally rather than arranged
 *     in a repetitive grid.
 */

import React from 'react';
import { FloatingDollarBill } from './FloatingDollarBill';

export const FloatingArtifactsLayer: React.FC = () => {
  return (
    <div
      className="pointer-events-none absolute inset-0 z-10 h-full w-full overflow-hidden select-none"
    >
      {/* HERO */}
      <FloatingDollarBill
        id="bill-hero-left"
        denomination="$100,000"
        caption="Security Breach Cost"
        subcaption="Auth Bypass Vulnerability // Unvalidated Session"
        top="150px"
        left="2%"
        rotateZ={-13}
        scale={0.88}
        floatDuration={7.2}
        delay={0.1}
        driftRange={11}
        opacity={0.86}
        className="hidden xl:block"
      />

      <FloatingDollarBill
        id="bill-hero-left-center"
        denomination="$25,000"
        caption="Emergency Hotfix"
        subcaption="Broken Access Control // Missed Review"
        top="430px"
        left="20%"
        rotateZ={-6}
        scale={0.88}
        floatDuration={8.2}
        delay={0.5}
        driftRange={9}
        opacity={0.62}
        className="hidden 2xl:block"
      />

      <FloatingDollarBill
        id="bill-hero-center"
        denomination="$5,000"
        caption="TECHNICAL DEBT"
        subcaption="UNREVIEWED CHANGE // FUTURE COST"
        top="700px"
        center
        rotateZ={4}
        scale={0.88}
        floatDuration={10}
        delay={0.8}
        driftRange={6}
        opacity={0.20}
        className="hidden xl:block"
      />

      <FloatingDollarBill
        id="bill-hero-right"
        denomination="$50,000"
        caption="Production Downtime / Hr"
        subcaption="Kafka Consumer Starvation // Latency Spike"
        top="285px"
        right="2%"
        rotateZ={9}
        scale={0.88}
        floatDuration={6.9}
        delay={0.4}
        driftRange={13}
        opacity={0.86}
        className="hidden xl:block"
      />

      {/* CODE REVIEW / TRANSITION */}
      <FloatingDollarBill
        id="bill-review-left"
        denomination="$10,000"
        caption="Weekend Emergency Hotfix"
        subcaption="Broken Access Control Merged Without Review"
        top="950px"
        left="5%"
        rotateZ={7}
        scale={0.88}
        floatDuration={8.2}
        delay={0.2}
        driftRange={10}
        opacity={0.82}
        className="hidden lg:block"
      />

      <FloatingDollarBill
        id="bill-review-left-center"
        denomination="$7,500"
        caption="Missed Validation"
        subcaption="Request Boundary // Unchecked Input"
        top="1240px"
        left="21%"
        rotateZ={-5}
        scale={0.88}
        floatDuration={9.1}
        delay={0.8}
        driftRange={8}
        opacity={0.60}
        className="hidden 2xl:block"
      />

      <FloatingDollarBill
        id="bill-review-center"
        denomination="$2,500"
        caption="MISSED EDGE CASE"
        subcaption="ONE LINE // UNKNOWN IMPACT"
        top="1380px"
        center
        rotateZ={-4}
        scale={0.88}
        floatDuration={10.8}
        delay={1.1}
        driftRange={5}
        opacity={0.18}
        className="hidden xl:block"
      />

      <FloatingDollarBill
        id="bill-review-right"
        denomination="$12,000"
        caption="Production Regression"
        subcaption="Behavior Drift // Missing Coverage"
        top="1080px"
        right="4%"
        rotateZ={-8}
        scale={0.88}
        floatDuration={8.4}
        delay={0.6}
        driftRange={11}
        opacity={0.82}
        className="hidden lg:block"
      />

      {/* AGENTS */}
      <FloatingDollarBill
        id="bill-agents-left"
        denomination="$18,000"
        caption="Memory Leak"
        subcaption="Unclosed Stream // Resource Retention"
        top="1590px"
        left="3%"
        rotateZ={-9}
        scale={0.88}
        floatDuration={8.6}
        delay={0.3}
        driftRange={12}
        opacity={0.82}
        className="hidden lg:block"
      />

      <FloatingDollarBill
        id="bill-agents-center"
        denomination="$1,000"
        caption="SMALL DEFECT"
        subcaption="SMALL SURFACE // LARGE POSSIBILITY"
        top="1820px"
        center
        rotateZ={-6}
        scale={0.88}
        floatDuration={11}
        delay={1.2}
        driftRange={5}
        opacity={0.15}
        className="hidden xl:block"
      />

      <FloatingDollarBill
        id="bill-agents-right"
        denomination="$25,000"
        caption="Unchecked N+1 Query"
        subcaption="Database Over-allocation In Nested Loop"
        top="1710px"
        right="3%"
        rotateZ={-11}
        scale={0.88}
        floatDuration={7.7}
        delay={0.7}
        driftRange={12}
        opacity={0.84}
        className="hidden xl:block"
      />

      {/* PRODUCTION / CONVERSION */}
      <FloatingDollarBill
        id="bill-production-left"
        denomination="$20,000"
        caption="Deployment Failure"
        subcaption="Configuration Drift // Production Incident"
        top="2020px"
        left="4%"
        rotateZ={-8}
        scale={0.88}
        floatDuration={8.5}
        delay={0.5}
        driftRange={10}
        opacity={0.82}
        className="hidden lg:block"
      />

      <FloatingDollarBill
        id="bill-production-left-center"
        denomination="$12,000"
        caption="Silent Failure"
        subcaption="No Alert // No Review // No Signal"
        top="2260px"
        left="21%"
        rotateZ={6}
        scale={0.88}
        floatDuration={9.4}
        delay={0.9}
        driftRange={8}
        opacity={0.58}
        className="hidden 2xl:block"
      />

      <FloatingDollarBill
        id="bill-production-center"
        denomination="$50,000"
        caption="TRUST IS EXPENSIVE"
        subcaption="ONE MISSED FINDING // CUSTOMER IMPACT"
        top="2390px"
        center
        rotateZ={-4}
        scale={0.88}
        floatDuration={10.6}
        delay={1}
        driftRange={6}
        opacity={0.17}
        className="hidden xl:block"
      />

      <FloatingDollarBill
        id="bill-production-right"
        denomination="$500,000"
        caption="Regulatory Exposure"
        subcaption="PII Exposed Via Unescaped Debug Endpoint"
        top="2140px"
        right="3%"
        rotateZ={13}
        scale={0.88}
        floatDuration={7.4}
        delay={0.4}
        driftRange={14}
        opacity={0.88}
        className="hidden lg:block"
      />

      {/* FOOTER */}
      <FloatingDollarBill
        id="bill-footer-left"
        denomination="$1,000,000"
        caption="Customer Trust & Churn"
        subcaption="Silent Data Corruption In Financial Ledger"
        top="2700px"
        left="4%"
        rotateZ={-9}
        scale={0.88}
        floatDuration={8.3}
        delay={1}
        driftRange={10}
        opacity={0.86}
        className="hidden md:block"
      />

      <FloatingDollarBill
        id="bill-footer-right"
        denomination="$75,000"
        caption="Customer Impact"
        subcaption="Downtime // Support // Lost Confidence"
        top="2830px"
        right="5%"
        rotateZ={7}
        scale={0.88}
        floatDuration={9}
        delay={0.6}
        driftRange={8}
        opacity={0.60}
        className="hidden xl:block"
      />
    </div>
  );
};
