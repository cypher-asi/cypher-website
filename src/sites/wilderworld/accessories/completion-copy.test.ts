import { describe, expect, it } from 'vitest';

import { completionCopy } from './completion-copy';

describe('completionCopy', () => {
  it('tells a delivered buyer the items are already in their wallet', () => {
    expect(completionCopy('delivered', 1).body).toBe('Your item is in your ZERO wallet.');
    expect(completionCopy('delivered', 3).body).toBe('Your 3 items are in your ZERO wallet.');
  });

  it('tells a pending (undelivered) buyer the items are on the way', () => {
    expect(completionCopy('undelivered', 2).body).toMatch(/will arrive in your ZERO wallet shortly/i);
  });

  it('is honest that a refunded order was unavailable and the money is back', () => {
    const copy = completionCopy('refunded', 1);
    expect(copy.heading).toMatch(/refund/i);
    expect(copy.body).toMatch(/unavailable/i);
    expect(copy.body).toMatch(/refunded/i);
  });

  it('flags a refund_failed order for a person and never promises delivery', () => {
    const copy = completionCopy('refund_failed', 1);
    expect(copy.body).not.toMatch(/arrive|in your ZERO wallet/i);
    expect(copy.body).toMatch(/team/i);
  });

  it('falls back to the safe still-arriving wording for an unexpected status', () => {
    expect(completionCopy('paid', 1).body).toMatch(/will arrive in your ZERO wallet shortly/i);
  });
});
