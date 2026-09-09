/**
 * @file src/types/appTypes.ts
 * @description Core TypeScript interfaces for Phantom Code Reviewer (PCR).
 *
 * Dependencies: None
 * File Connections:
 *   - Consumed by `src/data/landingContent.ts` for strictly typed mock data
 *   - Consumed by atomic components (`PrimaryButton.tsx`, `CodeDiffBox.tsx`) and sections (`TopNavbar.tsx`)
 *
 * Purpose:
 *   Defines clean, strictly typed interfaces for navigational links, code diff line items,
 *   code diff snippet structures, agent review findings, and button actions.
 */

export type SeverityLevel = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';

export type DiffLineType = 'context' | 'added' | 'removed' | 'highlight';

export interface CodeDiffLine {
  lineNumber: number | string;
  type: DiffLineType;
  content: string;
}

export interface SecurityFinding {
  agentName: string;
  ruleTitle: string;
  severity: SeverityLevel;
  filePath: string;
  lineNumber: number;
  description: string;
  recommendation?: string;
}

export interface MockCodeDiff {
  id: string;
  fileName: string;
  filePath: string;
  branchName: string;
  lines: CodeDiffLine[];
  finding: SecurityFinding;
}

export interface NavItem {
  id: string;
  label: string;
  href: string;
  isExternal?: boolean;
}

export interface AgentDescriptor {
  id: 'logic' | 'syntax' | 'performance' | 'security';
  name: string;
  role: string;
  badge: string;
  description: string;
  sampleFinding: {
    issue: string;
    target: string;
    severity: SeverityLevel;
    impact: string;
  };
}

export type ButtonVariant = 'brand' | 'primary' | 'secondary' | 'ghost' | 'danger';

export interface PrimaryButtonProps {
  label: string;
  onClick?: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
  className?: string;
  icon?: React.ReactNode;
  ariaLabel?: string;
}
