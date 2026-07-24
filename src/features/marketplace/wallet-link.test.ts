import { describe, it, expect, vi, afterEach } from 'vitest';

vi.mock('@/features/marketplace/config', () => ({
  getMarketplaceConfig: () => ({ zosApiUrl: 'https://zos.example' }),
}));

import { zosAuthedFetch } from './wallet-link';
import { MarketplaceAuthError } from './auth';

function requestWith(token?: string): Request {
  const headers: Record<string, string> = {};
  if (token) headers.authorization = `Bearer ${token}`;
  return new Request('http://localhost/x', { headers });
}

describe('zosAuthedFetch', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('throws 401 when there is no session token', async () => {
    const err = await zosAuthedFetch(requestWith(), '/api/v2/accounts/wallets').catch((e) => e);
    expect(err).toBeInstanceOf(MarketplaceAuthError);
    expect(err.statusCode).toBe(401);
  });

  it('forwards the session token to zos-api as a Bearer', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('{}', { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    await zosAuthedFetch(requestWith('tok123'), '/api/v2/accounts/wallets');

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://zos.example/api/v2/accounts/wallets');
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer tok123');
  });

  it('throws 503 when the auth service is unreachable', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('down')));
    const err = await zosAuthedFetch(requestWith('tok'), '/x').catch((e) => e);
    expect(err).toBeInstanceOf(MarketplaceAuthError);
    expect(err.statusCode).toBe(503);
  });
});
