'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import type { WilderCollection } from '@/lib/wilderCollections';
import type { MarketNft } from '@/lib/opensea';
import type { MarketCollection } from '@/app/api/market/collections/route';
import styles from './market.module.css';

type Props = { collections: WilderCollection[] };

function formatFloor(c: MarketCollection | undefined): string | null {
  if (!c || c.floorPrice == null) return null;
  const symbol = c.floorSymbol || 'ETH';
  return `${c.floorPrice} ${symbol}`;
}

export default function MarketBrowser({ collections }: Props) {
  const [activeSlug, setActiveSlug] = useState(collections[0]?.slug ?? '');
  const [meta, setMeta] = useState<Record<string, MarketCollection>>({});
  const [items, setItems] = useState<MarketNft[]>([]);
  const [next, setNext] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(false);

  const active = collections.find((c) => c.slug === activeSlug);

  // Enrich the sidebar with live floor prices / images once on mount.
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
    return () => {
      alive = false;
    };
  }, []);

  // Load the first page whenever the active collection changes.
  useEffect(() => {
    if (!activeSlug) return;
    let alive = true;
    setLoading(true);
    setError(false);
    setItems([]);
    setNext(null);
    fetch(`/api/market/nfts?slug=${encodeURIComponent(activeSlug)}`)
      .then((r) => r.json())
      .then((d: { items?: MarketNft[]; next?: string | null }) => {
        if (!alive) return;
        if (!d.items || d.items.length === 0) setError(true);
        setItems(d.items ?? []);
        setNext(d.next ?? null);
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
  }, [activeSlug]);

  const loadMore = useCallback(() => {
    if (!next || loadingMore) return;
    setLoadingMore(true);
    fetch(`/api/market/nfts?slug=${encodeURIComponent(activeSlug)}&next=${encodeURIComponent(next)}`)
      .then((r) => r.json())
      .then((d: { items?: MarketNft[]; next?: string | null }) => {
        setItems((prev) => [...prev, ...(d.items ?? [])]);
        setNext(d.next ?? null);
      })
      .catch(() => {})
      .finally(() => setLoadingMore(false));
  }, [next, loadingMore, activeSlug]);

  // Auto-load the next page when the sentinel scrolls into view.
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

  return (
    <div className={styles.layout}>
      <div className={styles.main}>
        {loading ? (
          <div className={styles.grid}>
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className={styles.skeleton} aria-hidden />
            ))}
          </div>
        ) : error ? (
          <div className={styles.empty}>
            <p className={styles.emptyTitle}>No items to display</p>
            <p className={styles.emptyBody}>
              Live NFT data is unavailable right now. Check that the OpenSea API key is configured,
              or view the collection directly on OpenSea.
            </p>
            {active && (
              <a
                className={styles.emptyLink}
                href={`https://opensea.io/collection/${active.slug}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                Open on OpenSea
                <ArrowUpRight size={14} />
              </a>
            )}
          </div>
        ) : (
          <>
            <div className={styles.grid}>
              {items.map((nft) => (
                <Link
                  key={`${nft.contract}-${nft.identifier}`}
                  href={`/market/${active?.slug ?? activeSlug}/${nft.identifier}`}
                  className={styles.card}
                >
                  <div className={styles.cardImageWrap}>
                    {nft.image ? (
                      <img
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
                  </div>
                </Link>
              ))}
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

      <aside className={styles.sidebar}>
        <p className={styles.sidebarHeading}>Industries</p>
        <div className={styles.collectionList}>
          {collections.map((c) => {
            const m = meta[c.slug];
            const floor = formatFloor(m);
            const isActive = c.slug === activeSlug;
            return (
              <button
                key={c.slug}
                type="button"
                className={`${styles.collectionItem} ${isActive ? styles.collectionItemActive : ''}`}
                onClick={() => setActiveSlug(c.slug)}
              >
                <span className={styles.collectionLabel}>{c.industry}</span>
                {floor && <span className={styles.collectionFloor}>{floor}</span>}
              </button>
            );
          })}
        </div>
        {active && <p className={styles.sidebarBlurb}>{active.blurb}</p>}
        {active && (
          <a
            className={styles.sidebarOpensea}
            href={`https://opensea.io/collection/${active.slug}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            View collection on OpenSea
            <ArrowUpRight size={12} />
          </a>
        )}
      </aside>
    </div>
  );
}
