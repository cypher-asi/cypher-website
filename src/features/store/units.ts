import 'server-only';
import { keccak256, stringToBytes } from 'thirdweb/utils';

/**
 * A priced bag line, exactly as it is stored in an order's `details.lines` when the
 * bag is charged (see processStoreCheckout). The unit price is the server-resolved
 * `priceCents`, never a client value.
 */
export type PricedLine = {
  productId: string;
  variantId: string;
  quantity: number;
  /** Unit price in USD cents (the line's approved price). */
  priceCents: number;
};

/**
 * One deliverable unit of a paid bag: one WilderClothing NFT to mint. A line with
 * quantity 2 expands to two units, each with its own `settlementId`.
 */
export type OrderUnit = {
  /** Index into the order's `details.lines` array. Stable across retries. */
  lineIndex: number;
  /** Position within the line, 0..quantity-1. Stable across retries. */
  unitIndex: number;
  productId: string;
  variantId: string;
  /** This unit's price in USD cents, for a per-unit partial refund. */
  priceCents: number;
  /** The on-chain idempotency key for this unit (see settlementId). */
  settlementId: string;
};

/**
 * The deterministic on-chain idempotency key for one unit.
 *
 * `keccak256(utf8("<stripePaymentIntentId>:<lineIndex>:<unitIndex>"))`, matching the
 * string the store mint service hashes. The contract mints each `settlementId` at
 * most once ever, so a retry that reproduces the exact id is a no-op
 * (`already_settled`) rather than a double mint. `stringToBytes` is the explicit
 * UTF-8 encoding (never a hex decode), so the bytes always match the mint service.
 */
export function settlementId(
  paymentIntentId: string,
  lineIndex: number,
  unitIndex: number,
): string {
  return keccak256(stringToBytes(`${paymentIntentId}:${lineIndex}:${unitIndex}`));
}

/**
 * Expand a paid bag's priced lines into individual units, one per quantity, each
 * carrying its deterministic `settlementId`.
 *
 * `lineIndex` is the `details.lines` array index and `unitIndex` runs 0..quantity-1,
 * both derived identically every call, so a retry reproduces the exact same units
 * and ids. Two units of the SAME edition therefore get two DISTINCT settlementIds
 * (via `unitIndex`), which is what lets quantity > 1 mint more than once.
 *
 * Fails loud on a non-positive or non-integer quantity: silently mis-expanding a
 * paid order (the money is already taken) is exactly the failure that must never
 * pass quietly. In the real flow `priceCart` has already validated quantity.
 */
export function expandCartToUnits(paymentIntentId: string, lines: PricedLine[]): OrderUnit[] {
  const units: OrderUnit[] = [];
  lines.forEach((line, lineIndex) => {
    if (!Number.isSafeInteger(line.quantity) || line.quantity < 1) {
      throw new Error(
        `Cannot expand units: line ${lineIndex} (${line.productId}) has an invalid quantity ${line.quantity}`,
      );
    }
    for (let unitIndex = 0; unitIndex < line.quantity; unitIndex += 1) {
      units.push({
        lineIndex,
        unitIndex,
        productId: line.productId,
        variantId: line.variantId,
        priceCents: line.priceCents,
        settlementId: settlementId(paymentIntentId, lineIndex, unitIndex),
      });
    }
  });
  return units;
}
