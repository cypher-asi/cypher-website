import { NextResponse } from 'next/server';
import { getCollectionBySlug } from '@/lib/wilderCollections';
import {
  openseaFetch,
  normalizeNft,
  OPENSEA_REVALIDATE,
  type MarketNft,
  type OpenSeaNft,
} from '@/lib/opensea';

export const revalidate = 300;

type NftsResponse = { nfts: OpenSeaNft[]; next?: string | null };

/**
 * GET /api/market/nfts?slug=<collection>&next=<cursor>
 * Returns a page of NFTs for a Wilder World collection.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get('slug');
  const next = searchParams.get('next');

  const empty: { items: MarketNft[]; next: string | null } = { items: [], next: null };

  if (!slug || !getCollectionBySlug(slug)) {
    return NextResponse.json(empty);
  }

  const params = new URLSearchParams({ limit: '50' });
  if (next) params.set('next', next);

  const data = await openseaFetch<NftsResponse>(
    `/collection/${encodeURIComponent(slug)}/nfts?${params.toString()}`
  );

  if (!data?.nfts) return NextResponse.json(empty);

  return NextResponse.json({
    items: data.nfts.map((nft) => normalizeNft(nft, slug)),
    next: data.next ?? null,
  });
}
