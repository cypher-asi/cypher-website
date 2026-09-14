import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';

const h = vi.hoisted(() => ({
  user: null as { handle: string | null; displayName: string | null } | null,
}));

vi.mock('./store', () => ({
  useAuthStore: (selector: (s: unknown) => unknown) => selector({ user: h.user }),
}));

import { CheckoutIdentity } from './CheckoutIdentity';

const WALLET = '0x89c1000000000000000000000000000000d457c3';
const epic = { providerName: 'epic-games', providerId: 'p1', handle: 'SuddenCereal5633' };

const respondWith = (accounts: unknown[], ok = true) =>
  vi.fn(
    async () =>
      new Response(ok ? JSON.stringify({ accounts }) : '{}', { status: ok ? 200 : 502 }),
  );

beforeEach(() => {
  h.user = { handle: 'gregz12344566@zero.tech', displayName: 'Greg' };
  vi.stubGlobal('fetch', respondWith([]));
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('CheckoutIdentity', () => {
  it('names the account being bought on, so a second one is obvious', async () => {
    // An email-created account carries its email as the handle and an Epic one
    // carries the Epic username, which is what makes the two distinguishable.
    render(<CheckoutIdentity walletAddress={WALLET} />);

    expect(screen.getByText('Greg')).toBeInTheDocument();
  });

  it('falls back to the handle when the account has never been named', () => {
    // Email-created accounts carry their email as the handle, which is still a
    // far better check than an address.
    h.user = { handle: 'gregz12344566@zero.tech', displayName: null };

    render(<CheckoutIdentity walletAddress={WALLET} />);

    expect(screen.getByText('gregz12344566@zero.tech')).toBeInTheDocument();
  });

  it('drops the name row when there is no handle, rather than repeating the wallet', () => {
    h.user = { handle: null, displayName: null };

    render(<CheckoutIdentity walletAddress={WALLET} />);

    expect(screen.queryByText(/signed in as/i)).toBeNull();
    // The wallet still shows once, under Delivering to.
    expect(screen.getAllByText('0x89c1…57c3')).toHaveLength(1);
  });

  it('links the wallet through to its holdings, which is the real check', async () => {
    render(<CheckoutIdentity walletAddress={WALLET} />);

    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', `https://zscan.live/address/${WALLET}?tab=tokens`);
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', expect.stringContaining('noopener'));
  });

  it('names the connected Epic account', async () => {
    vi.stubGlobal('fetch', respondWith([epic]));

    render(<CheckoutIdentity walletAddress={WALLET} />);

    expect(await screen.findByText('SuddenCereal5633')).toBeInTheDocument();
  });

  it('says plainly when Epic is not connected', async () => {
    render(<CheckoutIdentity walletAddress={WALLET} />);

    expect(await screen.findByText(/not connected/i)).toBeInTheDocument();
  });

  it('says nothing about Epic while the check is still running', () => {
    vi.stubGlobal('fetch', vi.fn(() => new Promise(() => {})));

    render(<CheckoutIdentity walletAddress={WALLET} />);

    // Appearing late, mid-purchase, would be worse than not appearing.
    expect(screen.queryByText(/epic games/i)).toBeNull();
  });

  it('says nothing about Epic when the check fails rather than guessing', async () => {
    vi.stubGlobal('fetch', respondWith([], false));

    render(<CheckoutIdentity walletAddress={WALLET} />);

    await waitFor(() => expect(screen.queryByText(/not connected/i)).toBeNull());
    expect(screen.queryByText(/epic games/i)).toBeNull();
  });

  it('still renders without a wallet rather than breaking the panel', () => {
    render(<CheckoutIdentity walletAddress={null} />);

    expect(screen.getByText(/your zero wallet/i)).toBeInTheDocument();
    expect(screen.queryByRole('link')).toBeNull();
  });
});
