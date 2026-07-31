'use client';

/**
 * Fallback page at the callback path the host intercepts. In the normal flow the
 * host catches this navigation (prefix match) and closes the browser before the
 * page renders, so this only shows if the host did not intercept — a plain
 * "you can close this" message keyed off the outcome.
 */
import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

function CallbackMessage() {
  const status = useSearchParams().get('status');
  const message =
    status === 'success'
      ? 'Wallet linked. You can close this window.'
      : status === 'cancelled'
        ? 'Linking cancelled. You can close this window.'
        : 'Something went wrong. You can close this window and try again.';

  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        fontFamily: 'system-ui, sans-serif',
        textAlign: 'center',
      }}
    >
      <p style={{ fontSize: 16, maxWidth: 360 }}>{message}</p>
    </main>
  );
}

export default function LinkWalletCallbackPage() {
  return (
    <Suspense>
      <CallbackMessage />
    </Suspense>
  );
}
