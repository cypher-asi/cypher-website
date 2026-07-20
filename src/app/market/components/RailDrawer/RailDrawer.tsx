import type { ReactNode } from 'react';
import { X } from 'lucide-react';
import styles from '../../market.module.css';

type Props = {
  /** Header label — also the dialog's accessible name. */
  title: string;
  onClose: () => void;
  children: ReactNode;
};

/**
 * A left slide-out drawer for a rail panel on small screens, where the rail
 * itself is hidden. Used for Filters, Your Wallets and the collection stats —
 * each opened from its own toolbar icon.
 */
export function RailDrawer({ title, onClose, children }: Props) {
  return (
    <div className={styles.drawer} role="dialog" aria-modal="true" aria-label={title}>
      <div className={styles.drawerBackdrop} onClick={onClose} />
      <div className={styles.drawerPanel}>
        <div className={styles.drawerHead}>
          <p className={styles.railHeading}>{title}</p>
          <button
            type="button"
            className={styles.drawerClose}
            onClick={onClose}
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>
        <div className={styles.drawerBody}>{children}</div>
      </div>
    </div>
  );
}
