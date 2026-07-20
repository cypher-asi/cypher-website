import { describe, expect, it } from 'vitest';
import type { MarketNft } from '@/lib/opensea';
import {
  processingMarkerId,
  selectMarkerFor,
  type ProcessingMarker,
} from './processingStore';

function marker(over: Partial<ProcessingMarker>): ProcessingMarker {
  const base: ProcessingMarker = {
    markerId: '',
    contract: '0xAbC',
    tokenId: '7',
    collectionSlug: 'wilder-wheels',
    action: 'list',
    txHash: '0xtx',
    createdAt: 0,
    expiresAt: 0,
    timedOut: false,
  };
  const m = { ...base, ...over };
  m.markerId = processingMarkerId(m.contract, m.tokenId, m.listingId);
  return m;
}

function nft(over: Partial<MarketNft>): MarketNft {
  return {
    identifier: '7',
    name: '#7',
    image: null,
    collectionSlug: 'wilder-wheels',
    contract: '0xabc',
    chain: 'zchain',
    priceEth: null,
    traits: [],
    ...over,
  } as MarketNft;
}

const byId = (m: ProcessingMarker) => ({ [m.markerId]: m });

describe('selectMarkerFor', () => {
  it('matches on contract + token, case-insensitively on contract', () => {
    const m = marker({ contract: '0xABC', tokenId: '7' });
    expect(selectMarkerFor(byId(m), nft({ contract: '0xabc', identifier: '7' }))).toBe(m);
  });

  it('does not match a different token', () => {
    const m = marker({ tokenId: '7' });
    expect(selectMarkerFor(byId(m), nft({ identifier: '8' }))).toBeUndefined();
  });

  it('a held marker (list) matches only the held card, not the listing card', () => {
    const m = marker({ action: 'list', listingId: undefined });
    expect(selectMarkerFor(byId(m), nft({ listingId: undefined }))).toBe(m);
    expect(selectMarkerFor(byId(m), nft({ listingId: '99' }))).toBeUndefined();
  });

  it('a listing marker (buy/cancel) matches only that listing, not the held card', () => {
    const m = marker({ action: 'cancel', listingId: '99' });
    expect(selectMarkerFor(byId(m), nft({ listingId: '99' }))).toBe(m);
    expect(selectMarkerFor(byId(m), nft({ listingId: undefined }))).toBeUndefined();
    // A different listing (e.g. a bundle of the same token) is not overlaid.
    expect(selectMarkerFor(byId(m), nft({ listingId: '100' }))).toBeUndefined();
  });
});
