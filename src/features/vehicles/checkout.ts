import 'server-only';
import { createHash } from 'node:crypto';
import { getStripe } from './stripe';
import { resolveStripeCustomer, resolveCustomerForSavedCard } from './customer';
import {
  resolveVehiclePurchase,
  vehicleAdminSaleApiKey,
  VehicleCheckoutError,
  wwTxServerUrl,
} from './config';
import { recordVehicleOrder, type RecordVehicleOrderInput } from './orders';

/** How long to wait on the mint before treating it as pending (mirrors packs). */
const MINT_TIMEOUT_MS = 60_000;

/**
 * Record an order without letting a failure reach the buyer.
 *
 * recordVehicleOrder is documented never to throw and is tested for it. This
 * enforces the same thing at the call site rather than trusting another module
 * to keep its promise, because every call below happens after the card has been
 * charged: a bug in recording must never be able to fail a paid-for purchase.
 * Loud if the impossible happens, so it cannot rot silently.
 */
function record(input: RecordVehicleOrderInput): Promise<void> {
  return recordVehicleOrder(input).catch((err) => {
    console.error('[vehicles] order write threw, which should not be possible:', err);
  });
}

export type CheckoutInput = {
  passId: string;
  paymentMethodId: string;
  /** Recipient wallet, resolved SERVER-SIDE from the session — never from the client. */
  walletAddress: string;
  /** ZERO user id, for Stripe metadata. */
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

export type CheckoutResult =
  | { status: 'delivered'; transactionHash: string }
  | { status: 'pending'; message: string };

/**
 * Charge the card and deliver the vehicle in one synchronous flow (the packs
 * pattern): create+confirm a PaymentIntent, and on success mint the NFT via the
 * executor. If the mint fails outright the charge is refunded; if it times out
 * we do NOT refund (the mint may have landed) and return a pending status so the
 * buyer is told to contact support rather than retry.
 */
export async function processVehicleCheckout(input: CheckoutInput): Promise<CheckoutResult> {
  const { passId, paymentMethodId, walletAddress, userId, sessionToken, savedCard, email } = input;
  const purchase = resolveVehiclePurchase(passId); // server-side price + model id

  // Resolve the buyer's Stripe customer from their authenticated session (keyed by
  // zero-payments-server from the token, never a client-supplied id) before charging.
  // A saved card is reused without re-attaching (no duplicate); a new card is attached.
  const stripeCustomerId = savedCard
    ? await resolveCustomerForSavedCard(sessionToken, paymentMethodId)
    : await resolveStripeCustomer(sessionToken, paymentMethodId);
  const stripe = getStripe();

  // Deterministic key so an accidental double-submit within a short window cannot
  // double-charge the same purchase (mirrors packs' 30s bucket).
  const timeWindow = Math.floor(Date.now() / 30_000);
  const idempotencyKey = createHash('sha256')
    .update(`${paymentMethodId}-${walletAddress}-${purchase.modelId}-${timeWindow}`)
    .digest('hex');

  const paymentIntent = await stripe.paymentIntents.create(
    {
      amount: purchase.priceCents,
      currency: 'usd',
      payment_method: paymentMethodId,
      confirm: true,
      description: `Wilder World Vehicle - ${purchase.passName}`,
      customer: stripeCustomerId,
      receipt_email: email,
      metadata: {
        product: 'vehicle',
        passId,
        modelId: String(purchase.modelId),
        walletAddress,
        userId,
      },
      automatic_payment_methods: { enabled: true, allow_redirects: 'never' },
    },
    { idempotencyKey },
  );

  if (paymentIntent.status !== 'succeeded') {
    const reason = paymentIntent.last_payment_error?.message ?? `Payment ${paymentIntent.status}`;
    throw new VehicleCheckoutError(402, reason);
  }

  // The money is taken, so from here every exit records where the purchase got
  // to. Recorded before the mint rather than only after it, because the failure
  // worth protecting against is this process dying mid-delivery: that is exactly
  // the case where nothing else would ever know the charge happened.
  //
  // Awaiting these is safe because record() cannot reject. Billing keys on the
  // payment intent id and will not move a status backwards, so the second write
  // advances the same row rather than creating another.
  const order = {
    zeroUserId: userId,
    stripePaymentIntentId: paymentIntent.id,
    amountCents: purchase.priceCents,
    walletAddress,
    details: { passId, modelId: purchase.modelId },
  };
  await record({ ...order, status: 'paid' });

  // Paid. Deliver the NFT.
  try {
    const transactionHash = await mintVehicle(walletAddress, purchase.modelId);
    await record({ ...order, status: 'delivered', transactionHash });
    return { status: 'delivered', transactionHash };
  } catch (err) {
    if (err instanceof MintTimeoutError) {
      // Deliberately not refunded, because the mint may still land. This is the
      // outcome the order store exists for: before it, a purchase that ended
      // here left no trace and nobody knew to look unless the buyer complained.
      await record({
        ...order,
        status: 'undelivered',
        errorCode: 'MINT_TIMEOUT',
        errorMessage: `No response from the mint executor within ${MINT_TIMEOUT_MS}ms`,
      });
      // The lead line only. What the buyer should do about it belongs on the
      // panel, which knows what they bought and where it was going.
      return {
        status: 'pending',
        message: 'Your payment went through and your vehicle is taking longer than usual to arrive.',
      };
    }
    const refunded = await tryRefund(paymentIntent.id);
    // A failed refund is the worst outcome there is: charged, nothing delivered,
    // nothing given back. It needs a person, so it has to be findable.
    const code = refunded ? 'MINT_FAILED_REFUNDED' : 'MINT_FAILED_REFUND_FAILED';
    await record({
      ...order,
      status: refunded ? 'refunded' : 'refund_failed',
      errorCode: code,
      errorMessage: err instanceof Error ? err.message : String(err),
    });
    // The same code goes to the buyer's screen and onto the order, so the two
    // cannot drift into describing the same purchase differently.
    throw new VehicleCheckoutError(
      502,
      refunded
        ? 'We could not deliver your vehicle, so your payment was refunded. Please try again.'
        : // Lead line only, as with pending: the panel owns what to do next, and
          // saying "contact support" here would say it twice.
          'Your payment was taken and we could not deliver your vehicle. We were not able to return your payment automatically either.',
      code,
    );
  }
}

class MintTimeoutError extends Error {}

/** Call the mint executor (ww-tx-server) to deliver the vehicle. Returns the tx hash. */
async function mintVehicle(walletAddress: string, modelId: number): Promise<string> {
  let res: Response;
  try {
    res = await fetch(`${wwTxServerUrl()}/api/v2/transactions/vehicle-admin-sale`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': vehicleAdminSaleApiKey() },
      body: JSON.stringify({ playerWalletAddress: walletAddress, modelId, quantity: 1 }),
      signal: AbortSignal.timeout(MINT_TIMEOUT_MS),
    });
  } catch (err) {
    if (err instanceof Error && (err.name === 'TimeoutError' || err.name === 'AbortError')) {
      throw new MintTimeoutError();
    }
    throw err;
  }

  const body = (await res.json().catch(() => null)) as {
    error: string | null;
    data: { transactionHash: string } | null;
  } | null;

  if (!res.ok || !body || body.error || !body.data?.transactionHash) {
    throw new Error(body?.error ?? `mint failed (${res.status})`);
  }
  return body.data.transactionHash;
}

/** Refund a charge, reporting whether it succeeded so the message stays truthful. */
async function tryRefund(paymentIntentId: string): Promise<boolean> {
  try {
    await getStripe().refunds.create({ payment_intent: paymentIntentId });
    return true;
  } catch {
    return false;
  }
}
