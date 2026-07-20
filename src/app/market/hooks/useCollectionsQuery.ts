import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import type { MarketCollection } from '@/app/api/market/collections/route';
import { fetchCollections } from '../api/fetchers';

/**
 * Collection stats keyed by slug. Floor / listed / volume shift on every trade,
 * so keep this short-lived — a trade invalidates + polls it immediately, and this
 * staleTime throttles ordinary browsing (the server reads stats no-store).
 */
export function useCollectionsQuery(): UseQueryResult<Record<string, MarketCollection>> {
  return useQuery({
    queryKey: ['market', 'collections'],
    queryFn: fetchCollections,
    staleTime: 5_000,
  });
}
