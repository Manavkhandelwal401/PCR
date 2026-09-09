/**
 * @file src/components/PcrLogo.tsx
 * @description Official Phantom Code Reviewer (PCR) App Icon & Brand Logo.
 * Uses the exact curved golden P design with internal angled cursive "Phantom" script
 * set inside an emerald forest squircle badge.
 */

import React from 'react';

interface PcrLogoProps {
  size?: number | string;
  className?: string;
  variant?: 'badge' | 'mark';
  showText?: boolean;
}

export const PcrLogo: React.FC<PcrLogoProps> = ({
  size = 32,
  className = '',
  showText = false,
}) => {
  return (
    <div className={`inline-flex items-center gap-2.5 select-none ${className}`}>
      <div
        style={{ width: size, height: size }}
        className="relative shrink-0 flex items-center justify-center transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer rounded-[8px] overflow-hidden shadow-[0_0_12px_rgba(21,128,61,0.3)] border border-[#2d5c3b]/50"
      >
        <img
          src="/pcr-logo.png"
          alt="PCR Phantom Logo"
          className="w-full h-full object-cover select-none pointer-events-none"
          draggable={false}
        />
      </div>

      {showText && (
        <span className="font-mono text-sm font-bold tracking-widest text-[#EEF4EF] group-hover:text-emerald-300 transition-colors">
          PCR
        </span>
      )}
    </div>
  );
};

export default PcrLogo;
