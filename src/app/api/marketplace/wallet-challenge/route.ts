/**
 * GET /api/marketplace/wallet-challenge?address=<eoa> — mint a single-use SIWE
 * challenge (via zos-api) for the caller to sign with an external Ethereum
 * wallet, proving ownership before we link it to their ZERO account.
 *
 * The SIWE `domain` is set from this request's host (the marketplace's own
 * domain), never from client input.
 */
import { NextResponse } from 'next/server';
import { parseAddress, marketplaceErrorResponse, ValidationError } from '@/features/marketplace/http';
import { zosAuthedFetch, relayJson } from '@/features/marketplace/wallet-link';

export const dynamic = 'force-dynamic';

export async function GET(request: Request): Promise<NextResponse> {
  try {
    const url = new URL(request.url);
    const address = parseAddress(url.searchParams.get('address'), 'address');

    const domain = request.headers.get('host');
    if (!domain) throw new ValidationError('Missing host');

    const res = await zosAuthedFetch(
      request,
      `/api/v2/accounts/wallet-challenge?address=${encodeURIComponent(address)}&domain=${encodeURIComponent(domain)}`,
    );
    return await relayJson(res);
  } catch (err) {
    return marketplaceErrorResponse(err);
  }
}
