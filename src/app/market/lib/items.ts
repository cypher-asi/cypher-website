import type { MarketNft } from '@/lib/opensea';
import type { SelectedTraits } from '../types';

/** Stable React key / dedupe identity for an NFT. */
export function itemKey(nft: MarketNft): string {
  return `${nft.contract}-${nft.identifier}`;
}

/**
 * Wilder token IDs are full uint256 values, far too long to fit a table cell.
 * Collapse the middle so the column stays aligned; the full value is kept in a
 * tooltip by the caller.
 */
export function shortId(id: string): string {
  return id.length > 11 ? `${id.slice(0, 6)}…${id.slice(-4)}` : id;
}

/**
 * Keep the first occurrence of each token. OpenSea can surface the same token
 * across paginated "load more" responses (and a token may carry more than one
 * listing), so appending pages blindly produces duplicate React keys — which
 * corrupts reconciliation and leaves stale cards behind on collection switch.
 */
export function dedupeItems(list: readonly MarketNft[]): MarketNft[] {
  const seen = new Set<string>();
  const out: MarketNft[] = [];
  for (const nft of list) {
    const key = itemKey(nft);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(nft);
  }
  return out;
}

/**
 * Client-side trait filter over already-loaded items. Semantics: AND across
 * trait types, OR within a single type (multi-select).
 */
export function filterByTraits(
  items: readonly MarketNft[],
  selected: SelectedTraits
): MarketNft[] {
  const active = Object.entries(selected).filter(([, values]) => values.length > 0);
  if (active.length === 0) return items.slice();
  return items.filter((nft) =>
    active.every(([type, values]) =>
      nft.traits.some((t) => t.type === type && values.includes(t.value))
    )
  );
}

/** Total number of selected trait values across all types. */
export function countSelectedTraits(selected: SelectedTraits): number {
  return Object.values(selected).reduce((n, values) => n + values.length, 0);
}
