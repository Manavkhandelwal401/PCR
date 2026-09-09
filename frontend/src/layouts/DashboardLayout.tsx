/**
 * @file src/layouts/DashboardLayout.tsx
 * @description Minimalist, dark-themed SaaS application shell for protected routes.
 * Includes:
 * - Narrow left sidebar with icons for Dashboard, Analytics, Repositories, Settings (Phantom green #15803d active indicator).
 * - Minimal top header with PCR logo and User Profile / Sign Out action.
 * - Main container rendering nested views via <Outlet />.
 */

import React, { useState, useRef, useEffect } from 'react';
import { Outlet, NavLink, useNavigate, Link } from 'react-router-dom';
import { LayoutDashboard, BarChart2, GitBranch, LogOut, ChevronDown, User, Users, FileCheck } from 'lucide-react';
import { authService } from '../services/authService';
import { getPlatformStatsApi, type PlatformStatsResponse } from '../api/apiClient';
import { DashboardChalkboardLayer } from '../components/dashboard/DashboardChalkboardLayer';

import { PcrLogo } from '../components/PcrLogo';

export const DashboardLayout: React.FC = () => {
  const navigate = useNavigate();
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [statsDropdownOpen, setStatsDropdownOpen] = useState(false);
  const [platformStats, setPlatformStats] = useState<PlatformStatsResponse | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);

  const profileMenuRef = useRef<HTMLDivElement>(null);
  const logoMenuRef = useRef<HTMLDivElement>(null);
  const userEmail = localStorage.getItem('pcr_user_email') || 'engineer@company.com';

  const handleSignOut = () => {
    authService.signOut();
    navigate('/');
  };

  const toggleStatsDropdown = async () => {
    const nextState = !statsDropdownOpen;
    setStatsDropdownOpen(nextState);
    if (nextState && !platformStats) {
      setLoadingStats(true);
      try {
        const data = await getPlatformStatsApi();
        setPlatformStats(data);
      } catch (err) {
        console.error('Failed to load platform stats', err);
      } finally {
        setLoadingStats(false);
      }
    }
  };

  // Close dropdowns on click outside & Escape key
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const targetNode = event.target as Node;
      if (profileMenuRef.current && !profileMenuRef.current.contains(targetNode)) {
        setProfileDropdownOpen(false);
      }
      if (logoMenuRef.current && !logoMenuRef.current.contains(targetNode)) {
        setStatsDropdownOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setProfileDropdownOpen(false);
        setStatsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const navItems = [
    { to: '/dashboard', label: 'Console', icon: LayoutDashboard },
    { to: '/analytics', label: 'Analytics', icon: BarChart2 },
    { to: '/repositories', label: 'Repositories', icon: GitBranch },
  ];

  return (
    <div className="relative flex flex-col h-screen w-screen overflow-hidden dashboard-forest-bg text-[#EEF4EF] font-sans antialiased selection:bg-[#15803d]/40 selection:text-white">
      {/* Film grain layer */}
      <div className="film-grain" />

      {/* Ambient chalkboard blur words & diagrams in background */}
      <DashboardChalkboardLayer />

      {/* Top Floating Horizontal Navigation — No Bar / Container Box */}
      <div className="relative z-30 w-full px-6 sm:px-10 pt-5 pb-2 flex items-center justify-between pointer-events-auto">
        {/* Left: Brand Logo with Platform Stats Dropdown */}
        <div className="relative" ref={logoMenuRef}>
          <button
            type="button"
            onClick={toggleStatsDropdown}
            title="Click to view Platform Stats"
            className="flex items-center gap-2 group transition-opacity hover:opacity-90 focus:outline-none cursor-pointer"
          >
            <PcrLogo size={32} showText={true} />
          </button>

          {statsDropdownOpen && (
            <div className="absolute left-0 mt-2 w-56 rounded-[8px] border border-[#1b3324] bg-[#0c1811]/95 backdrop-blur-md p-3 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-100">
              <div className="text-[11px] font-mono uppercase tracking-wider text-[#9cb5a2] border-b border-[#1b3324] pb-2 mb-2">
                Platform Statistics
              </div>
              {loadingStats ? (
                <div className="text-xs text-white font-normal py-2">Loading statistics...</div>
              ) : (
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 text-white">
                      <Users className="h-3.5 w-3.5 text-emerald-400" />
                      <span className="font-normal text-white">Total Users</span>
                    </div>
                    <span className="font-normal text-white">{platformStats?.totalUsers ?? '26'}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 text-white">
                      <FileCheck className="h-3.5 w-3.5 text-emerald-400" />
                      <span className="font-normal text-white">Total Reviews</span>
                    </div>
                    <span className="font-normal text-white">{platformStats?.totalReviews ?? '128'}</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Center: Horizontal Navigation Buttons (Console, Analytics, Repositories) */}
        <nav className="flex items-center gap-2 sm:gap-4 md:gap-6">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-mono transition-all duration-200 tracking-wide ${
                    isActive
                      ? 'text-white font-medium bg-[#15803d]/30 border border-[#22c55e]/50 shadow-[0_0_14px_rgba(34,197,94,0.25)]'
                      : 'text-[#9cb5a2] hover:text-white hover:bg-[#15803d]/10 border border-transparent'
                  }`
                }
              >
                <Icon className="h-3.5 w-3.5 opacity-80" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* Right: Profile Dropdown Button */}
        <div className="flex items-center gap-3">
          <div className="relative" ref={profileMenuRef}>
            <button
              type="button"
              onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-mono transition-all duration-200 tracking-wide ${
                window.location.pathname === '/settings' || profileDropdownOpen
                  ? 'text-white font-medium bg-[#15803d]/30 border border-[#22c55e]/50 shadow-[0_0_14px_rgba(34,197,94,0.25)]'
                  : 'text-[#c6decb] hover:text-white hover:bg-[#15803d]/15 border border-transparent'
              }`}
            >
              <div className="flex h-5 w-5 items-center justify-center rounded-full bg-[#15803d]/80 border border-[#22c55e]/40 text-white text-[10px]">
                <User className="h-3 w-3" />
              </div>
              <span className="text-xs font-medium">Profile</span>
              <ChevronDown className={`h-3 w-3 transition-transform ${profileDropdownOpen ? 'rotate-180 text-emerald-400' : 'text-[#7a9682]'}`} />
            </button>

            {profileDropdownOpen && (
              <div className="absolute right-0 mt-2 w-52 rounded-[8px] border border-[#1b3324] bg-[#0c1811]/95 backdrop-blur-md py-1.5 shadow-2xl z-50 font-mono text-xs animate-in fade-in zoom-in-95 duration-100">
                <div className="px-3.5 py-2 border-b border-[#1b3324] text-[10px] text-[#6A8070] truncate">
                  Signed in as<br />
                  <span className="text-[#EEF4EF] font-medium">{userEmail}</span>
                </div>

                {/* 1. Personal Info */}
                <Link
                  to="/settings#personal-info"
                  onClick={() => setProfileDropdownOpen(false)}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2 text-[#c6decb] hover:text-white hover:bg-[#15803d]/20 transition-colors"
                >
                  <User className="h-3.5 w-3.5 text-emerald-400" />
                  <span>Personal Info</span>
                </Link>

                <div className="my-1 border-t border-[#1b3324]" />

                {/* 3. Sign Out */}
                <button
                  type="button"
                  onClick={() => {
                    setProfileDropdownOpen(false);
                    handleSignOut();
                  }}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2 text-left text-red-400 hover:text-red-300 hover:bg-[#1b1515] transition-colors"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  <span>Sign Out</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Dynamic Content Area */}
      <main className="relative z-10 flex-1 overflow-y-auto px-6 sm:px-10 py-6">
        <div className="mx-auto max-w-6xl">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default DashboardLayout;

