import { describe, it, expect, vi, beforeEach, type MockedFunction } from 'vitest';

// The route's module chain pulls in the server-only marketplace config; neutralize
// the `server-only` guard so it can load under vitest's jsdom environment.
vi.mock('server-only', () => ({}));

vi.mock('@/features/marketplace/wallet-link', async (importActual) => {
  const actual = await importActual<typeof import('@/features/marketplace/wallet-link')>();
  return { ...actual, fetchLinkedWallets: vi.fn() };
});

import { fetchLinkedWallets } from '@/features/marketplace/wallet-link';
import { MarketplaceAuthError } from '@/features/marketplace/auth';
import { GET } from './route';

const mocked = fetchLinkedWallets as MockedFunction<typeof fetchLinkedWallets>;

beforeEach(() => mocked.mockReset());

describe('GET /api/marketplace/wallets', () => {
  it('returns the caller linked wallets', async () => {
    mocked.mockResolvedValueOnce([{ id: 'w1', publicAddress: '0xabc', canAuthenticate: false }]);

    const res = await GET(new Request('http://localhost/api/marketplace/wallets'));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      wallets: [{ id: 'w1', publicAddress: '0xabc', canAuthenticate: false }],
    });
  });

  it('maps an upstream failure to its status', async () => {
    mocked.mockRejectedValueOnce(new MarketplaceAuthError(401, 'Not signed in'));
    const res = await GET(new Request('http://localhost/api/marketplace/wallets'));
    expect(res.status).toBe(401);
  });
});
