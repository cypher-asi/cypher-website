'use client';

import { useCallback, useEffect, useState } from 'react';
import { Check } from 'lucide-react';
import { useEpicPopup } from './useEpicPopup';
import type { LinkedAccount } from './zos';
import styles from './ConnectEpicPrompt.module.css';

const EPIC = 'epic-games';
const START_PATH = '/api/auth/epic-link/start';

type State =
  | { kind: 'checking' }
  | { kind: 'linked'; handle: string | null }
  | { kind: 'unlinked' }
  | { kind: 'confirm' }
  | { kind: 'unavailable' };

async function fetchEpicLink(signal?: AbortSignal): Promise<LinkedAccount | null> {
  const res = await fetch('/api/auth/linked-accounts', { signal });
  if (!res.ok) throw new Error(String(res.status));
  const body = (await res.json()) as { accounts?: LinkedAccount[] };
  return body.accounts?.find((a) => a.providerName === EPIC) ?? null;
}

/**
 * Offers to connect an Epic account, after a purchase rather than before it.
 *
 * Only some buyers need this. Anyone who signed in with Epic is already linked,
 * so the prompt stays hidden for them — the people who see it are those who
 * created a ZERO account by email, whose vehicle has therefore landed on an
 * account separate from the one they play with. Connecting Epic is what makes
 * the two the same account.
 *
 * If the check itself fails we show nothing. Guessing "not linked" would ask
 * someone to connect an account they already have, which is worse than staying
 * quiet on a screen that is otherwise good news.
 */
export function ConnectEpicPrompt() {
  const [state, setState] = useState<State>({ kind: 'checking' });

  const refresh = useCallback(async (signal?: AbortSignal) => {
    const epic = await fetchEpicLink(signal);
    setState(epic ? { kind: 'linked', handle: epic.handle } : { kind: 'unlinked' });
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    refresh(controller.signal).catch((err) => {
      if (controller.signal.aborted || (err as Error)?.name === 'AbortError') return;
      setState({ kind: 'unavailable' });
    });
    return () => controller.abort();
  }, [refresh]);

  const popup = useEpicPopup({
    onResult: async (status) => {
      if (status === 'needs-confirmation') {
        setState({ kind: 'confirm' });
        return;
      }
      await refresh();
    },
    errorMessage: 'Could not connect your Epic account. Please try again.',
    followUpErrorMessage: 'Connected your Epic account, but the page didn’t update. Please refresh.',
  });

  // No full-page fallback: this sits on a purchase-complete screen, and navigating
  // away from it to sign in elsewhere would lose the receipt the buyer is reading.
  const connect = (confirm = false) => popup.open(`${START_PATH}${confirm ? '?confirm=1' : ''}`);

  if (state.kind === 'checking' || state.kind === 'unavailable') return null;

  if (state.kind === 'linked') {
    return (
      <p className={styles.linked}>
        <Check size={13} strokeWidth={3} aria-hidden />
        Epic Games connected{state.handle ? ` · ${state.handle}` : ''}
      </p>
    );
  }

  if (state.kind === 'confirm') {
    return (
      <section className={styles.warning} aria-label="Confirm connecting Epic Games">
        <h2 className={styles.warningTitle}>This Epic account is already in use</h2>
        {/* Deliberately "may be" — the check that raises this counts only social
            logins and wallets, so an account with an email and password can trip
            it while still being perfectly reachable. */}
        <p>
          It is connected to a different Wilder World account. Connecting it here moves it, and that
          account may be left with no way to sign in — along with anything it holds.
        </p>
        <p>If that account is one you still use, add an email and password to it first.</p>
        <div className={styles.warningActions}>
          <button
            type="button"
            className={styles.secondary}
            onClick={() => {
              popup.reset();
              setState({ kind: 'unlinked' });
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            className={styles.danger}
            onClick={() => connect(true)}
            disabled={popup.busy}
          >
            {popup.busy ? 'Waiting for Epic Games…' : 'Connect anyway'}
          </button>
        </div>
        {popup.error && <p className={styles.error}>{popup.error}</p>}
      </section>
    );
  }

  return (
    <section className={styles.prompt} aria-label="Connect Epic Games">
      <h2 className={styles.promptTitle}>Play Wilder World?</h2>
      <p>
        Connect your Epic Games account so this is the account you play with. Without it, your
        vehicle stays on this account only.
      </p>
      <button type="button" className={styles.connect} onClick={() => connect()} disabled={popup.busy}>
        {popup.busy ? 'Waiting for Epic Games…' : 'Connect Epic Games'}
      </button>
      {popup.error && <p className={styles.error}>{popup.error}</p>}
    </section>
  );
}
