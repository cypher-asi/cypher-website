import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('./client', () => ({
  register: vi.fn(),
  fetchSession: vi.fn(),
  requestOtp: vi.fn(),
  verifyOtp: vi.fn(),
  loginWithPassword: vi.fn(),
  logout: vi.fn(),
}));

import { useAuthStore } from './store';
import * as client from './client';

beforeEach(() => {
  vi.clearAllMocks();
  useAuthStore.setState({ user: null, status: 'idle', isModalOpen: false, mode: 'login', error: null });
});

describe('auth store — create account', () => {
  it('openCreate opens the modal in create mode; openLogin switches back to login', () => {
    useAuthStore.getState().openCreate();
    expect(useAuthStore.getState().isModalOpen).toBe(true);
    expect(useAuthStore.getState().mode).toBe('create');

    useAuthStore.getState().openLogin();
    expect(useAuthStore.getState().mode).toBe('login');
  });

  it('signUp success sets the user and closes the modal', async () => {
    const user = { id: 'u1', zeroWalletAddress: '0xabc', handle: null };
    vi.mocked(client.register).mockResolvedValue(user);
    useAuthStore.setState({ isModalOpen: true, mode: 'create' });

    const ok = await useAuthStore.getState().signUp('a@b.com', 'pw', 'Ada');

    expect(ok).toBe(true);
    expect(client.register).toHaveBeenCalledWith('a@b.com', 'pw', 'Ada');
    expect(useAuthStore.getState().user).toEqual(user);
    expect(useAuthStore.getState().isModalOpen).toBe(false);
    expect(useAuthStore.getState().status).toBe('idle');
  });

  it('signUp failure surfaces the error and stays signed out', async () => {
    vi.mocked(client.register).mockRejectedValue(new Error('Email already registered'));

    const ok = await useAuthStore.getState().signUp('a@b.com', 'pw');

    expect(ok).toBe(false);
    expect(useAuthStore.getState().user).toBeNull();
    expect(useAuthStore.getState().error).toBe('Email already registered');
    expect(useAuthStore.getState().status).toBe('idle');
  });
});
