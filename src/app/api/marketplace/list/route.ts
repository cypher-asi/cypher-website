/**
 * POST /api/marketplace/list — custodially list a ZERO user's NFT for a fixed
 * WILD price. Authenticate the ZERO token → validate input → execute the list
 * (approve + escrow-and-list) as one sponsored, atomically-batched UserOp.
 *
 * Body: { nftContract: address, tokenId: uint string, amount: uint string,
 *         price: uint string }
 */
import { NextResponse } from 'next/server';
import { authenticate } from '@/features/marketplace/auth';
import { executeList } from '@/features/marketplace/trades';
import {
  marketplaceErrorResponse,
  parseAddress,
  parseUint,
  readJsonObject,
} from '@/features/marketplace/http';

export const dynamic = 'force-dynamic';

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const identity = await authenticate(request);
    const body = await readJsonObject(request);

    const nftContract = parseAddress(body.nftContract, 'nftContract');
    const tokenId = parseUint(body.tokenId, 'tokenId', 0);
    const amount = parseUint(body.amount, 'amount', 1);
    const price = parseUint(body.price, 'price', 1);

    const transactionHash = await executeList(identity, { nftContract, tokenId, amount, price });
    return NextResponse.json({ ok: true, transactionHash });
  } catch (err) {
    return marketplaceErrorResponse(err);
  }
}
