'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { useAuthStore } from './store';
import styles from './ZeroLoginModal.module.css';

type Tab = 'code' | 'password';

/**
 * Global ZERO auth modal (Wilder World only — mounted by AuthProvider). Two modes,
 * driven by the store: `login` (email code / password / Epic) and `create` (email +
 * password → a new ZERO account, or Epic). Both post to our /api/auth routes, which
 * set the httpOnly session cookie. The copy makes explicit that the account being
 * created or signed into is a ZERO account, not a Wilder-World-only login.
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

  const [mounted, setMounted] = useState(false);
  const [tab, setTab] = useState<Tab>('code');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  // Social login (Epic Games) is web-only — its OAuth redirect is unreliable on
  // mobile browsers, matching how the ZERO app / packs gate it. Computed after
  // mount so it's SSR-safe (navigator is client-only).
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    setMounted(true);
    setIsMobile(/Mobi|Android/i.test(navigator.userAgent));
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

  // Epic Games OAuth. Login uses the existing-user path; create uses the
  // create-or-login `initiate` path (its callback findOrCreates the account).
  // zos-api sets its own SameSite=Lax oauth_state cookie during the redirect and
  // validates it on its callback, so we navigate straight there — bouncing through
  // an app route first would break that state round-trip. The base is public
  // (NEXT_PUBLIC), not a secret.
  const epicSignIn = () => {
    const base = process.env.NEXT_PUBLIC_ZOS_API_URL;
    if (!base) return;
    const returnUrl = `${window.location.origin}/oauth/callback`;
    const path = isCreate ? '/api/oauth/epic-games/initiate' : '/api/oauth/epic-games/login';
    window.location.href = `${base}${path}?returnUrl=${encodeURIComponent(returnUrl)}`;
  };

  return createPortal(
    <div className={styles.overlay} onClick={closeLogin} role="dialog" aria-modal="true">
      <div className={styles.dialog} onClick={(e) => e.stopPropagation()}>
        <button className={styles.close} onClick={closeLogin} aria-label="Close">
          <X size={18} />
        </button>

        <h2 className={styles.title}>{isCreate ? 'Create your ZERO account' : 'Sign in'}</h2>
        <p className={styles.subtitle}>
          {isCreate
            ? 'Your Wilder World items and wallet live in a ZERO account. Create one to check out and manage what you own.'
            : 'Connect your ZERO account to buy, sell and manage items on Wilder Market.'}
        </p>

        {isCreate ? (
          <form className={styles.form} onSubmit={onCreate}>
            <div>
              <div className={styles.label}>Email</div>
              <input
                className={styles.input}
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@email.com"
                autoFocus
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
                    autoFocus
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
                    autoFocus
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
        )}

        {!isMobile && (
          <>
            <div className={styles.divider}>
              <span>or</span>
            </div>
            <button type="button" className={styles.social} onClick={epicSignIn}>
              {isCreate ? 'Sign up with Epic Games' : 'Continue with Epic Games'}
            </button>
          </>
        )}

        <p className={styles.switch}>
          {isCreate ? (
            <>
              Already on ZERO?{' '}
              <button type="button" onClick={openLogin}>
                Sign in
              </button>
            </>
          ) : (
            <>
              New to ZERO?{' '}
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
