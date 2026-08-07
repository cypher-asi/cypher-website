import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

// Mutable auth state shared with the mocked store, varied per test.
const h = vi.hoisted(() => ({
  user: null as null | { id: string; zeroWalletAddress: string | null; handle: string | null },
  openLogin: vi.fn(),
  disconnect: vi.fn(),
}));

vi.mock('@/features/auth/store', () => ({
  useAuthStore: (selector: (s: unknown) => unknown) =>
    selector({ user: h.user, openLogin: h.openLogin, disconnect: h.disconnect }),
}));

import GhostlineCheckout from './GhostlineCheckout';
import { GHOSTLINE_PASSES } from './ghostline';

const pass = GHOSTLINE_PASSES[0];

beforeEach(() => {
  h.user = null;
  h.openLogin.mockReset();
  h.disconnect.mockReset();
});

describe('GhostlineCheckout — account step auth', () => {
  it('signed out: shows create-account and the Log in link opens the shared modal', () => {
    render(<GhostlineCheckout pass={pass} />);
    expect(screen.getByRole('heading', { name: 'Create your account' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Log in' }));
    expect(h.openLogin).toHaveBeenCalledTimes(1);
  });

  it('signed in: shows the zero wallet and Disconnect ends the session', () => {
    h.user = { id: 'u1', zeroWalletAddress: '0x1234567890abcdef1234567890abcdef12345678', handle: null };
    render(<GhostlineCheckout pass={pass} />);
    expect(screen.getByText('0x1234…5678')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Disconnect' }));
    expect(h.disconnect).toHaveBeenCalledTimes(1);
  });

  it('signed in without a wallet: falls back to the account handle', () => {
    h.user = { id: 'u1', zeroWalletAddress: null, handle: 'wilder.zero' };
    render(<GhostlineCheckout pass={pass} />);
    expect(screen.getByText('wilder.zero')).toBeInTheDocument();
  });
});
