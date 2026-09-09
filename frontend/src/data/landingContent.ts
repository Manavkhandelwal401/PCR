/**
 * @file src/data/landingContent.ts
 * @description Centralized content repository for Phantom Code Reviewer (PCR).
 *
 * Dependencies:
 *   - `src/types/appTypes.ts` (NavItem, AgentDescriptor, MockCodeDiff)
 * File Connections:
 *   - Consumed by `src/sections/TopNavbar.tsx` for brand title & navigation links
 *   - Consumed by `src/components/CodeDiffBox.tsx` for developer-tool diff snippets
 *   - Consumed by Hero, FourAgents, and FooterArea sections
 *
 * Purpose:
 *   Adheres strictly to content separation guidelines. Eliminates hardcoded copy
 *   across UI components while maintaining strict compliance with DESIGN.md anti-slop rules.
 */

import type { NavItem, AgentDescriptor, MockCodeDiff } from '../types/appTypes';

export const BRAND_CONFIG = {
  name: 'PCR',
  fullName: 'Phantom Code Reviewer',
  tagline: 'Automated Principal Code Reviewer',
  subheading: 'Comprehensive, multi-agent AI reviews for GitHub Pull Requests.',
  coreQuote: 'Your code can fail quietly. Your reviewer shouldn\'t.',
  finalHeadline: 'Before your code reaches production, let PCR find what you missed.',
  heroCTA: {
    primary: 'Join PCR Now',
    secondary: 'See how it works',
  },
  authCTAs: {
    signIn: 'Sign In',
    signUp: 'Sign Up',
    connectGithub: 'Connect GitHub',
    reviewPr: 'Review this PR',
    getStarted: 'Get started',
    reviewCodeNow: 'Review Your Code Now',
  },
};

export const NAV_ITEMS: NavItem[] = [
  { id: 'nav-product', label: 'Product', href: '#product' },
  { id: 'nav-agents', label: 'Agents', href: '#agents' },
  { id: 'nav-how-it-works', label: 'How it works', href: '#how-it-works' },
];

export const PRIMARY_DIFF_SNIPPET: MockCodeDiff = {
  id: 'auth-service-diff-01',
  fileName: 'AuthService.java',
  filePath: 'src/main/java/com/phantom/security/AuthService.java',
  branchName: 'feature/token-refresh',
  lines: [
    { lineNumber: 81, type: 'context', content: '    public ValidationResult validateSession(HttpServletRequest request) {' },
    { lineNumber: 82, type: 'context', content: '        String token = request.getHeader("X-Auth-Token");' },
    { lineNumber: 83, type: 'removed', content: '-       if (token == null || !jwtProvider.isValid(token)) {' },
    { lineNumber: 84, type: 'removed', content: '-           throw new SecurityException("Unauthorized request origin");' },
    { lineNumber: 85, type: 'removed', content: '-       }' },
    { lineNumber: 86, type: 'added',   content: '+       // Temporarily bypassed for internal latency tests' },
    { lineNumber: 87, type: 'added',   content: '+       if (request.getAttribute("X-Internal-Debug") != null) {' },
    { lineNumber: 88, type: 'added',   content: '+           return ValidationResult.permissive();' },
    { lineNumber: 89, type: 'added',   content: '+       }' },
    { lineNumber: 90, type: 'context', content: '        return sessionRegistry.resolve(token);' },
    { lineNumber: 91, type: 'context', content: '    }' },
  ],
  finding: {
    agentName: 'SECURITY AGENT',
    ruleTitle: 'Potential authentication bypass',
    severity: 'HIGH',
    filePath: 'AuthService.java',
    lineNumber: 87,
    description: 'Authorization check removed from execution path. Request header spoofing allows unauthenticated session elevation.',
    recommendation: 'Enforce cryptographically signed JWT validation prior to permitting internal debug paths.',
  },
};

export const AGENT_DESCRIPTORS: AgentDescriptor[] = [
  {
    id: 'security',
    name: 'Security Agent',
    role: 'Principal Security Analyst',
    badge: 'CVE & Invariant Audits',
    description: 'Identifies auth bypasses, injection vectors, and broken access controls directly within your diff.',
    sampleFinding: {
      issue: 'Authentication bypass',
      target: 'AuthService.java:87',
      severity: 'HIGH',
      impact: 'The branch can be reached without cryptographically validating the session token.',
    },
  },
  {
    id: 'logic',
    name: 'Logic Agent',
    role: 'State & Concurrency Specialist',
    badge: 'Deadlocks & Race Conditions',
    description: 'Catches edge cases, state mutations under concurrency, and unhandled boundary states.',
    sampleFinding: {
      issue: 'Unchecked Null Pointer in Stream',
      target: 'PaymentProcessor.java:142',
      severity: 'HIGH',
      impact: 'Missing null check triggers runtime exception under concurrent refund requests.',
    },
  },
  {
    id: 'performance',
    name: 'Performance Agent',
    role: 'Systems & Latency Architect',
    badge: 'N+1 & Memory Footprint',
    description: 'Pinpoints non-scalable database queries, memory leaks, and excessive allocations.',
    sampleFinding: {
      issue: 'N+1 Query in Repository Loop',
      target: 'OrderController.java:59',
      severity: 'MEDIUM',
      impact: 'Eager relation loading spawns 120+ sequential SQL queries during batch order retrieval.',
    },
  },
  {
    id: 'syntax',
    name: 'Syntax Agent',
    role: 'Linter & Language Invariant Engine',
    badge: 'Type Safety & Hygiene',
    description: 'Ensures strict adherence to language semantics, contract annotations, and dead-code elimination.',
    sampleFinding: {
      issue: 'Unclosed Resource Stream',
      target: 'ReportExporter.java:31',
      severity: 'LOW',
      impact: 'BufferedOutputStream does not implement try-with-resources; socket leak on error.',
    },
  },
];
