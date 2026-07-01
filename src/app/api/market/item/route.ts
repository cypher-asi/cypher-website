import { NextResponse } from 'next/server';
import { getEntryBySlug } from '@/lib/wilderCollections';
import {
  fetchNftByContract,
  fetchBestListingsMap,
  openseaFetch,
  type OpenSeaCollection,
  type OpenSeaNft,
} from '@/lib/opensea';

export const revalidate = 300;

export type MarketItem = {
  identifier: string;
  name: string;
  image: string | null;
  animationUrl: string | null;
  description: string | null;
  collectionSlug: string;
  collectionName: string;
  traits: Array<{ type: string; value: string }>;
  priceEth: number | null;
  openseaUrl: string;
};

/**
 * GET /api/market/item?slug=<collection>&identifier=<tokenId>&contract=&chain=
 *
 * Resolves full metadata for a single NFT. The previous implementation looked
 * up the collection by slug and then picked the *first* contract, which was
 * wrong for umbrella slugs (e.g. `wilderworld`) and produced "Item
 * unavailable". We now resolve directly by the token's own contract + chain
 * (passed from the grid, with the configured contract as a fallback).
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get('slug');
  const identifier = searchParams.get('identifier');
  const contractParam = searchParams.get('contract');
  const chainParam = searchParams.get('chain');

  const entry = slug ? getEntryBySlug(slug) : undefined;
  if (!entry || !identifier) {
    return NextResponse.json({ item: null }, { status: 400 });
  }

  const chain = chainParam || entry.chain;
  let contract = contractParam || entry.contract || null;

  // Last-resort: resolve a contract from the collection detail.
  let detail: OpenSeaCollection | null = null;
  if (!contract) {
    detail = await openseaFetch<OpenSeaCollection>(
      `/collections/${encodeURIComponent(entry.slug)}`
    );
    const contractEntry =
      detail?.contracts?.find((c) => c.chain === chain) ?? detail?.contracts?.[0];
    contract = contractEntry?.address ?? null;
  }

  if (!contract) {
    return NextResponse.json({ item: null }, { status: 404 });
  }

  const nft: OpenSeaNft | null = await fetchNftByContract(chain, contract, identifier);
  if (!nft) {
    return NextResponse.json({ item: null }, { status: 404 });
  }

  const priceMap = await fetchBestListingsMap(entry.slug);

  const item: MarketItem = {
    identifier: nft.identifier,
    name: nft.name || `${entry.label ?? entry.slug} #${nft.identifier}`,
    image: nft.display_image_url || nft.image_url || null,
    animationUrl: nft.display_animation_url || nft.animation_url || null,
    description: nft.description ?? null,
    collectionSlug: entry.slug,
    collectionName: detail?.name ?? entry.label ?? entry.slug,
    traits: (nft.traits ?? []).map((t) => ({
      type: t.trait_type,
      value: String(t.value),
    })),
    priceEth: priceMap[nft.identifier] ?? null,
    openseaUrl:
      nft.opensea_url ||
      `https://opensea.io/assets/${chain}/${contract}/${nft.identifier}`,
  };

  return NextResponse.json({ item });
}
