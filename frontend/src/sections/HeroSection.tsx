/**
 * @file src/sections/HeroSection.tsx
 * @description Cinematic hero section embodying the PCR narrative and visual standards.
 *
 * Dependencies:
 *   - React
 *   - `lucide-react` (ArrowRight, ArrowDown)
 *   - `src/components/PrimaryButton.tsx` (PrimaryButton)
 *   - `src/components/CodeDiffBox.tsx` (CodeDiffBox)
 *   - `src/sections/ScrollAnimationWrapper.tsx` (ScrollAnimationWrapper)
 *   - `src/data/landingContent.ts` (BRAND_CONFIG)
 * File Connections:
 *   - Rendered directly inside `src/App.tsx` below TopNavbar
 *
 * Purpose:
 *   Implements the editorial hero layout:
 *   - Oversized editorial typography
 *   - Clean technical subheadings and meta tags
 *   - Single primary 'Join PCR Now' action button (styled in rich green) opening the auth modal
 *   - Seamless integration of the CodeDiffBox
 *   - Strictly anti-slop: zero emojis, zero generic SaaS neon blobs
 */

import React from 'react';
import { ArrowRight } from 'lucide-react';
import { PrimaryButton } from '../components/PrimaryButton';
import { CodeDiffBox } from '../components/CodeDiffBox';
import { ScrollAnimationWrapper } from './ScrollAnimationWrapper';
import { BRAND_CONFIG } from '../data/landingContent';

interface HeroSectionProps {
  onJoin?: () => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({
  onJoin,
}) => {

  return (
    <section className="relative w-full pt-2 pb-16 md:pt-4 md:pb-24 overflow-hidden border-b border-[#1b3324]/60">
      <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 flex flex-col items-center text-center">

        {/* Editorial Headline */}
        <ScrollAnimationWrapper delay={0.15}>
          <h1 className="font-serif text-4xl sm:text-6xl lg:text-7xl font-normal tracking-tight text-[#EEF4EF] max-w-4xl leading-[1.08] mb-6">
            Your code can fail quietly. <br className="hidden sm:inline" />
            <span className="italic text-[#BFE3C7]">Your reviewer shouldn’t.</span>
          </h1>
        </ScrollAnimationWrapper>

        {/* Restrained Subtitle */}
        <ScrollAnimationWrapper delay={0.25}>
          <p className="font-sans text-sm sm:text-base text-[#A5B8AA] max-w-2xl leading-relaxed mb-10">
            {BRAND_CONFIG.subheading} Instant, deep logical, syntax, performance, and security inspection before code hits production.
          </p>
        </ScrollAnimationWrapper>

        {/* Hero Actions: Single 'Join PCR Now' button */}
        <ScrollAnimationWrapper delay={0.35}>
          <div className="flex items-center justify-center mb-16">
            <PrimaryButton
              label="Join PCR Now"
              variant="brand"
              icon={<ArrowRight className="h-4 w-4" />}
              onClick={onJoin}
              className="py-2.5 px-7 text-xs sm:text-sm font-semibold !bg-[#15803d] hover:!bg-[#166534] active:!bg-[#14532d] !text-white shadow-lg hover:shadow-xl transition-all"
            />
          </div>
        </ScrollAnimationWrapper>

        {/* Realistic Code Diff Reveal */}
        <ScrollAnimationWrapper delay={0.45} duration={0.65} yOffset={24} className="w-full flex justify-center">
          <div className="w-full flex flex-col items-center">
            <CodeDiffBox />
          </div>
        </ScrollAnimationWrapper>
      </div>
    </section>
  );
};
