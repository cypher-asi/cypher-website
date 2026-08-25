/**
 * The contract between the Epic auth popup and the window that opened it.
 *
 * Nothing sensitive crosses this boundary. The popup has already had its
 * session cookie set server-side by /oauth/callback, and that cookie belongs to
 * the host rather than the window, so the opener only needs to be told to
 * re-read its own session. The message carries an outcome, not a credential.
 */
export const EPIC_POPUP_MESSAGE = 'zero-epic-auth';

export type EpicPopupMessage = {
  source: typeof EPIC_POPUP_MESSAGE;
  status: 'success' | 'error';
};

/** Narrow an arbitrary postMessage payload to our own. */
export function isEpicPopupMessage(data: unknown): data is EpicPopupMessage {
  if (typeof data !== 'object' || data === null) return false;
  const m = data as Partial<EpicPopupMessage>;
  return m.source === EPIC_POPUP_MESSAGE && (m.status === 'success' || m.status === 'error');
}

/** Where the popup lands once zos-api has handed the session back. */
export const POPUP_RETURN_PATH = '/oauth/callback?popup=1';
/** Where the full-page flow lands, for when a popup cannot be opened. */
export const REDIRECT_RETURN_PATH = '/oauth/callback';

/**
 * Roughly Epic's own sign-in page. Kept modest so it reads as a dialog over the
 * purchase rather than a new place the buyer has been taken to.
 */
export const POPUP_FEATURES = 'width=520,height=680,menubar=no,toolbar=no,location=no,status=no';
