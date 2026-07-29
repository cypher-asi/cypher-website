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

  useEffect(() => {
    void restore();
  }, [restore]);

  // A failed social-login redirect lands back here with ?authError=social. Surface
  // it in the login modal, then strip the param so a refresh doesn't re-trigger it.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('authError') === 'social') {
      openLoginWithError('Sign-in with Epic Games didn’t complete. Please try again.');
      params.delete('authError');
      const qs = params.toString();
      window.history.replaceState(null, '', `${window.location.pathname}${qs ? `?${qs}` : ''}${window.location.hash}`);
    }
  }, [openLoginWithError]);

  return (
    <>
      {children}
      <ZeroLoginModal />
    </>
  );
}
