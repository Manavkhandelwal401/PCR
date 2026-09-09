/**
 * @file src/components/AuthModal.tsx
 * @description Clean, light-theme form structure and layout matching LinkedIn, adapted with PCR's signature rich green accents.
 * Connected to Spring Boot /api/v1/auth REST backend with multi-step Sign Up (Email/Password -> 6-Digit OTP verification)
 * and Sign In with simulated Captcha verification checkbox.
 */

import React, { useState, useEffect } from 'react';
import { X, Check, ArrowLeft, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { authService } from '../services/authService';

const GithubIcon: React.FC<{ className?: string }> = ({ className = 'h-5 w-5' }) => (
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

const GoogleIcon: React.FC<{ className?: string }> = ({ className = 'h-5 w-5' }) => (
  <svg className={className} viewBox="0 0 24 24">
    <path
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      fill="#4285F4"
    />
    <path
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      fill="#34A853"
    />
    <path
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
      fill="#FBBC05"
    />
    <path
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
      fill="#EA4335"
    />
  </svg>
);

export type ModalMode = 'signin' | 'signup' | 'github';

interface AuthModalProps {
  isOpen: boolean;
  initialMode?: ModalMode;
  onClose: () => void;
  onSuccess?: (details: { mode: ModalMode; email?: string }) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  initialMode = 'signup',
  onClose,
  onSuccess,
}) => {
  const [mode, setMode] = useState<ModalMode>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [captchaVerified, setCaptchaVerified] = useState(false);

  // Multi-step signup state: 'form' -> 'otp' -> 'complete'
  const [signUpStep, setSignUpStep] = useState<'form' | 'otp'>('form');

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    setMode(initialMode);
    setIsComplete(false);
    setIsProcessing(false);
    setEmail('');
    setPassword('');
    setOtp('');
    setShowPassword(false);
    setSignUpStep('form');
    setCaptchaVerified(false);
    setErrorMessage(null);
    setStatusMessage(null);
  }, [initialMode, isOpen]);

  // Handle ESC key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Step 1: Sign Up Init (send OTP)
  const handleSignUpInit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setStatusMessage(null);

    if (!email || !password) {
      setErrorMessage('Please enter your email and password.');
      return;
    }
    if (password.length < 6) {
      setErrorMessage('Password must be at least 6 characters.');
      return;
    }

    setIsProcessing(true);
    try {
      const res = await authService.sendSignUpOtp(email, password);
      setStatusMessage(res.message || 'OTP verification code sent.');
      setSignUpStep('otp');
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to send OTP.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Step 2: Verify OTP and Register
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setStatusMessage(null);

    if (!otp || otp.trim().length !== 6) {
      setErrorMessage('Please enter the 6-digit OTP sent to your email.');
      return;
    }

    setIsProcessing(true);
    try {
      await authService.verifySignUpOtp(email, otp.trim(), password);
      setIsComplete(true);
      setTimeout(() => {
        if (onSuccess) onSuccess({ mode: 'signup', email });
        onClose();
      }, 950);
    } catch (err: any) {
      setErrorMessage(err.message || 'Invalid or expired OTP.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Sign In submit
  const handleSignInSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setStatusMessage(null);

    if (!email || !password) {
      setErrorMessage('Please enter your email and password.');
      return;
    }

    if (!captchaVerified) {
      setErrorMessage('Please check the security captcha verification.');
      return;
    }

    setIsProcessing(true);
    try {
      await authService.signIn(email, password, 'simulated-captcha-token');
      setIsComplete(true);
      setTimeout(() => {
        if (onSuccess) onSuccess({ mode: 'signin', email });
        onClose();
      }, 900);
    } catch (err: any) {
      setErrorMessage(err.message || 'Invalid email or password.');
    } finally {
      setIsProcessing(false);
    }
  };

  const GITHUB_OAUTH_CLIENT_ID = import.meta.env.VITE_GITHUB_OAUTH_CLIENT_ID || 'Ov23liz7VeylLeQwQIjk';
  const GITHUB_OAUTH_REDIRECT_URI = import.meta.env.VITE_GITHUB_OAUTH_REDIRECT_URI || 'http://localhost:5173/repositories';
  const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '94794083637-iahffrbnpq1ohgflq9tg1ac9tlef7qea.apps.googleusercontent.com';

  const handleOAuthConnect = async (provider: 'google' | 'github') => {
    setErrorMessage(null);
    setStatusMessage(null);

    if (provider === 'github') {
      setIsProcessing(true);
      try {
        const state = await authService.getGithubOAuthState();
        sessionStorage.setItem('pcr_oauth_state', state);
        localStorage.setItem('pcr_oauth_state', state);
        // Mark that OAuth was initiated from modal for auto-routing to dashboard
        sessionStorage.setItem('pcr_auth_redirect', 'dashboard');

        const authUrl = `https://github.com/login/oauth/authorize?client_id=${GITHUB_OAUTH_CLIENT_ID}&redirect_uri=${encodeURIComponent(
          GITHUB_OAUTH_REDIRECT_URI
        )}&scope=read:user,user:email,repo&state=${encodeURIComponent(state)}&prompt=select_account`;

        window.location.href = authUrl;
      } catch (err: any) {
        setIsProcessing(false);
        setErrorMessage(err.message || 'Could not initiate GitHub authorization.');
      }
      return;
    }

    if (provider === 'google') {
      setIsProcessing(true);
      try {
        // Check if Google GIS is available on window
        const win = window as any;
        if (win.google && win.google.accounts && win.google.accounts.id) {
          win.google.accounts.id.initialize({
            client_id: GOOGLE_CLIENT_ID,
            callback: async (response: any) => {
              if (response.credential) {
                try {
                  const res = await authService.signInWithGoogle(response.credential);
                  setIsComplete(true);
                  setTimeout(() => {
                    if (onSuccess) onSuccess({ mode, email: res.email || 'google-user' });
                    onClose();
                  }, 800);
                } catch (e: any) {
                  setErrorMessage(e.message || 'Google sign-in failed on server.');
                  setIsProcessing(false);
                }
              } else {
                setErrorMessage('No credential returned by Google.');
                setIsProcessing(false);
              }
            },
          });
          win.google.accounts.id.prompt((notification: any) => {
            if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
              // Fallback popup if one-tap prompt dismissed/blocked
              openGooglePopupFallback();
            }
          });
        } else {
          openGooglePopupFallback();
        }
      } catch (err: any) {
        setIsProcessing(false);
        setErrorMessage(err.message || 'Google sign-in error.');
      }
    }
  };

  const openGooglePopupFallback = () => {
    // Standard OAuth 2.0 authorization URL for Google
    const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(
      GOOGLE_CLIENT_ID
    )}&redirect_uri=${encodeURIComponent(window.location.origin)}&response_type=id_token&scope=openid%20email%20profile&nonce=${Date.now()}`;

    const width = 500;
    const height = 600;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;

    const popup = window.open(
      googleAuthUrl,
      'google_signin_popup',
      `width=${width},height=${height},left=${left},top=${top}`
    );

    if (!popup) {
      setIsProcessing(false);
      setErrorMessage('Popup blocked. Please allow popups for Google sign-in.');
      return;
    }

    const interval = setInterval(() => {
      try {
        if (!popup || popup.closed) {
          clearInterval(interval);
          setIsProcessing(false);
          return;
        }
        if (popup.location.href.includes(window.location.origin)) {
          const hash = popup.location.hash;
          popup.close();
          clearInterval(interval);
          const params = new URLSearchParams(hash.replace('#', '?'));
          const idToken = params.get('id_token');
          if (idToken) {
            authService.signInWithGoogle(idToken).then((res) => {
              setIsComplete(true);
              setTimeout(() => {
                if (onSuccess) onSuccess({ mode, email: res.email || 'google-user' });
                onClose();
              }, 800);
            }).catch((err) => {
              setErrorMessage(err.message || 'Google sign-in failed.');
              setIsProcessing(false);
            });
          } else {
            setIsProcessing(false);
          }
        }
      } catch {
        // Cross-origin read security before redirect back to origin - safely ignore
      }
    }, 500);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Modal Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
          />

          {/* Card Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-full max-w-[440px] overflow-hidden rounded-lg border border-slate-200 bg-white text-[#111827] shadow-2xl z-10 font-sans"
          >
            {/* Close Button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 z-20 flex h-8 w-8 items-center justify-center rounded-full text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-800 focus:outline-none"
              aria-label="Close modal"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Content View */}
            <div className="px-7 py-7">
              {isComplete ? (
                <div className="py-10 text-center flex flex-col items-center">
                  <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                    <Check className="h-7 w-7 stroke-[2.5]" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-1.5">
                    {mode === 'signup' ? 'Welcome to PCR!' : 'Welcome back!'}
                  </h3>
                  <p className="text-sm text-gray-600">
                    Redirecting to your PCR code review console...
                  </p>
                </div>
              ) : (
                <>
                  {/* Alert Error / Status Messages */}
                  {errorMessage && (
                    <div className="mb-4 rounded-md bg-red-50 p-2.5 text-xs text-red-700 border border-red-200">
                      {errorMessage}
                    </div>
                  )}
                  {statusMessage && (
                    <div className="mb-4 rounded-md bg-emerald-50 p-2.5 text-xs text-emerald-800 border border-emerald-200">
                      {statusMessage}
                    </div>
                  )}

                  {/* SIGN UP VIEW */}
                  {mode === 'signup' && (
                    <div className="space-y-4">
                      {signUpStep === 'form' ? (
                        <>
                          {/* Header */}
                          <div className="pr-6">
                            <h2 className="text-2xl font-bold tracking-tight text-gray-900 leading-tight">
                              Join PCR now — it&apos;s free!
                            </h2>
                            <p className="mt-1 text-sm text-gray-600">
                              Start your 14-day free trial — no credit card required.
                            </p>
                          </div>

                          {/* Step 1 Form */}
                          <form onSubmit={handleSignUpInit} className="space-y-3.5 pt-1">
                            <div>
                              <label className="block text-xs font-semibold text-gray-700 mb-1">
                                Email address
                              </label>
                              <input
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="name@company.com"
                                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 transition-colors focus:border-[#15803d] focus:outline-none focus:ring-1 focus:ring-[#15803d]"
                              />
                            </div>

                            <div>
                              <label className="block text-xs font-semibold text-gray-700 mb-1">
                                Password (6+ characters)
                              </label>
                              <div className="relative flex items-center">
                                <input
                                  type={showPassword ? 'text' : 'password'}
                                  required
                                  minLength={6}
                                  value={password}
                                  onChange={(e) => setPassword(e.target.value)}
                                  placeholder="Create a strong password"
                                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 pr-16 text-sm text-gray-900 placeholder-gray-400 transition-colors focus:border-[#15803d] focus:outline-none focus:ring-1 focus:ring-[#15803d]"
                                />
                                <button
                                  type="button"
                                  onClick={() => setShowPassword(!showPassword)}
                                  className="absolute right-2.5 text-xs font-semibold text-[#15803d] hover:text-[#166534] focus:outline-none transition-colors px-1 py-0.5"
                                >
                                  {showPassword ? 'Hide' : 'Show'}
                                </button>
                              </div>
                            </div>

                            {/* Terms Text */}
                            <p className="text-[11px] leading-relaxed text-gray-500 pt-1">
                              By clicking Agree &amp; Continue, you agree to PCR&apos;s{' '}
                              <a
                                href="#terms"
                                onClick={(e) => e.preventDefault()}
                                className="font-semibold text-[#15803d] hover:underline"
                              >
                                User Agreement
                              </a>
                              ,{' '}
                              <a
                                href="#privacy"
                                onClick={(e) => e.preventDefault()}
                                className="font-semibold text-[#15803d] hover:underline"
                              >
                                Privacy Policy
                              </a>
                              , and{' '}
                              <a
                                href="#cookies"
                                onClick={(e) => e.preventDefault()}
                                className="font-semibold text-[#15803d] hover:underline"
                              >
                                Cookie Policy
                              </a>
                              .
                            </p>

                            {/* Primary Button */}
                            <button
                              type="submit"
                              disabled={isProcessing}
                              className="w-full rounded-full bg-[#15803d] hover:bg-[#166534] active:bg-[#14532d] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all duration-150 disabled:opacity-60 flex items-center justify-center cursor-pointer"
                            >
                              {isProcessing ? 'Sending Verification Code...' : 'Agree & Continue'}
                            </button>
                          </form>

                          {/* Divider */}
                          <div className="relative my-4 flex items-center justify-center">
                            <div className="w-full border-t border-gray-200" />
                            <span className="absolute bg-white px-3 text-xs text-gray-500">or</span>
                          </div>

                          {/* Social Auth */}
                          <div className="space-y-2.5">
                            <button
                              type="button"
                              disabled={isProcessing}
                              onClick={() => handleOAuthConnect('google')}
                              className="w-full flex items-center justify-center gap-2.5 rounded-full border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-400 transition-colors shadow-sm disabled:opacity-60"
                            >
                              <GoogleIcon className="h-4 w-4" />
                              <span>Continue with Google</span>
                            </button>

                            <button
                              type="button"
                              disabled={isProcessing}
                              onClick={() => handleOAuthConnect('github')}
                              className="w-full flex items-center justify-center gap-2.5 rounded-full border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-400 transition-colors shadow-sm disabled:opacity-60"
                            >
                              <GithubIcon className="h-4 w-4 text-gray-800" />
                              <span>Continue with GitHub</span>
                            </button>
                          </div>

                          {/* Footer Link */}
                          <div className="pt-2 text-center text-xs text-gray-600">
                            Already on PCR?{' '}
                            <button
                              type="button"
                              onClick={() => setMode('signin')}
                              className="font-semibold text-[#15803d] hover:text-[#166534] hover:underline transition-colors"
                            >
                              Sign in
                            </button>
                          </div>
                        </>
                      ) : (
                        /* Step 2: OTP Verification */
                        <div className="space-y-4">
                          <button
                            type="button"
                            onClick={() => setSignUpStep('form')}
                            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#15803d] hover:underline"
                          >
                            <ArrowLeft className="h-3.5 w-3.5" />
                            <span>Change Email</span>
                          </button>

                          <div>
                            <h2 className="text-xl font-bold tracking-tight text-gray-900 leading-tight">
                              Verify your email
                            </h2>
                            <p className="mt-1 text-xs text-gray-600">
                              We sent a 6-digit verification code to{' '}
                              <strong className="text-gray-900">{email}</strong>
                            </p>
                          </div>

                          <form onSubmit={handleVerifyOtp} className="space-y-4 pt-1">
                            <div>
                              <label className="block text-xs font-semibold text-gray-700 mb-1">
                                Enter 6-Digit OTP Code
                              </label>
                              <input
                                type="text"
                                maxLength={6}
                                required
                                value={otp}
                                onChange={(e) => setOtp(e.target.value)}
                                placeholder="123456"
                                className="w-full text-center tracking-[0.35em] font-mono text-lg rounded-md border border-gray-300 bg-white px-3 py-2.5 text-gray-900 placeholder-gray-300 transition-colors focus:border-[#15803d] focus:outline-none focus:ring-1 focus:ring-[#15803d]"
                              />
                            </div>

                            <button
                              type="submit"
                              disabled={isProcessing}
                              className="w-full rounded-full bg-[#15803d] hover:bg-[#166534] active:bg-[#14532d] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all duration-150 disabled:opacity-60 flex items-center justify-center cursor-pointer"
                            >
                              {isProcessing ? 'Verifying...' : 'Verify & Complete Registration'}
                            </button>
                          </form>

                          <div className="text-center pt-2">
                            <button
                              type="button"
                              onClick={handleSignUpInit}
                              disabled={isProcessing}
                              className="text-xs text-gray-500 hover:text-gray-900 hover:underline"
                            >
                              Didn&apos;t receive code? Resend OTP
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* SIGN IN VIEW */}
                  {(mode === 'signin' || mode === 'github') && (
                    <div className="space-y-4">
                      {/* Header */}
                      <div className="pr-6">
                        <h2 className="text-2xl font-bold tracking-tight text-gray-900 leading-tight">
                          Sign in
                        </h2>
                        <p className="mt-1 text-sm text-gray-600">
                          Stay updated on your codebase, reviews, and invariant audits.
                        </p>
                      </div>

                      {/* Social Auth (Top) */}
                      <div className="space-y-2.5 pt-1">
                        <button
                          type="button"
                          disabled={isProcessing}
                          onClick={() => handleOAuthConnect('google')}
                          className="w-full flex items-center justify-center gap-2.5 rounded-full border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-400 transition-colors shadow-sm disabled:opacity-60"
                        >
                          <GoogleIcon className="h-4 w-4" />
                          <span>Continue with Google</span>
                        </button>

                        <button
                          type="button"
                          disabled={isProcessing}
                          onClick={() => handleOAuthConnect('github')}
                          className="w-full flex items-center justify-center gap-2.5 rounded-full border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-400 transition-colors shadow-sm disabled:opacity-60"
                        >
                          <GithubIcon className="h-4 w-4 text-gray-800" />
                          <span>Continue with GitHub</span>
                        </button>
                      </div>

                      {/* Divider */}
                      <div className="relative my-3 flex items-center justify-center">
                        <div className="w-full border-t border-gray-200" />
                        <span className="absolute bg-white px-3 text-xs text-gray-500">or</span>
                      </div>

                      {/* Form */}
                      <form onSubmit={handleSignInSubmit} className="space-y-3.5">
                        <div>
                          <label className="block text-xs font-semibold text-gray-700 mb-1">
                            Email address
                          </label>
                          <input
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="name@company.com"
                            className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 transition-colors focus:border-[#15803d] focus:outline-none focus:ring-1 focus:ring-[#15803d]"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-gray-700 mb-1">
                            Password
                          </label>
                          <div className="relative flex items-center">
                            <input
                              type={showPassword ? 'text' : 'password'}
                              required
                              value={password}
                              onChange={(e) => setPassword(e.target.value)}
                              placeholder="Enter your password"
                              className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 pr-16 text-sm text-gray-900 placeholder-gray-400 transition-colors focus:border-[#15803d] focus:outline-none focus:ring-1 focus:ring-[#15803d]"
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className="absolute right-2.5 text-xs font-semibold text-[#15803d] hover:text-[#166534] focus:outline-none transition-colors px-1 py-0.5"
                            >
                              {showPassword ? 'Hide' : 'Show'}
                            </button>
                          </div>
                        </div>

                        {/* Dummy Captcha Checkbox */}
                        <div className="rounded-md border border-gray-200 bg-gray-50 p-2.5 flex items-center justify-between">
                          <label className="flex items-center gap-2 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={captchaVerified}
                              onChange={(e) => setCaptchaVerified(e.target.checked)}
                              className="h-4 w-4 rounded border-gray-300 text-[#15803d] focus:ring-[#15803d] accent-[#15803d] cursor-pointer"
                            />
                            <span className="text-xs font-medium text-gray-700">I am human (Security Check)</span>
                          </label>
                          <div className="flex items-center gap-1 text-[10px] text-gray-400 font-mono">
                            <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                            <span>PCR CAPTCHA</span>
                          </div>
                        </div>

                        {/* Remember me & Forgot Password */}
                        <div className="flex items-center justify-between pt-0.5">
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              id="signin-remember"
                              checked={rememberMe}
                              onChange={(e) => setRememberMe(e.target.checked)}
                              className="h-4 w-4 rounded border-gray-300 text-[#15803d] focus:ring-[#15803d] cursor-pointer accent-[#15803d]"
                            />
                            <label
                              htmlFor="signin-remember"
                              className="text-xs text-gray-700 cursor-pointer select-none"
                            >
                              Keep me signed in
                            </label>
                          </div>
                          <a
                            href="#forgot"
                            onClick={(e) => e.preventDefault()}
                            className="text-xs font-semibold text-[#15803d] hover:text-[#166534] hover:underline transition-colors"
                          >
                            Forgot password?
                          </a>
                        </div>

                        {/* Primary Sign In Button */}
                        <button
                          type="submit"
                          disabled={isProcessing}
                          className="w-full rounded-full bg-[#15803d] hover:bg-[#166534] active:bg-[#14532d] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all duration-150 disabled:opacity-60 flex items-center justify-center cursor-pointer"
                        >
                          {isProcessing ? 'Signing in...' : 'Sign in'}
                        </button>
                      </form>

                      {/* Footer Link */}
                      <div className="pt-2 text-center text-xs text-gray-600">
                        New to PCR?{' '}
                        <button
                          type="button"
                          onClick={() => setMode('signup')}
                          className="font-semibold text-[#15803d] hover:text-[#166534] hover:underline transition-colors"
                        >
                          Join now
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
