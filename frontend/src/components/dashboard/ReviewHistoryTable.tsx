/**
 * @file src/components/dashboard/ReviewHistoryTable.tsx
 * @description Enterprise-grade data table displaying historical AI code reviews.
 * Columns: Date, Source (Repository Name or 'Local Upload'), Identifier (PR Number or '-'), Severity/Status, Quality Rating, and Inspect link.
 *
 * Strict enterprise aesthetic:
 * - Minimal borders (border-[#1b3324])
 * - Subtle hover states (hover:bg-[#0c1811])
 * - Clean typography, zero emojis
 * - Phantom green (#15803d) for good ratings and muted color accents for severities.
 */

import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, Clock, RefreshCw, FolderGit2 } from 'lucide-react';
import type { ReviewItem } from '../../api/apiClient';

interface ReviewHistoryTableProps {
  reviews: ReviewItem[];
  loading: boolean;
  onRefresh?: () => void;
}

export const ReviewHistoryTable: React.FC<ReviewHistoryTableProps> = ({
  reviews,
  loading,
  onRefresh,
}) => {
  const formatDate = (isoString?: string): string => {
    if (!isoString) return '-';
    try {
      const date = new Date(isoString);
      return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }).format(date);
    } catch {
      return isoString;
    }
  };

  const renderSeverityBadge = (severity?: string) => {
    const sev = (severity || 'UNKNOWN').toUpperCase();
    return (
      <span className="font-mono text-xs text-[#EEF4EF] font-medium tracking-wide">
        {sev === 'GOOD' ? 'PASS' : sev}
      </span>
    );
  };

  const renderQualityRating = (rating?: number) => {
    if (rating === undefined || rating === null || rating === 0) {
      return <span className="font-mono text-xs text-[#6A8070]">-</span>;
    }

    return (
      <div className="flex items-center gap-1.5 font-mono text-xs text-[#EEF4EF]">
        <span className="font-semibold text-[#EEF4EF]">{rating}</span>
        <span className="text-[#6A8070]">/ 10</span>
      </div>
    );
  };


  return (
    <div className="rounded-[8px] border border-[#1b3324] bg-[#0c1811] overflow-hidden shadow-sm">
      {/* Table Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-[#1b3324] px-5 py-3.5 bg-[#0e1c14]">
        <div className="flex items-center gap-3">
          <h2 className="font-mono text-xs font-semibold uppercase tracking-wider text-[#EEF4EF]">
            Review Audit Feed
          </h2>
          <span className="font-mono text-[10px] text-[#6A8070]">
            {reviews.length} total entries recorded
          </span>
        </div>

        {onRefresh && (
          <button
            type="button"
            onClick={onRefresh}
            disabled={loading}
            className="inline-flex items-center gap-1.5 font-mono text-xs text-[#A5B8AA] hover:text-[#EEF4EF] transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin text-[#15803d]' : ''}`} />
            <span>Refresh</span>
          </button>
        )}
      </div>

      {/* Table Content */}
      <div className="overflow-x-auto">
        <table className="w-full text-left font-mono text-xs">
          <thead className="border-b border-[#1b3324] bg-[#07110a] text-[11px] text-[#6A8070] uppercase">
            <tr>
              <th className="px-5 py-3 font-medium">Date</th>
              <th className="px-5 py-3 font-medium">Source</th>
              <th className="px-5 py-3 font-medium">Identifier</th>
              <th className="px-5 py-3 font-medium">Severity</th>
              <th className="px-5 py-3 font-medium">Quality Rating</th>
              <th className="px-5 py-3 font-medium text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1b3324] text-[#A5B8AA]">
            {loading && reviews.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-5 py-8 text-center text-xs text-[#6A8070]">
                  <div className="flex items-center justify-center gap-2">
                    <RefreshCw className="h-4 w-4 animate-spin text-[#15803d]" />
                    <span>Loading review history...</span>
                  </div>
                </td>
              </tr>
            ) : reviews.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-5 py-12 text-center text-xs">
                  <div className="flex flex-col items-center justify-center max-w-md mx-auto space-y-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#122519] border border-[#1b4d2e] text-emerald-400 shadow-inner">
                      <FolderGit2 className="h-6 w-6" />
                    </div>

                    <div className="space-y-1">
                      <h3 className="font-serif text-base font-normal text-[#EEF4EF]">
                        Review Your Code Now
                      </h3>
                      <p className="text-xs text-[#A5B8AA] leading-relaxed">
                        No reviews recorded yet for this account.
                      </p>
                    </div>

                    {/* Quick action buttons */}
                    <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                      <Link
                        to="/repositories"
                        className="inline-flex items-center gap-2 rounded-[6px] bg-[#15803d] px-4 py-2 font-mono text-xs font-semibold text-white hover:bg-[#166534] transition-all shadow-md hover:shadow-[0_0_12px_rgba(21,128,61,0.35)]"
                      >
                        <FolderGit2 className="h-3.5 w-3.5" />
                        <span>Connect Repository</span>
                      </Link>

                      <a
                        href="https://github.com/apps/phantom-code-reviewer"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 rounded-[6px] border border-[#22c55e]/40 bg-[#07110a] px-4 py-2 font-mono text-xs font-semibold text-emerald-300 hover:bg-[#15803d]/20 hover:border-[#22c55e] transition-all shadow-sm"
                      >
                        <svg className="h-3.5 w-3.5 fill-current" viewBox="0 0 24 24">
                          <path
                            fillRule="evenodd"
                            clipRule="evenodd"
                            d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                          />
                        </svg>
                        <span>Install GitHub App</span>
                      </a>
                    </div>
                  </div>
                </td>
              </tr>
            ) : (
              reviews.map((rev) => (
                <tr
                  key={rev.id}
                  className="hover:bg-[#122519]/40 transition-colors"
                >
                  <td className="px-5 py-3.5 whitespace-nowrap text-[#6A8070]">
                    <div className="flex items-center gap-1.5">
                      <Clock className="h-3 w-3 shrink-0 text-[#415546]" />
                      <span>{formatDate(rev.createdAt)}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-[#EEF4EF] font-medium max-w-xs truncate">
                    {rev.repositoryName}
                  </td>
                  <td className="px-5 py-3.5 whitespace-nowrap">
                    {rev.pullRequestNumber && rev.pullRequestNumber > 0 ? (
                      <span className="text-[#EEF4EF]">PR #{rev.pullRequestNumber}</span>
                    ) : (
                      <span className="text-[#6A8070]">-</span>
                    )}
                  </td>
                  <td className="px-5 py-3.5 whitespace-nowrap">
                    {renderSeverityBadge(rev.severity)}
                  </td>
                  <td className="px-5 py-3.5 whitespace-nowrap">
                    {renderQualityRating(rev.qualityRating)}
                  </td>
                  <td className="px-5 py-3.5 whitespace-nowrap text-right">
                    <Link
                      to={`/reviews/${rev.id}`}
                      className="inline-flex items-center gap-1 font-mono text-xs text-[#15803d] hover:text-[#7AA983] transition-colors"
                    >
                      <span>Inspect</span>
                      <ArrowUpRight className="h-3.5 w-3.5" />
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ReviewHistoryTable;
