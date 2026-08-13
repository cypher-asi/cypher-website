import 'server-only';
import { createHash } from 'node:crypto';
import { getStripe } from './stripe';
import {
  resolveVehiclePurchase,
  vehicleAdminSaleApiKey,
  VehicleCheckoutError,
  wwTxServerUrl,
} from './config';

/** How long to wait on the mint before treating it as pending (mirrors packs). */
const MINT_TIMEOUT_MS = 60_000;

export type CheckoutInput = {
  passId: string;
  paymentMethodId: string;
  /** Existing Stripe customer for this ZERO user, resolved upstream (never created here). */
  stripeCustomerId?: string;
  /** Recipient wallet, resolved SERVER-SIDE from the session — never from the client. */
  walletAddress: string;
  /** ZERO user id, for Stripe metadata. */
  userId: string;
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
  const { passId, paymentMethodId, stripeCustomerId, walletAddress, userId } = input;
  const purchase = resolveVehiclePurchase(passId); // server-side price + model id
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
      ...(stripeCustomerId ? { customer: stripeCustomerId } : {}),
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

  // Paid. Deliver the NFT.
  try {
    const transactionHash = await mintVehicle(walletAddress, purchase.modelId);
    return { status: 'delivered', transactionHash };
  } catch (err) {
    if (err instanceof MintTimeoutError) {
      return {
        status: 'pending',
        message:
          'Payment received. Delivery is taking longer than expected — if your vehicle does not arrive shortly, please contact support.',
      };
    }
    const refunded = await tryRefund(paymentIntent.id);
    throw new VehicleCheckoutError(
      502,
      refunded
        ? 'We could not deliver your vehicle, so your payment was refunded. Please try again.'
        : 'We could not deliver your vehicle. Please contact support to resolve your payment.',
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
