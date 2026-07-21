import { NextResponse } from 'next/server';
import { ALL_ENTRIES, getEntrySource, type WilderCollectionEntry } from '@/lib/wilderCollections';
import {
  indexerFetch,
  normalizeIndexerAsset,
  normalizeMarketplaceListing,
  INDEXER_LIVE_REVALIDATE,
  INDEXER_MARKET_LISTINGS_CAP,
  INDEXER_PAGE_LIMIT,
  type IndexerInventoryResponse,
  type MarketplaceListingsResponse,
} from '@/lib/indexer';
import type { MarketNft } from '@/lib/opensea';

export const revalidate = 0;

// The tradeable Z-Chain collections — the wallet's holdings across these are what
// the marketplace can show/trade, so the count + grid are scoped to them (not the
// wallet's entire chain inventory). Built once from the indexer-backed entries.
const INDEXER_ENTRIES: WilderCollectionEntry[] = ALL_ENTRIES.filter(
  (entry) => getEntrySource(entry) === 'indexer' && Boolean(entry.contract)
);
const ENTRY_BY_CONTRACT = new Map<string, WilderCollectionEntry>(
  INDEXER_ENTRIES.map((entry) => [(entry.contract as string).toLowerCase(), entry])
);

// The deployed indexer's inventory route only filters by a SINGLE `collection`
// param — repeated `collections=` reads just the first value, and `collections[]`
// doesn't bind at all (returns the wallet's entire chain inventory). So query each
// tradeable collection separately and merge, capping each rather than paging the
// union (a holder with more than this in one collection is not realistic for now).
const HELD_CAP = INDEXER_PAGE_LIMIT;

const enc = encodeURIComponent;

/**
 * GET /api/market/holdings?owner=<wallet>&count=1
 *
 * The connected wallet's full portfolio across every tradeable Z-Chain collection,
 * in one list — the consolidated "Your Holdings" view. Held items (owned → List)
 * plus the wallet's own active listings (escrowed, so they'd otherwise be missing
 * — owned NOT set, so they resolve to Cancel with a "Listed" badge). `count=1`
 * returns just the combined total (for the wallet-panel badge) without the items.
 */
export async function GET(request: Request): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const owner = searchParams.get('owner');
  const countOnly = searchParams.get('count') === '1';

  const empty = { items: [] as MarketNft[], next: null as string | null, total: 0, error: false };
  if (!owner || INDEXER_ENTRIES.length === 0) return NextResponse.json(empty);

  const [heldResults, listed] = await Promise.all([
    // Held inventory, one query per collection (see HELD_CAP note).
    Promise.all(
      INDEXER_ENTRIES.map((entry) =>
        indexerFetch<IndexerInventoryResponse>(
          `/v1/inventory?wallet=${enc(owner)}&collection=${enc(entry.contract as string)}` +
            `&limit=${countOnly ? 1 : HELD_CAP}`,
          INDEXER_LIVE_REVALIDATE
        )
      )
    ),
    // The wallet's own active listings (all marketplace listings are in tradeable
    // Z-Chain collections, so no collection filter is needed here).
    indexerFetch<MarketplaceListingsResponse>(
      `/v1/marketplace/listings?seller=${enc(owner)}&status=active&sort=price_asc` +
        `&limit=${countOnly ? 1 : INDEXER_MARKET_LISTINGS_CAP}`,
      INDEXER_LIVE_REVALIDATE
    ),
  ]);

  if (heldResults.some((r) => !r) || !listed) {
    return NextResponse.json({ ...empty, error: true }, { status: 502 });
  }
  const held = heldResults as IndexerInventoryResponse[];

  const heldTotal = held.reduce((sum, r) => sum + (r.total ?? r.items.length), 0);
  const listedTotal = listed.total ?? listed.items.length;
  const total = heldTotal + listedTotal;

  if (countOnly) {
    return NextResponse.json({ items: [], next: null, total, error: false });
  }

  const heldItems = held.flatMap((result, i) => {
    const entry = INDEXER_ENTRIES[i];
    if ((result.total ?? 0) > result.items.length) {
      console.warn(
        `[market] holdings: ${owner} holds ${result.total} in ${entry.slug} exceeding cap ` +
          `${HELD_CAP}; showing ${result.items.length}.`
      );
    }
    return result.items.map((asset) => {
      const nft = normalizeIndexerAsset(asset, entry.slug, entry.chain, true);
      // Surface the held quantity on a fungible stack so a wallet holding N units
      // reads as one card carrying N (matching the count, which is one per row).
      if (entry.fungible && nft.balance != null && nft.balance > 1) {
        return { ...nft, fungible: true, amount: nft.balance };
      }
      return nft;
    });
  });

  const listings = listed.items.map((listing) => {
    const entry = ENTRY_BY_CONTRACT.get((listing.collectionAddress ?? '').toLowerCase());
    return normalizeMarketplaceListing(
      listing,
      entry?.slug ?? listing.collectionAddress,
      entry?.chain ?? 'zchain',
      entry?.fungible ?? false
    );
  });

  // Held first, then the wallet's own listings. Single page (each half is fetched
  // whole up to its cap), so `next` is always null.
  return NextResponse.json({ items: [...heldItems, ...listings], next: null, total, error: false });
}
