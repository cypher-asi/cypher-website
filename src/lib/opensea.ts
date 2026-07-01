/* ---------------------------------------------------------------------------
   Server-only OpenSea API v2 helpers.

   The API key is read from `OPENSEA_API_KEY` and only ever used here (inside
   route handlers), so it never reaches the browser. Callers should treat a
   missing key as an empty result rather than an error, mirroring the graceful
   fallback in the news route.
   --------------------------------------------------------------------------- */
const OPENSEA_BASE = 'https://api.opensea.io/api/v2';

export const OPENSEA_REVALIDATE = 300;

export function hasOpenSeaKey(): boolean {
  return Boolean(process.env.OPENSEA_API_KEY);
}

/** Fetch a JSON endpoint from OpenSea. Returns null on any failure. */
export async function openseaFetch<T>(path: string): Promise<T | null> {
  const key = process.env.OPENSEA_API_KEY;
  if (!key) return null;
  try {
    const res = await fetch(`${OPENSEA_BASE}${path}`, {
      headers: { 'X-API-KEY': key, accept: 'application/json' },
      next: { revalidate: OPENSEA_REVALIDATE },
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

/* ----- Response shapes (only the fields we consume) ----------------------- */
export type OpenSeaNft = {
  identifier: string;
  name: string | null;
  image_url: string | null;
  display_image_url?: string | null;
  animation_url?: string | null;
  display_animation_url?: string | null;
  contract: string;
  collection?: string;
  description?: string | null;
  traits?: Array<{ trait_type: string; value: string | number; display_type?: string | null }>;
  opensea_url?: string | null;
};

export type OpenSeaContract = { address: string; chain: string };

export type OpenSeaCollection = {
  collection: string;
  name: string;
  description?: string;
  image_url?: string | null;
  banner_image_url?: string | null;
  contracts?: OpenSeaContract[];
  total_supply?: number;
  created_date?: string | null;
};

export type OpenSeaStats = {
  total?: {
    floor_price?: number;
    floor_price_symbol?: string;
    volume?: number;
    num_owners?: number;
    sales?: number;
    market_cap?: number;
  };
};

type OpenSeaListing = {
  price?: { current?: { value?: string; decimals?: number; currency?: string } };
  protocol_data?: {
    parameters?: {
      offer?: Array<{ identifierOrCriteria?: string }>;
    };
  };
};

/** Normalized NFT shape returned to the client. */
export type MarketNft = {
  identifier: string;
  name: string;
  image: string | null;
  collectionSlug: string;
  contract: string;
  chain: string;
  /** Best active listing price in ETH, when available. */
  priceEth: number | null;
  /** Traits, when the list endpoint provides them (used for client filtering). */
  traits: Array<{ type: string; value: string }>;
};

export function normalizeNft(
  nft: OpenSeaNft,
  fallbackSlug: string,
  chain: string,
  priceEth: number | null = null
): MarketNft {
  return {
    identifier: nft.identifier,
    name: nft.name || `#${nft.identifier}`,
    image: nft.display_image_url || nft.image_url || null,
    collectionSlug: nft.collection || fallbackSlug,
    contract: nft.contract,
    chain,
    priceEth,
    traits: (nft.traits ?? []).map((t) => ({ type: t.trait_type, value: String(t.value) })),
  };
}

/** Fetch a page of NFTs for a collection by its onchain contract address. */
export async function fetchNftsByContract(
  chain: string,
  address: string,
  next?: string | null
): Promise<{ nfts: OpenSeaNft[]; next: string | null } | null> {
  const params = new URLSearchParams({ limit: '50' });
  if (next) params.set('next', next);
  const data = await openseaFetch<{ nfts?: OpenSeaNft[]; next?: string | null }>(
    `/chain/${encodeURIComponent(chain)}/contract/${encodeURIComponent(
      address
    )}/nfts?${params.toString()}`
  );
  if (!data?.nfts) return null;
  return { nfts: data.nfts, next: data.next ?? null };
}

/** Fetch a single NFT by contract + identifier. */
export async function fetchNftByContract(
  chain: string,
  address: string,
  identifier: string
): Promise<OpenSeaNft | null> {
  const data = await openseaFetch<{ nft?: OpenSeaNft }>(
    `/chain/${encodeURIComponent(chain)}/contract/${encodeURIComponent(
      address
    )}/nfts/${encodeURIComponent(identifier)}`
  );
  return data?.nft ?? null;
}

/**
 * Build a map of tokenId -> best listing price (in ETH) for a collection.
 * Best-effort: a single page of listings. Returns an empty map on failure.
 */
export async function fetchBestListingsMap(slug: string): Promise<Record<string, number>> {
  const data = await openseaFetch<{ listings?: OpenSeaListing[] }>(
    `/listings/collection/${encodeURIComponent(slug)}/best?limit=100`
  );
  const map: Record<string, number> = {};
  if (!data?.listings) return map;
  for (const listing of data.listings) {
    const id = listing.protocol_data?.parameters?.offer?.[0]?.identifierOrCriteria;
    const raw = listing.price?.current?.value;
    const decimals = listing.price?.current?.decimals ?? 18;
    if (!id || !raw) continue;
    const eth = Number(raw) / 10 ** decimals;
    if (!Number.isNaN(eth)) map[id] = eth;
  }
  return map;
}
