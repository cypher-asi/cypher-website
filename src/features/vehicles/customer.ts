import 'server-only';
import { VehicleCheckoutError, zeroPaymentsUrl } from './config';

/** How long to wait on the payments service before giving up. */
const PAYMENTS_TIMEOUT_MS = 15_000;

/** A card the buyer has saved with zero-payments-server, safe to show/reuse. */
export type SavedCard = {
  id: string;
  brand: string;
  last4: string;
  expMonth: number;
  expYear: number;
};

/**
 * Fetch the authenticated buyer's payment methods via zero-payments-server. The
 * cards belong to the Stripe customer that the service derives from the bearer token
 * (the session's own zos token) — never anything the client supplies — so this only
 * ever returns the caller's own data. Cards are field-mapped to a narrow shape; the
 * customer id is kept for server-side use and never handed to callers that expose it.
 */
async function fetchPaymentMethods(
  sessionToken: string,
): Promise<{ cards: SavedCard[]; stripeCustomerId: string | null }> {
  let res: Response;
  try {
    res = await fetch(`${zeroPaymentsUrl()}/api/payment-methods`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${sessionToken}` },
      signal: AbortSignal.timeout(PAYMENTS_TIMEOUT_MS),
    });
  } catch {
    throw new VehicleCheckoutError(502, 'Could not reach the payments service. Please try again.');
  }

  if (res.status === 401) {
    throw new VehicleCheckoutError(401, 'Your session has expired. Please sign in again.');
  }

  const body = (await res.json().catch(() => null)) as {
    paymentMethods?: SavedCard[];
    stripeCustomerId?: string | null;
  } | null;

  if (!res.ok || !Array.isArray(body?.paymentMethods)) {
    throw new VehicleCheckoutError(502, 'Could not load your saved cards. Please try again.');
  }

  return {
    cards: body.paymentMethods.map((c) => ({
      id: c.id,
      brand: c.brand,
      last4: c.last4,
      expMonth: c.expMonth,
      expYear: c.expYear,
    })),
    stripeCustomerId: body.stripeCustomerId ?? null,
  };
}

/** List the buyer's saved cards for the checkout UI (browser-safe: no customer id). */
export async function listSavedCards(sessionToken: string): Promise<SavedCard[]> {
  return (await fetchPaymentMethods(sessionToken)).cards;
}

/**
 * Resolve the Stripe customer for a charge on an ALREADY-SAVED card, verifying the
 * card belongs to this buyer. Unlike resolveStripeCustomer this does NOT attach — the
 * saved card is reused exactly as-is, so paying with a saved card never creates a
 * duplicate payment method (the bug that re-attaching on every checkout causes).
 */
export async function resolveCustomerForSavedCard(
  sessionToken: string,
  paymentMethodId: string,
): Promise<string> {
  const { cards, stripeCustomerId } = await fetchPaymentMethods(sessionToken);
  if (!stripeCustomerId || !cards.some((c) => c.id === paymentMethodId)) {
    throw new VehicleCheckoutError(400, 'That saved card could not be found. Please pick another card.');
  }
  return stripeCustomerId;
}

/**
 * Resolve the buyer's Stripe customer via zero-payments-server, keyed to the
 * authenticated ZERO user. The customer is derived by zero-payments-server from
 * the bearer token (the session's own zos token) — never from anything the client
 * supplies — so a caller cannot attach a charge to someone else's customer. Also
 * attaches the just-tokenized card to that customer. Returns the customer id.
 */
export async function resolveStripeCustomer(
  sessionToken: string,
  paymentMethodId: string,
): Promise<string> {
  let res: Response;
  try {
    res = await fetch(`${zeroPaymentsUrl()}/api/payment-methods`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sessionToken}`,
      },
      body: JSON.stringify({ paymentMethodId }),
      signal: AbortSignal.timeout(PAYMENTS_TIMEOUT_MS),
    });
  } catch {
    throw new VehicleCheckoutError(502, 'Could not reach the payments service. Please try again.');
  }

  if (res.status === 401) {
    throw new VehicleCheckoutError(401, 'Your session has expired. Please sign in again.');
  }

  const body = (await res.json().catch(() => null)) as {
    stripeCustomerId?: string;
    message?: string;
  } | null;

  if (!res.ok || !body?.stripeCustomerId) {
    throw new VehicleCheckoutError(502, body?.message ?? 'Could not set up payment. Please try again.');
  }
  return body.stripeCustomerId;
}
