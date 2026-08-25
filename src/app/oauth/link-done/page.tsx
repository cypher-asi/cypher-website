'use client';

import { useEffect } from 'react';
import { EPIC_POPUP_MESSAGE, type EpicPopupMessage } from '@/features/auth/epicPopup';

/**
 * The last stop inside the Epic account-linking popup.
 *
 * zos-api redirects here once its link callback has finished. On success it
 * arrives clean; when linking would leave the previously linked ZERO account
 * with no way to sign in, it arrives carrying `error` and
 * `requiresConfirmation`, which the opener turns into a warning rather than a
 * failure — the buyer can still go ahead, knowing what it costs.
 *
 * Rendered rather than redirected because a popup has to close itself, which
 * needs script. It is deliberately bare: nobody is meant to look at it.
 */
export default function EpicLinkDonePage() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const error = params.get('error');

    let status: EpicPopupMessage['status'] = 'success';
    if (params.get('requiresConfirmation') === 'true') {
      status = 'needs-confirmation';
    } else if (error) {
      status = 'error';
    }

    // Targeted at our own origin, never '*', so no other window can observe the
    // outcome of the handshake.
    window.opener?.postMessage(
      { source: EPIC_POPUP_MESSAGE, status } satisfies EpicPopupMessage,
      window.location.origin,
    );
    window.close();
  }, []);

  // Shown only if the window fails to close, e.g. when it was opened as a tab
  // rather than a popup, which is what mobile browsers tend to do.
  return (
    <main style={{ padding: '2rem', fontFamily: 'system-ui, sans-serif', color: '#e6e8eb' }}>
      <p>You can close this window and return to Wilder World.</p>
    </main>
  );
}
