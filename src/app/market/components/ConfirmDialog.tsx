'use client';

import { useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import styles from '../market.module.css';

type Props = {
  title: string;
  children: ReactNode;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  /** Disable actions while the confirmed action is running. */
  busy?: boolean;
};

/**
 * Small confirmation dialog for account-level actions (linking / removing a
 * wallet). Rendered by the caller only while open. Backdrop click or Escape
 * cancels; mirrors the ItemModal portal pattern.
 */
export function ConfirmDialog({ title, children, confirmLabel, onConfirm, onCancel, busy }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onCancel]);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div className={styles.confirmOverlay} role="dialog" aria-modal="true" onClick={onCancel}>
      <div className={styles.confirmDialog} onClick={(e) => e.stopPropagation()}>
        <h2 className={styles.confirmTitle}>{title}</h2>
        <div className={styles.confirmBody}>{children}</div>
        <div className={styles.confirmActions}>
          <button type="button" className={styles.confirmCancel} onClick={onCancel} disabled={busy}>
            Cancel
          </button>
          <button type="button" className={styles.confirmConfirm} onClick={onConfirm} disabled={busy}>
            {busy ? '…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
