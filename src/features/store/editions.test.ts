import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import { resolveEditionId, resolveEditionIdFrom, type CatalogueEdition } from './editions';
import { StoreCheckoutError } from './config';
import catalogueIds from './catalogue-ids.json';

function thrown(fn: () => unknown): StoreCheckoutError {
  try {
    fn();
  } catch (err) {
    return err as StoreCheckoutError;
  }
  throw new Error('expected the call to throw, but it did not');
}

const EDITION = '0x' + 'a'.repeat(64);
const OTHER_EDITION = '0x' + 'b'.repeat(64);

const CATALOGUE: CatalogueEdition[] = [
  { sourceId: 'jckt-1', colorway: 'red', editionId: EDITION, cap: 100, uri: 'ipfs://x' },
  { sourceId: 'jckt-1', colorway: 'blue', editionId: OTHER_EDITION },
];

describe('resolveEditionIdFrom', () => {
  it('returns the editionId for a matching product + variant', () => {
    expect(resolveEditionIdFrom(CATALOGUE, 'jckt-1', 'red')).toBe(EDITION);
    expect(resolveEditionIdFrom(CATALOGUE, 'jckt-1', 'blue')).toBe(OTHER_EDITION);
  });

  it('fail-closes with 503 CATALOGUE_NOT_CONFIGURED while the edition set is empty', () => {
    const err = thrown(() => resolveEditionIdFrom([], 'jckt-1', 'red'));
    expect(err.status).toBe(503);
    expect(err.code).toBe('CATALOGUE_NOT_CONFIGURED');
  });

  it('rejects an unknown product/variant with 400 UNKNOWN_EDITION', () => {
    expect(thrown(() => resolveEditionIdFrom(CATALOGUE, 'nope', 'red')).code).toBe('UNKNOWN_EDITION');
    // Right product, wrong colorway, is still a mismatch (both must match).
    expect(thrown(() => resolveEditionIdFrom(CATALOGUE, 'jckt-1', 'green')).code).toBe(
      'UNKNOWN_EDITION',
    );
  });

  it('rejects a malformed editionId with 500 MALFORMED_EDITION_ID', () => {
    const bad: CatalogueEdition[] = [{ sourceId: 'jckt-1', colorway: 'red', editionId: '0x1234' }];
    const err = thrown(() => resolveEditionIdFrom(bad, 'jckt-1', 'red'));
    expect(err.status).toBe(500);
    expect(err.code).toBe('MALFORMED_EDITION_ID');
  });
});

describe('resolveEditionId (against the committed catalogue-ids.json)', () => {
  const editions = (catalogueIds as { editions: CatalogueEdition[] }).editions;

  it('resolves a real product + variant from the populated catalogue', () => {
    // The real catalogue is dropped in. Every entry must resolve to its own id.
    expect(editions.length).toBeGreaterThan(0);
    const first = editions[0];
    expect(resolveEditionId(first.sourceId, first.colorway)).toBe(first.editionId);
    const last = editions[editions.length - 1];
    expect(resolveEditionId(last.sourceId, last.colorway)).toBe(last.editionId);
  });

  it('rejects an unknown product/variant with 400 UNKNOWN_EDITION', () => {
    const err = thrown(() => resolveEditionId('definitely-not-a-product', 'nope'));
    expect(err).toBeInstanceOf(StoreCheckoutError);
    expect(err.code).toBe('UNKNOWN_EDITION');
  });
});
