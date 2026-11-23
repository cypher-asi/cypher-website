import { describe, it, expect, vi } from 'vitest';
import { parseWildRate, createWildRateService } from './wild-price.server';
import { WILD_PRICE_ID } from './wild-price';

// A fixed clock so freshness is deterministic. Fixtures are shaped exactly like
// the real DefiLlama / CoinGecko responses (verified live), with timestamps set
// relative to NOW so we control fresh vs too-old.
const NOW_MS = 1_700_000_000_000;
const NOW_SEC = NOW_MS / 1000;
const clock = () => NOW_MS;

const DEFILLAMA_KEY = `ethereum:${WILD_PRICE_ID.contract}`;

function defillama(priceUsd: number, tsSec: number) {
  return { coins: { [DEFILLAMA_KEY]: { decimals: 18, symbol: 'WILD', price: priceUsd, timestamp: tsSec, confidence: 0.99 } } };
}
function coingecko(priceUsd: number, tsSec: number) {
  return { 'wilder-world': { usd: priceUsd, last_updated_at: tsSec } };
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status });
}

describe('parseWildRate', () => {
  it('parses a live-shaped DefiLlama response into a fresh rate', () => {
    const rate = parseWildRate(defillama(0.0087, NOW_SEC - 60), 'defillama', NOW_MS);
    expect(rate).not.toBeNull();
    expect(rate).toMatchObject({ provider: 'defillama', symbol: 'WILD', usdPerWild: '0.0087' });
  });

  it('parses a live-shaped CoinGecko response into a rate', () => {
    const rate = parseWildRate(coingecko(0.0087, NOW_SEC - 30), 'coingecko', NOW_MS);
    expect(rate).toMatchObject({ provider: 'coingecko', usdPerWild: '0.0087' });
  });

  it('rejects a quote older than the max age, rather than quoting a stale price', () => {
    // The exact flaky case: a provider returns a timestamp ~20 min old.
    expect(parseWildRate(defillama(0.0087, NOW_SEC - 1200), 'defillama', NOW_MS)).toBeNull();
  });

  it('rejects a low-confidence DefiLlama quote', () => {
    const low = { coins: { [DEFILLAMA_KEY]: { decimals: 18, symbol: 'WILD', price: 0.0087, timestamp: NOW_SEC - 60, confidence: 0.5 } } };
    expect(parseWildRate(low, 'defillama', NOW_MS)).toBeNull();
  });

  it('rejects a non-positive or malformed price', () => {
    expect(parseWildRate(defillama(0, NOW_SEC - 60), 'defillama', NOW_MS)).toBeNull();
    expect(parseWildRate({ coins: {} }, 'defillama', NOW_MS)).toBeNull();
    expect(parseWildRate(null, 'coingecko', NOW_MS)).toBeNull();
  });
});

describe('createWildRateService', () => {
  it('falls back to CoinGecko when DefiLlama is too stale (the case seen live)', async () => {
    const fetcher = vi.fn(async (url: RequestInfo | URL) =>
      String(url).includes('llama')
        ? jsonResponse(defillama(0.0087, NOW_SEC - 1200)) // 20 min old -> rejected
        : jsonResponse(coingecko(0.0088, NOW_SEC - 30)), // fresh
    ) as unknown as typeof fetch;

    const { read } = createWildRateService(fetcher, clock);
    const res = await read();
    expect(res.status).toBe('fresh');
    expect(res.rate?.provider).toBe('coingecko');
  });

  it('prefers DefiLlama when it is fresh, and does not even call CoinGecko', async () => {
    const fetcher = vi.fn(async (url: RequestInfo | URL) =>
      String(url).includes('llama')
        ? jsonResponse(defillama(0.0087, NOW_SEC - 60))
        : jsonResponse(coingecko(0.0088, NOW_SEC - 30)),
    ) as unknown as typeof fetch;

    const { read } = createWildRateService(fetcher, clock);
    const res = await read();
    expect(res.rate?.provider).toBe('defillama');
    expect((fetcher as ReturnType<typeof vi.fn>).mock.calls).toHaveLength(1); // CoinGecko not hit
  });

  it('returns unavailable (never throws) when both providers are down', async () => {
    const fetcher = vi.fn(async () => jsonResponse({}, 500)) as unknown as typeof fetch;
    const { read } = createWildRateService(fetcher, clock);
    await expect(read()).resolves.toEqual({ status: 'unavailable', rate: null });
  });

  it('serves a cached rate within the refresh window instead of re-fetching', async () => {
    const fetcher = vi.fn(async (url: RequestInfo | URL) =>
      jsonResponse(String(url).includes('llama') ? defillama(0.0087, NOW_SEC - 60) : coingecko(0.0088, NOW_SEC - 30)),
    ) as unknown as typeof fetch;

    const { read } = createWildRateService(fetcher, clock);
    await read();
    const callsAfterFirst = (fetcher as ReturnType<typeof vi.fn>).mock.calls.length;
    await read(); // same clock, within the refresh window
    expect((fetcher as ReturnType<typeof vi.fn>).mock.calls).toHaveLength(callsAfterFirst); // no extra fetch
  });
});
