import { NextResponse } from 'next/server';
import {
  getEntryBySlug,
  getEntrySource,
  type WilderCollectionEntry,
} from '@/lib/wilderCollections';
import {
  hasMoreInventory,
  indexerFetch,
  normalizeIndexerAsset,
  normalizeMarketplaceListing,
  INDEXER_GRID_LIMIT,
  INDEXER_MARKET_LISTINGS_CAP,
  type IndexerInventoryResponse,
  type MarketplaceListingsResponse,
} from '@/lib/indexer';
import {
  fetchNftsByContract,
  fetchBestListingsMap,
  fetchBestListingsPage,
  fetchNftsByIdentifiers,
  normalizeNft,
  openseaFetch,
  type BestListing,
  type MarketNft,
  type OpenSeaNft,
} from '@/lib/opensea';

export const revalidate = 300;

/**
 * GET /api/market/nfts?slug=<collection>&next=<cursor>&status=<listed|unlisted>
 *
 * - status=listed (default): drives the grid from best listings, so results are
 *   sorted cheapest-first and every item carries a price. Paginated via the
 *   listings `next` cursor; metadata is batch-resolved by token identifier.
 * - status=unlisted: enumerates the collection by contract and returns only the
 *   tokens that have no active best listing (best-effort, price is always null).
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get('slug');
  const next = searchParams.get('next');
  const status = searchParams.get('status') === 'unlisted' ? 'unlisted' : 'listed';

  const empty: { items: MarketNft[]; next: string | null; error: boolean } = {
    items: [],
    next: null,
    error: false,
  };

  // A failed upstream fetch must be reported as an error, never as a confirmed
  // empty result: the client relies on this flag to avoid telling the user a
  // collection has no listings when OpenSea was simply unreachable.
  const fetchFailed = () =>
    NextResponse.json({ items: [], next: null, error: true }, { status: 502 });

  const entry = slug ? getEntryBySlug(slug) : undefined;
  if (!entry) return NextResponse.json(empty);

  // Z-Chain collections are indexer-backed. `listed` drives the grid from the
  // marketplace order book (WILD-priced); `unlisted` is the collection inventory
  // minus tokens with an active listing. Paginated via a numeric offset carried
  // in the `next` cursor; `next: null` terminates the infinite query.
  if (getEntrySource(entry) === 'indexer') {
    return handleIndexer(entry, next, fetchFailed, searchParams.get('attributes'), status);
  }

  if (status === 'listed') {
    const page = await fetchBestListingsPage(entry.slug, next);
    if (!page) return fetchFailed();

    // Listings are already ascending; a token can appear more than once, so
    // keep the first (cheapest) occurrence and preserve that order.
    const seen = new Set<string>();
    const ordered: BestListing[] = [];
    for (const listing of page.listings) {
      if (seen.has(listing.identifier)) continue;
      seen.add(listing.identifier);
      ordered.push(listing);
    }

    const meta = await fetchNftsByIdentifiers(
      entry.chain,
      ordered.map((o) => ({
        contract: o.contract || entry.contract || '',
        identifier: o.identifier,
      }))
    );
    const metaById: Record<string, OpenSeaNft> = {};
    for (const m of meta) metaById[m.identifier] = m;

    const items: MarketNft[] = ordered.map((o) => {
      const m = metaById[o.identifier];
      if (m) return normalizeNft(m, entry.slug, entry.chain, o.priceEth);
      // Never drop a priced listing just because metadata was missing.
      return {
        identifier: o.identifier,
        name: `#${o.identifier}`,
        image: null,
        collectionSlug: entry.slug,
        contract: o.contract || entry.contract || '',
        chain: entry.chain,
        priceEth: o.priceEth,
        traits: [],
      };
    });

    return NextResponse.json({ items, next: page.next, error: false });
  }

  // status === 'unlisted'
  let nfts: OpenSeaNft[] = [];
  let nextCursor: string | null = null;

  if (entry.contract) {
    const data = await fetchNftsByContract(entry.chain, entry.contract, next);
    if (!data) return fetchFailed();
    nfts = data.nfts;
    nextCursor = data.next;
  } else {
    const params = new URLSearchParams({ limit: '50' });
    if (next) params.set('next', next);
    const data = await openseaFetch<{ nfts?: OpenSeaNft[]; next?: string | null }>(
      `/collection/${encodeURIComponent(entry.slug)}/nfts?${params.toString()}`
    );
    if (!data?.nfts) return fetchFailed();
    nfts = data.nfts;
    nextCursor = data.next ?? null;
  }

  if (nfts.length === 0) return NextResponse.json({ items: [], next: nextCursor, error: false });

  const priceMap = await fetchBestListingsMap(entry.slug);

  const items = nfts
    .filter((nft) => priceMap[nft.identifier] == null)
    .map((nft) => normalizeNft(nft, entry.slug, entry.chain, null));

  return NextResponse.json({ items, next: nextCursor, error: false });
}

async function handleIndexer(
  entry: WilderCollectionEntry,
  next: string | null,
  fetchFailed: () => NextResponse,
  attributes: string | null,
  status: 'listed' | 'unlisted'
) {
  const parsed = next ? parseInt(next, 10) : 0;
  const offset = Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
  const contract = entry.contract ?? '';

  if (status === 'listed') {
    // Drive the grid from active order-book listings (each carries a WILD price),
    // cheapest first. Single-unit listings collapse to one floor-priced card per
    // token — mirroring the ETH grid — while multi-unit "bundle" listings each
    // stay a distinct card so their quantity + total price are visible. Correct
    // floor-dedupe needs the whole active set at once, so this fetches up to the
    // cap in one shot rather than paging; `next` is always null.
    const data = await indexerFetch<MarketplaceListingsResponse>(
      `/v1/marketplace/listings?collection=${encodeURIComponent(contract)}` +
        `&status=active&sort=price_asc&limit=${INDEXER_MARKET_LISTINGS_CAP}`,
      10
    );
    if (!data) return fetchFailed();

    if ((data.total ?? 0) > data.items.length) {
      // Loud signal rather than a silently short grid: the collection has more
      // active listings than the cap, so the tail (priciest) is not shown.
      console.warn(
        `[market] ${entry.slug}: ${data.total} active listings exceed cap ` +
          `${INDEXER_MARKET_LISTINGS_CAP}; grid truncated to cheapest ${data.items.length}.`
      );
    }

    // price_asc guarantees the first listing seen for a token is its floor.
    const floorByToken = new Map<string, (typeof data.items)[number]>();
    const bundles: typeof data.items = [];
    for (const listing of data.items) {
      if ((listing.amount ?? 1) > 1) {
        bundles.push(listing);
      } else if (!floorByToken.has(listing.tokenId)) {
        floorByToken.set(listing.tokenId, listing);
      }
    }

    const items = [...floorByToken.values(), ...bundles]
      .sort((a, b) => {
        const pa = BigInt(a.priceRaw);
        const pb = BigInt(b.priceRaw);
        return pa < pb ? -1 : pa > pb ? 1 : 0;
      })
      .map((listing) => normalizeMarketplaceListing(listing, entry.slug, entry.chain));

    return NextResponse.json({ items, next: null, error: false });
  }

  // status === 'unlisted': the collection inventory minus tokens that currently
  // have an active listing (best-effort; price is always null).
  // `attributes` is a JSON trait filter (e.g. {"Rarity":["Rare"]}) applied
  // server-side across the whole collection.
  const inventory = await indexerFetch<IndexerInventoryResponse>(
    `/v1/inventory?collections=${encodeURIComponent(contract)}` +
      `&limit=${INDEXER_GRID_LIMIT}&offset=${offset}` +
      (attributes ? `&attributes=${encodeURIComponent(attributes)}` : '')
  );
  if (!inventory) return fetchFailed();

  // One pass over the active listings tells us which tokens to exclude.
  const listed = await indexerFetch<MarketplaceListingsResponse>(
    `/v1/marketplace/listings?collection=${encodeURIComponent(contract)}&status=active&limit=200`,
    10
  );
  const listedTokenIds = new Set((listed?.items ?? []).map((l) => l.tokenId));

  const items = inventory.items
    .filter((asset) => !listedTokenIds.has(asset.tokenId))
    .map((asset) => normalizeIndexerAsset(asset, entry.slug, entry.chain));
  const nextCursor =
    inventory.items.length > 0 && hasMoreInventory(inventory, offset, INDEXER_GRID_LIMIT)
      ? String(offset + inventory.items.length)
      : null;
  return NextResponse.json({ items, next: nextCursor, error: false });
}
