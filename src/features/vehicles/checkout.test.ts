import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('server-only', () => ({}));

// Mock the Stripe client and the customer resolver so no key/network is needed.
const stripeMock = {
  paymentIntents: { create: vi.fn() },
  refunds: { create: vi.fn() },
};
vi.mock('./stripe', () => ({ getStripe: () => stripeMock }));

const customerMock = vi.hoisted(() => ({
  resolveStripeCustomer: vi.fn(),
  resolveCustomerForSavedCard: vi.fn(),
}));
vi.mock('./customer', () => customerMock);

import { processVehicleCheckout } from './checkout';
import { VehicleCheckoutError } from './config';

const INPUT = {
  passId: 'ghostline',
  paymentMethodId: 'pm_1',
  walletAddress: '0xBuyer',
  userId: 'user-1',
  sessionToken: 'tok',
  savedCard: false,
};

function fetchReturning(bodyObj: unknown, status = 200) {
  global.fetch = vi.fn(async () => new Response(JSON.stringify(bodyObj), { status })) as typeof fetch;
}

beforeEach(() => {
  stripeMock.paymentIntents.create.mockReset();
  stripeMock.refunds.create.mockReset();
  customerMock.resolveStripeCustomer.mockReset().mockResolvedValue('cus_9');
  customerMock.resolveCustomerForSavedCard.mockReset().mockResolvedValue('cus_saved');
  vi.stubEnv('WW_TX_SERVER_URL', 'http://tx.local/');
  vi.stubEnv('VEHICLE_ADMIN_SALE_API_KEY', 'secret-key');
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe('processVehicleCheckout', () => {
  it('resolves the customer server-side, charges the server price, and mints', async () => {
    stripeMock.paymentIntents.create.mockResolvedValueOnce({ id: 'pi_1', status: 'succeeded' });
    fetchReturning({ error: null, data: { transactionHash: '0xTX' } });

    const result = await processVehicleCheckout(INPUT);

    expect(result).toEqual({ status: 'delivered', transactionHash: '0xTX' });
    // Customer resolved from the session token + payment method, never from the client.
    expect(customerMock.resolveStripeCustomer).toHaveBeenCalledWith('tok', 'pm_1');

    const [charge] = stripeMock.paymentIntents.create.mock.calls[0];
    expect(charge).toMatchObject({
      amount: 1900, // ghostline = $19, from the catalogue
      currency: 'usd',
      payment_method: 'pm_1',
      confirm: true,
      customer: 'cus_9', // the server-resolved customer
      metadata: expect.objectContaining({ product: 'vehicle', modelId: '1', walletAddress: '0xBuyer' }),
    });

    const [url, init] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toBe('http://tx.local/api/v2/transactions/vehicle-admin-sale');
    expect((init as RequestInit).headers).toMatchObject({ 'x-api-key': 'secret-key' });
    expect(JSON.parse((init as RequestInit).body as string)).toEqual({
      playerWalletAddress: '0xBuyer',
      modelId: 1,
      quantity: 1,
    });
    // New card: it attaches, and never takes the saved-card (no-attach) path.
    expect(customerMock.resolveCustomerForSavedCard).not.toHaveBeenCalled();
  });

  it('reuses a saved card without re-attaching (savedCard=true)', async () => {
    stripeMock.paymentIntents.create.mockResolvedValueOnce({ id: 'pi_1', status: 'succeeded' });
    fetchReturning({ error: null, data: { transactionHash: '0xTX' } });

    const result = await processVehicleCheckout({ ...INPUT, savedCard: true });

    expect(result).toEqual({ status: 'delivered', transactionHash: '0xTX' });
    // The saved-card resolver (no attach) is used; the attaching resolver is NOT.
    expect(customerMock.resolveCustomerForSavedCard).toHaveBeenCalledWith('tok', 'pm_1');
    expect(customerMock.resolveStripeCustomer).not.toHaveBeenCalled();
    const [charge] = stripeMock.paymentIntents.create.mock.calls[0];
    expect(charge).toMatchObject({ payment_method: 'pm_1', customer: 'cus_saved' });
  });

  it('does not charge if the customer cannot be resolved', async () => {
    customerMock.resolveStripeCustomer.mockRejectedValueOnce(new VehicleCheckoutError(502, 'payments down'));
    await expect(processVehicleCheckout(INPUT)).rejects.toMatchObject({ statusCode: 502 });
    expect(stripeMock.paymentIntents.create).not.toHaveBeenCalled();
  });

  it('rejects an unknown pass before touching payments', async () => {
    await expect(processVehicleCheckout({ ...INPUT, passId: 'nope' })).rejects.toMatchObject({
      statusCode: 400,
    });
    expect(customerMock.resolveStripeCustomer).not.toHaveBeenCalled();
    expect(stripeMock.paymentIntents.create).not.toHaveBeenCalled();
  });

  it('surfaces a non-succeeded payment and does not mint', async () => {
    stripeMock.paymentIntents.create.mockResolvedValueOnce({
      id: 'pi_1',
      status: 'requires_payment_method',
      last_payment_error: { message: 'Your card was declined.' },
    });
    global.fetch = vi.fn() as typeof fetch;

    await expect(processVehicleCheckout(INPUT)).rejects.toMatchObject({
      statusCode: 402,
      message: 'Your card was declined.',
    });
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('refunds the charge when the mint fails outright', async () => {
    stripeMock.paymentIntents.create.mockResolvedValueOnce({ id: 'pi_1', status: 'succeeded' });
    stripeMock.refunds.create.mockResolvedValueOnce({ id: 're_1' });
    fetchReturning({ error: 'mint blew up', data: null }, 500);

    await expect(processVehicleCheckout(INPUT)).rejects.toBeInstanceOf(VehicleCheckoutError);
    expect(stripeMock.refunds.create).toHaveBeenCalledWith({ payment_intent: 'pi_1' });
  });

  it('does NOT refund on a mint timeout, returning pending', async () => {
    stripeMock.paymentIntents.create.mockResolvedValueOnce({ id: 'pi_1', status: 'succeeded' });
    global.fetch = vi.fn(async () => {
      const e = new Error('timed out');
      e.name = 'TimeoutError';
      throw e;
    }) as typeof fetch;

    const result = await processVehicleCheckout(INPUT);

    expect(result.status).toBe('pending');
    expect(stripeMock.refunds.create).not.toHaveBeenCalled();
  });
});
