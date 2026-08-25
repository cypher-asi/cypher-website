'use client';

import { useCallback, useEffect, useState } from 'react';
import type { LinkedAccount } from './zos';

const EPIC = 'epic-games';

export type EpicLinkStatus =
  | { kind: 'checking' }
  | { kind: 'linked'; handle: string | null }
  | { kind: 'unlinked' }
  /** The question could not be answered. Callers should show nothing. */
  | { kind: 'unavailable' };

async function fetchEpicLink(signal?: AbortSignal): Promise<LinkedAccount | null> {
  const res = await fetch('/api/auth/linked-accounts', { signal });
  if (!res.ok) throw new Error(String(res.status));
  const body = (await res.json()) as { accounts?: LinkedAccount[] };
  return body.accounts?.find((a) => a.providerName === EPIC) ?? null;
}

/**
 * Whether the signed-in ZERO account has an Epic Games account connected.
 *
 * Shared by the two places that need to know: the notice shown before paying,
 * and the offer to connect afterwards. Both stay silent when the answer is
 * `unavailable` — guessing "not connected" would talk to people about a problem
 * they do not have, on screens where being wrong is worse than being absent.
 */
export function useEpicLinkStatus() {
  const [status, setStatus] = useState<EpicLinkStatus>({ kind: 'checking' });

  const refresh = useCallback(async (signal?: AbortSignal) => {
    const epic = await fetchEpicLink(signal);
    setStatus(epic ? { kind: 'linked', handle: epic.handle } : { kind: 'unlinked' });
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    refresh(controller.signal).catch((err) => {
      if (controller.signal.aborted || (err as Error)?.name === 'AbortError') return;
      setStatus({ kind: 'unavailable' });
    });
    return () => controller.abort();
  }, [refresh]);

  return { status, refresh };
}
