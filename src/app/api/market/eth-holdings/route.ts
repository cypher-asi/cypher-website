import { NextResponse } from 'next/server';
import { ALL_ENTRIES, getEntrySource, type WilderCollectionEntry } from '@/lib/wilderCollections';
import {
  indexerFetch,
  normalizeIndexerAsset,
  INDEXER_GRID_LIMIT,
  INDEXER_ETH_HOLDINGS_REVALIDATE,
  type IndexerInventoryResponse,
} from '@/lib/indexer';
import type { MarketNft } from '@/lib/opensea';
import { fetchLinkedWallets } from '@/features/marketplace/wallet-link';
import { marketplaceErrorResponse } from '@/features/marketplace/http';

export const revalidate = 0;

// The Wilder World ETH-mainnet collections we can read from the indexer. Scoped
// to these (not a wallet's entire mainnet inventory) so the ETH holdings view
// shows only WW assets. `getEntrySource` defaults to 'opensea' for ETH entries;
// we read them from the indexer here (the OpenSea path stays for browsing).
const ETH_ENTRIES: WilderCollectionEntry[] = ALL_ENTRIES.filter(
  (entry) => entry.chain === 'ethereum' && getEntrySource(entry) === 'opensea' && Boolean(entry.contract)
);

const PAGE_SIZE = INDEXER_GRID_LIMIT;
const enc = encodeURIComponent;

// A wallet's holdings span (each linked EOA) × (each ETH collection). Flatten to a
// list of (wallet, collection) pairs and walk them as one virtual sequence; a page
// cursor is a position in it. Collection addresses are chain-unique, so a
// wallet+collection lookup is inherently scoped to Ethereum.
type Pair = { wallet: string; entry: WilderCollectionEntry };

type Cursor = { index: number; offset: number };

function parseCursor(next: string | null): Cursor {
  if (next) {
    const [index, offset] = next.split(':');
    return { index: Number(index) || 0, offset: Number(offset) || 0 };
  }
  return { index: 0, offset: 0 };
}

function heldUrl(wallet: string, entry: WilderCollectionEntry, limit: number, offset: number): string {
  return (
    `/v1/inventory?wallet=${enc(wallet)}&collection=${enc(entry.contract as string)}` +
    `&limit=${limit}&offset=${offset}`
  );
}

/**
 * GET /api/market/eth-holdings?next=<cursor>&count=1
 *
 * The signed-in user's Wilder World ETH-mainnet assets, aggregated across every
 * external EOA linked to their ZERO account — the consolidated "Your Ethereum
 * Holdings" view. Read-only: ETH assets are held in the user's own wallet (not
 * escrowed/tradeable here), so items are owned with no listings phase. Auth-gated
 * because the linked wallets come from the caller's ZERO session, never the client.
 * `count=1` returns just the combined total (for the wallet-panel badge).
 */
export async function GET(request: Request): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const countOnly = searchParams.get('count') === '1';

    const linked = await fetchLinkedWallets(request);
    const wallets = linked.map((w) => w.publicAddress).filter(Boolean);

    const empty = { items: [] as MarketNft[], next: null as string | null, total: 0, error: false };
    if (wallets.length === 0 || ETH_ENTRIES.length === 0) {
      return NextResponse.json(empty);
    }

    const pairs: Pair[] = wallets.flatMap((wallet) => ETH_ENTRIES.map((entry) => ({ wallet, entry })));

    // --- Count (wallet-panel badge): sum every (wallet, collection) held total ---
    if (countOnly) {
      const results = await Promise.all(
        pairs.map((p) =>
          indexerFetch<IndexerInventoryResponse>(heldUrl(p.wallet, p.entry, 1, 0), INDEXER_ETH_HOLDINGS_REVALIDATE)
        )
      );
      if (results.some((r) => !r)) {
        return NextResponse.json({ ...empty, error: true }, { status: 502 });
      }
      const total = (results as IndexerInventoryResponse[]).reduce(
        (sum, r) => sum + (r.total ?? r.items.length),
        0
      );
      return NextResponse.json({ items: [], next: null, total, error: false });
    }

    // --- Grid page: fill to PAGE_SIZE by walking the (wallet, collection) pairs ---
    let cur = parseCursor(searchParams.get('next'));
    const items: MarketNft[] = [];

    while (cur.index < pairs.length && items.length < PAGE_SIZE) {
      const { wallet, entry } = pairs[cur.index];
      const res = await indexerFetch<IndexerInventoryResponse>(
        heldUrl(wallet, entry, PAGE_SIZE - items.length, cur.offset),
        INDEXER_ETH_HOLDINGS_REVALIDATE
      );
      if (!res) return NextResponse.json({ ...empty, error: true }, { status: 502 });
      for (const asset of res.items) items.push(normalizeIndexerAsset(asset, entry.slug, entry.chain, true));
      const consumed = cur.offset + res.items.length;
      // Advance to the next pair when this one is exhausted — OR when the indexer
      // returns an empty page despite claiming more (a stale/inconsistent total),
      // so the cursor can never stall on the same pair.
      cur =
        res.items.length > 0 && consumed < (res.total ?? consumed)
          ? { index: cur.index, offset: consumed }
          : { index: cur.index + 1, offset: 0 };
    }

    // More remains only if we stopped on a full page with pairs left to read.
    const next = items.length >= PAGE_SIZE && cur.index < pairs.length ? `${cur.index}:${cur.offset}` : null;
    return NextResponse.json({ items, next, error: false });
  } catch (err) {
    return marketplaceErrorResponse(err);
  }
}
