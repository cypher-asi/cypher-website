import { useInfiniteQuery, type UseInfiniteQueryResult } from '@tanstack/react-query';
import { fetchHoldingsPage, type NftsPage } from '../api/fetchers';
import { dedupeItems } from '../lib/items';
import type { MarketNftsData } from './useMarketNftsQuery';

/**
 * The connected wallet's holdings across every tradeable Z-Chain collection, as a
 * single infinite list — the "Your Holdings" grid. Same shape as the per-collection
 * grid query (deduped items + batchBase), so the grid/modal reuse it unchanged.
 * Only runs while the holdings view is open and a wallet is connected; a settled
 * trade invalidates the `['market','holdings']` prefix (see useTradeReconciler).
 */
export function useHoldingsQuery(
  owner: string | null,
  enabled: boolean
): UseInfiniteQueryResult<MarketNftsData> {
  return useInfiniteQuery({
    queryKey: ['market', 'holdings', owner],
    enabled: enabled && !!owner,
    initialPageParam: null as string | null,
    queryFn: ({ pageParam }) => fetchHoldingsPage(owner as string, pageParam),
    getNextPageParam: (lastPage: NftsPage) => lastPage.next ?? undefined,
    staleTime: 5_000,
    select: (data) => {
      const items = dedupeItems(data.pages.flatMap((page) => page.items));
      const prior = dedupeItems(data.pages.slice(0, -1).flatMap((page) => page.items));
      return { items, batchBase: prior.length };
    },
  });
}
