import { NextResponse } from 'next/server';
import { establishOauthSession } from '@/features/auth/zos';
import { setSessionCookie } from '@/features/auth/session';

export const dynamic = 'force-dynamic';

/**
 * GET /oauth/callback — where zos-api redirects back after a social-login
 * handshake, carrying a `sessionEstablishmentToken` (or an `error`).
 *
 * We exchange the token for an access token server-side and set it in the
 * httpOnly session cookie (same mechanism as email/OTP login), then bounce to
 * the market. On any failure we redirect with a flag the login UI can surface.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const sessionToken = searchParams.get('sessionEstablishmentToken');
  const error = searchParams.get('error');
  // Set when the handshake was started in a popup. The session cookie is still
  // established here exactly as before; only where we send the browser next
  // differs, because a popup has to report back and close rather than navigate
  // somewhere useful.
  const isPopup = searchParams.get('popup') === '1';

  // Build the redirect target from the Host header, not request.url — in a Next
  // route handler request.url reports the server bind host (e.g. localhost),
  // which would drop the brand subdomain the browser is actually on (and the
  // host-only session cookie is scoped to that real host).
  const host = request.headers.get('host') ?? new URL(request.url).host;
  const proto = request.headers.get('x-forwarded-proto') ?? (host.includes('localhost') ? 'http' : 'https');
  const redirectTo = (path: string) => NextResponse.redirect(`${proto}://${host}${path}`);

  const failure = () =>
    redirectTo(isPopup ? '/oauth/popup-done?status=error' : '/market?authError=social');

  // zos-api reports this when the provider authenticated but no ZERO account is
  // linked to it yet. Kept distinct from a failure: nothing went wrong and
  // retrying cannot help, so the caller has to be pointed at creating an account
  // rather than told to try again.
  if (error === 'USER_NOT_FOUND') {
    return redirectTo(
      isPopup ? '/oauth/popup-done?status=no-account' : '/market?authError=no-account',
    );
  }

  if (error || !sessionToken) {
    return failure();
  }

  try {
    const token = await establishOauthSession(sessionToken);
    const response = redirectTo(isPopup ? '/oauth/popup-done?status=success' : '/market');
    setSessionCookie(response, token);
    return response;
  } catch {
    return failure();
  }
}
