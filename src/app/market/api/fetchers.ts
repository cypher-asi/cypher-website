import { requestDeadline } from '@/lib/request-timeout';
import type { OriginalDataProvenance } from '@/lib/originals-data';
import type { MarketNft } from '@/lib/opensea';
import type { MarketCollection } from '@/app/api/market/collections/route';
import type { MarketItem } from '@/app/api/market/item/route';
import type { TraitCategory } from '@/app/api/market/traits/route';
import type { Availability, SelectedTraits } from '../types';

export type NftsPage = {
  traitCategories?: TraitCategory[];
  totalProducts?: number;
  observedAt?: string;
  provenance?: OriginalDataProvenance;
  items: MarketNft[];
  next: string | null;
};

/** Thrown when a market route handler reports an upstream failure. */
export class MarketFetchError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MarketFetchError';
  }
}

async function getJson(url: string, signal?: AbortSignal): Promise<unknown> {
  const deadline = requestDeadline(signal);
  try {
    const res = await fetch(url, {signal: deadline.signal});
    if (!res.ok) throw new MarketFetchError(`Request failed (${res.status})`);
    return await res.json();
  } catch (error) {
    if (deadline.didTimeout()) throw new MarketFetchError('The collection took too long to respond. Please try again.');
    throw error;
  } finally { deadline.dispose(); }
}

export async function fetchCollections(signal?: AbortSignal): Promise<Record<string, MarketCollection>> {
  const data = await getJson('/api/market/collections', signal);
  const collections =
    data && typeof data === 'object' && 'collections' in data
      ? (data as { collections?: MarketCollection[] }).collections
      : undefined;
  const byId: Record<string, MarketCollection> = {};
  for (const c of collections ?? []) byId[c.slug] = c;
  return byId;
}

export async function fetchEthPrice(signal?: AbortSignal): Promise<number | null> {
  const data = await getJson('/api/market/eth-price', signal);
  if (data && typeof data === 'object' && 'usd' in data) {
    const usd = (data as { usd?: number | null }).usd;
    return typeof usd === 'number' ? usd : null;
  }
  return null;
}

export async function fetchNftsPage(
  slug: string,
  availability: Availability,
  next: string | null,
  attributes?: SelectedTraits,
  signal?: AbortSignal
): Promise<NftsPage> {
  const params = new URLSearchParams({ slug, status: availability });
  if (next) params.set('next', next);
  // Server-side trait filter for indexer collections: forward only the
  // selected values (drop empty types) as a JSON attribute filter.
  const active = attributes
    ? Object.fromEntries(
        Object.entries(attributes).filter(([, values]) => values.length > 0)
      )
    : {};
  if (Object.keys(active).length > 0) {
    params.set('attributes', JSON.stringify(active));
  }
  const data = await getJson(`/api/market/nfts?${params.toString()}`, signal);
  const parsed = (data ?? {}) as {
    items?: MarketNft[];
    next?: string | null;
    error?: boolean;
    provenance?: OriginalDataProvenance;
  };
  // An upstream failure must never be shown as "no listed items"; surface it as
  // an error so the empty-state copy stays truthful.
  if (parsed.error) throw new MarketFetchError('Upstream NFT data unavailable');
  return { items: parsed.items ?? [], next: parsed.next ?? null, provenance: parsed.provenance };
}

export async function fetchOriginalGroupsPage(slug:string,next:string|null,attributes?:SelectedTraits,query='',sort='collection',signal?:AbortSignal):Promise<NftsPage> {
  const params=new URLSearchParams({slug,q:query,sort});
  if(next)params.set('next',next);
  if(attributes)params.set('attributes',JSON.stringify(attributes));
  const data=await getJson(`/api/market/product-groups?${params}`, signal) as NftsPage & {error?:boolean};
  if(data.error)throw new MarketFetchError('Grouped catalog unavailable');
  return data;
}

export async function fetchTraits(slug: string, signal?: AbortSignal): Promise<TraitCategory[]> {
  const data = await getJson(`/api/market/traits?slug=${encodeURIComponent(slug)}`, signal);
  const categories =
    data && typeof data === 'object' && 'categories' in data
      ? (data as { categories?: TraitCategory[] }).categories
      : undefined;
  return categories ?? [];
}

export async function fetchItem(args: {
  slug: string;
  identifier: string;
  contract?: string;
  chain?: string;
}, signal?: AbortSignal): Promise<MarketItem> {
  const params = new URLSearchParams({ slug: args.slug, identifier: args.identifier });
  if (args.contract) params.set('contract', args.contract);
  if (args.chain) params.set('chain', args.chain);
  const data = await getJson(`/api/market/item?${params.toString()}`, signal);
  const item =
    data && typeof data === 'object' && 'item' in data
      ? (data as { item?: MarketItem | null }).item
      : null;
  if (!item) throw new MarketFetchError('Item metadata unavailable');
  return item;
}

/**
 * One page of the ZERO custodial wallet's Z-Chain holdings. Takes the owner address
 * (the wallet whose items to show) and a cursor. An upstream failure is surfaced as
 * an error so the empty state never reads as "you hold nothing".
 */
export async function fetchHoldingsPage(
  owner: string,
  next: string | null,
  signal?: AbortSignal
): Promise<NftsPage> {
  const params = new URLSearchParams({ owner });
  if (next) params.set('next', next);
  const data = await getJson(`/api/market/holdings?${params.toString()}`, signal);
  const parsed = (data ?? {}) as { items?: MarketNft[]; next?: string | null; error?: boolean };
  if (parsed.error) throw new MarketFetchError('Your holdings are unavailable right now. Please try again.');
  return { items: parsed.items ?? [], next: parsed.next ?? null };
}

/**
 * One page of the signed-in user's Wilder World Ethereum holdings across all linked
 * EOAs. The route resolves the linked wallets from the ZERO session, so no address
 * is passed. An upstream failure is surfaced as an error, as above.
 */
export async function fetchEthHoldingsPage(next: string | null, signal?: AbortSignal): Promise<NftsPage> {
  const params = new URLSearchParams();
  if (next) params.set('next', next);
  const query = params.toString();
  const data = await getJson(`/api/market/eth-holdings${query ? `?${query}` : ''}`, signal);
  const parsed = (data ?? {}) as { items?: MarketNft[]; next?: string | null; error?: boolean };
  if (parsed.error) {
    throw new MarketFetchError('Your Ethereum holdings are unavailable right now. Please try again.');
  }
  return { items: parsed.items ?? [], next: parsed.next ?? null };
}
