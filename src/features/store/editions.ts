import 'server-only';
import { StoreCheckoutError } from './config';
import catalogueIds from './catalogue-ids.json';

/**
 * One on-chain WilderClothing edition, as carried in catalogue-ids.json.
 *
 * We own this file's shape and populate `editions` from the catalogue-ids.json the
 * mint / DevOps team share once the editions are approved on chain. `sourceId` is
 * our productId, `colorway` is our variantId, and `editionId` is the bytes32 the
 * mint endpoint settles against. `cap` and `uri` are carried for reference and are
 * not used by the resolver. The file ships empty, so delivery fails loud until the
 * real catalogue lands (checkout is gated off in the meantime).
 */
export type CatalogueEdition = {
  sourceId: string;
  colorway: string;
  editionId: string;
  cap?: number;
  uri?: string;
};

/** A 32-byte id as 0x-prefixed hex, the same shape the mint endpoint requires. */
const EDITION_ID = /^0x[0-9a-fA-F]{64}$/;

/**
 * Resolve the on-chain editionId for a product + variant from a known edition set.
 *
 * Pure, so the lookup can be tested without the committed file. Fails loud rather
 * than returning a fallback, because an unresolved edition must never be minted
 * against a guessed id:
 *  - 503 CATALOGUE_NOT_CONFIGURED while the edition set is empty (before the real
 *    catalogue lands).
 *  - 400 UNKNOWN_EDITION when no entry matches, a catalogue mismatch the fulfilment
 *    path treats the same as the mint endpoint's own `unknown_edition`.
 *  - 500 MALFORMED_EDITION_ID when a mapped id is not a 32-byte hex value, caught
 *    here rather than sent on to the endpoint as a 422.
 */
export function resolveEditionIdFrom(
  editions: CatalogueEdition[],
  productId: string,
  variantId: string,
): string {
  if (!editions || editions.length === 0) {
    throw new StoreCheckoutError(
      503,
      'Store catalogue is not configured yet.',
      'CATALOGUE_NOT_CONFIGURED',
    );
  }
  const match = editions.find((e) => e.sourceId === productId && e.colorway === variantId);
  if (!match) {
    throw new StoreCheckoutError(
      400,
      `No edition mapped for product ${productId} / variant ${variantId}`,
      'UNKNOWN_EDITION',
    );
  }
  if (!EDITION_ID.test(match.editionId)) {
    throw new StoreCheckoutError(
      500,
      `Malformed editionId mapped for product ${productId} / variant ${variantId}`,
      'MALFORMED_EDITION_ID',
    );
  }
  return match.editionId;
}

/** Resolve the editionId for a product + variant against the committed catalogue. */
export function resolveEditionId(productId: string, variantId: string): string {
  const { editions } = catalogueIds as { editions: CatalogueEdition[] };
  return resolveEditionIdFrom(editions, productId, variantId);
}
