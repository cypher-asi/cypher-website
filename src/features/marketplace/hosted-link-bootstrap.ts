/**
 * Server-only bootstrap for the hosted wallet flows. Promotes a host-injected
 * hand-off token into the app session cookie and redirects to an in-app
 * destination. Kept out of hosted-link.ts (which the client pages import for
 * completePath) so the session cookie code never reaches the client bundle.
 */
import { NextResponse } from 'next/server';
import { setSessionCookie } from '../auth/session';
import {
  readHandoffToken,
  clearHandoffCookie,
  callbackUrl,
  requestOrigin,
  SESSION_TTL_SECONDS,
} from './hosted-link';

/**
 * Read the hand-off cookie, promote it to the httpOnly session cookie (capped
 * short), clear the hand-off, and redirect to `destPath`. With no hand-off there
 * is nothing to authenticate, so bounce to the callback with an error the host
 * can surface and close on. Shared by the link and manage entry routes.
 */
export function bootstrapAndRedirect(request: Request, destPath: string): NextResponse {
  const token = readHandoffToken(request);
  if (!token) {
    return NextResponse.redirect(callbackUrl(request, 'error', 'session_missing'));
  }

  const response = NextResponse.redirect(`${requestOrigin(request)}${destPath}`);
  setSessionCookie(response, token, { maxAgeSeconds: SESSION_TTL_SECONDS });
  clearHandoffCookie(response);
  return response;
}
