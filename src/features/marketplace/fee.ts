/**
 * Marketplace fee, in basis points — matches the deployed contract's feeBps
 * (2.5%). If the on-chain fee is ever changed (owner `setFee`), update this: the
 * seller's actual proceeds are computed on-chain at sale time, so anything shown
 * here is an estimate for the lister.
 */
export const MARKETPLACE_FEE_BPS = 250;

/** Human-readable fee percent (e.g. "2.5"). */
export const MARKETPLACE_FEE_PERCENT = MARKETPLACE_FEE_BPS / 100;

/** WILD the seller receives after the fee, for a given list price in WILD. */
export function sellerProceedsWild(priceWild: number): number {
  return priceWild * (1 - MARKETPLACE_FEE_BPS / 10_000);
}
