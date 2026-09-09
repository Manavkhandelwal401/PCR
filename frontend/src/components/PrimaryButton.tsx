/**
 * @file src/components/PrimaryButton.tsx
 * @description Atomic button component designed according to PCR design tokens.
 *
 * Dependencies:
 *   - React
 *   - `src/types/appTypes.ts` (PrimaryButtonProps)
 * File Connections:
 *   - Consumed by `src/sections/TopNavbar.tsx` for 'Sign In' and 'Connect GitHub' actions
 *   - Consumed across hero and conversion sections
 *
 * Purpose:
 *   Provides a high-contrast, compact button with precise padding, restrained border,
 *   subtle lift on hover, and immediate active feedback.
 *   Strictly adheres to Anti-AI-Slop rules: Zero neon glows, zero giant pill bloat.
 */

import React from 'react';
import type { PrimaryButtonProps } from '../types/appTypes';

export const PrimaryButton: React.FC<PrimaryButtonProps> = ({
  label,
  onClick,
  variant = 'primary',
  disabled = false,
  type = 'button',
  className = '',
  icon,
  ariaLabel,
}) => {
  // Base architectural styles: compact padding, sharp corners (rounded-[6px]), mono/sans precision
  const baseClasses =
    'inline-flex items-center justify-center gap-2 px-3.5 py-1.5 text-xs font-medium tracking-wide transition-all duration-150 select-none focus:outline-none focus:ring-1 focus:ring-offset-1 focus:ring-offset-[#030403] disabled:opacity-40 disabled:cursor-not-allowed rounded-[6px]';

  // Variants conforming to Section 04 Brand Palette & Section 12 Hero CTA styling
  const variantClasses = {
    // Brand signature rich green CTA
    brand:
      'bg-[#15803d] text-white hover:bg-[#166534] active:bg-[#14532d] focus:ring-[#15803d] shadow-[0_2px_10px_rgba(21,128,61,0.35)]',

    // High-contrast primary: Crisp off-white fill with dark text, subtle lift on hover
    primary:
      'bg-[#F3F5F2] text-[#050706] hover:bg-white hover:-translate-y-[0.5px] active:translate-y-0 active:bg-[#E2E5E0] focus:ring-[#F3F5F2] shadow-[0_1px_2px_rgba(0,0,0,0.4)]',
    
    // Secondary: Dark elevated surface with subtle boundary border
    secondary:
      'bg-[#101311] text-[#F3F5F2] border border-[#202523] hover:border-[#38413D] hover:bg-[#161B18] active:bg-[#0A0C0B] focus:ring-[#38413D]',
    
    // Ghost: Restrained text-only navigation button
    ghost:
      'bg-transparent text-[#A0A6A0] hover:text-[#F3F5F2] hover:bg-[#101311] focus:ring-[#202523]',
    
    // Danger / Lava semantic action
    danger:
      'bg-[#E33B2F] text-[#F3F5F2] hover:bg-[#FF6A3D] hover:-translate-y-[0.5px] active:translate-y-0 active:bg-[#8F1812] focus:ring-[#E33B2F] shadow-[0_1px_4px_rgba(227,59,47,0.3)]',
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel || label}
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
    >
      {icon && <span className="inline-flex shrink-0 items-center justify-center">{icon}</span>}
      <span>{label}</span>
    </button>
  );
};
