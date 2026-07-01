import { useInfiniteQuery, type UseInfiniteQueryResult } from '@tanstack/react-query';
import type { MarketNft } from '@/lib/opensea';
import { fetchNftsPage, type NftsPage } from '../api/fetchers';
import { dedupeItems } from '../lib/items';
import type { Availability } from '../types';

export type MarketNftsData = {
  items: MarketNft[];
  /** Index where the most recently loaded page begins, so only new cards
   *  stagger in on "load more" (not the whole list). */
  batchBase: number;
};

/**
 * Cursor-based infinite query for a collection's NFTs. Keying by
 * `[slug, availability]` gives each collection its own cache entry, so
 * switching collections never mixes items or replays a stale cursor — the
 * bookkeeping the old hand-rolled implementation needed refs to guard.
 */
export function useMarketNftsQuery(
  slug: string,
  availability: Availability
): UseInfiniteQueryResult<MarketNftsData> {
  return useInfiniteQuery({
    queryKey: ['market', 'nfts', slug, availability],
    enabled: slug.length > 0,
    initialPageParam: null as string | null,
    queryFn: ({ pageParam }) => fetchNftsPage(slug, availability, pageParam),
    getNextPageParam: (lastPage: NftsPage) => lastPage.next ?? undefined,
    select: (data) => {
      const items = dedupeItems(data.pages.flatMap((page) => page.items));
      const prior = dedupeItems(
        data.pages.slice(0, -1).flatMap((page) => page.items)
      );
      return { items, batchBase: prior.length };
    },
  });
}
