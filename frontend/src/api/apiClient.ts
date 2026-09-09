/**
 * @file src/api/apiClient.ts
 * @description Centralized Axios instance for communicating with the Spring Boot backend (/api/v1).
 * Features:
 * - Request interceptor: attaches Bearer token from localStorage (pcr_auth_token or pcr_token).
 * - Response interceptor: automatically handles 401 Unauthorized by clearing auth and redirecting to '/'.
 */

import axios, { AxiosError } from 'axios';
import type { InternalAxiosRequestConfig } from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || (typeof window !== 'undefined' ? `${window.location.origin}/api/v1` : 'http://localhost:8080/api/v1');

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 20000,
});

// Request Interceptor: Attach Auth Token
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('pcr_token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

// Response Interceptor: Handle 401 Unauthorized
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response && error.response.status === 401) {
      // Clear all auth storage tokens
      localStorage.removeItem('pcr_token');
      localStorage.removeItem('pcr_user_email');
      
      // Redirect to landing page if not already there
      if (window.location.pathname !== '/') {
        window.location.href = '/';
      }
    }
    return Promise.reject(error);
  }
);

export interface ReviewSubmissionResponse {
  success: boolean;
  message: string;
  prUrl?: string;
  fileCount?: number;
  reviewId?: number;
}

/**
 * Submit a GitHub Pull Request URL for code review.
 * Target: POST /api/v1/reviews/github
 */
export async function submitGithubPr(prUrl: string): Promise<ReviewSubmissionResponse> {
  const response = await apiClient.post<ReviewSubmissionResponse>('/reviews/github', { prUrl });
  return response.data;
}

/**
 * Submit local source files for code review using FormData.
 * Target: POST /api/v1/reviews/upload (Content-Type: multipart/form-data)
 */
export async function submitLocalFiles(files: File[]): Promise<ReviewSubmissionResponse> {
  const formData = new FormData();
  files.forEach((file) => {
    formData.append('files', file);
  });

  const response = await apiClient.post<ReviewSubmissionResponse>('/reviews/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
}

export interface ReviewItem {
  id: number;
  repositoryName: string;
  pullRequestNumber: number | null;
  codeDiff?: string;
  aiComment?: string;
  severity?: string;
  qualityRating?: number;
  status?: string;
  createdAt: string;
  userReviewNumber?: number;
}

/**
 * Fetch latest review history from Spring Boot backend.
 * Target: GET /api/v1/reviews/history
 */
export async function getReviewHistory(): Promise<ReviewItem[]> {
  const response = await apiClient.get<ReviewItem[]>('/reviews/history');
  return response.data;
}

/**
 * Fetch a single review by its ID.
 * Target: GET /api/v1/reviews/:id
 */
export async function getReviewDetails(id: string | number): Promise<ReviewItem> {
  const response = await apiClient.get<ReviewItem>(`/reviews/${id}`);
  return response.data;
}

export interface AnalyticsSummary {
  totalReviews: number;
  averageQualityRating: number;
  criticalIssuesCount: number;
  totalIssuesFound: number;
  meanLatencyMs: number;
  highIssuesCount: number;
  moderateIssuesCount: number;
  lowIssuesCount: number;
  goodIssuesCount: number;
}

/**
 * Fetch aggregated analytics summary.
 * Target: GET /api/v1/analytics/summary
 */
export async function getAnalyticsSummary(): Promise<AnalyticsSummary> {
  const response = await apiClient.get<AnalyticsSummary>('/analytics/summary');
  return response.data;
}

export interface PlatformStatsResponse {
  totalUsers: number;
  totalReviews: number;
  realUsers?: number;
  realReviews?: number;
}

/**
 * Fetch boosted platform statistics.
 * Target: GET /api/v1/analytics/platform-stats
 */
export async function getPlatformStatsApi(): Promise<PlatformStatsResponse> {
  const response = await apiClient.get<PlatformStatsResponse>('/analytics/platform-stats');
  return response.data;
}

export interface ConnectedRepoResponse {
  id: number;
  userId: string;
  fullName: string;
  name: string;
  defaultBranch: string;
  latestCommitSha: string;
  lastAnalyzedCommitSha?: string;
  isPrivate: boolean;
  language: string;
  htmlUrl: string;
  status: string;
}

export interface ReviewJobStatusResponse {
  jobId: string;
  repositoryId: number;
  reviewType: 'BACKGROUND' | 'USER_REQUESTED';
  priority: 'HIGH' | 'NORMAL' | 'LOW';
  status: 'QUEUED' | 'DISCOVERING' | 'RUNNING' | 'WAITING' | 'PAUSED' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  currentFile?: string;
  currentFolder?: string;
  completedFiles: number;
  remainingFiles: number;
  totalFiles: number;
  progressPercentage: number;
  nextRunAt?: string;
  finalReport?: string;
  errorMessage?: string;
}

export async function connectRepositoryApi(data: {
  fullName: string;
  name: string;
  defaultBranch?: string;
  isPrivate?: boolean;
  language?: string;
  htmlUrl?: string;
}): Promise<{ success: boolean; repository: ConnectedRepoResponse; backgroundJobId?: string }> {
  const response = await apiClient.post('/repositories/connect', data);
  return response.data;
}

export async function disconnectRepositoryApi(fullName: string): Promise<{ success: boolean }> {
  const response = await apiClient.post(`/repositories/disconnect?fullName=${encodeURIComponent(fullName)}`);
  return response.data;
}

export async function getConnectedRepositoriesApi(): Promise<ConnectedRepoResponse[]> {
  const response = await apiClient.get<ConnectedRepoResponse[]>('/repositories/connected');
  return response.data;
}

export async function triggerUserReviewApi(repoId: number): Promise<{ success: boolean; jobId: string; totalFiles: number; message: string }> {
  const response = await apiClient.post(`/repositories/${repoId}/review`);
  return response.data;
}

export async function getReviewJobStatusApi(jobId: string): Promise<ReviewJobStatusResponse> {
  const response = await apiClient.get<ReviewJobStatusResponse>(`/repositories/jobs/${jobId}/status`);
  return response.data;
}

export interface RepositoryNodeItem {
  id: number;
  repositoryId: number;
  path: string;
  name: string;
  nodeType: 'FILE' | 'FOLDER';
  parentPath?: string;
  fileHash?: string;
  language?: string;
  sizeBytes?: number;
}

export interface FileContentResponse {
  filePath: string;
  content: string;
  language?: string;
}

export interface SingleFileReviewResponse {
  success: boolean;
  reviewId: number;
  filePath: string;
  repositoryName: string;
  message: string;
}

export async function getRepositoryTreeApi(repoId: number): Promise<RepositoryNodeItem[]> {
  const response = await apiClient.get<RepositoryNodeItem[]>(`/repositories/${repoId}/tree`);
  return response.data;
}

export async function getRepositoryFileContentApi(repoId: number, filePath: string): Promise<FileContentResponse> {
  const response = await apiClient.get<FileContentResponse>(`/repositories/${repoId}/file-content`, {
    params: { filePath },
  });
  return response.data;
}

export async function triggerSingleFileReviewApi(repoId: number, filePath: string): Promise<SingleFileReviewResponse> {
  const response = await apiClient.post<SingleFileReviewResponse>(`/repositories/${repoId}/file-review`, {
    filePath,
  });
  return response.data;
}

export default apiClient;



