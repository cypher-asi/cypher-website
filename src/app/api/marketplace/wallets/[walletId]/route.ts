/**
 * DELETE /api/marketplace/wallets/:walletId — unlink an external Ethereum EOA
 * from the caller's ZERO account. zos-api enforces ownership and guards against
 * removing a Thirdweb wallet or the user's only auth method.
 */
import { NextResponse } from 'next/server';
import { marketplaceErrorResponse, ValidationError } from '@/features/marketplace/http';
import { zosAuthedFetch, relayJson } from '@/features/marketplace/wallet-link';

export const dynamic = 'force-dynamic';

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ walletId: string }> },
): Promise<NextResponse> {
  try {
    const { walletId } = await params;
    if (!walletId) throw new ValidationError('walletId is required');

    const res = await zosAuthedFetch(
      request,
      `/api/v2/accounts/wallets/${encodeURIComponent(walletId)}`,
      { method: 'DELETE' },
    );
    return await relayJson(res);
  } catch (err) {
    return marketplaceErrorResponse(err);
  }
}
