'use client';

import { useEffect, type ReactNode } from 'react';
import { useAuthStore } from './store';
import { ZeroLoginModal } from './ZeroLoginModal';

/**
 * Restores the ZERO session on load and mounts the global login modal. Mounted
 * once (Wilder World only) inside Providers, so the modal is reachable from
 * anywhere on the brand — the market header and the vehicle funnel's Login link.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const restore = useAuthStore((s) => s.restore);
  const openLoginWithError = useAuthStore((s) => s.openLoginWithError);
  const openCreateWithNotice = useAuthStore((s) => s.openCreateWithNotice);

  useEffect(() => {
    void restore();
  }, [restore]);

  // A social sign-in that did not end in a session lands back here with
  // ?authError=… . Surface it in the modal, then strip the param so a refresh
  // doesn't re-trigger it. This is the full-page path, taken when a popup could
  // not be opened.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const reason = params.get('authError');
    if (reason !== 'social' && reason !== 'no-account') return;

    if (reason === 'no-account') {
      // Nothing failed. Epic authenticated, there is simply no account behind it
      // yet, so open create rather than telling them to try again.
      openCreateWithNotice(
        'No Wilder World account is linked to that Epic account yet. Create one with Epic Games below.',
      );
    } else {
      openLoginWithError('Sign-in with Epic Games didn’t complete. Please try again.');
    }

    params.delete('authError');
    const qs = params.toString();
    window.history.replaceState(null, '', `${window.location.pathname}${qs ? `?${qs}` : ''}${window.location.hash}`);
  }, [openLoginWithError, openCreateWithNotice]);

  return (
    <>
      {children}
      <ZeroLoginModal />
    </>
  );
}
