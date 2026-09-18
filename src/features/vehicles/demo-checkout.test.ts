import { describe, it, expect, vi, afterEach } from 'vitest';
import { isDemoCheckout } from './demo-checkout';

afterEach(() => vi.unstubAllEnvs());

/**
 * The walkthrough stands in for a purchase that cannot complete, because the
 * contract does not exist yet. Turning it off is what makes the pay button take
 * real money, so every ambiguous value has to leave it on: the damage runs one
 * way only.
 */
describe('isDemoCheckout', () => {
  it('walks through by default, when nothing is configured', () => {
    vi.stubEnv('NEXT_PUBLIC_VEHICLES_DEMO_CHECKOUT', undefined as unknown as string);
    expect(isDemoCheckout()).toBe(true);
  });

  it('takes the real path only when explicitly told to', () => {
    vi.stubEnv('NEXT_PUBLIC_VEHICLES_DEMO_CHECKOUT', 'false');
    expect(isDemoCheckout()).toBe(false);
  });

  it.each(['', ' ', 'FALSE', 'False', 'no', 'off', '0', 'true'])(
    'stays on the walkthrough for %j, rather than guessing',
    (value) => {
      // A typo or a half-set variable must never be the thing that starts
      // charging cards for a vehicle nobody can mint.
      vi.stubEnv('NEXT_PUBLIC_VEHICLES_DEMO_CHECKOUT', value);
      expect(isDemoCheckout()).toBe(true);
    },
  );
});
