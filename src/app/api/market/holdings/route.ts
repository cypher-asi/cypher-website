import { NextResponse } from 'next/server';
import { ALL_ENTRIES, getEntrySource, type WilderCollectionEntry } from '@/lib/wilderCollections';
import {
  indexerFetch,
  normalizeIndexerAsset,
  normalizeMarketplaceListing,
  INDEXER_GRID_LIMIT,
  INDEXER_LIVE_REVALIDATE,
  type IndexerAsset,
  type IndexerInventoryResponse,
  type MarketplaceListing,
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
// param (repeated `collections=` reads just the first value; `collections[]`
// doesn't bind and returns the whole chain inventory). So the portfolio is built
// by querying each tradeable collection separately and paging across them.
const PAGE_SIZE = INDEXER_GRID_LIMIT;
const enc = encodeURIComponent;

/** The consolidated list is one virtual sequence: each collection's held items in
 *  order, then the wallet's own listings. A page cursor is a position in it. */
type Cursor =
  | { phase: 'held'; index: number; offset: number }
  | { phase: 'listed'; offset: number };

function parseCursor(next: string | null): Cursor {
  if (next) {
    const [phase, a, b] = next.split(':');
    if (phase === 'l') return { phase: 'listed', offset: Number(a) || 0 };
    if (phase === 'h') return { phase: 'held', index: Number(a) || 0, offset: Number(b) || 0 };
  }
  return { phase: 'held', index: 0, offset: 0 };
}

function serializeCursor(cur: Cursor): string {
  return cur.phase === 'listed' ? `l:${cur.offset}` : `h:${cur.index}:${cur.offset}`;
}

function heldToNft(asset: IndexerAsset, entry: WilderCollectionEntry): MarketNft {
  const nft = normalizeIndexerAsset(asset, entry.slug, entry.chain, true);
  // Surface the held quantity on a fungible stack so a wallet holding N units
  // reads as one card carrying N (matching the count, which is one per row).
  if (entry.fungible && nft.balance != null && nft.balance > 1) {
    return { ...nft, fungible: true, amount: nft.balance };
  }
  return nft;
}

function listingToNft(listing: MarketplaceListing): MarketNft {
  const entry = ENTRY_BY_CONTRACT.get((listing.collectionAddress ?? '').toLowerCase());
  return normalizeMarketplaceListing(
    listing,
    entry?.slug ?? listing.collectionAddress,
    entry?.chain ?? 'zchain',
    entry?.fungible ?? false
  );
}

function heldUrl(owner: string, entry: WilderCollectionEntry, limit: number, offset: number): string {
  return (
    `/v1/inventory?wallet=${enc(owner)}&collection=${enc(entry.contract as string)}` +
    `&limit=${limit}&offset=${offset}`
  );
}

function listingsUrl(owner: string, limit: number, offset: number): string {
  return (
    `/v1/marketplace/listings?seller=${enc(owner)}&status=active&sort=price_asc` +
    `&limit=${limit}&offset=${offset}`
  );
}

/**
 * GET /api/market/holdings?owner=<wallet>&next=<cursor>&count=1
 *
 * The connected wallet's full portfolio across every tradeable Z-Chain collection,
 * in one list — the consolidated "Your Holdings" view. Held items (owned → List)
 * then the wallet's own active listings (escrowed; owned NOT set, so they resolve
 * to Cancel with a "Listed" badge). Paged: each page fills to PAGE_SIZE by walking
 * the collections, then the listings — no per-collection cap. `count=1` returns
 * just the combined total (for the wallet-panel badge) without the items.
 */
export async function GET(request: Request): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const owner = searchParams.get('owner');
  const countOnly = searchParams.get('count') === '1';

  const empty = { items: [] as MarketNft[], next: null as string | null, total: 0, error: false };
  if (!owner || INDEXER_ENTRIES.length === 0) return NextResponse.json(empty);

  // --- Count (wallet-panel badge): sum each collection's held total + listings ---
  if (countOnly) {
    const [heldResults, listed] = await Promise.all([
      Promise.all(
        INDEXER_ENTRIES.map((entry) =>
          indexerFetch<IndexerInventoryResponse>(heldUrl(owner, entry, 1, 0), INDEXER_LIVE_REVALIDATE)
        )
      ),
      indexerFetch<MarketplaceListingsResponse>(listingsUrl(owner, 1, 0), INDEXER_LIVE_REVALIDATE),
    ]);
    if (heldResults.some((r) => !r) || !listed) {
      return NextResponse.json({ ...empty, error: true }, { status: 502 });
    }
    const heldTotal = (heldResults as IndexerInventoryResponse[]).reduce(
      (sum, r) => sum + (r.total ?? r.items.length),
      0
    );
    const total = heldTotal + (listed.total ?? listed.items.length);
    return NextResponse.json({ items: [], next: null, total, error: false });
  }

  // --- Grid page: fill to PAGE_SIZE by walking held collections, then listings ---
  const fail = () => NextResponse.json({ ...empty, error: true }, { status: 502 });
  let cur = parseCursor(searchParams.get('next'));
  const items: MarketNft[] = [];

  while (cur.phase === 'held' && cur.index < INDEXER_ENTRIES.length && items.length < PAGE_SIZE) {
    const entry = INDEXER_ENTRIES[cur.index];
    const res = await indexerFetch<IndexerInventoryResponse>(
      heldUrl(owner, entry, PAGE_SIZE - items.length, cur.offset),
      INDEXER_LIVE_REVALIDATE
    );
    if (!res) return fail();
    for (const asset of res.items) items.push(heldToNft(asset, entry));
    const consumed = cur.offset + res.items.length;
    cur =
      consumed < (res.total ?? consumed)
        ? { phase: 'held', index: cur.index, offset: consumed }
        : { phase: 'held', index: cur.index + 1, offset: 0 };
  }
  if (cur.phase === 'held' && cur.index >= INDEXER_ENTRIES.length) {
    cur = { phase: 'listed', offset: 0 };
  }

  let exhausted = false;
  while (cur.phase === 'listed' && items.length < PAGE_SIZE) {
    const res = await indexerFetch<MarketplaceListingsResponse>(
      listingsUrl(owner, PAGE_SIZE - items.length, cur.offset),
      INDEXER_LIVE_REVALIDATE
    );
    if (!res) return fail();
    for (const listing of res.items) items.push(listingToNft(listing));
    const consumed = cur.offset + res.items.length;
    if (consumed < (res.total ?? consumed)) {
      cur = { phase: 'listed', offset: consumed };
    } else {
      exhausted = true;
      break;
    }
  }

  // More remains only if we stopped on a full page; an under-full page means the
  // whole portfolio was consumed.
  const next = !exhausted && items.length >= PAGE_SIZE ? serializeCursor(cur) : null;
  return NextResponse.json({ items, next, error: false });
}
