'use client';

import { useEffect, useState } from 'react';
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

  useEffect(() => setMounted(true), []);

  // Fetch full detail whenever the active NFT changes. Resolve directly by the
  // token's own contract + chain (the root-cause fix for "Item unavailable").
  useEffect(() => {
    let alive = true;
    setStatus('loading');
    setItem(null);
    setVideoFailed(false);
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

  if (!mounted) return null;

  const priceEth = item?.priceEth ?? nft.priceEth ?? null;
  const priceUsd = formatUsd(priceEth, ethUsd);
  const image = item?.image ?? nft.image;
  const name = item?.name ?? nft.name;
  const animationUrl = item?.animationUrl ?? null;
  const showVideo = Boolean(animationUrl) && !videoFailed;

  return createPortal(
    <div className={styles.overlay} onClick={onClose} role="dialog" aria-modal="true">
      <button className={styles.close} onClick={onClose} aria-label="Close">
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
            <video
              key={animationUrl ?? undefined}
              className={styles.video}
              src={animationUrl ?? undefined}
              poster={image ?? undefined}
              autoPlay
              loop
              muted
              playsInline
              controls
              onError={() => setVideoFailed(true)}
            />
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
              <p className={styles.collectionName}>
                {item?.collectionName ?? nft.collectionSlug}
              </p>
              <h2 className={styles.title}>{name}</h2>

              {(priceUsd || priceEth != null) && (
                <div className={styles.priceRow}>
                  <span className={styles.priceLabel}>Price</span>
                  <span className={styles.priceValue}>
                    {priceUsd ?? formatEth(priceEth) ?? '—'}
                  </span>
                </div>
              )}

              {item?.description && <p className={styles.description}>{item.description}</p>}

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

              {status === 'loading' ? (
                <div className={styles.traitsSection}>
                  <div className={styles.textSkeleton} style={{ width: '40%' }} aria-hidden />
                  <div className={styles.textSkeleton} style={{ width: '70%' }} aria-hidden />
                </div>
              ) : (
                item &&
                item.traits.length > 0 && (
                  <div className={styles.traitsSection}>
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
                )
              )}
            </>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
