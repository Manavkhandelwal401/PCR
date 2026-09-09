/**
 * @file src/components/ProtectedRoute.tsx
 * @description Guard component verifying JWT token validity before rendering protected dashboard views.
 */

import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import apiClient from '../api/apiClient';

interface ProtectedRouteProps {
  children: React.ReactElement;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const location = useLocation();

  useEffect(() => {
    const verifyToken = async () => {
      // If we are currently handling an OAuth redirect callback with ?code=...,
      // do not redirect to '/' prematurely; allow the page component to complete the exchange.
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.has('code')) {
        setIsAuthenticated(true);
        return;
      }

      const token = localStorage.getItem('pcr_token');
      if (!token) {
        setIsAuthenticated(false);
        return;
      }

      try {
        const response = await apiClient.get('/auth/auth-check');
        if (response.data && response.data.authenticated) {
          setIsAuthenticated(true);
        } else {
          setIsAuthenticated(false);
        }
      } catch (err) {
        // Fail-safe security: any network error, invalid token, or 401 must reject access rather than failing open
        console.warn('Auth check endpoint responded with error. Rejecting session:', err);
        localStorage.removeItem('pcr_auth_token');
        localStorage.removeItem('pcr_token');
        setIsAuthenticated(false);
      }
    };

    verifyToken();
  }, [location.pathname]);

  if (isAuthenticated === null) {
    // Elegant low-contrast loading skeleton
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#050a07] text-[#EEF4EF]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#15803d] border-t-transparent" />
          <span className="font-mono text-xs text-[#A5B8AA] tracking-wider uppercase">
            Verifying Session...
          </span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/" replace state={{ from: location }} />;
  }

  return children;
};

export default ProtectedRoute;
