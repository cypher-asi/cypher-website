import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const loadStripe = vi.fn((key: string) => Promise.resolve({ key } as unknown));
vi.mock('@stripe/stripe-js', () => ({ loadStripe }));

beforeEach(() => {
  loadStripe.mockClear();
  vi.resetModules(); // reset the module-level memo between cases
});

afterEach(() => vi.unstubAllEnvs());

describe('getStripePromise', () => {
  it('loads Stripe with the publishable key and memoizes the promise', async () => {
    vi.stubEnv('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY', 'pk_test_123');
    const { getStripePromise } = await import('./stripe-client');

    const p1 = getStripePromise();
    const p2 = getStripePromise();

    expect(p1).toBe(p2); // memoized
    expect(loadStripe).toHaveBeenCalledExactlyOnceWith('pk_test_123');
  });

  it('resolves to null (no throw) when the key is unset', async () => {
    vi.stubEnv('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY', '');
    const { getStripePromise } = await import('./stripe-client');

    await expect(getStripePromise()).resolves.toBeNull();
    expect(loadStripe).not.toHaveBeenCalled();
  });
});
