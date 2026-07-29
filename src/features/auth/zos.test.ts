import { afterEach, describe, expect, it, vi } from 'vitest';
import { establishOauthSession } from './zos';

describe('establishOauthSession', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  function stub(zosApiUrl = 'https://zos.example') {
    vi.stubEnv('ZOS_API_URL', zosApiUrl);
  }

  it('POSTs the session token as a Bearer with an empty body and returns the access token', async () => {
    stub();
    const fetchMock = vi.fn(
      async (_url: string, _init: RequestInit) =>
        new Response(JSON.stringify({ accessToken: 'jwt-123' }), { status: 200 }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const token = await establishOauthSession('sess-abc');

    expect(token).toBe('jwt-123');
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://zos.example/api/oauth/establish-session');
    expect(init.method).toBe('POST');
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer sess-abc');
    expect(init.body).toBe('{}');
  });

  it('throws a 401 when the exchange fails', async () => {
    stub();
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{}', { status: 401 })));

    const err = await establishOauthSession('bad').catch((e) => e);
    expect(err.statusCode).toBe(401);
  });
});
