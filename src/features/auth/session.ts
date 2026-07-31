/**
 * Server-side session cookie for ZERO auth. The zos-api access token lives in an
 * httpOnly cookie set by our /api/auth routes — it is never exposed to client
 * JS. Requests carry it automatically; the marketplace + session routes read it
 * back (with a Bearer fallback for programmatic/testing callers).
 */
import type { NextResponse } from 'next/server';

const SECURE = process.env.NODE_ENV === 'production';

const FALLBACK_MAX_AGE_S = 7 * 24 * 60 * 60; // 7 days

// The `__Host-` prefix makes the browser enforce Secure + Path=/ + host-only (no
// Domain), which structurally prevents a sibling subdomain from tossing a
// shadowing cookie. It requires Secure, so it's prod-only — local dev is http,
// where the browser would reject a `__Host-` cookie.
function sessionCookieName(): string {
  return SECURE ? '__Host-zero_session' : 'zero_session';
}

const baseCookieOptions = {
  httpOnly: true,
  secure: SECURE,
  sameSite: 'lax' as const, // blocks cross-site POST → CSRF protection for trades
  path: '/',
};

/**
 * Remaining lifetime of a JWT from its `exp`, so the cookie expires with the
 * token. Opaque/unparseable tokens fall back to a week (zos-api still rejects an
 * expired token, so this is only an upper bound).
 */
function tokenMaxAge(token: string): number {
  try {
    const payload = token.split('.')[1];
    if (!payload) return FALLBACK_MAX_AGE_S;
    const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (typeof decoded.exp === 'number') {
      const remaining = decoded.exp - Math.floor(Date.now() / 1000);
      if (remaining > 0) return remaining;
    }
  } catch {
    /* not a JWT we can read — use the fallback */
  }
  return FALLBACK_MAX_AGE_S;
}

/**
 * Set the session cookie. By default it expires with the token (`exp`). Pass
 * `maxAgeSeconds` to cap it shorter — e.g. a hosted hand-off flow that should
 * only hold the session for the length of one operation. The cap never exceeds
 * the token's own lifetime, so a short-lived token still wins.
 */
export function setSessionCookie(
  response: NextResponse,
  token: string,
  options?: { maxAgeSeconds?: number },
): void {
  const maxAge =
    options?.maxAgeSeconds != null
      ? Math.min(Math.max(0, options.maxAgeSeconds), tokenMaxAge(token))
      : tokenMaxAge(token);
  response.cookies.set(sessionCookieName(), token, { ...baseCookieOptions, maxAge });
}

export function clearSessionCookie(response: NextResponse): void {
  response.cookies.set(sessionCookieName(), '', { ...baseCookieOptions, maxAge: 0 });
}

/**
 * Read the session token from a request: the httpOnly cookie first (the browser
 * flow), then an `Authorization: Bearer` header (programmatic / testing). Only
 * the environment's exact cookie name is matched — matching a bare
 * `zero_session` in prod (where we set `__Host-zero_session`) would re-open the
 * cookie-tossing vector the prefix closes.
 */
export function getSessionToken(request: Request): string | null {
  const cookie = request.headers.get('cookie');
  if (cookie) {
    const match = cookie.match(new RegExp(`(?:^|;\\s*)${sessionCookieName()}=([^;]+)`));
    if (match) {
      try {
        return decodeURIComponent(match[1]);
      } catch {
        return null; // malformed cookie value → treat as no session
      }
    }
  }
  const auth = request.headers.get('authorization');
  if (auth?.startsWith('Bearer ')) return auth.slice(7);
  return null;
}
