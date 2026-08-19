import { describe, it, expect, vi, afterEach } from 'vitest';

vi.mock('server-only', () => ({}));

import { NextResponse } from 'next/server';
import {
  isPreviewToken,
  previewCookieName,
  setPreviewCookie,
  clearPreviewCookie,
  vehiclesLive,
} from './preview';

function previewCookie(res: NextResponse): string {
  const cookie = res.headers.getSetCookie().find((c) => c.startsWith(`${previewCookieName()}=`));
  if (!cookie) throw new Error('no preview cookie set');
  return cookie;
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('isPreviewToken', () => {
  it('rejects everything when no token is configured', () => {
    vi.stubEnv('VEHICLES_PREVIEW_TOKEN', '');
    expect(isPreviewToken('anything')).toBe(false);
    expect(isPreviewToken('')).toBe(false);
  });

  it('accepts the configured token', () => {
    vi.stubEnv('VEHICLES_PREVIEW_TOKEN', 's3cret-token');
    expect(isPreviewToken('s3cret-token')).toBe(true);
  });

  it('rejects a wrong token of the same length', () => {
    vi.stubEnv('VEHICLES_PREVIEW_TOKEN', 's3cret-token');
    expect(isPreviewToken('s3cret-tokeX')).toBe(false);
  });

  it('rejects a token of a different length without throwing', () => {
    vi.stubEnv('VEHICLES_PREVIEW_TOKEN', 's3cret-token');
    expect(isPreviewToken('short')).toBe(false);
    expect(isPreviewToken('s3cret-token-with-more')).toBe(false);
  });

  it('rejects a missing candidate', () => {
    vi.stubEnv('VEHICLES_PREVIEW_TOKEN', 's3cret-token');
    expect(isPreviewToken(null)).toBe(false);
    expect(isPreviewToken(undefined)).toBe(false);
  });
});

describe('setPreviewCookie', () => {
  it('sets an httpOnly cookie holding the token', () => {
    const res = NextResponse.json({});
    setPreviewCookie(res, 's3cret-token');
    const cookie = previewCookie(res);
    expect(cookie).toContain('s3cret-token');
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/SameSite=lax/i);
    expect(cookie).toMatch(/Path=\//i);
  });

  it('lasts 30 days so a reviewer keeps access', () => {
    const res = NextResponse.json({});
    setPreviewCookie(res, 's3cret-token');
    expect(previewCookie(res)).toMatch(/Max-Age=2592000/i);
  });
});

describe('clearPreviewCookie', () => {
  it('expires the cookie immediately', () => {
    const res = NextResponse.json({});
    clearPreviewCookie(res);
    expect(previewCookie(res)).toMatch(/Max-Age=0/i);
  });
});

describe('vehiclesLive', () => {
  it('is true only for the exact string "true"', () => {
    vi.stubEnv('VEHICLES_LIVE', 'true');
    expect(vehiclesLive()).toBe(true);

    vi.stubEnv('VEHICLES_LIVE', 'TRUE');
    expect(vehiclesLive()).toBe(false);

    vi.stubEnv('VEHICLES_LIVE', '');
    expect(vehiclesLive()).toBe(false);
  });
});
