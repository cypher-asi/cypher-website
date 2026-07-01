'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, ArrowUpRight } from 'lucide-react';
import type { MarketItem } from '@/app/api/market/item/route';
import { getCollectionBySlug } from '@/lib/wilderCollections';
import styles from './item.module.css';

export default function MarketItemPage() {
  const params = useParams<{ slug: string; tokenId: string }>();
  const slug = params?.slug ?? '';
  const tokenId = params?.tokenId ?? '';

  const [item, setItem] = useState<MarketItem | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');

  const collection = getCollectionBySlug(slug);

  useEffect(() => {
    if (!slug || !tokenId) return;
    let alive = true;
    setStatus('loading');
    fetch(`/api/market/item?slug=${encodeURIComponent(slug)}&identifier=${encodeURIComponent(tokenId)}`)
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
  }, [slug, tokenId]);

  return (
    <div className={styles.page}>
      <Link href="/market" className={styles.back}>
        <ArrowLeft size={14} />
        Back to Market
      </Link>

      {status === 'loading' && (
        <div className={styles.layout}>
          <div className={`${styles.frame} ${styles.frameSkeleton}`} aria-hidden />
          <div className={styles.details}>
            <div className={styles.textSkeleton} style={{ width: '60%' }} aria-hidden />
            <div className={styles.textSkeleton} style={{ width: '40%' }} aria-hidden />
          </div>
        </div>
      )}

      {status === 'error' && (
        <div className={styles.errorBox}>
          <p className={styles.errorTitle}>Item unavailable</p>
          <p className={styles.errorBody}>
            We couldn&apos;t load this item&apos;s onchain metadata right now.
          </p>
          {collection && (
            <a
              className={styles.openseaLink}
              href={`https://opensea.io/collection/${collection.slug}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              View collection on OpenSea
              <ArrowUpRight size={14} />
            </a>
          )}
        </div>
      )}

      {status === 'ready' && item && (
        <div className={styles.layout}>
          <div className={styles.frame}>
            {item.image ? (
              <img className={styles.image} src={item.image} alt={item.name} />
            ) : (
              <div className={styles.imageFallback} aria-hidden />
            )}
          </div>

          <div className={styles.details}>
            <p className={styles.collectionName}>{item.collectionName}</p>
            <h1 className={styles.title}>{item.name}</h1>

            {item.description && <p className={styles.description}>{item.description}</p>}

            <a
              className={styles.openseaLink}
              href={item.openseaUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              View on OpenSea
              <ArrowUpRight size={14} />
            </a>

            {item.traits.length > 0 && (
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
            )}
          </div>
        </div>
      )}
    </div>
  );
}
