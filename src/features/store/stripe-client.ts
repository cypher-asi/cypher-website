import { loadStripe, type Stripe } from '@stripe/stripe-js';

let promise: Promise<Stripe | null> | null = null;

/**
 * Memoized browser Stripe.js loader for the store checkout (Elements). Resolves
 * to null when the publishable key is unset, so the checkout can degrade to a
 * "payment unavailable" state rather than throw.
 *
 * Self-contained: the store does not import the vehicles feature, but it reuses
 * the same client publishable key (NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY) — there is
 * only one Stripe account for the site.
 */
export function getStripePromise(): Promise<Stripe | null> {
  if (promise) return promise;
  const key = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
  promise = key ? loadStripe(key) : Promise.resolve(null);
  return promise;
}
