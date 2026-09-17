import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';

vi.mock('server-only', () => ({}));

/**
 * The order client against a real billing service.
 *
 * The unit tests stub fetch, so nothing there proves the payload is actually
 * accepted: field names, types, the auth header and the status ranking are all
 * agreements with another repo that no test has ever checked. These do check
 * them, over real HTTP.
 *
 * Skipped unless configured, so a normal `npm test` is unaffected. Point it at
 * the DEV billing service, never production: it writes rows.
 *
 *   ORDERS_IT_URL=https://billing-dev.zero.tech \
 *   ORDERS_IT_TOKEN=<billing-dev INTERNAL_SERVICE_TOKEN> \
 *   ORDERS_IT_USER=<a zero user id that exists in billing-dev> \
 *   npx vitest run src/features/vehicles/orders.integration.test.ts
 *
 * The rows it writes are tagged with a recognisable payment intent id so they
 * can be found and removed afterwards:
 *
 *   DELETE FROM orders WHERE stripe_payment_intent_id LIKE 'pi_it%';
 *
 * These run in order and build on each other: the second advances the row the
 * first created. That is deliberate, because advancing an existing order is the
 * behaviour most worth proving, but it means they are not independent.
 */
const URL_ = process.env.ORDERS_IT_URL;
const TOKEN = process.env.ORDERS_IT_TOKEN;
const USER = process.env.ORDERS_IT_USER;
const CONFIGURED = Boolean(URL_ && TOKEN && USER);

if (URL_ && /(^|\/\/)billing\.zero\.tech/.test(URL_)) {
  throw new Error('Refusing to run against production billing: this test writes rows.');
}

// Unique per run so repeat runs never collide on the payment intent id, which
// is the store's idempotency key.
const RUN = `it${Date.now()}`;
const WALLET = `0xAbCdEf${RUN.slice(-10)}`;

describe.skipIf(!CONFIGURED)('recordVehicleOrder against a real billing service', () => {
  let recordVehicleOrder: typeof import('./orders').recordVehicleOrder;
  const errors: unknown[][] = [];

  beforeAll(async () => {
    // config.ts reads these at call time, so stubbing here is enough.
    vi.stubEnv('ZERO_PAYMENTS_URL', URL_!);
    vi.stubEnv('INTERNAL_SERVICE_TOKEN', TOKEN!);
    // The client swallows every failure, so capture the log: it is the only
    // evidence a write was refused.
    vi.spyOn(console, 'error').mockImplementation((...args) => {
      errors.push(args);
    });
    ({ recordVehicleOrder } = await import('./orders'));
  });

  afterAll(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
    console.log(`\nRows written by this run: payment intents starting "pi_${RUN}"`);
  });

  /** Read orders back the way support would. */
  async function ordersForWallet(): Promise<Record<string, unknown>[]> {
    const res = await fetch(
      `${URL_}/internal/orders?walletAddress=${WALLET.toLowerCase()}`,
      { headers: { 'x-internal-token': TOKEN! } },
    );
    expect(res.status).toBe(200);
    return (await res.json()).orders;
  }

  const base = (suffix: string) => ({
    zeroUserId: USER!,
    stripePaymentIntentId: `pi_${RUN}_${suffix}`,
    amountCents: 1900,
    walletAddress: WALLET,
    details: { passId: 'ghostline', modelId: 1 },
  });

  it('is accepted by the real schema, with nothing logged', async () => {
    // The whole point: if a field name or type is wrong, billing 400s and the
    // client swallows it. The absence of a log is the assertion.
    await recordVehicleOrder({ ...base('happy'), status: 'paid' });

    expect(errors).toEqual([]);
    const orders = await ordersForWallet();
    expect(orders).toHaveLength(1);
    expect(orders[0]).toMatchObject({
      status: 'paid',
      amountCents: 1900,
      product: 'vehicle',
      details: { passId: 'ghostline', modelId: 1 },
    });
  });

  it('advances the same row rather than creating a second one', async () => {
    await recordVehicleOrder({
      ...base('happy'),
      status: 'delivered',
      transactionHash: '0xintegration',
    });

    expect(errors).toEqual([]);
    const orders = await ordersForWallet();
    expect(orders).toHaveLength(1);
    expect(orders[0]).toMatchObject({
      status: 'delivered',
      transactionHash: '0xintegration',
    });
    expect(orders[0].deliveredAt).toBeTruthy();
  });

  it('will not let a late write undo a delivered order', async () => {
    // The webhook safety net only ever knows the money was taken. If the ranking
    // is wrong, this is what silently loses a delivery.
    await recordVehicleOrder({ ...base('happy'), status: 'paid' });

    expect(errors).toEqual([]);
    const [order] = await ordersForWallet();
    expect(order.status).toBe('delivered');
    expect(order.transactionHash).toBe('0xintegration');
  });

  it('accepts the failure statuses, with their codes and messages', async () => {
    // refund_failed is the outcome that most needs to be findable, so it is the
    // one most worth proving the real service stores.
    await recordVehicleOrder({
      ...base('refundfail'),
      status: 'refund_failed',
      errorCode: 'MINT_FAILED_REFUND_FAILED',
      errorMessage: 'mint failed and the refund was declined',
    });

    expect(errors).toEqual([]);
    const orders = await ordersForWallet();
    expect(orders).toHaveLength(2);
    const failed = orders.find((o) => o.status === 'refund_failed');
    expect(failed).toMatchObject({
      errorCode: 'MINT_FAILED_REFUND_FAILED',
      errorMessage: 'mint failed and the refund was declined',
    });
  });

  it('is found by the reconciler when a mint goes quiet', async () => {
    await recordVehicleOrder({
      ...base('stuck'),
      status: 'undelivered',
      errorCode: 'MINT_TIMEOUT',
      errorMessage: 'No response from the mint executor within 60000ms',
    });

    expect(errors).toEqual([]);
    const res = await fetch(`${URL_}/internal/orders?status=undelivered&limit=500`, {
      headers: { 'x-internal-token': TOKEN! },
    });
    const { orders } = await res.json();
    expect(orders.map((o: { stripePaymentIntentId: string }) => o.stripePaymentIntentId)).toContain(
      `pi_${RUN}_stuck`,
    );
  });

  it('logs loudly, and does not throw, when the user cannot be attributed', async () => {
    // A payment nobody can be charged for is the one case billing refuses.
    errors.length = 0;
    await expect(
      recordVehicleOrder({
        ...base('nouser'),
        zeroUserId: `does-not-exist-${RUN}`,
        status: 'paid',
      }),
    ).resolves.toBeUndefined();

    expect(errors.flat().join(' ')).toContain('404');
  });

  it('logs loudly, and does not throw, when the token is wrong', async () => {
    vi.stubEnv('INTERNAL_SERVICE_TOKEN', 'not-the-token');
    errors.length = 0;

    await expect(
      recordVehicleOrder({ ...base('badtoken'), status: 'paid' }),
    ).resolves.toBeUndefined();

    expect(errors.flat().join(' ')).toContain('401');
    vi.stubEnv('INTERNAL_SERVICE_TOKEN', TOKEN!);
  });
});
