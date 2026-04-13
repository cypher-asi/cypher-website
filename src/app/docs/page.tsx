import styles from './page.module.css';

export default function DocsPage() {
  return (
    <div className={styles.page}>
      <aside className={styles.sidebar}>
        <h4 className={styles.sidebarHeading}>Documentation</h4>
        <ul className={styles.sidebarLinks}>
          <li className={styles.sidebarLinkActive}>Getting Started</li>
          <li className={styles.sidebarLink}>Installation</li>
          <li className={styles.sidebarLink}>Theming</li>
          <li className={styles.sidebarLink}>CSS Modules</li>
        </ul>
      </aside>

      <article className={styles.content}>
        <h1 className={styles.heading}>Getting Started</h1>
        <p className={styles.paragraph}>
          Cypher Web is a Next.js site for the Cypher ecosystem, presenting the
          tools, protocols, and vision behind autonomous agent infrastructure.
        </p>

        <h2 className={styles.subheading}>Prerequisites</h2>
        <ul className={styles.list}>
          <li>Node.js LTS (20+)</li>
          <li>npm 10+</li>
        </ul>

        <h2 className={styles.subheading}>Quick Start</h2>
        <pre className={styles.codeBlock}>
{`npm install
npm run dev`}
        </pre>

        <h2 className={styles.subheading}>Project Structure</h2>
        <p className={styles.paragraph}>
          The project uses Next.js App Router with a <code>src/</code> directory.
          All page-specific styles use CSS Modules. Global theme tokens and design
          variables are defined in <code>globals.css</code> and imported once
          in <code>layout.tsx</code>.
        </p>
      </article>
    </div>
  );
}
