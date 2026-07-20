import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { fetchHoldingsCount } from '../api/fetchers';

/**
 * Total held items across the tradeable Z-Chain collections — the "Holdings N"
 * badge in the wallet panel. Keyed under the `['market','holdings']` prefix so a
 * settled trade invalidates it alongside the holdings grid. Only runs when a
 * wallet is connected.
 */
export function useHoldingsCountQuery(owner: string | null): UseQueryResult<number> {
  return useQuery({
    queryKey: ['market', 'holdings', 'count', owner],
    enabled: !!owner,
    queryFn: () => fetchHoldingsCount(owner as string),
    staleTime: 5_000,
  });
}
