/**
 * @file src/pages/RepositoryExplorerPage.tsx
 * @description Interactive Repository Workspace / Explorer for browsing and reviewing single files.
 * Features:
 * - Left column: File and folder tree hierarchy with search filter and folder toggles.
 * - Right column: Source code viewer with line numbers and "Review File" action.
 * - Single-file review: sends exactly ONE file to backend POST /repositories/:id/file-review.
 * - Deterministic polling via reviewId (QUEUED, RUNNING, COMPLETED, FAILED).
 * - Full inspection results preview upon completion.
 */

import React, { useEffect, useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Folder,
  FolderOpen,
  FileCode,
  ArrowLeft,
  RefreshCw,
  Play,
  CheckCircle2,
  AlertCircle,
  Loader2,
  FileText,
  Search,
  ChevronRight,
  ChevronDown,
  GitBranch,
} from 'lucide-react';
import {
  getRepositoryTreeApi,
  getRepositoryFileContentApi,
  triggerSingleFileReviewApi,
  getReviewDetails,
  getConnectedRepositoriesApi,
  type RepositoryNodeItem,
  type ReviewItem,
  type ConnectedRepoResponse,
} from '../api/apiClient';

interface TreeNode {
  path: string;
  name: string;
  nodeType: 'FILE' | 'FOLDER';
  children: TreeNode[];
  language?: string;
  sizeBytes?: number;
}

export const RepositoryExplorerPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const repoId = id ? parseInt(id, 10) : NaN;

  const [repoInfo, setRepoInfo] = useState<ConnectedRepoResponse | null>(null);
  const [nodes, setNodes] = useState<RepositoryNodeItem[]>([]);
  const [treeLoading, setTreeLoading] = useState<boolean>(true);
  const [treeError, setTreeError] = useState<string | null>(null);

  // Search filter
  const [filterText, setFilterText] = useState<string>('');
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());

  // Selected file & content
  const [selectedFilePath, setSelectedFilePath] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [fileLoading, setFileLoading] = useState<boolean>(false);
  const [fileError, setFileError] = useState<string | null>(null);

  // Review states
  const [reviewing, setReviewing] = useState<boolean>(false);
  const [activeReviewId, setActiveReviewId] = useState<number | null>(null);
  const [reviewStatus, setReviewStatus] = useState<string | null>(null);
  const [reviewDetails, setReviewDetails] = useState<ReviewItem | null>(null);
  const [reviewError, setReviewError] = useState<string | null>(null);

  // Fetch Repo info and Tree nodes
  useEffect(() => {
    if (isNaN(repoId)) return;

    let isMounted = true;
    setTreeLoading(true);
    setTreeError(null);

    // Fetch repository metadata
    getConnectedRepositoriesApi()
      .then((repos) => {
        if (!isMounted) return;
        const found = repos.find((r) => r.id === repoId);
        if (found) {
          setRepoInfo(found);
        }
      })
      .catch((err) => {
        console.warn('Could not fetch repository metadata:', err);
      });

    // Fetch tree
    getRepositoryTreeApi(repoId)
      .then((data) => {
        if (!isMounted) return;
        setNodes(data);
        // Automatically expand top-level folders
        const topFolders = new Set<string>();
        data.forEach((n) => {
          if (n.nodeType === 'FOLDER' && (!n.parentPath || !n.parentPath.includes('/'))) {
            topFolders.add(n.path);
          }
        });
        setExpandedFolders(topFolders);
      })
      .catch((err: any) => {
        if (!isMounted) return;
        const msg = err?.response?.data?.error || err?.message || 'Failed to load repository tree.';
        setTreeError(msg);
      })
      .finally(() => {
        if (isMounted) setTreeLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [repoId]);

  // Build hierarchical tree structure from flat nodes
  const rootTree = useMemo(() => {
    const map: { [path: string]: TreeNode } = {};
    const roots: TreeNode[] = [];

    // Filter nodes by search text if specified
    const searchLower = filterText.toLowerCase().trim();
    const filteredNodes = searchLower
      ? nodes.filter((n) => n.path.toLowerCase().includes(searchLower))
      : nodes;

    filteredNodes.forEach((node) => {
      map[node.path] = {
        path: node.path,
        name: node.name,
        nodeType: node.nodeType,
        children: [],
        language: node.language,
        sizeBytes: node.sizeBytes,
      };
    });

    filteredNodes.forEach((node) => {
      const treeNode = map[node.path];
      if (node.parentPath && map[node.parentPath]) {
        map[node.parentPath].children.push(treeNode);
      } else {
        roots.push(treeNode);
      }
    });

    // Sort folders first, then files alphabetically
    const sortTree = (items: TreeNode[]) => {
      items.sort((a, b) => {
        if (a.nodeType === b.nodeType) {
          return a.name.localeCompare(b.name);
        }
        return a.nodeType === 'FOLDER' ? -1 : 1;
      });
      items.forEach((item) => {
        if (item.children.length > 0) sortTree(item.children);
      });
    };

    sortTree(roots);
    return roots;
  }, [nodes, filterText]);

  // Select file handler
  const handleSelectFile = async (filePath: string) => {
    if (filePath === selectedFilePath) return;
    setSelectedFilePath(filePath);
    setFileContent(null);
    setFileLoading(true);
    setFileError(null);
    setReviewDetails(null);
    setReviewError(null);
    setReviewStatus(null);

    try {
      const data = await getRepositoryFileContentApi(repoId, filePath);
      setFileContent(data.content);
    } catch (err: any) {
      const msg = err?.response?.data?.error || err?.message || 'Failed to load file contents.';
      setFileError(msg);
    } finally {
      setFileLoading(false);
    }
  };

  const toggleFolder = (folderPath: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(folderPath)) {
        next.delete(folderPath);
      } else {
        next.add(folderPath);
      }
      return next;
    });
  };

  // Trigger Review for the selected single file
  const handleReviewFile = async () => {
    if (!selectedFilePath || reviewing) return;

    setReviewing(true);
    setReviewError(null);
    setReviewDetails(null);
    setReviewStatus('QUEUED');

    try {
      const res = await triggerSingleFileReviewApi(repoId, selectedFilePath);
      setActiveReviewId(res.reviewId);
      pollReviewStatus(res.reviewId);
    } catch (err: any) {
      const msg = err?.response?.data?.error || err?.message || 'Failed to submit file review.';
      setReviewError(msg);
      setReviewing(false);
      setReviewStatus('FAILED');
    }
  };

  // Deterministic review polling using exact reviewId
  const pollReviewStatus = (reviewId: number) => {
    let attempts = 0;
    const interval = setInterval(async () => {
      attempts++;
      try {
        const review = await getReviewDetails(reviewId);
        if (!review) return;

        setReviewStatus(review.status || 'RUNNING');

        if (review.status === 'COMPLETED') {
          clearInterval(interval);
          setReviewDetails(review);
          setReviewError(null);
          setReviewing(false);
        } else if (review.status === 'FAILED') {
          clearInterval(interval);
          setReviewDetails(null);
          setReviewing(false);
          setReviewError(review.aiComment || 'AI analysis encountered an error.');
        }
        // While review is PROCESSING or WAITING across rate limit windows, continue polling
      } catch (err: any) {
        console.warn('Polling review error:', err);
      }
    }, 2000);
  };

  // Recursive Tree Node Renderer
  const renderTreeNode = (node: TreeNode, depth: number = 0) => {
    const isFolder = node.nodeType === 'FOLDER';
    const isExpanded = expandedFolders.has(node.path);
    const isSelected = selectedFilePath === node.path;

    return (
      <div key={node.path} className="select-none">
        <div
          onClick={() => {
            if (isFolder) {
              toggleFolder(node.path);
            } else {
              handleSelectFile(node.path);
            }
          }}
          style={{ paddingLeft: `${depth * 14 + 10}px` }}
          className={`flex items-center gap-2 py-1.5 pr-3 text-xs font-mono cursor-pointer transition-colors ${
            isSelected
              ? 'bg-[#15803d]/30 text-emerald-300 font-semibold border-l-2 border-emerald-400'
              : 'text-[#A5B8AA] hover:bg-[#122519] hover:text-[#EEF4EF]'
          }`}
        >
          {isFolder ? (
            <>
              {isExpanded ? (
                <ChevronDown className="h-3.5 w-3.5 text-[#6A8070] shrink-0" />
              ) : (
                <ChevronRight className="h-3.5 w-3.5 text-[#6A8070] shrink-0" />
              )}
              {isExpanded ? (
                <FolderOpen className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
              ) : (
                <Folder className="h-3.5 w-3.5 text-[#15803d] shrink-0" />
              )}
            </>
          ) : (
            <>
              <span className="w-3.5" />
              <FileCode className={`h-3.5 w-3.5 shrink-0 ${isSelected ? 'text-emerald-300' : 'text-[#6A8070]'}`} />
            </>
          )}
          <span className="truncate">{node.name}</span>
        </div>

        {isFolder && isExpanded && node.children.length > 0 && (
          <div>
            {node.children.map((child) => renderTreeNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* 1. Header with Breadcrumbs & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#1b3324] pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2 font-mono text-xs text-[#6A8070]">
            <Link
              to="/repositories"
              className="inline-flex items-center gap-1 text-[#A5B8AA] hover:text-emerald-400 transition-colors"
            >
              <ArrowLeft className="h-3 w-3" />
              <span>Repositories</span>
            </Link>
            <span>/</span>
            <span className="text-emerald-300 font-medium">
              {repoInfo ? repoInfo.name : `Repository #${repoId}`}
            </span>
          </div>

          <h1 className="font-serif text-2xl font-normal text-[#EEF4EF] flex items-center gap-3">
            <span>{repoInfo?.fullName || 'Repository Explorer'}</span>
            {repoInfo?.defaultBranch && (
              <span className="inline-flex items-center gap-1 rounded-full bg-[#122519] border border-[#1b4d2e] px-2.5 py-0.5 font-mono text-[11px] text-emerald-300">
                <GitBranch className="h-3 w-3" />
                <span>{repoInfo.defaultBranch}</span>
              </span>
            )}
          </h1>
          <p className="font-sans text-xs text-[#A5B8AA]">
            Browse repository structure, select exactly ONE file, and run multi-agent AI code review.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              setTreeLoading(true);
              getRepositoryTreeApi(repoId)
                .then(setNodes)
                .finally(() => setTreeLoading(false));
            }}
            disabled={treeLoading}
            className="inline-flex items-center gap-1.5 rounded-[6px] border border-[#1b3324] bg-[#0c1811] px-3 py-1.5 font-mono text-xs text-[#A5B8AA] hover:text-[#EEF4EF] transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-3 w-3 ${treeLoading ? 'animate-spin text-emerald-400' : ''}`} />
            <span>Sync Tree</span>
          </button>
        </div>
      </div>

      {/* 2. Workspace Explorer Layout: Left Tree + Right Code View */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Repository Tree (4 cols) */}
        <div className="lg:col-span-4 rounded-[8px] border border-[#1b3324] bg-[#0c1811] overflow-hidden shadow-sm flex flex-col h-[650px]">
          {/* Tree Header & Filter */}
          <div className="p-3 border-b border-[#1b3324] bg-[#0e1c14] space-y-2">
            <div className="flex items-center justify-between font-mono text-xs">
              <span className="font-semibold uppercase tracking-wider text-[#EEF4EF]">Files & Folders</span>
              <span className="text-[#6A8070] text-[11px]">{nodes.length} nodes</span>
            </div>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-[#6A8070]" />
              <input
                type="text"
                value={filterText}
                onChange={(e) => setFilterText(e.target.value)}
                placeholder="Filter files..."
                className="w-full rounded-[4px] border border-[#1b3324] bg-[#07110a] pl-8 pr-3 py-1.5 font-mono text-xs text-[#EEF4EF] placeholder:text-[#415546] focus:border-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Tree Node List */}
          <div className="flex-1 overflow-y-auto py-2">
            {treeLoading ? (
              <div className="flex flex-col items-center justify-center h-full space-y-2 font-mono text-xs text-[#6A8070]">
                <Loader2 className="h-5 w-5 animate-spin text-emerald-400" />
                <span>Loading repository tree...</span>
              </div>
            ) : treeError ? (
              <div className="p-4 font-mono text-xs text-red-400 space-y-1">
                <div className="flex items-center gap-1.5 font-semibold">
                  <AlertCircle className="h-4 w-4" />
                  <span>Tree load failed</span>
                </div>
                <p className="text-[11px] text-red-300/80">{treeError}</p>
              </div>
            ) : rootTree.length === 0 ? (
              <div className="p-4 text-center font-mono text-xs text-[#6A8070]">
                No files found matching filter.
              </div>
            ) : (
              rootTree.map((item) => renderTreeNode(item, 0))
            )}
          </div>
        </div>

        {/* Right Column: Code Viewer & Review Actions (8 cols) */}
        <div className="lg:col-span-8 rounded-[8px] border border-[#1b3324] bg-[#0c1811] overflow-hidden shadow-sm flex flex-col h-[650px]">
          {/* Code Viewer Header */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 border-b border-[#1b3324] bg-[#0e1c14]">
            <div className="flex items-center gap-2 truncate font-mono text-xs">
              <FileCode className="h-4 w-4 text-emerald-400 shrink-0" />
              <span className="text-[#EEF4EF] font-medium truncate">
                {selectedFilePath || 'Select a file from the repository tree'}
              </span>
            </div>

            {selectedFilePath && (
              <button
                type="button"
                onClick={handleReviewFile}
                disabled={reviewing || fileLoading || !fileContent}
                className="inline-flex items-center gap-1.5 rounded-[6px] bg-[#15803d] px-4 py-1.5 font-mono text-xs font-semibold text-white transition-all hover:bg-[#166534] disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_12px_rgba(21,128,61,0.3)]"
              >
                {reviewing ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Reviewing ({reviewStatus || 'QUEUED'})...</span>
                  </>
                ) : (
                  <>
                    <Play className="h-3.5 w-3.5 fill-current" />
                    <span>Review File</span>
                  </>
                )}
              </button>
            )}
          </div>

          {/* Active Review Status Banner */}
          {reviewing && (
            <div className="border-b border-[#1b4d2e] bg-[#091f13] p-3 font-mono text-xs text-emerald-300 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-emerald-400" />
                <span>
                  Processing single-file AI review {activeReviewId ? `#${activeReviewId}` : ''} ({reviewStatus || 'RUNNING'})...
                </span>
              </div>
              <span className="text-[11px] text-[#A5B8AA]">
                Multi-agent AST & security inspection
              </span>
            </div>
          )}

          {/* Review Error Banner */}
          {reviewError && (
            <div className="border-b border-red-900/60 bg-red-950/40 p-3 font-mono text-xs text-red-300 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
              <span>Review Failed: {reviewError}</span>
            </div>
          )}

          {/* Review Completed Results Summary Banner */}
          {reviewDetails && (
            <div className="border-b border-[#1b4d2e] bg-[#091f13] p-4 font-mono text-xs space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-emerald-400">
                  <CheckCircle2 className="h-4 w-4" />
                  <span className="font-semibold text-[#EEF4EF]">Review Completed!</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-emerald-300">
                    Quality: {reviewDetails.qualityRating}/10
                  </span>
                  <span className="text-[#A5B8AA]">
                    Severity: {reviewDetails.severity}
                  </span>
                  <Link
                    to={`/reviews/${reviewDetails.id}`}
                    className="text-[#15803d] hover:text-emerald-300 underline text-[11px]"
                  >
                    View Details &rarr;
                  </Link>
                </div>
              </div>
              <p className="text-[11px] text-[#A5B8AA]">
                Saved to PostgreSQL and updated in Review Audit Feed.
              </p>
            </div>
          )}

          {/* Code Body / Empty State */}
          <div className="flex-1 overflow-auto bg-[#07110a] p-4 font-mono text-xs leading-relaxed text-[#D1E0D4]">
            {fileLoading ? (
              <div className="flex flex-col items-center justify-center h-full space-y-2 text-[#6A8070]">
                <Loader2 className="h-5 w-5 animate-spin text-emerald-400" />
                <span>Fetching file source code from GitHub...</span>
              </div>
            ) : fileError ? (
              <div className="flex flex-col items-center justify-center h-full space-y-2 text-red-400">
                <AlertCircle className="h-5 w-5" />
                <span>{fileError}</span>
              </div>
            ) : fileContent !== null ? (
              <pre className="overflow-x-auto whitespace-pre font-mono">
                {fileContent}
              </pre>
            ) : (
              <div className="flex flex-col items-center justify-center h-full space-y-3 text-[#6A8070]">
                <FileText className="h-8 w-8 text-[#1b4d2e]" />
                <p>Select any file on the left tree to inspect its code and run AI review.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RepositoryExplorerPage;
