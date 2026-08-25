import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('server-only', () => ({}));

const h = vi.hoisted(() => ({
  getSessionToken: vi.fn(),
  generateLinkToken: vi.fn(),
}));

vi.mock('@/features/auth/session', () => ({ getSessionToken: h.getSessionToken }));
vi.mock('@/features/auth/zos', async () => {
  const actual = await vi.importActual<typeof import('@/features/auth/zos')>('@/features/auth/zos');
  return { ...actual, generateLinkToken: h.generateLinkToken };
});

import { GET } from './route';
import { AuthError } from '@/features/auth/zos';

function get(query = ''): Request {
  return new Request(`http://localhost/api/auth/epic-link/start${query}`, {
    headers: { host: 'localhost' },
  });
}

const location = (res: Response) => new URL(res.headers.get('location') ?? '');

beforeEach(() => {
  vi.stubEnv('ZOS_API_URL', 'https://zos.example');
  h.getSessionToken.mockReset().mockReturnValue('tok');
  h.generateLinkToken.mockReset().mockResolvedValue('lt-1');
});

describe('GET /api/auth/epic-link/start', () => {
  it('mints server-side and redirects to the zos link handshake', async () => {
    const res = await GET(get());
    const url = location(res);

    expect(res.status).toBe(307);
    expect(url.origin + url.pathname).toBe('https://zos.example/api/oauth/link/epic-games/initiate');
    expect(url.searchParams.get('linkToken')).toBe('lt-1');
    expect(h.generateLinkToken).toHaveBeenCalledWith('tok'); // session token, never a client value
  });

  it('builds returnUrl from our own host, never from the query', async () => {
    // zos-api sends the buyer wherever it is told, so a caller-supplied
    // returnUrl would be an open redirect out of a flow they are trusting.
    const url = location(await GET(get('?returnUrl=https://evil.example')));

    expect(url.searchParams.get('returnUrl')).toBe('http://localhost/oauth/link-done');
  });

  it('does not ask to confirm unless asked to', async () => {
    expect(location(await GET(get())).searchParams.get('confirm')).toBeNull();
  });

  it('passes confirm through so a warned buyer can proceed', async () => {
    expect(location(await GET(get('?confirm=1'))).searchParams.get('confirm')).toBe('true');
  });

  it('sends an unauthenticated caller to the popup page rather than stranding it', async () => {
    h.getSessionToken.mockReturnValueOnce(null);

    const url = location(await GET(get()));
    expect(url.pathname).toBe('/oauth/link-done');
    expect(url.searchParams.get('error')).toBe('not_signed_in');
    expect(h.generateLinkToken).not.toHaveBeenCalled();
  });

  it('reports a failed mint back through the popup page', async () => {
    h.generateLinkToken.mockRejectedValueOnce(new AuthError(502, 'nope'));

    const url = location(await GET(get()));
    expect(url.pathname).toBe('/oauth/link-done');
    expect(url.searchParams.get('error')).toBe('link_failed');
  });
});
