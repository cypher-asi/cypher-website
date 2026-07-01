import { NextResponse } from 'next/server';

export const revalidate = 300;

/**
 * GET /api/market/eth-price
 * Returns the current ETH -> USD rate from CoinGecko's public API. On any
 * failure we return `{ usd: null }` so callers can gracefully fall back to
 * showing raw ETH values.
 */
export async function GET() {
  try {
    const res = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd',
      { next: { revalidate } }
    );
    if (!res.ok) return NextResponse.json({ usd: null });
    const data = (await res.json()) as { ethereum?: { usd?: number } };
    return NextResponse.json({ usd: data?.ethereum?.usd ?? null });
  } catch {
    return NextResponse.json({ usd: null });
  }
}
