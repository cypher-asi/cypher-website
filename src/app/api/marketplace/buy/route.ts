/**
 * POST /api/marketplace/buy — custodially buy an active listing, settled in
 * WILD. Authenticate the ZERO token → validate input → execute the buy (approve
 * the authoritative on-chain price + buy) as one sponsored, atomically-batched
 * UserOp.
 *
 * Body: { listingId: uint string }
 */
import { NextResponse } from 'next/server';
import { authenticate } from '@/features/marketplace/auth';
import { executeBuy } from '@/features/marketplace/trades';
import { marketplaceErrorResponse, parseUint, readJsonObject } from '@/features/marketplace/http';

export const dynamic = 'force-dynamic';

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const identity = await authenticate(request);
    const body = await readJsonObject(request);

    const listingId = parseUint(body.listingId, 'listingId', 0);

    const transactionHash = await executeBuy(identity, listingId);
    return NextResponse.json({ ok: true, transactionHash });
  } catch (err) {
    return marketplaceErrorResponse(err);
  }
}
