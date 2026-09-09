/**
 * @file src/sections/TopNavbar.tsx
 * @description Minimalist header displaying solely the PCR logo mark without any surrounding navbar container.
 *
 * Dependencies:
 *   - React
 * File Connections:
 *   - Imported by `src/App.tsx` as the top-level brand anchor
 */

import React from 'react';
import { PcrLogo } from '../components/PcrLogo';

export const TopNavbar: React.FC = () => {
  return (
    <div className="w-full pt-5 px-6 sm:px-10 lg:px-16 z-40">
      <div className="max-w-7xl mx-auto flex items-center">
        {/* Brand Mark: Strictly PCR Logo & Moniker */}
        <a
          href="#"
          className="group inline-flex items-center gap-2.5 text-decoration-none focus:outline-none"
          aria-label="PCR Home"
        >
          <PcrLogo size={34} showText={true} />
        </a>
      </div>
    </div>
  );
};
