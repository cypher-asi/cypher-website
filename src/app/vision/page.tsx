import styles from './page.module.css';

export default function VisionPage() {
  return (
    <div className={styles.page}>
      <header className={styles.hero}>
        <p className={styles.eyebrow}>OUR VISION</p>
        <h1 className={styles.heading}>
          Building Infrastructure for the <span className={styles.accent}>Machine Age</span>
        </h1>
        <p className={styles.subtitle}>
          We believe the next era of computing will be defined not by humans
          operating software, but by autonomous agents collaborating at scale.
          Cypher exists to build the foundational layer that makes this possible.
        </p>
      </header>

      <section className={styles.grid}>
        <article className={styles.card}>
          <span className={styles.cardNumber}>01</span>
          <h3 className={styles.cardTitle}>Agent-First Architecture</h3>
          <p className={styles.cardBody}>
            Every protocol, tool, and interface we ship is designed for agents as
            first-class citizens — not retrofitted onto human workflows.
          </p>
        </article>

        <article className={styles.card}>
          <span className={styles.cardNumber}>02</span>
          <h3 className={styles.cardTitle}>Trustless Coordination</h3>
          <p className={styles.cardBody}>
            Agents need verifiable identity, secure communication, and auditable
            execution. We provide the cryptographic primitives to make trust
            programmable.
          </p>
        </article>

        <article className={styles.card}>
          <span className={styles.cardNumber}>03</span>
          <h3 className={styles.cardTitle}>Composable Swarms</h3>
          <p className={styles.cardBody}>
            Single agents are useful. Swarms of specialised agents, coordinating
            across chains and networks, are transformative. Our runtime makes
            orchestration seamless.
          </p>
        </article>

        <article className={styles.card}>
          <span className={styles.cardNumber}>04</span>
          <h3 className={styles.cardTitle}>Open &amp; Permissionless</h3>
          <p className={styles.cardBody}>
            The machine economy must be open. Our protocols are public goods —
            anyone can deploy agents, contribute compute, or extend the network
            without gatekeepers.
          </p>
        </article>
      </section>

      <section className={styles.statement}>
        <blockquote className={styles.quote}>
          &ldquo;We are not building for the next product cycle. We are building
          for a future where billions of autonomous agents transact, create, and
          evolve — and the infrastructure they run on matters.&rdquo;
        </blockquote>
      </section>
    </div>
  );
}
