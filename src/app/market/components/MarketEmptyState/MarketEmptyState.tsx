import { ArrowUpRight } from 'lucide-react';
import styles from '../../market.module.css';

type Props = {
  title: string;
  body: string;
  openseaSlug?: string;
};

export function MarketEmptyState({ title, body, openseaSlug }: Props) {
  return (
    <div className={styles.empty}>
      <p className={styles.emptyTitle}>{title}</p>
      <p className={styles.emptyBody}>{body}</p>
      {openseaSlug && (
        <a
          className={styles.emptyLink}
          href={`https://opensea.io/collection/${openseaSlug}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          Open on OpenSea
          <ArrowUpRight size={14} />
        </a>
      )}
    </div>
  );
}
