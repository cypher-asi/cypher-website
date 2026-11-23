import 'server-only';
import { createHash } from 'node:crypto';
import { getStripe } from './stripe';
import { resolveStripeCustomer, resolveCustomerForSavedCard } from './customer';
import { resolveProductPurchase, StoreCheckoutError } from './config';
import { recordStoreOrder, type RecordStoreOrderInput, type StoreOrderStatus } from './orders';
import { deliverStoreOrder } from './deliver';
import type { CartLine } from './types';

/** The largest quantity of one line we accept, matching the bag's own cap. */
const MAX_LINE_QUANTITY = 99;

/** A cart line once the server has resolved its approved unit price. */
type PricedLine = CartLine & {
  /** Unit price in USD cents, from the approved pricebook (never the client). */
  priceCents: number;
};

export type CheckoutInput = {
  /** The bag's lines. Prices are resolved server-side, never trusted from the request. */
  lines: CartLine[];
  paymentMethodId: string;
  /** Recipient wallet, resolved SERVER-SIDE from the session — never from the client. */
  walletAddress: string;
  /** ZERO user id, for Stripe metadata and the order record. */
  userId: string;
  /** The signed-in session's zos token, used to resolve the Stripe customer server-side. */
  sessionToken: string;
  /**
   * True when paymentMethodId is an already-saved card being reused (charge it as-is,
   * no re-attach); false for a freshly-entered card (attach it so it saves for later).
   */
  savedCard: boolean;
  /** Where Stripe emails the payment receipt (the buyer entered it; validated by the route). */
  email: string;
};

/**
 * The bag was charged and delivery was attempted synchronously, per unit, mirroring
 * the vehicle flow. `status` is always 'paid' once the card succeeded. `delivery`
 * carries the fulfilment outcome (delivered, undelivered, refunded or refund_failed),
 * whose full per-unit breakdown lives in the order's details.
 */
export type CheckoutResult = {
  status: 'paid';
  paymentIntentId: string;
  amountCents: number;
  delivery: StoreOrderStatus;
};

/**
 * Record an order without letting a failure reach the buyer.
 *
 * recordStoreOrder is documented never to throw and is tested for it. This enforces
 * the same at the call site rather than trusting another module, because the write
 * happens after the card is charged: a bug in recording must never fail a paid-for
 * purchase. Loud if the impossible happens, so it cannot rot silently.
 */
function record(input: RecordStoreOrderInput): Promise<void> {
  return recordStoreOrder(input).catch((err) => {
    console.error('[store] order write threw, which should not be possible:', err);
  });
}

/**
 * Resolve every bag line to its server-side approved price and return the priced lines
 * plus the bag total in USD cents.
 *
 * Fail-closed: throws before any charge if the bag is empty, a quantity is out of range,
 * or any line has no approved price / checkout is disabled (resolveProductPurchase is the
 * gate). So a bag is never charged unless every line is independently chargeable, and the
 * total is always summed from our approved pricebook, never from the request.
 */
function priceCart(lines: CartLine[]): { pricedLines: PricedLine[]; totalCents: number } {
  if (!Array.isArray(lines) || lines.length === 0) {
    throw new StoreCheckoutError(400, 'Your bag is empty.');
  }
  let totalCents = 0;
  const pricedLines: PricedLine[] = lines.map((line) => {
    if (!Number.isSafeInteger(line.quantity) || line.quantity < 1 || line.quantity > MAX_LINE_QUANTITY) {
      throw new StoreCheckoutError(400, `Invalid quantity for product: ${line.productId}`);
    }
    const purchase = resolveProductPurchase(line.productId, line.variantId); // server price, gated
    totalCents += purchase.priceCents * line.quantity;
    return {
      productId: line.productId,
      variantId: line.variantId,
      quantity: line.quantity,
      priceCents: purchase.priceCents,
    };
  });
  if (totalCents <= 0) {
    throw new StoreCheckoutError(400, 'This bag has no chargeable total.');
  }
  return { pricedLines, totalCents };
}

/**
 * A deterministic idempotency key for the whole bag, so an accidental double-submit
 * within a short window cannot double-charge the same bag (mirrors the packs pattern).
 * Keyed on the payment method, recipient wallet, the exact bag contents, and a 30s
 * bucket: a genuinely different bag (or a later retry) charges, a rapid repeat does not.
 */
function cartIdempotencyKey(
  paymentMethodId: string,
  walletAddress: string,
  pricedLines: PricedLine[],
): string {
  const signature = pricedLines
    .map((line) => `${line.productId}:${line.variantId}:${line.quantity}:${line.priceCents}`)
    .sort()
    .join('|');
  const timeWindow = Math.floor(Date.now() / 30_000);
  return createHash('sha256')
    .update(`${paymentMethodId}-${walletAddress}-${signature}-${timeWindow}`)
    .digest('hex');
}

/**
 * Charge the whole bag in one PaymentIntent, record it paid, then deliver it.
 *
 * Per-line prices are resolved server-side and summed (priceCart), fail-closed until
 * production prices are approved and checkout is enabled, so the amount always comes
 * from our approved pricebook, never the request. Once the card succeeds the order is
 * recorded 'paid' before delivery, then delivery runs synchronously per unit
 * (deliverStoreOrder), which records the final per-unit outcome. Delivery never
 * rethrows here: a fault is recorded undelivered for a retry, so it can never fail a
 * purchase the buyer has already paid for. The gate keeps this flow inert until on.
 */
export async function processStoreCheckout(input: CheckoutInput): Promise<CheckoutResult> {
  const { lines, paymentMethodId, walletAddress, userId, sessionToken, savedCard, email } = input;

  const { pricedLines, totalCents } = priceCart(lines);

  // Resolve the buyer's Stripe customer from their authenticated session (keyed by
  // zero-payments-server from the token, never a client-supplied id) before charging.
  // A saved card is reused without re-attaching (no duplicate); a new card is attached.
  const stripeCustomerId = savedCard
    ? await resolveCustomerForSavedCard(sessionToken, paymentMethodId)
    : await resolveStripeCustomer(sessionToken, paymentMethodId);
  const stripe = getStripe();

  const idempotencyKey = cartIdempotencyKey(paymentMethodId, walletAddress, pricedLines);

  const paymentIntent = await stripe.paymentIntents.create(
    {
      amount: totalCents,
      currency: 'usd',
      payment_method: paymentMethodId,
      confirm: true,
      description: `Wilder World - ${pricedLines.length} item${pricedLines.length === 1 ? '' : 's'}`,
      customer: stripeCustomerId,
      receipt_email: email,
      metadata: {
        product: 'store',
        walletAddress,
        userId,
        lineCount: String(pricedLines.length),
      },
      automatic_payment_methods: { enabled: true, allow_redirects: 'never' },
    },
    { idempotencyKey },
  );

  if (paymentIntent.status !== 'succeeded') {
    const reason = paymentIntent.last_payment_error?.message ?? `Payment ${paymentIntent.status}`;
    throw new StoreCheckoutError(402, reason);
  }

  // The money is taken, so record the order paid BEFORE delivery. The per-line
  // breakdown lives in details, and the per-unit delivery status is added by
  // deliverStoreOrder. record() cannot reject.
  await record({
    zeroUserId: userId,
    stripePaymentIntentId: paymentIntent.id,
    amountCents: totalCents,
    walletAddress,
    status: 'paid',
    details: { lines: pricedLines },
  });

  // Paid. Deliver synchronously, per unit (mirrors the vehicle flow). deliverStoreOrder
  // records its own final order status. It can still throw on a truly unexpected fault,
  // so it is wrapped here: a throw is recorded undelivered for a retry and never fails a
  // purchase the buyer has already paid for.
  let delivery: StoreOrderStatus;
  try {
    const outcome = await deliverStoreOrder({
      zeroUserId: userId,
      paymentIntentId: paymentIntent.id,
      amountCents: totalCents,
      walletAddress,
      pricedLines,
    });
    delivery = outcome.status;
  } catch (err) {
    console.error(`[store] delivery threw for ${paymentIntent.id}, recording undelivered:`, err);
    await record({
      zeroUserId: userId,
      stripePaymentIntentId: paymentIntent.id,
      amountCents: totalCents,
      walletAddress,
      status: 'undelivered',
      details: { lines: pricedLines },
      errorCode: 'STORE_DELIVERY_ERROR',
      errorMessage: err instanceof Error ? err.message : String(err),
    });
    delivery = 'undelivered';
  }

  return { status: 'paid', paymentIntentId: paymentIntent.id, amountCents: totalCents, delivery };
}
