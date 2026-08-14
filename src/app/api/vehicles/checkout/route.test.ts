import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('server-only', () => ({}));

const h = vi.hoisted(() => ({
  getSessionToken: vi.fn(),
  currentUser: vi.fn(),
  processVehicleCheckout: vi.fn(),
}));

vi.mock('@/features/auth/session', () => ({ getSessionToken: h.getSessionToken }));
vi.mock('@/features/auth/zos', async (importActual) => {
  const actual = await importActual<typeof import('@/features/auth/zos')>();
  return { ...actual, currentUser: h.currentUser };
});
vi.mock('@/features/vehicles/checkout', () => ({ processVehicleCheckout: h.processVehicleCheckout }));

import { POST } from './route';
import { VehicleCheckoutError } from '@/features/vehicles/config';

function post(body: unknown, headers: Record<string, string> = {}): Request {
  return new Request('http://localhost/api/vehicles/checkout', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });
}

const validBody = { passId: 'ghostline', paymentMethodId: 'pm_1', email: 'buyer@example.com' };

beforeEach(() => {
  h.getSessionToken.mockReset().mockReturnValue('tok');
  h.currentUser.mockReset().mockResolvedValue({ id: 'u1', zeroWalletAddress: '0xBuyer', handle: null });
  h.processVehicleCheckout.mockReset().mockResolvedValue({ status: 'delivered', transactionHash: '0xTX' });
});

describe('POST /api/vehicles/checkout', () => {
  it('uses the session wallet + token and ignores client-supplied wallet/customer', async () => {
    const res = await POST(post({ ...validBody, walletAddress: '0xATTACKER', stripeCustomerId: 'cus_victim' }));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: 'delivered', transactionHash: '0xTX' });
    const arg = h.processVehicleCheckout.mock.calls[0][0];
    expect(arg.walletAddress).toBe('0xBuyer'); // from session, ignores body walletAddress
    expect(arg.userId).toBe('u1');
    expect(arg.sessionToken).toBe('tok'); // session token forwarded for customer resolution
    expect(arg).not.toHaveProperty('stripeCustomerId'); // client customer id is never trusted
    expect(arg.savedCard).toBe(false); // absent flag => attach a new card
  });

  it('forwards savedCard=true only when the client explicitly sets it', async () => {
    await POST(post({ ...validBody, savedCard: true }));
    expect(h.processVehicleCheckout.mock.calls[0][0].savedCard).toBe(true);

    await POST(post({ ...validBody, savedCard: 'yes' })); // any non-true value => new card
    expect(h.processVehicleCheckout.mock.calls[1][0].savedCard).toBe(false);
  });

  it('returns 202 for a pending (paid, delivery slow) result', async () => {
    h.processVehicleCheckout.mockResolvedValueOnce({ status: 'pending', message: 'later' });
    const res = await POST(post(validBody));
    expect(res.status).toBe(202);
  });

  it('rejects when not signed in (401)', async () => {
    h.getSessionToken.mockReturnValueOnce(null);
    const res = await POST(post(validBody));
    expect(res.status).toBe(401);
    expect(h.processVehicleCheckout).not.toHaveBeenCalled();
  });

  it('rejects a session with no wallet (409)', async () => {
    h.currentUser.mockResolvedValueOnce({ id: 'u1', zeroWalletAddress: null, handle: null });
    const res = await POST(post(validBody));
    expect(res.status).toBe(409);
    expect(h.processVehicleCheckout).not.toHaveBeenCalled();
  });

  it('rejects a body missing required fields (400)', async () => {
    const res = await POST(post({ passId: 'ghostline' }));
    expect(res.status).toBe(400);
    expect(h.processVehicleCheckout).not.toHaveBeenCalled();
  });

  it('rejects a missing or invalid receipt email (400) and forwards a valid one trimmed', async () => {
    for (const email of [undefined, '', 'not-an-email']) {
      const res = await POST(post({ passId: 'ghostline', paymentMethodId: 'pm_1', email }));
      expect(res.status).toBe(400);
    }
    expect(h.processVehicleCheckout).not.toHaveBeenCalled();

    await POST(post({ ...validBody, email: '  buyer@example.com  ' }));
    expect(h.processVehicleCheckout.mock.calls[0][0].email).toBe('buyer@example.com');
  });

  it('maps a VehicleCheckoutError to its status', async () => {
    h.processVehicleCheckout.mockRejectedValueOnce(new VehicleCheckoutError(402, 'declined'));
    const res = await POST(post(validBody));
    expect(res.status).toBe(402);
    expect(await res.json()).toEqual({ error: 'declined' });
  });

  it('rejects a cross-origin POST before any work (403)', async () => {
    const res = await POST(post(validBody, { origin: 'http://evil.example' }));
    expect(res.status).toBe(403);
    expect(h.getSessionToken).not.toHaveBeenCalled();
  });
});
