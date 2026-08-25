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

import { POST } from './route';
import { AuthError } from '@/features/auth/zos';

function post(origin?: string): Request {
  return new Request('http://localhost/api/auth/link-token', {
    method: 'POST',
    headers: { host: 'localhost', ...(origin ? { origin } : {}) },
  });
}

beforeEach(() => {
  h.getSessionToken.mockReset().mockReturnValue('tok');
  h.generateLinkToken.mockReset().mockResolvedValue('link-tok');
});

describe('POST /api/auth/link-token', () => {
  it('trades the session cookie for a link token the browser may carry', async () => {
    const res = await POST(post('http://localhost'));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ linkToken: 'link-tok' });
    expect(h.generateLinkToken).toHaveBeenCalledWith('tok'); // session token, never a client value
  });

  it('401s without a session instead of minting anything', async () => {
    h.getSessionToken.mockReturnValueOnce(null);

    expect((await POST(post('http://localhost'))).status).toBe(401);
    expect(h.generateLinkToken).not.toHaveBeenCalled();
  });

  it('rejects a cross-origin post before touching the session', async () => {
    // The token authorises linking an account, so it must never be mintable by
    // another site riding the buyer's cookie.
    const res = await POST(post('https://evil.example'));

    expect(res.status).toBe(403);
    expect(h.getSessionToken).not.toHaveBeenCalled();
    expect(h.generateLinkToken).not.toHaveBeenCalled();
  });

  it('surfaces an upstream failure', async () => {
    h.generateLinkToken.mockRejectedValueOnce(new AuthError(502, 'Could not start account linking'));

    const res = await POST(post('http://localhost'));
    expect(res.status).toBe(502);
    expect((await res.json()).linkToken).toBeUndefined();
  });
});
