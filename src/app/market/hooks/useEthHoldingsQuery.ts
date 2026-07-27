import { useInfiniteQuery, type UseInfiniteQueryResult } from '@tanstack/react-query';
import { fetchEthHoldingsPage, type NftsPage } from '../api/fetchers';
import { dedupeItems } from '../lib/items';
import type { MarketNftsData } from './useMarketNftsQuery';

/**
 * The signed-in user's Wilder World ETH-mainnet holdings across their linked
 * EOAs, as a single infinite list — the "Your Ethereum Holdings" grid. Same
 * shape as the Z-Chain holdings query (deduped items + batchBase), so the
 * grid/modal reuse it unchanged. Keyed by userId so switching account refetches;
 * the route reads the session, so userId is only a cache key. Runs only while the
 * ETH holdings view is open and signed in.
 */
export function useEthHoldingsQuery(
  userId: string | null,
  enabled: boolean
): UseInfiniteQueryResult<MarketNftsData> {
  return useInfiniteQuery({
    queryKey: ['market', 'ethHoldings', userId],
    enabled: enabled && !!userId,
    initialPageParam: null as string | null,
    queryFn: ({ pageParam }) => fetchEthHoldingsPage(pageParam),
    getNextPageParam: (lastPage: NftsPage) => lastPage.next ?? undefined,
    // ETH holdings change only on external transfers; link/unlink invalidate this
    // explicitly, so a long stale window avoids re-running the fan-out on refocus.
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
    select: (data) => {
      const items = dedupeItems(data.pages.flatMap((page) => page.items));
      const prior = dedupeItems(data.pages.slice(0, -1).flatMap((page) => page.items));
      return { items, batchBase: prior.length };
    },
  });
}
