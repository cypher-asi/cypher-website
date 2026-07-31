import { describe, it, expect } from 'vitest';
import { NextResponse } from 'next/server';
import {
  HANDOFF_COOKIE,
  readHandoffToken,
  clearHandoffCookie,
  callbackUrl,
  requestOrigin,
} from './hosted-link';

const req = (cookie?: string) =>
  new Request('https://wilderworld.com/api/link-wallet/start', {
    headers: { host: 'wilderworld.com', ...(cookie ? { cookie } : {}) },
  });

describe('readHandoffToken', () => {
  it('reads the hand-off token when present', () => {
    expect(readHandoffToken(req(`${HANDOFF_COOKIE}=abc.def`))).toBe('abc.def');
  });

  it('finds it among other cookies', () => {
    expect(readHandoffToken(req(`foo=1; ${HANDOFF_COOKIE}=tok; bar=2`))).toBe('tok');
  });

  it('returns null when the cookie is absent', () => {
    expect(readHandoffToken(req('other=1'))).toBeNull();
    expect(readHandoffToken(req())).toBeNull();
  });

  it('returns null when the value is blank', () => {
    expect(readHandoffToken(req(`${HANDOFF_COOKIE}=`))).toBeNull();
  });
});

describe('requestOrigin', () => {
  it('builds scheme + host from the Host header', () => {
    expect(requestOrigin(req())).toBe('https://wilderworld.com');
  });

  it('uses http for localhost', () => {
    const r = new Request('http://localhost/api/link-wallet/start', {
      headers: { host: 'localhost:3000' },
    });
    expect(requestOrigin(r)).toBe('http://localhost:3000');
  });
});

describe('callbackUrl', () => {
  it('encodes a success outcome', () => {
    expect(callbackUrl(req(), 'success')).toBe(
      'https://wilderworld.com/link-wallet/callback?status=success',
    );
  });

  it('encodes an error outcome with a code', () => {
    expect(callbackUrl(req(), 'error', 'session_missing')).toBe(
      'https://wilderworld.com/link-wallet/callback?status=error&code=session_missing',
    );
  });

  it('encodes a cancelled outcome', () => {
    const url = new URL(callbackUrl(req(), 'cancelled'));
    expect(url.searchParams.get('status')).toBe('cancelled');
  });
});

describe('clearHandoffCookie', () => {
  it('expires the hand-off cookie', () => {
    const res = NextResponse.json({});
    clearHandoffCookie(res);
    const cookie = res.headers.getSetCookie().find((c) => c.startsWith(`${HANDOFF_COOKIE}=`));
    expect(cookie).toBeDefined();
    expect(cookie).toMatch(/Max-Age=0/i);
  });
});
