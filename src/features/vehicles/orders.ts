import 'server-only';
import { internalServiceToken, zeroPaymentsUrl } from './config';

/**
 * How long to wait on the order store before giving up.
 *
 * Every call happens after the card is charged, so a slow or dead billing
 * service must cost the buyer a moment, never the purchase. Short on purpose:
 * the buyer is sitting on a spinner while this runs.
 */
const ORDER_WRITE_TIMEOUT_MS = 5_000;

/**
 * Mirrors ORDER_STATUSES in zero-payments-server. Kept as a literal union rather
 * than imported because the two repos do not share a package.
 *
 * `paid` means the money is taken and delivery is not yet known. `undelivered`
 * means the mint went quiet and was deliberately NOT refunded, because it may
 * still land. `refund_failed` means the mint failed AND the refund failed, so
 * the buyer is out of pocket with nothing to show: the worst of the five.
 */
export type VehicleOrderStatus =
  | 'paid'
  | 'delivered'
  | 'undelivered'
  | 'refunded'
  | 'refund_failed';

export type RecordVehicleOrderInput = {
  /** The ZERO user id. Billing maps it to its own user row. */
  zeroUserId: string;
  /** The idempotency key the order store upserts on. */
  stripePaymentIntentId: string;
  amountCents: number;
  walletAddress: string;
  status: VehicleOrderStatus;
  /** The mint, once known. */
  transactionHash?: string;
  details?: Record<string, unknown>;
  /** A short, stable label for what went wrong. Billing rejects over 50 chars. */
  errorCode?: string;
  /** The underlying error, for a person reading the row later. No length limit. */
  errorMessage?: string;
};

/**
 * Record a vehicle order, or advance one already recorded.
 *
 * **This never throws, and callers depend on that.** It runs only after the card
 * has been charged, so anything it raises would turn a completed purchase into a
 * failed one, which is far worse than the missing row it is trying to prevent.
 * Every failure is logged loudly and swallowed. The whole body sits inside the
 * try for that reason, including resolving the url and the token.
 *
 * Safe to call repeatedly for one purchase: billing keys on the payment intent
 * id and refuses to move a status backwards, so a write that arrives late cannot
 * undo a more settled one.
 */
export async function recordVehicleOrder(input: RecordVehicleOrderInput): Promise<void> {
  try {
    const res = await fetch(`${zeroPaymentsUrl()}/internal/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-internal-token': internalServiceToken(),
      },
      // Undefined optional fields are dropped by JSON.stringify, which is what
      // billing's schema expects: absent, not null.
      body: JSON.stringify({ product: 'vehicle', ...input }),
      signal: AbortSignal.timeout(ORDER_WRITE_TIMEOUT_MS),
    });

    if (!res.ok) {
      // Read the body even though nothing acts on it: billing explains a refused
      // write in there, and leaving it unconsumed holds the connection open.
      const detail = await res.text().catch(() => '');
      console.error(
        `[vehicles] order write returned ${res.status} for ${input.stripePaymentIntentId} (${input.status}): ${detail}`,
      );
    }
  } catch (err) {
    console.error(
      `[vehicles] order write failed for ${input.stripePaymentIntentId} (${input.status}):`,
      err,
    );
  }
}
