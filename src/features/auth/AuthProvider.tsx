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

  useEffect(() => {
    void restore();
  }, [restore]);

  return (
    <>
      {children}
      <ZeroLoginModal />
    </>
  );
}
