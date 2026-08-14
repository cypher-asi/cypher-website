/**
 * Client-safe vehicle-checkout types. Shared by the server-side payments proxy and
 * the browser checkout form, so this module must stay free of 'server-only' imports.
 */

/** A saved card as surfaced to the checkout UI (never any Stripe customer id). */
export type SavedCard = {
  id: string;
  brand: string;
  last4: string;
  expMonth: number;
  expYear: number;
};
