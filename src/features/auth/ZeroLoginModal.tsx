'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { useAuthStore } from './store';
import styles from './ZeroLoginModal.module.css';

type Tab = 'code' | 'password';

/**
 * Global ZERO login modal (Wilder World only — mounted by AuthProvider). Two
 * methods: email one-time code, and email + password. Both post to our
 * /api/auth routes, which set the httpOnly session cookie.
 */
export function ZeroLoginModal() {
  const isOpen = useAuthStore((s) => s.isModalOpen);
  const status = useAuthStore((s) => s.status);
  const error = useAuthStore((s) => s.error);
  const closeLogin = useAuthStore((s) => s.closeLogin);
  const clearError = useAuthStore((s) => s.clearError);
  const requestCode = useAuthStore((s) => s.requestCode);
  const verifyCode = useAuthStore((s) => s.verifyCode);
  const signInWithPassword = useAuthStore((s) => s.signInWithPassword);

  const [mounted, setMounted] = useState(false);
  const [tab, setTab] = useState<Tab>('code');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [codeSent, setCodeSent] = useState(false);

  useEffect(() => setMounted(true), []);

  // Reset transient form state each time the modal opens.
  useEffect(() => {
    if (isOpen) {
      setCode('');
      setPassword('');
      setCodeSent(false);
    }
  }, [isOpen]);

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

  const submitting = status === 'submitting';

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

  return createPortal(
    <div className={styles.overlay} onClick={closeLogin} role="dialog" aria-modal="true">
      <div className={styles.dialog} onClick={(e) => e.stopPropagation()}>
        <button className={styles.close} onClick={closeLogin} aria-label="Close">
          <X size={18} />
        </button>

        <h2 className={styles.title}>Sign in</h2>
        <p className={styles.subtitle}>
          Connect your ZERO account to buy, sell and manage items on Wilder Market.
        </p>

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
      </div>
    </div>,
    document.body,
  );
}
