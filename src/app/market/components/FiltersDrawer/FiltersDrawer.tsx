import type { ReactNode } from 'react';
import { X } from 'lucide-react';
import styles from '../../market.module.css';

type Props = {
  onClose: () => void;
  children: ReactNode;
};

export function FiltersDrawer({ onClose, children }: Props) {
  return (
    <div className={styles.drawer} role="dialog" aria-modal="true" aria-label="Filters">
      <div className={styles.drawerBackdrop} onClick={onClose} />
      <div className={styles.drawerPanel}>
        <div className={styles.drawerHead}>
          <button
            type="button"
            className={styles.drawerClose}
            onClick={onClose}
            aria-label="Close filters"
          >
            <X size={18} />
          </button>
        </div>
        <div className={styles.drawerBody}>{children}</div>
      </div>
    </div>
  );
}
