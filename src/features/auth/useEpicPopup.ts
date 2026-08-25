'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { isEpicPopupMessage, POPUP_FEATURES, type EpicPopupStatus } from './epicPopup';

/** How often to notice the buyer closed the popup without finishing. */
const ABANDON_POLL_MS = 500;

type Options = {
  /**
   * Called with whatever the popup reported. May be async; if it throws, the
   * buyer is told rather than left looking at a window that has gone quiet.
   */
  onResult: (status: EpicPopupStatus) => void | Promise<void>;
  /** Shown when the popup itself reports a failure. */
  errorMessage: string;
  /** Shown when `onResult` throws after an otherwise successful handshake. */
  followUpErrorMessage?: string;
};

/**
 * Runs an Epic handshake in a popup so the page underneath is never navigated
 * away from. That matters most at checkout, where sending someone off to Epic
 * mid-purchase costs the purchase.
 *
 * Used by both signing in and account linking — the mechanics are identical and
 * only the outcome differs.
 *
 * Three ways this ends, all handled: the popup reports back, the popup is
 * blocked (fall back to a full-page redirect rather than dead-ending), or the
 * buyer closes it without finishing (stop waiting rather than sit on a spinner).
 */
export function useEpicPopup({ onResult, errorMessage, followUpErrorMessage }: Options) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const popupRef = useRef<Window | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Held in refs so a caller that rebuilds these each render does not detach and
  // reattach the message listener mid-handshake.
  const optionsRef = useRef({ onResult, errorMessage, followUpErrorMessage });
  optionsRef.current = { onResult, errorMessage, followUpErrorMessage };

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

      const { onResult: handle, errorMessage: failed, followUpErrorMessage: followUpFailed } =
        optionsRef.current;

      if (event.data.status === 'error') {
        setError(failed);
        return;
      }

      // The server-side work is already done, so a failure here is in reading
      // the result back. Say so rather than looking idle after something that
      // actually succeeded.
      void Promise.resolve(handle(event.data.status)).catch(() => {
        setError(followUpFailed ?? failed);
      });
    };

    window.addEventListener('message', onMessage);
    return () => {
      window.removeEventListener('message', onMessage);
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [stopWaiting]);

  /**
   * Open the popup at `popupUrl`. `redirectUrl` is where to send the whole page
   * if a popup cannot be opened at all; omit it when there is no sensible
   * full-page equivalent, and the buyer is told instead.
   */
  const open = useCallback(
    (popupUrl: string, redirectUrl?: string) => {
      setError(null);

      const popup = window.open(popupUrl, 'zero-epic-auth', POPUP_FEATURES);
      if (!popup) {
        // Blocked, usually by the browser rather than the buyer.
        if (redirectUrl) {
          window.location.assign(redirectUrl);
        } else {
          setError('Please allow popups for this site, then try again.');
        }
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

  /** Drop a failure from a previous attempt, e.g. when a dialog reopens. */
  const reset = useCallback(() => setError(null), []);

  return { open, busy, error, reset };
}
