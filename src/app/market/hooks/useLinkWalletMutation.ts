import { useMutation, useQueryClient } from '@tanstack/react-query';

/** Minimal shape of a connected wallet account we need to prove ownership. */
export type SignableAccount = {
  address: string;
  signMessage: (args: { message: string }) => Promise<string>;
};

export type LinkWalletResult = {
  /** True once the wallet is linked. */
  linked: boolean;
  /** True when the wallet is already linked to another ZERO account — the caller
   *  re-submits with `confirm: true` to transfer it. */
  requiresConfirmation: boolean;
};

/**
 * Link an external EOA to the ZERO account: fetch a single-use SIWE challenge,
 * sign it with the connected wallet, and submit the signature. Pure (takes the
 * account + fetches our proxy routes) so it's testable without a real wallet.
 */
export async function linkWalletFlow(account: SignableAccount, confirm = false): Promise<LinkWalletResult> {
  const challengeRes = await fetch(`/api/marketplace/wallet-challenge?address=${encodeURIComponent(account.address)}`);
  if (!challengeRes.ok) throw new Error('Could not start wallet linking');
  const { message } = (await challengeRes.json()) as { message?: string };
  if (!message) throw new Error('Malformed challenge from the server');

  const signature = await account.signMessage({ message });

  const addRes = await fetch('/api/marketplace/add-wallet', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, signature, ...(confirm ? { confirm: true } : {}) }),
  });
  const body = (await addRes.json().catch(() => ({}))) as { error?: string; code?: string };
  if (!addRes.ok) throw new Error(body.error ?? 'Could not link wallet');

  if (body.code === 'WALLET_LINKED_TO_ANOTHER_ACCOUNT') {
    return { linked: false, requiresConfirmation: true };
  }
  return { linked: true, requiresConfirmation: false };
}

/** Link mutation; refreshes the linked-wallets list once a wallet is actually linked. */
export function useLinkWalletMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ account, confirm }: { account: SignableAccount; confirm?: boolean }) =>
      linkWalletFlow(account, confirm),
    onSuccess: (result) => {
      if (result.linked) {
        queryClient.invalidateQueries({ queryKey: ['market', 'linkedWallets'] });
        // A newly linked wallet changes the aggregated ETH holdings + badge count.
        queryClient.invalidateQueries({ queryKey: ['market', 'ethHoldings'] });
      }
    },
  });
}
