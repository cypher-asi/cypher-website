import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('server-only', () => ({}));

// Mock the Stripe client and the customer resolver so no key/network is needed.
const stripeMock = {
  paymentIntents: { create: vi.fn() },
};
vi.mock('./stripe', () => ({ getStripe: () => stripeMock }));

const customerMock = vi.hoisted(() => ({
  resolveStripeCustomer: vi.fn(),
  resolveCustomerForSavedCard: vi.fn(),
}));
vi.mock('./customer', () => customerMock);

// Mocked so each recorded outcome can be asserted directly.
const ordersMock = vi.hoisted(() => ({ recordStoreOrder: vi.fn() }));
vi.mock('./orders', () => ordersMock);

// Delivery has its own tests (deliver.test.ts); mock it here so the charge flow stays
// the focus and the delivery outcome is controllable.
const deliverMock = vi.hoisted(() => ({ deliverStoreOrder: vi.fn() }));
vi.mock('./deliver', () => deliverMock);

// Keep the real config readers and error class; only the price resolver is mocked,
// because its own gate/validation is covered in config.test.ts and here we are
// testing the flow's orchestration.
const configMock = vi.hoisted(() => ({ resolveProductPurchase: vi.fn() }));
vi.mock('./config', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./config')>();
  return { ...actual, resolveProductPurchase: configMock.resolveProductPurchase };
});

import { processStoreCheckout } from './checkout';
import { StoreCheckoutError } from './config';

const INPUT = {
  lines: [{ productId: 'jckt-1', variantId: 'red', quantity: 1 }],
  paymentMethodId: 'pm_1',
  walletAddress: '0xBuyer',
  userId: 'user-1',
  sessionToken: 'tok',
  savedCard: false,
  email: 'buyer@example.com',
};

beforeEach(() => {
  stripeMock.paymentIntents.create.mockReset();
  customerMock.resolveStripeCustomer.mockReset().mockResolvedValue('cus_9');
  customerMock.resolveCustomerForSavedCard.mockReset().mockResolvedValue('cus_saved');
  ordersMock.recordStoreOrder.mockReset().mockResolvedValue(undefined);
  deliverMock.deliverStoreOrder.mockReset().mockResolvedValue({ status: 'delivered', units: [] });
  // Default: every line resolves to a $50 approved price, keyed by product + variant.
  configMock.resolveProductPurchase
    .mockReset()
    .mockImplementation((productId: string, variantId: string) => ({
      productId,
      variantId,
      name: 'Flux Jacket',
      priceCents: 5000,
    }));
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('processStoreCheckout (bag charge)', () => {
  it('resolves the customer server-side, charges the server price, and records paid', async () => {
    stripeMock.paymentIntents.create.mockResolvedValueOnce({ id: 'pi_1', status: 'succeeded' });

    const result = await processStoreCheckout(INPUT);

    expect(result).toEqual({ status: 'paid', paymentIntentId: 'pi_1', amountCents: 5000, delivery: 'delivered' });
    // Customer resolved from the session token + payment method, never from the client.
    expect(customerMock.resolveStripeCustomer).toHaveBeenCalledWith('tok', 'pm_1');
    // Price comes from the resolver (server-side), keyed by product + variant.
    expect(configMock.resolveProductPurchase).toHaveBeenCalledWith('jckt-1', 'red');

    const [charge, opts] = stripeMock.paymentIntents.create.mock.calls[0];
    expect(charge).toMatchObject({
      amount: 5000, // from the resolved purchase, not the request
      currency: 'usd',
      payment_method: 'pm_1',
      confirm: true,
      customer: 'cus_9', // the server-resolved customer
      receipt_email: 'buyer@example.com',
      metadata: expect.objectContaining({
        product: 'store',
        walletAddress: '0xBuyer',
        userId: 'user-1',
        lineCount: '1',
      }),
    });
    // The whole bag is charged under one idempotency key.
    expect(opts).toMatchObject({ idempotencyKey: expect.any(String) });
    // New card: it attaches, and never takes the saved-card (no-attach) path.
    expect(customerMock.resolveCustomerForSavedCard).not.toHaveBeenCalled();
    // Delivery is deferred: nothing is minted here.
    const order = ordersMock.recordStoreOrder.mock.calls[0][0];
    expect(order).toMatchObject({ status: 'paid' });
    expect(order).not.toHaveProperty('transactionHash');
  });

  it('sums every line (unit price times quantity) into one charge and records the lines', async () => {
    configMock.resolveProductPurchase.mockImplementation((productId: string, variantId: string) => ({
      productId,
      variantId,
      name: 'X',
      priceCents: productId === 'jckt-1' ? 5000 : 2500,
    }));
    stripeMock.paymentIntents.create.mockResolvedValueOnce({ id: 'pi_2', status: 'succeeded' });
    const lines = [
      { productId: 'jckt-1', variantId: 'red', quantity: 2 }, // 2 x 5000 = 10000
      { productId: 'cap-1', variantId: 'blue', quantity: 3 }, // 3 x 2500 = 7500
    ];

    const result = await processStoreCheckout({ ...INPUT, lines });

    expect(result.amountCents).toBe(17500);
    expect(stripeMock.paymentIntents.create.mock.calls[0][0]).toMatchObject({
      amount: 17500,
      metadata: expect.objectContaining({ lineCount: '2' }),
    });
    const [order] = ordersMock.recordStoreOrder.mock.calls[0];
    expect(order).toMatchObject({
      zeroUserId: 'user-1',
      stripePaymentIntentId: 'pi_2',
      amountCents: 17500,
      walletAddress: '0xBuyer',
      status: 'paid',
      details: {
        lines: [
          { productId: 'jckt-1', variantId: 'red', quantity: 2, priceCents: 5000 },
          { productId: 'cap-1', variantId: 'blue', quantity: 3, priceCents: 2500 },
        ],
      },
    });
  });

  it('reuses a saved card without re-attaching (savedCard=true)', async () => {
    stripeMock.paymentIntents.create.mockResolvedValueOnce({ id: 'pi_1', status: 'succeeded' });

    await processStoreCheckout({ ...INPUT, savedCard: true });

    expect(customerMock.resolveCustomerForSavedCard).toHaveBeenCalledWith('tok', 'pm_1');
    expect(customerMock.resolveStripeCustomer).not.toHaveBeenCalled();
    expect(stripeMock.paymentIntents.create.mock.calls[0][0]).toMatchObject({
      payment_method: 'pm_1',
      customer: 'cus_saved',
    });
  });

  it('fails closed on a gated or unpriced line before touching payments', async () => {
    // The checkout gate (and product/variant validation) lives in the resolver;
    // a throw on any line must surface before resolving a customer or charging.
    configMock.resolveProductPurchase.mockImplementationOnce(() => {
      throw new StoreCheckoutError(503, 'Store checkout is not enabled yet.', 'CHECKOUT_DISABLED');
    });
    await expect(processStoreCheckout(INPUT)).rejects.toMatchObject({
      status: 503,
      code: 'CHECKOUT_DISABLED',
    });
    expect(customerMock.resolveStripeCustomer).not.toHaveBeenCalled();
    expect(stripeMock.paymentIntents.create).not.toHaveBeenCalled();
  });

  it('rejects an empty bag before touching payments', async () => {
    await expect(processStoreCheckout({ ...INPUT, lines: [] })).rejects.toMatchObject({ status: 400 });
    expect(stripeMock.paymentIntents.create).not.toHaveBeenCalled();
  });

  it('rejects an out-of-range quantity before touching payments', async () => {
    await expect(
      processStoreCheckout({ ...INPUT, lines: [{ productId: 'jckt-1', variantId: 'red', quantity: 0 }] }),
    ).rejects.toMatchObject({ status: 400 });
    await expect(
      processStoreCheckout({ ...INPUT, lines: [{ productId: 'jckt-1', variantId: 'red', quantity: 100 }] }),
    ).rejects.toMatchObject({ status: 400 });
    expect(stripeMock.paymentIntents.create).not.toHaveBeenCalled();
  });

  it('does not charge if the customer cannot be resolved', async () => {
    customerMock.resolveStripeCustomer.mockRejectedValueOnce(new StoreCheckoutError(502, 'payments down'));
    await expect(processStoreCheckout(INPUT)).rejects.toMatchObject({ status: 502 });
    expect(stripeMock.paymentIntents.create).not.toHaveBeenCalled();
  });

  it('surfaces a non-succeeded payment and records nothing', async () => {
    stripeMock.paymentIntents.create.mockResolvedValueOnce({
      id: 'pi_1',
      status: 'requires_payment_method',
      last_payment_error: { message: 'Your card was declined.' },
    });

    await expect(processStoreCheckout(INPUT)).rejects.toMatchObject({
      status: 402,
      message: 'Your card was declined.',
    });
    expect(ordersMock.recordStoreOrder).not.toHaveBeenCalled();
  });

  it('keys idempotency on the exact bag: same bag repeats the key, a different bag changes it', async () => {
    // Freeze the clock so the 30s bucket cannot shift mid-test.
    vi.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000);
    stripeMock.paymentIntents.create.mockResolvedValue({ id: 'pi_x', status: 'succeeded' });

    await processStoreCheckout(INPUT);
    const first = stripeMock.paymentIntents.create.mock.calls[0][1].idempotencyKey;
    await processStoreCheckout(INPUT);
    const second = stripeMock.paymentIntents.create.mock.calls[1][1].idempotencyKey;
    await processStoreCheckout({
      ...INPUT,
      lines: [{ productId: 'other', variantId: 'x', quantity: 1 }],
    });
    const third = stripeMock.paymentIntents.create.mock.calls[2][1].idempotencyKey;

    expect(second).toBe(first); // same bag, same window => no double-charge
    expect(third).not.toBe(first); // different bag => a distinct charge
  });

  it('delivers the paid bag synchronously and returns the delivery outcome', async () => {
    stripeMock.paymentIntents.create.mockResolvedValueOnce({ id: 'pi_1', status: 'succeeded' });
    deliverMock.deliverStoreOrder.mockResolvedValueOnce({ status: 'refunded', units: [] });

    const result = await processStoreCheckout(INPUT);

    expect(deliverMock.deliverStoreOrder).toHaveBeenCalledWith(
      expect.objectContaining({
        zeroUserId: 'user-1',
        paymentIntentId: 'pi_1',
        amountCents: 5000,
        walletAddress: '0xBuyer',
        pricedLines: [{ productId: 'jckt-1', variantId: 'red', quantity: 1, priceCents: 5000 }],
      }),
    );
    expect(result).toMatchObject({ status: 'paid', delivery: 'refunded' });
  });

  it('records undelivered and still returns paid if delivery throws (the money is taken)', async () => {
    stripeMock.paymentIntents.create.mockResolvedValueOnce({ id: 'pi_1', status: 'succeeded' });
    deliverMock.deliverStoreOrder.mockRejectedValueOnce(new Error('delivery exploded'));
    vi.spyOn(console, 'error').mockImplementation(() => {});

    const result = await processStoreCheckout(INPUT);

    expect(result).toMatchObject({ status: 'paid', delivery: 'undelivered' });
    // The paid write happens first, then the undelivered safety-net write.
    const statuses = ordersMock.recordStoreOrder.mock.calls.map((c) => c[0].status);
    expect(statuses).toEqual(['paid', 'undelivered']);
    expect(ordersMock.recordStoreOrder.mock.calls[1][0].errorCode).toBe('STORE_DELIVERY_ERROR');
  });

  it('records the paid order even if the order write throws', async () => {
    // recordStoreOrder is built never to throw, but the purchase must not depend
    // on that holding: the card is already charged by this point.
    stripeMock.paymentIntents.create.mockResolvedValueOnce({ id: 'pi_1', status: 'succeeded' });
    ordersMock.recordStoreOrder.mockRejectedValue(new Error('order store exploded'));
    vi.spyOn(console, 'error').mockImplementation(() => {});

    const result = await processStoreCheckout(INPUT);

    expect(result).toMatchObject({ status: 'paid', paymentIntentId: 'pi_1' });
    expect(console.error).toHaveBeenCalled();
  });
});
