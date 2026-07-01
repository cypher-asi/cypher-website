'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowUpRight, ChevronLeft, ChevronRight, X } from 'lucide-react';
import type { MarketItem } from '@/app/api/market/item/route';
import type { MarketNft } from '@/lib/opensea';
import { formatUsd, formatEth } from '@/lib/price';
import { FadeInImage } from '@/components/FadeInImage';
import styles from './ItemModal.module.css';

type Props = {
  nft: MarketNft;
  slug: string;
  ethUsd: number | null;
  hasPrev: boolean;
  hasNext: boolean;
  onPrev: () => void;
  onNext: () => void;
  onClose: () => void;
};

export default function ItemModal({
  nft,
  slug,
  ethUsd,
  hasPrev,
  hasNext,
  onPrev,
  onNext,
  onClose,
}: Props) {
  const [item, setItem] = useState<MarketItem | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [mounted, setMounted] = useState(false);
  const [videoFailed, setVideoFailed] = useState(false);
  const [videoReady, setVideoReady] = useState(false);
  const [loaderVisible, setLoaderVisible] = useState(false);
  const loaderStartRef = useRef(0);

  useEffect(() => setMounted(true), []);

  // Fetch full detail whenever the active NFT changes. Resolve directly by the
  // token's own contract + chain (the root-cause fix for "Item unavailable").
  useEffect(() => {
    let alive = true;
    setStatus('loading');
    setItem(null);
    setVideoFailed(false);
    setVideoReady(false);
    const params = new URLSearchParams({ slug, identifier: nft.identifier });
    if (nft.contract) params.set('contract', nft.contract);
    if (nft.chain) params.set('chain', nft.chain);
    fetch(`/api/market/item?${params.toString()}`)
      .then((r) => r.json())
      .then((d: { item?: MarketItem | null }) => {
        if (!alive) return;
        if (d.item) {
          setItem(d.item);
          setStatus('ready');
        } else {
          setStatus('error');
        }
      })
      .catch(() => {
        if (alive) setStatus('error');
      });
    return () => {
      alive = false;
    };
  }, [slug, nft.identifier, nft.contract, nft.chain]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft' && hasPrev) onPrev();
      if (e.key === 'ArrowRight' && hasNext) onNext();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, onPrev, onNext, hasPrev, hasNext]);

  // Lock body scroll while the modal is open.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const animationUrl = item?.animationUrl ?? null;
  const showVideo = Boolean(animationUrl) && !videoFailed;

  // Show the loading bar as soon as a video is available and keep the start
  // time so we can enforce a minimum visible duration.
  useEffect(() => {
    if (showVideo) {
      loaderStartRef.current = Date.now();
      setLoaderVisible(true);
    } else {
      setLoaderVisible(false);
    }
  }, [showVideo, animationUrl]);

  // Once the video can play, hide the bar — but not before it has been on
  // screen long enough to actually be seen (fast/cached loads otherwise flash).
  useEffect(() => {
    if (!showVideo || !videoReady) return;
    const MIN_VISIBLE_MS = 650;
    const remaining = Math.max(0, MIN_VISIBLE_MS - (Date.now() - loaderStartRef.current));
    const t = setTimeout(() => setLoaderVisible(false), remaining);
    return () => clearTimeout(t);
  }, [showVideo, videoReady]);

  if (!mounted) return null;

  const priceEth = item?.priceEth ?? nft.priceEth ?? null;
  const priceUsd = formatUsd(priceEth, ethUsd);
  const image = item?.image ?? nft.image;
  const name = item?.name ?? nft.name;

  return createPortal(
    <div className={styles.overlay} onClick={onClose} role="dialog" aria-modal="true">
      <button
        className={styles.close}
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        aria-label="Close"
      >
        <X size={22} />
      </button>

      {hasPrev && (
        <button
          className={`${styles.nav} ${styles.navPrev}`}
          onClick={(e) => {
            e.stopPropagation();
            onPrev();
          }}
          aria-label="Previous item"
        >
          <ChevronLeft size={28} />
        </button>
      )}
      {hasNext && (
        <button
          className={`${styles.nav} ${styles.navNext}`}
          onClick={(e) => {
            e.stopPropagation();
            onNext();
          }}
          aria-label="Next item"
        >
          <ChevronRight size={28} />
        </button>
      )}

      <div className={styles.dialog} onClick={(e) => e.stopPropagation()}>
        <div className={styles.frame}>
          {showVideo ? (
            <>
              {image ? (
                <FadeInImage className={styles.image} src={image} alt={name} />
              ) : (
                <div className={styles.imageFallback} aria-hidden />
              )}
              <video
                key={animationUrl ?? undefined}
                className={`${styles.video} ${videoReady ? styles.videoReady : ''}`}
                src={animationUrl ?? undefined}
                autoPlay
                loop
                muted
                playsInline
                onCanPlay={() => setVideoReady(true)}
                onPlaying={() => setVideoReady(true)}
                onError={() => setVideoFailed(true)}
              />
              {loaderVisible && (
                <div className={styles.mediaProgress} aria-hidden>
                  <div className={styles.mediaProgressFill} />
                </div>
              )}
            </>
          ) : image ? (
            <FadeInImage className={styles.image} src={image} alt={name} />
          ) : (
            <div className={styles.imageFallback} aria-hidden />
          )}
        </div>

        <div className={styles.details}>
          {status === 'error' ? (
            <>
              <p className={styles.collectionName}>{nft.collectionSlug}</p>
              <h2 className={styles.title}>{name}</h2>
              <p className={styles.errorBody}>
                We couldn&apos;t load this item&apos;s onchain metadata right now.
              </p>
              <a
                className={styles.openseaLink}
                href={`https://opensea.io/assets/${nft.chain}/${nft.contract}/${nft.identifier}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                View on OpenSea
                <ArrowUpRight size={14} />
              </a>
            </>
          ) : (
            <>
              {/* Header block: rendered immediately from grid data so it
                  never moves while onchain detail loads in below. */}
              <p className={styles.collectionName}>
                {item?.collectionName ?? nft.collectionSlug}
              </p>
              <h2 className={styles.title}>{name}</h2>

              <div className={styles.priceRow}>
                <span className={styles.priceLabel}>Price</span>
                <span className={styles.priceValue}>
                  {priceUsd ?? formatEth(priceEth) ?? '—'}
                </span>
              </div>

              <a
                className={styles.openseaLink}
                href={
                  item?.openseaUrl ??
                  `https://opensea.io/assets/${nft.chain}/${nft.contract}/${nft.identifier}`
                }
                target="_blank"
                rel="noopener noreferrer"
              >
                View on OpenSea
                <ArrowUpRight size={14} />
              </a>

              {/* Description: reserves space with skeleton lines, then swaps
                  to the real text with a fade so nothing jumps. */}
              {status === 'loading' ? (
                <div className={styles.descriptionSkeleton} aria-hidden>
                  <div className={styles.textSkeleton} style={{ width: '92%' }} />
                  <div className={styles.textSkeleton} style={{ width: '100%' }} />
                  <div className={styles.textSkeleton} style={{ width: '76%' }} />
                </div>
              ) : item?.description ? (
                <p className={`${styles.description} ${styles.fadeIn}`}>{item.description}</p>
              ) : null}

              {/* Traits: skeleton chip grid reserves space, then fades in. */}
              {status === 'loading' ? (
                <div className={styles.traitsSection}>
                  <div
                    className={styles.textSkeleton}
                    style={{ width: '30%', marginBottom: '0.6rem' }}
                    aria-hidden
                  />
                  <div className={styles.traitsGrid}>
                    {Array.from({ length: 6 }).map((_, i) => (
                      <div key={i} className={styles.traitSkeleton} aria-hidden />
                    ))}
                  </div>
                </div>
              ) : item && item.traits.length > 0 ? (
                <div className={`${styles.traitsSection} ${styles.fadeIn}`}>
                  <p className={styles.traitsHeading}>Traits</p>
                  <div className={styles.traitsGrid}>
                    {item.traits.map((t) => (
                      <div key={`${t.type}-${t.value}`} className={styles.trait}>
                        <span className={styles.traitType}>{t.type}</span>
                        <span className={styles.traitValue}>{t.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
