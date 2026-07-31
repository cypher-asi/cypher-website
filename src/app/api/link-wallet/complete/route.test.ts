import { describe, it, expect } from 'vitest';
import { GET } from './route';

const req = (qs: string) =>
  new Request(`https://wilderworld.com/api/link-wallet/complete${qs}`, {
    headers: { host: 'wilderworld.com' },
  });

describe('GET /api/link-wallet/complete', () => {
  it('redirects to the callback with the outcome and clears the session', async () => {
    const res = await GET(req('?status=success'));

    const loc = new URL(res.headers.get('location')!);
    expect(loc.origin).toBe('https://wilderworld.com');
    expect(loc.pathname).toBe('/link-wallet/callback');
    expect(loc.searchParams.get('status')).toBe('success');

    const cookies = res.headers.getSetCookie();
    expect(cookies.find((c) => c.startsWith('zero_session='))).toMatch(/Max-Age=0/i);
    expect(cookies.find((c) => c.startsWith('zero_link_handoff='))).toMatch(/Max-Age=0/i);
  });

  it('passes a safe code through', async () => {
    const loc = new URL((await GET(req('?status=error&code=link_failed'))).headers.get('location')!);
    expect(loc.searchParams.get('status')).toBe('error');
    expect(loc.searchParams.get('code')).toBe('link_failed');
  });

  it('coerces an unknown status to error', async () => {
    const loc = new URL((await GET(req('?status=whatever'))).headers.get('location')!);
    expect(loc.searchParams.get('status')).toBe('error');
  });

  it('sanitizes an unsafe code', async () => {
    const loc = new URL(
      (await GET(req(`?status=error&code=${encodeURIComponent('../evil=1')}`))).headers.get(
        'location',
      )!,
    );
    expect(loc.searchParams.get('code')).toBe('evil1');
  });
});
