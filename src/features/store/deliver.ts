import 'server-only';
import { getStripe } from './stripe';
import { StoreCheckoutError } from './config';
import { resolveEditionId } from './editions';
import { storeMint, StoreMintRequestError, type MintLine, type MintLineResult } from './mint';
import { expandCartToUnits, type OrderUnit, type PricedLine } from './units';
import { recordStoreOrder } from './orders';
import {
  aggregateStatus,
  dispositionForMint,
  dispositionForResolveError,
  type Disposition,
  type UnitDeliveryStatus,
} from './fulfillment';
import type { StoreOrderStatus } from './orders';

export type DeliverInput = {
  zeroUserId: string;
  /** The bag's PaymentIntent id, also the mint orderId and settlementId seed. */
  paymentIntentId: string;
  amountCents: number;
  /** The buyer's ZERO wallet, the mint recipient. */
  walletAddress: string;
  /** The priced bag lines, exactly as recorded in the order's details at 'paid'. */
  pricedLines: PricedLine[];
};

/** One unit's full delivery record, stored in the order's details.units. */
export type UnitRecord = {
  lineIndex: number;
  unitIndex: number;
  productId: string;
  variantId: string;
  /** Resolved editionId, or null when resolution failed. */
  editionId: string | null;
  settlementId: string;
  priceCents: number;
  recipient: string;
  status: UnitDeliveryStatus;
  reason: string | null;
  transactionHash: string | null;
  tokenId: string | null;
  refundId: string | null;
  error: string | null;
};

export type DeliveryOutcome = {
  status: StoreOrderStatus;
  units: UnitRecord[];
};

/** A resolved unit ready to mint, or one whose editionId could not be resolved. */
type Prepared =
  | { unit: OrderUnit; line: MintLine; resolveError?: undefined }
  | { unit: OrderUnit; line?: undefined; resolveError: string | undefined };

/**
 * Apply a unit's disposition, doing the Stripe refund I/O for a `refund`, and return
 * its final record. A refund uses a per-unit idempotency key, so a retry of the same
 * settlement never refunds twice. A refund that itself fails becomes `refund_failed`
 * (the money is stuck and needs a person), never a lost signal.
 */
async function finalizeUnit(
  input: DeliverInput,
  unit: OrderUnit,
  editionId: string | null,
  disp: Disposition,
): Promise<UnitRecord> {
  let status: UnitDeliveryStatus;
  let refundId: string | null = null;
  let error: string | null = null;

  if (disp.disposition === 'refund') {
    try {
      const refund = await getStripe().refunds.create(
        { payment_intent: input.paymentIntentId, amount: unit.priceCents },
        { idempotencyKey: `store-refund-${unit.settlementId}` },
      );
      refundId = refund.id;
      status = 'refunded';
    } catch (err) {
      status = 'refund_failed';
      error = err instanceof Error ? err.message : String(err);
    }
  } else {
    status = disp.disposition;
  }

  return {
    lineIndex: unit.lineIndex,
    unitIndex: unit.unitIndex,
    productId: unit.productId,
    variantId: unit.variantId,
    editionId,
    settlementId: unit.settlementId,
    priceCents: unit.priceCents,
    recipient: input.walletAddress,
    status,
    reason: disp.reason,
    transactionHash: disp.transactionHash,
    tokenId: disp.tokenId,
    refundId,
    error,
  };
}

/** The order-level error code + message for a status that needs following up. */
function orderError(
  status: StoreOrderStatus,
  records: UnitRecord[],
): { errorCode?: string; errorMessage?: string } {
  if (status === 'refund_failed') {
    return {
      errorCode: 'STORE_REFUND_FAILED',
      errorMessage: 'One or more unit refunds failed and need manual action.',
    };
  }
  if (status === 'undelivered') {
    if (records.some((r) => r.status === 'review')) {
      return {
        errorCode: 'STORE_INVALID_RECIPIENT',
        errorMessage: 'One or more units could not be delivered to the wallet and need review.',
      };
    }
    return {
      errorCode: 'STORE_DELIVERY_PENDING',
      errorMessage: 'One or more units are still pending delivery.',
    };
  }
  return {};
}

/**
 * Deliver a paid bag: resolve each unit's edition, mint the resolvable ones, refund
 * the proven-final failures, and record the order with a per-unit breakdown.
 *
 * Mirrors the vehicle flow, per unit. Resolution failures and mint outcomes both go
 * through the §6 disposition logic, so refunds only ever happen for a proven-final
 * failure and an unknown outcome is always left pending (undelivered), never refunded
 * and never minted twice (settlementIds are deterministic). The money is already
 * taken, so the result is always recorded, even when some units are still pending.
 */
export async function deliverStoreOrder(input: DeliverInput): Promise<DeliveryOutcome> {
  const units = expandCartToUnits(input.paymentIntentId, input.pricedLines);

  // Resolve editions up front, splitting the units we can mint from the ones whose
  // edition could not be resolved (a catalogue mismatch or a missing catalogue).
  const prepared: Prepared[] = units.map((unit) => {
    try {
      const editionId = resolveEditionId(unit.productId, unit.variantId);
      return { unit, line: { settlementId: unit.settlementId, editionId, recipient: input.walletAddress } };
    } catch (err) {
      const code = err instanceof StoreCheckoutError ? err.code : undefined;
      return { unit, resolveError: code };
    }
  });

  const mintable = prepared.filter((p): p is Extract<Prepared, { line: MintLine }> => Boolean(p.line));

  // Mint the resolvable units. A 4xx means nothing was processed, so leave the
  // results empty (every mintable unit falls through to pending) and alert loudly.
  let mintResults: MintLineResult[] = [];
  if (mintable.length > 0) {
    try {
      mintResults = await storeMint(
        input.paymentIntentId,
        mintable.map((m) => m.line),
      );
    } catch (err) {
      if (err instanceof StoreMintRequestError) {
        console.error(
          `[store] mint request rejected (${err.httpStatus}) for ${input.paymentIntentId}: ${err.message}`,
        );
      } else {
        throw err;
      }
    }
  }
  const bySettlement = new Map(mintResults.map((r) => [r.settlementId, r]));

  const records: UnitRecord[] = [];
  for (const p of prepared) {
    if (p.line) {
      const result = bySettlement.get(p.unit.settlementId);
      // A missing result (4xx, or an outcome the client could not determine) is an
      // unknown outcome: pending, never refunded.
      const disp: Disposition = result
        ? dispositionForMint(result)
        : { disposition: 'pending', reason: null, transactionHash: null, tokenId: null };
      records.push(await finalizeUnit(input, p.unit, p.line.editionId, disp));
    } else {
      records.push(await finalizeUnit(input, p.unit, null, dispositionForResolveError(p.resolveError)));
    }
  }

  records.sort((a, b) => a.lineIndex - b.lineIndex || a.unitIndex - b.unitIndex);

  const status = aggregateStatus(records.map((r) => r.status));
  const transactionHash = records.find((r) => r.transactionHash)?.transactionHash ?? undefined;

  await recordStoreOrder({
    zeroUserId: input.zeroUserId,
    stripePaymentIntentId: input.paymentIntentId,
    amountCents: input.amountCents,
    walletAddress: input.walletAddress,
    status,
    transactionHash,
    details: { lines: input.pricedLines, units: records },
    ...orderError(status, records),
  });

  return { status, units: records };
}
