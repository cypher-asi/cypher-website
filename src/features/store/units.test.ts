import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import { expandCartToUnits, settlementId, type PricedLine } from './units';

// Vectors pinned to the Ethereum keccak256 of the exact UTF-8 string the mint
// service hashes. Independently computed; they guard against a silent switch to a
// different hash (e.g. NIST SHA3) or encoding.
const VECTORS = {
  'pi_test:0:0': '0x0e758972a9eecdab546a72f7ea26395cfbe2525670e1ac1f0ce5e953cce22351',
  'pi_test:0:1': '0xbd5431037d1e7dc89371b3d668fd268d99e3e1fde5d9e18c0956a0126e63301b',
  'pi_test:1:0': '0x95b356a7c5ede45702856523b793c6864357ed9277a68cacf07f4793f1a13ec6',
} as const;

describe('settlementId', () => {
  it('matches the pinned keccak256 vectors for "<pi>:<line>:<unit>"', () => {
    expect(settlementId('pi_test', 0, 0)).toBe(VECTORS['pi_test:0:0']);
    expect(settlementId('pi_test', 0, 1)).toBe(VECTORS['pi_test:0:1']);
    expect(settlementId('pi_test', 1, 0)).toBe(VECTORS['pi_test:1:0']);
  });

  it('is a 0x-prefixed 32-byte hex string', () => {
    expect(settlementId('pi_abc', 2, 3)).toMatch(/^0x[0-9a-fA-F]{64}$/);
  });

  it('is deterministic (same inputs always give the same id)', () => {
    expect(settlementId('pi_abc', 1, 2)).toBe(settlementId('pi_abc', 1, 2));
  });

  it('differs for a different line, unit, or payment intent', () => {
    const base = settlementId('pi_abc', 0, 0);
    expect(settlementId('pi_abc', 1, 0)).not.toBe(base); // different line
    expect(settlementId('pi_abc', 0, 1)).not.toBe(base); // different unit
    expect(settlementId('pi_xyz', 0, 0)).not.toBe(base); // different intent
  });
});

describe('expandCartToUnits', () => {
  it('returns no units for an empty bag', () => {
    expect(expandCartToUnits('pi_test', [])).toEqual([]);
  });

  it('expands a single quantity-1 line to one unit', () => {
    const lines: PricedLine[] = [
      { productId: 'jckt-1', variantId: 'red', quantity: 1, priceCents: 5000 },
    ];
    expect(expandCartToUnits('pi_test', lines)).toEqual([
      {
        lineIndex: 0,
        unitIndex: 0,
        productId: 'jckt-1',
        variantId: 'red',
        priceCents: 5000,
        settlementId: VECTORS['pi_test:0:0'],
      },
    ]);
  });

  it('expands quantity N to N units with distinct settlementIds (the quantity > 1 fix)', () => {
    const lines: PricedLine[] = [
      { productId: 'jckt-1', variantId: 'red', quantity: 3, priceCents: 5000 },
    ];
    const units = expandCartToUnits('pi_test', lines);
    expect(units).toHaveLength(3);
    expect(units.map((u) => u.unitIndex)).toEqual([0, 1, 2]);
    // Same edition, three units: three DISTINCT ids, never a collision.
    const ids = new Set(units.map((u) => u.settlementId));
    expect(ids.size).toBe(3);
    // Every unit carries the line's price for a per-unit refund.
    expect(units.every((u) => u.priceCents === 5000)).toBe(true);
  });

  it('keeps lineIndex aligned to the details.lines array across multiple lines', () => {
    const lines: PricedLine[] = [
      { productId: 'jckt-1', variantId: 'red', quantity: 2, priceCents: 5000 },
      { productId: 'tee-9', variantId: 'blue', quantity: 1, priceCents: 2500 },
    ];
    const units = expandCartToUnits('pi_test', lines);
    expect(units).toHaveLength(3);
    expect(units.map((u) => [u.lineIndex, u.unitIndex])).toEqual([
      [0, 0],
      [0, 1],
      [1, 0],
    ]);
    expect(units[2]).toMatchObject({ productId: 'tee-9', variantId: 'blue', priceCents: 2500 });
    // All ids across the whole bag are unique.
    expect(new Set(units.map((u) => u.settlementId)).size).toBe(3);
  });

  it('fails loud on an invalid quantity (a paid order must never mis-expand silently)', () => {
    for (const bad of [0, -1, 1.5, Number.NaN]) {
      const lines: PricedLine[] = [
        { productId: 'jckt-1', variantId: 'red', quantity: bad, priceCents: 5000 },
      ];
      expect(() => expandCartToUnits('pi_test', lines)).toThrow(/invalid quantity/i);
    }
  });
});
