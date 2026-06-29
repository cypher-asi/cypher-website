import styles from './Landing.module.css';

export default function WilderLanding() {
  return (
    <div className={styles.page}>
      <h1 className={styles.heading}>Wilder World</h1>
      <p className={styles.subtitle}>
        A photorealistic, immersive virtual simulation.
      </p>
    </div>
  );
}
