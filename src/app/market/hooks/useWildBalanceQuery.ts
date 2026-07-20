import { useQuery, type UseQueryResult } from '@tanstack/react-query';

export type WildBalance = {
  /** Raw base units (18-decimal uint string) — exact, for comparisons. */
  raw: string;
  /** Human WILD amount — for display only (precision fine at display scale). */
  wild: number;
};

async function fetchWildBalance(): Promise<WildBalance> {
  const res = await fetch('/api/marketplace/balance');
  if (!res.ok) throw new Error('Failed to load WILD balance');
  const data = (await res.json()) as { balanceRaw?: string };
  const raw = data.balanceRaw ?? '0';
  return { raw, wild: Number(BigInt(raw)) / 1e18 };
}

/**
 * The connected wallet's WILD balance (Z-Chain). Keyed by address so switching
 * account refetches; the route reads the session wallet, so the address is only
 * a cache key. A settled trade invalidates this (see useTradeReconciler), and it
 * otherwise refreshes within ~5s. Only runs once there is a connected wallet.
 */
export function useWildBalanceQuery(address: string | null): UseQueryResult<WildBalance> {
  return useQuery({
    queryKey: ['market', 'wildBalance', address],
    queryFn: fetchWildBalance,
    enabled: !!address,
    staleTime: 5_000,
  });
}
