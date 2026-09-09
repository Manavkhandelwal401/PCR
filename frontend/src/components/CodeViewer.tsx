import React, { useMemo, useState } from 'react';
import { Copy, Check, FileCode } from 'lucide-react';

interface CodeViewerProps {
  code: string;
}

export const CodeViewer: React.FC<CodeViewerProps> = ({ code }) => {
  const [copied, setCopied] = useState(false);

  const lines = useMemo(() => {
    if (!code) return [];
    return code.split(/\r?\n/);
  }, [code]);

  const handleCopy = () => {
    if (!code) return;
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!code || !code.trim()) {
    return (
      <div className="font-mono text-xs text-[#6A8070] italic p-6 text-center">
        No code diff payload attached to this record.
      </div>
    );
  }

  // Calculate padding width for line numbers
  const maxLineDigits = Math.max(2, String(lines.length).length);

  return (
    <div className="flex flex-col bg-[#050e08] rounded-b-[8px] overflow-hidden text-xs font-mono">
      {/* Code Header Bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-[#09150d] border-b border-[#1b3324] text-[#A5B8AA] select-none">
        <div className="flex items-center gap-2">
          <FileCode className="h-3.5 w-3.5 text-emerald-400" />
          <span className="text-[11px] font-mono text-[#D2DFD5]">
            {lines.length} {lines.length === 1 ? 'line' : 'lines'}
          </span>
        </div>

        <button
          onClick={handleCopy}
          type="button"
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#0e2115] hover:bg-[#142e1d] text-[#A5B8AA] hover:text-[#EEF4EF] border border-[#1b3324] transition-colors text-[11px]"
          title="Copy raw code"
        >
          {copied ? (
            <>
              <Check className="h-3 w-3 text-emerald-400" />
              <span className="text-emerald-400">Copied</span>
            </>
          ) : (
            <>
              <Copy className="h-3 w-3 text-[#A5B8AA]" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>

      {/* Code with Line Numbers Table */}
      <div className="overflow-x-auto max-h-[650px] scrollbar-thin scrollbar-thumb-[#1b3324] scrollbar-track-transparent">
        <table className="w-full border-collapse text-left">
          <tbody>
            {lines.map((lineContent, index) => {
              const lineNum = index + 1;
              const isDiffAdd = lineContent.startsWith('+') && !lineContent.startsWith('+++');
              const isDiffDel = lineContent.startsWith('-') && !lineContent.startsWith('---');

              const rowBg = isDiffAdd
                ? 'bg-emerald-950/25 hover:bg-emerald-950/40'
                : isDiffDel
                ? 'bg-red-950/25 hover:bg-red-950/40'
                : 'hover:bg-[#0c1d12]/50';

              const textCol = isDiffAdd
                ? 'text-emerald-300'
                : isDiffDel
                ? 'text-red-300'
                : 'text-[#C7D7CB]';

              return (
                <tr key={lineNum} className={`group transition-colors ${rowBg}`}>
                  {/* Line Number Column */}
                  <td
                    className="py-0.5 px-3 select-none text-right align-top border-r border-[#152a1d] text-[#4d6653] group-hover:text-[#84a38c] bg-[#07130b] w-12 shrink-0 font-mono text-[11px]"
                    style={{ minWidth: `${maxLineDigits * 10 + 24}px` }}
                  >
                    {lineNum}
                  </td>

                  {/* Code Line Column */}
                  <td className={`py-0.5 px-4 font-mono text-xs whitespace-pre select-text leading-5 ${textCol}`}>
                    {lineContent || ' '}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
