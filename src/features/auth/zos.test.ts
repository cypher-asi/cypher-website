import { afterEach, describe, expect, it, vi } from 'vitest';
import { establishOauthSession, register, currentUserEmail } from './zos';

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

describe('register', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  function stub() {
    vi.stubEnv('ZOS_API_URL', 'https://zos.example');
    vi.stubEnv('ZOS_INVITE_SLUG', 'test-slug');
  }

  /** Route the three zos calls register() makes. `finalizeStatus` lets a test make
   *  finalize fail, to prove it is non-fatal. */
  function routedFetch(finalizeStatus = 200) {
    return vi.fn(async (url: string, _init?: RequestInit) => {
      if (url.endsWith('/api/v2/accounts/createAndAuthorize'))
        return new Response(JSON.stringify({ accessToken: 'jwt-new' }), { status: 200 });
      if (url.endsWith('/api/users/current'))
        return new Response(JSON.stringify({ id: 'u1', zeroWalletAddress: '0xabc', handle: 'h' }), { status: 200 });
      if (url.endsWith('/api/v2/accounts/finalize')) return new Response('{}', { status: finalizeStatus });
      return new Response('{}', { status: 404 });
    });
  }

  const bodyOf = (call: readonly unknown[]) => JSON.parse((call[1] as RequestInit).body as string);
  const callTo = (mock: ReturnType<typeof routedFetch>, suffix: string) =>
    mock.mock.calls.find((c) => (c[0] as string).endsWith(suffix))!;

  it('creates the account, resolves the user, and returns the token + user', async () => {
    stub();
    const fetchMock = routedFetch();
    vi.stubGlobal('fetch', fetchMock);

    const { token, user } = await register('a@b.com', 'pw', 'Ada');

    expect(token).toBe('jwt-new');
    expect(user).toEqual({ id: 'u1', zeroWalletAddress: '0xabc', handle: 'h' });
    // createAndAuthorize carries the email as handle + the server-side invite slug.
    expect(bodyOf(callTo(fetchMock, '/createAndAuthorize'))).toEqual({
      user: { email: 'a@b.com', password: 'pw', handle: 'a@b.com' },
      inviteSlug: 'test-slug',
    });
    // finalize carries the resolved user id + display name.
    expect(bodyOf(callTo(fetchMock, '/finalize'))).toEqual({ userId: 'u1', name: 'Ada', inviteCode: 'test-slug' });
  });

  it('falls back to the email as the display name when none is given', async () => {
    stub();
    const fetchMock = routedFetch();
    vi.stubGlobal('fetch', fetchMock);

    await register('a@b.com', 'pw');

    expect(bodyOf(callTo(fetchMock, '/finalize')).name).toBe('a@b.com');
  });

  it('treats a finalize failure as non-fatal (account still returned)', async () => {
    stub();
    vi.stubGlobal('fetch', routedFetch(500));

    const { user } = await register('a@b.com', 'pw');
    expect(user.id).toBe('u1');
  });

  it('throws a 400 when creation is rejected', async () => {
    stub();
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{}', { status: 400 })));

    const err = await register('a@b.com', 'pw').catch((e) => e);
    expect(err.statusCode).toBe(400);
  });

  it('fails loud (500) when the invite slug is not configured', async () => {
    vi.stubEnv('ZOS_API_URL', 'https://zos.example');
    vi.stubEnv('ZOS_INVITE_SLUG', '');

    const err = await register('a@b.com', 'pw').catch((e) => e);
    expect(err.statusCode).toBe(500);
  });
});

describe('currentUserEmail', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  function respondWith(body: unknown, status = 200) {
    vi.stubEnv('ZOS_API_URL', 'https://zos.example');
    const fetchMock = vi.fn(
      async (_url: string, _init: RequestInit) => new Response(JSON.stringify(body), { status }),
    );
    vi.stubGlobal('fetch', fetchMock);
    return fetchMock;
  }

  it('returns the account primary email, authed by the token', async () => {
    const fetchMock = respondWith({ id: 'u1', profileSummary: { primaryEmail: 'buyer@example.com' } });

    await expect(currentUserEmail('tok')).resolves.toBe('buyer@example.com');
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toContain('/api/users/current');
    expect(init.headers).toMatchObject({ Authorization: 'Bearer tok' });
  });

  it('returns null for an account with no email, as social sign-ups have', async () => {
    respondWith({ id: 'u1', profileSummary: { primaryEmail: null } });
    await expect(currentUserEmail('tok')).resolves.toBeNull();
  });

  it('returns null when the profile summary is absent entirely', async () => {
    respondWith({ id: 'u1' });
    await expect(currentUserEmail('tok')).resolves.toBeNull();
  });

  it('returns null rather than throwing when the lookup fails', async () => {
    respondWith({ error: 'nope' }, 500);
    await expect(currentUserEmail('tok')).resolves.toBeNull();
  });

  it('returns null rather than throwing when the service is unreachable', async () => {
    vi.stubEnv('ZOS_API_URL', 'https://zos.example');
    vi.stubGlobal('fetch', vi.fn(async () => {
      throw new Error('econnrefused');
    }));
    await expect(currentUserEmail('tok')).resolves.toBeNull();
  });
});
