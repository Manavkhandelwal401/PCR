/**
 * @file src/pages/SettingsPage.tsx
 * @description Developer & Organization settings console including:
 * 1. Personal Information section (Candidate / User details dynamically fetched from GitHub / Google / Email signin).
 * 2. Review Preferences (Severity gating & GitHub App status).
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  User,
  Mail,
  ExternalLink,
  CheckCircle2,
  Check,
  Edit2,
  X,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { authService } from '../services/authService';

// Official GitHub Logo Mark
const GithubIcon: React.FC<{ className?: string }> = ({ className = 'h-4 w-4' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
    />
  </svg>
);

interface GithubProfile {
  username: string;
  name: string;
  avatarUrl: string;
  publicReposCount: number;
  totalReposCount: number;
  hasPrivateAccess: boolean;
  connectedAt: string;
}

export const SettingsPage: React.FC = () => {
  // Read stored user credentials
  const userEmail = localStorage.getItem('pcr_user_email') || 'engineer@company.com';
  const emailPrefix = userEmail.split('@')[0] || '';
  const userKey = userEmail.toLowerCase().replace(/[^a-z0-9]/g, '_');

  const GH_CONNECTED_KEY = `pcr_gh_connected_${userKey}`;
  const GH_PROFILE_KEY = `pcr_gh_profile_${userKey}`;
  const GH_REPOS_KEY = `pcr_gh_repos_${userKey}`;
  const GH_USER_KEY = `pcr_user_gh_${userKey}`;

  const USER_NAME_KEY = `pcr_user_name_${userKey}`;
  const USER_USERNAME_KEY = `pcr_user_username_${userKey}`;

  // Stored custom profile info
  const [customName, setCustomName] = useState<string>(() => {
    return localStorage.getItem(USER_NAME_KEY) || localStorage.getItem('pcr_user_name') || '';
  });
  const [customUsername, setCustomUsername] = useState<string>(() => {
    return localStorage.getItem(USER_USERNAME_KEY) || localStorage.getItem('pcr_user_username') || '';
  });

  // Determine auth provider (google, github, or direct email signup)
  const isGoogleUser = userEmail.includes('google') || localStorage.getItem('pcr_auth_provider') === 'google';
  const isGithubDirectUser = userEmail.includes('github') || localStorage.getItem('pcr_auth_provider') === 'github';

  // Stored GitHub connected profile (isolated per user)
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

  const [isGithubConnected, setIsGithubConnected] = useState<boolean>(() => {
    return localStorage.getItem(GH_CONNECTED_KEY) === 'true';
  });

  // Edit Mode state
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editName, setEditName] = useState<string>('');
  const [editUsername, setEditUsername] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);

  // Username validation & availability checking state
  const [isCheckingUsername, setIsCheckingUsername] = useState<boolean>(false);
  const [usernameStatus, setUsernameStatus] = useState<{
    available: boolean | null;
    message: string;
  }>({ available: null, message: '' });

  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync state if another tab changed auth or storage
  useEffect(() => {
    const handleStorage = () => {
      setIsGithubConnected(localStorage.getItem(GH_CONNECTED_KEY) === 'true');
      const saved = localStorage.getItem(GH_PROFILE_KEY);
      let parsed = null;
      if (saved) {
        try {
          parsed = JSON.parse(saved);
        } catch {
          localStorage.removeItem(GH_PROFILE_KEY);
        }
      }
      setGhProfile(parsed);
      const updatedName = localStorage.getItem(USER_NAME_KEY) || localStorage.getItem('pcr_user_name') || '';
      const updatedUser = localStorage.getItem(USER_USERNAME_KEY) || localStorage.getItem('pcr_user_username') || '';
      if (updatedName) setCustomName(updatedName);
      if (updatedUser) setCustomUsername(updatedUser);
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [GH_CONNECTED_KEY, GH_PROFILE_KEY, USER_NAME_KEY, USER_USERNAME_KEY]);

  // Fetch fresh profile details from backend auth-check on mount
  useEffect(() => {
    const fetchLatestProfile = async () => {
      try {
        const authData = await authService.checkAuth();
        if (authData.name) {
          setCustomName(authData.name);
          localStorage.setItem(USER_NAME_KEY, authData.name);
        }
        if (authData.username) {
          setCustomUsername(authData.username);
          localStorage.setItem(USER_USERNAME_KEY, authData.username);
        }
      } catch {
        // use local fallbacks
      }
    };
    fetchLatestProfile();
  }, [USER_NAME_KEY, USER_USERNAME_KEY]);

  // Smooth scroll to personal info section if hash is present
  useEffect(() => {
    if (window.location.hash === '#personal-info') {
      const el = document.getElementById('personal-info');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
      }
    }
  }, []);

  // Compute displayed values according to priority:
  // 1. If GitHub is connected -> fetch exact name & username from GitHub profile
  // 2. Custom edited name / username saved by candidate
  // 3. If Google login -> extract Google Name, Username & email
  // 4. Default fallback: "Candidate <Prefix>" & "@candidate_<prefix>"
  let displayName = '';
  let displayUsername = '';
  let displayGithubId = '';

  if (isGithubConnected && ghProfile) {
    displayName = ghProfile.name || ghProfile.username;
    displayUsername = ghProfile.username;
    displayGithubId = ghProfile.username;
  } else if (customName || customUsername) {
    displayName = customName || `Candidate ${emailPrefix.charAt(0).toUpperCase() + emailPrefix.slice(1)}`;
    displayUsername = customUsername || `candidate_${emailPrefix}`;
    displayGithubId = '';
  } else if (isGithubDirectUser) {
    displayUsername = emailPrefix;
    displayName = emailPrefix.charAt(0).toUpperCase() + emailPrefix.slice(1);
    displayGithubId = emailPrefix;
  } else if (isGoogleUser) {
    displayName = emailPrefix.split('.')[0] ? emailPrefix.split('.')[0].charAt(0).toUpperCase() + emailPrefix.split('.')[0].slice(1) : 'Google User';
    displayUsername = emailPrefix;
    displayGithubId = '';
  } else {
    // Normal email signup without GitHub connected
    displayName = `Candidate ${emailPrefix.charAt(0).toUpperCase() + emailPrefix.slice(1)}`;
    displayUsername = `candidate_${emailPrefix}`;
    displayGithubId = '';
  }

  // Open Edit Mode with current values
  const handleStartEdit = () => {
    setEditName(customName || displayName);
    setEditUsername(customUsername || displayUsername);
    setUsernameStatus({ available: true, message: 'Current username' });
    setSaveError(null);
    setSaveSuccess(null);
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setSaveError(null);
    setSaveSuccess(null);
    setUsernameStatus({ available: null, message: '' });
  };

  // Real-time debounced availability check
  const handleUsernameChange = (val: string) => {
    const cleaned = val.trim().toLowerCase().replace(/^@/, '');
    setEditUsername(cleaned);
    setSaveError(null);
    setSaveSuccess(null);

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (!cleaned) {
      setUsernameStatus({ available: false, message: 'Username cannot be empty.' });
      return;
    }

    if (cleaned.length < 3 || cleaned.length > 30) {
      setUsernameStatus({ available: false, message: 'Length must be between 3 and 30 characters.' });
      return;
    }

    if (!/^[a-z0-9_]+$/.test(cleaned)) {
      setUsernameStatus({ available: false, message: 'Only lowercase letters, numbers, and underscores allowed.' });
      return;
    }

    // If matches currently active username, consider available
    if (cleaned === customUsername.toLowerCase() || cleaned === displayUsername.toLowerCase()) {
      setUsernameStatus({ available: true, message: 'Your current username.' });
      return;
    }

    setIsCheckingUsername(true);
    setUsernameStatus({ available: null, message: 'Checking availability...' });

    debounceTimerRef.current = setTimeout(async () => {
      try {
        const result = await authService.checkUsernameAvailability(cleaned, userEmail);
        setIsCheckingUsername(false);
        setUsernameStatus({
          available: result.available,
          message: result.message,
        });
      } catch {
        setIsCheckingUsername(false);
        setUsernameStatus({
          available: false,
          message: 'Error verifying username.',
        });
      }
    }, 400);
  };

  // Save profile changes
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveError(null);
    setSaveSuccess(null);

    if (!editName.trim()) {
      setSaveError('Please enter a candidate name.');
      return;
    }

    if (!editUsername.trim()) {
      setSaveError('Please enter a username.');
      return;
    }

    if (usernameStatus.available === false) {
      setSaveError(usernameStatus.message || 'Username is not available. Please choose another.');
      return;
    }

    if (isCheckingUsername) {
      setSaveError('Please wait while we verify username availability.');
      return;
    }

    setIsSaving(true);
    try {
      const res = await authService.updateProfile(editName.trim(), editUsername.trim());
      const newName = res.name || editName.trim();
      const newUsername = res.username || editUsername.trim();

      setCustomName(newName);
      setCustomUsername(newUsername);
      localStorage.setItem(USER_NAME_KEY, newName);
      localStorage.setItem(USER_USERNAME_KEY, newUsername);
      localStorage.setItem('pcr_user_name', newName);
      localStorage.setItem('pcr_user_username', newUsername);

      setSaveSuccess('Profile saved successfully!');
      setTimeout(() => {
        setIsEditing(false);
        setSaveSuccess(null);
      }, 1000);
    } catch (err: any) {
      setSaveError(err.message || 'Failed to save changes. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  // Function to initiate secure OAuth with CSRF state parameter
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
      const clientId = import.meta.env.VITE_GITHUB_OAUTH_CLIENT_ID || 'Ov23liz7VeylLeQwQIjk';
      const redirectUri = import.meta.env.VITE_GITHUB_OAUTH_REDIRECT_URI || 
        (typeof window !== 'undefined' ? `${window.location.origin}/repositories` : 'http://localhost:5173/repositories');
      const authUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=read:user,repo&state=${encodeURIComponent(state)}`;
      window.location.href = authUrl;
    } catch (e) {
      console.error('Failed to obtain server-signed OAuth state:', e);
    }
  };

  const handleDisconnectGithub = () => {
    setIsGithubConnected(false);
    setGhProfile(null);
    localStorage.removeItem(GH_CONNECTED_KEY);
    localStorage.removeItem(GH_PROFILE_KEY);
    localStorage.removeItem(GH_REPOS_KEY);
    localStorage.removeItem(GH_USER_KEY);
    sessionStorage.removeItem('pcr_oauth_state');
    sessionStorage.removeItem('pcr_oauth_exchanged_code');

    // Notify backend to purge persisted GitHub access token for this user
    import('../api/apiClient').then(({ apiClient }) => {
      apiClient.post('/auth/github/disconnect').catch((err) => {
        console.warn('Notice: Backend GitHub token purge failed or completed:', err);
      });
    });
  };

  return (
    <div className="space-y-8 max-w-4xl font-sans">
      {/* Top Header */}
      <div className="border-b border-[#1b3324] pb-5">
        <h1 className="font-serif text-3xl font-normal text-[#EEF4EF]">Account & Settings</h1>
        <p className="mt-1 text-xs text-[#A5B8AA]">
          Manage your personal information, connected GitHub developer identity, and automated review preferences.
        </p>
      </div>

      {/* 1. PERSONAL INFORMATION SECTION */}
      <section id="personal-info" className="rounded-[10px] border border-[#1b3324] bg-[#0c1811] overflow-hidden shadow-sm">
        {/* Section Header */}
        <div className="border-b border-[#1b3324] bg-[#0e1c14] px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-[5px] border border-[#1b4d2e] bg-[#122519] text-emerald-400">
              <User className="h-4 w-4" />
            </div>
            <div>
              <h2 className="font-mono text-xs font-semibold uppercase tracking-wider text-[#EEF4EF]">
                Personal Information
              </h2>
              <p className="text-[11px] text-[#A5B8AA]">
                Verified developer credentials, name, email ID, and linked GitHub profile.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {!isEditing && (
              <button
                type="button"
                onClick={handleStartEdit}
                className="inline-flex items-center gap-1.5 rounded-[5px] border border-[#22c55e]/40 bg-[#122519] px-3 py-1 font-mono text-[11px] font-medium text-emerald-300 hover:bg-[#1b4d2e]/40 hover:text-white transition-all shadow-sm"
              >
                <Edit2 className="h-3.5 w-3.5 text-emerald-400" />
                <span>Edit</span>
              </button>
            )}

            {!isGithubConnected && (
              <button
                type="button"
                onClick={initiateGithubOAuth}
                className="inline-flex items-center gap-1.5 rounded-[5px] bg-[#15803d] px-3 py-1 font-mono text-[11px] font-medium text-white hover:bg-[#166534] transition-colors shadow-sm"
              >
                <GithubIcon className="h-3 w-3" />
                <span>Connect To GitHub</span>
              </button>
            )}
          </div>
        </div>

        {/* Profile Card Content */}
        <div className="p-6 space-y-6">
          {/* Avatar and Main Identity Banner */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-[8px] border border-[#1b3324]/80 bg-[#07110a]">
            <div className="flex items-center gap-4">
              <div className="relative">
                <img
                  src={
                    ghProfile?.avatarUrl ||
                    `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(userEmail)}`
                  }
                  alt={displayName}
                  className="h-14 w-14 rounded-full border-2 border-[#1b4d2e] bg-[#122519] object-cover shadow-sm"
                />
                {isGithubConnected && (
                  <div className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-[#122519] border border-[#1b4d2e] text-emerald-400">
                    <Check className="h-3 w-3" />
                  </div>
                )}
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-semibold text-[#EEF4EF] font-mono">
                    {displayName}
                  </h3>
                </div>
                <div className="flex items-center gap-2 mt-0.5 text-xs text-[#A5B8AA] font-mono">
                  <span>@{displayUsername}</span>
                  <span>&bull;</span>
                  <span>{userEmail}</span>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            {isGithubConnected && (
              <div className="flex items-center gap-2 self-end sm:self-center">
                <a
                  href={`https://github.com/${ghProfile?.username}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-[5px] border border-[#1b3324] bg-[#0c1811] px-3 py-1.5 font-mono text-xs text-[#A5B8AA] hover:text-white transition-colors"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  <span>GitHub Profile</span>
                </a>
                <button
                  type="button"
                  onClick={handleDisconnectGithub}
                  className="text-xs font-mono text-red-400/80 hover:text-red-300 transition-colors px-2 py-1.5"
                >
                  Disconnect
                </button>
              </div>
            )}
          </div>

          {/* EDIT FORM (Conditional Render) */}
          {isEditing ? (
            <form onSubmit={handleSaveProfile} className="rounded-[8px] border border-[#22c55e]/40 bg-[#09150e] p-5 space-y-4 font-mono shadow-md">
              <div className="flex items-center justify-between border-b border-[#1b3324] pb-3">
                <div className="flex items-center gap-2">
                  <Edit2 className="h-4 w-4 text-emerald-400" />
                  <span className="text-xs font-semibold uppercase tracking-wider text-[#EEF4EF]">Edit Candidate Details</span>
                </div>
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="text-xs text-[#6A8070] hover:text-[#EEF4EF] p-1 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {saveError && (
                <div className="p-3 rounded-[6px] bg-red-950/30 border border-red-800/50 flex items-center gap-2 text-xs text-red-300">
                  <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
                  <span>{saveError}</span>
                </div>
              )}

              {saveSuccess && (
                <div className="p-3 rounded-[6px] bg-emerald-950/40 border border-emerald-700/50 flex items-center gap-2 text-xs text-emerald-300">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
                  <span>{saveSuccess}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Name field */}
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-semibold uppercase text-[#A5B8AA] tracking-wider">
                    Candidate Name
                  </label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => {
                      setEditName(e.target.value);
                      setSaveError(null);
                    }}
                    placeholder="e.g. Alex Johnson"
                    className="w-full rounded-[6px] border border-[#1b3324] bg-[#07110a] px-3 py-2 text-xs text-[#EEF4EF] placeholder-[#4a5e50] focus:border-[#22c55e] focus:outline-none focus:ring-1 focus:ring-[#22c55e]"
                    maxLength={50}
                  />
                  <span className="text-[10px] text-[#6A8070]">Display name shown across reviews & dashboards</span>
                </div>

                {/* Username field with live availability check */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="block text-[11px] font-semibold uppercase text-[#A5B8AA] tracking-wider">
                      Username (Handle)
                    </label>
                    {isCheckingUsername ? (
                      <span className="inline-flex items-center gap-1 text-[10px] text-amber-400">
                        <Loader2 className="h-2.5 w-2.5 animate-spin" />
                        <span>Checking...</span>
                      </span>
                    ) : usernameStatus.available === true ? (
                      <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400">
                        <Check className="h-2.5 w-2.5" />
                        <span>Available</span>
                      </span>
                    ) : usernameStatus.available === false ? (
                      <span className="inline-flex items-center gap-1 text-[10px] text-rose-400">
                        <AlertCircle className="h-2.5 w-2.5" />
                        <span>Not Available</span>
                      </span>
                    ) : null}
                  </div>

                  <div className="relative">
                    <span className="absolute left-3 top-2 text-xs text-[#6A8070]">@</span>
                    <input
                      type="text"
                      value={editUsername}
                      onChange={(e) => handleUsernameChange(e.target.value)}
                      placeholder="alex_dev"
                      className={`w-full rounded-[6px] border bg-[#07110a] pl-7 pr-3 py-2 text-xs text-[#EEF4EF] placeholder-[#4a5e50] focus:outline-none focus:ring-1 ${
                        usernameStatus.available === true
                          ? 'border-emerald-600/70 focus:border-emerald-500 focus:ring-emerald-500'
                          : usernameStatus.available === false
                          ? 'border-rose-600/70 focus:border-rose-500 focus:ring-rose-500'
                          : 'border-[#1b3324] focus:border-[#22c55e] focus:ring-[#22c55e]'
                      }`}
                      maxLength={30}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <span className={`text-[10px] ${
                      usernameStatus.available === false ? 'text-rose-400' : 'text-[#6A8070]'
                    }`}>
                      {usernameStatus.message || 'Alphanumeric and underscores only (3-30 chars)'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Form Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#1b3324]">
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  disabled={isSaving}
                  className="rounded-[6px] border border-[#1b3324] bg-transparent px-3 py-1.5 text-xs text-[#A5B8AA] hover:text-white hover:bg-[#122519] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving || isCheckingUsername || usernameStatus.available === false}
                  className={`inline-flex items-center gap-1.5 rounded-[6px] px-4 py-1.5 text-xs font-semibold text-white transition-all shadow-sm ${
                    isSaving || isCheckingUsername || usernameStatus.available === false
                      ? 'bg-zinc-800 text-zinc-500 border border-zinc-700/50 cursor-not-allowed'
                      : 'bg-[#15803d] hover:bg-[#166534] border border-[#22c55e]/50 cursor-pointer'
                  }`}
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="h-3 w-3 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Check className="h-3 w-3" />
                      <span>Save Changes</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          ) : (
            /* Vertical Key-Value Information List */
            <div className="rounded-[8px] border border-[#1b3324] bg-[#09150e] divide-y divide-[#1b3324] font-mono">
              {/* Row 1: Name */}
              <div className="flex items-center justify-between p-4 hover:bg-[#0c1c13]/50 transition-colors">
                <div className="text-xs font-semibold uppercase tracking-wider text-[#6A8070]">
                  Name
                </div>
                <div className="text-xs font-medium text-[#EEF4EF] text-right">
                  {displayName}
                </div>
              </div>

              {/* Row 2: Username */}
              <div className="flex items-center justify-between p-4 hover:bg-[#0c1c13]/50 transition-colors">
                <div className="text-xs font-semibold uppercase tracking-wider text-[#6A8070]">
                  Username
                </div>
                <div className="text-xs font-medium text-emerald-300 text-right">
                  @{displayUsername}
                </div>
              </div>

              {/* Row 3: Email */}
              <div className="flex items-center justify-between p-4 hover:bg-[#0c1c13]/50 transition-colors">
                <div className="text-xs font-semibold uppercase tracking-wider text-[#6A8070] flex items-center gap-1.5">
                  <Mail className="h-3 w-3" />
                  <span>Email Address</span>
                </div>
                <div className="text-xs font-medium text-[#EEF4EF] text-right truncate ml-4">
                  {userEmail}
                </div>
              </div>

              {/* Row 4: GitHub ID */}
              <div className="flex items-center justify-between p-4 hover:bg-[#0c1c13]/50 transition-colors">
                <div className="text-xs font-semibold uppercase tracking-wider text-[#6A8070] flex items-center gap-1.5">
                  <GithubIcon className="h-3 w-3" />
                  <span>GitHub ID</span>
                </div>
                <div className="text-xs font-medium text-[#EEF4EF] text-right">
                  {isGithubConnected && displayGithubId ? (
                    <span className="text-emerald-300">github.com/{displayGithubId}</span>
                  ) : (
                    <div className="flex items-center gap-2 justify-end">
                      <span className="text-[#6A8070] italic">Not Connected</span>
                      <button
                        type="button"
                        onClick={initiateGithubOAuth}
                        className="text-[11px] text-emerald-400 hover:underline font-normal"
                      >
                        Connect Now &rarr;
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default SettingsPage;
