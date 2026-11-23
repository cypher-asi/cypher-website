import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const h = vi.hoisted(() => ({ loadStripe: vi.fn() }));
vi.mock('@stripe/stripe-js', () => ({ loadStripe: h.loadStripe }));

// The loader memoizes a module-level promise, so each test re-imports the module
// fresh to exercise the first-call behaviour rather than a cached result.
async function freshLoader() {
  vi.resetModules();
  return (await import('./stripe-client')).getStripePromise;
}

const ORIGINAL_KEY = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;

beforeEach(() => {
  h.loadStripe.mockReset().mockReturnValue(Promise.resolve({ stripe: true }));
});

afterEach(() => {
  if (ORIGINAL_KEY === undefined) delete process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
  else process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY = ORIGINAL_KEY;
});

describe('getStripePromise', () => {
  it('loads Stripe.js with the publishable key when one is set', async () => {
    process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY = 'pk_test_123';
    const getStripePromise = await freshLoader();

    await getStripePromise();
    expect(h.loadStripe).toHaveBeenCalledWith('pk_test_123');
  });

  it('resolves to null without calling Stripe when the key is unset', async () => {
    delete process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
    const getStripePromise = await freshLoader();

    await expect(getStripePromise()).resolves.toBeNull();
    expect(h.loadStripe).not.toHaveBeenCalled();
  });

  it('memoizes: the loader runs once however many times it is called', async () => {
    process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY = 'pk_test_123';
    const getStripePromise = await freshLoader();

    const a = getStripePromise();
    const b = getStripePromise();
    expect(a).toBe(b); // same promise instance
    expect(h.loadStripe).toHaveBeenCalledTimes(1);
  });
});
