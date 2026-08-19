import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('server-only', () => ({}));

const h = vi.hoisted(() => ({
  getSessionToken: vi.fn(),
  listCheckoutPrefill: vi.fn(),
  currentUserEmail: vi.fn(),
}));

vi.mock('@/features/auth/session', () => ({ getSessionToken: h.getSessionToken }));
vi.mock('@/features/auth/zos', () => ({ currentUserEmail: h.currentUserEmail }));
vi.mock('@/features/vehicles/customer', () => ({ listCheckoutPrefill: h.listCheckoutPrefill }));

import { GET } from './route';
import { VehicleCheckoutError } from '@/features/vehicles/config';

function get(): Request {
  return new Request('http://localhost/api/vehicles/payment-methods');
}

const cards = [{ id: 'pm_1', brand: 'visa', last4: '3112', expMonth: 3, expYear: 2031 }];

beforeEach(() => {
  h.getSessionToken.mockReset().mockReturnValue('tok');
  h.listCheckoutPrefill.mockReset().mockResolvedValue({ cards, stripeEmail: null });
  h.currentUserEmail.mockReset().mockResolvedValue(null);
});

describe('GET /api/vehicles/payment-methods', () => {
  it('returns the session buyer’s saved cards', async () => {
    const res = await GET(get());
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ cards, email: null });
    expect(h.listCheckoutPrefill).toHaveBeenCalledWith('tok'); // session token, never a client value
  });

  it('prefers the Stripe customer email, which is the address that has had receipts', async () => {
    h.listCheckoutPrefill.mockResolvedValueOnce({ cards, stripeEmail: 'stripe@example.com' });
    h.currentUserEmail.mockResolvedValueOnce('zero@example.com');

    expect((await (await GET(get())).json()).email).toBe('stripe@example.com');
    expect(h.currentUserEmail).not.toHaveBeenCalled(); // no need to ask zos
  });

  it('falls back to the ZERO account email when Stripe holds none', async () => {
    h.currentUserEmail.mockResolvedValueOnce('zero@example.com');

    expect((await (await GET(get())).json()).email).toBe('zero@example.com');
    expect(h.currentUserEmail).toHaveBeenCalledWith('tok');
  });

  it('offers no email when neither source has one', async () => {
    expect((await (await GET(get())).json()).email).toBeNull();
  });

  it('rejects when not signed in (401)', async () => {
    h.getSessionToken.mockReturnValueOnce(null);
    const res = await GET(get());
    expect(res.status).toBe(401);
    expect(h.listCheckoutPrefill).not.toHaveBeenCalled();
  });

  it('maps a VehicleCheckoutError to its status', async () => {
    h.listCheckoutPrefill.mockRejectedValueOnce(new VehicleCheckoutError(401, 'expired'));
    const res = await GET(get());
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: 'expired' });
  });
});
