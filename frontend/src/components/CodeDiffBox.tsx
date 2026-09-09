/**
 * @file src/components/CodeDiffBox.tsx
 * @description Developer-tool style code diff container displaying mock Java code snippet with security findings.
 *
 * Dependencies:
 *   - React
 *   - `lucide-react` (ShieldAlert, GitCommit, FileCode, CheckCircle2)
 *   - `src/types/appTypes.ts` (MockCodeDiff, CodeDiffLine)
 *   - `src/data/landingContent.ts` (PRIMARY_DIFF_SNIPPET)
 * File Connections:
 *   - Consumed by `src/App.tsx` and future Hero/Demo sections
 *
 * Purpose:
 *   Visualizes pull request inspection in an authentic developer-tool interface.
 *   Features:
 *   - Monospace typography (JetBrains Mono)
 *   - Line numbers & diff indicators (+ / - / context)
 *   - High-severity security warning badge with Phantom Lava Red (#E33B2F)
 *   - Restrained background and borders (#0A0C0B, #101311, #202523)
 */

import React from 'react';
import { ShieldAlert, FileCode, GitCommit, ArrowRight } from 'lucide-react';
import type { MockCodeDiff } from '../types/appTypes';
import { PRIMARY_DIFF_SNIPPET } from '../data/landingContent';

interface CodeDiffBoxProps {
  diff?: MockCodeDiff;
  className?: string;
}

export const CodeDiffBox: React.FC<CodeDiffBoxProps> = ({
  diff = PRIMARY_DIFF_SNIPPET,
  className = '',
}) => {
  const { fileName, branchName, lines, finding } = diff;

  return (
    <div
      className={`w-full max-w-3xl overflow-hidden rounded-[8px] border border-[#1b3324] bg-[#07110a] text-[#EEF4EF] shadow-[0_16px_40px_rgba(0,0,0,0.75)] font-mono text-[13px] ${className}`}
    >
      {/* File Header Bar */}
      <div className="flex flex-wrap items-center justify-between border-b border-[#1b3324] bg-[#0d1c12] px-4 py-2.5 text-xs text-[#A5B8AA]">
        <div className="flex items-center gap-2">
          <FileCode className="h-3.5 w-3.5 text-[#F5B731]" />
          <span className="font-medium text-[#EEF4EF]">{fileName}</span>
        </div>
        <div className="flex items-center gap-3 font-mono text-[11px]">
          <div className="flex items-center gap-1 text-[#6A8070]">
            <GitCommit className="h-3 w-3" />
            <span>{branchName}</span>
          </div>
          <span className="rounded-[4px] border border-[#1b3324] bg-[#040805] px-1.5 py-0.5 text-[10px] text-[#A5B8AA]">
            +4 -3 lines
          </span>
        </div>
      </div>

      {/* Code Lines Body */}
      <div className="overflow-x-auto py-2">
        <table className="w-full border-collapse">
          <tbody>
            {lines.map((line, idx) => {
              const isAdded = line.type === 'added';
              const isRemoved = line.type === 'removed';

              let rowBg = 'hover:bg-[#101311]/50';
              let lineIndicator = ' ';
              let textColor = 'text-[#A0A6A0]';

              if (isAdded) {
                rowBg = 'bg-[#182618]/30 hover:bg-[#182618]/50';
                lineIndicator = '+';
                textColor = 'text-[#9CE6A8]';
              } else if (isRemoved) {
                rowBg = 'bg-[#2E1412]/30 hover:bg-[#2E1412]/50';
                lineIndicator = '-';
                textColor = 'text-[#F87171] line-through opacity-80';
              }

              return (
                <tr key={idx} className={`leading-6 transition-colors ${rowBg}`}>
                  {/* Line Number */}
                  <td className="w-12 select-none border-r border-[#202523]/60 pr-3 text-right text-[11px] text-[#707770]">
                    {line.lineNumber}
                  </td>
                  {/* Diff Symbol */}
                  <td className="w-6 select-none pl-2 pr-1 text-center font-bold text-[11px] text-[#707770]">
                    {lineIndicator}
                  </td>
                  {/* Code Line Content */}
                  <td className={`whitespace-pre pl-2 pr-4 font-mono ${textColor}`}>
                    {line.content.replace(/^[-+]\s{7}/, '        ')}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Security Review Finding Alert Box */}
      <div className="border-t border-[#202523] bg-[#0F0807] p-4 transition-colors">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <div className="mt-0.5 rounded-[4px] bg-[#E33B2F]/15 p-1 border border-[#E33B2F]/40">
              <ShieldAlert className="h-4 w-4 text-[#E33B2F]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-[11px] font-semibold tracking-wider text-[#FF6A3D]">
                  {finding.agentName}
                </span>
                <span className="text-[#707770]">•</span>
                <span className="font-medium text-[#F3F5F2]">{finding.ruleTitle}</span>
              </div>
              <p className="mt-1 font-sans text-xs leading-relaxed text-[#A0A6A0]">
                {finding.description}
              </p>
              {finding.recommendation && (
                <div className="mt-2 flex items-start gap-1.5 font-sans text-[11px] text-[#D89A32]">
                  <ArrowRight className="mt-0.5 h-3 w-3 shrink-0" />
                  <span>{finding.recommendation}</span>
                </div>
              )}
            </div>
          </div>

          {/* Severity Text: Clean, borderless without colored container */}
          <div className="shrink-0">
            <span className="font-mono text-xs font-bold tracking-wider text-[#F3F5F2]">
              SEVERITY: {finding.severity}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
