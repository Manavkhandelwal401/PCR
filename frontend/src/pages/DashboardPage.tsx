/**
 * @file src/pages/DashboardPage.tsx
 * @description Main overview dashboard showing active PR reviews, agents pipeline, and code health metrics.
 */

import React, { useEffect, useState } from 'react';
import { GitPullRequest, ShieldCheck, Activity, Layers } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ReviewWorkspace } from '../components/dashboard/ReviewWorkspace';
import { ReviewHistoryTable } from '../components/dashboard/ReviewHistoryTable';
import { getReviewHistory, getAnalyticsSummary, type ReviewItem, type AnalyticsSummary } from '../api/apiClient';

export const DashboardPage: React.FC = () => {
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Active logged-in user
  const userEmail = localStorage.getItem('pcr_user_email') || '';
  const fetchData = async () => {
    setLoading(true);
    try {
      const [historyData, analyticsData] = await Promise.allSettled([
        getReviewHistory(),
        getAnalyticsSummary(),
      ]);

      if (historyData.status === 'fulfilled') {
        setReviews(historyData.value || []);
      }
      if (analyticsData.status === 'fulfilled') {
        setAnalytics(analyticsData.value);
      }
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [userEmail]);

  return (
    <div className="space-y-8">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-[#1b3324] pb-6">
        <div>
          <h1 className="font-serif text-3xl font-normal text-[#EEF4EF]">
            Code Review Console
          </h1>
          <p className="mt-1 font-sans text-xs text-[#A5B8AA]">
            Continuous multi-agent AST, syntax, performance, and security inspection across active pull requests.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to="/repositories"
            className="inline-flex items-center gap-2 rounded-[6px] bg-[#15803d] px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#166534]"
          >
            <GitPullRequest className="h-4 w-4" />
            <span>Connect Repository</span>
          </Link>
        </div>
      </div>

      {/* Review Trigger Workspace */}
      <ReviewWorkspace onReviewCompleted={fetchData} />

      {/* Review History Audit Feed */}
      <ReviewHistoryTable
        reviews={reviews}
        loading={loading}
        onRefresh={fetchData}
      />

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-[8px] border border-[#1b3324] bg-[#0c1811] p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs text-[#A5B8AA] uppercase tracking-wider">Total Reviews</span>
            <Activity className="h-4 w-4 text-[#15803d]" />
          </div>
          <div className="mt-3 text-2xl font-bold font-mono text-[#EEF4EF]">
            {reviews.length}
          </div>
          <div className="mt-1 text-[11px] text-[#6A8070]">across verified inspection pipelines</div>
        </div>

        <div className="rounded-[8px] border border-[#1b3324] bg-[#0c1811] p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs text-[#A5B8AA] uppercase tracking-wider">Avg Code Quality</span>
            <ShieldCheck className="h-4 w-4 text-[#F5B731]" />
          </div>
          <div className="mt-3 text-2xl font-bold font-mono text-[#EEF4EF]">
            {reviews.length > 0 && analytics && analytics.averageQualityRating > 0
              ? `${analytics.averageQualityRating} / 10`
              : reviews.length > 0
              ? `${(reviews.reduce((acc, r) => acc + (r.qualityRating || 0), 0) / reviews.length).toFixed(1)} / 10`
              : 'N/A'}
          </div>
          <div className="mt-1 text-[11px] text-[#6A8070]">mean rating across LLM evaluations</div>
        </div>

        <div className="rounded-[8px] border border-[#1b3324] bg-[#0c1811] p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs text-[#A5B8AA] uppercase tracking-wider">Vulnerabilities Caught</span>
            <Layers className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="mt-3 text-2xl font-bold font-mono text-[#EEF4EF]">
            {reviews.length > 0 ? (analytics ? analytics.totalIssuesFound : reviews.filter(r => (r.severity || '').toUpperCase() === 'CRITICAL' || (r.severity || '').toUpperCase() === 'HIGH').length) : 0}
          </div>
          <div className="mt-1 text-[11px] text-[#6A8070]">
            {reviews.length > 0 && analytics ? `${analytics.criticalIssuesCount} critical risk items` : 'security & logic findings'}
          </div>
        </div>

        <div className="rounded-[8px] border border-[#1b3324] bg-[#0c1811] p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs text-[#A5B8AA] uppercase tracking-wider">Mean Audit Latency</span>
            <span className="rounded bg-[#122519] px-1.5 py-0.5 font-mono text-[10px] text-[#7AA983]">FAST</span>
          </div>
          <div className="mt-3 text-2xl font-bold font-mono text-[#EEF4EF]">
            {reviews.length > 0 && analytics ? `${analytics.meanLatencyMs}ms` : '0ms'}
          </div>
          <div className="mt-1 text-[11px] text-[#6A8070]">parallel Groq 4-agent dispatch</div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;


