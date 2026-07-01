import { NextResponse } from 'next/server';
import { getEntryBySlug } from '@/lib/wilderCollections';
import {
  fetchNftsByContract,
  fetchBestListingsMap,
  normalizeNft,
  openseaFetch,
  type MarketNft,
  type OpenSeaNft,
} from '@/lib/opensea';

export const revalidate = 300;

/**
 * GET /api/market/nfts?slug=<collection>&next=<cursor>
 * Returns a page of NFTs for a Wilder World collection, resolved by its onchain
 * contract (so umbrella slugs like `wilderworld` never leak in), enriched with
 * best-listing prices in ETH where available.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get('slug');
  const next = searchParams.get('next');

  const empty: { items: MarketNft[]; next: string | null } = { items: [], next: null };

  const entry = slug ? getEntryBySlug(slug) : undefined;
  if (!entry) return NextResponse.json(empty);

  let nfts: OpenSeaNft[] = [];
  let nextCursor: string | null = null;

  if (entry.contract) {
    const data = await fetchNftsByContract(entry.chain, entry.contract, next);
    if (data) {
      nfts = data.nfts;
      nextCursor = data.next;
    }
  } else {
    // Fallback to slug-based listing when we don't have a verified contract.
    const params = new URLSearchParams({ limit: '50' });
    if (next) params.set('next', next);
    const data = await openseaFetch<{ nfts?: OpenSeaNft[]; next?: string | null }>(
      `/collection/${encodeURIComponent(entry.slug)}/nfts?${params.toString()}`
    );
    if (data?.nfts) {
      nfts = data.nfts;
      nextCursor = data.next ?? null;
    }
  }

  if (nfts.length === 0) return NextResponse.json(empty);

  const priceMap = await fetchBestListingsMap(entry.slug);

  return NextResponse.json({
    items: nfts.map((nft) =>
      normalizeNft(nft, entry.slug, entry.chain, priceMap[nft.identifier] ?? null)
    ),
    next: nextCursor,
  });
}
