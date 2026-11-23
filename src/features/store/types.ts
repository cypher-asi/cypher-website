/**
 * Client-safe store-checkout types. Shared by the server-side payments proxy and
 * the browser checkout form, so this module must stay free of 'server-only' imports.
 */

/**
 * The state of a store order after the card is charged. 'paid' means the money is
 * taken and delivery is not yet known, and the other four are delivery outcomes.
 * Shared client and server (the checkout result carries it to the confirmation UI),
 * so it lives in this client-safe module and is re-exported from the order store.
 */
export type StoreOrderStatus = 'paid' | 'delivered' | 'undelivered' | 'refunded' | 'refund_failed';

/** One line of the bag: what to buy and how many. Prices are resolved server-side. */
export type CartLine = {
  productId: string;
  variantId: string;
  quantity: number;
};

/** A saved card as surfaced to the checkout UI (never any Stripe customer id). */
export type SavedCard = {
  id: string;
  brand: string;
  last4: string;
  expMonth: number;
  expYear: number;
};
