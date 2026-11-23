'use client';

import {ArrowUpRight} from 'lucide-react';
import {demoRecentActivity} from './demo-market';
import {formatMoney,type TokenMarketIdentity} from './market-data';
import styles from './ProductTradingCard.module.css';

/** Compact selected-edition preview. Uses the full market panel's exact sample observations. */
export default function ProductTradingCard({productId,variantId,variantName,previewPriceCents,identity,marketAnchor='product-trading'}:{productId:string;variantId:string;variantName:string;previewPriceCents?:number|null;identity?:TokenMarketIdentity;marketAnchor?:string}) {
  const sales=demoRecentActivity({productId,variantId,identity},previewPriceCents,Date.now());
  const prices=sales.map(sale=>Number(sale.price.amount));
  const last=sales[sales.length-1],first=prices[0],latest=prices[prices.length-1];
  const change=(latest-first)/first*100;
  const low=Math.min(...prices),spread=Math.max(...prices)-low||1;
  const points=prices.map((price,index)=>`${index/(prices.length-1)*400},${82-(price-low)/spread*64}`).join(' ');
  return <a href={`#${marketAnchor}`} className={styles.card} aria-label={`View ${variantName} trading activity`}>
    <div className={styles.header}><span>Market</span><small>Sample data</small><ArrowUpRight size={15} aria-hidden/></div>
    <div className={styles.price}><strong>{formatMoney(last.price)}</strong><span data-positive={change>=0}>{change>=0?'+':''}{change.toFixed(1)}% <small>7d</small></span></div>
    <svg viewBox="0 0 400 100" preserveAspectRatio="none" role="img" aria-label={`${variantName}: sample seven-day price history`}><polyline points={points} fill="none" stroke="currentColor" strokeWidth="1.5" vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round"/></svg>
    <div className={styles.footer}><span>{variantName}</span><span>View trading</span></div>
  </a>;
}
