/**
 * @file src/pages/OAuthCallbackPage.tsx
 * @description Dedicated OAuth Callback page handling GitHub OAuth redirects.
 * Publicly accessible route (/auth/callback and /repositories) so that unauthenticated
 * 1-click GitHub login/signup redirects can be exchanged without being blocked by ProtectedRoute.
 */

import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../api/apiClient';

export const OAuthCallbackPage: React.FC = () => {
  const [status, setStatus] = useState<string>('Authenticating with GitHub...');
  const [error, setError] = useState<string | null>(null);
  const exchangedRef = useRef(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (exchangedRef.current) return;

    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const state = urlParams.get('state');
    const errorParam = urlParams.get('error_description') || urlParams.get('error');

    if (errorParam) {
      setError(`GitHub Authentication Error: ${errorParam}`);
      return;
    }

    if (!code) {
      // If no code, redirect to home
      navigate('/', { replace: true });
      return;
    }

    exchangedRef.current = true;
    setStatus('Verifying security token and setting up your workspace...');

    // Claim code in session to prevent StrictMode replay
    const exchangedKey = 'pcr_oauth_exchanged_code';
    if (sessionStorage.getItem(exchangedKey) === code) {
      navigate('/dashboard', { replace: true });
      return;
    }
    sessionStorage.setItem(exchangedKey, code);

    // Validate state
    const expectedState = sessionStorage.getItem('pcr_oauth_state') || localStorage.getItem('pcr_oauth_state');
    if (expectedState && state && expectedState !== state) {
      setError('OAuth security state verification failed. Please try logging in again.');
      return;
    }

    apiClient.post('/auth/github/callback', {
      code,
      state: state || expectedState || '',
    })
      .then((res) => {
        const data = res.data;
        if (data && data.success) {
          if (data.token) {
            localStorage.setItem('pcr_token', data.token);
            if (data.email) localStorage.setItem('pcr_user_email', data.email);
            if (data.name) localStorage.setItem('pcr_user_name', data.name);
            if (data.username) localStorage.setItem('pcr_user_username', data.username);
          }

          if (data.user) {
            const userData = data.user;
            const hasPrivateScope = Boolean(data.hasPrivateAccess);
            const totalCount = (userData.public_repos || 0) + (userData.total_private_repos || 0);

            const profileData = {
              username: userData.login,
              name: userData.name || userData.login,
              avatarUrl: userData.avatar_url || `https://github.com/${userData.login}.png`,
              publicReposCount: userData.public_repos || 0,
              totalReposCount: totalCount > 0 ? totalCount : (data.repositories?.length || 0),
              hasPrivateAccess: hasPrivateScope,
              connectedAt: new Date().toLocaleDateString(),
            };

            const repoList = Array.isArray(data.repositories)
              ? data.repositories.map((r: any, idx: number) => ({
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
                }))
              : [];

            const userEmail = (data.email || userData.email || 'user').toLowerCase();
            const userKey = userEmail.replace(/[^a-z0-9]/g, '_');
            localStorage.setItem(`pcr_gh_connected_${userKey}`, 'true');
            localStorage.setItem(`pcr_gh_profile_${userKey}`, JSON.stringify(profileData));
            localStorage.setItem(`pcr_gh_repos_${userKey}`, JSON.stringify(repoList));
            localStorage.setItem(`pcr_user_gh_${userKey}`, userData.login);
          }

          setStatus('Success! Taking you to your dashboard...');
          setTimeout(() => {
            navigate('/dashboard', { replace: true });
          }, 500);
        } else {
          setError(data.error || 'Authentication failed.');
        }
      })
      .catch((err) => {
        const msg = err.response?.data?.error || err.response?.data?.message || err.message;
        setError(msg || 'Could not complete GitHub authentication.');
      });
  }, [navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#050a07] text-[#EEF4EF] font-sans px-4">
      <div className="w-full max-w-md rounded-xl border border-[#1b3324] bg-[#0c1610] p-8 text-center shadow-2xl">
        {error ? (
          <div>
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-900/30 text-red-400 border border-red-800">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Authentication Issue</h3>
            <p className="text-sm text-red-300/90 mb-6">{error}</p>
            <button
              onClick={() => navigate('/', { replace: true })}
              className="w-full rounded-lg bg-[#15803d] px-4 py-2 text-sm font-semibold text-white hover:bg-[#166534] transition-colors"
            >
              Back to Home
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#15803d] border-t-transparent" />
            <h3 className="text-base font-semibold text-white">{status}</h3>
            <p className="text-xs text-[#A5B8AA]">Please wait while we connect your GitHub account.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default OAuthCallbackPage;
