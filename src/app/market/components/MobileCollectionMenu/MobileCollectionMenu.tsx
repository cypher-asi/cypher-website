import type { RefObject } from 'react';
import { ChevronDown } from 'lucide-react';
import type { WilderCollectionEntry, WilderIndustry } from '@/lib/wilderCollections';
import styles from '../../market.module.css';

type Props = {
  industries: readonly WilderIndustry[];
  entries: readonly WilderCollectionEntry[];
  activeSlug: string;
  label: string;
  open: boolean;
  menuRef: RefObject<HTMLDivElement | null>;
  onToggle: () => void;
  onSelect: (slug: string) => void;
};

export function MobileCollectionMenu({
  industries,
  entries,
  activeSlug,
  label,
  open,
  menuRef,
  onToggle,
  onSelect,
}: Props) {
  return (
    <div className={styles.mobileColl} ref={menuRef}>
      <button
        type="button"
        className={styles.mobileCollBtn}
        onClick={onToggle}
        aria-expanded={open}
      >
        <span className={styles.mobileCollLabel}>{label}</span>
        <ChevronDown size={14} className={open ? styles.chevOpen : styles.chev} />
      </button>
      {open && (
        <div className={styles.mobileCollMenu}>
          {entries.map((c) => {
            const industry = industries.find((i) =>
              i.collections.some((x) => x.slug === c.slug)
            );
            return (
              <button
                key={c.slug}
                type="button"
                className={`${styles.navMenuItem} ${
                  c.slug === activeSlug ? styles.navMenuItemActive : ''
                }`}
                onClick={() => onSelect(c.slug)}
              >
                {c.label ?? industry?.name ?? c.slug}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
