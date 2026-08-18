import { describe, it, expect } from 'vitest';
import { navConnectContext } from './navConnect';

describe('navConnectContext', () => {
  it('marks the vehicle store and its sub-routes as "store"', () => {
    expect(navConnectContext('/vehicles')).toBe('store');
    expect(navConnectContext('/vehicles/ghostline')).toBe('store');
    expect(navConnectContext('/vehicles/ghostline/checkout')).toBe('store');
  });

  it('marks the market and its sub-routes as "market"', () => {
    expect(navConnectContext('/market')).toBe('market');
    expect(navConnectContext('/market/land-604')).toBe('market');
  });

  it('hides the button on every other route', () => {
    expect(navConnectContext('/')).toBeNull();
    expect(navConnectContext('/universe')).toBeNull();
    expect(navConnectContext('/marketing')).toBeNull(); // prefix guard: not the market
    expect(navConnectContext(null)).toBeNull();
  });
});
