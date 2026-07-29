import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, cleanup, waitFor } from '@testing-library/react';

vi.mock('./store', () => ({
  useAuthStore: (selector: (s: unknown) => unknown) =>
    selector({
      isModalOpen: true,
      status: 'idle',
      error: null,
      closeLogin: vi.fn(),
      clearError: vi.fn(),
      requestCode: vi.fn(),
      verifyCode: vi.fn(),
      signInWithPassword: vi.fn(),
    }),
}));

import { ZeroLoginModal } from './ZeroLoginModal';

function setUserAgent(ua: string) {
  Object.defineProperty(navigator, 'userAgent', { value: ua, configurable: true });
}

const DESKTOP = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Chrome/120 Safari/537.36';
const MOBILE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Mobile/15E Safari/604.1';

afterEach(cleanup);

describe('ZeroLoginModal — Epic Games (web-only)', () => {
  it('shows the Epic Games button on desktop', async () => {
    setUserAgent(DESKTOP);
    render(<ZeroLoginModal />);
    expect(await screen.findByRole('button', { name: /Continue with Epic Games/i })).toBeInTheDocument();
  });

  it('hides the Epic Games button on mobile', async () => {
    setUserAgent(MOBILE);
    render(<ZeroLoginModal />);
    // The modal renders (email/password UI present) but the Epic button does not.
    await screen.findByText('Sign in');
    await waitFor(() =>
      expect(screen.queryByRole('button', { name: /Continue with Epic Games/i })).not.toBeInTheDocument(),
    );
  });
});
