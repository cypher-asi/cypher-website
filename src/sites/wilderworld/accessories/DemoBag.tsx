'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowUpRight, Check, Minus, Plus, X } from 'lucide-react';
import { resolveBagProduct, useDemoBag } from './useDemoBag';
import { formatUsd } from './pricing';
import BagCheckout from './BagCheckout';
import { completionCopy } from './completion-copy';
import type { CartLine, StoreOrderStatus } from '@/features/store/types';
import styles from './DemoBag.module.css';

export default function DemoBag({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { items, count, subtotalCents, changeQuantity, removeItem, clearBag } = useDemoBag();
  // The bag's lines for the charge: the colorway is the variant. Prices are resolved
  // server-side, so nothing price-bearing is read from here.
  const lines: CartLine[] = items.map((item) => ({
    productId: item.productId,
    variantId: item.colorwayId ?? '',
    quantity: item.quantity,
  }));
  const [step, setStep] = useState<'bag' | 'review' | 'complete'>('bag');
  const [completedCount, setCompletedCount] = useState(0);
  const [completedDelivery, setCompletedDelivery] = useState<StoreOrderStatus>('undelivered');
  const panel = useRef<HTMLElement>(null);
  const close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    if (!open) return;
    setStep('bag');
    const previousFocus = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    panel.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close.current();
      if (event.key !== 'Tab') return;
      const focusable = panel.current?.querySelectorAll<HTMLElement>('button:not(:disabled), a[href], [tabindex="0"]');
      if (!focusable?.length) return;
      const first = focusable[0], last = focusable[focusable.length - 1];
      if (event.shiftKey && (document.activeElement === first || document.activeElement === panel.current)) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && (document.activeElement === last || document.activeElement === panel.current)) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', onKey);
    return () => { document.body.style.overflow = overflow; document.removeEventListener('keydown', onKey); previousFocus?.focus(); };
  }, [open]);
  if (!open) return null;
  const title = step === 'complete' ? 'All done' : step === 'review' ? 'Review your selection' : 'Your bag';
  const completion = completionCopy(completedDelivery, completedCount);
  return <div className={styles.overlay} onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
    <aside ref={panel} tabIndex={-1} className={styles.panel} role="dialog" aria-modal="true" aria-labelledby="demo-bag-title">
      <header className={styles.header}><h2 id="demo-bag-title">{title}</h2><button type="button" onClick={onClose} aria-label="Close bag"><X size={22} /></button></header>
      {step === 'complete' ? <div className={styles.empty} role="status"><Check size={36} /><h3>{completion.heading}</h3><p>{completion.body}</p><button className="sci-btn sci-btn-primary" onClick={onClose}>Continue exploring <ArrowUpRight size={16} /></button></div>
        : !items.length ? <div className={styles.empty}><h3>Your next discovery is waiting.</h3><p>Choose an item and a color to start your collection.</p><button className="sci-btn sci-btn-primary" onClick={onClose}>Continue exploring <ArrowUpRight size={16} /></button></div>
        : <>
          <div className={styles.items}>{items.map(item => {
            const product = resolveBagProduct(item)!;
            return <article className={styles.item} key={item.key} aria-label={`${product.name} — ${product.detail}`}>
              <Link href={product.href} onClick={onClose} className={styles.image}>{product.image?<Image src={product.image} alt={product.name} fill sizes="112px" unoptimized />:<span style={{display:'grid',placeItems:'center',height:'100%',padding:12,fontSize:11,color:'#92969c'}}>Image coming soon</span>}</Link>
              <div className={styles.itemInfo}><Link href={product.href} onClick={onClose} className={styles.name}>{product.name}</Link><p>{product.detail}</p><p className={styles.sku}>{product.sku}</p><p>{product.price} each</p><p className={styles.lineTotal}>Line total <strong aria-label={`${product.name} line total`}>{formatUsd(product.priceCents * item.quantity)}</strong></p>
                {step === 'bag' ? <div className={styles.controls}><div className={styles.quantity}><button aria-label={`Decrease ${product.name}`} onClick={() => changeQuantity(item.key, -1)}><Minus size={14} /></button><span aria-label={`Quantity for ${product.name}`}>{item.quantity}</span><button aria-label={`Increase ${product.name}`} onClick={() => changeQuantity(item.key, 1)} disabled={item.quantity >= 99}><Plus size={14} /></button></div><button className={styles.remove} onClick={() => removeItem(item.key)}>Remove</button></div> : <p>Quantity {item.quantity}</p>}
                {product.vehicle && <Link className={styles.offer} href={product.href} onClick={onClose}>View vehicle offer <ArrowUpRight size={13} /></Link>}
              </div>
            </article>;
          })}</div>
          <footer className={styles.footer}><div className={styles.summary}><span>{count} {count === 1 ? 'item' : 'items'}</span><span>Subtotal (USD) <strong aria-label="Subtotal in USD">{formatUsd(subtotalCents)}</strong></span></div>
            {step === 'bag' ? <button className="sci-btn sci-btn-primary" onClick={() => setStep('review')}>Review selection <ArrowUpRight size={16} /></button> : <><BagCheckout lines={lines} totalCents={subtotalCents} onPaid={(delivery) => { setCompletedCount(count); setCompletedDelivery(delivery); clearBag(); setStep('complete'); }}/><button className={styles.back} onClick={() => setStep('bag')}>Back to bag</button></>}
          </footer>
        </>}
    </aside>
  </div>;
}
