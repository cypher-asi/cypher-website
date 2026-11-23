'use client';
import { ProductCard } from './ProductCard';
export { ProductCard } from './ProductCard';
import { MarketHeader } from './MarketHeader';
export { MarketHeader } from './MarketHeader';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Search, SlidersHorizontal, X, ChevronRight, RotateCcw } from 'lucide-react';
import { departments, departmentName, browseDepartment, subcategoryName, marketProducts, browseProducts as filterProducts } from './catalog';
import { deriveFinishOptions } from './finish-filter';
import { useMobileFilterDialog } from './useMobileFilterDialog';
import styles from './Marketplace.module.css';
import typography from '@/components/SectionHeader.module.css';
import { StoreDiscovery, homeProductIds } from '../accessories/StoreBrowse';
import { OriginalDiscoveryCard, originalDiscoveryIds } from './ExistingCollections';
import { ProductListControl, useProductGridDensity } from './ProductGridControls';
import CollectionSectionHeader from './CollectionSectionHeader';
import gridStyles from './ProductGridControls.module.css';
import { useCatalogLimit } from './useCatalogLimit';

export function MarketplaceHome() {
  return <main className={styles.page}>
    <MarketHeader />
    <StoreDiscovery />
    <HomeProductCatalog />
  </main>;
}

function HomeProductCatalog() {
  const density=useProductGridDensity();
  const products = useMemo(() => {
    const all = filterProducts(marketProducts, { sort: 'featured' });
    const featured = homeProductIds.flatMap(id => all.find(product => product.id === id) ?? []);
    const featuredIds = new Set(featured.map(product => product.id));
    return [...featured, ...all.filter(product => !featuredIds.has(product.id))];
  }, []);
  const [limit, setLimit] = useCatalogLimit('home', products.length);
  const sentinel = useRef<HTMLDivElement>(null);
  const hasMore = limit < products.length;
  const loadMore = () => setLimit(current => Math.min(current + 24, products.length));
  useEffect(() => {
    const target = sentinel.current;
    if (!target || !hasMore || typeof IntersectionObserver === 'undefined') return;
    let requested = false;
    const observer = new IntersectionObserver(entries => {
      if (requested || !entries.some(entry => entry.isIntersecting)) return;
      requested = true;
      setLimit(current => Math.min(current + 24, products.length));
    }, { rootMargin: '600px 0px' });
    observer.observe(target);
    return () => observer.disconnect();
  }, [limit, hasMore, products.length]);
  return <section id="all-products" className={styles.homeCatalog} aria-labelledby="home-catalog-heading">
    <CollectionSectionHeader id="home-catalog-heading" title="Make it yours"/>
    <div className={`${gridStyles.actions} ${styles.catalogActions}`}><Link href="/store/browse">Filter &amp; sort <SlidersHorizontal size={16} aria-hidden /></Link></div>
    <div className={`${styles.resultsGrid} ${gridStyles.grid}`} data-density={density}>{products.slice(0, limit).map(product => <ProductCard key={product.id} product={product} />)}</div>
    <div ref={sentinel} className={styles.loadMore} data-testid="home-product-load-sentinel">
      <p role="status">{hasMore ? `${Math.min(limit, products.length)} of ${products.length} products` : `You've seen all ${products.length} products`}</p>
      {hasMore && <button type="button" className={styles.primary} onClick={loadMore}>Show more products <ArrowRight size={16} aria-hidden /></button>}
    </div>
  </section>;
}

export function MarketplaceBrowse({initialDepartment='all',initialCategory='all',initialQuery='',initialFinish='all',initialBrand='all',initialSort='featured',initialView='grid',initialGender='all'}:{initialDepartment?:string;initialCategory?:string;initialQuery?:string;initialFinish?:string;initialBrand?:string;initialSort?:string;initialView?:string;initialGender?:string}) {
  const density=useProductGridDensity();
  const requestedDepartment=browseDepartment(initialDepartment,initialCategory);
  const [department]=useState(departments.some(d=>d.id===requestedDepartment)?requestedDepartment:'all'),[category,setCategory]=useState(requestedDepartment==='rims'&&initialCategory==='rims'?'all':initialCategory),[query,setQuery]=useState(initialQuery),[finish,setFinish]=useState(initialFinish),[brand,setBrand]=useState(initialBrand),[sort,setSort]=useState(initialSort),[view,setView]=useState(initialView),[gender,setGender]=useState(['Men','Women'].includes(initialGender)?initialGender:'all'),[filtersOpen,setFiltersOpen]=useState(false);
  const result=useMemo(()=>filterProducts(marketProducts,{department,subcategory:category,query,brand,finish,sort,gender}),[department,category,query,brand,finish,sort,gender]);
  const [limit,setLimit]=useCatalogLimit(JSON.stringify(['browse',department,category,query,brand,finish,sort,gender]),result.length);
  const finishOptions=useMemo(()=>deriveFinishOptions(filterProducts(marketProducts,{department,subcategory:category,query,brand,gender})),[department,category,query,brand,gender]);
  const selectedFinish=finishOptions.find(option=>option.value===finish.toLowerCase());
  const filterId=useId(),filterPanel=useRef<HTMLElement|null>(null),filterTrigger=useRef<HTMLButtonElement|null>(null),filterBackdrop=useRef<HTMLButtonElement|null>(null);
  const mobileFilters=useMobileFilterDialog({open:filtersOpen,onClose:()=>setFiltersOpen(false),panel:filterPanel,trigger:filterTrigger,backdrop:filterBackdrop});
  const modalFiltersOpen=mobileFilters&&filtersOpen;
  const loadSentinel=useRef<HTMLDivElement>(null);
  const activeDepartment=departments.find(d=>d.id===department);
  const brands=[...new Set(marketProducts.filter(p=>p.department==='clothing').map(p=>p.brand).filter((s):s is string=>!!s))];
  useEffect(()=>{
    const target=loadSentinel.current;
    if(!target||limit>=result.length||typeof IntersectionObserver==='undefined')return;
    const observer=new IntersectionObserver(entries=>{
      if(entries.some(entry=>entry.isIntersecting))setLimit(current=>Math.min(current+24,result.length));
    },{rootMargin:'600px 0px'});
    observer.observe(target);
    return()=>observer.disconnect();
  },[limit,result]);
  useEffect(()=>{const pathname=department==='rims'&&location.pathname==='/store/collections/vehicles'?'/store/collections/rims':location.pathname;const params=new URLSearchParams();if(department!=='all'&&!pathname.endsWith('/'+department))params.set('department',department);if(category!=='all')params.set('category',category);if(query)params.set('q',query);if(finish!=='all')params.set('finish',finish);if(brand!=='all')params.set('brand',brand);if(sort!=='featured')params.set('sort',sort);if(view==='list')params.set('view',view);if(gender!=='all')params.set('gender',gender);window.history.replaceState(window.history.state,'',pathname+(params.size?'?'+params.toString():''));},[department,category,query,finish,brand,sort,view,gender]);
  useEffect(()=>{const saved=localStorage.getItem('ww-market-view');if(!new URLSearchParams(location.search).has('view')&&saved==='list')setView('list');},[]);
  const clear=()=>{setCategory('all');setQuery('');setBrand('all');setFinish('all');setGender('all');};
  const changeView=(next:'grid'|'list')=>{setView(next);try{localStorage.setItem('ww-market-view',next);}catch{}};
  return <main className={styles.page}><MarketHeader department={department} category={category} query={query} onQueryChange={setQuery}/><div className={styles.browseContent}>
    <div className={styles.breadcrumb}><Link href="/store">Store</Link><ChevronRight size={12}/><span>{departmentName(department)}</span>{category!=='all'&&<><ChevronRight size={12}/><span>{subcategoryName(category)}</span></>}</div>
    <div className={styles.browseHeading}><CollectionSectionHeader level={1} title={query?`Results for “${query}”`:category!=='all'?subcategoryName(category):departmentName(department)} view={view} onViewChange={changeView}/><p>{activeDepartment?.tagline??'Every detail of your digital life, in one place.'}</p></div>
    <div className={styles.browseLayout}>
      {modalFiltersOpen&&<button ref={filterBackdrop} type="button" tabIndex={-1} className={styles.filterBackdrop} aria-label="Close filters backdrop" onClick={()=>setFiltersOpen(false)}/>}
      <aside id={filterId} ref={filterPanel} tabIndex={-1} hidden={mobileFilters&&!filtersOpen} role={modalFiltersOpen?'dialog':undefined} aria-modal={modalFiltersOpen?true:undefined} className={`${styles.sidebar} ${modalFiltersOpen?styles.sidebarOpen:''}`} aria-label="Product filters" onClick={event=>{if(modalFiltersOpen&&event.target instanceof Element&&event.target.closest('a[href]'))setFiltersOpen(false);}}><div className={styles.sidebarTitle}>Filters<button aria-label="Close filters" onClick={()=>setFiltersOpen(false)}><X size={18}/></button></div>
        <h2>Department</h2><Link className={department==='all'?styles.activeFilter:''} href="/store/browse">All departments</Link>{departments.map(d=><Link key={d.id} href={`/store/collections/${d.id}`} className={department===d.id?styles.activeFilter:''}>{d.name}<span>{filterProducts(marketProducts,{department:d.id}).length}</span></Link>)}
        {activeDepartment&&<><h2>Category</h2><button className={category==='all'?styles.activeFilter:''} onClick={()=>setCategory('all')}>All {activeDepartment.name.toLowerCase()}</button>{activeDepartment.subs.map(s=><button key={s.id} className={category===s.id?styles.activeFilter:''} onClick={()=>setCategory(s.id)}>{s.name}<span>{filterProducts(marketProducts,{department,subcategory:s.id}).length}</span></button>)}</>}
        {(department==='furniture'||department==='all')&&<><h2 id="finish-filter-heading">Colors &amp; materials</h2><select aria-labelledby="finish-filter-heading" value={selectedFinish?.value??finish} onChange={event=>setFinish(event.target.value)}><option value="all">All options</option>{finish!=='all'&&!selectedFinish&&<option value={finish}>{finish} (0 results)</option>}{finishOptions.map(option=><option key={option.value} value={option.value}>{option.label} ({option.productCount})</option>)}</select></>}
        {department==='clothing'&&<><h2>Shop by fit</h2>{['all','Men','Women'].map(g=><button key={g} className={gender===g?styles.activeFilter:''} onClick={()=>setGender(g)}>{g==='all'?'All fits':g}</button>)}</>}{(department==='clothing'||department==='all')&&<><h2>Brands</h2><select aria-label="Filter by brand" value={brand} onChange={e=>setBrand(e.target.value)}><option value="all">All brands</option>{brands.map(b=><option key={b}>{b}</option>)}</select></>}
        <button className={styles.reset} onClick={clear}><RotateCcw size={13}/> Reset filters</button>
      </aside>
      <section className={styles.results} aria-label="Product results"><div className={styles.resultsToolbar}><button ref={filterTrigger} className={styles.mobileFilter} aria-expanded={modalFiltersOpen} aria-controls={filterId} aria-haspopup="dialog" onClick={()=>setFiltersOpen(true)}><SlidersHorizontal size={16}/> Filters</button><p aria-live="polite">{result.length} {result.length===1?'result':'results'}</p><select aria-label="Sort products" value={sort} onChange={e=>setSort(e.target.value)}><option value="featured">Featured</option><option value="name">Name: A–Z</option><option value="price-low">Price: low to high</option><option value="price-high">Price: high to low</option><option value="variants">Most options</option></select><ProductListControl view={view} onViewChange={changeView}/></div>
        {(category!=='all'||finish!=='all'||brand!=='all'||gender!=='all'||query)&&<div className={styles.activeChips}>{category!=='all'&&<button onClick={()=>setCategory('all')}>{subcategoryName(category)} <X size={12}/></button>}{finish!=='all'&&<button aria-label="Remove color or material filter" onClick={()=>setFinish('all')}>{selectedFinish?.label??finish} <X size={12}/></button>}{brand!=='all'&&<button onClick={()=>setBrand('all')}>{brand} <X size={12}/></button>}{gender!=='all'&&<button aria-label="Remove fit filter" onClick={()=>setGender('all')}>{gender} <X size={12}/></button>}{query&&<button onClick={()=>setQuery('')}>“{query}” <X size={12}/></button>}</div>}
        {result.length?<div className={view==='grid'?`${styles.resultsGrid} ${gridStyles.grid}`:styles.resultsList} data-density={view==='grid'?density:undefined}>{result.slice(0,limit).flatMap((p,index)=>[<ProductCard key={p.id} product={p} list={view==='list'} preferredFinish={finish}/>,...(department==='all'&&!query&&category==='all'&&finish==='all'&&brand==='all'&&sort==='featured'&&(index+1)%12===0&&originalDiscoveryIds[Math.floor(index/12)]?[<OriginalDiscoveryCard key={`original-${Math.floor(index/12)}`} id={originalDiscoveryIds[Math.floor(index/12)]}/>]:[])])}</div>:<div className={styles.empty}><Search size={30}/><h2>No matches just yet.</h2><p>Try another color, material, name or category.</p><button className={styles.primary} onClick={clear}>Clear filters <ArrowRight size={16}/></button></div>}
        {result.length>0&&<div ref={loadSentinel} className={styles.loadMore} data-testid="product-load-sentinel"><p role="status">{limit<result.length?`Showing ${Math.min(limit,result.length)} of ${result.length} · More products load as you scroll`:`You've seen all ${result.length} products`}</p>{result.length>limit&&<button className={styles.primary} onClick={()=>setLimit(n=>Math.min(n+24,result.length))}>Show more products <ArrowRight size={16}/></button>}</div>}
      </section>
    </div>
  </div></main>;
}
