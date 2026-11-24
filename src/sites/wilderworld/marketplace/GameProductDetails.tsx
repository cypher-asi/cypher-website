'use client';

import { ChevronDown, Check } from 'lucide-react';
import { findMarketProduct, type Variant } from './catalog';
import { getProductGameDetails } from './product-game-details';
import { websiteProductDescription } from './website-product-copy';
import { variantPresentation } from './variant-presentation';
import { getProposedEdition } from './limited-editions';
import styles from './GameProductDetails.module.css';

export function ProductMaterialPicker({productId,options,selectedId,onSelect,label='Material',regionLabel='Finishes'}:{productId?:string;options:Variant[];selectedId?:string;onSelect:(id:string)=>void;label?:string;regionLabel?:string}) {
  if(!options.length)return null;
  const selected=options.find(option=>option.id===selectedId);
  const edition=productId&&selectedId?getProposedEdition(productId,selectedId):undefined;
  return <section className={styles.options} aria-label={regionLabel}>
    <div className={styles.optionLabel}><p>{label} <strong>{selected?.name??'Choose a finish'}</strong></p><dl className={styles.editionStock} aria-label="Edition supply"><div><dt>Quantity</dt><dd>{edition?edition.proposedSupplyCap.toLocaleString('en-US'):'—'}</dd></div></dl></div>
    <div className={styles.swatches}>{options.map(option=>{
      const details=variantPresentation(productId,option);
      return <button type="button" key={option.id} aria-label={option.name} aria-pressed={selectedId===option.id} title={details.tooltip} onClick={()=>onSelect(option.id)}>
        <span style={{background:option.swatch}} aria-hidden />{selectedId===option.id&&<Check size={13} strokeWidth={2.5} className={styles.selectedCheck} aria-hidden/>}
      </button>;
    })}</div>
    {selected&&!selected.image&&<p className={styles.optionNote}>Image coming soon.</p>}
  </section>;
}

export default function GameProductDetails({productId,variantId,specifications=[],story}:{productId:string;variantId?:string;specifications?:{label:string;value:string}[];story?:string}) {
  const details=getProductGameDetails(productId);
  const product=findMarketProduct(productId);
  if(!product)return null;
  const sourceIds=(details?.traceability.sourceIds??product.sourceIds).filter(id=>id!==productId);
  const clothing=product?.department==='clothing';
  const includedContents=(details?.includedContents??[clothing?'One digital wearable in this individual style.':'One digital item in the selected style.'])
    .filter(content=>content!=='Final pair or set contents require release approval.');
  const supportedFits=details?.compatibility.supportedFits??[];
  const unsupportedFits=details?.compatibility.unsupportedFits??[];
  const displayStory=story?.trim()||(product?websiteProductDescription(product):'');
  const visibleSpecifications=specifications.filter(fact=>fact.value?.trim());
  return <section className={styles.details} aria-label="Wilder World item details">
    <details className={styles.disclosure}><summary>Story <ChevronDown size={16} aria-hidden/></summary><div className={styles.disclosureContent}><p>{displayStory}</p></div></details>
    <details className={styles.disclosure}><summary>What’s included <ChevronDown size={16} aria-hidden/></summary><div className={styles.disclosureContent}>
      <ul>{includedContents.map(content=><li key={content}>{content.replace(' is proposed','').replace('A preview of this individual totem design.','One digital totem in the selected design.').replace('outside the proposed rim product','not included')}</li>)}</ul><p>One item in the selected finish. Other finishes are separate editions.</p>
      <dl className={styles.facts}>{visibleSpecifications.map(fact=><div key={fact.label}><dt>{fact.label}</dt><dd>{fact.value}</dd></div>)}{supportedFits.length>0&&<div><dt>Recorded fit</dt><dd>{supportedFits.join(', ')}</dd></div>}<div><dt>Item identifier</dt><dd>{productId}</dd></div>{variantId&&<div><dt>Variant</dt><dd>{variantId}</dd></div>}{sourceIds.length>0&&<div><dt>Source SKU</dt><dd>{sourceIds.join(' · ')}</dd></div>}</dl>
      {unsupportedFits.length>0&&<p>Not supported: {unsupportedFits.join(', ')}.</p>}
    </div></details>
    <details className={styles.disclosure}><summary>Availability & delivery <ChevronDown size={16} aria-hidden/></summary><div className={styles.disclosureContent}>{clothing?<><p>Accessible in your in-game inventory once purchased.</p><p>Please make sure your Epic Games account is properly linked to your profile.</p></>:<><p>Coming soon. Purchasing and in-game delivery are not yet available.</p></>}</div></details>
  </section>;
}
