import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';

type AuthUser = { id: string; displayName: string | null; handle: string | null; zeroWalletAddress: string | null } | null;
const authState = {
  user: null as AuthUser,
  status: 'idle' as 'idle' | 'restoring',
  openLogin: vi.fn(),
  openCreate: vi.fn(),
  disconnect: vi.fn(),
};
vi.mock('@/features/auth/store', () => ({
  useAuthStore: (selector: (s: typeof authState) => unknown) => selector(authState),
}));
vi.mock('@/sites/wilderworld/marketplace/MarketHeader', () => ({
  MarketHeader: () => <div data-testid="market-header" />,
}));
vi.mock('./Wallets', () => ({
  default: () => <div data-testid="wallets" />,
}));
vi.mock('./Bridge', () => ({
  default: () => <div data-testid="bridge" />,
}));

import AccountPage from './AccountPage';

beforeEach(() => {
  authState.user = null;
  authState.status = 'idle';
  authState.openLogin.mockReset();
  authState.openCreate.mockReset();
  authState.disconnect.mockReset();
});

describe('AccountPage (minimal v1)', () => {
  it('shows ZERO sign in / create when signed out', () => {
    render(<AccountPage />);
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));
    expect(authState.openLogin).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: /create account/i }));
    expect(authState.openCreate).toHaveBeenCalledTimes(1);
  });

  it('shows the signed-in name and signs out via disconnect', () => {
    authState.user = { id: 'u1', displayName: 'Nova', handle: null, zeroWalletAddress: '0xabc' };
    render(<AccountPage />);
    expect(screen.getByRole('heading', { name: 'Nova' })).toBeInTheDocument();
    expect(screen.getByTestId('wallets')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /sign out/i }));
    expect(authState.disconnect).toHaveBeenCalledTimes(1);
  });

  it('keeps the bridge tab hidden for launch and shows Wallets directly', () => {
    authState.user = { id: 'u1', displayName: 'Nova', handle: null, zeroWalletAddress: '0xabc' };
    render(<AccountPage />);
    expect(screen.getByTestId('wallets')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Bridge' })).toBeNull();
    expect(screen.queryByTestId('bridge')).toBeNull();
  });

  it('shows Wallets and Portfolio account tabs when signed in, with Wallets current', () => {
    authState.user = { id: 'u1', displayName: 'Nova', handle: null, zeroWalletAddress: '0xabc' };
    render(<AccountPage />);
    const tabs = within(screen.getByRole('navigation', { name: 'Account sections' }));
    expect(tabs.getByRole('button', { name: 'Wallets' })).toHaveAttribute('aria-current', 'page');
    const portfolio = tabs.getByRole('link', { name: 'Portfolio' });
    expect(portfolio).toHaveAttribute('href', '/portfolio');
    expect(portfolio).not.toHaveAttribute('aria-current');
    expect(tabs.queryByRole('button', { name: 'Bridge' })).toBeNull();
  });

  it('shows no account tabs when signed out', () => {
    render(<AccountPage />);
    expect(screen.queryByRole('navigation', { name: 'Account sections' })).toBeNull();
  });

  it('shows a loading state while the session is restoring', () => {
    authState.status = 'restoring';
    render(<AccountPage />);
    expect(screen.getByRole('status')).toHaveTextContent(/opening your account/i);
  });
});
