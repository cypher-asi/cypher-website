import { describe, it, expect } from 'vitest';
import { NextResponse } from 'next/server';
import { setSessionCookie, getSessionToken } from './session';

/** A minimal JWT with a chosen `exp` so tokenMaxAge is derived, not the fallback. */
function jwtWithExp(expSeconds: number): string {
  const header = Buffer.from(JSON.stringify({ alg: 'none' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({ exp: expSeconds })).toString('base64url');
  return `${header}.${payload}.sig`;
}

function sessionCookie(res: NextResponse): string {
  const cookie = res.headers.getSetCookie().find((c) => c.startsWith('zero_session='));
  if (!cookie) throw new Error('no session cookie set');
  return cookie;
}

function maxAgeOf(res: NextResponse): number {
  const m = sessionCookie(res).match(/Max-Age=(\d+)/i);
  if (!m) throw new Error('no Max-Age on session cookie');
  return Number(m[1]);
}

describe('setSessionCookie', () => {
  const farFuture = Math.floor(Date.now() / 1000) + 7 * 24 * 3600;

  it('defaults to (roughly) the token lifetime when no cap is given', () => {
    const res = NextResponse.json({});
    setSessionCookie(res, jwtWithExp(farFuture));
    expect(maxAgeOf(res)).toBeGreaterThan(7 * 24 * 3600 - 60);
  });

  it('caps the lifetime when maxAgeSeconds is shorter than the token', () => {
    const res = NextResponse.json({});
    setSessionCookie(res, jwtWithExp(farFuture), { maxAgeSeconds: 600 });
    expect(maxAgeOf(res)).toBe(600);
  });

  it('never exceeds the token lifetime even if the cap is larger', () => {
    const res = NextResponse.json({});
    setSessionCookie(res, jwtWithExp(Math.floor(Date.now() / 1000) + 120), { maxAgeSeconds: 600 });
    expect(maxAgeOf(res)).toBeLessThanOrEqual(120);
  });

  it('round-trips: the capped cookie is read back by getSessionToken', () => {
    const token = jwtWithExp(farFuture);
    const res = NextResponse.json({});
    setSessionCookie(res, token, { maxAgeSeconds: 600 });
    const pair = sessionCookie(res).split(';')[0];
    const req = new Request('https://wilderworld.com/', { headers: { cookie: pair } });
    expect(getSessionToken(req)).toBe(token);
  });
});
