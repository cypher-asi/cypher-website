import 'server-only';
import Stripe from 'stripe';
import { VehicleCheckoutError } from './config';

let client: Stripe | null = null;

/**
 * Lazily construct the Stripe client from the server-only secret key. Lazy so a
 * missing key surfaces as a request-time 503 rather than a boot-time crash, and
 * so the key is never needed to import this module under test.
 */
export function getStripe(): Stripe {
  if (client) return client;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new VehicleCheckoutError(503, 'STRIPE_SECRET_KEY is not configured');
  client = new Stripe(key);
  return client;
}
