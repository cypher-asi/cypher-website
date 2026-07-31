import { NextResponse } from 'next/server';
import { setSessionCookie } from '@/features/auth/session';
import {
  readHandoffToken,
  clearHandoffCookie,
  callbackUrl,
  requestOrigin,
  SESSION_TTL_SECONDS,
} from '@/features/marketplace/hosted-link';

export const dynamic = 'force-dynamic';

/**
 * GET /api/link-wallet/start — entry point for the hosted wallet-link flow.
 *
 * A native host injects a short-lived ZERO token as the hand-off cookie on this
 * origin, then loads this URL. We promote that token into the app's normal
 * httpOnly session cookie (capped short), so the existing marketplace wallet
 * proxies authenticate as the user, clear the hand-off, and forward to the
 * page. With no hand-off there is nothing to authenticate, so we bounce straight
 * to the callback with an error the host can surface and close on.
 */
export async function GET(request: Request) {
  const token = readHandoffToken(request);

  if (!token) {
    return NextResponse.redirect(callbackUrl(request, 'error', 'session_missing'));
  }

  const response = NextResponse.redirect(`${requestOrigin(request)}/link-wallet`);
  setSessionCookie(response, token, { maxAgeSeconds: SESSION_TTL_SECONDS });
  clearHandoffCookie(response);
  return response;
}
