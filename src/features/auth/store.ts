'use client';

import { create } from 'zustand';
import type { AuthUser } from './types';
import * as client from './client';

type Status = 'idle' | 'restoring' | 'submitting';

interface AuthState {
  user: AuthUser | null;
  status: Status;
  isModalOpen: boolean;
  error: string | null;

  openLogin: () => void;
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
  error: null,

  openLogin: () => set({ isModalOpen: true, error: null }),
  closeLogin: () => set({ isModalOpen: false, error: null }),
  clearError: () => set({ error: null }),

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

  disconnect: async () => {
    // Clear locally first so the UI flips instantly; revoke in the background.
    set({ user: null, isModalOpen: false, error: null });
    await client.logout();
  },
}));
