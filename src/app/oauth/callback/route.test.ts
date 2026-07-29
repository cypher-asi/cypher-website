import { afterEach, beforeEach, describe, expect, it, vi, type MockedFunction } from 'vitest';

vi.mock('@/features/auth/zos', () => ({ establishOauthSession: vi.fn() }));

import { establishOauthSession } from '@/features/auth/zos';
import { GET } from './route';

const mocked = establishOauthSession as MockedFunction<typeof establishOauthSession>;
const req = (qs: string) => new Request(`https://wilderworld.com/oauth/callback${qs}`);

beforeEach(() => mocked.mockReset());
afterEach(() => vi.unstubAllEnvs());

describe('GET /oauth/callback', () => {
  it('exchanges the token, sets the session cookie, and redirects to the market', async () => {
    mocked.mockResolvedValueOnce('jwt-xyz');

    const res = await GET(req('?sessionEstablishmentToken=sess-1'));

    expect(mocked).toHaveBeenCalledWith('sess-1');
    expect(new URL(res.headers.get('location')!).pathname).toBe('/market');
    // Cookie set (name is env-dependent; NODE_ENV=test → zero_session).
    const setCookie = res.headers.get('set-cookie') ?? '';
    expect(setCookie).toContain('jwt-xyz');
  });

  it('redirects with an error flag when zos-api returns an error param', async () => {
    const res = await GET(req('?error=access_denied&error_description=nope'));
    expect(res.headers.get('location')).toContain('/market?authError=social');
    expect(mocked).not.toHaveBeenCalled();
  });

  it('redirects with an error flag when no token is present', async () => {
    const res = await GET(req(''));
    expect(res.headers.get('location')).toContain('/market?authError=social');
    expect(mocked).not.toHaveBeenCalled();
  });

  it('redirects with an error flag when the exchange throws', async () => {
    mocked.mockRejectedValueOnce(new Error('boom'));
    const res = await GET(req('?sessionEstablishmentToken=bad'));
    expect(res.headers.get('location')).toContain('/market?authError=social');
  });
});
