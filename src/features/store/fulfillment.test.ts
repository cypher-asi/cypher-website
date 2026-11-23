import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import {
  aggregateStatus,
  dispositionForMint,
  dispositionForResolveError,
  type UnitDeliveryStatus,
} from './fulfillment';
import type { MintLineResult } from './mint';

function result(over: Partial<MintLineResult>): MintLineResult {
  return {
    settlementId: `0x${'0'.repeat(64)}`,
    editionId: `0x${'a'.repeat(64)}`,
    recipient: `0x${'1'.repeat(40)}`,
    status: 'minted',
    reason: null,
    transactionHash: null,
    tokenId: null,
    error: null,
    ...over,
  };
}

describe('dispositionForMint (the §6 matrix)', () => {
  it('delivers minted and already_settled, carrying tx + tokenId', () => {
    expect(dispositionForMint(result({ status: 'minted', transactionHash: '0xtx', tokenId: '42' }))).toEqual({
      disposition: 'delivered',
      reason: null,
      transactionHash: '0xtx',
      tokenId: '42',
    });
    expect(dispositionForMint(result({ status: 'already_settled' })).disposition).toBe('delivered');
  });

  it('refunds ONLY on sold_out and unknown_edition', () => {
    expect(dispositionForMint(result({ status: 'failed', reason: 'sold_out' })).disposition).toBe('refund');
    expect(dispositionForMint(result({ status: 'failed', reason: 'unknown_edition' })).disposition).toBe(
      'refund',
    );
  });

  it('retries (pending) on paused, mint_failed, a bare pending, and any unknown reason', () => {
    expect(dispositionForMint(result({ status: 'pending' })).disposition).toBe('pending');
    expect(dispositionForMint(result({ status: 'failed', reason: 'paused' })).disposition).toBe('pending');
    expect(dispositionForMint(result({ status: 'failed', reason: 'mint_failed' })).disposition).toBe('pending');
    // A failed line with no reason must NEVER be refunded.
    expect(dispositionForMint(result({ status: 'failed', reason: null })).disposition).toBe('pending');
  });

  it('sends invalid_recipient to review (never an auto-refund)', () => {
    expect(dispositionForMint(result({ status: 'failed', reason: 'invalid_recipient' })).disposition).toBe(
      'review',
    );
  });
});

describe('dispositionForResolveError', () => {
  it('refunds an unknown edition (catalogue mismatch)', () => {
    expect(dispositionForResolveError('UNKNOWN_EDITION').disposition).toBe('refund');
  });

  it('reviews a malformed edition id and never refunds a missing catalogue (our fault, not the buyer\'s)', () => {
    expect(dispositionForResolveError('MALFORMED_EDITION_ID').disposition).toBe('review');
    expect(dispositionForResolveError('CATALOGUE_NOT_CONFIGURED').disposition).toBe('pending');
    expect(dispositionForResolveError(undefined).disposition).toBe('pending');
  });
});

describe('aggregateStatus (order header from unit statuses)', () => {
  const cases: Array<[UnitDeliveryStatus[], string]> = [
    [['delivered', 'delivered'], 'delivered'],
    [['refunded', 'refunded'], 'refunded'],
    [['delivered', 'refunded'], 'delivered'], // partial sell-out: buyer got something
    [['delivered', 'pending'], 'undelivered'], // not all settled
    [['delivered', 'review'], 'undelivered'], // needs a person
    [['refunded', 'refund_failed'], 'refund_failed'], // money stuck wins
    [['delivered', 'refund_failed'], 'refund_failed'],
    [['pending', 'refund_failed'], 'refund_failed'], // refund_failed outranks pending
  ];

  it.each(cases)('maps %j to %s', (statuses, expected) => {
    expect(aggregateStatus(statuses)).toBe(expected);
  });
});
