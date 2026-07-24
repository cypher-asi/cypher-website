import { describe, it, expect, vi, beforeEach, type MockedFunction } from 'vitest';

// The route's module chain pulls in the server-only marketplace config; neutralize
// the `server-only` guard so it can load under vitest's jsdom environment.
vi.mock('server-only', () => ({}));

vi.mock('@/features/marketplace/wallet-link', async (importActual) => {
  const actual = await importActual<typeof import('@/features/marketplace/wallet-link')>();
  return { ...actual, zosAuthedFetch: vi.fn() };
});

import { zosAuthedFetch } from '@/features/marketplace/wallet-link';
import { MarketplaceAuthError } from '@/features/marketplace/auth';
import { DELETE } from './route';

const mocked = zosAuthedFetch as MockedFunction<typeof zosAuthedFetch>;

function del(walletId: string): [Request, { params: Promise<{ walletId: string }> }] {
  return [
    new Request(`http://localhost/api/marketplace/wallets/${walletId}`, { method: 'DELETE' }),
    { params: Promise.resolve({ walletId }) },
  ];
}

beforeEach(() => mocked.mockReset());

describe('DELETE /api/marketplace/wallets/:walletId', () => {
  it('forwards the delete to zos-api and relays the result', async () => {
    mocked.mockResolvedValueOnce(new Response(JSON.stringify({ primaryZID: null }), { status: 200 }));

    const res = await DELETE(...del('w1'));

    expect(res.status).toBe(200);
    const [, path, init] = mocked.mock.calls[0];
    expect(path).toBe('/api/v2/accounts/wallets/w1');
    expect(init?.method).toBe('DELETE');
  });

  it('maps an upstream failure to its status', async () => {
    mocked.mockRejectedValueOnce(new MarketplaceAuthError(401, 'Not signed in'));
    const res = await DELETE(...del('w1'));
    expect(res.status).toBe(401);
  });

  it('rejects an empty walletId with 400 and does not call zos-api', async () => {
    const res = await DELETE(...del(''));
    expect(res.status).toBe(400);
    expect(mocked).not.toHaveBeenCalled();
  });
});
