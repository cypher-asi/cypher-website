import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('server-only', () => ({}));

// Mock the Stripe client so no key or network is needed.
const stripeMock = {
  paymentIntents: { create: vi.fn() },
  refunds: { create: vi.fn() },
};
vi.mock('./stripe', () => ({ getStripe: () => stripeMock }));

import { processVehicleCheckout } from './checkout';
import { VehicleCheckoutError } from './config';

const INPUT = {
  passId: 'ghostline',
  paymentMethodId: 'pm_1',
  walletAddress: '0xBuyer',
  userId: 'user-1',
};

function fetchReturning(bodyObj: unknown, status = 200) {
  global.fetch = vi.fn(async () => new Response(JSON.stringify(bodyObj), { status })) as typeof fetch;
}

beforeEach(() => {
  stripeMock.paymentIntents.create.mockReset();
  stripeMock.refunds.create.mockReset();
  vi.stubEnv('WW_TX_SERVER_URL', 'http://tx.local/');
  vi.stubEnv('VEHICLE_ADMIN_SALE_API_KEY', 'secret-key');
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe('processVehicleCheckout', () => {
  it('charges the server-side price and mints on success', async () => {
    stripeMock.paymentIntents.create.mockResolvedValueOnce({ id: 'pi_1', status: 'succeeded' });
    fetchReturning({ error: null, data: { transactionHash: '0xTX' } });

    const result = await processVehicleCheckout(INPUT);

    expect(result).toEqual({ status: 'delivered', transactionHash: '0xTX' });

    // Price + model id come from the catalogue, not the caller.
    const [charge] = stripeMock.paymentIntents.create.mock.calls[0];
    expect(charge).toMatchObject({
      amount: 1900, // ghostline = $19
      currency: 'usd',
      payment_method: 'pm_1',
      confirm: true,
      metadata: expect.objectContaining({ product: 'vehicle', modelId: '1', walletAddress: '0xBuyer' }),
    });

    // Mint call carries the server-resolved wallet + model id and the api key.
    const [url, init] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toBe('http://tx.local/api/v2/transactions/vehicle-admin-sale');
    expect((init as RequestInit).headers).toMatchObject({ 'x-api-key': 'secret-key' });
    expect(JSON.parse((init as RequestInit).body as string)).toEqual({
      playerWalletAddress: '0xBuyer',
      modelId: 1,
      quantity: 1,
    });
  });

  it('attaches an existing Stripe customer when provided', async () => {
    stripeMock.paymentIntents.create.mockResolvedValueOnce({ id: 'pi_1', status: 'succeeded' });
    fetchReturning({ error: null, data: { transactionHash: '0xTX' } });

    await processVehicleCheckout({ ...INPUT, stripeCustomerId: 'cus_9' });

    expect(stripeMock.paymentIntents.create.mock.calls[0][0]).toMatchObject({ customer: 'cus_9' });
  });

  it('rejects an unknown pass before charging anything', async () => {
    await expect(processVehicleCheckout({ ...INPUT, passId: 'nope' })).rejects.toMatchObject({
      statusCode: 400,
    });
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
