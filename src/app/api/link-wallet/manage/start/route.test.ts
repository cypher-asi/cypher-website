import { describe, it, expect } from 'vitest';
import { GET } from './route';
import { HANDOFF_COOKIE } from '@/features/marketplace/hosted-link';

const req = (cookie?: string) =>
  new Request('https://wilderworld.com/api/link-wallet/manage/start', {
    headers: { host: 'wilderworld.com', ...(cookie ? { cookie } : {}) },
  });

describe('GET /api/link-wallet/manage/start', () => {
  it('promotes the hand-off token and forwards to the manage page', async () => {
    const token = 'ztoken-123';
    const res = await GET(req(`${HANDOFF_COOKIE}=${token}`));

    const loc = new URL(res.headers.get('location')!);
    expect(loc.origin).toBe('https://wilderworld.com');
    expect(loc.pathname).toBe('/link-wallet/manage');

    const cookies = res.headers.getSetCookie();
    expect(cookies.find((c) => c.startsWith('zero_session='))).toContain(token);
    expect(cookies.find((c) => c.startsWith('zero_session='))).toMatch(/Max-Age=600/i);
    expect(cookies.find((c) => c.startsWith(`${HANDOFF_COOKIE}=`))).toMatch(/Max-Age=0/i);
  });

  it('bounces to the callback with an error when no hand-off is present', async () => {
    const res = await GET(req());
    const loc = new URL(res.headers.get('location')!);
    expect(loc.pathname).toBe('/link-wallet/callback');
    expect(loc.searchParams.get('status')).toBe('error');
    expect(loc.searchParams.get('code')).toBe('session_missing');
    expect(res.headers.getSetCookie().some((c) => c.startsWith('zero_session='))).toBe(false);
  });
});
