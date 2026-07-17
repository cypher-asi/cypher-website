import type { QueryClient, InfiniteData } from '@tanstack/react-query';
import type { MarketNft } from '@/lib/opensea';
import { wildFromRaw } from '@/lib/indexer';
import type { NftsPage } from '../api/fetchers';
import type { TradeAction, ListResult } from '@/features/marketplace/tradeStore';

function editPages(
  qc: QueryClient,
  key: unknown[],
  edit: (items: MarketNft[]) => MarketNft[],
): void {
  qc.setQueriesData<InfiniteData<NftsPage>>({ queryKey: key }, (old) =>
    old ? { ...old, pages: old.pages.map((p) => ({ ...p, items: edit(p.items) })) } : old,
  );
}

/**
 * Reflect a settled trade in the market caches right away, so the UI doesn't wait
 * on the ~15-20s indexer lag:
 *  - list   → add the new listing to "Listed", decrement "Yours" available.
 *  - buy    → drop the sold listing from "Listed".
 *  - cancel → drop the listing from "Listed".
 * The stats panel is invalidated (reconciles on refetch). We deliberately do NOT
 * invalidate the affected grids — an immediate refetch would read the still-stale
 * indexer and clobber these edits; they reconcile once the lag passes (staleTime
 * / next navigation).
 */
export function syncTrade(
  qc: QueryClient,
  slug: string,
  seller: string | null,
  action: TradeAction,
  nft: MarketNft,
  listResult: ListResult | null,
): void {
  if (action === 'list' && listResult) {
    // Add the new listing to "Listed" (needs the id, and an existing cache to
    // prepend to — otherwise the tab fetches fresh, by which point it's indexed).
    if (listResult.listingId) {
      const amount = Number(listResult.amount);
      const listing: MarketNft = {
        identifier: nft.identifier,
        name: nft.name,
        image: nft.image,
        collectionSlug: nft.collectionSlug,
        contract: nft.contract,
        chain: nft.chain,
        priceEth: null,
        traits: [],
        listingId: listResult.listingId,
        priceWild: {
          raw: listResult.priceWei,
          formatted: String(wildFromRaw(listResult.priceWei) ?? ''),
        },
        sellerAddress: seller ?? undefined,
        status: 'active',
        amount,
        fungible: amount > 1 ? true : nft.fungible,
      };
      qc.setQueriesData<InfiniteData<NftsPage>>(
        { queryKey: ['market', 'nfts', slug, 'listed'] },
        (old) => {
          if (!old || old.pages.length === 0) return old;
          const [first, ...rest] = old.pages;
          return { ...old, pages: [{ ...first, items: [listing, ...first.items] }, ...rest] };
        },
      );
    }
    // Decrement "Yours" available by the listed amount (drop the tile at 0).
    editPages(qc, ['market', 'nfts', slug, 'yours'], (items) =>
      items.flatMap((i) => {
        if (i.contract !== nft.contract || i.identifier !== nft.identifier) return [i];
        const remaining = (i.balance ?? 1) - Number(listResult.amount);
        return remaining > 0 ? [{ ...i, balance: remaining }] : [];
      }),
    );
  } else if (nft.listingId) {
    // buy / cancel → the settled listing leaves every grid it appears in.
    editPages(qc, ['market', 'nfts', slug], (items) =>
      items.filter((i) => i.listingId !== nft.listingId),
    );
  }
  // Every trade changes the collection stats (floor / listed / volume).
  void qc.invalidateQueries({ queryKey: ['market', 'collections'] });
}
