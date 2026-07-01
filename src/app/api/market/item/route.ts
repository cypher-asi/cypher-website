import { NextResponse } from 'next/server';
import { getCollectionBySlug } from '@/lib/wilderCollections';
import { openseaFetch, type OpenSeaCollection, type OpenSeaNft } from '@/lib/opensea';

export const revalidate = 300;

export type MarketItem = {
  identifier: string;
  name: string;
  image: string | null;
  description: string | null;
  collectionSlug: string;
  collectionName: string;
  traits: Array<{ type: string; value: string }>;
  openseaUrl: string;
};

/**
 * GET /api/market/item?slug=<collection>&identifier=<tokenId>
 * Resolves the collection's contract from OpenSea, then returns full metadata
 * (traits, description, image) for a single NFT.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get('slug');
  const identifier = searchParams.get('identifier');

  const config = slug ? getCollectionBySlug(slug) : undefined;
  if (!config || !identifier) {
    return NextResponse.json({ item: null }, { status: 400 });
  }

  const detail = await openseaFetch<OpenSeaCollection>(
    `/collection/${encodeURIComponent(config.slug)}`
  );
  const contractEntry =
    detail?.contracts?.find((c) => c.chain === config.chain) ?? detail?.contracts?.[0];

  if (!contractEntry) {
    return NextResponse.json({ item: null }, { status: 404 });
  }

  const nftRes = await openseaFetch<{ nft: OpenSeaNft }>(
    `/chain/${encodeURIComponent(contractEntry.chain)}/contract/${encodeURIComponent(
      contractEntry.address
    )}/nfts/${encodeURIComponent(identifier)}`
  );

  const nft = nftRes?.nft;
  if (!nft) {
    return NextResponse.json({ item: null }, { status: 404 });
  }

  const item: MarketItem = {
    identifier: nft.identifier,
    name: nft.name || `${config.industry} #${nft.identifier}`,
    image: nft.display_image_url || nft.image_url || null,
    description: nft.description ?? null,
    collectionSlug: config.slug,
    collectionName: detail?.name ?? config.industry,
    traits: (nft.traits ?? []).map((t) => ({
      type: t.trait_type,
      value: String(t.value),
    })),
    openseaUrl:
      nft.opensea_url ||
      `https://opensea.io/assets/${contractEntry.chain}/${contractEntry.address}/${nft.identifier}`,
  };

  return NextResponse.json({ item });
}
