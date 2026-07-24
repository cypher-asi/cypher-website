/**
 * Server-side proxy to zos-api's wallet endpoints, for the marketplace's
 * connect-and-associate flow (linking an external Ethereum EOA to a ZERO
 * account). The browser never holds the ZERO session token — it lives in an
 * httpOnly cookie — so these run server-side and forward the token as a Bearer,
 * mirroring features/marketplace/auth.ts.
 */
import { NextResponse } from 'next/server';
import { getSessionToken } from '../auth/session';
import { getMarketplaceConfig } from './config';
import { MarketplaceAuthError } from './auth';
import { MarketplaceError } from './http';

const FETCH_TIMEOUT_MS = 10_000;

/**
 * Forward an authenticated request to zos-api with the caller's ZERO session
 * token as a Bearer. Throws {@link MarketplaceAuthError} when there is no
 * session or the auth service is unreachable.
 */
export async function zosAuthedFetch(
  request: Request,
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  const token = getSessionToken(request);
  if (!token) throw new MarketplaceAuthError(401, 'Not signed in');

  const { zosApiUrl } = getMarketplaceConfig();
  try {
    return await fetch(`${zosApiUrl}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        ...init.headers,
      },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
  } catch {
    throw new MarketplaceAuthError(503, 'Authentication service unavailable');
  }
}

/**
 * Relay a zos-api JSON response (status + body) back to the browser unchanged.
 * These endpoints return caller-safe payloads (a challenge, a wallet list, an
 * ok), so passing the body through keeps zos-api's own error codes/messages.
 */
export async function relayJson(res: Response): Promise<NextResponse> {
  const text = await res.text();
  let body: unknown;
  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    throw new MarketplaceError(502, 'Malformed response from auth service');
  }
  return NextResponse.json(body, { status: res.status });
}
