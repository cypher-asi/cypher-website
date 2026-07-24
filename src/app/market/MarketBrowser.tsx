'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft } from 'lucide-react';
import type { WilderIndustry } from '@/lib/wilderCollections';
import { getEntrySource } from '@/lib/wilderCollections';
import { getStaticTraits } from '@/lib/wilderTraits';
import { CollapsiblePanel } from './components/CollapsiblePanel';
import { CustomScrollbar } from '@/components/CustomScrollbar';
import { useMarketStore } from './store/marketStore';
import { useCollectionsQuery } from './hooks/useCollectionsQuery';
import { useEthPriceQuery } from './hooks/useEthPriceQuery';
import { useMarketNftsQuery } from './hooks/useMarketNftsQuery';
import { useHoldingsQuery } from './hooks/useHoldingsQuery';
import { useAuthStore } from '@/features/auth/store';
import { useMarketTraitsQuery } from './hooks/useMarketTraitsQuery';
import { useMediaQuery } from './hooks/useMediaQuery';
import { useInfiniteScroll } from './hooks/useInfiniteScroll';
import { useMarketUrlSync } from './hooks/useMarketUrlSync';
import { useTradeReconciler } from './hooks/useTradeReconciler';
import { countSelectedTraits, filterByTraits, itemKey } from './lib/items';
import { ZeroAuthButton } from '@/features/auth/ZeroAuthButton';
import type { Availability } from './types';
import { CollectionNav } from './components/CollectionNav';
import { MobileCollectionMenu } from './components/MobileCollectionMenu';
import { MarketToolbar } from './components/MarketToolbar';
import { MarketFilters } from './components/MarketFilters';
import { RailDrawer } from './components/RailDrawer';
import { CollectionInfoPanel } from './components/CollectionInfoPanel';
import { WalletPanel } from './components/WalletPanel';
import { NftGrid } from './components/NftGrid';
import { NftList } from './components/NftList';
import { MarketSkeleton } from './components/MarketSkeleton';
import { MarketEmptyState } from './components/MarketEmptyState';
import { LoadMoreSentinel } from './components/LoadMoreSentinel';
import { ItemModal } from './components/ItemModal';
import styles from './market.module.css';

type Props = { industries: WilderIndustry[] };

export default function MarketBrowser({ industries }: Props) {
  const allEntries = useMemo(
    () => industries.flatMap((i) => i.collections),
    [industries]
  );
  const validSlugs = useMemo(() => allEntries.map((e) => e.slug), [allEntries]);
  const firstSlug = allEntries[0]?.slug ?? '';

  /* ----- UI state (zustand) ---------------------------------------------- */
  const activeSlug = useMarketStore((s) => s.activeSlug);
  const availability = useMarketStore((s) => s.availability);
  const selectedTraits = useMarketStore((s) => s.selectedTraits);
  const openTraitGroups = useMarketStore((s) => s.openTraitGroups);
  const gridSize = useMarketStore((s) => s.gridSize);
  const viewMode = useMarketStore((s) => s.viewMode);
  const modalId = useMarketStore((s) => s.modalId);
  const activeDrawer = useMarketStore((s) => s.activeDrawer);
  const collectionMenuOpen = useMarketStore((s) => s.collectionMenuOpen);
  const openNavGroup = useMarketStore((s) => s.openNavGroup);

  const setAvailability = useMarketStore((s) => s.setAvailability);
  const toggleTrait = useMarketStore((s) => s.toggleTrait);
  const clearTraits = useMarketStore((s) => s.clearTraits);
  const toggleTraitGroup = useMarketStore((s) => s.toggleTraitGroup);
  const setGridSize = useMarketStore((s) => s.setGridSize);
  const setViewMode = useMarketStore((s) => s.setViewMode);
  const setActiveDrawer = useMarketStore((s) => s.setActiveDrawer);
  const setCollectionMenuOpen = useMarketStore((s) => s.setCollectionMenuOpen);
  const setOpenNavGroup = useMarketStore((s) => s.setOpenNavGroup);

  /* ----- URL <-> store sync + navigation controls ------------------------ */
  const { navigateCollection, openModal, closeModal } = useMarketUrlSync(
    validSlugs,
    firstSlug
  );

  // Refetch the grids + stats whenever a trade settles (mounted here, not in the
  // modal, so it survives every modal dismissal path).
  useTradeReconciler();

  /* ----- Server data (TanStack Query) ------------------------------------ */
  const { data: meta } = useCollectionsQuery();
  const { data: ethUsd = null } = useEthPriceQuery();
  const activeEntry = allEntries.find((c) => c.slug === activeSlug);
  const isIndexerSource =
    activeEntry != null && getEntrySource(activeEntry) === 'indexer';

  // "Yours" (your holdings) is only offered on a Z-Chain collection with a
  // connected wallet.
  const walletAddress = useAuthStore((s) => s.user?.zeroWalletAddress ?? null);
  const showYours = walletAddress != null && isIndexerSource;

  // "Your Holdings" — a consolidated view of all tradeable Z-Chain assets, opened
  // from the wallet panel. A local view flag, not a collection.
  const [holdingsOpen, setHoldingsOpen] = useState(false);

  // Indexer collections filter server-side across the whole collection, so the
  // trait selections drive the query. ETH keeps filtering client-side over the
  // loaded page, so it passes no attributes here.
  const nftsQuery = useMarketNftsQuery(
    activeSlug,
    availability,
    isIndexerSource ? selectedTraits : undefined,
    availability === 'yours' ? walletAddress : null
  );
  const holdingsQuery = useHoldingsQuery(walletAddress, holdingsOpen);

  // The grid reads from whichever view is active; both queries share a shape.
  const gridQuery = holdingsOpen ? holdingsQuery : nftsQuery;
  const nftsData = gridQuery.data;
  const isLoading = gridQuery.isLoading;
  const isError = gridQuery.isError;
  const hasNextPage = gridQuery.hasNextPage ?? false;
  const isFetchingNextPage = gridQuery.isFetchingNextPage;
  const fetchNextPage = gridQuery.fetchNextPage;

  const items = nftsData?.items ?? [];
  const batchBase = nftsData?.batchBase ?? 0;

  // If "Yours" stops being available (disconnect, or switching to an ETH
  // collection) while it's the active filter, fall back to Listed.
  useEffect(() => {
    if (availability === 'yours' && !showYours) setAvailability('listed');
  }, [availability, showYours, setAvailability]);

  const staticTraits = useMemo(() => getStaticTraits(activeSlug), [activeSlug]);
  const { data: indexerTraits } = useMarketTraitsQuery(isIndexerSource ? activeSlug : '');
  const traitCategories = isIndexerSource ? (indexerTraits ?? []) : staticTraits;
  // Indexer results are already trait-filtered server-side; ETH filters the
  // loaded page client-side.
  const filtered = useMemo(
    () =>
      holdingsOpen || isIndexerSource ? items : filterByTraits(items, selectedTraits),
    [holdingsOpen, isIndexerSource, items, selectedTraits]
  );
  const selectedCount = countSelectedTraits(selectedTraits);

  const activeIndustry = industries.find((i) =>
    i.collections.some((c) => c.slug === activeSlug)
  );
  const activeMeta = meta?.[activeSlug];
  const collectionName =
    activeMeta?.name ?? activeEntry?.label ?? activeIndustry?.name ?? 'Collection';

  /* ----- Layout refs ------------------------------------------------------ */
  const navRef = useRef<HTMLElement | null>(null);
  const railRef = useRef<HTMLElement | null>(null);
  const collRef = useRef<HTMLDivElement | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const isMobile = useMediaQuery('(max-width: 820px)');

  const loadMore = useCallback(() => {
    void fetchNextPage();
  }, [fetchNextPage]);

  useInfiniteScroll(sentinelRef, {
    hasNextPage,
    isFetching: isFetchingNextPage,
    onLoadMore: loadMore,
  });

  /* ----- Availability change: refetch (via key) + scroll to top ---------- */
  const changeAvailability = useCallback(
    (value: Availability) => {
      if (value === availability) return;
      setAvailability(value);
      window.scrollTo({ top: 0, behavior: 'auto' });
    },
    [availability, setAvailability]
  );

  /* ----- Holdings view: open from the wallet panel, exit back to a grid --- */
  const openHoldings = useCallback(() => {
    setHoldingsOpen(true);
    setActiveDrawer(null); // in case it was opened from the mobile wallet drawer
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [setActiveDrawer]);

  // Picking a collection leaves the holdings view for that collection.
  const selectCollection = useCallback(
    (slug: string) => {
      setHoldingsOpen(false);
      navigateCollection(slug);
    },
    [navigateCollection]
  );

  // Holdings is wallet-scoped: dropping the wallet exits the view.
  useEffect(() => {
    if (holdingsOpen && !walletAddress) setHoldingsOpen(false);
  }, [holdingsOpen, walletAddress]);

  /* ----- Nav dropdown: close on outside click / Escape ------------------- */
  useEffect(() => {
    if (!openNavGroup) return;
    const onDown = (e: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) setOpenNavGroup(null);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpenNavGroup(null);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [openNavGroup, setOpenNavGroup]);

  /* ----- Mobile collection dropdown: close on outside click / Escape ----- */
  useEffect(() => {
    if (!collectionMenuOpen) return;
    const onDown = (e: MouseEvent) => {
      if (collRef.current && !collRef.current.contains(e.target as Node)) {
        setCollectionMenuOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setCollectionMenuOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [collectionMenuOpen, setCollectionMenuOpen]);

  /* ----- Mobile rail drawer: close on Escape ----------------------------- */
  useEffect(() => {
    if (!activeDrawer) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setActiveDrawer(null);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [activeDrawer, setActiveDrawer]);

  /* ----- Tidy up mobile-only overlays when leaving the mobile layout ----- */
  useEffect(() => {
    if (!isMobile) {
      setActiveDrawer(null);
      setCollectionMenuOpen(false);
    }
  }, [isMobile, setActiveDrawer, setCollectionMenuOpen]);

  /* ----- Item modal navigation ------------------------------------------- */
  // Identify the open item by its full card key, not the bare token id: a 1155
  // can surface several cards (floor + bundles) sharing one token id.
  const modalIndex = modalId ? filtered.findIndex((n) => itemKey(n) === modalId) : -1;
  const modalNft = modalIndex >= 0 ? filtered[modalIndex] : null;

  const goPrev = useCallback(() => {
    if (modalIndex > 0) openModal(itemKey(filtered[modalIndex - 1]), { replace: true });
  }, [modalIndex, filtered, openModal]);

  const goNext = useCallback(() => {
    if (modalIndex >= 0 && modalIndex < filtered.length - 1) {
      openModal(itemKey(filtered[modalIndex + 1]), { replace: true });
    } else if (hasNextPage) {
      loadMore();
    }
  }, [modalIndex, filtered, openModal, hasNextPage, loadMore]);

  /* ----- Derived view flags ---------------------------------------------- */
  const showSkeleton = activeSlug === '' || isLoading;
  const hasActiveFilters = selectedCount > 0;
  // A live floor price means the collection has at least one active listing, so
  // an empty "listed" result there is almost certainly a fetch hiccup rather
  // than a truly empty collection. But an empty *filtered* result is a legitimate
  // "no matches" — a trait can exclude every listing while the collection still
  // has a floor — so a filtered-empty grid is never "unavailable".
  const floorSuggestsListings =
    availability === 'listed' && (activeMeta?.floorPrice ?? 0) > 0;
  const showUnavailable =
    isError ||
    (!holdingsOpen && items.length === 0 && floorSuggestsListings && !hasActiveFilters);

  const filters = (
    <MarketFilters
      activeSlug={activeSlug}
      availability={availability}
      showAvailability={true}
      showYours={showYours}
      traitCategories={traitCategories}
      selectedTraits={selectedTraits}
      openTraitGroups={openTraitGroups}
      selectedCount={selectedCount}
      onAvailabilityChange={changeAvailability}
      onToggleTrait={toggleTrait}
      onToggleGroup={toggleTraitGroup}
      onClear={clearTraits}
    />
  );

  // Shared between the desktop rail (in a collapsible panel) and the mobile
  // collection drawer.
  const collectionInfo = (
    <CollectionInfoPanel
      launched={activeMeta?.launched ?? activeEntry?.launched ?? null}
      floorPrice={activeMeta?.floorPrice ?? null}
      topOfferEth={activeMeta?.topOfferEth ?? null}
      totalVolume={activeMeta?.totalVolume ?? null}
      listedCount={activeMeta?.listedCount ?? null}
      owners={activeMeta?.owners ?? null}
      ethUsd={ethUsd}
      wildDenominated={isIndexerSource}
      openseaSlug={isIndexerSource ? undefined : activeEntry?.slug}
    />
  );

  // A trait filter is active but nothing came back (server- or client-side): a
  // real "no matches", whichever availability tab we're on. Otherwise fall back
  // to the per-tab "nothing here" copy.
  const emptyCopy = holdingsOpen
    ? {
        title: 'No tradeable assets yet',
        body: 'Items you hold across the Z-Chain collections show up here, ready to list for sale.',
      }
    : hasActiveFilters
    ? {
        title: 'No items match your filters',
        body: 'Try clearing or adjusting the selected trait filters.',
      }
    : availability === 'listed'
      ? {
          title: 'No items currently listed',
          body: isIndexerSource
            ? 'Nothing in this collection is listed for sale right now. Try the Unlisted filter to browse the collection.'
            : 'Nothing in this collection is listed for sale right now. Try the Unlisted filter or browse on OpenSea.',
        }
      : availability === 'yours'
        ? {
            title: "You don't own anything here yet",
            body: 'Items you own in this collection will show up here, ready to list for sale.',
          }
        : {
            title: 'No unlisted items found',
            body: 'Every token in this collection appears to be listed. Switch back to the Listed filter to see them.',
          };

  return (
    <>
      <div className={styles.topbar}>
        <div className={styles.titleRow}>
          <h1 className={styles.headerTitle}>Wilder Market</h1>
          <MobileCollectionMenu
            industries={industries}
            entries={allEntries}
            activeSlug={activeSlug}
            label={collectionName}
            open={collectionMenuOpen}
            menuRef={collRef}
            onToggle={() => setCollectionMenuOpen(!collectionMenuOpen)}
            onSelect={selectCollection}
          />
          <div className={styles.headerAuth}>
            <ZeroAuthButton />
          </div>
        </div>

        <CollectionNav
          industries={industries}
          activeSlug={activeSlug}
          openNavGroup={openNavGroup}
          navRef={navRef}
          onToggleNavGroup={setOpenNavGroup}
          onSelect={selectCollection}
        />

        <MarketToolbar
          gridSize={gridSize}
          viewMode={viewMode}
          selectedCount={selectedCount}
          showWallet={walletAddress != null}
          activeDrawer={activeDrawer}
          onOpenDrawer={setActiveDrawer}
          onGridSize={setGridSize}
          onShowList={() => setViewMode('list')}
        />
      </div>

      <div className={styles.layout}>
        <aside className={styles.rail} ref={railRef}>
          {/* On small screens the rail panels move into toolbar-triggered drawers
              (below), so the rail itself only renders on the desktop layout. */}
          {!isMobile && (
            <>
              {walletAddress && (
                <div className={styles.railGroup}>
                  <p className={styles.railGroupLabel}>User</p>
                  <CollapsiblePanel title="Your Wallets" measureDeps={[walletAddress]}>
                    <WalletPanel address={walletAddress} onOpenHoldings={openHoldings} />
                  </CollapsiblePanel>
                </div>
              )}

              {/* The collection filters + stats don't apply to the cross-collection
                  holdings view, so hide that group while it's open. */}
              {!holdingsOpen && (
                <div className={styles.railGroup}>
                  <p className={styles.railGroupLabel}>Collection</p>
                  <CollapsiblePanel title="Filters" measureDeps={[activeSlug, openTraitGroups]}>
                    {filters}
                  </CollapsiblePanel>
                  <CollapsiblePanel title={collectionName} measureDeps={[activeSlug, activeMeta]}>
                    {collectionInfo}
                  </CollapsiblePanel>
                </div>
              )}
            </>
          )}

          <CustomScrollbar targetRef={railRef} showOnHoverOnly />
        </aside>

        <div className={styles.main}>
          {holdingsOpen && (
            <div className={styles.holdingsHead}>
              <button
                type="button"
                className={styles.holdingsBack}
                onClick={() => setHoldingsOpen(false)}
              >
                <ChevronLeft size={16} aria-hidden />
                Back
              </button>
              <h2 className={styles.holdingsTitle}>Your Holdings</h2>
            </div>
          )}
          {showSkeleton ? (
            <MarketSkeleton viewMode={viewMode} gridSize={gridSize} />
          ) : showUnavailable ? (
            <MarketEmptyState
              title="No items to display"
              body={
                isIndexerSource
                  ? 'Live data is unavailable right now. Please try again shortly.'
                  : 'Live NFT data is unavailable right now. Check that the OpenSea API key is configured, or view the collection directly on OpenSea.'
              }
              openseaSlug={isIndexerSource ? undefined : activeEntry?.slug}
            />
          ) : filtered.length === 0 ? (
            <MarketEmptyState
              title={emptyCopy.title}
              body={emptyCopy.body}
              openseaSlug={
                isIndexerSource || items.length !== 0
                  ? undefined
                  : activeEntry?.slug
              }
            />
          ) : (
            <>
              {viewMode === 'list' ? (
                <NftList
                  items={filtered}
                  ethUsd={ethUsd}
                  onOpen={openModal}
                  showListedBadge={holdingsOpen || availability === 'yours'}
                />
              ) : (
                <NftGrid
                  items={filtered}
                  gridSize={gridSize}
                  ethUsd={ethUsd}
                  batchBase={batchBase}
                  onOpen={openModal}
                  showListedBadge={holdingsOpen || availability === 'yours'}
                />
              )}
              {hasNextPage && (
                <LoadMoreSentinel
                  sentinelRef={sentinelRef}
                  loadingMore={isFetchingNextPage}
                  onLoadMore={loadMore}
                />
              )}
            </>
          )}
        </div>
      </div>

      {isMobile && activeDrawer && (
        <RailDrawer
          title={
            activeDrawer === 'wallet'
              ? 'Your Wallets'
              : activeDrawer === 'collection'
                ? collectionName
                : 'Filters'
          }
          onClose={() => setActiveDrawer(null)}
        >
          {activeDrawer === 'wallet'
            ? walletAddress && (
                <WalletPanel address={walletAddress} onOpenHoldings={openHoldings} />
              )
            : activeDrawer === 'collection'
              ? collectionInfo
              : filters}
        </RailDrawer>
      )}

      {modalNft && (
        <ItemModal
          nft={modalNft}
          // Holdings span collections, so key the item's detail/trade to its own
          // collection, not the (last) active grid slug.
          slug={holdingsOpen ? modalNft.collectionSlug : activeSlug}
          ethUsd={ethUsd}
          hasPrev={modalIndex > 0}
          hasNext={modalIndex < filtered.length - 1 || hasNextPage}
          onPrev={goPrev}
          onNext={goNext}
          onClose={closeModal}
        />
      )}
    </>
  );
}
