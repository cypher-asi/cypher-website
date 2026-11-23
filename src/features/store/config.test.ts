import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

// Toggleable stand-ins for the approval pricebook and the catalog lookup, so one
// file can cover both the fail-closed default and the approved path. config.ts
// reads the flags at call time, so mutating these fields between tests is enough.
const state = vi.hoisted(() => ({
  approval: {
    productionPriceApproved: false,
    checkoutEnabled: false,
    products: {} as Record<string, { priceCents: number }>,
  },
  product: null as null | { name: string; variants: { id: string }[] },
}));

vi.mock('@/sites/wilderworld/marketplace/preview-prices.json', () => ({ default: state.approval }));
vi.mock('@/sites/wilderworld/marketplace/catalog', () => ({ findMarketProduct: () => state.product }));

import {
  StoreCheckoutError,
  resolveProductPurchase,
  storeCheckoutApproved,
  storeMintUrl,
  storeMintApiKey,
} from './config';

function thrown(fn: () => unknown): StoreCheckoutError {
  try {
    fn();
  } catch (err) {
    return err as StoreCheckoutError;
  }
  throw new Error('expected the call to throw, but it did not');
}

beforeEach(() => {
  state.approval.productionPriceApproved = false;
  state.approval.checkoutEnabled = false;
  state.approval.products = {};
  state.product = null;
});

describe('storeCheckoutApproved', () => {
  it('is false unless BOTH production prices are approved and checkout is enabled', () => {
    expect(storeCheckoutApproved()).toBe(false);
    state.approval.productionPriceApproved = true;
    expect(storeCheckoutApproved()).toBe(false); // checkout still switched off
    state.approval.checkoutEnabled = true;
    expect(storeCheckoutApproved()).toBe(true);
  });
});

describe('resolveProductPurchase', () => {
  it('fail-closes with 503 while checkout is not approved, so a preview price is never charged', () => {
    // A fully valid product + price must STILL be refused while the gate is shut.
    state.product = { name: 'Jacket', variants: [{ id: 'red' }] };
    state.approval.products = { 'jckt-1': { priceCents: 5000 } };
    const err = thrown(() => resolveProductPurchase('jckt-1', 'red'));
    expect(err).toBeInstanceOf(StoreCheckoutError);
    expect(err.status).toBe(503);
    expect(err.code).toBe('CHECKOUT_DISABLED');
  });

  describe('once checkout is approved', () => {
    beforeEach(() => {
      state.approval.productionPriceApproved = true;
      state.approval.checkoutEnabled = true;
    });

    it('returns the server-side approved price for a known product + variant', () => {
      state.product = { name: 'Jacket', variants: [{ id: 'red' }, { id: 'blue' }] };
      state.approval.products = { 'jckt-1': { priceCents: 5000 } };
      expect(resolveProductPurchase('jckt-1', 'blue')).toEqual({
        productId: 'jckt-1',
        variantId: 'blue',
        name: 'Jacket',
        priceCents: 5000,
      });
    });

    it('rejects an unknown product with 400', () => {
      state.product = null;
      const err = thrown(() => resolveProductPurchase('nope', 'red'));
      expect(err.status).toBe(400);
      expect(err.code).toBe('UNKNOWN_PRODUCT');
    });

    it('rejects an unknown variant with 400', () => {
      state.product = { name: 'Jacket', variants: [{ id: 'red' }] };
      state.approval.products = { 'jckt-1': { priceCents: 5000 } };
      const err = thrown(() => resolveProductPurchase('jckt-1', 'green'));
      expect(err.status).toBe(400);
      expect(err.code).toBe('UNKNOWN_VARIANT');
    });

    it('rejects a product with no approved price (a placeholder is not chargeable)', () => {
      state.product = { name: 'Jacket', variants: [{ id: 'red' }] };
      state.approval.products = {};
      const err = thrown(() => resolveProductPurchase('jckt-1', 'red'));
      expect(err.status).toBe(400);
      expect(err.code).toBe('PRICE_NOT_APPROVED');
    });

    it('rejects a non-positive approved price', () => {
      state.product = { name: 'Jacket', variants: [{ id: 'red' }] };
      state.approval.products = { 'jckt-1': { priceCents: 0 } };
      const err = thrown(() => resolveProductPurchase('jckt-1', 'red'));
      expect(err.status).toBe(400);
      expect(err.code).toBe('PRICE_NOT_APPROVED');
    });
  });
});

describe('store mint service readers', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('storeMintUrl fails loud (503) when STORE_MINT_URL is unset', () => {
    vi.stubEnv('STORE_MINT_URL', '');
    const err = thrown(() => storeMintUrl());
    expect(err).toBeInstanceOf(StoreCheckoutError);
    expect(err.status).toBe(503);
  });

  it('storeMintUrl returns the base URL with trailing slashes stripped', () => {
    vi.stubEnv('STORE_MINT_URL', 'https://store-tx-testnet.wilderworldinfra.net//');
    expect(storeMintUrl()).toBe('https://store-tx-testnet.wilderworldinfra.net');
  });

  it('storeMintApiKey fails loud (503) when STORE_MINT_API_KEY is unset', () => {
    vi.stubEnv('STORE_MINT_API_KEY', '');
    const err = thrown(() => storeMintApiKey());
    expect(err).toBeInstanceOf(StoreCheckoutError);
    expect(err.status).toBe(503);
  });

  it('storeMintApiKey returns the key when set', () => {
    vi.stubEnv('STORE_MINT_API_KEY', 'sk-test-store-mint');
    expect(storeMintApiKey()).toBe('sk-test-store-mint');
  });
});
