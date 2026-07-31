/**
 * Hosted wallet-link session hand-off. A native host application that embeds a
 * browser (one without wallet extensions) links an external EOA to a ZERO
 * account through a hosted page on this origin. Before loading the page the host
 * injects a short-lived ZERO token as the hand-off cookie; the entry route
 * promotes it to the app's normal httpOnly session cookie (short-lived) so the
 * existing wallet proxies authenticate as the user, then clears the hand-off.
 *
 * The host learns the outcome by intercepting a navigation to a fixed callback
 * path on this origin (prefix-matched), with the result encoded in the query.
 * The token never touches a URL and is never exposed to page JS.
 */
import type { NextResponse } from 'next/server';

/**
 * Cookie the host sets on this origin carrying the ZERO token. Deliberately
 * distinct from the app's own session cookie so the hand-off and the promoted
 * session never collide, and so reading one never matches the other.
 */
export const HANDOFF_COOKIE = 'zero_link_handoff';

/**
 * Path the host prefix-matches to detect completion. Served on this origin so a
 * real "you can close this" page can exist as a fallback, though the host
 * intercepts the navigation before it loads.
 */
export const CALLBACK_PATH = '/link-wallet/callback';

/**
 * Cap on how long the promoted session cookie may live. The connect + scan +
 * sign flow finishes well within this; the short cap means an abandoned hand-off
 * self-expires rather than lingering. The cookie is also cleared on completion.
 */
export const SESSION_TTL_SECONDS = 10 * 60;

/** Terminal outcomes the host is told about, matching the agreed contract. */
export type LinkOutcome = 'success' | 'cancelled' | 'error';

const IS_PRODUCTION = process.env.NODE_ENV === 'production';

/** Read the host-injected hand-off token, or null if absent/blank/malformed. */
export function readHandoffToken(request: Request): string | null {
  const cookie = request.headers.get('cookie');
  if (!cookie) return null;
  const match = cookie.match(new RegExp(`(?:^|;\\s*)${HANDOFF_COOKIE}=([^;]+)`));
  if (!match) return null;
  try {
    const value = decodeURIComponent(match[1]).trim();
    return value.length ? value : null;
  } catch {
    return null; // malformed cookie value → treat as no hand-off
  }
}

/** Clear the hand-off cookie once it has been promoted (or on failure). */
export function clearHandoffCookie(response: NextResponse): void {
  response.cookies.set(HANDOFF_COOKIE, '', {
    httpOnly: true,
    secure: IS_PRODUCTION,
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
}

/**
 * The request's own origin (scheme + host) from the incoming headers — not
 * `request.url`, which in a route handler reports the server bind host and would
 * drop the brand host the user is actually on (and its host-scoped cookie).
 */
export function requestOrigin(request: Request): string {
  const host = request.headers.get('host') ?? new URL(request.url).host;
  const proto =
    request.headers.get('x-forwarded-proto') ?? (host.includes('localhost') ? 'http' : 'https');
  return `${proto}://${host}`;
}

/**
 * The full callback URL the host intercepts, with the outcome encoded. Built
 * only from our own fixed path + a whitelisted status/code — never from any
 * caller-supplied redirect target, so there is no open-redirect surface.
 */
export function callbackUrl(request: Request, outcome: LinkOutcome, code?: string): string {
  const params = new URLSearchParams({ status: outcome });
  if (code) params.set('code', code);
  return `${requestOrigin(request)}${CALLBACK_PATH}?${params.toString()}`;
}
