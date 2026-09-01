'use client';

import { create } from 'zustand';
import type { AuthUser } from './types';
import * as client from './client';

type Status = 'idle' | 'restoring' | 'submitting';

interface AuthState {
  user: AuthUser | null;
  status: Status;
  isModalOpen: boolean;
  /** Which form the modal shows: sign in, or create a new account. */
  mode: 'login' | 'create';
  error: string | null;
  /** A non-failure message shown alongside the provider buttons. */
  notice: string | null;

  openLogin: () => void;
  /** Open the modal in create-account mode. */
  openCreate: () => void;
  /** Open the login modal showing an error (e.g. a failed social-login redirect). */
  openLoginWithError: (message: string) => void;
  /** Open the modal in create mode carrying a notice. For when signing in cannot
   * succeed because there is no account yet: nothing failed, so it is not an
   * error, and retrying is pointless. Kept apart from `error` so it can be shown
   * on the provider-first screen, which has no error of its own to render. */
  openCreateWithNotice: (message: string) => void;
  closeLogin: () => void;
  clearError: () => void;

  /** Hydrate from the session cookie on load. */
  restore: () => Promise<void>;
  /** Email a login code. Returns true on success. */
  requestCode: (email: string) => Promise<boolean>;
  /** Verify a code → sign in. Returns true on success. */
  verifyCode: (email: string, code: string) => Promise<boolean>;
  /** Email + password → sign in. Returns true on success. */
  signInWithPassword: (email: string, password: string) => Promise<boolean>;
  /** Create a new ZERO account (email + password). Returns true on success. */
  signUp: (email: string, password: string, name?: string) => Promise<boolean>;
  /** Full disconnect — clears the user and revokes the session. */
  disconnect: () => Promise<void>;
}

function message(error: unknown): string {
  return error instanceof Error && error.message ? error.message : 'Something went wrong';
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  status: 'idle',
  isModalOpen: false,
  mode: 'login',
  error: null,
  notice: null,

  openLogin: () => set({ isModalOpen: true, mode: 'login', error: null, notice: null }),
  openCreate: () => set({ isModalOpen: true, mode: 'create', error: null, notice: null }),
  openLoginWithError: (msg) =>
    set({ isModalOpen: true, mode: 'login', error: msg, notice: null }),
  openCreateWithNotice: (msg) =>
    set({ isModalOpen: true, mode: 'create', error: null, notice: msg }),
  closeLogin: () => set({ isModalOpen: false, error: null, notice: null }),
  clearError: () => set({ error: null, notice: null }),

  restore: async () => {
    set({ status: 'restoring' });
    const user = await client.fetchSession();
    set({ user, status: 'idle' });
  },

  requestCode: async (email) => {
    set({ status: 'submitting', error: null });
    try {
      await client.requestOtp(email);
      set({ status: 'idle' });
      return true;
    } catch (error) {
      set({ status: 'idle', error: message(error) });
      return false;
    }
  },

  verifyCode: async (email, code) => {
    set({ status: 'submitting', error: null });
    try {
      const user = await client.verifyOtp(email, code);
      set({ user, status: 'idle', isModalOpen: false });
      return true;
    } catch (error) {
      set({ status: 'idle', error: message(error) });
      return false;
    }
  },

  signInWithPassword: async (email, password) => {
    set({ status: 'submitting', error: null });
    try {
      const user = await client.loginWithPassword(email, password);
      set({ user, status: 'idle', isModalOpen: false });
      return true;
    } catch (error) {
      set({ status: 'idle', error: message(error) });
      return false;
    }
  },

  signUp: async (email, password, name) => {
    set({ status: 'submitting', error: null });
    try {
      const user = await client.register(email, password, name);
      set({ user, status: 'idle', isModalOpen: false });
      return true;
    } catch (error) {
      set({ status: 'idle', error: message(error) });
      return false;
    }
  },

  disconnect: async () => {
    // Clear locally first so the UI flips instantly; revoke in the background.
    set({ user: null, isModalOpen: false, error: null });
    await client.logout();
  },
}));
