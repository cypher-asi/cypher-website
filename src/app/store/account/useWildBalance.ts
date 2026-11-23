'use client';
import { useEffect, useState } from 'react';

export type WildBalanceState = {
  owner: string | null;
  balance: string | null; // atomic (18-decimal) integer string, or null
  status: 'idle' | 'loading' | 'ready' | 'error';
};

/**
 * Read-only WILD (Ethereum Mainnet) balance for one address, via our
 * `/api/market/wild-balance` route. Keyed to the address so an account/wallet
 * change cannot show a stale balance, and fails to `error` (never a synthetic 0)
 * so the bridge shows "unavailable" rather than inventing a balance.
 */
export function useWildBalance(address: string | null): WildBalanceState {
  const [state, setState] = useState<WildBalanceState>({ owner: address, balance: null, status: address ? 'loading' : 'idle' });
  useEffect(() => {
    if (!address) {
      setState({ owner: null, balance: null, status: 'idle' });
      return;
    }
    const controller = new AbortController();
    setState({ owner: address, balance: null, status: 'loading' });
    fetch(`/api/market/wild-balance?address=${encodeURIComponent(address)}`, { signal: controller.signal })
      .then(async (res) => {
        const body = (await res.json().catch(() => ({}))) as { balance?: string; error?: string };
        if (controller.signal.aborted) return;
        if (!res.ok || typeof body.balance !== 'string') throw new Error(body.error ?? 'Balance unavailable');
        setState({ owner: address, balance: body.balance, status: 'ready' });
      })
      .catch(() => {
        if (!controller.signal.aborted) setState({ owner: address, balance: null, status: 'error' });
      });
    return () => controller.abort();
  }, [address]);
  return state;
}
