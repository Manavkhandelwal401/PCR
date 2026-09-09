/**
 * @file src/components/dashboard/ReviewWorkspace.tsx
 * @description Enterprise-grade, minimalist review trigger workspace focused on local source file uploads.
 * PR reviews occur GitHub-side via GitHub App / Webhook; this workspace handles local file inspection.
 *
 * Adheres strictly to a minimalist enterprise design system:
 * - No emojis
 * - Standard, neutral, professional typography
 * - Clean status feedback
 */

import React, { useState, useRef, useEffect, type DragEvent, type ChangeEvent } from 'react';
import { Upload, FileCode, CheckCircle2, AlertCircle, Loader2, X } from 'lucide-react';
import { submitLocalFiles } from '../../api/apiClient';

// Explicit allowlist of source-code and text file extensions supported by the multi-agent AI inspection pipeline
// Must be kept in sync with com.phantom.CodeReviewer.controller.ReviewController.SUPPORTED_EXTENSIONS
export const SUPPORTED_SOURCE_EXTENSIONS: readonly string[] = [
  'java', 'js', 'jsx', 'ts', 'tsx', 'py', 'go', 'c', 'cpp', 'cc', 'h', 'hpp',
  'cs', 'rs', 'php', 'rb', 'kt', 'kts', 'swift', 'scala', 'sql', 'sh', 'bash',
  'html', 'css', 'scss', 'json', 'xml', 'yaml', 'yml', 'properties', 'md', 'txt',
] as const;

export const SUPPORTED_EXTENSIONS_SET = new Set<string>(SUPPORTED_SOURCE_EXTENSIONS);

export const SUPPORTED_EXTENSIONS_ACCEPT: string = SUPPORTED_SOURCE_EXTENSIONS.map((ext) => `.${ext}`).join(',');

function getFileExtension(filename: string): string {
  if (!filename) return '';
  const lastDot = filename.lastIndexOf('.');
  if (lastDot < 0 || lastDot === filename.length - 1) return '';
  return filename.substring(lastDot + 1).toLowerCase().trim();
}

interface ReviewWorkspaceProps {
  onReviewCompleted?: () => void;
}

export const ReviewWorkspace: React.FC<ReviewWorkspaceProps> = ({ onReviewCompleted }) => {
  // Upload Files state
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadSubmitting, setUploadSubmitting] = useState(false);
  const [uploadMessage, setUploadMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isProcessingUpload, setIsProcessingUpload] = useState<boolean>(false);
  const [isUploadComplete, setIsUploadComplete] = useState<boolean>(false);
  const [reviewStage, setReviewStage] = useState<string>('');

  const pollTimerRef = useRef<any>(null);

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, []);

  const startReviewProgress = (fileCount: number, reviewId: number) => {
    if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    setIsProcessingUpload(true);
    setIsUploadComplete(false);
    setReviewStage(`Dispatched ${fileCount} file(s) for asynchronous multi-agent inspection...`);

    let attempts = 0;
    pollTimerRef.current = setInterval(async () => {
      attempts++;
      try {
        const { getReviewDetails } = await import('../../api/apiClient');
        const review = await getReviewDetails(reviewId);

        if (review && review.status === 'COMPLETED') {
          clearInterval(pollTimerRef.current);
          setIsProcessingUpload(false);
          setIsUploadComplete(true);
          setReviewStage(`Code Review Completed! ${fileCount} file(s) evaluated and recorded.`);
          if (onReviewCompleted) {
            onReviewCompleted();
          }
        } else if (review && review.status === 'FAILED') {
          clearInterval(pollTimerRef.current);
          setIsProcessingUpload(false);
          setIsUploadComplete(false);
          setReviewStage(`Analysis failed: ${review.aiComment || 'Could not complete inspection.'}`);
          setUploadMessage({
            type: 'error',
            text: `Review failed: ${review.aiComment || 'Unknown error occurred during analysis.'}`,
          });
        } else if (review && (review.status === 'PROCESSING' || review.status === 'WAITING' || review.status === 'RUNNING')) {
          // Keep polling; update stage description dynamically from backend comment if available
          if (review.aiComment && review.aiComment.trim()) {
            setReviewStage(review.aiComment);
          }
        }
      } catch (e) {
        console.error('Error polling for review completion:', e);
      }
    }, 2000);
  };

  // --- Handlers for File Upload ---
  const handleFilesAdded = (incomingFiles: FileList | File[]) => {
    setUploadMessage(null);
    const newFiles = Array.from(incomingFiles);

    // 1. Client-side extension validation: Reject unsupported files immediately before adding
    for (const file of newFiles) {
      const ext = getFileExtension(file.name);
      if (!ext || !SUPPORTED_EXTENSIONS_SET.has(ext)) {
        setUploadMessage({
          type: 'error',
          text: `Unsupported file type: ${file.name}. Please upload a supported source-code/text file.`,
        });
        return;
      }
    }

    // Combine existing and incoming files
    const combined = [...selectedFiles];
    for (const file of newFiles) {
      // Prevent duplicates by name and size
      if (!combined.some((f) => f.name === file.name && f.size === file.size)) {
        combined.push(file);
      }
    }

    if (combined.length > 5) {
      setUploadMessage({
        type: 'error',
        text: 'Selection exceeds maximum limit. You may upload a maximum of 5 files at once.',
      });
      return;
    }

    // Client-side UX size checks: individual <= 5MB, total <= 15MB
    const MAX_FILE_SIZE = 5 * 1024 * 1024;
    const MAX_TOTAL_SIZE = 15 * 1024 * 1024;
    let totalSize = 0;

    for (const f of combined) {
      if (f.size > MAX_FILE_SIZE) {
        setUploadMessage({
          type: 'error',
          text: `File "${f.name}" exceeds the maximum individual size limit of 5MB.`,
        });
        return;
      }
      totalSize += f.size;
    }

    if (totalSize > MAX_TOTAL_SIZE) {
      setUploadMessage({
        type: 'error',
        text: 'Total upload size exceeds 15MB. Please remove some files.',
      });
      return;
    }

    setSelectedFiles(combined);
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFilesAdded(e.target.files);
    }
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFilesAdded(e.dataTransfer.files);
    }
  };

  const handleRemoveFile = (indexToRemove: number) => {
    setSelectedFiles((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleUploadSubmit = async () => {
    if (selectedFiles.length === 0) {
      setUploadMessage({ type: 'error', text: 'Please select at least one file to upload.' });
      return;
    }

    // Defensive check before sending HTTP request
    for (const file of selectedFiles) {
      const ext = getFileExtension(file.name);
      if (!ext || !SUPPORTED_EXTENSIONS_SET.has(ext)) {
        setUploadMessage({
          type: 'error',
          text: `Unsupported file type: ${file.name}. Please upload a supported source-code/text file.`,
        });
        return;
      }
    }

    setUploadSubmitting(true);
    setUploadMessage(null);

    try {
      const res = await submitLocalFiles(selectedFiles);
      setUploadMessage({
        type: 'success',
        text: res.message || 'Files uploaded successfully for static review inspection.',
      });

      const fileCount = res.fileCount || selectedFiles.length;
      const reviewId = res.reviewId;
      setSelectedFiles([]);

      if (reviewId) {
        startReviewProgress(fileCount, reviewId);
      } else if (onReviewCompleted) {
        onReviewCompleted();
      }
    } catch (err: any) {
      const errorMsg =
        err?.response?.data?.message || err?.message || 'Failed to upload files. Please try again.';
      setUploadMessage({ type: 'error', text: errorMsg });
    } finally {
      setUploadSubmitting(false);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="rounded-[8px] border border-[#1b3324] bg-[#0c1811] overflow-hidden shadow-sm">
      {/* Workspace Header */}
      <div className="border-b border-[#1b3324] bg-[#0e1c14] px-5 py-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="font-mono text-sm font-semibold tracking-wide text-[#EEF4EF] uppercase">
              Upload Files for Inspection
            </h2>
            <p className="mt-0.5 text-xs text-[#A5B8AA]">
              Submit local source files directly for multi-agent AST, syntax, security, and performance inspection.
            </p>
          </div>
        </div>
      </div>

      {/* Upload Zone */}
      <div className="p-6 space-y-5 w-full">
        {/* Drag and Drop Zone */}
        <div
          onClick={() => fileInputRef.current?.click()}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              fileInputRef.current?.click();
            }
          }}
          role="button"
          tabIndex={0}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`flex flex-col items-center justify-center rounded-[8px] border-2 border-dashed p-8 text-center transition-all cursor-pointer select-none focus:outline-none focus:ring-1 focus:ring-[#15803d] ${
            isDragging
              ? 'border-[#15803d] bg-[#15803d]/10'
              : 'border-[#1b3324] bg-[#07110a] hover:border-[#2a4e38] hover:bg-[#0c1811]/60'
          }`}
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-full border border-[#1b3324] bg-[#0c1811] text-[#A5B8AA] pointer-events-none">
            <Upload className="h-5 w-5 text-[#15803d]" />
          </div>
          <div className="mt-3 space-y-1 pointer-events-none">
            <p className="font-mono text-xs font-medium text-[#EEF4EF]">
              Drag and drop source files here, or{' '}
              <span className="text-[#15803d] underline font-semibold">
                browse
              </span>
            </p>
            <p className="text-[11px] text-[#6A8070]">
              Up to 5 files (Max 5MB per file, 15MB total). Supported: .java, .ts, .js, .py, .go, .cpp, etc.
            </p>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept={SUPPORTED_EXTENSIONS_ACCEPT}
            onChange={handleFileChange}
            className="hidden"
          />
        </div>

        {/* Selected Files List */}
        {selectedFiles.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between font-mono text-xs text-[#A5B8AA]">
              <span>Selected Files ({selectedFiles.length}/5)</span>
              <button
                type="button"
                onClick={() => setSelectedFiles([])}
                className="text-red-400 hover:underline text-[11px]"
              >
                Clear all
              </button>
            </div>
            <div className="divide-y divide-[#1b3324] rounded-[6px] border border-[#1b3324] bg-[#07110a]">
              {selectedFiles.map((file, idx) => (
                <div
                  key={`${file.name}-${idx}`}
                  className="flex items-center justify-between px-3.5 py-2 font-mono text-xs"
                >
                  <div className="flex items-center gap-2 text-[#EEF4EF] truncate">
                    <FileCode className="h-4 w-4 shrink-0 text-[#15803d]" />
                    <span className="truncate">{file.name}</span>
                    <span className="text-[11px] text-[#6A8070]">({formatFileSize(file.size)})</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveFile(idx)}
                    className="text-[#6A8070] hover:text-red-400 transition-colors p-1"
                    title="Remove file"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action Button */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={handleUploadSubmit}
            disabled={uploadSubmitting || selectedFiles.length === 0}
            className="inline-flex items-center gap-2 rounded-[6px] bg-[#15803d] px-5 py-2 font-mono text-xs font-medium text-white transition-colors hover:bg-[#166534] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {uploadSubmitting ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Submitting Files...</span>
              </>
            ) : (
              <span>Submit for Review</span>
            )}
          </button>
        </div>

        {/* Processing Upload Status Banner */}
        {isProcessingUpload && (
          <div className="rounded-[6px] border border-[#1b4d2e] bg-[#091f13]/90 backdrop-blur-sm p-4 space-y-2 font-mono text-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5 text-[#7AA983]">
                <Loader2 className="h-4 w-4 animate-spin text-emerald-400 shrink-0" />
                <span className="font-semibold text-[#EEF4EF]">Processing Review Request...</span>
              </div>
              <button
                type="button"
                onClick={() => setIsProcessingUpload(false)}
                className="text-[#6A8070] hover:text-[#EEF4EF] transition-colors p-1"
                aria-label="Dismiss banner"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            <p className="text-xs text-[#A5B8AA]">
              {reviewStage || 'Files dispatched for asynchronous multi-agent inspection.'}
            </p>
            <div className="flex items-center justify-between text-[11px] text-[#6A8070] pt-1">
              <span>Multi-agent invariant inspection &bull; Analyzing AST, syntax, security...</span>
            </div>
          </div>
        )}

        {/* Upload Complete Success Banner */}
        {isUploadComplete && (
          <div className="rounded-[6px] border border-[#1b4d2e] bg-[#091f13]/90 backdrop-blur-sm p-4 space-y-2 font-mono text-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5 text-emerald-400">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                <span className="font-semibold text-[#EEF4EF]">Code Review Completed!</span>
              </div>
              <button
                type="button"
                onClick={() => setIsUploadComplete(false)}
                className="text-[#6A8070] hover:text-[#EEF4EF] transition-colors p-1"
                aria-label="Dismiss banner"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            <p className="text-xs text-[#A5B8AA]">
              {reviewStage || 'Inspection complete. New findings and report are now available below.'}
            </p>
            <div className="flex items-center justify-between text-[11px] text-emerald-400/80 pt-1">
              <span>Review Audit Feed updated automatically &bull; Check entries below &darr;</span>
            </div>
          </div>
        )}

        {uploadMessage && (
          <div
            className={`flex items-start gap-2.5 rounded-[6px] border p-3 font-mono text-xs ${
              uploadMessage.type === 'success'
                ? 'border-[#1b4d2e] bg-[#091f13] text-[#7AA983]'
                : 'border-red-900/60 bg-red-950/40 text-red-300'
            }`}
          >
            {uploadMessage.type === 'success' ? (
              <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5 text-[#15803d]" />
            ) : (
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-red-400" />
            )}
            <span>{uploadMessage.text}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReviewWorkspace;
