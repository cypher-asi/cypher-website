'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowUpRight, LogOut } from 'lucide-react';
import { MarketHeader } from '@/sites/wilderworld/marketplace/MarketHeader';
import { useAuthStore } from '@/features/auth/store';
import Wallets from './Wallets';
import Bridge from './Bridge';
import { AccountTabs } from './AccountTabs';
import styles from './AccountPage.module.css';

/**
 * Minimal v1 account surface: global sign in / sign out, using our real ZERO
 * auth (the same account the store signs people in with at checkout). The rest
 * of the handoff's account tabs (inventory, listings, sales, reviews, profile,
 * wallets) are deferred until there is real data behind them.
 */
// The bridge tab is a read-only preview and not yet functional (no signer, Confirm
// disabled), so keep it hidden until it is finished. Flip to true to show it
// between Wallets and Portfolio.
const BRIDGE_ENABLED = false;

export default function AccountPage() {
  const user = useAuthStore((s) => s.user);
  const status = useAuthStore((s) => s.status);
  const openLogin = useAuthStore((s) => s.openLogin);
  const openCreate = useAuthStore((s) => s.openCreate);
  const disconnect = useAuthStore((s) => s.disconnect);

  // Signed-in sections: the wallet-link panel and (when enabled) the WILD bridge
  // switch in place; Portfolio is its own page, reached from the same tab bar.
  // `?tab=bridge` deep-links the bridge (e.g. the bridge's own Manage-wallets link).
  const [tab, setTab] = useState<'wallets' | 'bridge'>('wallets');
  useEffect(() => {
    if (BRIDGE_ENABLED && new URLSearchParams(window.location.search).get('tab') === 'bridge') {
      setTab('bridge');
    }
  }, []);
  const selectTab = (next: 'wallets' | 'bridge') => {
    setTab(next);
    const url = new URL(window.location.href);
    if (next === 'wallets') url.searchParams.delete('tab');
    else url.searchParams.set('tab', next);
    window.history.replaceState(null, '', url);
  };

  return (
    <div className={styles.page}>
      <MarketHeader />
      <div className={styles.container}>
        <div className={styles.breadcrumb}>
          <Link href="/store">
            <ArrowLeft size={13} aria-hidden />
            Wilder World
          </Link>
          <span>Your account</span>
        </div>

        {status === 'restoring' ? (
          <div className={styles.loading} role="status">
            Opening your account…
          </div>
        ) : !user ? (
          <div className={styles.authLayout}>
            <div className={styles.authIntro}>
              <p className={styles.eyebrow}>Your world, collected</p>
              <h1>
                Make yourself
                <br />
                at home.
              </h1>
              <p>Sign in to your Wilder World account to manage your profile and collection.</p>
            </div>
            <section className={styles.authCard}>
              <h2>Welcome back.</h2>
              <div className={styles.authActions}>
                <button className={styles.primary} type="button" onClick={openLogin}>
                  Sign in
                  <ArrowUpRight size={16} aria-hidden />
                </button>
                <button className={styles.secondary} type="button" onClick={openCreate}>
                  Create account
                </button>
              </div>
              <p className={styles.finePrint}>
                Your Wilder World account is powered by ZERO. It holds your wallet and everything
                you own across Wilder World.
              </p>
            </section>
          </div>
        ) : (
          <>
            <header className={styles.accountHeading}>
              <div>
                <p className={styles.eyebrow}>Your collection starts here</p>
                <h1>{user.displayName ?? user.handle ?? 'Your account'}</h1>
              </div>
              <button
                className={styles.signOut}
                type="button"
                onClick={() => {
                  void disconnect();
                }}
              >
                <LogOut size={16} aria-hidden />
                Sign out
              </button>
            </header>
            <AccountTabs active={tab} bridgeEnabled={BRIDGE_ENABLED} onSelect={selectTab} />
            <section className={styles.tabContent} aria-label={tab}>
              {BRIDGE_ENABLED && tab === 'bridge' ? (
                <Bridge
                  userId={user.id}
                  zeroWalletAddress={user.zeroWalletAddress}
                  onManageWallets={() => selectTab('wallets')}
                />
              ) : (
                <Wallets />
              )}
            </section>
          </>
        )}
      </div>
    </div>
  );
}
