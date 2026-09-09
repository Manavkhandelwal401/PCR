/**
 * @file src/pages/RepositoriesPage.tsx
 * @description Dual-container GitHub Repository Manager.
 * 1. "Connected Repositories" tab (default): Shows active connected repos ready for review.
 *    If none connected or GitHub disconnected: shows "Connect with GitHub" OR "Install GitHub App" banner.
 * 2. "All Repositories" tab: Shows profile repositories with public/private status and "Connect & Review" buttons.
 *    Available once GitHub profile is connected.
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  FolderGit2,
  CheckCircle2,
  ExternalLink,
  Play,
  Search,
  RefreshCw,
  Star,
  GitBranch,
  Lock,
  Globe,
  Plus,
  Radio,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const GITHUB_APP_URL = 'https://github.com/apps/phantom-code-reviewer';
// These values must match the OAuth app configuration.  Production builds set
// VITE_GITHUB_OAUTH_*; the defaults keep the checked-out app usable locally.
const GITHUB_OAUTH_CLIENT_ID = import.meta.env.VITE_GITHUB_OAUTH_CLIENT_ID || 'Ov23liz7VeylLeQwQIjk';
const GITHUB_OAUTH_REDIRECT_URI = import.meta.env.VITE_GITHUB_OAUTH_REDIRECT_URI || 
  (typeof window !== 'undefined' ? `${window.location.origin}/repositories` : 'http://localhost:5173/repositories');

// Official GitHub Mark SVG
const GithubIcon: React.FC<{ className?: string }> = ({ className = 'h-4 w-4' }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"


    fill="currentColor"
    aria-hidden="true"
  >
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
    />
  </svg>
);

interface GithubRepo {
  id: number | string;
  name: string;
  fullName: string;
  description: string;
  defaultBranch: string;
  language: string;
  stars: number;
  isPrivate: boolean;
  htmlUrl: string;
  connected: boolean;
  connectedRepositoryId?: number;
}

interface GithubProfile {
  username: string;
  name: string;
  avatarUrl: string;
  publicReposCount: number;
  totalReposCount: number;
  hasPrivateAccess: boolean;
  connectedAt: string;
}

export const RepositoriesPage: React.FC = () => {
  const navigate = useNavigate();

  // Namespace all GitHub persistence to the currently logged-in user to prevent multi-tenant data leaks
  const userEmail = localStorage.getItem('pcr_user_email') || 'anonymous';
  const userKey = userEmail.toLowerCase().replace(/[^a-z0-9]/g, '_');

  const GH_CONNECTED_KEY = `pcr_gh_connected_${userKey}`;
  const GH_PROFILE_KEY = `pcr_gh_profile_${userKey}`;
  const GH_REPOS_KEY = `pcr_gh_repos_${userKey}`;
  const GH_USER_KEY = `pcr_user_gh_${userKey}`;

  // Active view tab: 'connected' (default) vs 'all'
  const [activeTab, setActiveTab] = useState<'connected' | 'all'>('connected');

  // GitHub connection state (isolated per user in localStorage)
  const [isGithubConnected, setIsGithubConnected] = useState<boolean>(() => {
    return localStorage.getItem(GH_CONNECTED_KEY) === 'true';
  });

  const [ghProfile, setGhProfile] = useState<GithubProfile | null>(() => {
    const saved = localStorage.getItem(GH_PROFILE_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        localStorage.removeItem(GH_PROFILE_KEY);
      }
    }
    return null;
  });

  const [isFetchingGithub, setIsFetchingGithub] = useState<boolean>(false);
  const [connectError, setConnectError] = useState<string | null>(null);

  // Repositories list - New accounts start with 0 repositories; all initial repos start with connected: false
  const [repos, setRepos] = useState<GithubRepo[]>(() => {
    const saved = localStorage.getItem(GH_REPOS_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // fallback
      }
    }
    return [];
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [connectingRepoId, setConnectingRepoId] = useState<string | number | null>(null);
  const oauthExchangedRef = useRef<boolean>(false);

  // Function to initiate secure OAuth with CSRF state parameter & explicit re-consent
  const initiateGithubOAuth = async () => {
    try {
      const { apiClient } = await import('../api/apiClient');
      const res = await apiClient.get('/auth/github/state');
      if (!res.data?.state) {
        throw new Error('Server did not return a valid signed OAuth state.');
      }
      const state = res.data.state;
      localStorage.setItem('pcr_oauth_state', state);
      sessionStorage.setItem('pcr_oauth_state', state);
      // prompt=consent forces GitHub to re-render authorization screen, preventing silent/auto-login into previous user's GitHub session
      const authUrl = `https://github.com/login/oauth/authorize?client_id=${GITHUB_OAUTH_CLIENT_ID}&redirect_uri=${encodeURIComponent(GITHUB_OAUTH_REDIRECT_URI)}&scope=read:user,repo&state=${encodeURIComponent(state)}&prompt=select_account`;
      window.location.href = authUrl;
    } catch (e: any) {
      console.error('Failed to obtain server-signed OAuth state:', e);
      setConnectError('Unable to initiate secure GitHub OAuth. Please make sure you are signed in and try again.');
    }
  };

  // Sync to user-namespaced local storage whenever repos list updates
  useEffect(() => {
    if (userEmail && userEmail !== 'anonymous') {
      localStorage.setItem(GH_REPOS_KEY, JSON.stringify(repos));
    }
  }, [repos, GH_REPOS_KEY, userEmail]);

  // Connected repositories subset
  const connectedRepos = useMemo(() => {
    return repos.filter((r) => r.connected);
  }, [repos]);

  // Filtered list based on active tab & search
  const displayedRepos = useMemo(() => {
    const list = activeTab === 'connected' ? connectedRepos : repos;
    if (!searchQuery.trim()) return list;

    const query = searchQuery.toLowerCase();
    return list.filter(
      (r) =>
        r.name.toLowerCase().includes(query) ||
        r.description.toLowerCase().includes(query) ||
        (r.language && r.language.toLowerCase().includes(query))
    );
  }, [activeTab, connectedRepos, repos, searchQuery]);

  // Listen to incoming GitHub Direct OAuth Callback code & validate CSRF state
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const returnedState = urlParams.get('state');
    const errorParam = urlParams.get('error_description') || urlParams.get('error');

    if (errorParam) {
      setConnectError(`GitHub OAuth Error: ${errorParam}`);
      window.history.replaceState({}, document.title, window.location.pathname);
      return;
    }

    if (code) {
      if (oauthExchangedRef.current) {
        return;
      }

      // GitHub authorization codes are single-use. React StrictMode can replay
      // effects in development, so claim this code in session storage before
      // making the request. This also protects against an accidental refresh
      // while the exchange is in progress.
      const exchangedCodeKey = 'pcr_oauth_exchanged_code';
      if (sessionStorage.getItem(exchangedCodeKey) === code) {
        window.history.replaceState({}, document.title, window.location.pathname);
        return;
      }
      sessionStorage.setItem(exchangedCodeKey, code);
      oauthExchangedRef.current = true;

      // 1. Validate the OAuth state parameter.
      // The backend cryptographically validates the signed state JWT, but we also check local storage if present.
      const expectedState = sessionStorage.getItem('pcr_oauth_state') || localStorage.getItem('pcr_oauth_state');
      if (expectedState && returnedState && expectedState !== returnedState) {
        setConnectError('OAuth security verification failed. Please try connecting again.');
        localStorage.removeItem('pcr_oauth_state');
        sessionStorage.removeItem('pcr_oauth_state');
        window.history.replaceState({}, document.title, window.location.pathname);
        return;
      }

      // Remove the short-lived authorization code from the address bar before
      // the network call, so it cannot be replayed by a page reload.
      window.history.replaceState({}, document.title, window.location.pathname);

      setIsFetchingGithub(true);
      setConnectError(null);

      // 2. Call backend to securely exchange OAuth code and associate token with user
      import('../api/apiClient').then(({ apiClient }) => {
        return apiClient.post('/auth/github/callback', {
          code,
          state: returnedState,
        });
      })
        .then((response) => {
          const data = response.data;
          if (data && data.user) {
            const userData = data.user;
            const hasPrivateScope = Boolean(data.hasPrivateAccess);
            const totalCount = (userData.public_repos || 0) + (userData.total_private_repos || 0);

            const profileData: GithubProfile = {
              username: userData.login,
              name: userData.name || userData.login,
              avatarUrl: userData.avatar_url || `https://github.com/${userData.login}.png`,
              publicReposCount: userData.public_repos || 0,
              totalReposCount: totalCount > 0 ? totalCount : (data.repositories?.length || 0),
              hasPrivateAccess: hasPrivateScope,
              connectedAt: new Date().toLocaleDateString(),
            };

            let repoList: GithubRepo[] = [];
            if (Array.isArray(data.repositories)) {
              repoList = data.repositories.map((r: any, idx: number) => ({
                id: r.id || idx,
                name: r.name,
                fullName: r.full_name,
                description: r.description || 'Repository authorized via GitHub account.',
                defaultBranch: r.default_branch || 'main',
                language: r.language || 'Code',
                stars: r.stargazers_count || 0,
                isPrivate: r.private || false,
                htmlUrl: r.html_url,
                connected: false,
              }));
            }

            // If this was a 1-click GitHub login/signup flow, save JWT session
            const authedEmail = (data.email || userData.email || userEmail || 'user').toLowerCase();
            const authedKey = authedEmail.replace(/[^a-z0-9]/g, '_');

            if (data.token) {
              localStorage.setItem('pcr_token', data.token);
              localStorage.setItem('pcr_user_email', authedEmail);
              if (data.name) localStorage.setItem('pcr_user_name', data.name);
              if (data.username) localStorage.setItem('pcr_user_username', data.username);
            }

            setGhProfile(profileData);
            setRepos(repoList);
            setIsGithubConnected(true);
            setActiveTab('all');

            localStorage.setItem(`pcr_gh_connected_${authedKey}`, 'true');
            localStorage.setItem(`pcr_gh_profile_${authedKey}`, JSON.stringify(profileData));
            localStorage.setItem(`pcr_gh_repos_${authedKey}`, JSON.stringify(repoList));
            localStorage.setItem(`pcr_user_gh_${authedKey}`, userData.login);

            // If user initiated OAuth from the sign-in modal, redirect them smoothly to dashboard
            const authRedirect = sessionStorage.getItem('pcr_auth_redirect');
            if (authRedirect === 'dashboard') {
              sessionStorage.removeItem('pcr_auth_redirect');
              navigate('/dashboard');
              return;
            }
          } else {
            throw new Error('Invalid response received from GitHub authorization exchange.');
          }
        })
        .catch((err) => {
          console.error('Backend OAuth endpoint error:', err);
          const detail = err.response?.data?.error || err.response?.data?.message || err.message;
          setConnectError(detail || 'Error completing GitHub authorization. Please try again.');
          setIsGithubConnected(false);
          // A failed request needs a fresh GitHub authorization code on retry.
          sessionStorage.removeItem(exchangedCodeKey);
        })
        .finally(() => {
          setIsFetchingGithub(false);
          localStorage.removeItem('pcr_oauth_state');
          sessionStorage.removeItem('pcr_oauth_state');
        });
    }
  }, [GH_CONNECTED_KEY, GH_PROFILE_KEY, GH_REPOS_KEY, GH_USER_KEY]);

  // Handler: Disconnect GitHub and thoroughly wipe all artifacts and tokens for this user
  const handleDisconnectGithub = () => {
    setIsGithubConnected(false);
    setGhProfile(null);
    setRepos([]);
    localStorage.removeItem(GH_CONNECTED_KEY);
    localStorage.removeItem(GH_PROFILE_KEY);
    localStorage.removeItem(GH_REPOS_KEY);
    localStorage.removeItem(GH_USER_KEY);
    sessionStorage.removeItem('pcr_oauth_state');
    sessionStorage.removeItem('pcr_oauth_exchanged_code');
    setActiveTab('connected');

    // Notify backend to purge persisted GitHub access token for this user
    import('../api/apiClient').then(({ apiClient }) => {
      apiClient.post('/auth/github/disconnect').catch((err) => {
        console.warn('Notice: Backend GitHub token purge failed or completed:', err);
      });
    });
  };

  // Sync connected repositories & verify connection with backend database on mount
  useEffect(() => {
    if (userEmail && userEmail !== 'anonymous') {
      import('../services/authService').then(({ authService }) => {
        authService.checkAuth().then((authData) => {
          if (authData.authenticated && authData.githubConnected === false) {
            setIsGithubConnected(false);
            setGhProfile(null);
            setRepos([]);
            localStorage.removeItem(GH_CONNECTED_KEY);
            localStorage.removeItem(GH_PROFILE_KEY);
            localStorage.removeItem(GH_REPOS_KEY);
            localStorage.removeItem(GH_USER_KEY);
          }
        });
      });

      import('../api/apiClient').then(({ getConnectedRepositoriesApi }) => {
        getConnectedRepositoriesApi()
          .then((backendConnected) => {
            // Backend is the single source of truth for connected status and database ID
            if (backendConnected && backendConnected.length > 0) {
              const connectedMap = new Map(backendConnected.map((b) => [b.fullName.toLowerCase(), b.id]));
              setRepos((prev) =>
                prev.map((r) => {
                  const dbId = connectedMap.get(r.fullName.toLowerCase());
                  return {
                    ...r,
                    connected: dbId !== undefined,
                    connectedRepositoryId: dbId !== undefined ? dbId : undefined,
                  };
                })
              );
            } else {
              setRepos((prev) => prev.map((r) => ({ ...r, connected: false, connectedRepositoryId: undefined })));
            }
          })
          .catch((err) => console.log('Notice: Could not load backend connected repos yet:', err));
      });
    }
  }, [userEmail, GH_CONNECTED_KEY, GH_PROFILE_KEY, GH_REPOS_KEY, GH_USER_KEY]);

  // Handler: Connect a single repository to active connected list and trigger background intelligence
  const handleConnectRepo = async (repo: GithubRepo) => {
    setConnectingRepoId(repo.id);
    setConnectError(null);
    try {
      const { connectRepositoryApi } = await import('../api/apiClient');
      const res = await connectRepositoryApi({
        fullName: repo.fullName,
        name: repo.name,
        defaultBranch: repo.defaultBranch,
        isPrivate: repo.isPrivate,
        language: repo.language,
        htmlUrl: repo.htmlUrl,
      });

      const dbId = res?.repository?.id;
      setRepos((prev) =>
        prev.map((r) => (r.id === repo.id ? { ...r, connected: true, connectedRepositoryId: dbId } : r))
      );
    } catch (err: any) {
      console.error('Failed to connect repo via backend:', err);
      const msg = err?.response?.data?.error || err?.message || 'Failed to connect repository on server. Please try again.';
      setConnectError(`Connection failed for ${repo.name}: ${msg}`);
      // Do NOT optimistically or fallback mark connected: true when backend failed!
    } finally {
      setConnectingRepoId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Page Header with GitHub Profile Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#1b3324] pb-5">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="font-serif text-3xl font-normal text-[#EEF4EF]">
              {activeTab === 'connected' ? 'Connected Repositories' : 'All Repositories'}
            </h1>
            {isGithubConnected && ghProfile && (
              <span className="flex items-center gap-1.5 rounded-full bg-[#122519] border border-[#1b4d2e] px-2.5 py-0.5 font-mono text-xs text-emerald-300">
                <GithubIcon className="h-3 w-3" />
                <span>@{ghProfile.username}</span>
              </span>
            )}
          </div>
          <p className="mt-1 font-sans text-xs text-[#A5B8AA]">
            {activeTab === 'connected'
              ? 'Automated code inspection active on connected repositories.'
              : 'Browse all repositories in your GitHub account and connect them for multi-agent evaluation.'}
          </p>
        </div>

        {/* Tab Switcher: Containers for 'Connected Repositories' & 'All Repositories' */}
        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-[6px] border border-[#1b3324] bg-[#0c1811] p-1 font-mono text-xs">
            <button
              type="button"
              onClick={() => setActiveTab('connected')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[4px] transition-colors ${activeTab === 'connected'
                ? 'bg-[#15803d] text-white font-medium shadow-sm'
                : 'text-[#6A8070] hover:text-[#EEF4EF]'
                }`}
            >
              <Radio className="h-3 w-3" />
              <span>Connected Repositories ({connectedRepos.length})</span>
            </button>

            {/* 'All Repositories' Tab only accessible/active when GitHub is connected */}
            {isGithubConnected && (
              <button
                type="button"
                onClick={() => setActiveTab('all')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[4px] transition-colors ${activeTab === 'all'
                  ? 'bg-[#15803d] text-white font-medium shadow-sm'
                  : 'text-[#6A8070] hover:text-[#EEF4EF]'
                  }`}
              >
                <FolderGit2 className="h-3 w-3" />
                <span>All Repositories ({repos.length})</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* OAuth Sync Indicator / Error Alert */}
      {isFetchingGithub && (
        <div className="flex items-center gap-3 rounded-[8px] border border-emerald-500/40 bg-emerald-950/40 p-4 text-xs font-mono text-emerald-300">
          <RefreshCw className="h-4 w-4 animate-spin text-emerald-400" />
          <span>Connecting with official GitHub OAuth and fetching authorized repositories...</span>
        </div>
      )}

      {connectError && (
        <div className="flex items-center justify-between gap-3 rounded-[8px] border border-red-800/60 bg-red-950/40 p-4 text-xs font-mono text-red-300">
          <span>{connectError}</span>
          <button
            type="button"
            onClick={() => setConnectError(null)}
            className="text-red-400 hover:text-white"
          >
            &times;
          </button>
        </div>
      )}

      {/* 2. Banner: Only show when GitHub account is NOT connected */}
      {!isGithubConnected && (
        <div className="rounded-[10px] border border-[#1b4d2e]/80 bg-gradient-to-r from-[#091f13]/90 via-[#0c2417]/80 to-[#07150d]/90 p-6 shadow-lg">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
            <div className="space-y-2 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 rounded-full bg-[#122519] border border-[#1b4d2e] px-3 py-1 text-xs font-mono text-emerald-300">
                <GithubIcon className="h-3.5 w-3.5" />
                <span>GitHub Integration</span>
              </div>
              <h3 className="font-serif text-xl font-medium text-[#EEF4EF]">
                Connect your GitHub or Install PCR On GitHub
              </h3>
              <p className="text-xs text-[#A5B8AA] max-w-2xl leading-relaxed">
                Connect your GitHub account to automatically fetch your repositories, inspect them, and trigger multi-agent
                automated code reviews whenever pull requests are opened or files are updated.
              </p>
            </div>

            {/* Action Buttons: Official Direct GitHub OAuth Authorization */}
            <div className="flex flex-col sm:flex-row items-center gap-3 shrink-0">
              {/* Option 1: Official GitHub OAuth Direct Authorization with CSRF state */}
              <button
                type="button"
                onClick={initiateGithubOAuth}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-[6px] bg-[#15803d] px-5 py-2.5 font-mono text-xs font-semibold text-white shadow-md hover:bg-[#166534] transition-all hover:shadow-[0_0_15px_rgba(21,128,61,0.4)]"
              >
                <GithubIcon className="h-4 w-4" />
                <span>Connect To GitHub</span>
              </button>

              {/* OR divider */}
              <span className="font-mono text-xs text-[#52705a] font-bold px-1 uppercase tracking-wider">
                OR
              </span>

              {/* Option 2: Install GitHub App */}
              <a
                href={GITHUB_APP_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-[6px] border border-[#22c55e]/40 bg-[#0c1811] px-5 py-2.5 font-mono text-xs font-semibold text-emerald-300 hover:bg-[#15803d]/20 hover:border-[#22c55e] transition-all shadow-sm"
              >
                <ExternalLink className="h-4 w-4 text-emerald-400" />
                <span>Install GitHub App</span>
              </a>
            </div>
          </div>
        </div>
      )}

      {/* 3. Connected GitHub Profile Stats strip (when connected) */}
      {isGithubConnected && ghProfile && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-[8px] border border-[#1b3324] bg-[#0c1811] px-5 py-3 text-xs font-mono">
          <div className="flex items-center gap-3">
            <img
              src={ghProfile.avatarUrl}
              alt={ghProfile.username}
              className="h-8 w-8 rounded-full border border-[#1b4d2e] bg-[#122519]"
            />
            <div>
              <span className="font-semibold text-[#EEF4EF]">{ghProfile.name}</span>
              <span className="text-[#6A8070] ml-2">(@{ghProfile.username})</span>
              <div className="text-[11px] text-[#A5B8AA]">
                {ghProfile.totalReposCount} total repositories • {ghProfile.publicReposCount} public
                {ghProfile.hasPrivateAccess && ' • Private repo access granted'}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={initiateGithubOAuth}
              className="inline-flex items-center gap-1.5 rounded-[5px] border border-[#1b3324] bg-[#122519] px-2.5 py-1 text-[11px] text-[#A5B8AA] hover:text-[#EEF4EF] transition-colors"
            >
              <RefreshCw className="h-3 w-3" />
              <span>Sync Repos</span>
            </button>
            <button
              type="button"
              onClick={handleDisconnectGithub}
              className="text-[11px] text-red-400/80 hover:text-red-300 transition-colors px-2 py-1"
            >
              Disconnect
            </button>
          </div>
        </div>
      )}

      {/* 4. Filter & Search Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Search input */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#6A8070]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={
              activeTab === 'connected'
                ? 'Filter connected repositories...'
                : 'Search repositories across account...'
            }
            className="w-full rounded-[6px] border border-[#1b3324] bg-[#0c1811] pl-10 pr-4 py-2 font-mono text-xs text-[#EEF4EF] placeholder:text-[#415546] focus:border-[#15803d] focus:outline-none transition-colors"
          />
        </div>

        {/* Tab Count & Info */}
        <div className="flex items-center gap-2 font-mono text-xs text-[#6A8070]">
          <span>
            Showing <strong className="text-emerald-400">{displayedRepos.length}</strong> of{' '}
            <strong className="text-[#EEF4EF]">
              {activeTab === 'connected' ? connectedRepos.length : repos.length}
            </strong>{' '}
            repositories
          </span>
        </div>
      </div>

      {/* 5. Repositories Grid / Card List */}
      <div className="space-y-3">
        {displayedRepos.length === 0 ? (
          <div className="rounded-[8px] border border-dashed border-[#1b3324] bg-[#0c1811]/50 p-12 text-center font-mono text-xs text-[#6A8070] space-y-2">
            <FolderGit2 className="h-8 w-8 mx-auto text-[#415546]" />
            <p>
              {searchQuery.trim() === ''
                ? activeTab === 'connected'
                  ? 'No repositories connected yet. Click "All Repositories" or connect via GitHub above.'
                  : 'No repositories loaded.'
                : `No repositories found matching "${searchQuery}".`}
            </p>
            {activeTab === 'connected' && isGithubConnected && (
              <button
                type="button"
                onClick={() => setActiveTab('all')}
                className="inline-flex items-center gap-1.5 text-emerald-400 hover:text-emerald-300 font-semibold pt-1"
              >
                <span>Browse All Repositories to Connect &rarr;</span>
              </button>
            )}
          </div>
        ) : (
          displayedRepos.map((repo) => {
            const isPending = connectingRepoId === repo.id;

            return (
              <div
                key={repo.id}
                className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-[8px] border p-4 transition-all duration-200 ${repo.connected
                  ? 'border-[#1b3324] bg-[#0c1811] hover:border-[#22c55e]/40'
                  : 'border-[#1b3324]/70 bg-[#09140d]/80 hover:border-[#2a4e38]'
                  }`}
              >
                {/* Left: Repo Identity */}
                <div className="flex items-start gap-3.5 min-w-0">
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[6px] border ${repo.connected
                      ? 'border-[#1b4d2e] bg-[#0d2215] text-emerald-400'
                      : 'border-[#1b3324] bg-[#122519] text-[#7a9682]'
                      }`}
                  >
                    <FolderGit2 className="h-5 w-5" />
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="font-mono text-xs font-semibold text-[#EEF4EF] truncate">
                        {repo.fullName}
                      </span>

                      {/* Public / Private Icon (borderless, same color) */}
                      {repo.isPrivate ? (
                        <span title="Private repository" className="inline-flex items-center text-[#7a9682] hover:text-[#EEF4EF] transition-colors">
                          <Lock className="h-3.5 w-3.5" />
                        </span>
                      ) : (
                        <span title="Public repository" className="inline-flex items-center text-[#7a9682] hover:text-[#EEF4EF] transition-colors">
                          <Globe className="h-3.5 w-3.5" />
                        </span>
                      )}

                      {/* Connection status tag: ONLY shown in 'All Repositories' tab, NOT in 'Connected Repositories' tab */}
                      {activeTab !== 'connected' && repo.connected && (
                        <span className="inline-flex items-center gap-1 rounded bg-[#122519] border border-[#1b4d2e] px-2 py-0.5 font-mono text-[10px] text-emerald-400">
                          <CheckCircle2 className="h-3 w-3" />
                          Connected
                        </span>
                      )}
                    </div>

                    <p className="mt-1 text-xs text-[#A5B8AA] line-clamp-1">
                      {repo.description}
                    </p>

                    <div className="mt-2 flex items-center gap-3 text-[11px] font-mono text-[#6A8070]">
                      <span className="flex items-center gap-1">
                        <GitBranch className="h-3 w-3" />
                        {repo.defaultBranch}
                      </span>
                      <span>&bull;</span>
                      <span className="text-[#89a891]">{repo.language}</span>
                      {repo.stars > 0 && (
                        <>
                          <span>&bull;</span>
                          <span className="flex items-center gap-1 text-[#89a891]">
                            <Star className="h-3 w-3 text-[#eab308]" />
                            {repo.stars}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right: Actions (View on GitHub & Review/Connect) */}
                <div className="flex items-center gap-2.5 self-end sm:self-center shrink-0">
                  {/* Button 1: Check on GitHub */}
                  <a
                    href={repo.htmlUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-[6px] border border-[#1b3324] bg-[#0c1811] px-3 py-1.5 font-mono text-xs text-[#A5B8AA] hover:text-[#EEF4EF] hover:border-[#2a4e38] transition-colors"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    <span>View on GitHub</span>
                  </a>

                  {/* Button 2: Review (if connected) -> Opens Repository Explorer */}
                  {repo.connected ? (
                    <button
                      type="button"
                      onClick={async () => {
                        let targetDbId = repo.connectedRepositoryId;

                        // If connectedRepositoryId is missing, attempt to resync from backend
                        if (!targetDbId) {
                          try {
                            const { getConnectedRepositoriesApi } = await import('../api/apiClient');
                            const backendConnected = await getConnectedRepositoriesApi();
                            const match = backendConnected?.find(
                              (b) => b.fullName.toLowerCase() === repo.fullName.toLowerCase()
                            );
                            if (match) {
                              targetDbId = match.id;
                              setRepos((prev) =>
                                prev.map((r) =>
                                  r.id === repo.id ? { ...r, connectedRepositoryId: match.id } : r
                                )
                              );
                            }
                          } catch {
                            // ignore resync error and handle below
                          }
                        }

                        if (!targetDbId) {
                          setConnectError(
                            `Cannot open explorer for ${repo.name}: Repository connection record not found on backend. Please try reconnecting.`
                          );
                          return;
                        }

                        // Navigate to the Repository Explorer page for this connected repository
                        navigate(`/repositories/${targetDbId}/explore`);
                      }}
                      className="inline-flex items-center gap-1.5 rounded-[6px] bg-[#15803d]/30 border border-[#22c55e]/50 px-3.5 py-1.5 font-mono text-xs font-medium text-emerald-300 hover:bg-[#15803d]/50 transition-all shadow-[0_0_10px_rgba(34,197,94,0.2)]"
                    >
                      <Play className="h-3.5 w-3.5 fill-emerald-300" />
                      <span>Review</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleConnectRepo(repo)}
                      disabled={isPending}
                      className="inline-flex items-center gap-1.5 rounded-[6px] bg-[#15803d] px-3.5 py-1.5 font-mono text-xs font-medium text-white hover:bg-[#166534] disabled:opacity-50 transition-colors shadow-sm"
                    >
                      {isPending ? (
                        <>
                          <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                          <span>Connecting...</span>
                        </>
                      ) : (
                        <>
                          <Plus className="h-3.5 w-3.5" />
                          <span>Connect</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default RepositoriesPage;
