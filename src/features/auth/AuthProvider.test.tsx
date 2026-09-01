import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, cleanup, waitFor } from '@testing-library/react';

const h = vi.hoisted(() => ({
  restore: vi.fn(),
  openLoginWithError: vi.fn(),
  openCreateWithNotice: vi.fn(),
}));

vi.mock('./store', () => ({
  useAuthStore: (selector: (s: unknown) => unknown) =>
    selector({
      restore: h.restore,
      openLoginWithError: h.openLoginWithError,
      openCreateWithNotice: h.openCreateWithNotice,
    }),
}));
vi.mock('./ZeroLoginModal', () => ({ ZeroLoginModal: () => null }));

import { AuthProvider } from './AuthProvider';

afterEach(() => {
  cleanup();
  h.restore.mockReset();
  h.openLoginWithError.mockReset();
  h.openCreateWithNotice.mockReset();
  window.history.replaceState(null, '', '/');
});

describe('AuthProvider — social-login error surfacing', () => {
  it('opens the login modal with an error and strips ?authError on load', async () => {
    window.history.replaceState(null, '', '/market?authError=social&x=1');

    render(<AuthProvider>content</AuthProvider>);

    await waitFor(() => expect(h.openLoginWithError).toHaveBeenCalled());
    // Param stripped, others preserved.
    expect(window.location.search).toBe('?x=1');
  });

  it('sends someone with no account to create, not back to a login that cannot work', async () => {
    // Epic authenticated fine; there is simply nothing behind it yet, so
    // "please try again" would be advice that can never succeed.
    window.history.replaceState(null, '', '/market?authError=no-account');

    render(<AuthProvider>content</AuthProvider>);

    await waitFor(() => expect(h.openCreateWithNotice).toHaveBeenCalled());
    expect(h.openCreateWithNotice.mock.calls[0][0]).toMatch(/No Wilder World account is linked/i);
    expect(h.openLoginWithError).not.toHaveBeenCalled();
    expect(window.location.search).toBe('');
  });

  it('ignores an authError value it does not recognise', async () => {
    window.history.replaceState(null, '', '/market?authError=something-else');

    render(<AuthProvider>content</AuthProvider>);

    await waitFor(() => expect(h.restore).toHaveBeenCalled());
    expect(h.openLoginWithError).not.toHaveBeenCalled();
    expect(h.openCreateWithNotice).not.toHaveBeenCalled();
  });

  it('does nothing when there is no authError param', async () => {
    window.history.replaceState(null, '', '/market');
    render(<AuthProvider>content</AuthProvider>);
    await waitFor(() => expect(h.restore).toHaveBeenCalled());
    expect(h.openLoginWithError).not.toHaveBeenCalled();
  });
});
