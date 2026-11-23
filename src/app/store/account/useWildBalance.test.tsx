import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useWildBalance } from './useWildBalance';

function mockBalance(balance: string | null, ok = true) {
  vi.stubGlobal('fetch', vi.fn(async () => ({ ok, json: async () => (balance !== null ? { balance } : { error: 'nope' }) }) as Response));
}
afterEach(() => vi.unstubAllGlobals());

describe('useWildBalance', () => {
  it('is idle and fetches nothing without an address', () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    const { result } = renderHook(() => useWildBalance(null));
    expect(result.current.status).toBe('idle');
    expect(result.current.balance).toBeNull();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('loads then returns the atomic balance', async () => {
    mockBalance('1000000000000000000');
    const { result } = renderHook(() => useWildBalance('0xabc'));
    expect(result.current.status).toBe('loading');
    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(result.current.balance).toBe('1000000000000000000');
  });

  it('fails to error, never a synthetic zero', async () => {
    mockBalance(null, false);
    const { result } = renderHook(() => useWildBalance('0xabc'));
    await waitFor(() => expect(result.current.status).toBe('error'));
    expect(result.current.balance).toBeNull();
  });
});
