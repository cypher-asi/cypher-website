import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('server-only', () => ({}));

import { recordVehicleOrder } from './orders';

const INPUT = {
  zeroUserId: 'zero-user-1',
  stripePaymentIntentId: 'pi_1',
  amountCents: 1900,
  walletAddress: '0xBuyer',
  status: 'paid' as const,
  details: { passId: 'ghostline', modelId: 1 },
};

beforeEach(() => {
  vi.stubEnv('ZERO_PAYMENTS_URL', 'http://pay.local/');
  vi.stubEnv('INTERNAL_SERVICE_TOKEN', 'secret-token');
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

function fetchReturning(status = 200) {
  const fetchMock = vi.fn(async () => new Response('{}', { status }));
  global.fetch = fetchMock as unknown as typeof fetch;
  return fetchMock;
}

describe('recordVehicleOrder', () => {
  it('posts the order to billing with the internal token', async () => {
    const fetchMock = fetchReturning();

    await recordVehicleOrder(INPUT);

    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    // The trailing slash on the configured url must not produce a double slash.
    expect(url).toBe('http://pay.local/internal/orders');
    expect(init.method).toBe('POST');
    expect((init.headers as Record<string, string>)['x-internal-token']).toBe('secret-token');
    expect(JSON.parse(init.body as string)).toEqual({
      product: 'vehicle',
      zeroUserId: 'zero-user-1',
      stripePaymentIntentId: 'pi_1',
      amountCents: 1900,
      walletAddress: '0xBuyer',
      status: 'paid',
      details: { passId: 'ghostline', modelId: 1 },
    });
  });

  it('sends the outcome fields when they are known', async () => {
    const fetchMock = fetchReturning();

    await recordVehicleOrder({ ...INPUT, status: 'delivered', transactionHash: '0xTX' });

    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(JSON.parse(init.body as string)).toMatchObject({
      status: 'delivered',
      transactionHash: '0xTX',
    });
  });

  it('omits optional fields rather than sending them as null', async () => {
    // Billing's schema treats these as absent-or-valid, so an explicit null is a
    // 400 rather than a no-op.
    const fetchMock = fetchReturning();

    await recordVehicleOrder(INPUT);

    const body = JSON.parse(
      (fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1].body as string,
    );
    expect(body).not.toHaveProperty('transactionHash');
    expect(body).not.toHaveProperty('errorCode');
    expect(body).not.toHaveProperty('errorMessage');
  });

  it('gives up rather than hanging the buyer on a slow billing service', async () => {
    const fetchMock = fetchReturning();

    await recordVehicleOrder(INPUT);

    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(init.signal).toBeInstanceOf(AbortSignal);
  });

  // The contract the checkout flow depends on. Every one of these runs after the
  // card is charged, so a throw here would turn a completed purchase into a
  // failed one. Each must resolve, and each must be loud in the logs.
  describe('never throws, whatever goes wrong', () => {
    it('when billing rejects the write', async () => {
      // The reason billing refused is in the body, so the log has to carry it.
      global.fetch = vi.fn(
        async () => new Response('{"error":"INVALID_REQUEST"}', { status: 400 }),
      ) as unknown as typeof fetch;

      await expect(recordVehicleOrder(INPUT)).resolves.toBeUndefined();

      const logged = vi.mocked(console.error).mock.calls[0].join(' ');
      expect(logged).toContain('400');
      expect(logged).toContain('INVALID_REQUEST');
      expect(logged).toContain('pi_1');
    });

    it('when billing rejects the token', async () => {
      fetchReturning(401);

      await expect(recordVehicleOrder(INPUT)).resolves.toBeUndefined();
      expect(console.error).toHaveBeenCalled();
    });

    it('when billing is unreachable', async () => {
      global.fetch = vi.fn(async () => {
        throw new Error('ECONNREFUSED');
      }) as unknown as typeof fetch;

      await expect(recordVehicleOrder(INPUT)).resolves.toBeUndefined();
      expect(console.error).toHaveBeenCalled();
    });

    it('when the request times out', async () => {
      global.fetch = vi.fn(async () => {
        const err = new Error('The operation was aborted due to timeout');
        err.name = 'TimeoutError';
        throw err;
      }) as unknown as typeof fetch;

      await expect(recordVehicleOrder(INPUT)).resolves.toBeUndefined();
      expect(console.error).toHaveBeenCalled();
    });

    it('when the internal token is not configured', async () => {
      // The env var is missing in an environment we forgot to set it in. The
      // purchase must still complete; only the record is lost.
      vi.stubEnv('INTERNAL_SERVICE_TOKEN', '');
      const fetchMock = fetchReturning();

      await expect(recordVehicleOrder(INPUT)).resolves.toBeUndefined();
      expect(fetchMock).not.toHaveBeenCalled();
      expect(console.error).toHaveBeenCalled();
    });

    it('when the billing url is not configured', async () => {
      vi.stubEnv('ZERO_PAYMENTS_URL', '');
      const fetchMock = fetchReturning();

      await expect(recordVehicleOrder(INPUT)).resolves.toBeUndefined();
      expect(fetchMock).not.toHaveBeenCalled();
      expect(console.error).toHaveBeenCalled();
    });
  });
});
