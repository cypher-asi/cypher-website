import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('server-only', () => ({}));

// getStripe memoizes a module-level client, so each test gets a fresh module to
// keep them order-independent.
beforeEach(() => {
  vi.resetModules();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('getStripe', () => {
  it('throws 503 when the secret key is not configured', async () => {
    vi.stubEnv('STRIPE_SECRET_KEY', '');
    const { getStripe } = await import('./stripe');
    const { StoreCheckoutError } = await import('./config');

    try {
      getStripe();
      throw new Error('expected getStripe to throw');
    } catch (err) {
      expect(err).toBeInstanceOf(StoreCheckoutError);
      expect((err as InstanceType<typeof StoreCheckoutError>).status).toBe(503);
    }
  });

  it('constructs a client from the key and memoizes it (constructed once)', async () => {
    vi.stubEnv('STRIPE_SECRET_KEY', 'sk_test_fake');
    const { getStripe } = await import('./stripe');

    const first = getStripe();
    const second = getStripe();

    expect(first).toBeDefined();
    expect(second).toBe(first); // same instance on the second call
  });
});
