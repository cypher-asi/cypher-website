import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { fetchEthHoldingsCount } from '../api/fetchers';

/**
 * Total Wilder World ETH-mainnet items held across the user's linked EOAs — the
 * "Holdings N" badge in the Ethereum wallet section. Keyed by userId (the route
 * reads the session). Invalidated alongside the linked-wallets list when a wallet
 * is linked/unlinked. Runs only when signed in.
 */
export function useEthHoldingsCountQuery(
  userId: string | null,
  hasLinkedWallets: boolean
): UseQueryResult<number> {
  return useQuery({
    queryKey: ['market', 'ethHoldings', 'count', userId],
    // Only fetch once the user actually has a linked wallet — otherwise the count
    // (and its wallet × collection fan-out) fires for every signed-in user for a
    // guaranteed-zero result. The badge only renders when linked, too.
    enabled: !!userId && hasLinkedWallets,
    queryFn: fetchEthHoldingsCount,
    // ETH holdings change only on external transfers; link/unlink invalidate this
    // explicitly, so a long stale window is safe and avoids needless refetches.
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });
}
