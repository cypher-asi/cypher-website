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
import { POST } from './route';

const mocked = zosAuthedFetch as MockedFunction<typeof zosAuthedFetch>;

function post(body: unknown): Request {
  return new Request('http://localhost/api/marketplace/add-wallet', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

beforeEach(() => mocked.mockReset());

describe('POST /api/marketplace/add-wallet', () => {
  it('forwards message+signature with canAuthenticate:false and relays', async () => {
    mocked.mockResolvedValueOnce(new Response(JSON.stringify({ wallet: { id: 'w1' } }), { status: 200 }));

    const res = await POST(post({ message: 'm', signature: 's' }));

    expect(res.status).toBe(200);
    const [, path, init] = mocked.mock.calls[0];
    expect(path).toBe('/api/v2/accounts/add-wallet');
    expect(init?.method).toBe('POST');
    const sent = JSON.parse(init?.body as string);
    expect(sent).toMatchObject({ message: 'm', signature: 's', canAuthenticate: false });
    expect(sent.confirm).toBeUndefined();
  });

  it('passes confirm:true through for the transfer flow', async () => {
    mocked.mockResolvedValueOnce(new Response('{}', { status: 200 }));

    await POST(post({ message: 'm', signature: 's', confirm: true }));

    const init = mocked.mock.calls[0][2];
    expect(JSON.parse(init?.body as string).confirm).toBe(true);
  });

  it('rejects a body missing message/signature with 400', async () => {
    const res = await POST(post({ message: 'm' }));
    expect(res.status).toBe(400);
    expect(mocked).not.toHaveBeenCalled();
  });

  it('maps an upstream auth failure to its status', async () => {
    mocked.mockRejectedValueOnce(new MarketplaceAuthError(401, 'Not signed in'));
    const res = await POST(post({ message: 'm', signature: 's' }));
    expect(res.status).toBe(401);
  });
});
