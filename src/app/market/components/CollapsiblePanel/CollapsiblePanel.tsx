'use client';

import { useState, type DependencyList, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import { AnimatedPanel } from '@/components/AnimatedPanel';
import styles from '../../market.module.css';

type Props = {
  /** Header label — always visible, even when collapsed. */
  title: string;
  children: ReactNode;
  /** Extra deps that change the body height (forwarded to AnimatedPanel). */
  measureDeps?: DependencyList;
  defaultCollapsed?: boolean;
};

/**
 * A rail panel whose body collapses to just its title bar. The title + chevron
 * stay visible when collapsed so the section is still identifiable and one click
 * away. Height animates via AnimatedPanel (collapsed is a measure dep), so the
 * open/close is smooth. Collapsed state is local per panel.
 */
export function CollapsiblePanel({
  title,
  children,
  measureDeps = [],
  defaultCollapsed = false,
}: Props) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);

  return (
    <AnimatedPanel
      className={styles.panel}
      bodyClassName={styles.panelBody}
      measureDeps={[collapsed, ...measureDeps]}
    >
      <button
        type="button"
        className={styles.panelToggle}
        onClick={() => setCollapsed((c) => !c)}
        aria-expanded={!collapsed}
      >
        <span className={styles.railHeading}>{title}</span>
        <ChevronDown
          size={16}
          aria-hidden
          className={`${styles.panelChevron} ${collapsed ? '' : styles.panelChevronOpen}`}
        />
      </button>
      {!collapsed && children}
    </AnimatedPanel>
  );
}
