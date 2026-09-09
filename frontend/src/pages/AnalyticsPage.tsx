/**
 * @file src/pages/AnalyticsPage.tsx
 * @description Production analytics console providing aggregated stats and severity distribution.
 * Adheres strictly to the minimalist, zero-emoji, enterprise dark theme (#0c1811, #1b3324, #15803d).
 */

import React, { useEffect, useState } from 'react';
import { ShieldAlert, BarChart3, Activity, Zap, RefreshCw } from 'lucide-react';
import { getAnalyticsSummary, type AnalyticsSummary } from '../api/apiClient';

export const AnalyticsPage: React.FC = () => {
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const userEmail = localStorage.getItem('pcr_user_email') || '';

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const data = await getAnalyticsSummary();
      setSummary(data);
    } catch (err) {
      console.error('Failed to load analytics summary:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [userEmail]);

  const totalSeverities = summary
    ? summary.criticalIssuesCount +
      summary.highIssuesCount +
      summary.moderateIssuesCount +
      summary.lowIssuesCount +
      summary.goodIssuesCount
    : 0;

  const calculatePct = (count: number): number => {
    if (totalSeverities === 0) return 0;
    return Math.round((count / totalSeverities) * 100);
  };

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-[#1b3324] pb-6">
        <div>
          <h1 className="font-serif text-3xl font-normal text-[#EEF4EF]">
            Code Quality Analytics
          </h1>
          <p className="mt-1 font-sans text-xs text-[#A5B8AA]">
            Aggregate performance, invariant risk distributions, and multi-agent metrics calculated across all review runs.
          </p>
        </div>

        <button
          type="button"
          onClick={fetchAnalytics}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-[6px] border border-[#1b3324] bg-[#0c1811] px-4 py-2 font-mono text-xs text-[#EEF4EF] hover:border-[#15803d] transition-colors disabled:opacity-50 self-start md:self-auto"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin text-[#15803d]' : ''}`} />
          <span>Refresh Data</span>
        </button>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-[8px] border border-[#1b3324] bg-[#0c1811] p-5">
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs text-[#A5B8AA] uppercase tracking-wider">Total Audits</span>
            <Activity className="h-4 w-4 text-[#15803d]" />
          </div>
          <div className="mt-3 text-3xl font-bold font-mono text-[#EEF4EF]">
            {summary ? summary.totalReviews : 0}
          </div>
          <p className="mt-1 text-[11px] text-[#6A8070]">Total PR & upload reviews processed</p>
        </div>

        <div className="rounded-[8px] border border-[#1b3324] bg-[#0c1811] p-5">
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs text-[#A5B8AA] uppercase tracking-wider">Mean Quality Score</span>
            <BarChart3 className="h-4 w-4 text-[#F5B731]" />
          </div>
          <div className="mt-3 text-3xl font-bold font-mono text-[#EEF4EF]">
            {summary && summary.averageQualityRating > 0
              ? `${summary.averageQualityRating} / 10`
              : 'N/A'}
          </div>
          <p className="mt-1 text-[11px] text-[#6A8070]">Weighted across AST, security & syntax</p>
        </div>

        <div className="rounded-[8px] border border-[#1b3324] bg-[#0c1811] p-5">
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs text-[#A5B8AA] uppercase tracking-wider">Critical Invariants</span>
            <ShieldAlert className="h-4 w-4 text-red-400" />
          </div>
          <div className="mt-3 text-3xl font-bold font-mono text-[#EEF4EF]">
            {summary ? summary.criticalIssuesCount : 0}
          </div>
          <p className="mt-1 text-[11px] text-[#6A8070]">High-impact security & logic blockers</p>
        </div>

        <div className="rounded-[8px] border border-[#1b3324] bg-[#0c1811] p-5">
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs text-[#A5B8AA] uppercase tracking-wider">Mean Latency</span>
            <Zap className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="mt-3 text-3xl font-bold font-mono text-[#EEF4EF]">
            {summary && summary.totalReviews > 0 && summary.meanLatencyMs > 0
              ? `${summary.meanLatencyMs} ms`
              : 'N/A'}
          </div>
          <p className="mt-1 text-[11px] text-[#6A8070]">4-agent concurrent Groq dispatch</p>
        </div>
      </div>

      {/* Severity Distribution Visualization */}
      <div className="rounded-[8px] border border-[#1b3324] bg-[#0c1811] overflow-hidden shadow-sm">
        <div className="border-b border-[#1b3324] px-6 py-4 bg-[#0e1c14] flex items-center justify-between">
          <div>
            <h2 className="font-mono text-xs font-semibold uppercase tracking-wider text-[#EEF4EF]">
              Severity & Risk Distribution
            </h2>
            <p className="mt-0.5 text-xs text-[#A5B8AA]">
              Breakdown of code evaluation classifications across all recorded reviews.
            </p>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {totalSeverities === 0 ? (
            <div className="py-8 text-center font-mono text-xs text-[#6A8070]">
              No review data available to generate severity distribution. Run code reviews to populate metrics.
            </div>
          ) : (
            <div className="space-y-5">
              {/* Critical Risk: Dark Red (High-impact security blockers) */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between font-mono text-xs">
                  <span className="text-[#EEF4EF] font-medium">
                    Critical
                  </span>
                  <span className="text-[#EEF4EF]">
                    {summary?.criticalIssuesCount || 0} ({calculatePct(summary?.criticalIssuesCount || 0)}%)
                  </span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-[#122519] overflow-hidden">
                  <div
                    className="h-full bg-[#b91c1c] shadow-[0_0_10px_rgba(185,28,28,0.8)] transition-all duration-500"
                    style={{ width: `${calculatePct(summary?.criticalIssuesCount || 0)}%` }}
                  />
                </div>
              </div>

              {/* High Risk: Orange / Amber-Red (Urgent warning color, just below critical) */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between font-mono text-xs">
                  <span className="text-[#EEF4EF] font-medium">
                    High
                  </span>
                  <span className="text-[#EEF4EF]">
                    {summary?.highIssuesCount || 0} ({calculatePct(summary?.highIssuesCount || 0)}%)
                  </span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-[#122519] overflow-hidden">
                  <div
                    className="h-full bg-[#f97316] shadow-[0_0_10px_rgba(249,115,22,0.6)] transition-all duration-500"
                    style={{ width: `${calculatePct(summary?.highIssuesCount || 0)}%` }}
                  />
                </div>
              </div>

              {/* Moderate / Medium: Warm Yellow / Gold (Cautionary tone, signals things that need attention soon) */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between font-mono text-xs">
                  <span className="text-[#EEF4EF] font-medium">
                    Moderate / Medium
                  </span>
                  <span className="text-[#EEF4EF]">
                    {summary?.moderateIssuesCount || 0} ({calculatePct(summary?.moderateIssuesCount || 0)}%)
                  </span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-[#122519] overflow-hidden">
                  <div
                    className="h-full bg-[#eab308] shadow-[0_0_10px_rgba(234,179,8,0.6)] transition-all duration-500"
                    style={{ width: `${calculatePct(summary?.moderateIssuesCount || 0)}%` }}
                  />
                </div>
              </div>

              {/* Low Risk: Cyan / Sky Blue (Informational or minor adjustments, stands out nicely against dark green) */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between font-mono text-xs">
                  <span className="text-[#EEF4EF] font-medium">
                    Low
                  </span>
                  <span className="text-[#EEF4EF]">
                    {summary?.lowIssuesCount || 0} ({calculatePct(summary?.lowIssuesCount || 0)}%)
                  </span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-[#122519] overflow-hidden">
                  <div
                    className="h-full bg-[#38bdf8] shadow-[0_0_10px_rgba(56,189,248,0.6)] transition-all duration-500"
                    style={{ width: `${calculatePct(summary?.lowIssuesCount || 0)}%` }}
                  />
                </div>
              </div>

              {/* Pass / Clean: Rich Deep Green (Success / Safe) */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between font-mono text-xs">
                  <span className="text-[#EEF4EF] font-medium">
                    Pass / Clean
                  </span>
                  <span className="text-[#EEF4EF]">
                    {summary?.goodIssuesCount || 0} ({calculatePct(summary?.goodIssuesCount || 0)}%)
                  </span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-[#122519] overflow-hidden">
                  <div
                    className="h-full bg-[#15803d] shadow-[0_0_10px_rgba(21,128,61,0.8)] transition-all duration-500"
                    style={{ width: `${calculatePct(summary?.goodIssuesCount || 0)}%` }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AnalyticsPage;
