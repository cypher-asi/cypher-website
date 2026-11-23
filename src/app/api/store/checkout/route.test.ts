import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('server-only', () => ({}));

const h = vi.hoisted(() => ({
  getSessionToken: vi.fn(),
  currentUser: vi.fn(),
  processStoreCheckout: vi.fn(),
}));

vi.mock('@/features/auth/session', () => ({ getSessionToken: h.getSessionToken }));
vi.mock('@/features/auth/zos', async (importActual) => {
  const actual = await importActual<typeof import('@/features/auth/zos')>();
  return { ...actual, currentUser: h.currentUser };
});
vi.mock('@/features/store/checkout', () => ({ processStoreCheckout: h.processStoreCheckout }));

import { POST } from './route';
import { StoreCheckoutError } from '@/features/store/config';

function post(body: unknown, headers: Record<string, string> = {}): Request {
  return new Request('http://localhost/api/store/checkout', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });
}

const validBody = {
  lines: [{ productId: 'jckt-1', variantId: 'red', quantity: 2 }],
  paymentMethodId: 'pm_1',
  email: 'buyer@example.com',
};

beforeEach(() => {
  h.getSessionToken.mockReset().mockReturnValue('tok');
  h.currentUser.mockReset().mockResolvedValue({ id: 'u1', zeroWalletAddress: '0xBuyer', handle: null });
  h.processStoreCheckout.mockReset().mockResolvedValue({ status: 'paid', paymentIntentId: 'pi_1', amountCents: 10000 });
});

describe('POST /api/store/checkout', () => {
  it('uses the session wallet + token, forwards the parsed bag, ignores client wallet/customer', async () => {
    const res = await POST(post({ ...validBody, walletAddress: '0xATTACKER', stripeCustomerId: 'cus_victim' }));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: 'paid', paymentIntentId: 'pi_1', amountCents: 10000 });
    const arg = h.processStoreCheckout.mock.calls[0][0];
    expect(arg.lines).toEqual([{ productId: 'jckt-1', variantId: 'red', quantity: 2 }]);
    expect(arg.walletAddress).toBe('0xBuyer'); // from session, ignores body walletAddress
    expect(arg.userId).toBe('u1');
    expect(arg.sessionToken).toBe('tok'); // session token forwarded for customer resolution
    expect(arg).not.toHaveProperty('stripeCustomerId'); // client customer id is never trusted
    expect(arg.savedCard).toBe(false); // absent flag => attach a new card
  });

  it('forwards savedCard=true only when the client explicitly sets it', async () => {
    await POST(post({ ...validBody, savedCard: true }));
    expect(h.processStoreCheckout.mock.calls[0][0].savedCard).toBe(true);

    await POST(post({ ...validBody, savedCard: 'yes' })); // any non-true value => new card
    expect(h.processStoreCheckout.mock.calls[1][0].savedCard).toBe(false);
  });

  it('rejects when not signed in (401)', async () => {
    h.getSessionToken.mockReturnValueOnce(null);
    const res = await POST(post(validBody));
    expect(res.status).toBe(401);
    expect(h.processStoreCheckout).not.toHaveBeenCalled();
  });

  it('rejects when the token resolves to no user (401)', async () => {
    h.currentUser.mockResolvedValueOnce(null);
    const res = await POST(post(validBody));
    expect(res.status).toBe(401);
    expect(h.processStoreCheckout).not.toHaveBeenCalled();
  });

  it('rejects a session with no wallet (409)', async () => {
    h.currentUser.mockResolvedValueOnce({ id: 'u1', zeroWalletAddress: null, handle: null });
    const res = await POST(post(validBody));
    expect(res.status).toBe(409);
    expect(h.processStoreCheckout).not.toHaveBeenCalled();
  });

  it('rejects a body with no lines (400)', async () => {
    const res = await POST(post({ paymentMethodId: 'pm_1', email: 'buyer@example.com' }));
    expect(res.status).toBe(400);
    expect(h.processStoreCheckout).not.toHaveBeenCalled();
  });

  it('rejects an empty bag (400)', async () => {
    const res = await POST(post({ ...validBody, lines: [] }));
    expect(res.status).toBe(400);
    expect(h.processStoreCheckout).not.toHaveBeenCalled();
  });

  it('rejects a malformed line (400)', async () => {
    for (const lines of [
      [{ productId: 'jckt-1', quantity: 1 }], // no variantId
      [{ productId: 'jckt-1', variantId: 'red', quantity: 0 }], // bad quantity
      [{ productId: 'jckt-1', variantId: 'red', quantity: 1.5 }], // non-integer
      [{ productId: 'jckt-1', variantId: 'red' }], // no quantity
    ]) {
      const res = await POST(post({ ...validBody, lines }));
      expect(res.status).toBe(400);
    }
    expect(h.processStoreCheckout).not.toHaveBeenCalled();
  });

  it('rejects a missing paymentMethodId (400)', async () => {
    const res = await POST(post({ lines: validBody.lines, email: 'buyer@example.com' }));
    expect(res.status).toBe(400);
    expect(h.processStoreCheckout).not.toHaveBeenCalled();
  });

  it('rejects a missing or invalid receipt email (400) and forwards a valid one trimmed', async () => {
    for (const email of [undefined, '', 'not-an-email']) {
      const res = await POST(post({ ...validBody, email }));
      expect(res.status).toBe(400);
    }
    expect(h.processStoreCheckout).not.toHaveBeenCalled();

    await POST(post({ ...validBody, email: '  buyer@example.com  ' }));
    expect(h.processStoreCheckout.mock.calls[0][0].email).toBe('buyer@example.com');
  });

  it('maps a StoreCheckoutError to its status with no code when nothing was charged', async () => {
    h.processStoreCheckout.mockRejectedValueOnce(new StoreCheckoutError(402, 'declined'));
    const res = await POST(post(validBody));
    expect(res.status).toBe(402);
    // No code, because nothing was charged. The buyer's screen reads that
    // absence as "retrying is safe".
    expect(await res.json()).toEqual({ error: 'declined' });
  });

  it('surfaces the fail-closed gate (503) when checkout is not yet approved', async () => {
    h.processStoreCheckout.mockRejectedValueOnce(
      new StoreCheckoutError(503, 'Store checkout is not enabled yet.', 'CHECKOUT_DISABLED'),
    );
    const res = await POST(post(validBody));
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({
      error: 'Store checkout is not enabled yet.',
      code: 'CHECKOUT_DISABLED',
    });
  });

  it('maps an unexpected (non-StoreCheckoutError) error to 500 via the auth handler', async () => {
    h.processStoreCheckout.mockRejectedValueOnce(new Error('something unforeseen'));
    const res = await POST(post(validBody));
    expect(res.status).toBe(500);
  });

  it('rejects a cross-origin POST before any work (403)', async () => {
    const res = await POST(post(validBody, { origin: 'http://evil.example' }));
    expect(res.status).toBe(403);
    expect(h.getSessionToken).not.toHaveBeenCalled();
  });
});
