'use client';

import { ProductGridControls } from './ProductGridControls';
import typography from '@/components/SectionHeader.module.css';
import styles from './CollectionSectionHeader.module.css';

type Props = {
  title: string;
  id?: string;
  level?: 1 | 2;
  view?: string;
  onViewChange?: (view: 'grid' | 'list') => void;
};

/** Keep collection titles and density controls together at every screen size. */
export default function CollectionSectionHeader({ title, id, level = 2, view, onViewChange }: Props) {
  const Heading = level === 1 ? 'h1' : 'h2';
  return <header className={styles.header} data-collection-header>
    <Heading id={id} className={`${typography.title} ${styles.title}`}>{title}</Heading>
    <ProductGridControls view={view} onViewChange={onViewChange} showList={false}/>
  </header>;
}
