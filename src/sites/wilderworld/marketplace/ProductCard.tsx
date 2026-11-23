'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowUpRight, Armchair, CarFront, Gem, Shirt } from 'lucide-react';
import { productHref, featuredMaterial, subcategoryName, type MarketProduct } from './catalog';
import { clothingStyleName } from './clothing-fit';
import { getEditionQuantity } from './edition-quantities';
import WildPriceQuote from './WildPriceQuote';
import styles from './Marketplace.module.css';

export function ProductImage({product,src,compact=false,emptyLabel='Image coming soon'}:{product:MarketProduct;src?:string|null;compact?:boolean;emptyLabel?:string}) {
  const [failed,setFailed]=useState(false);
  useEffect(()=>setFailed(false),[src,product.image]);
  const image=src===undefined?product.image:src;
  const media=product.variants.find(variant=>variant.image===image);
  const Icon=product.department==='vehicles'?CarFront:product.department==='clothing'?Shirt:product.department==='statues'||product.department==='totems'?Gem:Armchair;
  return image&&!failed?<img src={compact?(media?.thumbnail??image):image} srcSet={media?.srcSet} sizes={compact?'(max-width: 640px) 46vw, (max-width: 1100px) 30vw, 22vw':'(max-width: 900px) 90vw, 45vw'} alt={product.name} loading={compact?'lazy':'eager'} fetchPriority={compact?'auto':'high'} decoding="async" onError={()=>setFailed(true)}/>:<div className={styles.noImage}><Icon size={54} strokeWidth={.7}/><span>{emptyLabel}</span></div>;
}


export function ProductCard({product,list=false,preferredFinish}:{product:MarketProduct;list?:boolean;preferredFinish?:string}) {
  const finish=preferredFinish?.toLowerCase()??'all';
  const preferred=finish!=='all'?product.variants.find(v=>v.name.toLowerCase()===finish):undefined;
  const choice=preferred??featuredMaterial(product);
  const quantity=choice?getEditionQuantity(product.id,choice.id):null;
  return <article aria-label={product.name} className={`${styles.productCard} ${list?styles.listCard:''}`}>
    <Link href={productHref(product,choice)} className={styles.productImage} data-product-type={product.subcategory==='cars'?'vehicle':product.subcategory==='rims'?'rim':undefined}><ProductImage product={product} compact src={choice?.image} emptyLabel={choice?`${choice.name} · Image coming soon`:'Image coming soon'}/></Link>
    <div className={styles.productCopy}><p className={styles.productCategory}>{product.brand??subcategoryName(product.subcategory)}</p>
      <h2 className={styles.productName}><Link href={productHref(product,choice)}>{clothingStyleName(product.id,product.name)}</Link></h2>
      {list&&<p className={styles.listDescription}>{product.description}</p>}
      <div className={styles.productBottom}><span className={styles.productPrice}>{product.priceCents!==null?<><strong title="USD price for one selected finish.">${(product.priceCents/100).toFixed(product.priceCents%100?2:0)}</strong><WildPriceQuote usdCents={product.priceCents} compact/></>:<span className={styles.release}>{product.status==='Existing collectible'?'Existing collectible':product.status==='Source candidate'?'Coming soon':'Coming soon'}</span>}</span><ArrowUpRight size={16} aria-hidden/></div>
      <dl className={styles.cardStock} aria-label={`${choice?.name??'Selected variant'} edition supply`}>
        <div title="Edition supply for the displayed finish, capped on chain."><dt>Quantity</dt><dd>{quantity?.toLocaleString('en-US')??'—'}</dd></div>
      </dl>
    </div>
  </article>;
}

