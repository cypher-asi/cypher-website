'use client';

import { useState } from 'react';
import { useConnectModal } from 'thirdweb/react';
import { useAuthStore } from '@/features/auth/store';
import { thirdwebClient } from '../../lib/thirdwebClient';
import { useLinkedWalletsQuery } from '../../hooks/useLinkedWalletsQuery';
import { useLinkWalletMutation, type SignableAccount } from '../../hooks/useLinkWalletMutation';
import { useUnlinkWalletMutation } from '../../hooks/useUnlinkWalletMutation';
import styles from '../../market.module.css';

function shortAddress(address: string): string {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

/**
 * The Ethereum section of the wallet panel: connect an external EOA, prove
 * ownership (sign a challenge), and link it to the ZERO account — so we can read
 * its Wilder World ETH-mainnet assets. Lists linked wallets with a remove action.
 * The connect step uses thirdweb's wallet picker (injected + WalletConnect);
 * everything persistent (the linked list + our buttons) is rendered here.
 */
export function EthereumWalletSection() {
  const userId = useAuthStore((s) => s.user?.id ?? null);
  const { connect } = useConnectModal();
  const linkedQuery = useLinkedWalletsQuery(userId);
  const linkMutation = useLinkWalletMutation();
  const unlinkMutation = useUnlinkWalletMutation();

  // A connected account awaiting confirmation to move it from another ZERO
  // account (add-wallet returned WALLET_LINKED_TO_ANOTHER_ACCOUNT).
  const [pendingTransfer, setPendingTransfer] = useState<SignableAccount | null>(null);

  const linked = linkedQuery.data ?? [];
  const busy = linkMutation.isPending;

  async function handleConnectAndLink() {
    if (!thirdwebClient) return;
    setPendingTransfer(null);

    let account: SignableAccount;
    try {
      const wallet = await connect({ client: thirdwebClient, setActive: false });
      const twAccount = wallet.getAccount();
      if (!twAccount) return;
      account = { address: twAccount.address, signMessage: ({ message }) => twAccount.signMessage({ message }) };
    } catch {
      return; // user closed the connect modal
    }

    const result = await linkMutation.mutateAsync({ account }).catch(() => null);
    if (result?.requiresConfirmation) {
      setPendingTransfer(account);
    }
  }

  async function handleConfirmTransfer() {
    if (!pendingTransfer) return;
    const account = pendingTransfer;
    setPendingTransfer(null);
    await linkMutation.mutateAsync({ account, confirm: true }).catch(() => null);
  }

  return (
    <div className={styles.walletSection}>
      <p className={styles.walletSectionLabel}>Self Custody Wallet (Ethereum)</p>

      {linked.length > 0 ? (
        <div className={styles.info}>
          {linked.map((wallet) => (
            <div key={wallet.id} className={styles.infoRow}>
              <span className={styles.infoValue}>{shortAddress(wallet.publicAddress)}</span>
              <button
                type="button"
                className={styles.walletRemoveBtn}
                onClick={() => unlinkMutation.mutate(wallet.id)}
                disabled={unlinkMutation.isPending}
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className={styles.walletEmpty}>Link an external Ethereum wallet to see your Wilder World assets here.</div>
      )}

      {pendingTransfer ? (
        <button type="button" className={styles.walletLinkBtn} onClick={handleConfirmTransfer} disabled={busy}>
          This wallet is on another account — move it here
        </button>
      ) : thirdwebClient ? (
        <button type="button" className={styles.walletLinkBtn} onClick={handleConnectAndLink} disabled={busy}>
          {busy ? 'Linking…' : 'Connect & link a wallet'}
        </button>
      ) : null}

      {linkMutation.isError && !pendingTransfer && (
        <p className={styles.walletError}>Couldn’t link that wallet. Please try again.</p>
      )}
    </div>
  );
}
