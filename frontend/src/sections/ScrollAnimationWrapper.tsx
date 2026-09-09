/**
 * @file src/sections/ScrollAnimationWrapper.tsx
 * @description Lightweight, GPU-friendly scroll animation wrapper using Framer Motion.
 *
 * Dependencies:
 *   - React
 *   - `framer-motion` (motion, useReducedMotion)
 * File Connections:
 *   - Consumed by `src/sections/HeroSection.tsx` and `src/sections/AgentsGrid.tsx`
 *
 * Purpose:
 *   Adheres strictly to Sections 14, 15, 25, and 26 of DESIGN.md:
 *   - Respects `prefers-reduced-motion`
 *   - GPU-friendly opacity and subtle Y-translate transforms (no heavy layout triggers)
 *   - Disciplined durations (400–600ms) with ease-out curve
 *   - Zero bouncy springs, zero infinite spinning loops, zero scroll-jacking
 */

import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';

interface ScrollAnimationWrapperProps {
  children: React.ReactNode;
  delay?: number;
  duration?: number;
  yOffset?: number;
  className?: string;
  viewportMargin?: string;
}

export const ScrollAnimationWrapper: React.FC<ScrollAnimationWrapperProps> = ({
  children,
  delay = 0,
  duration = 0.5,
  yOffset = 16,
  className = '',
  viewportMargin = '-40px',
}) => {
  const shouldReduceMotion = useReducedMotion();

  if (shouldReduceMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: yOffset }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: viewportMargin }}
      transition={{
        duration,
        delay,
        ease: [0.22, 1, 0.36, 1], // Restrained cubic-bezier easeOut
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
};
