'use client';

import { useEffect, useRef, useState, type ComponentType } from 'react';
import type { ProductMarketPanelProps } from './ProductMarketPanel';
import type { ProductReviewsProps } from './ProductReviews';
import type { LocalListingPanelProps } from './LocalListingPanel';
import { productReviewsAnchor } from './preview-reviews';
import styles from './DeferredProductSections.module.css';

const loadMarket = () => import('./ProductMarketPanel');
const loadReviews = () => import('./ProductReviews');
const loadListings = () => import('./LocalListingPanel');

/** Keep the hero/purchase area independent of below-fold code and API requests. */
export function DeferredSection<P extends object>({load, componentProps, label, anchor, height = 360}: {
  load: () => Promise<{default: ComponentType<P>}>; componentProps: P; label: string; anchor?: string; height?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [near, setNear] = useState(false);
  const [Component, setComponent] = useState<ComponentType<P> | null>(null);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!ref.current) return;
    const revealAnchor = () => { if (anchor && location.hash === '#' + anchor) setNear(true); };
    const revealLink = (event: MouseEvent) => {
      const link = event.target instanceof Element ? event.target.closest('a') : null;
      if (anchor && link?.hash === '#' + anchor) setNear(true);
    };
    const observer = typeof IntersectionObserver === 'undefined' ? null : new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) { setNear(true); observer?.disconnect(); }
    }, {rootMargin: '700px 0px'});
    if (observer) observer.observe(ref.current); else setNear(true);
    revealAnchor();
    window.addEventListener('hashchange', revealAnchor);
    document.addEventListener('click', revealLink);
    return () => { observer?.disconnect(); window.removeEventListener('hashchange', revealAnchor); document.removeEventListener('click', revealLink); };
  }, [anchor]);
  useEffect(() => {
    if (!near) return;
    let active = true;
    setError(false);
    load().then(module => { if (active) setComponent(() => module.default); }).catch(() => { if (active) setError(true); });
    return () => { active = false; };
  }, [near, load, attempt]);
  return <div ref={ref} id={Component ? undefined : anchor}>
    {Component ? <Component {...componentProps}/> : <section className={styles.placeholder} style={{minHeight: height}} aria-label={label} aria-busy={near && !error}>
      <h2>{label}</h2>
      {error ? <><p>This section couldn't load.</p><button type="button" onClick={() => setAttempt(value => value + 1)}>Try again</button></>
        : <div className={styles.skeleton} aria-hidden="true"><span/><span/><span/></div>}
    </section>}
  </div>;
}

export function ProductMarketPanel(props: ProductMarketPanelProps) {
  return <div id="product-trading" style={{scrollMarginTop:180}}><DeferredSection load={loadMarket} componentProps={props} label="Market" height={480}/></div>;
}
export function ProductReviews(props: ProductReviewsProps) {
  return <DeferredSection load={loadReviews} componentProps={props} label="Ratings & reviews" anchor={productReviewsAnchor(props.productId)} height={480}/>;
}
export function LocalListingPanel(props: LocalListingPanelProps) {
  return <DeferredSection load={loadListings} componentProps={props} label="Listings" height={220}/>;
}
