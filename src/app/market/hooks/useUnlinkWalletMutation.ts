import { useMutation, useQueryClient } from '@tanstack/react-query';

/** Unlink an external EOA from the ZERO account. zos-api enforces ownership and
 *  its removal guards; we just relay the walletId. */
export async function unlinkWallet(walletId: string): Promise<void> {
  const res = await fetch(`/api/marketplace/wallets/${encodeURIComponent(walletId)}`, { method: 'DELETE' });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? 'Could not remove wallet');
  }
}

/** Unlink mutation; refreshes the linked-wallets list on success. */
export function useUnlinkWalletMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (walletId: string) => unlinkWallet(walletId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['market', 'linkedWallets'] });
      // Removing a wallet changes the aggregated ETH holdings + badge count.
      queryClient.invalidateQueries({ queryKey: ['market', 'ethHoldings'] });
    },
  });
}
