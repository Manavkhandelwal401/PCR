/**
 * @file src/pages/LandingPage.tsx
 * @description Public editorial landing page for Phantom Code Reviewer (PCR).
 */

import React, { useState } from 'react';
import { TopNavbar } from '../sections/TopNavbar';
import { HeroSection } from '../sections/HeroSection';
import { AgentsGrid } from '../sections/AgentsGrid';
import { FooterArea } from '../sections/FooterArea';
import { AuthModal } from '../components/AuthModal';
import { FloatingArtifactsLayer } from '../components/FloatingArtifactsLayer';
import { ChalkboardDiagramLayer } from '../components/ChalkboardDiagramLayer';
import type { ModalMode } from '../components/AuthModal';
import { useNavigate } from 'react-router-dom';

export const LandingPage: React.FC = () => {
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<ModalMode>('signin');
  const navigate = useNavigate();

  const openAuthModal = (mode: ModalMode) => {
    setAuthMode(mode);
    setIsAuthOpen(true);
  };

  const closeAuthModal = () => {
    setIsAuthOpen(false);
  };

  const handleAuthSuccess = (details: { mode: ModalMode; email?: string }) => {
    console.log('Authentication successful:', details);
    // Upon successful authentication, smoothly route into the protected dashboard
    setTimeout(() => {
      navigate('/dashboard');
    }, 600);
  };

  return (
    <div className="relative min-h-screen forest-moss-bg text-[#EEF4EF] flex flex-col selection:bg-[#F5B731]/30 selection:text-white">
      {/* Subtle chalkboard film grain texture */}
      <div className="film-grain" />

      {/* Heavily blurred chalk-style developer architecture diagrams & code */}
      <ChalkboardDiagramLayer />

      {/* Scattered, floating animated dollar bills layer */}
      <FloatingArtifactsLayer />


      {/* 1. Persistent Brand Mark (PCR Logo) */}
      <TopNavbar />

      {/* 2. Main Narrative Chapters */}
      <main className="flex-1 flex flex-col">
        {/* Chapter 01: Hero Narrative with CodeDiffBox */}
        <HeroSection onJoin={() => openAuthModal('signup')} />

        {/* Chapter 05: Four Specialized Agents 2x2 Bento Grid */}
        <AgentsGrid />
      </main>

      {/* 3. Final Conversion & Technical Footer */}
      <FooterArea onReviewCode={() => openAuthModal('signup')} />

      {/* 4. Interactive Auth & GitHub OAuth Modal Gate */}
      <AuthModal
        isOpen={isAuthOpen}
        initialMode={authMode}
        onClose={closeAuthModal}
        onSuccess={handleAuthSuccess}
      />
    </div>
  );
};

export default LandingPage;
