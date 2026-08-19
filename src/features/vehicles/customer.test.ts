import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('server-only', () => ({}));

const stripeMock = { customers: { retrieve: vi.fn() } };
vi.mock('./stripe', () => ({ getStripe: () => stripeMock }));

import { resolveStripeCustomer, resolveCustomerForSavedCard, listCheckoutPrefill } from './customer';

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

describe('listCheckoutPrefill — the cards it lists', () => {
  it('GETs the cards authed by the session token, field-mapped to a narrow shape', async () => {
    fetchReturning({
      paymentMethods: [
        { id: 'pm_1', brand: 'visa', last4: '3112', expMonth: 3, expYear: 2031, extra: 'leak' },
      ],
      stripeCustomerId: 'cus_1',
    });

    const { cards } = await listCheckoutPrefill('tok');

    expect(cards).toEqual([{ id: 'pm_1', brand: 'visa', last4: '3112', expMonth: 3, expYear: 2031 }]);
    const [url, init] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toBe('http://pay.local/api/payment-methods');
    expect((init as RequestInit).method).toBe('GET');
    expect((init as RequestInit).headers).toMatchObject({ Authorization: 'Bearer tok' });
  });

  it('returns an empty list when the buyer has no cards', async () => {
    fetchReturning({ paymentMethods: [], stripeCustomerId: null });
    await expect(listCheckoutPrefill('tok')).resolves.toMatchObject({ cards: [] });
  });

  it('maps a 401 to a session-expired error', async () => {
    fetchReturning({ message: 'no token' }, 401);
    await expect(listCheckoutPrefill('tok')).rejects.toMatchObject({ statusCode: 401 });
  });

  it('throws 502 on a malformed response', async () => {
    fetchReturning({ nope: true });
    await expect(listCheckoutPrefill('tok')).rejects.toMatchObject({ statusCode: 502 });
  });

  it('throws 502 when the service is unreachable', async () => {
    global.fetch = vi.fn(async () => {
      throw new Error('econnrefused');
    }) as typeof fetch;
    await expect(listCheckoutPrefill('tok')).rejects.toMatchObject({ statusCode: 502 });
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

describe('listCheckoutPrefill', () => {
  beforeEach(() => {
    stripeMock.customers.retrieve.mockReset();
  });

  it('returns the cards plus the email held on the Stripe customer', async () => {
    fetchReturning({ stripeCustomerId: 'cus_1', paymentMethods: [{ id: 'pm_1', brand: 'visa', last4: '3112' }] });
    stripeMock.customers.retrieve.mockResolvedValueOnce({ id: 'cus_1', email: 'buyer@example.com' });

    const { cards, stripeEmail } = await listCheckoutPrefill('tok');

    expect(cards).toHaveLength(1);
    expect(stripeEmail).toBe('buyer@example.com');
    expect(stripeMock.customers.retrieve).toHaveBeenCalledWith('cus_1');
  });

  it('has no email to offer when the buyer has no Stripe customer yet', async () => {
    fetchReturning({ stripeCustomerId: null, paymentMethods: [] });

    const { cards, stripeEmail } = await listCheckoutPrefill('tok');

    expect(cards).toEqual([]);
    expect(stripeEmail).toBeNull();
    expect(stripeMock.customers.retrieve).not.toHaveBeenCalled();
  });

  it('has no email when the customer was created without one', async () => {
    fetchReturning({ stripeCustomerId: 'cus_1', paymentMethods: [] });
    stripeMock.customers.retrieve.mockResolvedValueOnce({ id: 'cus_1', email: null });

    expect((await listCheckoutPrefill('tok')).stripeEmail).toBeNull();
  });

  it('has no email for a deleted customer', async () => {
    fetchReturning({ stripeCustomerId: 'cus_1', paymentMethods: [] });
    stripeMock.customers.retrieve.mockResolvedValueOnce({ id: 'cus_1', deleted: true });

    expect((await listCheckoutPrefill('tok')).stripeEmail).toBeNull();
  });

  it('keeps the saved cards when the Stripe lookup fails', async () => {
    fetchReturning({ stripeCustomerId: 'cus_1', paymentMethods: [{ id: 'pm_1', brand: 'visa', last4: '3112' }] });
    stripeMock.customers.retrieve.mockRejectedValueOnce(new Error('stripe down'));

    const { cards, stripeEmail } = await listCheckoutPrefill('tok');

    expect(cards).toHaveLength(1); // the prefill email is never worth losing a card over
    expect(stripeEmail).toBeNull();
  });
});
