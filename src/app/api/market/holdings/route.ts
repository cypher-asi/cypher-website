import { NextResponse } from 'next/server';
import { ALL_ENTRIES, getEntrySource, type WilderCollectionEntry } from '@/lib/wilderCollections';
import {
  hasMoreInventory,
  indexerFetch,
  normalizeIndexerAsset,
  normalizeMarketplaceListing,
  INDEXER_GRID_LIMIT,
  INDEXER_LIVE_REVALIDATE,
  INDEXER_MARKET_LISTINGS_CAP,
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
const COLLECTIONS_QUERY = INDEXER_ENTRIES.map(
  (entry) => `collections=${encodeURIComponent(entry.contract as string)}`
).join('&');

/**
 * GET /api/market/holdings?owner=<wallet>&next=<offset>&count=1
 *
 * The connected wallet's full portfolio across every tradeable Z-Chain collection,
 * in one list — the consolidated "Your Holdings" view. Held items (owned → List)
 * plus the wallet's own active listings (escrowed, so they'd otherwise be missing
 * — owned NOT set, so they resolve to Cancel with a "Listed" badge). `count=1`
 * returns just the combined total (for the wallet-panel badge) without paging.
 */
export async function GET(request: Request): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const owner = searchParams.get('owner');
  const countOnly = searchParams.get('count') === '1';

  const empty = { items: [] as MarketNft[], next: null as string | null, total: 0, error: false };
  if (!owner || INDEXER_ENTRIES.length === 0) return NextResponse.json(empty);

  const parsed = searchParams.get('next');
  const offset = parsed && Number(parsed) > 0 ? Number(parsed) : 0;

  const [inv, listed] = await Promise.all([
    indexerFetch<IndexerInventoryResponse>(
      `/v1/inventory?wallet=${encodeURIComponent(owner)}&${COLLECTIONS_QUERY}` +
        `&limit=${countOnly ? 1 : INDEXER_GRID_LIMIT}&offset=${offset}`,
      INDEXER_LIVE_REVALIDATE
    ),
    // The wallet's own active listings across the marketplace (all its listings are
    // tradeable Z-Chain collections). Whole set on page 0; for the count just the
    // total. Attached after held items so a later page carries only held items.
    offset === 0 || countOnly
      ? indexerFetch<MarketplaceListingsResponse>(
          `/v1/marketplace/listings?seller=${encodeURIComponent(owner)}` +
            `&status=active&sort=price_asc&limit=${countOnly ? 1 : INDEXER_MARKET_LISTINGS_CAP}`,
          INDEXER_LIVE_REVALIDATE
        )
      : null,
  ]);
  if (!inv || ((offset === 0 || countOnly) && !listed)) {
    return NextResponse.json({ ...empty, error: true }, { status: 502 });
  }

  const heldTotal = inv.total ?? inv.items.length;
  const listedTotal = listed?.total ?? listed?.items.length ?? 0;
  const total = heldTotal + listedTotal;

  if (countOnly) {
    return NextResponse.json({ items: [], next: null, total, error: false });
  }

  const held = inv.items.map((asset) => {
    const entry = ENTRY_BY_CONTRACT.get((asset.collectionAddress ?? '').toLowerCase());
    const nft = normalizeIndexerAsset(
      asset,
      entry?.slug ?? asset.collectionAddress,
      entry?.chain ?? 'zchain',
      true
    );
    // Surface the held quantity on a fungible stack so a wallet holding N units
    // reads as one card carrying N (matching the count, which is one per row).
    if (entry?.fungible && nft.balance != null && nft.balance > 1) {
      return { ...nft, fungible: true, amount: nft.balance };
    }
    return nft;
  });

  const listings = (listed?.items ?? []).map((listing) => {
    const entry = ENTRY_BY_CONTRACT.get((listing.collectionAddress ?? '').toLowerCase());
    return normalizeMarketplaceListing(
      listing,
      entry?.slug ?? listing.collectionAddress,
      entry?.chain ?? 'zchain',
      entry?.fungible ?? false
    );
  });

  const items = [...held, ...listings];

  // Paginate on the held inventory offset only; the listings set is complete on
  // page 0. (A wallet with more than the cap of active listings is not realistic.)
  const nextCursor =
    inv.items.length > 0 && hasMoreInventory(inv, offset, INDEXER_GRID_LIMIT)
      ? String(offset + inv.items.length)
      : null;

  return NextResponse.json({ items, next: nextCursor, total, error: false });
}
