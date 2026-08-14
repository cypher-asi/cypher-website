import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('server-only', () => ({}));

const h = vi.hoisted(() => ({
  getSessionToken: vi.fn(),
  listSavedCards: vi.fn(),
}));

vi.mock('@/features/auth/session', () => ({ getSessionToken: h.getSessionToken }));
vi.mock('@/features/vehicles/customer', () => ({ listSavedCards: h.listSavedCards }));

import { GET } from './route';
import { VehicleCheckoutError } from '@/features/vehicles/config';

function get(): Request {
  return new Request('http://localhost/api/vehicles/payment-methods');
}

const cards = [{ id: 'pm_1', brand: 'visa', last4: '3112', expMonth: 3, expYear: 2031 }];

beforeEach(() => {
  h.getSessionToken.mockReset().mockReturnValue('tok');
  h.listSavedCards.mockReset().mockResolvedValue(cards);
});

describe('GET /api/vehicles/payment-methods', () => {
  it('returns the session buyer’s saved cards', async () => {
    const res = await GET(get());
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ cards });
    expect(h.listSavedCards).toHaveBeenCalledWith('tok'); // session token, never a client value
  });

  it('rejects when not signed in (401)', async () => {
    h.getSessionToken.mockReturnValueOnce(null);
    const res = await GET(get());
    expect(res.status).toBe(401);
    expect(h.listSavedCards).not.toHaveBeenCalled();
  });

  it('maps a VehicleCheckoutError to its status', async () => {
    h.listSavedCards.mockRejectedValueOnce(new VehicleCheckoutError(401, 'expired'));
    const res = await GET(get());
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: 'expired' });
  });
});
