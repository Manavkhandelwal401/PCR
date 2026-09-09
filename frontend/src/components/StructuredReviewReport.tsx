import React, { useMemo } from 'react';
import {
  CheckCircle2,
  Bug,
  Shield,
  Zap,
  Cpu,
  Layers,
  FileCode2,
  Hash,
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
 * - Also supports newer headings like "🔴 Critical", "🟠 Security", etc.
 */
export const StructuredReviewReport: React.FC<StructuredReviewReportProps> = ({ content }) => {
  const parsedSections = useMemo<SectionData[]>(() => {
    if (!content || !content.trim()) return [];

    // Strip HTML comments, engine tags, and metadata artifacts (e.g. _<!-- [Engine: v2.2] -->_)
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

    // If no markdown headings were detected, treat the entire text as one section
    if (sections.length === 0 && content.trim()) {
      const bulletLines = lines.filter((l) => l.trim().length > 0);
      sections.push({ rawHeader: 'Findings & Review Diagnostics', lines: bulletLines });
    }

    return sections.map((sec, idx) => {
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

  // Overall counts for executive scorecard
  const totalFindings = useMemo(() => {
    let count = 0;
    for (const sec of parsedSections) {
      for (const item of sec.items) {
        if (!item.isCleanPass) count++;
      }
    }
    return count;
  }, [parsedSections]);

  if (!content || !content.trim()) {
    return (
      <div className="font-mono text-xs text-[#6A8070] italic p-4">
        No inspection findings recorded.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 1. Executive Findings Summary Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 rounded-lg border border-[#1b3324] bg-[#09150d]">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs font-semibold uppercase tracking-wider text-[#A5B8AA]">
            Executive Overview:
          </span>
          <span
            className={`font-mono text-xs px-2.5 py-0.5 rounded border ${
              totalFindings === 0
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                : 'bg-[#14281b] text-emerald-300 border-[#254d34] font-semibold'
            }`}
          >
            {totalFindings === 0
              ? '✅ 0 Active Defects Detected'
              : `${totalFindings} ${totalFindings === 1 ? 'Defect' : 'Defects'} Requiring Action`}
          </span>
        </div>

        <div className="flex items-center gap-3 text-xs font-mono text-[#6A8070]">
          <span>{parsedSections.length} Inspection Dimensions Verified</span>
        </div>
      </div>

      {/* 2. Structured Sections (Clean Unified List - No Individual Boxes) */}
      <div className="space-y-4">
        {parsedSections.map((sec) => (
          <div
            key={sec.id}
            className="rounded-lg border border-[#1b3324] bg-[#07120a] overflow-hidden"
          >
            {/* Section Header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-[#1b3324] bg-[#0d1a11]">
              <div className="flex items-center gap-2.5">
                {sec.icon}
                <h3 className="font-mono text-xs font-semibold uppercase tracking-wider text-[#EEF4EF]">
                  {sec.title}
                </h3>
              </div>

              {sec.allClean ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono bg-emerald-950/60 text-emerald-400 border border-emerald-800/40">
                  <CheckCircle2 className="h-3 w-3" />
                  Clean Pass
                </span>
              ) : (
                <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-mono border ${sec.badgeColor}`}>
                  {sec.items.filter((i) => !i.isCleanPass).length} Findings
                </span>
              )}
            </div>

            {/* Clean Seamless Findings List */}
            <div className="divide-y divide-[#15271c]/70">
              {sec.allClean ? (
                <div className="flex items-center gap-3 p-4 text-emerald-400/90 font-mono text-xs">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span>Verified: No defects, violations, or security hazards detected in this category.</span>
                </div>
              ) : (
                sec.items.map((item) => {
                  if (item.isCleanPass) {
                    return (
                      <div
                        key={item.id}
                        className="flex items-center gap-2.5 px-5 py-2.5 font-mono text-xs text-[#7A9180]"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                        <span>{item.raw.replace(/^[✅\s]+/, '')}</span>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={item.id}
                      className="px-5 py-3.5 hover:bg-[#0c1810]/60 transition-colors space-y-1.5"
                    >
                      {/* Line Number, Target & Severity Badges */}
                      {(item.lineNumber || item.target || item.severity) && (
                        <div className="flex flex-wrap items-center gap-2 mb-1.5">
                          {item.lineNumber && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-[#14281b] text-emerald-300 border border-[#254d34]">
                              <Hash className="h-3 w-3 text-emerald-400" />
                              {item.lineNumber}
                            </span>
                          )}
                          {item.severity && (
                            <span className="font-mono text-[11px] font-medium tracking-wide text-[#A5B8AA] flex items-center gap-1.5">
                              <span className="text-[#6A8070] text-[10px] uppercase">SEVERITY:</span>
                              <span className="text-[#EEF4EF] font-semibold">{item.severity}</span>
                            </span>
                          )}
                          {item.target && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono text-[#8CA392] bg-[#0c1a11] border border-[#1b3324]">
                              <FileCode2 className="h-3 w-3 text-emerald-400" />
                              {item.target}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Defect Description (Clean, Readable Sans-Serif) */}
                      <div className="flex items-start gap-2.5 text-[13px] leading-relaxed text-[#D2DFD5]">
                        <span className="text-emerald-400 font-bold select-none leading-5">•</span>
                        <div className="flex-1 space-y-1">
                          <p className="text-[#EEF4EF]">
                            {item.defect ? item.defect : item.raw}
                          </p>

                          {/* Impact Note (Clean neutral monospace pill, no yellow warning) */}
                          {item.impact && (
                            <p className="text-xs font-mono text-[#9AB3A1] pt-0.5">
                              <span className="text-emerald-400 font-semibold mr-1.5">Impact:</span>
                              {item.impact}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
