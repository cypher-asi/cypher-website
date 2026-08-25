import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('server-only', () => ({}));

const h = vi.hoisted(() => ({
  getSessionToken: vi.fn(),
  linkedAccounts: vi.fn(),
}));

vi.mock('@/features/auth/session', () => ({ getSessionToken: h.getSessionToken }));
vi.mock('@/features/auth/zos', async () => {
  const actual = await vi.importActual<typeof import('@/features/auth/zos')>('@/features/auth/zos');
  return { ...actual, linkedAccounts: h.linkedAccounts };
});

import { GET } from './route';
import { AuthError } from '@/features/auth/zos';

const get = () => new Request('http://localhost/api/auth/linked-accounts');

const epic = { providerName: 'epic-games', providerId: 'abc', handle: 'player1' };

beforeEach(() => {
  h.getSessionToken.mockReset().mockReturnValue('tok');
  h.linkedAccounts.mockReset().mockResolvedValue([epic]);
});

describe('GET /api/auth/linked-accounts', () => {
  it('returns the session account’s linked providers', async () => {
    const res = await GET(get());

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ accounts: [epic] });
    expect(h.linkedAccounts).toHaveBeenCalledWith('tok'); // session token, never a client value
  });

  it('returns an empty list rather than failing when nothing is linked', async () => {
    h.linkedAccounts.mockResolvedValueOnce([]);

    expect(await (await GET(get())).json()).toEqual({ accounts: [] });
  });

  it('401s without a session instead of asking zos-api', async () => {
    h.getSessionToken.mockReturnValueOnce(null);

    expect((await GET(get())).status).toBe(401);
    expect(h.linkedAccounts).not.toHaveBeenCalled();
  });

  it('surfaces an upstream failure rather than implying nothing is linked', async () => {
    // Reporting "no accounts" here would prompt a buyer to connect an account
    // they already have, so an unreadable answer must stay an error.
    h.linkedAccounts.mockRejectedValueOnce(new AuthError(502, 'Could not read linked accounts'));

    const res = await GET(get());
    expect(res.status).toBe(502);
    expect((await res.json()).accounts).toBeUndefined();
  });
});
