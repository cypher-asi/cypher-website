import 'server-only';
import { timingSafeEqual } from 'node:crypto';
import type { NextResponse } from 'next/server';

/**
 * Private preview access to the vehicles funnel.
 *
 * The funnel is gated by VEHICLES_LIVE, which is all-or-nothing per environment.
 * A preview token opens it for a single browser without opening it to the public:
 * hitting /api/vehicles/preview with the right token sets an httpOnly cookie, and
 * the vehicles layout honours that cookie alongside VEHICLES_LIVE.
 *
 * The cookie stores the token itself, so verification stays stateless. It is
 * httpOnly, so page JS can never read it back out.
 */

const SECURE = process.env.NODE_ENV === 'production';

/** Long enough that a reviewer isn't re-requesting the link mid-review. */
const PREVIEW_MAX_AGE_S = 30 * 24 * 60 * 60; // 30 days

/**
 * `__Host-` makes the browser enforce Secure + Path=/ + host-only, so a sibling
 * subdomain can't toss a shadowing cookie. It requires Secure, hence prod-only
 * (local dev is http, where the browser would reject the prefix).
 */
export function previewCookieName(): string {
  return SECURE ? '__Host-vehicles_preview' : 'vehicles_preview';
}

const baseCookieOptions = {
  httpOnly: true,
  secure: SECURE,
  sameSite: 'lax' as const,
  path: '/',
};

/** The configured token, or null when preview access is switched off entirely. */
function configuredToken(): string | null {
  const token = process.env.VEHICLES_PREVIEW_TOKEN;
  return token ? token : null;
}

/**
 * Constant-time comparison against the configured token. Unset env → always
 * false, so preview access is off by default and can be revoked instantly by
 * clearing or rotating the variable.
 */
export function isPreviewToken(candidate: string | null | undefined): boolean {
  const expected = configuredToken();
  if (!expected || !candidate) return false;

  const a = Buffer.from(candidate, 'utf8');
  const b = Buffer.from(expected, 'utf8');
  // Length is compared first (it leaks only the length, not the contents), as
  // timingSafeEqual throws on a length mismatch.
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function setPreviewCookie(response: NextResponse, token: string): void {
  response.cookies.set(previewCookieName(), token, {
    ...baseCookieOptions,
    maxAge: PREVIEW_MAX_AGE_S,
  });
}

export function clearPreviewCookie(response: NextResponse): void {
  response.cookies.set(previewCookieName(), '', { ...baseCookieOptions, maxAge: 0 });
}

/** Whether the funnel is open to everyone in this environment. */
export function vehiclesLive(): boolean {
  return process.env.VEHICLES_LIVE === 'true';
}
