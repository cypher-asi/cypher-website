import type { MarketNft } from '@/lib/opensea';
import type { MarketCollection } from '@/app/api/market/collections/route';
import type { MarketItem } from '@/app/api/market/item/route';
import type { TraitCategory } from '@/app/api/market/traits/route';
import type { Availability, SelectedTraits } from '../types';

export type NftsPage = {
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

async function getJson(url: string): Promise<unknown> {
  const res = await fetch(url);
  if (!res.ok) throw new MarketFetchError(`Request failed (${res.status})`);
  return res.json();
}

export async function fetchCollections(): Promise<Record<string, MarketCollection>> {
  const data = await getJson('/api/market/collections');
  const collections =
    data && typeof data === 'object' && 'collections' in data
      ? (data as { collections?: MarketCollection[] }).collections
      : undefined;
  const byId: Record<string, MarketCollection> = {};
  for (const c of collections ?? []) byId[c.slug] = c;
  return byId;
}

export async function fetchEthPrice(): Promise<number | null> {
  const data = await getJson('/api/market/eth-price');
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
  owner?: string | null
): Promise<NftsPage> {
  const params = new URLSearchParams({ slug, status: availability });
  if (next) params.set('next', next);
  // "Yours" reads the connected wallet's holdings.
  if (availability === 'yours' && owner) params.set('owner', owner);
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
  const data = await getJson(`/api/market/nfts?${params.toString()}`);
  const parsed = (data ?? {}) as {
    items?: MarketNft[];
    next?: string | null;
    error?: boolean;
  };
  // An upstream failure must never be shown as "no listed items"; surface it as
  // an error so the empty-state copy stays truthful.
  if (parsed.error) throw new MarketFetchError('Upstream NFT data unavailable');
  return { items: parsed.items ?? [], next: parsed.next ?? null };
}

/** A page of the connected wallet's holdings across all tradeable Z-Chain
 *  collections (the consolidated "Your Holdings" view). */
export async function fetchHoldingsPage(owner: string, next: string | null): Promise<NftsPage> {
  const params = new URLSearchParams({ owner });
  if (next) params.set('next', next);
  const data = await getJson(`/api/market/holdings?${params.toString()}`);
  const parsed = (data ?? {}) as { items?: MarketNft[]; next?: string | null; error?: boolean };
  if (parsed.error) throw new MarketFetchError('Holdings data unavailable');
  return { items: parsed.items ?? [], next: parsed.next ?? null };
}

/** Total held items across the tradeable collections — the wallet-panel badge. */
export async function fetchHoldingsCount(owner: string): Promise<number> {
  const data = await getJson(`/api/market/holdings?owner=${encodeURIComponent(owner)}&count=1`);
  const parsed = (data ?? {}) as { total?: number };
  return typeof parsed.total === 'number' ? parsed.total : 0;
}

/**
 * The signed-in user's Wilder World ETH-mainnet holdings across their linked
 * EOAs. No owner param — the route resolves the linked wallets from the ZERO
 * session (the browser sends the httpOnly cookie automatically).
 */
export async function fetchEthHoldingsPage(next: string | null): Promise<NftsPage> {
  const params = new URLSearchParams();
  if (next) params.set('next', next);
  const qs = params.toString();
  const data = await getJson(`/api/market/eth-holdings${qs ? `?${qs}` : ''}`);
  const parsed = (data ?? {}) as { items?: MarketNft[]; next?: string | null; error?: boolean };
  if (parsed.error) throw new MarketFetchError('ETH holdings data unavailable');
  return { items: parsed.items ?? [], next: parsed.next ?? null };
}

/** Total ETH-mainnet held items across linked EOAs — the wallet-panel badge. */
export async function fetchEthHoldingsCount(): Promise<number> {
  const data = await getJson(`/api/market/eth-holdings?count=1`);
  const parsed = (data ?? {}) as { total?: number };
  return typeof parsed.total === 'number' ? parsed.total : 0;
}

export async function fetchTraits(slug: string): Promise<TraitCategory[]> {
  const data = await getJson(`/api/market/traits?slug=${encodeURIComponent(slug)}`);
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
}): Promise<MarketItem> {
  const params = new URLSearchParams({ slug: args.slug, identifier: args.identifier });
  if (args.contract) params.set('contract', args.contract);
  if (args.chain) params.set('chain', args.chain);
  const data = await getJson(`/api/market/item?${params.toString()}`);
  const item =
    data && typeof data === 'object' && 'item' in data
      ? (data as { item?: MarketItem | null }).item
      : null;
  if (!item) throw new MarketFetchError('Item metadata unavailable');
  return item;
}
