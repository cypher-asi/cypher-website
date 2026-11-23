import { describe, it, expect, vi, beforeEach } from 'vitest';

// auth.ts pulls in the server-only marketplace config; neutralize the guard and
// stub the config + session so the identity resolution can be tested in isolation.
vi.mock('server-only', () => ({}));

const h = vi.hoisted(() => ({ getSessionToken: vi.fn(), getMarketplaceConfig: vi.fn() }));
vi.mock('../auth/session', () => ({ getSessionToken: h.getSessionToken }));
vi.mock('./config', () => ({ getMarketplaceConfig: h.getMarketplaceConfig }));

import { authenticate, MarketplaceAuthError } from './auth';

function req(): Request {
  return new Request('http://localhost/api/marketplace/buy', { method: 'POST' });
}

/** Resolve the MarketplaceAuthError a call throws, or fail if it did not throw. */
async function thrown(fn: () => Promise<unknown>): Promise<MarketplaceAuthError> {
  try {
    await fn();
  } catch (err) {
    return err as MarketplaceAuthError;
  }
  throw new Error('expected authenticate to throw, but it resolved');
}

beforeEach(() => {
  h.getSessionToken.mockReset().mockReturnValue('tok');
  h.getMarketplaceConfig.mockReset().mockReturnValue({ zosApiUrl: 'http://zos.test' });
  global.fetch = vi.fn(
    async () => new Response(JSON.stringify({ id: 'u1', zeroWalletAddress: '0xWALLET' }), { status: 200 }),
  ) as typeof fetch;
});

describe('authenticate', () => {
  it('resolves the userId and ZERO wallet from the validated token', async () => {
    const identity = await authenticate(req());
    expect(identity).toEqual({ userId: 'u1', zeroWalletAddress: '0xWALLET' });
    // The token is sent as a Bearer to zos-api, never trusted from the body.
    const init = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][1] as RequestInit;
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer tok');
  });

  it('rejects when not signed in, without calling the auth service', async () => {
    h.getSessionToken.mockReturnValueOnce(null);
    const err = await thrown(() => authenticate(req()));
    expect(err.statusCode).toBe(401);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('maps a 401 from the auth service to an invalid-token error', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(new Response('', { status: 401 }));
    expect((await thrown(() => authenticate(req()))).statusCode).toBe(401);
  });

  it('maps any other non-ok auth-service response to 503', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(new Response('', { status: 500 }));
    expect((await thrown(() => authenticate(req()))).statusCode).toBe(503);
  });

  it('maps an unreachable auth service to 503, never signing for an unknown identity', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('network down'));
    expect((await thrown(() => authenticate(req()))).statusCode).toBe(503);
  });

  it('maps a malformed auth-service body to 503', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(new Response('not json', { status: 200 }));
    expect((await thrown(() => authenticate(req()))).statusCode).toBe(503);
  });

  it('rejects a response that carries no user id', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      new Response(JSON.stringify({ zeroWalletAddress: '0xWALLET' }), { status: 200 }),
    );
    expect((await thrown(() => authenticate(req()))).statusCode).toBe(401);
  });

  it('rejects a user with no ZERO wallet with 409, so no custodial trade is attempted', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      new Response(JSON.stringify({ id: 'u1', zeroWalletAddress: null }), { status: 200 }),
    );
    expect((await thrown(() => authenticate(req()))).statusCode).toBe(409);
  });
});
