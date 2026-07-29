import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, cleanup, waitFor } from '@testing-library/react';

const h = vi.hoisted(() => ({ restore: vi.fn(), openLoginWithError: vi.fn() }));

vi.mock('./store', () => ({
  useAuthStore: (selector: (s: unknown) => unknown) =>
    selector({ restore: h.restore, openLoginWithError: h.openLoginWithError }),
}));
vi.mock('./ZeroLoginModal', () => ({ ZeroLoginModal: () => null }));

import { AuthProvider } from './AuthProvider';

afterEach(() => {
  cleanup();
  h.restore.mockReset();
  h.openLoginWithError.mockReset();
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

  it('does nothing when there is no authError param', async () => {
    window.history.replaceState(null, '', '/market');
    render(<AuthProvider>content</AuthProvider>);
    await waitFor(() => expect(h.restore).toHaveBeenCalled());
    expect(h.openLoginWithError).not.toHaveBeenCalled();
  });
});
