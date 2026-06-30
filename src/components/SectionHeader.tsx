import type { ReactNode } from 'react';
import styles from './SectionHeader.module.css';

export type SectionHeaderProps = {
  /** Optional small overline label above the title. */
  eyebrow?: string;
  title: ReactNode;
  subtitle?: ReactNode;
  /** Heading level for the title. Defaults to h2. */
  as?: 'h1' | 'h2';
  /** Optional content (e.g. a CTA button) rendered under the description. */
  children?: ReactNode;
};

/**
 * Centered section header with standardized vertical rhythm. Shared so the
 * Wilder World gameplay intro and the Universe page lead read identically.
 */
export function SectionHeader({
  eyebrow,
  title,
  subtitle,
  as: Heading = 'h2',
  children,
}: SectionHeaderProps) {
  return (
    <header className={styles.header}>
      {eyebrow ? <p className={styles.eyebrow}>{eyebrow}</p> : null}
      <Heading className={styles.title}>{title}</Heading>
      {subtitle ? <p className={styles.subtitle}>{subtitle}</p> : null}
      {children ? <div className={styles.actions}>{children}</div> : null}
    </header>
  );
}
