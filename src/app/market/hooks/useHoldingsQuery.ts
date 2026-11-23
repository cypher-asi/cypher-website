import { useInfiniteQuery, type UseInfiniteQueryResult } from '@tanstack/react-query';
import type { MarketNft } from '@/lib/opensea';
import { fetchEthHoldingsPage, fetchHoldingsPage, type NftsPage } from '../api/fetchers';
import { dedupeItems } from '../lib/items';

export type HoldingsData = {
  items: MarketNft[];
  /** Index where the latest loaded page begins, so only new cards stagger in on
   *  "load more" (not the whole list), matching useMarketNftsQuery. */
  batchBase: number;
};

function flattenHoldings(pages: NftsPage[]): HoldingsData {
  const items = dedupeItems(pages.flatMap((page) => page.items));
  const prior = dedupeItems(pages.slice(0, -1).flatMap((page) => page.items));
  return { items, batchBase: prior.length };
}

/**
 * The ZERO custodial wallet's tradeable Z-Chain holdings, paged. Keyed by owner so
 * each wallet has its own cache entry, and disabled until we have the owner address.
 * The key matches the one the link/unlink mutations invalidate.
 */
export function useZchainHoldingsQuery(owner: string | null): UseInfiniteQueryResult<HoldingsData> {
  return useInfiniteQuery({
    queryKey: ['market', 'holdings', owner],
    enabled: Boolean(owner),
    initialPageParam: null as string | null,
    queryFn: ({ pageParam, signal }) => fetchHoldingsPage(owner as string, pageParam, signal),
    getNextPageParam: (lastPage: NftsPage) => lastPage.next ?? undefined,
    select: (data) => flattenHoldings(data.pages),
  });
}

/**
 * The signed-in user's Wilder World Ethereum holdings across every linked EOA, paged.
 * The route resolves the linked wallets from the ZERO session, so no address is
 * passed. The key matches the one the link/unlink mutations invalidate.
 */
export function useEthHoldingsQuery(enabled: boolean): UseInfiniteQueryResult<HoldingsData> {
  return useInfiniteQuery({
    queryKey: ['market', 'ethHoldings'],
    enabled,
    initialPageParam: null as string | null,
    queryFn: ({ pageParam, signal }) => fetchEthHoldingsPage(pageParam, signal),
    getNextPageParam: (lastPage: NftsPage) => lastPage.next ?? undefined,
    select: (data) => flattenHoldings(data.pages),
  });
}
