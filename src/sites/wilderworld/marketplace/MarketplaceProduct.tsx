'use client';
import { MarketHeader } from './MarketHeader';
export { MarketHeader } from './MarketHeader';
import ProductRating from './ProductRating';
import ProductTradingCard from './ProductTradingCard';
import EditionSummary from './EditionSummary';
import WildPriceQuote from './WildPriceQuote';
import { STORE_SECONDARY_PANELS_ENABLED } from './launch-flags';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, ArrowUpRight, Search, SlidersHorizontal, X, Armchair, CarFront, Gem, ChevronLeft, ChevronRight, Shirt, RotateCcw } from 'lucide-react';
import { departments, departmentName, storefrontDepartment, browseDepartment, subcategoryName, marketProducts, browseProducts as filterProducts, findMarketProduct, featuredMaterial, productHref, type MarketProduct, type Variant } from './catalog';
import { clothingStyleName } from './clothing-fit';
import { deriveFinishOptions } from './finish-filter';
import { useMobileFilterDialog } from './useMobileFilterDialog';
import styles from './Marketplace.module.css';
import typography from '@/components/SectionHeader.module.css';
import { StoreDiscovery, homeProductIds } from '../accessories/StoreBrowse';
import GameProductDetails, { ProductMaterialPicker } from './GameProductDetails';
import { approvedProductEditorials } from './campaign-media';
import { ExistingCollections, OriginalDiscoveryCard, originalDiscoveryIds } from './ExistingCollections';
import { ProductMarketPanel } from './DeferredProductSections';
import { ProductReviews } from './DeferredProductSections';
import { LocalListingPanel } from './DeferredProductSections';
import MobilePurchaseBar from './MobilePurchaseBar';
import { ProductListControl, useProductGridDensity } from './ProductGridControls';
import CollectionSectionHeader from './CollectionSectionHeader';
import gridStyles from './ProductGridControls.module.css';
import { useCatalogLimit } from './useCatalogLimit';
import {useVariantSwipe} from './useVariantSwipe';
import { websiteProductDescription } from './website-product-copy';



import { ProductCard, ProductImage } from './ProductCard';
function RelatedProducts({title,products,href}:{title:string;products:MarketProduct[];href:string}) {
  const density=useProductGridDensity();
  return <section className={styles.railSection}><CollectionSectionHeader title={title}/><div className={`${styles.resultsGrid} ${gridStyles.grid}`} data-density={density}>{products.map(p=><ProductCard key={p.id} product={p}/>)}</div><Link className={styles.shopLink} href={href}>View collection <ArrowRight size={17}/></Link></section>;
}

export function MarketplaceProduct({id,initialVariant}:{id:string;initialVariant?:string}) {
  const product=findMarketProduct(id)!;
  const section=storefrontDepartment(product);
  const defaultVariant=product.variants.find(v=>v.id===initialVariant)??featuredMaterial(product);
  const [variantId,setVariantId]=useState(defaultVariant?.id);
  const variant=product.variants.find(v=>v.id===variantId);
  const [galleryImage,setGalleryImage]=useState<string>();
  const selectedImage=variant?variant.image:product.image;
  const image=galleryImage!==undefined?galleryImage:selectedImage;
  const gallery=[...new Set([product.image,...product.gallery].filter((s):s is string=>!!s))];
  const editorials=approvedProductEditorials(product.id,variant?.id).filter(item=>item.image!==selectedImage&&!gallery.includes(item.image));
  const editorial=galleryImage===undefined?undefined:editorials.find(item=>item.image===image);
  const related=marketProducts.filter(p=>storefrontDepartment(p)===section&&p.id!==product.id).slice(0,8);
  const isLegacy=product.status==='Existing collectible';
  const isSource=product.status==='Source candidate';
  function selectVariant(next:Variant) {
    setVariantId(next.id);setGalleryImage(undefined);
    const url=new URL(window.location.href);url.searchParams.set('variant',next.id);
    window.history.replaceState(window.history.state,'',url);
  }
  const variantSwipe = useVariantSwipe(product.variants,variant?.id,id=>selectVariant(product.variants.find(option=>option.id===id)!));
  useEffect(()=>{
    const readVariant=()=>{
      const requested=new URLSearchParams(window.location.search).get('variant');
      const next=product.variants.find(v=>v.id===requested)??defaultVariant;
      setVariantId(next?.id);setGalleryImage(undefined);
    };
    window.addEventListener('popstate',readVariant);
    return()=>window.removeEventListener('popstate',readVariant);
  },[product,defaultVariant]);
  return <main className={styles.page}>
    <MarketHeader department={section}/>
    <div className={`${styles.browseContent} ${styles.productDetailContent}`}>
      <div className={styles.breadcrumb}><Link href="/store">Store</Link><ChevronRight size={12}/><Link href={`/store/collections/${section}`}>{departmentName(section)}</Link><ChevronRight size={12}/><span>{product.name}</span></div>
      <div className={styles.detailLayout}>
        <section className={styles.detailMedia} aria-label="Product imagery">
          <div {...variantSwipe} className={styles.detailImage} data-product-hero data-product-type={product.subcategory==='cars'?'vehicle':product.subcategory==='rims'?'rim':undefined} data-image-kind={editorial?'editorial':'product'}><span className={styles.detailImageLabel}>{editorial?'Editorial':departmentName(section)}</span>{editorial?<img src={editorial.image} alt={`${product.name} — ${editorial.alt}`} style={{objectPosition:editorial.position}}/>:<ProductImage product={product} src={image} emptyLabel={variant?`${variant.name} · Image coming soon`:'Image coming soon'}/>}</div>
          {(gallery.length>1||editorials.length>0)&&<div className={styles.thumbnails} aria-label="Product gallery" data-product-type={product.subcategory==='cars'?'vehicle':product.subcategory==='rims'?'rim':undefined}><button aria-label="View selected finish" aria-pressed={!galleryImage} onClick={()=>setGalleryImage(undefined)}>{selectedImage&&<img src={selectedImage} alt="" loading="lazy" decoding="async"/>}</button>{gallery.filter(src=>src!==selectedImage).map((src,i)=><button aria-label={`View image ${i+1}`} aria-pressed={image===src} key={src} onClick={()=>setGalleryImage(src)}><img src={src} alt="" loading="lazy" decoding="async"/></button>)}{editorials.map((item,i)=><button key={item.id} aria-label={`View Editorial ${i+1}`} aria-pressed={image===item.image} onClick={()=>setGalleryImage(item.image)} data-image-kind="editorial"><img src={item.image} alt="" style={{objectPosition:item.position}}/></button>)}</div>}
        </section>
        <section className={styles.detailCopy} aria-label="Product information">
          <div className={styles.detailEyebrow}><Link href={`/store/collections/${section}`} className={styles.detailBrand}>{product.brand??'Wilder World'}</Link><span>{subcategoryName(product.subcategory)}</span></div>
          <h1 className={typography.title}>{product.name}</h1>
          {STORE_SECONDARY_PANELS_ENABLED&&<ProductRating productId={product.id} variantIds={product.variants.map(option=>option.id)}/>}
          <p className={styles.detailDescription}>{websiteProductDescription(product)}</p>
          <div className={styles.detailPrice}><div><strong>{product.priceCents!==null?`$${(product.priceCents/100).toFixed(product.priceCents%100?2:0)}`:isLegacy?'Existing collectible':isSource?'Coming soon':'Coming soon'}</strong>{product.priceCents!==null&&<WildPriceQuote usdCents={product.priceCents}/>}</div>{product.priceCents!==null&&<span>USD</span>}</div>
          <ProductMaterialPicker productId={product.id} options={product.variants} selectedId={variant?.id} onSelect={nextId=>selectVariant(product.variants.find(option=>option.id===nextId)!)}/>
          <aside className={styles.purchasePanel} aria-label="Availability">
            <button disabled>{isLegacy?'Owner access coming soon':'Coming soon'}</button>
          </aside>
          {STORE_SECONDARY_PANELS_ENABLED&&variant&&<ProductTradingCard productId={product.id} variantId={variant.id} variantName={variant.name} previewPriceCents={product.priceCents}/>}
          <EditionSummary productId={product.id} variantId={variant?.id}/>
          <GameProductDetails productId={product.id} variantId={variant?.id}/>
          {isLegacy&&<details className={styles.detailAccordion}><summary>About these material studies</summary><p>Visual material studies only. These are not additional editions or colors granted to existing owners.</p>{product.imageSourceReference&&<a href={product.imageSourceReference} target="_blank" rel="noreferrer">Official Trinity Totem reference <ArrowUpRight size={13}/></a>}</details>}
        </section>
      </div>
      {STORE_SECONDARY_PANELS_ENABLED&&variant&&<ProductMarketPanel productId={product.id} variantId={variant.id} variantName={variant.name} previewPriceCents={product.priceCents} variants={product.variants.map(option=>({id:option.id,name:option.name,previewPriceCents:product.priceCents}))} onVariantSelect={nextId=>{const next=product.variants.find(option=>option.id===nextId);if(next)selectVariant(next);}}/>}
      {STORE_SECONDARY_PANELS_ENABLED&&variant&&<LocalListingPanel productId={product.id} variantId={variant.id} variantName={variant.name}/>}
      {STORE_SECONDARY_PANELS_ENABLED&&<ProductReviews preview key={product.id} productId={product.id} variantId={variant?.id} variantName={variant?.name} variantOptions={product.variants}/>}
      {related.length>0&&<RelatedProducts title={`More ${departmentName(section).toLowerCase()}`} products={related} href={`/store/collections/${section}`}/>}
    </div>
    <MobilePurchaseBar priceCents={product.priceCents} selection={variant?.name} label="Coming soon" disabled/>
  </main>;
}
