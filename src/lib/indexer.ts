/* ---------------------------------------------------------------------------
   Server-only indexer API helpers.

   The base URL and key are read from `INDEXER_API_URL` / `INDEXER_API_KEY`
   and only ever used here (inside route handlers), so they never reach the
   browser. Callers should treat missing config as an empty result rather
   than an error, mirroring the graceful fallback in `opensea.ts`.
   --------------------------------------------------------------------------- */
import type { MarketNft } from './opensea';

export const INDEXER_REVALIDATE = 300;

// Trait aggregation walks the whole collection (many indexer calls), so cache
// those page fetches for much longer — traits change rarely, and this keeps the
// expensive walk to ~once/hour per collection instead of on every cold view.
export const INDEXER_TRAITS_REVALIDATE = 3600;

export function hasIndexerConfig(): boolean {
  return Boolean(process.env.INDEXER_API_URL && process.env.INDEXER_API_KEY);
}

/** Fetch a JSON endpoint from the indexer. Returns null on any failure. */
export async function indexerFetch<T>(
  path: string,
  revalidate: number = INDEXER_REVALIDATE
): Promise<T | null> {
  const baseUrl = process.env.INDEXER_API_URL;
  const key = process.env.INDEXER_API_KEY;
  if (!baseUrl || !key) return null;
  try {
    const res = await fetch(`${baseUrl}${path}`, {
      headers: { 'x-api-key': key, accept: 'application/json' },
      next: { revalidate },
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export type IndexerAttribute = {
  trait_type: string;
  value: unknown;
};

export type IndexerAsset = {
  id: string;
  collectionAddress: string;
  collectionName: string;
  tokenId: string;
  ownerAddress: string;
  chainId: number;
  tokenStandard: string;
  balance: string;
  tokenUri: string | null;
  metadata: {
    name?: string;
    description?: string;
    image?: string;
    animationUrl?: string;
    attributes?: IndexerAttribute[] | null;
  } | null;
};

export type IndexerInventoryResponse = {
  items: IndexerAsset[];
  // Optional so a degraded envelope still parses; `total` is the primary
  // pagination driver, with a short-page heuristic as runtime fallback.
  total?: number;
  limit?: number;
  offset?: number;
};

/**
 * Shape of `GET /v1/inventory/attributes/counts` — every trait type with its
 * values and per-value item counts, aggregated server-side in one query.
 * Trait types come back alphabetical, values sorted by count desc.
 */
export type IndexerAttributeCounts = {
  attributes: Array<{
    traitType: string;
    values: Array<{ value: string; count: number }>;
  }>;
};

/** Page size for the browse grid — matches the ETH grid cadence and keeps the
 * initial render light (each Z-Chain image is multi-MB, so fewer per page). */
export const INDEXER_GRID_LIMIT = 50;

/** Page size for full-collection walks (item lookup, trait aggregation) —
 * larger to minimise round-trips. */
export const INDEXER_PAGE_LIMIT = 200;

/**
 * Active listings pulled in one shot for the "listed" grid. The grid collapses
 * single-unit listings to one floor card per token and shows bundles separately,
 * which needs the whole active set at once (correct floor-dedupe can't be done
 * across offset pages). This equals the listings endpoint's own per-request max,
 * so it's a single call; the marketplace is far below it today. If a collection
 * ever exceeds it, the grid shows the cheapest CAP listings and the route logs a
 * truncation warning — page the endpoint here if that ever becomes real. */
export const INDEXER_MARKET_LISTINGS_CAP = 200;

/**
 * Whether more inventory pages remain after the page just fetched. Exact when
 * the envelope carries `total`; otherwise falls back to the full-page
 * heuristic (a page shorter than `limit` means the collection is exhausted).
 */
export function hasMoreInventory(
  page: IndexerInventoryResponse,
  offset: number,
  limit: number = INDEXER_PAGE_LIMIT
): boolean {
  return typeof page.total === 'number'
    ? offset + page.items.length < page.total
    : page.items.length === limit;
}

/**
 * Resolve a metadata media URI to a fetchable URL. Rewrites `ipfs://` (and
 * the `ipfs://ipfs/` double prefix) to a public gateway, passes http(s)
 * through unchanged, and returns null for anything else.
 */
export function resolveMediaUrl(uri: string | null | undefined): string | null {
  if (!uri) return null;
  if (uri.startsWith('ipfs://')) {
    const rest = uri.slice('ipfs://'.length).replace(/^ipfs\//, '');
    return `https://ipfs.io/ipfs/${rest}`;
  }
  if (uri.startsWith('http://') || uri.startsWith('https://')) return uri;
  return null;
}

/** Convert an indexer asset to the shared `MarketNft` shape. */
export function normalizeIndexerAsset(
  asset: IndexerAsset,
  collectionSlug: string,
  chain: string
): MarketNft {
  const metadata = asset.metadata;
  return {
    identifier: asset.tokenId,
    name: metadata?.name || `#${asset.tokenId}`,
    image: resolveMediaUrl(metadata?.image),
    collectionSlug,
    contract: asset.collectionAddress,
    chain,
    // The indexer carries no listings/prices; OpenSea supplies live pricing.
    priceEth: null,
    traits: (metadata?.attributes ?? [])
      .filter((a) => Boolean(a.trait_type))
      .map((a) => ({ type: a.trait_type, value: String(a.value) })),
  };
}

/** A row from `GET /v1/marketplace/listings` (the order-book read API). */
export type MarketplaceListing = {
  id: string;
  listingId: string;
  sellerAddress: string;
  collectionAddress: string;
  tokenId: string;
  amount: number;
  chainId: number;
  paymentToken: string;
  priceRaw: string;
  priceFormatted: string | null;
  status: string;
  buyerAddress: string | null;
  createdAt: string;
  expiresAt: string | null;
  nft: {
    tokenUri: string | null;
    metadata: {
      name?: string | null;
      image?: string | null;
      description?: string | null;
      animationUrl?: string | null;
    } | null;
  } | null;
};

export type MarketplaceListingsResponse = {
  items: MarketplaceListing[];
  total: number;
  limit: number;
  offset: number;
};

/**
 * Convert an active marketplace listing to the shared `MarketNft` shape, carrying
 * the WILD price + listing fields the ETH path doesn't have. `priceEth` stays null
 * (Z-Chain settles in WILD); the card/modal read `priceWild` instead.
 */
export function normalizeMarketplaceListing(
  listing: MarketplaceListing,
  collectionSlug: string,
  chain: string
): MarketNft {
  const metadata = listing.nft?.metadata;
  return {
    identifier: listing.tokenId,
    name: metadata?.name || `#${listing.tokenId}`,
    image: resolveMediaUrl(metadata?.image),
    collectionSlug,
    contract: listing.collectionAddress,
    chain,
    priceEth: null,
    traits: [],
    listingId: listing.listingId,
    priceWild: { raw: listing.priceRaw, formatted: listing.priceFormatted },
    sellerAddress: listing.sellerAddress.toLowerCase(),
    status: listing.status,
    amount: listing.amount,
  };
}
