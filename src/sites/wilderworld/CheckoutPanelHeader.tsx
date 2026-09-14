import Link from 'next/link';
import styles from './VehicleCheckout.module.css';

/**
 * A checkout panel's title, with the way back to the store on the same line.
 *
 * The link used to float above the panel, attached to nothing, which read as a
 * stray control rather than part of the thing it belongs to. Sitting opposite
 * the title makes it obvious what leaving would leave.
 *
 * Not used by the purchase-complete panel: that one already ends in a primary
 * Back to store button, and offering the same thing twice on one screen makes
 * the buyer weigh two options that do the same thing.
 */
export function CheckoutPanelHeader({ title }: { title: string }) {
  return (
    <div className={styles.panelHeader}>
      <h1 className={styles.panelTitle}>{title}</h1>
      <Link href="/vehicles" className={styles.backToStore}>
        {'‹'} Back to store
      </Link>
    </div>
  );
}
