/**
 * GET /api/marketplace/wallets — the caller's linked external Ethereum EOAs
 * (the ZERO custodial wallet is excluded). Used to show already-linked wallets
 * in the market UI and to drive add/remove.
 */
import { NextResponse } from 'next/server';
import { marketplaceErrorResponse } from '@/features/marketplace/http';
import { fetchLinkedWallets } from '@/features/marketplace/wallet-link';

export const dynamic = 'force-dynamic';

export async function GET(request: Request): Promise<NextResponse> {
  try {
    const wallets = await fetchLinkedWallets(request);
    return NextResponse.json({ wallets });
  } catch (err) {
    return marketplaceErrorResponse(err);
  }
}
