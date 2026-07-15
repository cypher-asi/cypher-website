/**
 * POST /api/marketplace/cancel — custodially cancel the caller's own active
 * listing, returning the escrowed NFT. Authenticate the ZERO token → validate
 * input → execute the cancel as one sponsored UserOp. Seller-only is enforced
 * on-chain.
 *
 * Body: { listingId: uint string }
 */
import { NextResponse } from 'next/server';
import { authenticate } from '@/features/marketplace/auth';
import { executeCancel } from '@/features/marketplace/trades';
import { marketplaceErrorResponse, parseUint, readJsonObject } from '@/features/marketplace/http';

export const dynamic = 'force-dynamic';

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const identity = await authenticate(request);
    const body = await readJsonObject(request);

    const listingId = parseUint(body.listingId, 'listingId', 0);

    const transactionHash = await executeCancel(identity, listingId);
    return NextResponse.json({ ok: true, transactionHash });
  } catch (err) {
    return marketplaceErrorResponse(err);
  }
}
