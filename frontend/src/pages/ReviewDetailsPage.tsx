/**
 * @file src/pages/ReviewDetailsPage.tsx
 * @description Detailed inspection view for an individual pull request or local upload code review.
 * Features:
 * - Header: Back to Dashboard link, review title (Repository Name + PR Number or 'Local Upload'), and enterprise badges for Severity and Quality Rating.
 * - AI Analysis Section: Dedicated container displaying aiComment with clean markdown/structured styling.
 * - Code Inspector Section: Monospace scrollable block displaying codeDiff with #0c1811 background and #1b3324 border.
 * - Minimalist, zero-emoji, enterprise dark theme.
 */

import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, GitPullRequest, ShieldAlert, CheckCircle2, Clock, Calendar, RefreshCw, FileText } from 'lucide-react';
import { getReviewDetails, type ReviewItem } from '../api/apiClient';
import { StructuredReviewReport } from '../components/StructuredReviewReport';
import { CodeViewer } from '../components/CodeViewer';



export const ReviewDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [review, setReview] = useState<ReviewItem | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    let isMounted = true;
    let pollInterval: any = null;

    const fetchReview = async (isInitial = false) => {
      if (isInitial) {
        setLoading(true);
        setError(null);
      }
      try {
        const data = await getReviewDetails(id);
        if (!isMounted) return;

        setReview(data);

        // If review is terminal (COMPLETED or FAILED), stop polling
        if (data && (data.status === 'COMPLETED' || data.status === 'FAILED')) {
          if (pollInterval) {
            clearInterval(pollInterval);
            pollInterval = null;
          }
        }
      } catch (err: any) {
        if (!isMounted) return;
        console.error('Failed to load review details:', err);
        if (isInitial) {
          setError(
            err?.response?.status === 404
              ? `Review inspection #${id} was not found in the repository.`
              : 'Unable to retrieve review inspection data. Please check connection and try again.'
          );
        }
      } finally {
        if (isMounted && isInitial) {
          setLoading(false);
        }
      }
    };

    // Initial fetch
    fetchReview(true).then(() => {
      // Set up polling every 3 seconds if state is PROCESSING
      pollInterval = setInterval(() => {
        fetchReview(false);
      }, 3000);
    });

    return () => {
      isMounted = false;
      if (pollInterval) {
        clearInterval(pollInterval);
      }
    };
  }, [id]);

  const formatDate = (isoString?: string): string => {
    if (!isoString) return '-';
    try {
      const date = new Date(isoString);
      return new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'short',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      }).format(date);
    } catch {
      return isoString;
    }
  };

  const renderSeverityBadge = (severity?: string) => {
    const sev = (severity || 'UNKNOWN').toUpperCase();
    return (
      <div className="flex items-center gap-2 font-mono text-xs">
        <span className="text-[11px] tracking-wider uppercase text-[#6A8070]">SEVERITY:</span>
        <span className="font-semibold tracking-wide text-[#EEF4EF]">{sev}</span>
      </div>
    );
  };

  const renderQualityBadge = (rating?: number) => {
    if (rating === undefined || rating === null || rating === 0) {
      return (
        <div className="flex items-center gap-1.5 font-mono text-xs text-[#6A8070]">
          <span className="text-[11px] tracking-wider uppercase">QUALITY:</span>
          <span>UNRATED</span>
        </div>
      );
    }

    return (
      <div className="flex items-center gap-2 font-mono text-xs">
        <span className="text-[11px] tracking-wider uppercase text-[#6A8070]">QUALITY:</span>
        <span className="font-semibold text-[#EEF4EF]">
          {rating}<span className="text-[11px] text-[#6A8070] font-normal"> / 10</span>
        </span>
      </div>
    );
  };


  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[420px] space-y-3 font-mono text-xs text-[#A5B8AA]">
        <RefreshCw className="h-5 w-5 animate-spin text-[#15803d]" />
        <span className="animate-pulse tracking-wide">Fetching inspection data for review #{id}...</span>
      </div>
    );
  }

  if (error || !review) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3 border-b border-[#1b3324] pb-4">
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-1.5 text-xs font-mono text-[#A5B8AA] hover:text-[#EEF4EF] transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to Dashboard</span>
          </Link>
        </div>
        <div className="rounded-[8px] border border-red-900/60 bg-red-950/20 p-6 font-mono text-xs text-red-300 space-y-2">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <ShieldAlert className="h-4 w-4 text-red-400" />
            <span>Inspection Record Unavailable</span>
          </div>
          <p className="text-[#A5B8AA]">{error || 'Review could not be retrieved.'}</p>
        </div>
      </div>
    );
  }

  const isLocalUpload =
    review.repositoryName === 'Local Upload' ||
    !review.pullRequestNumber ||
    review.pullRequestNumber === 0;

  return (
    <div className="space-y-8">
      {/* 1. Header Navigation & Back Action */}
      <div className="flex items-center justify-between border-b border-[#1b3324] pb-4">
        <div className="flex items-center gap-3">
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-1.5 text-xs font-mono text-[#A5B8AA] hover:text-[#EEF4EF] transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to Dashboard</span>
          </Link>
          <span className="text-[#6A8070]">/</span>
          <span className="font-mono text-xs text-[#EEF4EF]">
            Review #{review.userReviewNumber ?? review.id}
          </span>
        </div>
        <div className="flex items-center gap-2 text-[11px] font-mono text-[#6A8070]">
          <Calendar className="h-3.5 w-3.5 text-[#415546]" />
          <span>{formatDate(review.createdAt)}</span>
        </div>
      </div>

      {/* 2. Review Title & Metadata Badges */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl font-normal text-[#EEF4EF] flex items-center gap-3">
            {isLocalUpload ? (
              <FileText className="h-5 w-5 text-[#15803d]" />
            ) : (
              <GitPullRequest className="h-5 w-5 text-[#15803d]" />
            )}
            <span>
              {isLocalUpload
                ? 'Local Upload Inspection'
                : `${review.repositoryName} • PR #${review.pullRequestNumber}`}
            </span>
          </h1>
          <p className="mt-1 font-mono text-xs text-[#A5B8AA]">
            Automated multi-agent AST, syntax, performance, and invariant verification report.
          </p>
        </div>

        {/* Clean Minimal Typography (No boxes, no red) */}
        <div className="flex flex-wrap items-center gap-4">
          {renderSeverityBadge(review.severity)}
          <span className="text-[#324b3a] select-none">•</span>
          {renderQualityBadge(review.qualityRating)}
        </div>
      </div>

      {/* 3. Main Inspection Sections */}
      <div className="space-y-6">
        {/* AI Analysis Section */}
        <div className="rounded-[8px] border border-[#1b3324] bg-[#0c1811] overflow-hidden shadow-sm">
          <div className="flex items-center justify-between border-b border-[#1b3324] px-5 py-3.5 bg-[#0e1c14]">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-[#15803d]" />
              <h2 className="font-mono text-xs font-semibold uppercase tracking-wider text-[#EEF4EF]">
                AI Multi-Agent Inspection Report
              </h2>
            </div>
            <span className="font-mono text-[10px] text-[#6A8070]">
              SYNTAX • LOGIC • SECURITY • PERFORMANCE
            </span>
          </div>

          <div className="p-6">
            {review.status === 'PROCESSING' ? (
              <div className="flex items-center gap-3 py-4 text-[#A5B8AA] font-mono text-xs">
                <RefreshCw className="h-4 w-4 animate-spin text-[#15803d]" />
                <span className="animate-pulse">
                  {review.aiComment && review.aiComment.trim()
                    ? review.aiComment
                    : 'Analysis in progress: evaluating AST, syntax, security, and performance across source chunks...'}
                </span>
              </div>
            ) : review.status === 'FAILED' ? (
              <div className="rounded-[6px] border border-red-900/60 bg-red-950/20 p-4 font-mono text-xs text-red-300 space-y-1">
                <div className="flex items-center gap-2 font-semibold">
                  <ShieldAlert className="h-4 w-4 text-red-400" />
                  <span>Inspection Failed</span>
                </div>
                <p className="text-[#A5B8AA]">{review.aiComment || 'Internal review processing failed.'}</p>
              </div>
            ) : review.aiComment ? (
              <StructuredReviewReport content={review.aiComment} />
            ) : (
              <div className="font-mono text-xs text-[#6A8070] italic">
                No analysis commentary recorded for this inspection.
              </div>
            )}
          </div>
        </div>

        {/* Code Inspector Section */}
        <div className="rounded-[8px] border border-[#1b3324] bg-[#0c1811] overflow-hidden shadow-sm">
          <div className="flex items-center justify-between border-b border-[#1b3324] px-5 py-3.5 bg-[#0e1c14]">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-[#15803d]" />
              <h2 className="font-mono text-xs font-semibold uppercase tracking-wider text-[#EEF4EF]">
                Submitted Code Diff / Content
              </h2>
            </div>
            <span className="font-mono text-[10px] text-[#6A8070]">
              MONOSPACE RAW DIFF
            </span>
          </div>

          <CodeViewer code={review.codeDiff || ''} />
        </div>
      </div>
    </div>
  );
};

export default ReviewDetailsPage;
