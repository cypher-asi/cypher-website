'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { isEpicPopupMessage, POPUP_FEATURES } from './epicPopup';

/** How often to notice the buyer closed the popup without finishing. */
const ABANDON_POLL_MS = 500;

/**
 * Runs the Epic handshake in a popup so the page underneath is never navigated
 * away from. That matters most at checkout, where sending someone off to Epic
 * mid-purchase costs the purchase.
 *
 * Nothing sensitive travels back through the window. /oauth/callback has already
 * set the session cookie, which belongs to the host rather than the window, so
 * `onSuccess` only has to re-read the session that is already there.
 *
 * Three ways this ends, all handled: the popup reports back, the popup is
 * blocked (fall back to the full-page redirect rather than dead-ending), or the
 * buyer closes it without finishing (stop waiting rather than sit on a spinner).
 */
export function useEpicAuthPopup(onSuccess: () => void | Promise<void>) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const popupRef = useRef<Window | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Held in a ref so a caller that rebuilds this callback each render does not
  // detach and reattach the message listener mid-handshake.
  const onSuccessRef = useRef(onSuccess);
  onSuccessRef.current = onSuccess;

  const stopWaiting = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    popupRef.current = null;
    setBusy(false);
  }, []);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      // Anything not from our own origin, in our own shape, is not ours.
      if (event.origin !== window.location.origin) return;
      if (!isEpicPopupMessage(event.data)) return;

      popupRef.current?.close();
      stopWaiting();

      if (event.data.status === 'success') {
        // The session cookie is already set by the popup's callback, so a
        // refresh recovers. Say that, rather than leaving a modal that looks
        // idle after a sign-in that actually succeeded.
        void Promise.resolve(onSuccessRef.current()).catch(() => {
          setError('Signed in with Epic Games, but your account didn’t load. Please refresh the page.');
        });
      } else {
        setError('Could not finish signing in with Epic Games. Please try again.');
      }
    };

    window.addEventListener('message', onMessage);
    return () => {
      window.removeEventListener('message', onMessage);
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [stopWaiting]);

  const open = useCallback(
    (popupUrl: string, redirectUrl: string) => {
      setError(null);

      const popup = window.open(popupUrl, 'zero-epic-auth', POPUP_FEATURES);
      if (!popup) {
        // Blocked, usually by the browser rather than the buyer. Send them the
        // long way round instead of leaving a button that does nothing.
        window.location.assign(redirectUrl);
        return;
      }

      popupRef.current = popup;
      setBusy(true);
      popup.focus?.();

      pollRef.current = setInterval(() => {
        if (popupRef.current?.closed) stopWaiting();
      }, ABANDON_POLL_MS);
    },
    [stopWaiting],
  );

  /** Drop a failure from a previous attempt, e.g. when the modal reopens. */
  const reset = useCallback(() => setError(null), []);

  return { open, busy, error, reset };
}
