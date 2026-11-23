'use client';

import { useCallback, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowUpRight } from 'lucide-react';
import type { UseInfiniteQueryResult } from '@tanstack/react-query';
import type { MarketNft } from '@/lib/opensea';
import { MarketHeader } from '@/sites/wilderworld/marketplace/MarketHeader';
import { useAuthStore } from '@/features/auth/store';
import { useEthPriceQuery } from '@/app/market/hooks/useEthPriceQuery';
import { useInfiniteScroll } from '@/app/market/hooks/useInfiniteScroll';
import {
  useEthHoldingsQuery,
  useZchainHoldingsQuery,
  type HoldingsData,
} from '@/app/market/hooks/useHoldingsQuery';
import { NftGrid } from '@/app/market/components/NftGrid';
import { MarketSkeleton } from '@/app/market/components/MarketSkeleton';
import { MarketEmptyState } from '@/app/market/components/MarketEmptyState';
import { LoadMoreSentinel } from '@/app/market/components/LoadMoreSentinel';
import { ItemModal } from '@/app/market/components/ItemModal';
import styles from '@/app/store/account/AccountPage.module.css';
import { AccountTabs } from '@/app/store/account/AccountTabs';

type HoldingsQuery = UseInfiniteQueryResult<HoldingsData>;

/**
 * One holdings source rendered with the marketplace's own grid + states. A load
 * failure surfaces as an error (never a false "nothing here"), mirroring the
 * marketplace browse. Each card opens the shared item modal via onOpen.
 */
function HoldingsSection({
  title,
  subtitle,
  emptyBody,
  query,
  ethUsd,
  onOpen,
}: {
  title: string;
  subtitle: string;
  emptyBody: string;
  query: HoldingsQuery;
  ethUsd: number | null;
  onOpen: (nft: MarketNft) => void;
}) {
  const { data, isLoading, isError, hasNextPage = false, isFetchingNextPage, fetchNextPage } = query;
  const items = data?.items ?? [];
  const batchBase = data?.batchBase ?? 0;
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const loadMore = useCallback(() => {
    void fetchNextPage();
  }, [fetchNextPage]);
  useInfiniteScroll(sentinelRef, {
    hasNextPage,
    isFetching: isFetchingNextPage,
    onLoadMore: loadMore,
  });

  // NftGrid hands back the token identifier, so resolve it to the full item for the modal.
  const open = useCallback(
    (id: string) => {
      const nft = items.find((n) => n.identifier === id);
      if (nft) onOpen(nft);
    },
    [items, onOpen]
  );

  return (
    <section className={styles.tabContent} aria-label={title}>
      <div className={styles.sectionHeader}>
        <div>
          <h2>{title}</h2>
          <p>{subtitle}</p>
        </div>
      </div>
      {isLoading ? (
        <MarketSkeleton viewMode="grid" gridSize="md" />
      ) : isError ? (
        <MarketEmptyState
          title="Your items are unavailable"
          body="Live data is unavailable right now. Please try again shortly."
        />
      ) : items.length === 0 ? (
        <MarketEmptyState title="Nothing here yet" body={emptyBody} />
      ) : (
        <>
          <NftGrid items={items} gridSize="md" ethUsd={ethUsd} batchBase={batchBase} onOpen={open} />
          {hasNextPage && (
            <LoadMoreSentinel
              sentinelRef={sentinelRef}
              loadingMore={isFetchingNextPage}
              onLoadMore={loadMore}
            />
          )}
        </>
      )}
    </section>
  );
}

/**
 * The portfolio: the signed-in user's Wilder World items, split into their ZERO
 * Z-Chain wallet and their linked external wallets. Display only, built entirely
 * from the marketplace's own grid + modal components (no valuations, which have no
 * backend yet). Gated on sign-in via the ZERO auth store.
 */
export default function Portfolio() {
  const user = useAuthStore((s) => s.user);
  const status = useAuthStore((s) => s.status);
  const openLogin = useAuthStore((s) => s.openLogin);
  const zeroWallet = user?.zeroWalletAddress ?? null;

  const { data: ethUsd = null } = useEthPriceQuery();
  const zchain = useZchainHoldingsQuery(zeroWallet);
  const eth = useEthHoldingsQuery(Boolean(user));

  const [openNft, setOpenNft] = useState<MarketNft | null>(null);

  return (
    <div className={styles.page}>
      <MarketHeader />
      <div className={styles.container}>
        <div className={styles.breadcrumb}>
          <Link href="/store">
            <ArrowLeft size={13} aria-hidden />
            Wilder World
          </Link>
          <Link href="/store/account">Your account</Link>
          <span>Portfolio</span>
        </div>

        {status === 'restoring' ? (
          <div className={styles.loading} role="status">
            Loading your portfolio…
          </div>
        ) : !user ? (
          <section className={styles.empty}>
            <h3>Sign in to see your holdings</h3>
            <p>Your Wilder World items, and the items in your linked wallets, appear here once you sign in.</p>
            <button className={styles.primary} type="button" onClick={openLogin}>
              Sign in
              <ArrowUpRight size={15} aria-hidden />
            </button>
          </section>
        ) : (
          <>
            <header className={styles.accountHeading}>
              <div>
                <p className={styles.eyebrow}>Everything you hold</p>
                <h1>Your portfolio</h1>
              </div>
            </header>
            <AccountTabs active="portfolio" />
            <div className={styles.tabContent}>
              {zeroWallet && (
                <HoldingsSection
                  title="Your Wilder World items"
                  subtitle="Held in your ZERO wallet on Z Chain."
                  emptyBody="Items you buy or receive in your ZERO wallet will show here."
                  query={zchain}
                  ethUsd={ethUsd}
                  onOpen={setOpenNft}
                />
              )}
              <HoldingsSection
                title="Your linked wallet items"
                subtitle="Wilder World items held across the external wallets you have linked."
                emptyBody="Link an external wallet from your account to see its Wilder World items here."
                query={eth}
                ethUsd={ethUsd}
                onOpen={setOpenNft}
              />
            </div>
          </>
        )}
      </div>

      {openNft && (
        <ItemModal
          nft={openNft}
          slug={openNft.collectionSlug}
          ethUsd={ethUsd}
          hasPrev={false}
          hasNext={false}
          onPrev={() => {}}
          onNext={() => {}}
          onClose={() => setOpenNft(null)}
        />
      )}
    </div>
  );
}
