'use client';

import { useEffect } from 'react';
import { EPIC_POPUP_MESSAGE, type EpicPopupMessage } from '@/features/auth/epicPopup';

/**
 * The last stop inside the Epic popup window.
 *
 * The session cookie has already been set by /oauth/callback before we get
 * here, and it is scoped to the host rather than the window, so the opener can
 * simply re-read its session once told to. This page's only job is to tell it
 * and get out of the way.
 *
 * Rendered rather than redirected because a popup has to close itself, which
 * needs script. It is deliberately bare: nobody is meant to look at it.
 */
export default function EpicPopupDonePage() {
  useEffect(() => {
    const status: EpicPopupMessage['status'] =
      new URLSearchParams(window.location.search).get('status') === 'success'
        ? 'success'
        : 'error';

    // Targeted at our own origin, never '*', so the token-bearing round trip
    // cannot be observed by another window.
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
