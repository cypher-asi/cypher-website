'use client';
import Link from 'next/link';
import styles from './AccountPage.module.css';

export type AccountSection = 'wallets' | 'bridge' | 'portfolio';

/**
 * The signed-in account sections. Portfolio lives here as an account tab rather
 * than as its own item in the site header, so the main nav stays as designed.
 *
 * On the account page, Wallets and Bridge switch in place (`onSelect`); anywhere
 * else (the portfolio page) they link back to the account page instead.
 */
export function AccountTabs({
  active,
  bridgeEnabled = false,
  onSelect,
}: {
  active: AccountSection;
  bridgeEnabled?: boolean;
  onSelect?: (section: 'wallets' | 'bridge') => void;
}) {
  const inPage = (section: 'wallets' | 'bridge', label: string) =>
    onSelect ? (
      <button
        type="button"
        aria-current={active === section ? 'page' : undefined}
        onClick={() => onSelect(section)}
      >
        {label}
      </button>
    ) : (
      <Link
        href={section === 'wallets' ? '/store/account' : '/store/account?tab=bridge'}
        aria-current={active === section ? 'page' : undefined}
      >
        {label}
      </Link>
    );

  return (
    <nav className={styles.tabs} aria-label="Account sections">
      {inPage('wallets', 'Wallets')}
      {bridgeEnabled && inPage('bridge', 'Bridge')}
      <Link href="/portfolio" aria-current={active === 'portfolio' ? 'page' : undefined}>
        Portfolio
      </Link>
    </nav>
  );
}
