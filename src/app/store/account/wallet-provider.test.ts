import { describe, expect, it } from 'vitest';
import { walletAddress, walletMessageHex, siweExpiry } from './wallet-provider';

describe('walletAddress', () => {
  it('lowercases a valid address and rejects junk/zero', () => {
    expect(walletAddress('0xABC0000000000000000000000000000000000001')).toBe(
      '0xabc0000000000000000000000000000000000001',
    );
    expect(walletAddress('0x0000000000000000000000000000000000000000')).toBeNull();
    expect(walletAddress('not-an-address')).toBeNull();
    expect(walletAddress(42)).toBeNull();
  });
});

describe('walletMessageHex', () => {
  it('UTF-8 hex-encodes with a 0x prefix', () => {
    expect(walletMessageHex('hi')).toBe('0x6869');
  });
});

describe('siweExpiry', () => {
  it('parses the Expiration Time line to a timestamp', () => {
    const message = [
      'example.com wants you to sign in with your Ethereum account:',
      '0xabc',
      '',
      'Link this wallet to your ZERO account',
      '',
      'Nonce: abc',
      'Issued At: 2026-11-16T00:00:00.000Z',
      'Expiration Time: 2026-11-16T00:05:00.000Z',
    ].join('\n');
    expect(siweExpiry(message)).toBe(Date.parse('2026-11-16T00:05:00.000Z'));
  });

  it('returns null when the line is absent or unparseable', () => {
    expect(siweExpiry('no expiry here')).toBeNull();
    expect(siweExpiry('Expiration Time: not-a-date')).toBeNull();
  });
});
