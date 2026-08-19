import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import { GET } from './route';
import { previewCookieName } from '@/features/vehicles/preview';

const req = (qs: string) =>
  new Request(`https://wilderworld.com/api/vehicles/preview${qs}`, {
    headers: { host: 'wilderworld.com' },
  });

const setCookieOf = (res: Response) => res.headers.get('set-cookie') ?? '';

afterEach(() => vi.unstubAllEnvs());

describe('GET /api/vehicles/preview', () => {
  it('grants access and lands on the store when the token matches', async () => {
    vi.stubEnv('VEHICLES_PREVIEW_TOKEN', 's3cret-token');

    const res = await GET(req('?token=s3cret-token'));

    expect(res.headers.get('location')).toBe('https://wilderworld.com/vehicles');
    expect(setCookieOf(res)).toContain(`${previewCookieName()}=s3cret-token`);
  });

  it('sets no cookie for a wrong token, and is indistinguishable from a miss', async () => {
    vi.stubEnv('VEHICLES_PREVIEW_TOKEN', 's3cret-token');

    const wrong = await GET(req('?token=wrong-token'));
    const missing = await GET(req(''));

    for (const res of [wrong, missing]) {
      expect(res.headers.get('location')).toBe('https://wilderworld.com/vehicles');
      expect(setCookieOf(res)).not.toContain('s3cret-token');
      expect(setCookieOf(res)).toBe('');
    }
    // Same status too, so the response carries no signal either way.
    expect(wrong.status).toBe(missing.status);
  });

  it('grants nothing when no token is configured', async () => {
    vi.stubEnv('VEHICLES_PREVIEW_TOKEN', '');

    const res = await GET(req('?token=anything'));

    expect(setCookieOf(res)).toBe('');
  });

  it('expires the cookie on ?clear=1', async () => {
    vi.stubEnv('VEHICLES_PREVIEW_TOKEN', 's3cret-token');

    const res = await GET(req('?clear=1'));

    expect(res.headers.get('location')).toBe('https://wilderworld.com/vehicles');
    expect(setCookieOf(res)).toMatch(/Max-Age=0/i);
  });

  it('redirects back to the host the request arrived on', async () => {
    vi.stubEnv('VEHICLES_PREVIEW_TOKEN', 's3cret-token');

    const res = await GET(
      new Request('https://internal.bind.host/api/vehicles/preview?token=s3cret-token', {
        headers: { host: 'www.wilderworld.com', 'x-forwarded-proto': 'https' },
      }),
    );

    expect(res.headers.get('location')).toBe('https://www.wilderworld.com/vehicles');
  });
});
