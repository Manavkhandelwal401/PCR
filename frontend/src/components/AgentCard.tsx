/**
 * @file src/components/AgentCard.tsx
 * @description Clean atomic card component visualizing a specialized PCR AI Agent.
 *
 * Dependencies:
 *   - React
 *   - `lucide-react` (Shield, GitMerge, Cpu, FileCheck)
 *   - `src/types/appTypes.ts` (AgentDescriptor)
 * File Connections:
 *   - Consumed by `src/sections/AgentsGrid.tsx` in a structured 2x2 grid
 *
 * Purpose:
 *   Adheres strictly to Section 19 of DESIGN.md:
 *   - Near-black elevated surface (#0A0C0B / #101311 with #202523 subtle border)
 *   - Monospace identifiers and functional icon badge
 *   - Mini technical code/finding preview box with real severity indicator
 *   - Hover state: subtle border contrast enhancement (#38413D), zero neon glow
 */

import React from 'react';
import { Shield, GitMerge, Cpu, FileCheck } from 'lucide-react';
import type { AgentDescriptor } from '../types/appTypes';

interface AgentCardProps {
  agent: AgentDescriptor;
  className?: string;
}

const getAgentIcon = (id: string) => {
  switch (id) {
    case 'security':
      return <Shield className="h-4 w-4 text-[#E33B2F]" />;
    case 'logic':
      return <GitMerge className="h-4 w-4 text-[#FF6A3D]" />;
    case 'performance':
      return <Cpu className="h-4 w-4 text-[#D89A32]" />;
    case 'syntax':
      return <FileCheck className="h-4 w-4 text-[#A0A6A0]" />;
    default:
      return <Shield className="h-4 w-4 text-[#A0A6A0]" />;
  }
};

const getSeverityStyles = (severity: string) => {
  switch (severity) {
    case 'CRITICAL':
    case 'HIGH':
      return 'border-[#E33B2F]/60 bg-[#E33B2F]/10 text-[#FF6A3D]';
    case 'MEDIUM':
      return 'border-[#D89A32]/60 bg-[#D89A32]/10 text-[#D89A32]';
    default:
      return 'border-[#202523] bg-[#101311] text-[#A0A6A0]';
  }
};

export const AgentCard: React.FC<AgentCardProps> = ({ agent, className = '' }) => {
  const { name, role, description, sampleFinding } = agent;

  return (
    <div
      className={`group relative flex flex-col justify-between rounded-[8px] border border-[#1b3324] bg-[#0c1811] p-6 transition-all duration-200 hover:border-[#F5B731]/60 hover:bg-[#12241a] ${className}`}
    >
      {/* Top Meta Bar */}
      <div>
        <div className="flex items-center gap-2.5 mb-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-[6px] border border-[#1b3324] bg-[#060e09] transition-colors group-hover:border-[#F5B731]/70">
            {getAgentIcon(agent.id)}
          </div>
          <div>
            <h3 className="font-mono text-sm font-semibold tracking-wide text-[#EEF4EF]">
              {name}
            </h3>
            <p className="font-mono text-[11px] text-[#6A8070]">{role}</p>
          </div>
        </div>

        {/* Agent Description */}
        <p className="font-sans text-xs leading-relaxed text-[#A5B8AA] mb-6">
          {description}
        </p>
      </div>

      {/* Mini Technical Code / Finding Preview */}
      <div className="rounded-[6px] border border-[#1b3324] bg-[#060e09] p-3 font-mono text-xs">
        <div className="flex items-center justify-between gap-2 border-b border-[#1b3324]/70 pb-2 mb-2">
          <div className="text-[11px] text-[#EEF4EF] font-medium">
            {sampleFinding.issue}
          </div>
          <span
            className={`shrink-0 rounded-[3px] border px-1.5 py-0.2 text-[9px] font-bold tracking-wider ${getSeverityStyles(
              sampleFinding.severity
            )}`}
          >
            {sampleFinding.severity}
          </span>
        </div>
        <p className="font-sans text-[11px] leading-normal text-[#A5B8AA] line-clamp-2">
          {sampleFinding.impact}
        </p>
      </div>
    </div>
  );
};
