'use client';

import { getProductEditionProposal, getProposedEdition } from './limited-editions';
import styles from './EditionSummary.module.css';

export default function EditionSummary({productId,variantId}:{productId:string;variantId?:string}) {
  const product=getProductEditionProposal(productId);
  const edition=variantId?getProposedEdition(productId,variantId):undefined;
  if(!product)return null;
  return <details className={styles.edition} aria-label="Limited edition details">
    <summary>Edition details <span aria-hidden>+</span></summary>
    <div className={styles.summary}>
      <span className={styles.tier}><i style={{background:edition?.tierColor}} aria-hidden/>{edition?.tierLabel??'Select a finish'}</span>
      <span className={styles.quantity}>{edition?.proposedSupplyCap.toLocaleString('en-US')??'—'}</span>
    </div>
      <p>One item in your selected finish. {product.proposedSupplyCap.toLocaleString('en-US')} units across all {product.variants.length} editions.</p>
      <div className={styles.tableWrap}><table><caption>Each edition&rsquo;s supply is capped on chain.</caption><thead><tr><th>Finish</th><th>Rarity</th><th>Units</th></tr></thead><tbody>{product.variants.map(row=><tr key={row.variantId} data-selected={row.variantId===variantId}><td>{row.variantName}</td><td style={{color:row.tierColor}}>{row.tierLabel}</td><td>{row.proposedSupplyCap.toLocaleString('en-US')}</td></tr>)}</tbody></table></div>
      <p>These quantities include all sale and reserved units. Existing collections keep their original editions.</p>
  </details>;
}
