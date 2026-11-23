import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
vi.mock('./editions', () => ({ resolveEditionId: vi.fn() }));
vi.mock('./mint', async (orig) => ({ ...(await orig<object>()), storeMint: vi.fn() }));
vi.mock('./stripe', () => ({ getStripe: vi.fn() }));
vi.mock('./orders', () => ({ recordStoreOrder: vi.fn() }));

import { deliverStoreOrder, type DeliverInput } from './deliver';
import { resolveEditionId } from './editions';
import { storeMint, StoreMintRequestError, type MintLine, type MintLineResult } from './mint';
import { getStripe } from './stripe';
import { recordStoreOrder } from './orders';
import { StoreCheckoutError } from './config';

const mockResolve = vi.mocked(resolveEditionId);
const mockStoreMint = vi.mocked(storeMint);
const mockGetStripe = vi.mocked(getStripe);
const mockRecord = vi.mocked(recordStoreOrder);
const refundCreate = vi.fn();

const EDITION = `0x${'a'.repeat(64)}`;

beforeEach(() => {
  vi.clearAllMocks();
  mockResolve.mockReturnValue(EDITION);
  refundCreate.mockResolvedValue({ id: 're_1' });
  mockGetStripe.mockReturnValue({ refunds: { create: refundCreate } } as unknown as ReturnType<
    typeof getStripe
  >);
});

afterEach(() => vi.restoreAllMocks());

function input(over: Partial<DeliverInput> = {}): DeliverInput {
  return {
    zeroUserId: 'u1',
    paymentIntentId: 'pi_1',
    amountCents: 5000,
    walletAddress: `0x${'1'.repeat(40)}`,
    pricedLines: [{ productId: 'jckt-1', variantId: 'red', quantity: 1, priceCents: 5000 }],
    ...over,
  };
}

/** Echo each requested line back with a chosen status (by position). */
function echo(statuses: Array<Partial<MintLineResult>>) {
  mockStoreMint.mockImplementation(async (_orderId: string, lines: MintLine[]) =>
    lines.map((l, i) => ({
      ...l,
      status: 'minted',
      reason: null,
      transactionHash: `0xtx${i}`,
      tokenId: String(i),
      error: null,
      ...statuses[i],
    })),
  );
}

describe('deliverStoreOrder', () => {
  it('delivers all units and records a delivered order with a representative tx', async () => {
    echo([{}, {}]);
    const out = await deliverStoreOrder(
      input({ pricedLines: [{ productId: 'jckt-1', variantId: 'red', quantity: 2, priceCents: 5000 }] }),
    );

    expect(out.status).toBe('delivered');
    expect(out.units).toHaveLength(2);
    expect(out.units.every((u) => u.status === 'delivered')).toBe(true);
    expect(mockStoreMint).toHaveBeenCalledWith('pi_1', expect.arrayContaining([
      expect.objectContaining({ editionId: EDITION, recipient: `0x${'1'.repeat(40)}` }),
    ]));
    expect(mockRecord).toHaveBeenCalledTimes(1);
    const recorded = mockRecord.mock.calls[0][0];
    expect(recorded.status).toBe('delivered');
    expect(recorded.transactionHash).toBe('0xtx0');
    expect((recorded.details as { units: unknown[] }).units).toHaveLength(2);
  });

  it('refunds a sold_out unit with a per-unit idempotency key', async () => {
    echo([{ status: 'failed', reason: 'sold_out', transactionHash: null, tokenId: null }]);
    const out = await deliverStoreOrder(input());

    expect(out.status).toBe('refunded');
    expect(out.units[0]).toMatchObject({ status: 'refunded', reason: 'sold_out', refundId: 're_1' });
    expect(refundCreate).toHaveBeenCalledWith(
      { payment_intent: 'pi_1', amount: 5000 },
      { idempotencyKey: expect.stringContaining('store-refund-') },
    );
  });

  it('keeps a partial sell-out as delivered (buyer received something)', async () => {
    echo([{}, { status: 'failed', reason: 'sold_out', transactionHash: null, tokenId: null }]);
    const out = await deliverStoreOrder(
      input({ pricedLines: [{ productId: 'jckt-1', variantId: 'red', quantity: 2, priceCents: 5000 }] }),
    );
    expect(out.status).toBe('delivered');
    expect(out.units.map((u) => u.status).sort()).toEqual(['delivered', 'refunded']);
  });

  it('marks refund_failed when the refund itself fails', async () => {
    echo([{ status: 'failed', reason: 'sold_out', transactionHash: null, tokenId: null }]);
    refundCreate.mockRejectedValueOnce(new Error('stripe down'));
    const out = await deliverStoreOrder(input());
    expect(out.status).toBe('refund_failed');
    expect(out.units[0]).toMatchObject({ status: 'refund_failed', error: 'stripe down' });
    expect(mockRecord.mock.calls[0][0].errorCode).toBe('STORE_REFUND_FAILED');
  });

  it('sends invalid_recipient to review (undelivered, no refund)', async () => {
    echo([{ status: 'failed', reason: 'invalid_recipient', transactionHash: null, tokenId: null }]);
    const out = await deliverStoreOrder(input());
    expect(out.status).toBe('undelivered');
    expect(out.units[0].status).toBe('review');
    expect(refundCreate).not.toHaveBeenCalled();
    expect(mockRecord.mock.calls[0][0].errorCode).toBe('STORE_INVALID_RECIPIENT');
  });

  it('leaves a pending mint undelivered and never refunds it', async () => {
    echo([{ status: 'pending', transactionHash: null, tokenId: null }]);
    const out = await deliverStoreOrder(input());
    expect(out.status).toBe('undelivered');
    expect(out.units[0].status).toBe('pending');
    expect(refundCreate).not.toHaveBeenCalled();
    expect(mockRecord.mock.calls[0][0].errorCode).toBe('STORE_DELIVERY_PENDING');
  });

  it('refunds an unresolved (unknown) edition without ever calling the mint endpoint', async () => {
    mockResolve.mockImplementation(() => {
      throw new StoreCheckoutError(400, 'no edition', 'UNKNOWN_EDITION');
    });
    const out = await deliverStoreOrder(input());
    expect(mockStoreMint).not.toHaveBeenCalled();
    expect(out.status).toBe('refunded');
    expect(out.units[0]).toMatchObject({ status: 'refunded', reason: 'unknown_edition', editionId: null });
  });

  it('leaves every unit pending and alerts when the mint request is rejected (4xx)', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockStoreMint.mockRejectedValue(new StoreMintRequestError(422, 'malformed'));
    const out = await deliverStoreOrder(input());
    expect(out.status).toBe('undelivered');
    expect(out.units[0].status).toBe('pending');
    expect(errorSpy).toHaveBeenCalled();
  });

  it('always records the order even when delivery is incomplete (the money is taken)', async () => {
    echo([{ status: 'pending', transactionHash: null, tokenId: null }]);
    await deliverStoreOrder(input());
    expect(mockRecord).toHaveBeenCalledTimes(1);
    expect(mockRecord.mock.calls[0][0].stripePaymentIntentId).toBe('pi_1');
  });
});
