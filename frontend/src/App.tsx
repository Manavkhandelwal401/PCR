/**
 * @file src/App.tsx
 * @description Central routing configuration for Phantom Code Reviewer (PCR).
 * Routes:
 * - / (Public Landing Page)
 * - /dashboard (Protected Dashboard)
 * - /reviews/:id (Protected Review Details)
 * - /analytics (Protected Code Quality Analytics)
 * - /repositories (Protected Connected Repositories)
 * - /settings (Protected Settings)
 */

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { LandingPage } from './pages/LandingPage';
import { DashboardLayout } from './layouts/DashboardLayout';
import { DashboardPage } from './pages/DashboardPage';
import { ReviewDetailsPage } from './pages/ReviewDetailsPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { RepositoriesPage } from './pages/RepositoriesPage';
import { RepositoryExplorerPage } from './pages/RepositoryExplorerPage';
import { SettingsPage } from './pages/SettingsPage';
import { ProtectedRoute } from './components/ProtectedRoute';
import { OAuthCallbackPage } from './pages/OAuthCallbackPage';

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Landing Page */}
        <Route path="/" element={<LandingPage />} />

        {/* Public OAuth Callback Handler for GitHub & Social Sign-In */}
        <Route path="/auth/callback" element={<OAuthCallbackPage />} />

        {/* Protected SaaS Application Routes */}
        <Route
          element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/reviews/:id" element={<ReviewDetailsPage />} />
          <Route path="/analytics" element={<AnalyticsPage />} />
          <Route path="/repositories" element={<RepositoriesPage />} />
          <Route path="/repositories/:id/explore" element={<RepositoryExplorerPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>

        {/* Catch-all route */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
