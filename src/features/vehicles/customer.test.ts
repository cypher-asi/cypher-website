import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('server-only', () => ({}));

import { resolveStripeCustomer } from './customer';

function fetchReturning(bodyObj: unknown, status = 200) {
  global.fetch = vi.fn(async () => new Response(JSON.stringify(bodyObj), { status })) as typeof fetch;
}

beforeEach(() => {
  vi.stubEnv('ZERO_PAYMENTS_URL', 'http://pay.local/');
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe('resolveStripeCustomer', () => {
  it('attaches the card and returns the customer id, authed by the session token', async () => {
    fetchReturning({ stripeCustomerId: 'cus_1', paymentMethod: { id: 'pm_1' } });

    const id = await resolveStripeCustomer('tok', 'pm_1');

    expect(id).toBe('cus_1');
    const [url, init] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toBe('http://pay.local/api/payment-methods');
    expect((init as RequestInit).headers).toMatchObject({ Authorization: 'Bearer tok' });
    expect(JSON.parse((init as RequestInit).body as string)).toEqual({ paymentMethodId: 'pm_1' });
  });

  it('maps a 401 to a session-expired error', async () => {
    fetchReturning({ message: 'no token' }, 401);
    await expect(resolveStripeCustomer('tok', 'pm_1')).rejects.toMatchObject({ statusCode: 401 });
  });

  it('throws 502 when the service returns no customer id', async () => {
    fetchReturning({ message: 'boom' }, 500);
    await expect(resolveStripeCustomer('tok', 'pm_1')).rejects.toMatchObject({ statusCode: 502 });
  });

  it('throws 502 when the service is unreachable', async () => {
    global.fetch = vi.fn(async () => {
      throw new Error('econnrefused');
    }) as typeof fetch;
    await expect(resolveStripeCustomer('tok', 'pm_1')).rejects.toMatchObject({ statusCode: 502 });
  });
});
