import { describe, it, expect } from 'vitest';
import { NextResponse } from 'next/server';
import {
  HANDOFF_COOKIE,
  readHandoffToken,
  clearHandoffCookie,
  callbackUrl,
  requestOrigin,
  parseOutcome,
  sanitizeCode,
  completePath,
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

describe('parseOutcome', () => {
  it('passes known outcomes through', () => {
    expect(parseOutcome('success')).toBe('success');
    expect(parseOutcome('cancelled')).toBe('cancelled');
    expect(parseOutcome('error')).toBe('error');
  });

  it('coerces anything unrecognised to error', () => {
    expect(parseOutcome('linked')).toBe('error');
    expect(parseOutcome(null)).toBe('error');
    expect(parseOutcome('')).toBe('error');
  });
});

describe('sanitizeCode', () => {
  it('keeps safe codes', () => {
    expect(sanitizeCode('link_failed')).toBe('link_failed');
    expect(sanitizeCode('session_missing')).toBe('session_missing');
  });

  it('strips unsafe characters', () => {
    expect(sanitizeCode('a b&c=1')).toBe('abc1');
    expect(sanitizeCode('../../evil')).toBe('evil');
  });

  it('returns undefined for empty/nullish/all-unsafe', () => {
    expect(sanitizeCode(null)).toBeUndefined();
    expect(sanitizeCode('')).toBeUndefined();
    expect(sanitizeCode('!!!')).toBeUndefined();
  });

  it('caps the length', () => {
    expect(sanitizeCode('x'.repeat(100))).toHaveLength(40);
  });
});

describe('completePath', () => {
  it('builds a relative complete URL', () => {
    expect(completePath('success')).toBe('/api/link-wallet/complete?status=success');
    expect(completePath('error', 'link_failed')).toBe(
      '/api/link-wallet/complete?status=error&code=link_failed',
    );
  });
});
