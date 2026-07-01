import { NextResponse } from 'next/server';
import { WILDER_COLLECTIONS } from '@/lib/wilderCollections';
import { openseaFetch, type OpenSeaCollection, type OpenSeaStats } from '@/lib/opensea';

export const revalidate = 300;

export type MarketCollection = {
  id: string;
  industry: string;
  blurb: string;
  slug: string;
  chain: string;
  name: string;
  image: string | null;
  floorPrice: number | null;
  floorSymbol: string | null;
  totalSupply: number | null;
};

/**
 * GET /api/market/collections
 * Returns the configured Wilder World collections enriched with live OpenSea
 * metadata (name, image, floor price, supply) for the sidebar rail.
 */
export async function GET() {
  const results = await Promise.all(
    WILDER_COLLECTIONS.map(async (c): Promise<MarketCollection> => {
      const [detail, stats] = await Promise.all([
        openseaFetch<OpenSeaCollection>(`/collection/${encodeURIComponent(c.slug)}`),
        openseaFetch<OpenSeaStats>(`/collections/${encodeURIComponent(c.slug)}/stats`),
      ]);
      return {
        id: c.id,
        industry: c.industry,
        blurb: c.blurb,
        slug: c.slug,
        chain: c.chain,
        name: detail?.name ?? c.industry,
        image: detail?.image_url ?? null,
        floorPrice: stats?.total?.floor_price ?? null,
        floorSymbol: stats?.total?.floor_price_symbol ?? null,
        totalSupply: detail?.total_supply ?? null,
      };
    })
  );

  return NextResponse.json({ collections: results });
}
