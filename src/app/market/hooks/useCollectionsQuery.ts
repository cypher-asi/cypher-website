import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import type { MarketCollection } from '@/app/api/market/collections/route';
import { fetchCollections } from '../api/fetchers';

/** Collection stats keyed by slug. Long-lived; stats change slowly. */
export function useCollectionsQuery(): UseQueryResult<Record<string, MarketCollection>> {
  return useQuery({
    queryKey: ['market', 'collections'],
    queryFn: fetchCollections,
    staleTime: 5 * 60_000,
  });
}
