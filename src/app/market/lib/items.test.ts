import { describe, expect, it } from 'vitest';
import type { MarketNft } from '@/lib/opensea';
import {
  countSelectedTraits,
  dedupeItems,
  filterByTraits,
  itemKey,
  shortId,
} from './items';

function nft(overrides: Partial<MarketNft> = {}): MarketNft {
  return {
    identifier: '1',
    name: 'Token 1',
    image: null,
    collectionSlug: 'wilder',
    contract: '0xabc',
    chain: 'ethereum',
    priceEth: null,
    traits: [],
    ...overrides,
  };
}

describe('itemKey', () => {
  it('combines contract and identifier', () => {
    expect(itemKey(nft({ contract: '0xdef', identifier: '9' }))).toBe('0xdef-9');
  });
});

describe('shortId', () => {
  it('returns short ids unchanged', () => {
    expect(shortId('12345')).toBe('12345');
  });

  it('collapses the middle of long ids', () => {
    expect(shortId('123456789012345')).toBe('123456…2345');
  });
});

describe('dedupeItems', () => {
  it('keeps the first occurrence of each token', () => {
    const list = [
      nft({ identifier: '1' }),
      nft({ identifier: '1' }),
      nft({ identifier: '2' }),
    ];
    const out = dedupeItems(list);
    expect(out).toHaveLength(2);
    expect(out.map((n) => n.identifier)).toEqual(['1', '2']);
  });
});

describe('filterByTraits', () => {
  const items = [
    nft({ identifier: '1', traits: [{ type: 'Color', value: 'Red' }] }),
    nft({ identifier: '2', traits: [{ type: 'Color', value: 'Blue' }] }),
    nft({
      identifier: '3',
      traits: [
        { type: 'Color', value: 'Red' },
        { type: 'Size', value: 'Large' },
      ],
    }),
  ];

  it('returns all items when nothing selected', () => {
    expect(filterByTraits(items, {})).toHaveLength(3);
  });

  it('applies OR within a single trait type', () => {
    const out = filterByTraits(items, { Color: ['Red', 'Blue'] });
    expect(out.map((n) => n.identifier)).toEqual(['1', '2', '3']);
  });

  it('applies AND across trait types', () => {
    const out = filterByTraits(items, { Color: ['Red'], Size: ['Large'] });
    expect(out.map((n) => n.identifier)).toEqual(['3']);
  });
});

describe('countSelectedTraits', () => {
  it('sums selected values across types', () => {
    expect(countSelectedTraits({ Color: ['Red', 'Blue'], Size: ['Large'] })).toBe(3);
  });
});
