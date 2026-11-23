import 'server-only';
import approval from '@/sites/wilderworld/marketplace/preview-prices.json';
import { findMarketProduct } from '@/sites/wilderworld/marketplace/catalog';

/**
 * Error for the store checkout path. Mirrors VehicleCheckoutError: an HTTP
 * status, a stable machine code, and a buyer-facing message, so the same code
 * can go to the order record and the buyer's screen without the two drifting.
 */
export class StoreCheckoutError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly code?: string,
  ) {
    super(message);
    this.name = 'StoreCheckoutError';
  }
}

/**
 * Whether real store checkout is allowed to run. BOTH must be true: the final
 * production prices are approved AND checkout is switched on. Both ship false
 * (prices are display-only placeholders), so this fail-closes until a deliberate
 * approval flips them. We must never charge a preview price.
 */
export function storeCheckoutApproved(): boolean {
  return approval.productionPriceApproved === true && approval.checkoutEnabled === true;
}

export type StoreProductPurchase = {
  productId: string;
  variantId: string;
  name: string;
  /** Price in USD cents, resolved SERVER-SIDE from the approved pricebook. */
  priceCents: number;
};

/**
 * Resolve the price for a store product + variant SERVER-SIDE. The client only
 * ever sends a product id and a variant id — never a price — so the charged
 * amount always comes from our own approved pricebook, never the request.
 *
 * Fail-closed: throws 503 until production prices are approved and checkout is
 * enabled; 400 for an unknown product or variant; 400 when the product has no
 * approved price (a preview placeholder is never chargeable).
 */
export function resolveProductPurchase(productId: string, variantId: string): StoreProductPurchase {
  if (!storeCheckoutApproved()) {
    throw new StoreCheckoutError(503, 'Store checkout is not enabled yet.', 'CHECKOUT_DISABLED');
  }
  const product = findMarketProduct(productId);
  if (!product) {
    throw new StoreCheckoutError(400, `Unknown product: ${productId}`, 'UNKNOWN_PRODUCT');
  }
  if (!product.variants.some((variant) => variant.id === variantId)) {
    throw new StoreCheckoutError(400, `Unknown variant: ${variantId}`, 'UNKNOWN_VARIANT');
  }
  const approved = (approval.products as Record<string, { priceCents: number }>)[productId];
  if (!approved || !Number.isSafeInteger(approved.priceCents) || approved.priceCents <= 0) {
    throw new StoreCheckoutError(400, `No approved price for product: ${productId}`, 'PRICE_NOT_APPROVED');
  }
  return { productId, variantId, name: product.name, priceCents: approved.priceCents };
}

// Infra readers for the shared services. Deliberately self-contained — the store
// reads the same env vars as the vehicles feature but does not import from it, so
// if the car funnel is ever removed the store is untouched. All fail loud.

/** Base URL of the ZERO payments service (the order store). Fails loud if unset. */
export function zeroPaymentsUrl(): string {
  const url = process.env.ZERO_PAYMENTS_URL;
  if (!url) throw new StoreCheckoutError(503, 'ZERO_PAYMENTS_URL is not configured');
  return url.replace(/\/+$/, '');
}

/**
 * Shared secret for zero-payments-server's internal endpoints. Fails loud if unset.
 *
 * Server-only, like everything in this module: no NEXT_PUBLIC_ prefix, so Next
 * never inlines it into the client bundle. The 503 it throws is not meant to
 * reach a buyer; its only caller records orders AFTER the card is charged and
 * swallows everything, so an unset token is loud in the logs and invisible to
 * the purchase.
 */
export function internalServiceToken(): string {
  const token = process.env.INTERNAL_SERVICE_TOKEN;
  if (!token) throw new StoreCheckoutError(503, 'INTERNAL_SERVICE_TOKEN is not configured');
  return token;
}

/**
 * Base URL of the store mint service: the dedicated store-tx host that delivers
 * each paid unit as a WilderClothing NFT. It is a SEPARATE deployment from the
 * vehicle/packs ww-tx-server, with its own key, so it has its own env rather than
 * reusing WW_TX_SERVER_URL. The mint client appends `/api/v2/store/mint`. Testnet
 * and mainnet differ only by this env and the key. Fails loud if unset.
 */
export function storeMintUrl(): string {
  const url = process.env.STORE_MINT_URL;
  if (!url) throw new StoreCheckoutError(503, 'STORE_MINT_URL is not configured');
  return url.replace(/\/+$/, '');
}

/**
 * Shared secret for the store mint service, sent as the `x-api-key` header.
 *
 * Server-only (no NEXT_PUBLIC_ prefix) so Next never inlines it into the client
 * bundle: the mint is only ever called from our server, after the card is
 * charged. Fails loud if unset.
 */
export function storeMintApiKey(): string {
  const key = process.env.STORE_MINT_API_KEY;
  if (!key) throw new StoreCheckoutError(503, 'STORE_MINT_API_KEY is not configured');
  return key;
}
