/**
 * @file src/sections/FooterArea.tsx
 * @description Streamlined, minimalist final conversion section and compact multi-column enterprise footer.
 *
 * Dependencies:
 *   - React
 *   - `lucide-react` (ArrowRight, ArrowUpRight)
 *   - `src/components/PrimaryButton.tsx` (PrimaryButton)
 *   - `src/sections/ScrollAnimationWrapper.tsx` (ScrollAnimationWrapper)
 *   - `src/data/landingContent.ts` (BRAND_CONFIG)
 * File Connections:
 *   - Rendered at the base of `src/App.tsx`
 *   - Connects to AuthModal via onReviewCode (registration/sign-up mode)
 *
 * Purpose:
 *   - Responsive mobile-friendly layout:
 *     - Row 1: Phantom Solutions (Brand description & copyright).
 *     - Row 2: All 3 link columns (More from Phantom, Company, Legal & Compliance) side-by-side in a single 3-column horizontal row on phone screens!
 */

import React from 'react';
import { ArrowRight, ArrowUpRight } from 'lucide-react';
import { PcrLogo } from '../components/PcrLogo';
import { PrimaryButton } from '../components/PrimaryButton';
import { ScrollAnimationWrapper } from './ScrollAnimationWrapper';
import { BRAND_CONFIG } from '../data/landingContent';

interface FooterAreaProps {
  onReviewCode: () => void;
}

export const FooterArea: React.FC<FooterAreaProps> = ({
  onReviewCode,
}) => {
  return (
    <footer className="w-full border-t border-[#1b3324]/70 bg-[#040805]">
      {/* Final Conversion Section */}
      <section className="relative overflow-hidden pt-10 pb-8 md:pt-12 md:pb-10 border-b border-[#1b3324]/60">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_bottom,_rgba(26,61,38,0.3)_0%,_rgba(245,183,49,0.03)_40%,_transparent_70%)]" />

        <div className="relative mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
          <ScrollAnimationWrapper delay={0.15}>
            <h2 className="font-serif text-2xl sm:text-4xl lg:text-5xl font-normal tracking-tight text-[#EEF4EF] leading-tight mb-3">
              Before your code reaches production, <br className="hidden sm:inline" />
              <span className="italic text-[#BFE3C7]">let PCR find what you missed.</span>
            </h2>
          </ScrollAnimationWrapper>

          <ScrollAnimationWrapper delay={0.25}>
            <p className="mx-auto max-w-lg font-sans text-xs sm:text-sm text-[#A5B8AA] leading-relaxed mb-5">
              Install in seconds. Zero custom configuration. Instant automated PR reviews across logic, syntax, performance, and security invariants.
            </p>
          </ScrollAnimationWrapper>

          <ScrollAnimationWrapper delay={0.3}>
            <div className="flex items-center justify-center">
              <PrimaryButton
                label={BRAND_CONFIG.authCTAs.reviewCodeNow}
                variant="brand"
                icon={<ArrowRight className="h-4 w-4" />}
                onClick={onReviewCode}
                className="py-2.5 px-6 text-xs sm:text-sm font-semibold !bg-[#15803d] hover:!bg-[#166534] active:!bg-[#14532d] !text-white shadow-lg hover:shadow-xl transition-all"
              />
            </div>
          </ScrollAnimationWrapper>
        </div>
      </section>

      {/* Responsive Compact Multi-Column Footer */}
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row gap-8 lg:gap-10">
          
          {/* Brand & Phantom Solutions + Copyright */}
          <div className="flex flex-col space-y-2 lg:w-1/4 pb-2 lg:pb-0">
            <div className="flex items-center gap-2">
              <PcrLogo size={26} variant="badge" />
              <span className="font-mono text-xs font-bold tracking-wider text-[#EEF4EF]">
                Phantom Solutions
              </span>
            </div>
            <p className="text-xs text-[#707770] leading-relaxed pr-2">
              Software designed around your day, clearing the friction out of your daily routine so everything just works.
            </p>
            <div className="pt-1 font-mono text-[10px] text-[#707770]">
              <span className="whitespace-nowrap tracking-tight">
                &copy; {new Date().getFullYear()} Phantom Solutions. All rights reserved.
              </span>
            </div>
          </div>

          {/* All 3 Link Columns: In phone view, Col 1 is at left edge, Col 2 is dead center, Col 3 is at right edge */}
          <div className="grid grid-cols-3 w-full lg:w-3/4 gap-2 sm:gap-6 justify-between">
            
            {/* Column 1 (Link Col 1): More from Phantom - Left aligned */}
            <div className="flex flex-col items-start text-left">
              <h3 className="font-mono text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-[#EEF4EF] mb-2 truncate w-full">
                More from Phantom
              </h3>
              <ul className="space-y-1.5 text-[11px] sm:text-xs w-full">
                <li>
                  <a
                    href="#intervx"
                    onClick={(e) => e.preventDefault()}
                    className="inline-flex flex-wrap items-center gap-1 text-[#707770] hover:text-[#EEF4EF] transition-colors py-0.5"
                  >
                    <span>IntervX</span>
                    <span className="rounded bg-[#162e20] px-1 py-0.2 text-[8px] sm:text-[9px] font-mono text-[#7AA983]">Soon</span>
                  </a>
                </li>
                <li>
                  <a
                    href="#pico"
                    onClick={(e) => e.preventDefault()}
                    className="inline-flex flex-wrap items-center gap-1 text-[#707770] hover:text-[#EEF4EF] transition-colors py-0.5"
                  >
                    <span>Pico</span>
                    <span className="rounded bg-[#162e20] px-1 py-0.2 text-[8px] sm:text-[9px] font-mono text-[#7AA983]">Soon</span>
                  </a>
                </li>
                <li>
                  <a
                    href="#prizm"
                    onClick={(e) => e.preventDefault()}
                    className="inline-flex flex-wrap items-center gap-1 text-[#707770] hover:text-[#EEF4EF] transition-colors py-0.5"
                  >
                    <span>Prizm</span>
                    <span className="rounded bg-[#162e20] px-1 py-0.2 text-[8px] sm:text-[9px] font-mono text-[#7AA983]">Soon</span>
                  </a>
                </li>
              </ul>
            </div>

            {/* Column 2 (Link Col 2): Company / Who We Are - Center aligned on mobile */}
            <div className="flex flex-col items-center lg:items-start text-center lg:text-left">
              <h3 className="font-mono text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-[#EEF4EF] mb-2 truncate w-full">
                Company
              </h3>
              <ul className="space-y-1.5 text-[11px] sm:text-xs w-full">
                <li>
                  <a
                    href="https://github.com/Manavkhandelwal401"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-0.5 text-[#707770] hover:text-[#EEF4EF] transition-colors py-0.5"
                  >
                    <span>Who We Are</span>
                    <ArrowUpRight className="h-2.5 w-2.5 text-[#707770]" />
                  </a>
                </li>
                <li>
                  <a
                    href="#what-we-do"
                    onClick={(e) => e.preventDefault()}
                    className="text-[#707770] hover:text-[#EEF4EF] transition-colors py-0.5 block"
                  >
                    What We Do
                  </a>
                </li>
                <li>
                  <a
                    href="#contact"
                    onClick={(e) => e.preventDefault()}
                    className="text-[#707770] hover:text-[#EEF4EF] transition-colors py-0.5 block"
                  >
                    Contact
                  </a>
                </li>
              </ul>
            </div>

            {/* Column 3 (Link Col 3): Legal & Compliance - Right aligned on mobile */}
            <div className="flex flex-col items-end lg:items-start text-right lg:text-left">
              <h3 className="font-mono text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-[#EEF4EF] mb-2 truncate w-full">
                Legal &amp; Policy
              </h3>
              <ul className="space-y-1.5 text-[11px] sm:text-xs w-full">
                <li>
                  <a
                    href="#privacy"
                    onClick={(e) => e.preventDefault()}
                    className="text-[#707770] hover:text-[#EEF4EF] transition-colors py-0.5 block"
                  >
                    Privacy Policy
                  </a>
                </li>
                <li>
                  <a
                    href="#terms"
                    onClick={(e) => e.preventDefault()}
                    className="text-[#707770] hover:text-[#EEF4EF] transition-colors py-0.5 block"
                  >
                    Terms of Service
                  </a>
                </li>
                <li>
                  <a
                    href="#security"
                    onClick={(e) => e.preventDefault()}
                    className="text-[#707770] hover:text-[#EEF4EF] transition-colors py-0.5 block"
                  >
                    Security
                  </a>
                </li>
                <li>
                  <span className="text-[#A5B8AA] font-mono text-[9px] sm:text-[10px] select-none block">
                    v2.1.0
                  </span>
                </li>
              </ul>
            </div>

          </div>

        </div>
      </div>
    </footer>
  );
};
