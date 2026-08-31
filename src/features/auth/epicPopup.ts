/**
 * The contract between an Epic popup and the window that opened it.
 *
 * Two flows use this: signing in, and linking an Epic account to an existing
 * ZERO account. Both are the same handshake — send the buyer to Epic without
 * navigating the page underneath, then report an outcome back — so they share
 * one popup implementation.
 *
 * Nothing sensitive crosses this boundary. The popup has already had its work
 * done server-side by the time it reports, and the session cookie belongs to the
 * host rather than the window, so the opener only needs to be told what
 * happened. The message carries an outcome, not a credential.
 */
export const EPIC_POPUP_MESSAGE = 'zero-epic-auth';

/**
 * `needs-confirmation` is linking-only: the Epic account is already attached to
 * a different ZERO account that would be left without a way in.
 *
 * `no-account` is sign-in only: the Epic account authenticated fine but has no
 * Wilder World account behind it yet. Kept separate from `error` because it is
 * not a failure and retrying will never fix it. The buyer needs the create path,
 * not another attempt at the same one.
 */
export type EpicPopupStatus = 'success' | 'error' | 'needs-confirmation' | 'no-account';

export type EpicPopupMessage = {
  source: typeof EPIC_POPUP_MESSAGE;
  status: EpicPopupStatus;
};

const STATUSES: EpicPopupStatus[] = ['success', 'error', 'needs-confirmation', 'no-account'];

/** Narrow an arbitrary postMessage payload to our own. */
export function isEpicPopupMessage(data: unknown): data is EpicPopupMessage {
  if (typeof data !== 'object' || data === null) return false;
  const m = data as Partial<EpicPopupMessage>;
  return m.source === EPIC_POPUP_MESSAGE && STATUSES.includes(m.status as EpicPopupStatus);
}

/** Where the sign-in popup lands once zos-api has handed the session back. */
export const POPUP_RETURN_PATH = '/oauth/callback?popup=1';
/** Where the full-page sign-in flow lands, for when a popup cannot be opened. */
export const REDIRECT_RETURN_PATH = '/oauth/callback';

/**
 * Where the link popup lands. zos-api redirects straight back to this on
 * success, or with `error` + `requiresConfirmation` params when linking would
 * leave the previously linked account without a way in.
 */
export const LINK_RETURN_PATH = '/oauth/link-done';

/**
 * Roughly Epic's own sign-in page. Kept modest so it reads as a dialog over the
 * purchase rather than a new place the buyer has been taken to.
 */
export const POPUP_FEATURES = 'width=520,height=680,menubar=no,toolbar=no,location=no,status=no';
