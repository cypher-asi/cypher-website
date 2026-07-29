import { afterEach, describe, expect, it, vi } from 'vitest';
import { GET } from './route';

function req(host = 'wilderworld.com', proto?: string): Request {
  const headers: Record<string, string> = { host };
  if (proto) headers['x-forwarded-proto'] = proto;
  return new Request(`https://${host}/api/auth/oauth/epic-games`, { headers });
}
const ctx = (provider: string) => ({ params: Promise.resolve({ provider }) });

describe('GET /api/auth/oauth/:provider', () => {
  afterEach(() => vi.unstubAllEnvs());

  it('redirects an allowed provider to zos-api with an encoded returnUrl', async () => {
    vi.stubEnv('ZOS_API_URL', 'https://zos.example');

    const res = await GET(req('wilderworld.com'), ctx('epic-games'));

    expect(res.status).toBe(307);
    const loc = res.headers.get('location')!;
    expect(loc.startsWith('https://zos.example/api/oauth/epic-games/login?returnUrl=')).toBe(true);
    expect(loc).toContain(encodeURIComponent('https://wilderworld.com/oauth/callback'));
  });

  it('uses http for localhost hosts', async () => {
    vi.stubEnv('ZOS_API_URL', 'https://zos.example');
    const res = await GET(req('wilderworld.localhost:3001'), ctx('epic-games'));
    expect(res.headers.get('location')).toContain(
      encodeURIComponent('http://wilderworld.localhost:3001/oauth/callback'),
    );
  });

  it('404s an unsupported provider', async () => {
    vi.stubEnv('ZOS_API_URL', 'https://zos.example');
    const res = await GET(req(), ctx('google'));
    expect(res.status).toBe(404);
  });

  it('400s when the host header is missing', async () => {
    vi.stubEnv('ZOS_API_URL', 'https://zos.example');
    const res = await GET(new Request('https://x/api/auth/oauth/epic-games'), ctx('epic-games'));
    expect(res.status).toBe(400);
  });
});
