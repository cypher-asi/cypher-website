import type { RefObject } from 'react';
import { ChevronDown } from 'lucide-react';
import type { WilderIndustry } from '@/lib/wilderCollections';
import styles from '../../market.module.css';

type Props = {
  industries: readonly WilderIndustry[];
  activeSlug: string;
  openNavGroup: string | null;
  navRef: RefObject<HTMLElement | null>;
  onToggleNavGroup: (id: string | null) => void;
  onSelect: (slug: string) => void;
};

export function CollectionNav({
  industries,
  activeSlug,
  openNavGroup,
  navRef,
  onToggleNavGroup,
  onSelect,
}: Props) {
  return (
    <nav className={styles.nav} ref={navRef} aria-label="Collections">
      {industries.map((industry) => {
        const isActiveIndustry = industry.collections.some((c) => c.slug === activeSlug);
        if (industry.collections.length === 1) {
          const c = industry.collections[0];
          return (
            <button
              key={industry.id}
              type="button"
              className={`${styles.navItem} ${isActiveIndustry ? styles.navItemActive : ''}`}
              onClick={() => onSelect(c.slug)}
            >
              {industry.name}
            </button>
          );
        }
        const open = openNavGroup === industry.id;
        return (
          <div key={industry.id} className={styles.navGroup}>
            <button
              type="button"
              className={`${styles.navItem} ${isActiveIndustry ? styles.navItemActive : ''}`}
              onClick={() => onToggleNavGroup(open ? null : industry.id)}
              aria-expanded={open}
            >
              {industry.name}
              <ChevronDown size={13} className={open ? styles.chevOpen : styles.chev} />
            </button>
            {open && (
              <div className={styles.navMenu}>
                {industry.collections.map((c) => (
                  <button
                    key={c.slug}
                    type="button"
                    className={`${styles.navMenuItem} ${
                      c.slug === activeSlug ? styles.navMenuItemActive : ''
                    }`}
                    onClick={() => onSelect(c.slug)}
                  >
                    {c.label ?? industry.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </nav>
  );
}
