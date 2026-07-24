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
import { GET } from './route';

const mocked = zosAuthedFetch as MockedFunction<typeof zosAuthedFetch>;
const ADDRESS = '0x1111111111111111111111111111111111111111';

beforeEach(() => mocked.mockReset());

describe('GET /api/marketplace/wallet-challenge', () => {
  it('mints a challenge (host as domain) and relays it', async () => {
    mocked.mockResolvedValueOnce(new Response(JSON.stringify({ message: 'siwe', nonce: 'abc' }), { status: 200 }));

    const req = new Request(`http://localhost/api/marketplace/wallet-challenge?address=${ADDRESS}`, {
      headers: { host: 'wilderworld.com' },
    });
    const res = await GET(req);

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ message: 'siwe', nonce: 'abc' });

    const path = mocked.mock.calls[0][1];
    expect(path).toContain('/api/v2/accounts/wallet-challenge');
    expect(path).toContain(`address=${ADDRESS}`);
    expect(path).toContain('domain=wilderworld.com');
  });

  it('rejects a missing/invalid address with 400', async () => {
    const req = new Request('http://localhost/api/marketplace/wallet-challenge', { headers: { host: 'x' } });
    const res = await GET(req);
    expect(res.status).toBe(400);
    expect(mocked).not.toHaveBeenCalled();
  });

  it('maps an upstream auth failure to its status', async () => {
    mocked.mockRejectedValueOnce(new MarketplaceAuthError(401, 'Not signed in'));
    const req = new Request(`http://localhost/api/marketplace/wallet-challenge?address=${ADDRESS}`, {
      headers: { host: 'x' },
    });
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it('returns 502 when the upstream response is not JSON', async () => {
    mocked.mockResolvedValueOnce(new Response('<html>gateway error</html>', { status: 200 }));
    const req = new Request(`http://localhost/api/marketplace/wallet-challenge?address=${ADDRESS}`, {
      headers: { host: 'x' },
    });
    const res = await GET(req);
    expect(res.status).toBe(502);
  });
});
