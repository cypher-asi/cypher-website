'use client';

import { useRef, type CSSProperties, type ReactNode } from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, ArrowUpRight, Gem, Search, ShoppingBag, X } from 'lucide-react';
import typography from '@/components/SectionHeader.module.css';
import homepage from '../Landing.module.css';
import styles from './StoreBrowse.module.css';
import { useProductGridDensity } from '../marketplace/ProductGridControls';
import CollectionSectionHeader from '../marketplace/CollectionSectionHeader';
import gridStyles from '../marketplace/ProductGridControls.module.css';
import { departments } from './departments';
import { marketProducts, featuredMaterial, browseProducts as filterProducts, type MarketProduct } from '../marketplace/catalog';
import { campaignMedia } from '../marketplace/campaign-media';
import { useDragScroll } from './useDragScroll';
export { departments } from './departments';

type CategoryChange = (category: string) => void;
type NavigationProps = {
  category: string;
  onCategoryChange: CategoryChange;
  query: string;
  onQueryChange: (query: string) => void;
  onSearchSubmit: () => void;
  onOpenBag: () => void;
  bagCount: number;
};

export function StoreNavigation({ category, onCategoryChange, query, onQueryChange, onSearchSubmit, onOpenBag, bagCount }: NavigationProps) {
  return <div className={styles.navigation}>
    <nav className={styles.departments} aria-label="Product departments">
      {departments.map(department => <button key={department.id} type="button" aria-pressed={category === department.id} onClick={() => onCategoryChange(department.id)}>{department.label}</button>)}
    </nav>
    <div className={styles.controls}>
      <form className={styles.search} role="search" onSubmit={event => { event.preventDefault(); onSearchSubmit(); }}>
        <input type="search" aria-label="Search Wilder World" placeholder="Search" value={query} onChange={event => onQueryChange(event.target.value)} />
        {query && <button type="button" aria-label="Clear search" onClick={() => onQueryChange('')}><X size={14} aria-hidden /></button>}
        <button type="submit" aria-label="Search products"><Search size={17} aria-hidden /></button>
      </form>
      <button type="button" className={styles.bag} onClick={onOpenBag} aria-label={'Open shopping bag, ' + bagCount + ' items'}><ShoppingBag size={18} aria-hidden /><span>{bagCount}</span></button>
    </div>
  </div>;
}

type DiscoveryCategory = {
  id: string;
  label: string;
  href: string;
  department: string;
  subcategory?: string;
  preferredIds?: string[];
  lifestyle?: string;
  position?: string;
};

const discoveryCategories: DiscoveryCategory[] = [
  { id: 'vehicles', label: 'Vehicles', department: 'vehicles', href: '/store/collections/vehicles', preferredIds: ['vehicle-ghostline', 'vehicle-vera-solis'] },
  { id: 'rims', label: 'Rims', department: 'rims', href: '/store/collections/rims', preferredIds: ['rim-preview-wertone-wantide-2010'] },
  ...departments.filter(item => item.id !== 'all').map(item => {
    const subcategory = item.id === 'headwear' ? 'hats' : item.id;
    return { id: item.id, label: item.label, department: 'clothing', subcategory, href: `/store/collections/clothing?category=${subcategory}` };
  }),
  { id: 'furniture', label: 'Furniture', department: 'furniture', href: '/store/collections/furniture', preferredIds: ['furniture-sofa', 'furniture-chair', 'furniture-coffetable', 'furniture-workdesk'] },
  { id: 'statues', label: 'Statues', department: 'statues', href: '/store/collections/statues', preferredIds: ['statue-classical-bust', 'statue-black-cat', 'statue-tiger-head', 'statue-winged-bust'] },
  { id: 'totems', label: 'Totems', department: 'totems', href: '/store/collections/totems' },
];

const categoryOrder = ['vehicles', 'furniture', 'topwear', 'statues', 'footwear', 'headwear', 'eyewear', 'rims', 'jacket', 'bottomwear', 'suit', 'totems', 'jewelry', 'extra', 'mask'];
const orderedCategories = categoryOrder.flatMap(id => discoveryCategories.find(category => category.id === id) ?? []);

const campaigns: Record<string, { headline: [string, string]; tone: string }> = {
  vehicles: { headline: ['Find your', 'next ride.'], tone: 'slate' },
  rims: { headline: ['Built to', 'turn heads.'], tone: 'charcoal' },
  topwear: { headline: ['New world.', 'Your rules.'], tone: 'rust' },
  furniture: { headline: ['Make room', 'for you.'], tone: 'olive' },
  eyewear: { headline: ['See it', 'differently.'], tone: 'charcoal' },
  jacket: { headline: ['Built for', 'after hours.'], tone: 'olive' },
  totems: { headline: ['Keep it', 'close.'], tone: 'slate' },
  footwear: { headline: ['Go your', 'own way.'], tone: 'charcoal' },
  headwear: { headline: ['Top off', 'the look.'], tone: 'rust' },
  bottomwear: { headline: ['Easy from', 'here.'], tone: 'slate' },
  suit: { headline: ['Suit your', 'world.'], tone: 'rust' },
  jewelry: { headline: ['Set your', 'own tone.'], tone: 'olive' },
  extra: { headline: ['The details', 'make it.'], tone: 'charcoal' },
  mask: { headline: ['Keep them', 'guessing.'], tone: 'slate' },
  statues: { headline: ['Something', 'to stand for.'], tone: 'olive' },
};

// Curated merchandising only uses products present in the active storefront.
export const homeProductIds = ['JCKT_001', 'HDWR_011_A', 'EYWR_015', 'furniture-sofa', 'FTWR_001', 'totem-fw-hercules', 'HDWR_013', 'statue-black-cat'];

function productMedia(product: MarketProduct | undefined) {
  if (!product) return { image: null };
  const material = featuredMaterial(product);
  return { image: material?.thumbnail ?? material?.image ?? product.image, srcSet: material?.srcSet };
}

function TwoLineHeadline({ lines }: { lines: readonly [string, string] }) {
  return <span className={styles.twoLineHeadline}><span>{lines[0]}{' '}</span><span>{lines[1]}</span></span>;
}

function CategoryPanel({ category, priority = false }: { category: DiscoveryCategory; priority?: boolean }) {
  const products = filterProducts(marketProducts,{department:category.department,subcategory:category.subcategory??(category.department==='clothing'?category.id:undefined)});
  const campaignImage = campaignMedia[category.id];
  const product = [...(campaignImage?.productIds ?? []), ...(category.preferredIds ?? [])].map(id => products.find(item => item.id === id)).find(Boolean) ?? products[0];
  const media = productMedia(product);
  const image = campaignImage?.cardImage ?? campaignImage?.image ?? category.lifestyle ?? media.image;
  const scene = Boolean(campaignImage || category.lifestyle) || category.id === 'vehicles';
  const campaign = campaigns[category.id];
  return <Link data-category-cover data-tone={campaign.tone} href={category.href} className={styles.categoryCard} aria-label={'Shop ' + category.label} style={{'--category-art':image?`url("${image}")`:'none'} as CSSProperties}>
    <div className={styles.categoryCopy} data-campaign-heading>
      <h2 className={homepage.gameplayTitle} aria-label={campaign.headline.join(' ')}><TwoLineHeadline lines={campaign.headline} /></h2>
      <p className={styles.campaignCategory}>{category.label}</p>
    </div>
    <div className={`${styles.categoryImage} ${scene ? styles.categoryScene : ''}`} data-category-product={product?.id}>
      {image ? <img src={image} srcSet={campaignImage || category.lifestyle ? undefined : media.srcSet} alt="" loading={priority ? "eager" : "lazy"} fetchPriority={priority ? "high" : "auto"} decoding="async" sizes="(max-width: 640px) 76vw, (max-width: 1000px) 42vw, 24vw" style={{ objectPosition: campaignImage?.cardPosition ?? campaignImage?.position ?? category.position }} /> : <div className={styles.categoryImagePending}><Gem size={38} strokeWidth={.8} aria-hidden/><span>Image coming soon</span></div>}
    </div>
    <span className={styles.campaignFooter}><span>Shop {category.label.toLowerCase()} <span className={styles.categoryCount}>{products.length}</span></span><ArrowUpRight size={19} aria-hidden /></span>
  </Link>;
}

export function StoreDiscovery({ children, afterCategories }: { children?: ReactNode; afterCategories?: ReactNode }) {
  const density = useProductGridDensity();
  const gallery = useRef<HTMLDivElement>(null);
  useDragScroll(gallery);
  const scrollCategories = (direction: number) => {
    const rail = gallery.current;
    if (!rail) return;
    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    rail.scrollBy({ left: direction * rail.clientWidth * .82, behavior: reducedMotion ? 'auto' : 'smooth' });
  };
  return <section id="collections" className={styles.discovery} aria-label="Shop by category">
    <header className={styles.galleryToolbar}>
      <h1 className={typography.title}>Shop the simulation</h1>
      <div className={styles.railActions}><Link href="/store/browse">View all products <ArrowUpRight size={16} aria-hidden /></Link><button aria-label="Previous categories" type="button" onClick={() => scrollCategories(-1)}><ArrowLeft size={18} aria-hidden /></button><button aria-label="Next categories" type="button" onClick={() => scrollCategories(1)}><ArrowRight size={18} aria-hidden /></button></div>
    </header>
    <div ref={gallery} className={styles.gallery} role="region" aria-label="Product category gallery" tabIndex={0}>
      {orderedCategories.map((category, index) => <CategoryPanel key={category.id} category={category} priority={index === 0} />)}
    </div>
    {afterCategories}
    {children && <section className={styles.picksSection} aria-labelledby="product-picks-heading"><CollectionSectionHeader id="product-picks-heading" title="Make it yours"/><div className={`${styles.productGrid} ${gridStyles.grid}`} data-density={density}>{children}</div></section>}
  </section>;
}
