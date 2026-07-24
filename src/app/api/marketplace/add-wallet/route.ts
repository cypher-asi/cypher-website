/**
 * POST /api/marketplace/add-wallet — link an external Ethereum EOA to the
 * caller's ZERO account by submitting a signed wallet-link challenge (via
 * zos-api), proving ownership non-replayably.
 *
 * Body: { message, signature, confirm? }. We force `canAuthenticate: false` —
 * linking a wallet to read its assets must not silently turn it into a login
 * method. `confirm: true` re-submits when the wallet is already linked to
 * another account (zos-api returns WALLET_LINKED_TO_ANOTHER_ACCOUNT first).
 */
import { NextResponse } from 'next/server';
import { readJsonObject, marketplaceErrorResponse, ValidationError } from '@/features/marketplace/http';
import { zosAuthedFetch, relayJson } from '@/features/marketplace/wallet-link';

export const dynamic = 'force-dynamic';

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const body = await readJsonObject(request);
    const { message, signature, confirm } = body;

    if (typeof message !== 'string' || typeof signature !== 'string') {
      throw new ValidationError('message and signature are required');
    }

    const res = await zosAuthedFetch(request, '/api/v2/accounts/add-wallet', {
      method: 'POST',
      body: JSON.stringify({
        message,
        signature,
        canAuthenticate: false,
        ...(confirm === true ? { confirm: true } : {}),
      }),
    });
    return await relayJson(res);
  } catch (err) {
    return marketplaceErrorResponse(err);
  }
}
