import { describe, it, expect, vi, beforeEach } from 'vitest';

const h = vi.hoisted(() => ({ readWildRate: vi.fn() }));
vi.mock('@/lib/wild-price.server', () => ({ readWildRate: h.readWildRate }));

import { GET } from './route';

const freshRate = {
  status: 'fresh',
  rate: {
    symbol: 'WILD',
    currency: 'USD',
    chainId: 1,
    contract: '0x2a3bff78b79a009976eea096a51a948a3dc00e34',
    coingeckoId: 'wilder-world',
    provider: 'coingecko',
    sourceUrl: 'https://example/price',
    usdPerWild: '0.008729854951477123',
    sourceUpdatedAt: '2026-11-10T19:43:05.000Z',
    fetchedAt: '2026-11-10T19:43:09.175Z',
    expiresAt: '2026-11-10T19:58:05.000Z',
  },
};

beforeEach(() => h.readWildRate.mockReset());

describe('GET /api/market/wild-price', () => {
  it('passes the service rate response straight through as JSON', async () => {
    h.readWildRate.mockResolvedValue(freshRate);
    const res = await GET();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(freshRate);
  });

  it('is never cached by a shared store, since the rate has its own freshness window', async () => {
    h.readWildRate.mockResolvedValue(freshRate);
    const res = await GET();
    expect(res.headers.get('cache-control')).toContain('no-store');
  });

  it('relays an unavailable rate without inventing one', async () => {
    h.readWildRate.mockResolvedValue({ status: 'unavailable', rate: null });
    const res = await GET();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: 'unavailable', rate: null });
  });
});
