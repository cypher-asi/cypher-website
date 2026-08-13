import 'server-only';
import { VehicleCheckoutError, zeroPaymentsUrl } from './config';

/** How long to wait on the payments service before giving up. */
const PAYMENTS_TIMEOUT_MS = 15_000;

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
