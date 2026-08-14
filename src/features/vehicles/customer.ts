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
 * List the authenticated buyer's saved cards via zero-payments-server. The cards
 * belong to the Stripe customer that the service derives from the bearer token (the
 * session's own zos token) — never anything the client supplies — so this only ever
 * returns the caller's own cards. Field-mapped to a narrow shape (no customer id or
 * other internals leak to the browser).
 */
export async function listSavedCards(sessionToken: string): Promise<SavedCard[]> {
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
  } | null;

  if (!res.ok || !Array.isArray(body?.paymentMethods)) {
    throw new VehicleCheckoutError(502, 'Could not load your saved cards. Please try again.');
  }

  return body.paymentMethods.map((c) => ({
    id: c.id,
    brand: c.brand,
    last4: c.last4,
    expMonth: c.expMonth,
    expYear: c.expYear,
  }));
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
