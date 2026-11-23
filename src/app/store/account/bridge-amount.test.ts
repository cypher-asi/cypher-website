import { describe, expect, it } from 'vitest';
import { bridgeWildAmount, formatWild } from './bridge-amount';

describe('bridgeWildAmount', () => {
  it('converts whole and fractional WILD to atomic (18 decimals) integer strings', () => {
    expect(bridgeWildAmount('1')).toBe('1000000000000000000');
    expect(bridgeWildAmount('100.125')).toBe('100125000000000000000');
    expect(bridgeWildAmount('0.000000000000000001')).toBe('1');
    expect(bridgeWildAmount(' 2.5 ')).toBe('2500000000000000000');
  });

  it('rejects zero, empty and non-numeric input', () => {
    expect(bridgeWildAmount('0')).toBeNull();
    expect(bridgeWildAmount('0.0')).toBeNull();
    expect(bridgeWildAmount('')).toBeNull();
    expect(bridgeWildAmount('abc')).toBeNull();
    expect(bridgeWildAmount('-1')).toBeNull();
    expect(bridgeWildAmount('1e18')).toBeNull();
  });

  it('rejects more than 18 fractional decimals', () => {
    expect(bridgeWildAmount('1.1234567890123456789')).toBeNull();
    expect(bridgeWildAmount('1.123456789012345678')).toBe('1123456789012345678');
  });

  it('stays within uint256 bounds', () => {
    // 60-digit whole -> atomic (x1e18) exceeds 2^256, so rejected.
    expect(bridgeWildAmount('9'.repeat(60))).toBeNull();
    // Over 60 digits is rejected by the pattern before conversion.
    expect(bridgeWildAmount('9'.repeat(61))).toBeNull();
  });
});

describe('formatWild', () => {
  it('formats atomic WILD with thousands separators and trimmed decimals', () => {
    expect(formatWild('1000000000000000000')).toBe('1');
    expect(formatWild('1500000000000000000')).toBe('1.5');
    expect(formatWild('1234560000000000000000')).toBe('1,234.56');
    expect(formatWild('1000000000000000000000000')).toBe('1,000,000');
    expect(formatWild('0')).toBe('0');
  });

  it('trims to at most 4 decimal places', () => {
    expect(formatWild('1123456789000000000')).toBe('1.1234');
  });
});
