import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { fetchEthHoldingsCount } from '../api/fetchers';

/**
 * Total Wilder World ETH-mainnet items held across the user's linked EOAs — the
 * "Holdings N" badge in the Ethereum wallet section. Keyed by userId (the route
 * reads the session). Invalidated alongside the linked-wallets list when a wallet
 * is linked/unlinked. Runs only when signed in.
 */
export function useEthHoldingsCountQuery(userId: string | null): UseQueryResult<number> {
  return useQuery({
    queryKey: ['market', 'ethHoldings', 'count', userId],
    enabled: !!userId,
    queryFn: fetchEthHoldingsCount,
    staleTime: 30_000,
  });
}
