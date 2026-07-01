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
};

export type OpenSeaStats = {
  total?: { floor_price?: number; floor_price_symbol?: string };
};

/** Normalized NFT shape returned to the client. */
export type MarketNft = {
  identifier: string;
  name: string;
  image: string | null;
  collectionSlug: string;
  contract: string;
};

export function normalizeNft(nft: OpenSeaNft, fallbackSlug: string): MarketNft {
  return {
    identifier: nft.identifier,
    name: nft.name || `#${nft.identifier}`,
    image: nft.display_image_url || nft.image_url || null,
    collectionSlug: nft.collection || fallbackSlug,
    contract: nft.contract,
  };
}
