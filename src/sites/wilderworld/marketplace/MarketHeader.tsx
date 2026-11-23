'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowUpRight, Search, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { departments } from './departments';
import { ALL_ENTRIES } from '@/lib/wilderCollections';
import { useDragScroll } from '../accessories/useDragScroll';
import StoreAccountLink from './StoreAccountLink';
import ShoppingLogo from './ShoppingLogo';
import styles from './Marketplace.module.css';

// Compact labels belong only to this rail; collection names and identities stay canonical.
const originalNavLabels: Record<string, string> = {
  'wilder-land-the-island': 'The Island',
  wilderworld: 'Wheels',
  'wilderbeasts-wolf': 'Wolf',
  'wilderbeasts-wape': 'Wape',
  'wilder-moto': 'Moto',
  'wilderpals-gen': 'GEN',
  'wilder-crafts-genesis': 'Crafts',
  'wilder-cribs-genesis': 'Cribs',
  aws0: 'AWS 0',
  aws1: 'AWS 1',
  'air-wild': 'AWS 2',
  packs: 'Packs',
  'pack-weapons': 'Weapons',
  'pack-wheels': 'Mods',
  'pack-avatars': 'Gear',
};
const packCollectionSlugs = new Set(['packs', 'pack-weapons', 'pack-wheels', 'pack-avatars']);
const packCollections = ALL_ENTRIES.filter(entry => packCollectionSlugs.has(entry.slug));


export function MarketHeader({query='',department='all',category='all',collectionSlug,onQueryChange,marketsActive=false}:{query?:string;department?:string;category?:string;collectionSlug?:string;onQueryChange?:(query:string)=>void;marketsActive?:boolean}) {
  const router=useRouter();
  const departmentRail=useRef<HTMLDivElement>(null);
  const [departmentEdges,setDepartmentEdges]=useState({left:false,right:false});
  const showDepartmentArrows=departmentEdges.left||departmentEdges.right;
  useDragScroll(departmentRail);
  useEffect(()=>{
    const rail=departmentRail.current;
    if(!rail)return;
    const measure=()=>{
      const left=rail.scrollLeft>1;
      const right=rail.scrollLeft+rail.clientWidth<rail.scrollWidth-1;
      setDepartmentEdges(current=>current.left===left&&current.right===right?current:{left,right});
    };
    const observer=typeof ResizeObserver==='undefined'?undefined:new ResizeObserver(measure);
    observer?.observe(rail);
    window.addEventListener('resize',measure);
    rail.addEventListener('scroll',measure,{passive:true});
    measure();
    return()=>{observer?.disconnect();window.removeEventListener('resize',measure);rail.removeEventListener('scroll',measure);};
  },[]);
  useEffect(()=>{
    const rail=departmentRail.current;
    const current=rail?.querySelector<HTMLElement>('[aria-current="page"]');
    if(!rail||!current||!rail.clientWidth)return;
    const viewport=rail.getBoundingClientRect();
    const item=current.getBoundingClientRect();
    if(item.left>=viewport.left&&item.right<=viewport.right)return;
    const centered=rail.scrollLeft+item.left-viewport.left-(rail.clientWidth-item.width)/2;
    rail.scrollLeft=Math.max(0,Math.min(centered,rail.scrollWidth-rail.clientWidth));
  },[department,category,collectionSlug,showDepartmentArrows]);
  const scrollDepartments=(direction:number)=>{
    const rail=departmentRail.current;
    if(rail)rail.scrollBy({left:direction*rail.clientWidth*.75,behavior:window.matchMedia?.('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});
  };
  const [search,setSearch]=useState(query);
  const searchDepartment=department==='none'?'all':department;
  useEffect(()=>setSearch(query),[query]);
  const updateSearch=(value:string)=>{setSearch(value);if(searchDepartment===department)onQueryChange?.(value);};
  return <header className={styles.shoppingHeader}><div className={styles.marketHeader}>
    <ShoppingLogo />
    <form action={searchDepartment==='existing'?'/store/market':'/store/browse'} role="search" className={styles.search} onSubmit={event=>{
      event.preventDefault();
      if(onQueryChange&&searchDepartment===department){onQueryChange(search);return;}
      // Keep the current page visible while the client router changes scope.
      // A native form submission reloads the entire shopping shell and search.
      const params=new URLSearchParams();
      if(searchDepartment==='existing'){
        if(collectionSlug)params.set('c',collectionSlug);
      }else if(searchDepartment!=='all')params.set('department',searchDepartment);
      if(search.trim())params.set('q',search.trim());
      const path=searchDepartment==='existing'?'/store/market':'/store/browse';
      router.push(path+(params.size?'?'+params.toString():''));
    }}>
      {searchDepartment!=='all'&&searchDepartment!=='existing'&&<input type="hidden" name="department" value={searchDepartment}/>}
      {searchDepartment==='existing'&&collectionSlug&&<input type="hidden" name="c" value={collectionSlug}/>}
      <label className={styles.srOnly} htmlFor="market-search">Search products</label>
      <input id="market-search" type="search" name="q" value={search} onChange={event=>updateSearch(event.target.value)} placeholder="Search products"/>
      {search&&<button type="button" onClick={()=>updateSearch('')} aria-label="Clear search"><X size={16} aria-hidden/></button>}
      <button type="submit" aria-label="Search products"><Search size={19} aria-hidden/></button>
    </form>
    <div className={styles.headerActions}><Link href="/markets" className={styles.marketsLink} aria-current={marketsActive?'page':undefined}>Markets</Link><StoreAccountLink/><a href="https://store.epicgames.com/p/wilder-world-wilder-world-alpha-b4ccf8?lang=en-US" className={`sci-btn sci-btn-primary ${styles.playNow}`} target="_blank" rel="noopener noreferrer">Play Now <ArrowUpRight size={16} aria-hidden/></a></div>
  </div><nav className={styles.departmentNav} aria-label="Shopping navigation"><div ref={departmentRail} className={styles.departmentNavLinks} role="region" aria-label="Shopping categories" tabIndex={0}><Link href="/store/browse" aria-current={department==='all'?'page':undefined}>All products</Link>{departments.flatMap(d=>[<Link key={d.id} href={`/store/collections/${d.id}`} aria-current={department===d.id&&category==='all'?'page':undefined}>{d.name}</Link>,...(d.id==='clothing'?[{id:'eyewear',name:'Glasses'},{id:'hats',name:'Hats'},{id:'helmets',name:'Helmets'}].map(item=><Link key={item.id} href={`/store/collections/clothing?category=${item.id}`} aria-current={department==='clothing'&&category===item.id?'page':undefined}>{item.name}</Link>):[])])}{packCollections.map(entry=><Link key={entry.id} href={`/store/market?c=${encodeURIComponent(entry.slug)}`} prefetch={false} aria-current={department==='existing'&&collectionSlug===entry.slug?'page':undefined}>{originalNavLabels[entry.slug]}</Link>)}</div>{(departmentEdges.left||departmentEdges.right)&&<div className={styles.departmentNavActions}><button type="button" aria-label="Scroll categories left" disabled={!departmentEdges.left} onClick={()=>scrollDepartments(-1)}><ChevronLeft size={17} aria-hidden/></button><button type="button" aria-label="Scroll categories right" disabled={!departmentEdges.right} onClick={()=>scrollDepartments(1)}><ChevronRight size={17} aria-hidden/></button></div>}</nav>
  </header>;
}

