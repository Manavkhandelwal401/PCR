import React, { useMemo } from 'react';
import {
  Bug,
  Shield,
  Zap,
  Cpu,
  Layers,
  Gauge,
} from 'lucide-react';

interface FindingItem {
  id: string;
  raw: string;
  target?: string;
  lineNumber?: string;
  severity?: string;
  defect?: string;
  impact?: string;
  isCleanPass: boolean;
}

interface SectionData {
  id: string;
  title: string;
  icon: React.ReactNode;
  accentColor: string;
  badgeColor: string;
  items: FindingItem[];
  allClean: boolean;
}

interface StructuredReviewReportProps {
  content: string;
}

/**
 * Parses raw markdown review comments into structured, readable sections and items.
 * Supports:
 * - "#### 1. Completeness & Logic:"
 * - "#### 2. Syntax & Compilation:"
 * - "#### 3. Clean Code & Performance:"
 * - "#### 4. Security & Vulnerabilities:"
 * - "#### 5. Quality Scorecard & Assessment Breakdown:"
 * - Also supports newer headings like "🔴 Critical", "🟠 Security", etc.
 */
export const StructuredReviewReport: React.FC<StructuredReviewReportProps> = ({ content }) => {
  const parsedSections = useMemo<SectionData[]>(() => {
    if (!content || !content.trim()) return [];

    // Strip HTML comments, engine tags, and metadata artifacts (e.g. _<!-- [Engine: v2.3] -->_)
    const cleanedContent = content
      .replace(/<!--[\s\S]*?-->/g, '')
      .replace(/_?<!--\s*\[Engine:[^\]]+\]\s*-->_?/gi, '')
      .replace(/^[-*]?\s*_?<!--.*?-->_?\s*$/gm, '');

    const lines = cleanedContent.split(/\r?\n/);
    const sections: { rawHeader: string; lines: string[] }[] = [];
    let currentSection: { rawHeader: string; lines: string[] } | null = null;

    for (const rawLine of lines) {
      const line = rawLine.trim();
      // Detect section headings like "#### 1. Completeness & Logic:" or "### Section"
      if (line.startsWith('####') || (line.startsWith('###') && !line.toLowerCase().includes('feedback'))) {
        if (currentSection) {
          sections.push(currentSection);
        }
        currentSection = { rawHeader: line, lines: [] };
      } else if (currentSection) {
        if (line) {
          currentSection.lines.push(line);
        }
      } else if (line && !line.toLowerCase().includes('ai code reviewer feedback')) {
        // Fallback for unstructured text before headings
        currentSection = { rawHeader: 'General Inspection Analysis', lines: [line] };
      }
    }

    if (currentSection) {
      sections.push(currentSection);
    }

    // Filter out Section 5 (Quality Scorecard & Assessment Breakdown / Weighted calculation)
    const displaySections = sections.filter(
      (s) =>
        !s.rawHeader.toLowerCase().includes('scorecard') &&
        !s.rawHeader.toLowerCase().includes('assessment breakdown') &&
        !s.rawHeader.toLowerCase().includes('weighted score')
    );

    // If no markdown headings were detected, treat the entire text as one section
    if (displaySections.length === 0 && content.trim()) {
      const bulletLines = lines.filter((l) => l.trim().length > 0);
      displaySections.push({ rawHeader: 'Findings & Review Diagnostics', lines: bulletLines });
    }

    return displaySections.map((sec, idx) => {
      const cleanHeader = sec.rawHeader
        .replace(/^#+\s*/, '')
        .replace(/^\d+\.\s*/, '')
        .replace(/:$/, '')
        .trim();

      const lowerHeader = cleanHeader.toLowerCase();

      let icon = <Layers className="h-4 w-4 text-emerald-400" />;
      let badgeColor = 'bg-[#122318] text-emerald-300 border-[#1f3f2a]';

      if (lowerHeader.includes('logic') || lowerHeader.includes('completeness')) {
        icon = <Bug className="h-4 w-4 text-emerald-400" />;
        badgeColor = 'bg-[#122318] text-emerald-300 border-[#1f3f2a]';
      } else if (lowerHeader.includes('syntax') || lowerHeader.includes('compilation')) {
        icon = <Cpu className="h-4 w-4 text-emerald-400" />;
        badgeColor = 'bg-[#122318] text-emerald-300 border-[#1f3f2a]';
      } else if (lowerHeader.includes('security') || lowerHeader.includes('vulnerabilit')) {
        icon = <Shield className="h-4 w-4 text-emerald-400" />;
        badgeColor = 'bg-[#122318] text-emerald-300 border-[#1f3f2a]';
      } else if (lowerHeader.includes('performance') || lowerHeader.includes('clean code')) {
        icon = <Zap className="h-4 w-4 text-emerald-400" />;
        badgeColor = 'bg-[#122318] text-emerald-300 border-[#1f3f2a]';
      } else if (lowerHeader.includes('scorecard') || lowerHeader.includes('assessment') || lowerHeader.includes('breakdown')) {
        icon = <Gauge className="h-4 w-4 text-emerald-400" />;
        badgeColor = 'bg-[#122318] text-emerald-300 border-[#1f3f2a]';
      }

      const items: FindingItem[] = sec.lines
        .map((l, itemIdx) => {
          const trimmed = l.replace(/^[-*]\s*/, '').trim();
          if (!trimmed) return null;
          // Discard internal metadata comments or engine tags
          if (/^_{0,2}<!--.*-->_{0,2}$/i.test(trimmed) || /\[Engine:/i.test(trimmed)) {
            return null;
          }

          const isCleanPass =
            trimmed.includes('✅') ||
            trimmed.toLowerCase().includes('no issues detected') ||
            trimmed.toLowerCase().includes('no logic issues') ||
            trimmed.toLowerCase().includes('no syntax issues') ||
            trimmed.toLowerCase().includes('no performance issues') ||
            trimmed.toLowerCase().includes('no security risks');

          // Parse target pattern like "- **[Line 42 / Target] [Severity: HIGH]**: [Defect] -> [Impact]"
          let target: string | undefined;
          let lineNumber: string | undefined;
          let severity: string | undefined;
          let defect: string | undefined;
          let impact: string | undefined;

          // 1. Extract explicit severity tag if present: [Severity: CRITICAL|HIGH|MODERATE|LOW]
          const sevMatch = trimmed.match(/\[Severity:\s*(CRITICAL|HIGH|MODERATE|LOW)\]/i);
          if (sevMatch) {
            severity = sevMatch[1].toUpperCase();
          }

          // 2. Parse bold header prefix: **[...]**: or **[...] [Severity: ...]**:
          const boldMatch = trimmed.match(/^\*\*\[?([^\]]+)\]?(?:\s*\[Severity:[^\]]+\])?\*\*:\s*(.*)$/);
          if (boldMatch) {
            const rawTarget = boldMatch[1].replace(/^[\[\(]/, '').replace(/[\]\)]$/, '').trim();
            target = rawTarget;

            // Check if rawTarget includes "Lines <range>" or "Line <number>"
            const lineMatch = rawTarget.match(/Lines?\s*(\d+(?:\s*-\s*\d+)?)/i);
            if (lineMatch) {
              const cleanedNumbers = lineMatch[1].replace(/\s+/g, '');
              lineNumber = cleanedNumbers.includes('-') ? `Lines ${cleanedNumbers}` : `Line ${cleanedNumbers}`;
              const cleanTgt = rawTarget.replace(/Lines?\s*\d+(?:\s*-\s*\d+)?\s*[\/:,]?\s*/i, '').trim();
              target = cleanTgt.length > 0 ? cleanTgt : undefined;
            }

            const rest = boldMatch[2].trim();
            let cleanDefect = rest;
            if (rest.includes('->')) {
              const parts = rest.split('->');
              cleanDefect = parts[0].trim();
              impact = parts.slice(1).join('->').trim();
            }
            // Strip any residual [Severity: ...] or ** prefixes
            defect = cleanDefect
              .replace(/^\[Severity:[^\]]+\]\s*:?\s*/i, '')
              .replace(/^\*\*?\s*/, '')
              .replace(/^:\s*/, '')
              .trim();
          } else {
            // Also check for embedded line references in unbolded text, e.g. "at line 45"
            const embeddedLine = trimmed.match(/(?:at\s+|on\s+)?lines?\s*(\d+(?:\s*-\s*\d+)?)/i);
            if (embeddedLine) {
              lineNumber = `Line ${embeddedLine[1].replace(/\s+/g, '')}`;
            }
            // Strip bullet points or raw markdown
            defect = trimmed
              .replace(/^[-*]\s*/, '')
              .replace(/^\*\*\[[^\]]+\](?:\s*\[[^\]]+\])?\*\*:\s*/, '')
              .trim();
          }

          return {
            id: `sec-${idx}-item-${itemIdx}`,
            raw: trimmed,
            target,
            lineNumber,
            severity,
            defect,
            impact,
            isCleanPass,
          };
        })
        .filter(Boolean) as FindingItem[];

      const allClean = items.length > 0 && items.every((item) => item.isCleanPass);

      return {
        id: `section-${idx}`,
        title: cleanHeader,
        icon,
        accentColor: '',
        badgeColor,
        items,
        allClean,
      };
    });
  }, [content]);

  if (!content || !content.trim()) {
    return (
      <div className="font-mono text-xs text-[#6A8070] italic p-4">
        No inspection findings recorded.
      </div>
    );
  }

  return (
    <div className="font-mono text-xs text-[#C7D7CB] space-y-6">
      {parsedSections.map((sec) => (
        <div key={sec.id} className="space-y-2">
          {/* Clean Section Heading */}
          <div className="text-[#EEF4EF] font-semibold text-xs uppercase tracking-wider pb-1 border-b border-[#1b3324]/80">
            {sec.title}
          </div>

          {/* Section Items - Clean Monospace Layout */}
          <div className="space-y-3 pt-1">
            {sec.allClean ? (
              <div className="text-[#6A8070] pl-2">
                No defects, violations, or security hazards detected in this category.
              </div>
            ) : (
              sec.items.map((item) => {
                if (item.isCleanPass) {
                  return (
                    <div key={item.id} className="text-[#6A8070] pl-2">
                      {item.raw.replace(/^[✅\s]+/, '')}
                    </div>
                  );
                }

                return (
                  <div key={item.id} className="pl-2 space-y-1">
                    {/* Header: Line and Severity in plain clean text */}
                    {(item.lineNumber || item.severity || item.target) && (
                      <div className="text-[11px] text-[#A5B8AA] flex items-center gap-2">
                        {item.lineNumber && (
                          <span className="text-emerald-400 font-semibold">{item.lineNumber}</span>
                        )}
                        {item.severity && (
                          <span>
                            [Severity: <span className="text-[#EEF4EF] font-semibold">{item.severity}</span>]
                          </span>
                        )}
                        {item.target && !item.lineNumber && (
                          <span className="text-[#8CA392]">{item.target}</span>
                        )}
                      </div>
                    )}

                    {/* Description - Normal Monospace Text */}
                    <div className="text-[#D2DFD5] leading-relaxed pl-2">
                      {item.defect ? item.defect : item.raw}
                    </div>

                    {/* Impact - Clean Monospace Note */}
                    {item.impact && (
                      <div className="text-[#8CA392] text-[11px] pl-2">
                        <span className="text-[#A5B8AA]">Impact: </span>
                        {item.impact}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      ))}
    </div>
  );
};
