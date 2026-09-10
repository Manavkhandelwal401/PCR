/**
 * @file src/services/authService.ts
 * @description Frontend API client bridging React to the Spring Boot /api/v1/auth endpoints.
 */

import { apiClient } from '../api/apiClient';

export interface AuthResponse {
  success: boolean;
  message: string;
  token?: string | null;
  email?: string | null;
  role?: string | null;
  name?: string | null;
  username?: string | null;
}

export interface AuthCheckResponse {
  authenticated: boolean;
  email?: string | null;
  role?: string | null;
  message?: string | null;
  name?: string | null;
  username?: string | null;
  githubConnected?: boolean;
}

export interface UsernameCheckResult {
  available: boolean;
  username: string;
  message: string;
}



export const authService = {
  /**
   * Step 1: Send OTP to email during registration
   * POST /api/v1/auth/signup/send-otp
   */
  async sendSignUpOtp(email: string, password: string): Promise<AuthResponse> {
    try {
      const res = await apiClient.post<AuthResponse>('/auth/signup/send-otp', { email, password });
      return res.data;
    } catch (err: any) {
      let serverMsg = err.response?.data?.message || err.response?.data?.error;
      if (!serverMsg || serverMsg === 'Internal Server Error' || serverMsg.includes('500')) {
        serverMsg = 'Service temporarily unavailable. If you already have an account, please Sign In instead.';
      }
      throw new Error(serverMsg);
    }
  },

  /**
   * Step 2: Verify OTP and complete registration
   * POST /api/v1/auth/signup/verify
   */
  async verifySignUpOtp(email: string, otp: string, password: string): Promise<AuthResponse> {
    try {
      const res = await apiClient.post<AuthResponse>('/auth/signup/verify', { email, otp, password });
      const data = res.data;

      if (data.token) {
        localStorage.setItem('pcr_token', data.token);
        localStorage.setItem('pcr_user_email', data.email || email);
        if (data.name) localStorage.setItem('pcr_user_name', data.name);
        if (data.username) localStorage.setItem('pcr_user_username', data.username);
      }
      return data;
    } catch (err: any) {
      let serverMsg = err.response?.data?.message || err.response?.data?.error;
      if (!serverMsg || serverMsg === 'Internal Server Error') {
        serverMsg = 'OTP verification failed. Please check the code or request a new OTP.';
      }
      throw new Error(serverMsg);
    }
  },

  /**
   * Sign in with email, password, and optional captcha token
   * POST /api/v1/auth/signin
   */
  async signIn(email: string, password: string, captchaToken?: string): Promise<AuthResponse> {
    try {
      const res = await apiClient.post<AuthResponse>('/auth/signin', { email, password, captchaToken });
      const data = res.data;

      if (data.token) {
        // Clear previous user's name/username if different account
        const prevEmail = localStorage.getItem('pcr_user_email');
        if (prevEmail && prevEmail.toLowerCase() !== (data.email || email).toLowerCase()) {
          localStorage.removeItem('pcr_user_name');
          localStorage.removeItem('pcr_user_username');
        }
        localStorage.setItem('pcr_token', data.token);
        localStorage.setItem('pcr_user_email', data.email || email);
        if (data.name) localStorage.setItem('pcr_user_name', data.name);
        if (data.username) localStorage.setItem('pcr_user_username', data.username);
      }
      return data;
    } catch (err: any) {
      let serverMsg = err.response?.data?.message || err.response?.data?.error;
      if (!serverMsg || serverMsg === 'Internal Server Error') {
        serverMsg = 'Invalid email or password. Please verify your credentials.';
      }
      throw new Error(serverMsg);
    }
  },

  /**
   * Check if current stored token is valid
   * GET /api/v1/auth/auth-check
   */
  async checkAuth(): Promise<AuthCheckResponse> {
    const token = localStorage.getItem('pcr_token');
    if (!token) {
      return { authenticated: false, message: 'No local token found' };
    }

    try {
      const res = await apiClient.get<AuthCheckResponse>('/auth/auth-check');
      const data = res.data;
      if (data.name) localStorage.setItem('pcr_user_name', data.name);
      if (data.username) localStorage.setItem('pcr_user_username', data.username);
      return data;
    } catch {
      localStorage.removeItem('pcr_token');
      localStorage.removeItem('pcr_user_email');
      return { authenticated: false, message: 'Session expired' };
    }
  },

  /**
   * Check if a given username is available or taken
   * GET /api/v1/auth/username-check?username={username}&email={email}
   */
  async checkUsernameAvailability(username: string, email?: string): Promise<UsernameCheckResult> {
    try {
      const params: Record<string, string> = { username: username.trim() };
      if (email) params.email = email.trim();
      const res = await apiClient.get<UsernameCheckResult>('/auth/username-check', { params });
      return res.data;
    } catch {
      return {
        available: false,
        username,
        message: 'Could not verify username availability.',
      };
    }
  },

  /**
   * Update candidate profile Name and Username
   * PUT /api/v1/auth/profile
   */
  async updateProfile(name: string, username: string): Promise<AuthResponse> {
    try {
      const res = await apiClient.put<AuthResponse>('/auth/profile', {
        name: name.trim(),
        username: username.trim(),
      });
      const data = res.data;
      if (data.name) localStorage.setItem('pcr_user_name', data.name);
      if (data.username) localStorage.setItem('pcr_user_username', data.username);
      return data;
    } catch (err: any) {
      const serverMsg = err.response?.data?.message || err.response?.data?.error || err.message;
      throw new Error(serverMsg || 'Failed to update profile.');
    }
  },

  /**
   * Google Sign-in / Sign-up with Google credential (ID token)
   * POST /api/v1/auth/google/signin
   */
  async signInWithGoogle(credential: string): Promise<AuthResponse> {
    try {
      const res = await apiClient.post<AuthResponse>('/auth/google/signin', { credential });
      const data = res.data;

      if (data.token) {
        localStorage.setItem('pcr_token', data.token);
        if (data.email) localStorage.setItem('pcr_user_email', data.email);
        if (data.name) localStorage.setItem('pcr_user_name', data.name);
        if (data.username) localStorage.setItem('pcr_user_username', data.username);
      }
      return data;
    } catch (err: any) {
      const serverMsg = err.response?.data?.message || err.response?.data?.error || err.message;
      throw new Error(serverMsg || 'Google authentication failed.');
    }
  },

  /**
   * Generate secure OAuth state token for GitHub flow
   * GET /api/v1/auth/github/state
   */
  async getGithubOAuthState(): Promise<string> {
    const res = await apiClient.get<{ state: string }>('/auth/github/state');
    if (!res.data?.state) {
      throw new Error('Server did not return a valid signed OAuth state.');
    }
    return res.data.state;
  },

  /**
   * Clears local authentication state
   */
  signOut(): void {
    localStorage.removeItem('pcr_token');
    localStorage.removeItem('pcr_user_email');
    localStorage.removeItem('pcr_user_name');
    localStorage.removeItem('pcr_user_username');
  },
};
