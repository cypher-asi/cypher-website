/**
 * GET /api/marketplace/balance — the authenticated ZERO wallet's WILD balance,
 * in raw base units (18-decimal string). Used to gate Buy on sufficient funds
 * and to surface the balance in the market UI. Auth-gated so it reads the
 * session wallet's own balance (the value itself is public on-chain data).
 */
import { NextResponse } from 'next/server';
import { authenticate } from '@/features/marketplace/auth';
import { readWildBalance } from '@/features/marketplace/wild';
import { marketplaceErrorResponse } from '@/features/marketplace/http';

export const dynamic = 'force-dynamic';

export async function GET(request: Request): Promise<NextResponse> {
  try {
    const identity = await authenticate(request);
    const balanceRaw = await readWildBalance(identity.zeroWalletAddress);
    return NextResponse.json({ ok: true, balanceRaw: balanceRaw.toString() });
  } catch (err) {
    return marketplaceErrorResponse(err);
  }
}
