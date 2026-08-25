'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { useAuthStore } from './store';
import { useEpicAuthPopup } from './useEpicAuthPopup';
import { POPUP_RETURN_PATH, REDIRECT_RETURN_PATH } from './epicPopup';
import styles from './ZeroLoginModal.module.css';

type Tab = 'code' | 'password';

/** Shown in both modes: the buyer may not know what a ZERO account is, or why
 *  the thing they are buying ends up in one. */
const ACCOUNT_EXPLAINER =
  'Your Wilder World account is powered by ZERO. It holds your wallet and everything you own across Wilder World, including anything you buy here.';

/**
 * Global ZERO auth modal (Wilder World only — mounted by AuthProvider). Two modes,
 * driven by the store: `login` (Epic, or email code / password) and `create` (Epic,
 * or email + password → a new ZERO account). Both post to our /api/auth routes,
 * which set the httpOnly session cookie.
 *
 * Epic is the only option offered on open, with email folded behind a link. Wilder
 * World creates a ZERO account for players in-game from their Epic account, so most
 * players already have one: signing in with Epic lands them on it, while signing up
 * by email gives them a second account and delivers their purchases to the wrong
 * one. Email stays one click away because plenty of buyers never play the game.
 *
 * Epic is offered on every device. It was previously hidden on mobile, inherited
 * from how the ZERO app and packs gate it, but the redirect was verified working
 * on a mobile browser (2026-08-20) and the gate only forced players into a second
 * account. If it ever does fail somewhere, email is still one tap away.
 *
 * The copy leads with the Wilder World account and explains that ZERO powers it,
 * rather than opening on a brand the buyer may not recognise.
 */
export function ZeroLoginModal() {
  const isOpen = useAuthStore((s) => s.isModalOpen);
  const mode = useAuthStore((s) => s.mode);
  const status = useAuthStore((s) => s.status);
  const error = useAuthStore((s) => s.error);
  const closeLogin = useAuthStore((s) => s.closeLogin);
  const clearError = useAuthStore((s) => s.clearError);
  const requestCode = useAuthStore((s) => s.requestCode);
  const verifyCode = useAuthStore((s) => s.verifyCode);
  const signInWithPassword = useAuthStore((s) => s.signInWithPassword);
  const signUp = useAuthStore((s) => s.signUp);
  const openLogin = useAuthStore((s) => s.openLogin);
  const openCreate = useAuthStore((s) => s.openCreate);
  const restore = useAuthStore((s) => s.restore);

  const [mounted, setMounted] = useState(false);
  const [tab, setTab] = useState<Tab>('code');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  // Email is folded away behind Epic until asked for.
  const [showEmail, setShowEmail] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  // Reset transient form state when the modal opens or the mode changes. Email is
  // kept so toggling between Sign in / Create doesn't lose what was typed.
  useEffect(() => {
    if (isOpen) {
      setName('');
      setCode('');
      setPassword('');
      setConfirm('');
      setCodeSent(false);
      setShowEmail(false);
    }
  }, [isOpen, mode]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeLogin();
    };
    window.addEventListener('keydown', onKey);
    // Lock background scroll while the modal is open.
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen, closeLogin]);

  // Runs the Epic handshake in a popup so the page underneath is never navigated
  // away from. Declared with the other hooks, above the early return below, so
  // its position never depends on whether the modal happens to be open.
  //
  // Cookies belong to the host rather than the window, so once the popup's
  // callback has set the session we only need to re-read it here.
  const epicPopup = useEpicAuthPopup(async () => {
    await restore();
    closeLogin();
  });

  // A failure from a previous attempt shouldn't greet the next one.
  useEffect(() => {
    if (isOpen) epicPopup.reset();
  }, [isOpen, epicPopup.reset]);

  if (!mounted || !isOpen) return null;

  const isCreate = mode === 'create';
  const submitting = status === 'submitting';
  const passwordsMismatch = confirm.length > 0 && password !== confirm;

  const switchTab = (next: Tab) => {
    setTab(next);
    clearError();
  };

  const onSendCode = async (e: FormEvent) => {
    e.preventDefault();
    if (await requestCode(email.trim())) setCodeSent(true);
  };
  const onVerify = async (e: FormEvent) => {
    e.preventDefault();
    await verifyCode(email.trim(), code.trim());
  };
  const onPassword = async (e: FormEvent) => {
    e.preventDefault();
    await signInWithPassword(email.trim(), password);
  };
  const onCreate = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim() || password !== confirm) return;
    await signUp(email.trim(), password, name.trim());
  };

  // Login uses the existing-user path; create uses the create-or-login
  // `initiate` path (its callback findOrCreates the account). zos-api sets its
  // own SameSite=Lax oauth_state cookie during the redirect and validates it on
  // its callback, so we point the window straight there — bouncing through an
  // app route first would break that state round-trip. The base is public
  // (NEXT_PUBLIC), not a secret.
  const epicSignIn = () => {
    const base = process.env.NEXT_PUBLIC_ZOS_API_URL;
    if (!base) return;
    const path = isCreate ? '/api/oauth/epic-games/initiate' : '/api/oauth/epic-games/login';
    const start = (returnPath: string) =>
      `${base}${path}?returnUrl=${encodeURIComponent(`${window.location.origin}${returnPath}`)}`;

    epicPopup.open(start(POPUP_RETURN_PATH), start(REDIRECT_RETURN_PATH));
  };

  return createPortal(
    <div className={styles.overlay} onClick={closeLogin} role="dialog" aria-modal="true">
      <div className={styles.dialog} onClick={(e) => e.stopPropagation()}>
        <button className={styles.close} onClick={closeLogin} aria-label="Close">
          <X size={18} />
        </button>

        <h2 className={styles.title}>
          {isCreate ? 'Create account' : 'Sign in'}
        </h2>
        <p className={styles.subtitle}>
          {isCreate ? ACCOUNT_EXPLAINER : 'Connect your existing Wilder World and ZERO account.'}
        </p>
        {!isCreate && <p className={styles.subtitle}>{ACCOUNT_EXPLAINER}</p>}

        {/* Epic leads, and email is folded away behind it. Wilder World creates a
            ZERO account for players in-game from their Epic account, so most players
            already have one. Signing in with Epic lands them on it; signing up by
            email instead quietly creates a second account, and anything they buy is
            delivered to the wrong one. Email stays one click away rather than gone,
            since plenty of buyers will not play the game at all. */}
        {/* One offer at a time: Epic, or the email form. Showing both at once put
            the choice back in front of a player who had already made it. */}
        {!showEmail && (
          <>
            <p className={styles.epicLead}>
              {isCreate
                ? 'Create your Wilder World account and its ZERO wallet using Epic Games. It’s the same account you’ll use in game.'
                : 'Already play Wilder World?'}
            </p>
            <button
              type="button"
              className={styles.social}
              onClick={epicSignIn}
              disabled={epicPopup.busy}
            >
              {epicPopup.busy
                ? 'Waiting for Epic Games…'
                : isCreate
                  ? 'Create with Epic Games'
                  : 'Continue with Epic Games'}
            </button>
            {/* The popup owns the screen while it is open, so this is only read
                after it closes: either it reported a failure, or the buyer shut
                it and needs to know the button is live again. */}
            {epicPopup.error && <div className={styles.error}>{epicPopup.error}</div>}
            {isCreate ? (
              <button
                type="button"
                className={styles.emailToggle}
                onClick={() => setShowEmail(true)}
              >
                Create an account with email instead
              </button>
            ) : (
              <p className={styles.altPrompt}>
                Not a player but have a ZERO account?{' '}
                <button type="button" onClick={() => setShowEmail(true)}>
                  Sign in with email instead
                </button>
              </p>
            )}
          </>
        )}

        {/* Sign-in only, and above the form so a player reads it before filling one
            in. Returns to the Epic screen rather than redirecting straight out to
            Epic, so a text link never navigates the page away unannounced. */}
        {showEmail && !isCreate && (
          <p className={styles.epicPrompt}>
            Already play Wilder World? Continue with{' '}
            <button type="button" onClick={() => setShowEmail(false)}>
              Epic Games
            </button>{' '}
            instead.
            <span className={styles.epicPromptLine}>
              Not a player but have a ZERO account? Sign in below.
            </span>
          </p>
        )}

        {/* The email counterpart to the Epic explainer, so both routes say what they
            create. Epic is not mentioned as a login here, only as something that can
            be attached afterwards, which is what this path actually leaves open. */}
        {showEmail && isCreate && (
          <>
            <p className={styles.epicPrompt}>
              Create your Wilder World account and its ZERO wallet using your email. You can link
              your Epic account later.
            </p>

            {/* The last point at which a second account can still be avoided. A player
                who signs up here rather than with Epic gets a new ZERO account, their
                purchase is delivered to its wallet, and the game keeps reading the
                account Epic is already attached to. Linking Epic afterwards only moves
                the problem, since it pulls the link off the account they play with.
                So say it here, where not creating the account is still an option. */}
            <p className={styles.signupWarning}>
              Already play Wilder World? Creating an account here gives you a second one, and
              anything you buy will not be on the account you play with.{' '}
              <button type="button" onClick={() => setShowEmail(false)}>
                Use Epic Games instead
              </button>
            </p>
          </>
        )}

        {showEmail &&
          (isCreate ? (
          <form className={styles.form} onSubmit={onCreate}>
            <div>
              <div className={styles.label}>Email</div>
              <input
                className={styles.input}
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@email.com"
                required
              />
            </div>
            <div>
              <div className={styles.label}>Display name</div>
              <input
                className={styles.input}
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
                required
              />
            </div>
            <div>
              <div className={styles.label}>Password</div>
              <input
                className={styles.input}
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                required
              />
            </div>
            <div>
              <div className={styles.label}>Confirm password</div>
              <input
                className={styles.input}
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                autoComplete="new-password"
                required
              />
            </div>
            {passwordsMismatch && <div className={styles.error}>Passwords do not match.</div>}
            {error && <div className={styles.error}>{error}</div>}
            <button
              className={styles.submit}
              type="submit"
              disabled={submitting || !email || !name.trim() || !password || password !== confirm}
            >
              {submitting ? 'Creating account…' : 'Create account'}
            </button>
          </form>
        ) : (
          <>
            <div className={styles.tabs}>
              <button
                type="button"
                className={`${styles.tab} ${tab === 'code' ? styles.tabActive : ''}`}
                onClick={() => switchTab('code')}
              >
                Email code
              </button>
              <button
                type="button"
                className={`${styles.tab} ${tab === 'password' ? styles.tabActive : ''}`}
                onClick={() => switchTab('password')}
              >
                Password
              </button>
            </div>

            {tab === 'code' && !codeSent && (
              <form className={styles.form} onSubmit={onSendCode}>
                <div>
                  <div className={styles.label}>Email</div>
                  <input
                    className={styles.input}
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@email.com"
                    required
                  />
                </div>
                {error && <div className={styles.error}>{error}</div>}
                <button className={styles.submit} type="submit" disabled={submitting}>
                  {submitting ? 'Sending…' : 'Send code'}
                </button>
              </form>
            )}

            {tab === 'code' && codeSent && (
              <form className={styles.form} onSubmit={onVerify}>
                <p className={styles.hint}>We sent a code to {email}.</p>
                <div>
                  <div className={styles.label}>Login code</div>
                  <input
                    className={styles.input}
                    inputMode="numeric"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="6-digit code"
                    autoFocus
                    required
                  />
                </div>
                {error && <div className={styles.error}>{error}</div>}
                <button className={styles.submit} type="submit" disabled={submitting}>
                  {submitting ? 'Signing in…' : 'Sign in'}
                </button>
                <button
                  className={styles.secondary}
                  type="button"
                  onClick={() => {
                    setCodeSent(false);
                    clearError();
                  }}
                >
                  Use a different email
                </button>
              </form>
            )}

            {tab === 'password' && (
              <form className={styles.form} onSubmit={onPassword}>
                <div>
                  <div className={styles.label}>Email</div>
                  <input
                    className={styles.input}
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@email.com"
                    required
                  />
                </div>
                <div>
                  <div className={styles.label}>Password</div>
                  <input
                    className={styles.input}
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
                {error && <div className={styles.error}>{error}</div>}
                <button className={styles.submit} type="submit" disabled={submitting}>
                  {submitting ? 'Signing in…' : 'Sign in'}
                </button>
              </form>
            )}
          </>
          ))}

        {/* Create only: a way back to the Epic option after the form has replaced
            it. Sign-in offers the same escape above its form, where the account
            already exists and the choice is more urgent. */}
        {showEmail && isCreate && (
          <button
            type="button"
            className={styles.emailToggle}
            onClick={() => setShowEmail(false)}
          >
            Create with Epic Games instead
          </button>
        )}


        <p className={styles.switch}>
          {isCreate ? (
            <>
              Already play Wilder World or use ZERO?{' '}
              <button type="button" onClick={openLogin}>
                Sign in
              </button>
            </>
          ) : (
            <>
              New to Wilder World and ZERO?{' '}
              <button type="button" onClick={openCreate}>
                Create an account
              </button>
            </>
          )}
        </p>
      </div>
    </div>,
    document.body,
  );
}
