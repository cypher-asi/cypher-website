import { describe, it, expect, vi, afterEach } from 'vitest';

vi.mock('@/features/marketplace/config', () => ({
  getMarketplaceConfig: () => ({ zosApiUrl: 'https://zos.example' }),
}));

import { zosAuthedFetch, fetchLinkedWallets } from './wallet-link';
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

describe('fetchLinkedWallets', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('returns external EOAs, excluding the custodial (isThirdWeb) wallet, lowercased', async () => {
    const upstream = [
      { id: 'custodial', publicAddress: '0xAAAA', isThirdWeb: true, canAuthenticate: true },
      { id: 'ext1', publicAddress: '0xBbBb', isThirdWeb: false, canAuthenticate: false },
    ];
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ wallets: upstream }), { status: 200 })));

    const wallets = await fetchLinkedWallets(requestWith('tok'));

    expect(wallets).toEqual([{ id: 'ext1', publicAddress: '0xbbbb', canAuthenticate: false }]);
  });

  it('throws with the upstream status on a non-ok response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('nope', { status: 500 })));
    const err = await fetchLinkedWallets(requestWith('tok')).catch((e) => e);
    expect(err.statusCode).toBe(500);
  });

  it('throws 502 when the wallets field is missing or not an array', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ wallets: 'nope' }), { status: 200 })));
    const err = await fetchLinkedWallets(requestWith('tok')).catch((e) => e);
    expect(err.statusCode).toBe(502);
  });

  it('throws 502 when the upstream body is not JSON', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('<html>err</html>', { status: 200 })));
    const err = await fetchLinkedWallets(requestWith('tok')).catch((e) => e);
    expect(err.statusCode).toBe(502);
  });
});
