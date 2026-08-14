import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('server-only', () => ({}));

import { resolveStripeCustomer, listSavedCards, resolveCustomerForSavedCard } from './customer';

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

describe('listSavedCards', () => {
  it('GETs the cards authed by the session token, field-mapped to a narrow shape', async () => {
    fetchReturning({
      paymentMethods: [
        { id: 'pm_1', brand: 'visa', last4: '3112', expMonth: 3, expYear: 2031, extra: 'leak' },
      ],
      stripeCustomerId: 'cus_1',
    });

    const cards = await listSavedCards('tok');

    expect(cards).toEqual([{ id: 'pm_1', brand: 'visa', last4: '3112', expMonth: 3, expYear: 2031 }]);
    const [url, init] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toBe('http://pay.local/api/payment-methods');
    expect((init as RequestInit).method).toBe('GET');
    expect((init as RequestInit).headers).toMatchObject({ Authorization: 'Bearer tok' });
  });

  it('returns an empty list when the buyer has no cards', async () => {
    fetchReturning({ paymentMethods: [], stripeCustomerId: null });
    await expect(listSavedCards('tok')).resolves.toEqual([]);
  });

  it('maps a 401 to a session-expired error', async () => {
    fetchReturning({ message: 'no token' }, 401);
    await expect(listSavedCards('tok')).rejects.toMatchObject({ statusCode: 401 });
  });

  it('throws 502 on a malformed response', async () => {
    fetchReturning({ nope: true });
    await expect(listSavedCards('tok')).rejects.toMatchObject({ statusCode: 502 });
  });

  it('throws 502 when the service is unreachable', async () => {
    global.fetch = vi.fn(async () => {
      throw new Error('econnrefused');
    }) as typeof fetch;
    await expect(listSavedCards('tok')).rejects.toMatchObject({ statusCode: 502 });
  });
});

describe('resolveCustomerForSavedCard', () => {
  it('returns the customer id when the card belongs to the buyer (no attach/POST)', async () => {
    fetchReturning({
      paymentMethods: [{ id: 'pm_1', brand: 'visa', last4: '3112', expMonth: 3, expYear: 2031 }],
      stripeCustomerId: 'cus_1',
    });

    const id = await resolveCustomerForSavedCard('tok', 'pm_1');

    expect(id).toBe('cus_1');
    // It only GETs (verifies ownership) — it must never attach the card again.
    expect((global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][1]).toMatchObject({ method: 'GET' });
  });

  it('rejects (400) a card that is not among the buyer’s saved cards', async () => {
    fetchReturning({
      paymentMethods: [{ id: 'pm_other', brand: 'visa', last4: '0000', expMonth: 1, expYear: 2030 }],
      stripeCustomerId: 'cus_1',
    });
    await expect(resolveCustomerForSavedCard('tok', 'pm_1')).rejects.toMatchObject({ statusCode: 400 });
  });

  it('rejects (400) when the buyer has no Stripe customer', async () => {
    fetchReturning({ paymentMethods: [], stripeCustomerId: null });
    await expect(resolveCustomerForSavedCard('tok', 'pm_1')).rejects.toMatchObject({ statusCode: 400 });
  });
});
