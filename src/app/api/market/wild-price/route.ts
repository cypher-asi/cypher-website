import { NextResponse } from 'next/server';
import { readWildRate } from '@/lib/wild-price.server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/market/wild-price
 *
 * Indicative WILD -> USD market rate for DISPLAY ONLY, never a payment or
 * settlement quote (see wild-price.ts). Returns a WildRateResponse
 * `{ status, rate }`: status is 'fresh' | 'stale' | 'unavailable', rate is null
 * when unavailable.
 *
 * Thin pass-through to readWildRate(), which caches and rate-limits the upstream
 * calls (DefiLlama then CoinGecko) per isolate and never throws, degrading to
 * `{ status: 'unavailable', rate: null }`. Public and account-free: the client
 * calls it with credentials omitted, so no auth and no store. no-store keeps a
 * shared cache from pinning a rate past its freshness window; the per-isolate
 * cache in the service, not the CDN, is what protects the upstream APIs.
 */
export async function GET() {
  const result = await readWildRate();
  return NextResponse.json(result, { headers: { 'Cache-Control': 'no-store' } });
}
