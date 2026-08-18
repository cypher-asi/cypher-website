import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

const h = vi.hoisted(() => ({
  user: null as null | { zeroWalletAddress: string | null; handle: string | null },
  openLogin: vi.fn(),
  disconnect: vi.fn(() => Promise.resolve()),
}));

vi.mock('./store', () => ({
  useAuthStore: (selector: (s: unknown) => unknown) =>
    selector({ user: h.user, openLogin: h.openLogin, disconnect: h.disconnect }),
}));

import { ZeroAuthButton } from './ZeroAuthButton';

const WALLET = '0x1234567890abcdef1234567890abcdef12345678';

beforeEach(() => {
  h.user = null;
  h.openLogin.mockReset();
  h.disconnect.mockReset().mockResolvedValue(undefined);
});

describe('ZeroAuthButton', () => {
  it('signed out: Connect opens the login modal', () => {
    render(<ZeroAuthButton />);
    fireEvent.click(screen.getByRole('button', { name: 'Connect' }));
    expect(h.openLogin).toHaveBeenCalledTimes(1);
  });

  it('signed in: shows the wallet and Disconnect calls disconnect', () => {
    h.user = { zeroWalletAddress: WALLET, handle: null };
    render(<ZeroAuthButton />);
    expect(screen.getByText('0x1234…5678')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Disconnect' }));
    expect(h.disconnect).toHaveBeenCalledTimes(1);
  });

  it('runs onDisconnect after disconnect when provided', () => {
    h.user = { zeroWalletAddress: WALLET, handle: null };
    const onDisconnect = vi.fn();
    render(<ZeroAuthButton onDisconnect={onDisconnect} />);
    fireEvent.click(screen.getByRole('button', { name: 'Disconnect' }));
    expect(h.disconnect).toHaveBeenCalledTimes(1);
    expect(onDisconnect).toHaveBeenCalledTimes(1);
  });
});
