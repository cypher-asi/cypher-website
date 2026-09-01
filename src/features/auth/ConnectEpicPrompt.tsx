'use client';

import { useState } from 'react';
import { Check } from 'lucide-react';
import { useEpicPopup } from './useEpicPopup';
import { useEpicLinkStatus } from './useEpicLinkStatus';
import styles from './ConnectEpicPrompt.module.css';

const START_PATH = '/api/auth/epic-link/start';

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
 *
 * The prompt is an invitation rather than a warning, deliberately. Urgency here
 * would push hardest on existing players, and for them connecting is the one
 * option that costs something — their game account is usually reachable only
 * through Epic. The confirmation step is where that case is handled.
 */
export function ConnectEpicPrompt() {
  const { status, refresh } = useEpicLinkStatus();
  // Separate from the link status: it is a step the buyer is part-way through,
  // not something the account is.
  const [confirming, setConfirming] = useState(false);

  const popup = useEpicPopup({
    onResult: async (result) => {
      if (result === 'needs-confirmation') {
        setConfirming(true);
        return;
      }
      setConfirming(false);
      await refresh();
    },
    errorMessage: 'Could not connect your Epic account. Please try again.',
    followUpErrorMessage: 'Connected your Epic account, but the page didn’t update. Please refresh.',
  });

  // No full-page fallback: this sits on a purchase-complete screen, and navigating
  // away from it to sign in elsewhere would lose the receipt the buyer is reading.
  const connect = (confirm = false) => popup.open(`${START_PATH}${confirm ? '?confirm=1' : ''}`);

  if (status.kind === 'checking' || status.kind === 'unavailable') return null;

  if (confirming) {
    return (
      <section className={styles.warning} aria-label="Warning: this Epic account is already linked">
        {/* Definite, not hedged: zos-api only raises this when Epic is genuinely
            that account's last way in — email and password count, because they
            are stored as an auth0 authorization alongside the social ones. */}
        <h2 className={styles.warningTitle}>Warning</h2>
        <p>
          This Epic Games account is already used to sign into a different Wilder World account, and
          it is the only way into it.
        </p>
        <p>
          Connect it here and you will be locked out of that other account for good, along with
          everything in it.
        </p>
        {/* Two ways out, both better than proceeding, so each gets its own line
            rather than being buried in prose. The transfer comes first: someone
            who already plays loses nothing by moving the vehicle, whereas
            connecting costs them the account they play on. */}
        <p>
          <strong>Already play on that account?</strong> Don’t connect. Send your vehicle there
          instead, from your wallet in the ZERO app.
        </p>
        <p>
          <strong>Want Epic Games on this account?</strong> Cancel, add an email to the other
          account in the ZERO app under Profile → Linked accounts, then come back.
        </p>
        <div className={styles.warningActions}>
          <button
            type="button"
            className={styles.secondary}
            onClick={() => {
              popup.reset();
              setConfirming(false);
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

  if (status.kind === 'linked') {
    return (
      <p className={styles.linked}>
        <Check size={13} strokeWidth={3} aria-hidden />
        Epic Games connected{status.handle ? ` · ${status.handle}` : ''}
      </p>
    );
  }

  return (
    <section className={styles.prompt} aria-label="Connect Epic Games">
      <h2 className={styles.promptTitle}>Playing Wilder World?</h2>
      {/* No promise of a check here. zos-api only objects when the other account
          would be left with no way in at all — if it has an email login the move
          happens silently, which is the case the note below the button exists
          for. */}
      <p>
        Your Wilder World account isn’t connected to Epic Games yet. Connect it to use this vehicle
        in game.
      </p>
      <button type="button" className={styles.connect} onClick={() => connect()} disabled={popup.busy}>
        {popup.busy ? 'Waiting for Epic Games…' : 'Connect Epic Games'}
      </button>
      {/* This is the only defence for the silent case. The confirmation warning
          fires only when the other account would be left with no way in at all;
          if it has an email login, connecting moves the Epic sign-in with no
          prompt whatsoever — and someone who has always signed in with Epic may
          have no idea what that email password is. So say plainly what
          connecting does, before they start. */}
      <p className={styles.aside}>
        Connecting makes Epic Games sign you into this account. If you already play on a different
        Wilder World account, send your vehicle there from your wallet in the ZERO app instead.
      </p>
      {popup.error && <p className={styles.error}>{popup.error}</p>}
    </section>
  );
}
