import 'server-only';
import type { StoreOrderStatus } from './orders';
import type { MintLineResult } from './mint';

/**
 * Our per-unit delivery state, carried in an order's `details.units`.
 *
 *  - `delivered`      the NFT minted (or an earlier call already settled it).
 *  - `pending`        outcome unknown or retryable, never refunded, retried later.
 *  - `refunded`       a proven-final failure that is the buyer's loss, money returned.
 *  - `refund_failed`  a refund was owed but the refund itself failed. Needs a person.
 *  - `review`         the wallet cannot receive the NFT. Needs a person, not a refund.
 */
export type UnitDeliveryStatus = 'delivered' | 'pending' | 'refunded' | 'refund_failed' | 'review';

/**
 * What to do with a unit before the refund I/O runs. `refund` becomes `refunded` or
 * `refund_failed` once the Stripe refund is attempted. The others are terminal or
 * retryable as-is.
 */
export type UnitDisposition = 'delivered' | 'pending' | 'review' | 'refund';

export type Disposition = {
  disposition: UnitDisposition;
  /** The endpoint reason or our resolve-error code, kept for support. */
  reason: string | null;
  transactionHash: string | null;
  tokenId: string | null;
};

/**
 * Decide a unit's disposition from the mint endpoint's result, per STORE_MINT_API.md
 * and design §6. Refund ONLY on the two proven-final reverts (`sold_out`,
 * `unknown_edition`). Everything else is retried (`pending`) or sent for review, so a
 * refund can never claw back a delivered NFT, and an unknown outcome is never refunded.
 */
export function dispositionForMint(result: MintLineResult): Disposition {
  switch (result.status) {
    case 'minted':
    case 'already_settled':
      return {
        disposition: 'delivered',
        reason: null,
        transactionHash: result.transactionHash,
        tokenId: result.tokenId,
      };
    case 'pending':
      return { disposition: 'pending', reason: null, transactionHash: null, tokenId: null };
    case 'failed':
      switch (result.reason) {
        case 'sold_out':
        case 'unknown_edition':
          return { disposition: 'refund', reason: result.reason, transactionHash: null, tokenId: null };
        case 'invalid_recipient':
          return { disposition: 'review', reason: result.reason, transactionHash: null, tokenId: null };
        case 'paused':
        case 'mint_failed':
          return { disposition: 'pending', reason: result.reason, transactionHash: null, tokenId: null };
        default:
          // A failed line with no known reason: never refund on an unknown, retry.
          return { disposition: 'pending', reason: result.reason, transactionHash: null, tokenId: null };
      }
    default:
      // An unknown status: never refund on an unknown, retry.
      return { disposition: 'pending', reason: null, transactionHash: null, tokenId: null };
  }
}

/**
 * Decide a unit's disposition when its editionId could not be resolved BEFORE the
 * mint call (see editions.ts). An unknown edition is a catalogue mismatch, treated
 * the same as the endpoint's `unknown_edition` (refund). A missing or malformed
 * catalogue is our data/config fault, not the buyer's, so it is never refunded: it
 * is retried (`pending`) or sent for review.
 */
export function dispositionForResolveError(code: string | undefined): Disposition {
  switch (code) {
    case 'UNKNOWN_EDITION':
      return { disposition: 'refund', reason: 'unknown_edition', transactionHash: null, tokenId: null };
    case 'MALFORMED_EDITION_ID':
      return { disposition: 'review', reason: 'malformed_edition', transactionHash: null, tokenId: null };
    case 'CATALOGUE_NOT_CONFIGURED':
    default:
      return { disposition: 'pending', reason: 'catalogue_not_configured', transactionHash: null, tokenId: null };
  }
}

/**
 * Roll every unit's final status into the one order status (the five zps statuses).
 *
 * Precedence, worst first:
 *  - any `refund_failed` -> `refund_failed` (money taken, nothing given back: needs a person).
 *  - any `pending` or `review` -> `undelivered` (not all units are settled yet).
 *  - all `refunded` -> `refunded`.
 *  - otherwise (at least one delivered, the rest refunded) -> `delivered`.
 *
 * The per-unit truth always lives in `details.units`. This is only the coarse order
 * header. Assumes at least one unit (an empty bag never reaches delivery).
 */
export function aggregateStatus(statuses: UnitDeliveryStatus[]): StoreOrderStatus {
  if (statuses.some((s) => s === 'refund_failed')) return 'refund_failed';
  if (statuses.some((s) => s === 'pending' || s === 'review')) return 'undelivered';
  if (statuses.every((s) => s === 'refunded')) return 'refunded';
  return 'delivered';
}
