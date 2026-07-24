import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import type { LinkedWallet } from '@/features/marketplace/wallet-link';

// `import type` is erased at build, so the server-only wallet-link module is
// never pulled into the client bundle — only the shape is shared.
export type { LinkedWallet };

async function fetchLinkedWallets(): Promise<LinkedWallet[]> {
  const res = await fetch('/api/marketplace/wallets');
  if (!res.ok) throw new Error('Failed to load linked wallets');
  const data = (await res.json()) as { wallets?: LinkedWallet[] };
  return data.wallets ?? [];
}

/**
 * The signed-in user's linked external Ethereum EOAs (excludes the ZERO
 * custodial wallet). Keyed by userId so switching account refetches; the route
 * reads the session cookie, so userId is only a cache key. Runs only when
 * signed in.
 */
export function useLinkedWalletsQuery(userId: string | null): UseQueryResult<LinkedWallet[]> {
  return useQuery({
    queryKey: ['market', 'linkedWallets', userId],
    queryFn: fetchLinkedWallets,
    enabled: !!userId,
    staleTime: 30_000,
  });
}
