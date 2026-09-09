/**
 * @file src/sections/AgentsGrid.tsx
 * @description 2x2 Bento Grid section presenting the four specialized PCR AI agents.
 *
 * Dependencies:
 *   - React
 *   - `src/components/AgentCard.tsx` (AgentCard)
 *   - `src/sections/ScrollAnimationWrapper.tsx` (ScrollAnimationWrapper)
 *   - `src/data/landingContent.ts` (AGENT_DESCRIPTORS)
 * File Connections:
 *   - Rendered in `src/App.tsx` below HeroSection
 *
 * Purpose:
 *   Adheres strictly to Sections 19 & 31 of DESIGN.md:
 *   - 2x2 modular technical grid layout
 *   - Presents the 4 parallel agents: Logic, Syntax, Performance, and Security
 *   - Subdued near-black cards (#0A0C0B) with thin dividers (#202523)
 *   - Zero AI-slop: no glowing blob backgrounds, zero emoji icons, zero rainbow gradients
 */

import React from 'react';
import { AgentCard } from '../components/AgentCard';
import { ScrollAnimationWrapper } from './ScrollAnimationWrapper';
import { AGENT_DESCRIPTORS } from '../data/landingContent';

export const AgentsGrid: React.FC = () => {
  return (
    <section id="agents" className="relative w-full py-20 md:py-28 border-b border-[#1b3324]/60">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="mb-14 text-center">
          <ScrollAnimationWrapper delay={0.15}>
            <h2 className="font-serif text-3xl sm:text-5xl font-normal text-[#EEF4EF] tracking-tight mb-4">
              Principal-level scrutiny. <br className="hidden sm:inline" />
              Divided across four distinct minds.
            </h2>
          </ScrollAnimationWrapper>

          <ScrollAnimationWrapper delay={0.25}>
            <p className="mx-auto max-w-xl font-sans text-sm text-[#A5B8AA] leading-relaxed">
              Each Pull Request is decomposed and dispatched in parallel through dedicated models fine-tuned on distinct engineering failure modes.
            </p>
          </ScrollAnimationWrapper>
        </div>

        {/* 2x2 Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 lg:gap-6">
          {AGENT_DESCRIPTORS.map((agent, index) => (
            <ScrollAnimationWrapper
              key={agent.id}
              delay={0.15 + index * 0.08}
              duration={0.45}
              yOffset={20}
            >
              <AgentCard agent={agent} className="h-full" />
            </ScrollAnimationWrapper>
          ))}
        </div>

      </div>
    </section>
  );
};
