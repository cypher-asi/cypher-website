'use client';

import { useRef, useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { useConnectModal } from 'thirdweb/react';
import type { Wallet } from 'thirdweb/wallets';
import { useAuthStore } from '@/features/auth/store';
import { thirdwebClient } from '../../lib/thirdwebClient';
import { useLinkedWalletsQuery, type LinkedWallet } from '../../hooks/useLinkedWalletsQuery';
import { useEthHoldingsCountQuery } from '../../hooks/useEthHoldingsCountQuery';
import { useLinkWalletMutation, type SignableAccount } from '../../hooks/useLinkWalletMutation';
import { useUnlinkWalletMutation } from '../../hooks/useUnlinkWalletMutation';
import { ConfirmDialog } from '../ConfirmDialog';
import styles from '../../market.module.css';

type Props = {
  /** Open the consolidated ETH-mainnet holdings grid (across linked EOAs). */
  onOpenHoldings: () => void;
};

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
export function EthereumWalletSection({ onOpenHoldings }: Props) {
  const userId = useAuthStore((s) => s.user?.id ?? null);
  const { connect } = useConnectModal();
  const linkedQuery = useLinkedWalletsQuery(userId);
  const { data: holdingsCount } = useEthHoldingsCountQuery(userId);
  const linkMutation = useLinkWalletMutation();
  const unlinkMutation = useUnlinkWalletMutation();

  // A connected account awaiting confirmation to move it from another ZERO
  // account (add-wallet returned WALLET_LINKED_TO_ANOTHER_ACCOUNT).
  const [pendingTransfer, setPendingTransfer] = useState<SignableAccount | null>(null);
  // The open confirmation dialog (link explainer, or remove a given wallet).
  const [dialog, setDialog] = useState<null | { kind: 'link' } | { kind: 'remove'; wallet: LinkedWallet }>(null);
  // Spans the whole connect -> sign -> link flow (the mutation's own pending
  // state only covers the final add-wallet call).
  const [isLinking, setIsLinking] = useState(false);
  // The connected wallet, kept only for the duration of a link flow so we can
  // disconnect it from thirdweb afterwards — otherwise a re-link silently reuses
  // the last wallet instead of re-opening the picker.
  const connectedWallet = useRef<Wallet | null>(null);

  const linked = linkedQuery.data ?? [];
  const busy = isLinking || linkMutation.isPending;

  async function releaseWallet() {
    try {
      await connectedWallet.current?.disconnect();
    } catch {
      /* best-effort — a lingering thirdweb connection is not fatal */
    }
    connectedWallet.current = null;
  }

  async function handleConnectAndLink() {
    if (!thirdwebClient) return;
    setPendingTransfer(null);
    linkMutation.reset(); // clear any prior error before a fresh attempt

    let account: SignableAccount;
    try {
      const wallet = await connect({ client: thirdwebClient, setActive: false });
      const twAccount = wallet.getAccount();
      if (!twAccount) {
        await releaseWallet();
        return;
      }
      connectedWallet.current = wallet;
      account = { address: twAccount.address, signMessage: ({ message }) => twAccount.signMessage({ message }) };
    } catch {
      return; // user closed the connect modal
    }

    setIsLinking(true);
    try {
      const result = await linkMutation.mutateAsync({ account }).catch(() => null);
      if (result?.requiresConfirmation) {
        // Keep the wallet connected — the transfer confirmation re-signs.
        setPendingTransfer(account);
      } else {
        await releaseWallet();
      }
    } finally {
      setIsLinking(false);
    }
  }

  async function handleConfirmTransfer() {
    if (!pendingTransfer) return;
    const account = pendingTransfer;
    setPendingTransfer(null);
    setIsLinking(true);
    try {
      await linkMutation.mutateAsync({ account, confirm: true }).catch(() => null);
    } finally {
      setIsLinking(false);
      await releaseWallet();
    }
  }

  return (
    <div className={styles.walletSection}>
      <p className={styles.walletSectionLabel}>Self Custody Wallet (Ethereum)</p>

      {linked.length > 0 ? (
        <div className={styles.info}>
          {linked.map((wallet) => {
            const removing = unlinkMutation.isPending && unlinkMutation.variables === wallet.id;
            return (
              <div key={wallet.id} className={styles.infoRow}>
                <span className={styles.infoValue}>{shortAddress(wallet.publicAddress)}</span>
                <button
                  type="button"
                  className={styles.walletRemoveBtn}
                  onClick={() => setDialog({ kind: 'remove', wallet })}
                  disabled={unlinkMutation.isPending}
                >
                  {removing ? 'Removing…' : 'Remove'}
                </button>
              </div>
            );
          })}
        </div>
      ) : (
        <div className={styles.walletEmpty}>Link an external Ethereum wallet to see your Wilder World assets here.</div>
      )}

      {linked.length > 0 && (
        <button type="button" className={styles.walletHoldingsBtn} onClick={onOpenHoldings}>
          <span className={styles.infoLabel}>Holdings</span>
          <span className={styles.walletHoldingsValue}>
            {holdingsCount != null ? holdingsCount.toLocaleString() : '…'}
            <ChevronRight size={14} aria-hidden />
          </span>
        </button>
      )}

      {pendingTransfer ? (
        <button type="button" className={styles.walletLinkBtn} onClick={handleConfirmTransfer} disabled={busy}>
          This wallet is on another account — move it here
        </button>
      ) : thirdwebClient ? (
        <button
          type="button"
          className={styles.walletLinkBtn}
          onClick={() => {
            linkMutation.reset(); // drop any prior error when re-attempting
            setDialog({ kind: 'link' });
          }}
          disabled={busy}
        >
          {busy ? 'Linking…' : 'Connect & link a wallet'}
        </button>
      ) : null}

      {linkMutation.isError && !pendingTransfer && (
        <p className={styles.walletError}>Couldn’t link that wallet. Please try again.</p>
      )}

      {dialog?.kind === 'link' && (
        <ConfirmDialog
          title="Link an Ethereum wallet"
          confirmLabel="Continue"
          busy={busy}
          onCancel={() => setDialog(null)}
          onConfirm={() => {
            setDialog(null);
            void handleConnectAndLink();
          }}
        >
          <p className={styles.confirmLine}>
            This links the wallet to your <strong>ZERO account</strong>, associating it across the
            Wilder World and ZERO ecosystem — not just this browser session. You can remove it
            anytime.
          </p>
          <p className={styles.confirmLine}>
            Next, you’ll connect the wallet and sign a message to prove it’s yours (no transaction,
            no gas).
          </p>
        </ConfirmDialog>
      )}

      {dialog?.kind === 'remove' && (
        <ConfirmDialog
          title="Remove this wallet?"
          confirmLabel="Remove"
          busy={unlinkMutation.isPending}
          onCancel={() => setDialog(null)}
          onConfirm={() => {
            const walletId = dialog.wallet.id;
            setDialog(null);
            unlinkMutation.mutate(walletId);
          }}
        >
          <p className={styles.confirmLine}>
            {shortAddress(dialog.wallet.publicAddress)} will be unlinked from your ZERO account and
            its Ethereum assets will no longer show here.
          </p>
          {dialog.wallet.canAuthenticate && (
            <p className={styles.confirmWarn}>
              This wallet also signs you in to ZERO — removing it will disable logging in with this
              wallet.
            </p>
          )}
        </ConfirmDialog>
      )}
    </div>
  );
}
