'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowUpRight,
  ChevronDown,
  Grid2x2,
  Grid3x3,
  LayoutGrid,
  List,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import type { WilderIndustry } from '@/lib/wilderCollections';
import type { MarketNft } from '@/lib/opensea';
import type { MarketCollection } from '@/app/api/market/collections/route';
import { getStaticTraits } from '@/lib/wilderTraits';
import { formatUsd, formatEth } from '@/lib/price';
import { FadeInImage } from '@/components/FadeInImage';
import { AnimatedPanel } from '@/components/AnimatedPanel';
import { CustomScrollbar } from '@/components/CustomScrollbar';
import ItemModal from './ItemModal';
import styles from './market.module.css';

type Props = { industries: WilderIndustry[] };

type SelectedTraits = Record<string, Set<string>>;
type Availability = 'listed' | 'unlisted';

const itemKey = (nft: MarketNft) => `${nft.contract}-${nft.identifier}`;

// Wilder token IDs are full uint256 values, far too long to fit a table cell.
// Collapse the middle so the column stays aligned; the full value is kept in a
// tooltip.
const shortId = (id: string) => (id.length > 11 ? `${id.slice(0, 6)}…${id.slice(-4)}` : id);

/**
 * Keep the first occurrence of each token. OpenSea can surface the same token
 * across paginated "load more" responses (and a token may carry more than one
 * listing), so appending pages blindly produces duplicate React keys — which
 * corrupts reconciliation and leaves stale cards behind on collection switch.
 */
function dedupeItems(list: MarketNft[]): MarketNft[] {
  const seen = new Set<string>();
  const out: MarketNft[] = [];
  for (const nft of list) {
    const key = itemKey(nft);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(nft);
  }
  return out;
}

/**
 * SSR-safe media-query hook. Defaults to `false` on the server and the first
 * client render (desktop path), then syncs to the real match after mount so
 * hydration stays consistent.
 */
function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const sync = () => setMatches(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, [query]);
  return matches;
}

export default function MarketBrowser({ industries }: Props) {
  const allEntries = useMemo(
    () => industries.flatMap((i) => i.collections),
    [industries]
  );
  const firstSlug = allEntries[0]?.slug ?? '';

  const [activeSlug, setActiveSlug] = useState(firstSlug);
  const [meta, setMeta] = useState<Record<string, MarketCollection>>({});
  const [ethUsd, setEthUsd] = useState<number | null>(null);

  const [items, setItems] = useState<MarketNft[]>([]);
  // The pagination cursor is stored together with the collection+availability
  // key it belongs to. A cursor from one collection can never be replayed
  // against another, so switching collections can't mix items across them.
  const [next, setNext] = useState<{ cursor: string; key: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(false);

  const [selected, setSelected] = useState<SelectedTraits>({});
  const [openTraitGroups, setOpenTraitGroups] = useState<Record<string, boolean>>({});
  // Market shows listed items (cheapest first) by default; the left-rail filter
  // toggles to unlisted tokens.
  const [availability, setAvailability] = useState<Availability>('listed');

  // Collection traits are static (immutable minted attributes), so they're
  // embedded at build time and resolved synchronously — no fetch, no loading
  // state, instant on collection switch.
  const traitCats = useMemo(() => getStaticTraits(activeSlug), [activeSlug]);

  const [openNav, setOpenNav] = useState<string | null>(null);
  const navRef = useRef<HTMLDivElement | null>(null);
  const railRef = useRef<HTMLElement | null>(null);

  // Mobile-only UI: the filters drawer and the flat collection dropdown.
  const isMobile = useMediaQuery('(max-width: 820px)');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [collOpen, setCollOpen] = useState(false);
  const collRef = useRef<HTMLDivElement | null>(null);
  // Guards against a single close triggering more than one history.back()
  // (history.back is async, so re-entrant calls would overshoot the grid).
  const closingRef = useRef(false);
  // Identifies the active collection+availability request. In-flight "load
  // more" responses whose key no longer matches are discarded so switching
  // collections never mixes items from the previous one.
  const loadKeyRef = useRef('');

  const [gridSize, setGridSize] = useState<'lg' | 'md' | 'sm'>('md');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Index at which the most recently loaded batch starts, so each page of
  // results staggers in one-at-a-time relative to itself (not the whole list).
  const batchBaseRef = useRef(0);

  const [modalId, setModalId] = useState<string | null>(null);

  const activeEntry = allEntries.find((c) => c.slug === activeSlug);
  const activeIndustry = industries.find((i) =>
    i.collections.some((c) => c.slug === activeSlug)
  );
  const activeMeta = meta[activeSlug];

  /* ----- One-time enrichment: collection stats + ETH price ---------------- */
  useEffect(() => {
    let alive = true;
    fetch('/api/market/collections')
      .then((r) => r.json())
      .then((d: { collections?: MarketCollection[] }) => {
        if (!alive || !d.collections) return;
        const byId: Record<string, MarketCollection> = {};
        for (const c of d.collections) byId[c.slug] = c;
        setMeta(byId);
      })
      .catch(() => {});
    fetch('/api/market/eth-price')
      .then((r) => r.json())
      .then((d: { usd?: number | null }) => {
        if (alive) setEthUsd(d.usd ?? null);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  /* ----- Remember the preferred grid density + view mode ------------------ */
  useEffect(() => {
    const saved = localStorage.getItem('market-grid-size');
    if (saved === 'lg' || saved === 'md' || saved === 'sm') setGridSize(saved);
    const savedView = localStorage.getItem('market-view');
    if (savedView === 'grid' || savedView === 'list') setViewMode(savedView);
    const savedAvail = localStorage.getItem('market-availability');
    if (savedAvail === 'listed' || savedAvail === 'unlisted') setAvailability(savedAvail);
  }, []);

  const changeGridSize = useCallback((size: 'lg' | 'md' | 'sm') => {
    setGridSize(size);
    setViewMode('grid');
    try {
      localStorage.setItem('market-grid-size', size);
      localStorage.setItem('market-view', 'grid');
    } catch {
      /* ignore quota / privacy-mode errors */
    }
  }, []);

  const showList = useCallback(() => {
    setViewMode('list');
    try {
      localStorage.setItem('market-view', 'list');
    } catch {
      /* ignore quota / privacy-mode errors */
    }
  }, []);

  /* ----- Sync active collection + modal from the URL (back button) -------- */
  useEffect(() => {
    const apply = () => {
      const p = new URLSearchParams(window.location.search);
      const c = p.get('c');
      const token = p.get('token');
      if (c && allEntries.some((e) => e.slug === c)) {
        setActiveSlug(c);
      }
      setModalId(token);
      closingRef.current = false;
    };
    apply();
    window.addEventListener('popstate', apply);
    return () => window.removeEventListener('popstate', apply);
  }, [allEntries, activeSlug]);

  /* ----- Reset trait selection + open groups on collection change --------- */
  useEffect(() => {
    setSelected({});
    setOpenTraitGroups({});
  }, [activeSlug]);

  /* ----- Load first page on collection or availability change ------------- */
  useEffect(() => {
    if (!activeSlug) return;
    let alive = true;
    const key = `${activeSlug}|${availability}`;
    loadKeyRef.current = key;
    setLoading(true);
    setLoadingMore(false);
    setError(false);
    setItems([]);
    setNext(null);
    batchBaseRef.current = 0;
    fetch(
      `/api/market/nfts?slug=${encodeURIComponent(activeSlug)}&status=${availability}`
    )
      .then((r) => r.json())
      .then((d: { items?: MarketNft[]; next?: string | null; error?: boolean }) => {
        if (!alive) return;
        // An upstream failure must never be shown as "no listed items"; surface
        // the unavailable state instead so the empty copy stays truthful.
        if (d.error) {
          setError(true);
          return;
        }
        setItems(dedupeItems(d.items ?? []));
        setNext(d.next ? { cursor: d.next, key } : null);
      })
      .catch(() => {
        if (alive) setError(true);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [activeSlug, availability]);

  const loadMore = useCallback(() => {
    const key = `${activeSlug}|${availability}`;
    // Only page when the cursor belongs to the collection on screen right now.
    // During a collection switch `next` briefly still points at the previous
    // collection; this check drops that stale request before it can fire.
    if (!next || next.key !== key || loadingMore) return;
    setLoadingMore(true);
    fetch(
      `/api/market/nfts?slug=${encodeURIComponent(activeSlug)}&status=${availability}&next=${encodeURIComponent(
        next.cursor
      )}`
    )
      .then((r) => r.json())
      .then((d: { items?: MarketNft[]; next?: string | null; error?: boolean }) => {
        // Ignore results that arrive after the collection/availability changed.
        if (loadKeyRef.current !== key) return;
        // On an upstream failure keep the current items and cursor so a hiccup
        // isn't misread as the end of the list.
        if (d.error) return;
        setItems((prev) => {
          batchBaseRef.current = prev.length;
          return dedupeItems([...prev, ...(d.items ?? [])]);
        });
        setNext(d.next ? { cursor: d.next, key } : null);
      })
      .catch(() => {})
      .finally(() => {
        if (loadKeyRef.current === key) setLoadingMore(false);
      });
  }, [next, loadingMore, activeSlug, availability]);

  const changeAvailability = useCallback(
    (value: Availability) => {
      if (value === availability) return;
      setAvailability(value);
      try {
        localStorage.setItem('market-availability', value);
      } catch {
        /* ignore quota / privacy-mode errors */
      }
      window.scrollTo({ top: 0, behavior: 'auto' });
    },
    [availability]
  );

  const sentinelRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !next) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) loadMore();
      },
      { rootMargin: '600px' }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [next, loadMore]);

  /* ----- Close the nav dropdown on outside click / Escape ----------------- */
  useEffect(() => {
    if (!openNav) return;
    const onDown = (e: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) setOpenNav(null);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpenNav(null);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [openNav]);

  /* ----- Mobile collection dropdown: close on outside click / Escape ------ */
  useEffect(() => {
    if (!collOpen) return;
    const onDown = (e: MouseEvent) => {
      if (collRef.current && !collRef.current.contains(e.target as Node)) setCollOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setCollOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [collOpen]);

  /* ----- Mobile filters drawer: close on Escape --------------------------- */
  useEffect(() => {
    if (!filtersOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setFiltersOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [filtersOpen]);

  /* ----- Tidy up the mobile-only overlays when leaving the mobile layout -- */
  useEffect(() => {
    if (!isMobile) {
      setFiltersOpen(false);
      setCollOpen(false);
    }
  }, [isMobile]);

  /* ----- Collection switching: update URL + scroll to top ----------------- */
  const selectCollection = useCallback(
    (slug: string) => {
      setOpenNav(null);
      setCollOpen(false);
      if (slug === activeSlug) {
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
      setActiveSlug(slug);
      window.history.replaceState({}, '', `?c=${slug}`);
      window.scrollTo({ top: 0, behavior: 'auto' });
    },
    [activeSlug]
  );

  /* ----- Client-side trait filtering over loaded items -------------------- */
  const filtered = useMemo(() => {
    const active = Object.entries(selected).filter(([, v]) => v.size > 0);
    if (active.length === 0) return items;
    return items.filter((nft) =>
      active.every(([type, values]) =>
        nft.traits.some((t) => t.type === type && values.has(t.value))
      )
    );
  }, [items, selected]);

  const toggleTrait = useCallback((type: string, value: string) => {
    setSelected((prev) => {
      const nextSet = new Set(prev[type] ?? []);
      if (nextSet.has(value)) nextSet.delete(value);
      else nextSet.add(value);
      return { ...prev, [type]: nextSet };
    });
  }, []);

  const selectedCount = useMemo(
    () => Object.values(selected).reduce((n, s) => n + s.size, 0),
    [selected]
  );

  /* ----- Item modal navigation ------------------------------------------- */
  const modalIndex = modalId ? filtered.findIndex((n) => n.identifier === modalId) : -1;
  const modalNft = modalIndex >= 0 ? filtered[modalIndex] : null;

  const gridClass = `${styles.grid} ${
    gridSize === 'lg' ? styles.gridLg : gridSize === 'sm' ? styles.gridSm : ''
  }`;

  // A live floor price means the collection has at least one active listing, so
  // an empty "listed" result there is almost certainly a fetch hiccup rather
  // than a truly empty collection. Don't claim "no listed items" in that case.
  const floorSuggestsListings =
    availability === 'listed' && (activeMeta?.floorPrice ?? 0) > 0;
  const showUnavailable = error || (items.length === 0 && floorSuggestsListings);

  const openModal = useCallback(
    (id: string, { replace = false }: { replace?: boolean } = {}) => {
      setModalId(id);
      closingRef.current = false;
      const url = `?c=${activeSlug}&token=${id}`;
      const state = { token: id };
      // Opening from the grid pushes a single history entry; navigating the
      // carousel replaces it so closing always returns straight to the grid.
      if (replace) window.history.replaceState(state, '', url);
      else window.history.pushState(state, '', url);
    },
    [activeSlug]
  );

  const closeModal = useCallback(() => {
    if (closingRef.current) return;
    if (window.history.state?.token) {
      closingRef.current = true;
      window.history.back();
    } else {
      setModalId(null);
      window.history.replaceState({}, '', `?c=${activeSlug}`);
    }
  }, [activeSlug]);

  const goPrev = useCallback(() => {
    if (modalIndex > 0) openModal(filtered[modalIndex - 1].identifier, { replace: true });
  }, [modalIndex, filtered, openModal]);

  const goNext = useCallback(() => {
    if (modalIndex >= 0 && modalIndex < filtered.length - 1) {
      openModal(filtered[modalIndex + 1].identifier, { replace: true });
    } else if (next) {
      loadMore();
    }
  }, [modalIndex, filtered, openModal, next, loadMore]);

  /* ----- Filters body, shared between the desktop rail + mobile drawer ---- */
  const renderFilters = () => (
    <>
      <div className={styles.filtersHead}>
        <p className={styles.railHeading}>Filters</p>
        {selectedCount > 0 && (
          <button className={styles.clearBtn} onClick={() => setSelected({})}>
            Clear ({selectedCount})
          </button>
        )}
      </div>
      <div className={styles.statusFilter} role="group" aria-label="Availability">
        <button
          type="button"
          className={`${styles.statusBtn} ${
            availability === 'listed' ? styles.statusBtnActive : ''
          }`}
          onClick={() => changeAvailability('listed')}
          aria-pressed={availability === 'listed'}
        >
          Listed
        </button>
        <button
          type="button"
          className={`${styles.statusBtn} ${
            availability === 'unlisted' ? styles.statusBtnActive : ''
          }`}
          onClick={() => changeAvailability('unlisted')}
          aria-pressed={availability === 'unlisted'}
        >
          Unlisted
        </button>
      </div>
      <div key={activeSlug} className={styles.filterSwap}>
        {!activeSlug ? null : traitCats.length === 0 ? (
          <p className={styles.filtersEmpty}>No trait filters available.</p>
        ) : (
          <div className={styles.traitGroups}>
            {traitCats.map((cat) => {
              const open = openTraitGroups[cat.type] ?? false;
              return (
                <div key={cat.type} className={styles.traitGroup}>
                  <button
                    className={styles.traitGroupHead}
                    onClick={() =>
                      setOpenTraitGroups((p) => ({ ...p, [cat.type]: !open }))
                    }
                  >
                    <span>{cat.type}</span>
                    <ChevronDown
                      size={14}
                      className={open ? styles.chevOpen : styles.chev}
                    />
                  </button>
                  {open && (
                    <div className={styles.traitValues}>
                      {cat.values.map((v) => {
                        const checked = selected[cat.type]?.has(v.value) ?? false;
                        return (
                          <label key={v.value} className={styles.traitValue}>
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleTrait(cat.type, v.value)}
                            />
                            <span className={styles.traitValueLabel}>{v.value}</span>
                            <span className={styles.traitValueCount}>{v.count}</span>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );

  return (
    <>
      {/* ---- Top bar: title + horizontal collection navigation ---- */}
      <div className={styles.topbar}>
        <div className={styles.titleRow}>
          <h1 className={styles.headerTitle}>Wilder Market</h1>
          {/* Mobile-only: flat collection dropdown to the right of the title. */}
          <div className={styles.mobileColl} ref={collRef}>
            <button
              type="button"
              className={styles.mobileCollBtn}
              onClick={() => setCollOpen((o) => !o)}
              aria-expanded={collOpen}
            >
              <span className={styles.mobileCollLabel}>
                {activeMeta?.name ?? activeEntry?.label ?? activeIndustry?.name ?? 'Collection'}
              </span>
              <ChevronDown size={14} className={collOpen ? styles.chevOpen : styles.chev} />
            </button>
            {collOpen && (
              <div className={styles.mobileCollMenu}>
                {allEntries.map((c) => {
                  const industry = industries.find((i) =>
                    i.collections.some((x) => x.slug === c.slug)
                  );
                  return (
                    <button
                      key={c.slug}
                      type="button"
                      className={`${styles.navMenuItem} ${
                        c.slug === activeSlug ? styles.navMenuItemActive : ''
                      }`}
                      onClick={() => selectCollection(c.slug)}
                    >
                      {c.label ?? industry?.name ?? c.slug}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
        <nav className={styles.nav} ref={navRef} aria-label="Collections">
          {industries.map((industry) => {
            const isActiveIndustry = industry.collections.some((c) => c.slug === activeSlug);
            if (industry.collections.length === 1) {
              const c = industry.collections[0];
              return (
                <button
                  key={industry.id}
                  type="button"
                  className={`${styles.navItem} ${
                    isActiveIndustry ? styles.navItemActive : ''
                  }`}
                  onClick={() => selectCollection(c.slug)}
                >
                  {industry.name}
                </button>
              );
            }
            const open = openNav === industry.id;
            return (
              <div key={industry.id} className={styles.navGroup}>
                <button
                  type="button"
                  className={`${styles.navItem} ${
                    isActiveIndustry ? styles.navItemActive : ''
                  }`}
                  onClick={() => setOpenNav(open ? null : industry.id)}
                  aria-expanded={open}
                >
                  {industry.name}
                  <ChevronDown size={13} className={open ? styles.chevOpen : styles.chev} />
                </button>
                {open && (
                  <div className={styles.navMenu}>
                    {industry.collections.map((c) => (
                      <button
                        key={c.slug}
                        type="button"
                        className={`${styles.navMenuItem} ${
                          c.slug === activeSlug ? styles.navMenuItemActive : ''
                        }`}
                        onClick={() => selectCollection(c.slug)}
                      >
                        {c.label ?? industry.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        <div className={styles.toolbar}>
          {/* Mobile-only: opens the filters drawer. Sits at the far left of the
              toolbar row, level with the grid-size toggle. */}
          <button
            type="button"
            className={styles.filterIconBtn}
            onClick={() => setFiltersOpen(true)}
            aria-label="Filters"
            aria-haspopup="dialog"
            aria-expanded={filtersOpen}
          >
            <SlidersHorizontal size={16} />
            {selectedCount > 0 && <span className={styles.filterBadge}>{selectedCount}</span>}
          </button>
          <div className={styles.sizeToggle} role="group" aria-label="View mode">
          <button
            type="button"
            className={`${styles.sizeBtn} ${
              viewMode === 'grid' && gridSize === 'lg' ? styles.sizeBtnActive : ''
            }`}
            onClick={() => changeGridSize('lg')}
            aria-label="Large grid"
            aria-pressed={viewMode === 'grid' && gridSize === 'lg'}
          >
            <Grid2x2 size={16} />
          </button>
          <button
            type="button"
            className={`${styles.sizeBtn} ${
              viewMode === 'grid' && gridSize === 'md' ? styles.sizeBtnActive : ''
            }`}
            onClick={() => changeGridSize('md')}
            aria-label="Medium grid"
            aria-pressed={viewMode === 'grid' && gridSize === 'md'}
          >
            <LayoutGrid size={16} />
          </button>
          <button
            type="button"
            className={`${styles.sizeBtn} ${
              viewMode === 'grid' && gridSize === 'sm' ? styles.sizeBtnActive : ''
            }`}
            onClick={() => changeGridSize('sm')}
            aria-label="Small grid"
            aria-pressed={viewMode === 'grid' && gridSize === 'sm'}
          >
            <Grid3x3 size={16} />
          </button>
          <button
            type="button"
            className={`${styles.sizeBtn} ${viewMode === 'list' ? styles.sizeBtnActive : ''}`}
            onClick={showList}
            aria-label="List view"
            aria-pressed={viewMode === 'list'}
          >
            <List size={16} />
          </button>
          </div>
        </div>
      </div>

      <div className={styles.layout}>
        {/* ---- Left rail: filters + info ---- */}
        <aside className={styles.rail} ref={railRef}>
          {/* Filters live in the rail on desktop; on mobile they move into the
              slide-in drawer below so this panel is dropped entirely. */}
          {!isMobile && (
            <AnimatedPanel
              className={styles.panel}
              bodyClassName={styles.panelBody}
              measureDeps={[activeSlug, openTraitGroups]}
            >
              {renderFilters()}
            </AnimatedPanel>
          )}

          {/* Info panel */}
          <AnimatedPanel
            className={styles.panel}
            bodyClassName={styles.panelBody}
            measureDeps={[activeSlug, activeMeta]}
          >
            <p className={styles.railHeading}>
              {activeMeta?.name ?? activeEntry?.label ?? activeIndustry?.name ?? 'Collection'}
            </p>
            <div className={styles.info}>
              <InfoRow label="Launched" value={activeMeta?.launched ?? activeEntry?.launched ?? '—'} />
              <InfoRow
                label="Floor Price"
                value={
                  formatUsd(activeMeta?.floorPrice ?? null, ethUsd) ??
                  formatEth(activeMeta?.floorPrice ?? null) ??
                  '—'
                }
              />
              <InfoRow
                label="Top Offer"
                value={
                  formatUsd(activeMeta?.topOfferEth ?? null, ethUsd) ??
                  formatEth(activeMeta?.topOfferEth ?? null) ??
                  '—'
                }
              />
              <InfoRow
                label="Total Volume"
                value={
                  formatUsd(activeMeta?.totalVolume ?? null, ethUsd) ??
                  formatEth(activeMeta?.totalVolume ?? null) ??
                  '—'
                }
              />
              <InfoRow
                label="Listed"
                value={activeMeta?.listedCount != null ? String(activeMeta.listedCount) : '—'}
              />
              <InfoRow
                label="Owners (Unique)"
                value={activeMeta?.owners != null ? activeMeta.owners.toLocaleString() : '—'}
              />
            </div>
            {activeEntry && (
              <a
                className={styles.railOpensea}
                href={`https://opensea.io/collection/${activeEntry.slug}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                View on OpenSea
                <ArrowUpRight size={12} />
              </a>
            )}
          </AnimatedPanel>

          <CustomScrollbar targetRef={railRef} showOnHoverOnly />
        </aside>

        {/* ---- Center: NFT grid ---- */}
        <div className={styles.main}>
          {loading ? (
            viewMode === 'list' ? (
              <div className={styles.listView}>
                <div className={styles.listHeader}>
                  <span>Item</span>
                  <span className={styles.colToken}>Token</span>
                  <span className={styles.colTraits}>Traits</span>
                  <span className={styles.colPrice}>Buy Now</span>
                  <span className={styles.colAction} />
                </div>
                {Array.from({ length: 12 }).map((_, i) => (
                  <div key={i} className={styles.rowSkeleton} aria-hidden>
                    <div className={styles.rowSkeletonThumb} />
                    <div className={styles.rowSkeletonBar} />
                  </div>
                ))}
              </div>
            ) : (
              <div className={gridClass}>
                {Array.from({ length: 12 }).map((_, i) => (
                  <div key={i} className={styles.skeleton} aria-hidden />
                ))}
              </div>
            )
          ) : showUnavailable ? (
            <div className={styles.empty}>
              <p className={styles.emptyTitle}>No items to display</p>
              <p className={styles.emptyBody}>
                Live NFT data is unavailable right now. Check that the OpenSea API key is
                configured, or view the collection directly on OpenSea.
              </p>
              {activeEntry && (
                <a
                  className={styles.emptyLink}
                  href={`https://opensea.io/collection/${activeEntry.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Open on OpenSea
                  <ArrowUpRight size={14} />
                </a>
              )}
            </div>
          ) : filtered.length === 0 ? (
            <div className={styles.empty}>
              <p className={styles.emptyTitle}>
                {items.length === 0
                  ? availability === 'listed'
                    ? 'No items currently listed'
                    : 'No unlisted items found'
                  : 'No items match your filters'}
              </p>
              <p className={styles.emptyBody}>
                {items.length === 0
                  ? availability === 'listed'
                    ? 'Nothing in this collection is listed for sale right now. Try the Unlisted filter or browse on OpenSea.'
                    : 'Every token in this collection appears to be listed. Switch back to the Listed filter to see them.'
                  : 'Try clearing or adjusting the selected trait filters.'}
              </p>
              {items.length === 0 && activeEntry && (
                <a
                  className={styles.emptyLink}
                  href={`https://opensea.io/collection/${activeEntry.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Open on OpenSea
                  <ArrowUpRight size={14} />
                </a>
              )}
            </div>
          ) : viewMode === 'list' ? (
            <>
              <div className={styles.listView}>
                <div className={styles.listHeader}>
                  <span>Item</span>
                  <span className={styles.colToken}>Token</span>
                  <span className={styles.colTraits}>Traits</span>
                  <span className={styles.colPrice}>Buy Now</span>
                  <span className={styles.colAction} />
                </div>
                {filtered.map((nft) => {
                  const priceUsd = formatUsd(nft.priceEth, ethUsd);
                  const price = priceUsd ?? formatEth(nft.priceEth) ?? '—';
                  return (
                    <div
                      key={`${nft.contract}-${nft.identifier}`}
                      className={styles.row}
                      role="button"
                      tabIndex={0}
                      onClick={() => openModal(nft.identifier)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          openModal(nft.identifier);
                        }
                      }}
                    >
                      <div className={styles.rowItem}>
                        <div className={styles.rowThumb}>
                          {nft.image ? (
                            <FadeInImage
                              className={styles.rowThumbImg}
                              src={nft.image}
                              alt={nft.name}
                              loading="lazy"
                            />
                          ) : (
                            <div className={styles.rowThumbFallback} aria-hidden />
                          )}
                        </div>
                        <span className={styles.rowName}>{nft.name}</span>
                      </div>
                      <span
                        className={`${styles.colToken} ${styles.rowMuted}`}
                        title={`#${nft.identifier}`}
                      >
                        #{shortId(nft.identifier)}
                      </span>
                      <span className={`${styles.colTraits} ${styles.rowMuted}`}>
                        {nft.traits.length}
                      </span>
                      <span className={`${styles.colPrice} ${styles.rowPrice}`}>{price}</span>
                      <span className={styles.colAction}>
                        <a
                          className={styles.buyLink}
                          href={`https://opensea.io/assets/${nft.chain}/${nft.contract}/${nft.identifier}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                        >
                          Buy
                          <ArrowUpRight size={13} />
                        </a>
                      </span>
                    </div>
                  );
                })}
              </div>
              {next && (
                <div ref={sentinelRef} className={styles.loadMoreRow}>
                  <button
                    type="button"
                    className={styles.loadMore}
                    onClick={loadMore}
                    disabled={loadingMore}
                  >
                    {loadingMore ? 'Loading…' : 'Load more'}
                  </button>
                </div>
              )}
            </>
          ) : (
            <>
              <div className={gridClass}>
                {filtered.map((nft, i) => {
                  const priceUsd = formatUsd(nft.priceEth, ethUsd);
                  // One-at-a-time reveal within the current batch; capped so a
                  // large page never leaves off-screen cards waiting too long.
                  const within = Math.max(0, i - batchBaseRef.current);
                  const delayMs = Math.min(within, 40) * 45;
                  return (
                    <button
                      key={`${nft.contract}-${nft.identifier}`}
                      type="button"
                      className={styles.card}
                      style={{ animationDelay: `${delayMs}ms` }}
                      onClick={() => openModal(nft.identifier)}
                    >
                      <div className={styles.cardImageWrap}>
                        {nft.image ? (
                          <FadeInImage
                            className={styles.cardImage}
                            src={nft.image}
                            alt={nft.name}
                            loading="lazy"
                          />
                        ) : (
                          <div className={styles.cardImageFallback} aria-hidden />
                        )}
                      </div>
                      <div className={styles.cardBody}>
                        <span className={styles.cardName}>{nft.name}</span>
                        {priceUsd && <span className={styles.cardPrice}>{priceUsd}</span>}
                      </div>
                    </button>
                  );
                })}
              </div>
              {next && (
                <div ref={sentinelRef} className={styles.loadMoreRow}>
                  <button
                    type="button"
                    className={styles.loadMore}
                    onClick={loadMore}
                    disabled={loadingMore}
                  >
                    {loadingMore ? 'Loading…' : 'Load more'}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* ---- Mobile-only: filters drawer ---- */}
      {isMobile && filtersOpen && (
        <div className={styles.drawer} role="dialog" aria-modal="true" aria-label="Filters">
          <div className={styles.drawerBackdrop} onClick={() => setFiltersOpen(false)} />
          <div className={styles.drawerPanel}>
            <div className={styles.drawerHead}>
              <button
                type="button"
                className={styles.drawerClose}
                onClick={() => setFiltersOpen(false)}
                aria-label="Close filters"
              >
                <X size={18} />
              </button>
            </div>
            <div className={styles.drawerBody}>{renderFilters()}</div>
          </div>
        </div>
      )}

      {modalNft && (
        <ItemModal
          nft={modalNft}
          slug={activeSlug}
          ethUsd={ethUsd}
          hasPrev={modalIndex > 0}
          hasNext={modalIndex < filtered.length - 1 || Boolean(next)}
          onPrev={goPrev}
          onNext={goNext}
          onClose={closeModal}
        />
      )}
    </>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className={styles.infoRow}>
      <span className={styles.infoLabel}>{label}</span>
      <span className={styles.infoValue}>{value}</span>
    </div>
  );
}
