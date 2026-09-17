import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('server-only', () => ({}));

const h = vi.hoisted(() => ({
  getSessionToken: vi.fn(),
  currentUser: vi.fn(),
  paymentIntentsCreate: vi.fn(),
  refundsCreate: vi.fn(),
  resolveStripeCustomer: vi.fn(),
  recordVehicleOrder: vi.fn(),
}));

vi.mock('@/features/auth/session', () => ({ getSessionToken: h.getSessionToken }));
vi.mock('@/features/auth/zos', async (importActual) => {
  const actual = await importActual<typeof import('@/features/auth/zos')>();
  return { ...actual, currentUser: h.currentUser };
});

// Deliberately NOT mocking @/features/vehicles/checkout: the point of this file
// is the seam between it and the route. Only the edges of the system are stubbed.
vi.mock('@/features/vehicles/stripe', () => ({
  getStripe: () => ({
    paymentIntents: { create: h.paymentIntentsCreate },
    refunds: { create: h.refundsCreate },
  }),
}));
vi.mock('@/features/vehicles/customer', () => ({
  resolveStripeCustomer: h.resolveStripeCustomer,
  resolveCustomerForSavedCard: h.resolveStripeCustomer,
}));
vi.mock('@/features/vehicles/orders', () => ({ recordVehicleOrder: h.recordVehicleOrder }));

import { POST } from './route';

function post(body: unknown): Request {
  return new Request('http://localhost/api/vehicles/checkout', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

const validBody = { passId: 'ghostline', paymentMethodId: 'pm_1', email: 'buyer@example.com' };

beforeEach(() => {
  h.getSessionToken.mockReset().mockReturnValue('tok');
  h.currentUser.mockReset().mockResolvedValue({ id: 'u1', zeroWalletAddress: '0xBuyer', handle: null });
  h.resolveStripeCustomer.mockReset().mockResolvedValue('cus_1');
  h.recordVehicleOrder.mockReset().mockResolvedValue(undefined);
  h.paymentIntentsCreate.mockReset();
  h.refundsCreate.mockReset();
  vi.stubEnv('WW_TX_SERVER_URL', 'http://tx.local');
  vi.stubEnv('VEHICLE_ADMIN_SALE_API_KEY', 'k');
});

afterEach(() => {
  vi.unstubAllEnvs();
});

/**
 * What actually reaches the browser, driven through the real checkout rather
 * than a mock of it.
 *
 * The route test stubs processVehicleCheckout and the checkout test never sees
 * the route, so the joint between them is the one part no test covers: whether
 * an outcome raised deep in the flow survives as far as the response body. That
 * is the whole reason the code exists, so it is worth proving rather than
 * assuming.
 */
describe('what the buyer receives when delivery fails', () => {
  it('carries the refunded outcome onto the wire', async () => {
    h.paymentIntentsCreate.mockResolvedValueOnce({ id: 'pi_1', status: 'succeeded' });
    global.fetch = vi.fn(async () =>
      new Response(JSON.stringify({ error: 'mint blew up', data: null }), { status: 500 }),
    ) as typeof fetch;
    h.refundsCreate.mockResolvedValueOnce({ id: 're_1' });

    const res = await POST(post(validBody));

    expect(res.status).toBe(502);
    expect(await res.json()).toEqual({
      error: 'We could not deliver your vehicle, so your payment was refunded. Please try again.',
      code: 'MINT_FAILED_REFUNDED',
    });
  });

  it('carries the un-refunded outcome onto the wire', async () => {
    // The one the screen must never offer a retry for.
    h.paymentIntentsCreate.mockResolvedValueOnce({ id: 'pi_1', status: 'succeeded' });
    global.fetch = vi.fn(async () =>
      new Response(JSON.stringify({ error: 'mint blew up', data: null }), { status: 500 }),
    ) as typeof fetch;
    h.refundsCreate.mockRejectedValueOnce(new Error('refund declined'));

    const res = await POST(post(validBody));

    expect(res.status).toBe(502);
    expect(await res.json()).toEqual({
      error:
        'Your payment was taken and we could not deliver your vehicle. We were not able to return your payment automatically either.',
      code: 'MINT_FAILED_REFUND_FAILED',
    });
  });

  it('sends no code when the card was declined', async () => {
    // Nothing was taken, so the screen should let them try again.
    h.paymentIntentsCreate.mockResolvedValueOnce({
      id: 'pi_1',
      status: 'requires_payment_method',
      last_payment_error: { message: 'Your card was declined.' },
    });

    const res = await POST(post(validBody));

    expect(res.status).toBe(402);
    expect(await res.json()).toEqual({ error: 'Your card was declined.' });
    expect(h.recordVehicleOrder).not.toHaveBeenCalled();
  });

  it('still returns 202 and a message when the mint goes quiet', async () => {
    h.paymentIntentsCreate.mockResolvedValueOnce({ id: 'pi_1', status: 'succeeded' });
    global.fetch = vi.fn(async () => {
      const e = new Error('timed out');
      e.name = 'TimeoutError';
      throw e;
    }) as typeof fetch;

    const res = await POST(post(validBody));

    expect(res.status).toBe(202);
    const body = await res.json();
    expect(body.status).toBe('pending');
    expect(h.refundsCreate).not.toHaveBeenCalled();
  });
});
