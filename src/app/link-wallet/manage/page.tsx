'use client';

/**
 * Hosted wallet-management page. Reached after the manage bootstrap
 * (`/api/link-wallet/manage/start`) has promoted the host-injected token into
 * the session cookie. Lists the user's linked external EOAs and lets them
 * remove one, with the same warnings the marketplace shows (a general notice,
 * plus an extra warning when the wallet is also a login method). Removal goes
 * through the existing marketplace proxy, which relays zos-api's guards. On
 * finish it navigates to the completion route, which clears the session and
 * redirects to the callback the host intercepts.
 */
import { useEffect, useState } from 'react';
import { WilderMark } from '../WilderMark';
import { completePath } from '@/features/marketplace/hosted-link';
import { unlinkWallet } from '../../market/hooks/useUnlinkWalletMutation';
import type { LinkedWallet } from '@/features/marketplace/wallet-link';
import styles from '../link-wallet.module.css';

type LoadState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ready'; wallets: LinkedWallet[] };

function shortAddress(address: string): string {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

function ManageFlow() {
  const [state, setState] = useState<LoadState>({ status: 'loading' });
  const [confirming, setConfirming] = useState<LinkedWallet | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [removeError, setRemoveError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetch('/api/marketplace/wallets')
      .then(async (res) => {
        if (!res.ok) throw new Error('Could not load linked wallets');
        const data = (await res.json()) as { wallets?: LinkedWallet[] };
        return data.wallets ?? [];
      })
      .then((wallets) => {
        if (active) setState({ status: 'ready', wallets });
      })
      .catch(() => {
        if (active) setState({ status: 'error' });
      });
    return () => {
      active = false;
    };
  }, []);

  function finish() {
    window.location.href = completePath('success', undefined, 'manage');
  }
  function finishWithError() {
    window.location.href = completePath('error', 'load_failed', 'manage');
  }

  async function confirmRemove() {
    if (!confirming) return;
    const wallet = confirming;
    setConfirming(null);
    setRemoveError(null);
    setRemovingId(wallet.id);
    try {
      await unlinkWallet(wallet.id);
      setState((s) =>
        s.status === 'ready'
          ? { status: 'ready', wallets: s.wallets.filter((w) => w.id !== wallet.id) }
          : s,
      );
    } catch (err) {
      setRemoveError(err instanceof Error ? err.message : 'Could not remove that wallet.');
    } finally {
      setRemovingId(null);
    }
  }

  return (
    <main className={styles.page}>
      <WilderMark className={styles.logo} />
      <h1 className={styles.title}>Manage linked wallets</h1>

      {state.status === 'loading' && <p className={styles.subtitle}>Loading your wallets…</p>}

      {state.status === 'error' && (
        <>
          <p className={styles.rowError}>Couldn’t load your wallets. Please try again.</p>
          <button type="button" className={styles.primary} onClick={finishWithError}>
            Close
          </button>
        </>
      )}

      {state.status === 'ready' && (
        <>
          {state.wallets.length === 0 ? (
            <p className={styles.empty}>You have no linked Ethereum wallets.</p>
          ) : (
            <div className={styles.list}>
              {state.wallets.map((wallet) => (
                <div key={wallet.id} className={styles.row}>
                  <span className={styles.rowAddr}>{shortAddress(wallet.publicAddress)}</span>
                  <button
                    type="button"
                    className={styles.removeBtn}
                    onClick={() => {
                      setRemoveError(null);
                      setConfirming(wallet);
                    }}
                    disabled={removingId !== null}
                  >
                    {removingId === wallet.id ? 'Removing…' : 'Remove'}
                  </button>
                </div>
              ))}
            </div>
          )}

          {removeError && <p className={styles.rowError}>{removeError}</p>}

          <button type="button" className={styles.primary} onClick={finish}>
            Done
          </button>
        </>
      )}

      {confirming && (
        <div className={styles.overlay}>
          <div className={styles.dialog}>
            <h2 className={styles.dialogTitle}>Remove this wallet?</h2>
            <p className={styles.warn}>
              {shortAddress(confirming.publicAddress)} will be unlinked from your ZERO account and
              its Ethereum assets will no longer show.
            </p>
            {confirming.canAuthenticate && (
              <p className={styles.warnAuth}>
                This wallet also signs you in to ZERO, so removing it will disable logging in with
                this wallet.
              </p>
            )}
            <div className={styles.dialogActions}>
              <button type="button" className={styles.dialogCancel} onClick={() => setConfirming(null)}>
                Cancel
              </button>
              <button type="button" className={styles.dialogRemove} onClick={confirmRemove}>
                Remove
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

export default function LinkWalletManagePage() {
  return <ManageFlow />;
}
