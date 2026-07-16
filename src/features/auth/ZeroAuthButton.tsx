'use client';

import { useAuthStore } from './store';
import styles from './ZeroAuthButton.module.css';

function shortWallet(address: string): string {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

/**
 * Market-header entry point to auth: "Connect" when signed out (opens the modal),
 * identity + "Disconnect" when signed in (full disconnect, so a different account
 * can sign in).
 */
export function ZeroAuthButton() {
  const user = useAuthStore((s) => s.user);
  const openLogin = useAuthStore((s) => s.openLogin);
  const disconnect = useAuthStore((s) => s.disconnect);

  if (!user) {
    return (
      <button type="button" className={styles.connect} onClick={openLogin}>
        Connect
      </button>
    );
  }

  const label = user.zeroWalletAddress
    ? shortWallet(user.zeroWalletAddress)
    : (user.handle ?? 'Account');

  return (
    <div className={styles.connected}>
      <span className={styles.identity} title={user.handle ?? undefined}>
        {label}
      </span>
      <button type="button" className={styles.disconnect} onClick={() => void disconnect()}>
        Disconnect
      </button>
    </div>
  );
}
