import styles from './page.module.css';

export default function DocsPage() {
  return (
    <div className={styles.page}>
      <aside className={styles.sidebar}>
        <h4 className={styles.sidebarHeading}>Documentation</h4>
        <ul className={styles.sidebarLinks}>
          <li className={styles.sidebarLinkActive}>Getting Started</li>
          <li className={styles.sidebarLink}>Installation</li>
          <li className={styles.sidebarLink}>Linking ZUI</li>
          <li className={styles.sidebarLink}>Theming</li>
          <li className={styles.sidebarLink}>CSS Modules</li>
        </ul>
      </aside>

      <article className={styles.content}>
        <h1 className={styles.heading}>Getting Started</h1>
        <p className={styles.paragraph}>
          Cypher Web is a minimal Next.js boilerplate that demonstrates how to
          consume the <strong>ZUI</strong> design system from a local package
          using <code>npm&nbsp;link</code>.
        </p>

        <h2 className={styles.subheading}>Prerequisites</h2>
        <ul className={styles.list}>
          <li>Node.js LTS (18+)</li>
          <li>npm 9+</li>
          <li>The <code>@cypher-asi/zui</code> package checked out at <code>../zui</code></li>
        </ul>

        <h2 className={styles.subheading}>Quick Start</h2>
        <pre className={styles.codeBlock}>
{`# In ../zui
npm install
npm link

# In this project
npm install
npm link @cypher-asi/zui
npm run dev`}
        </pre>

        <h2 className={styles.subheading}>Project Structure</h2>
        <p className={styles.paragraph}>
          The project uses Next.js App Router with a <code>src/</code> directory.
          All page-specific styles use CSS Modules. ZUI global styles are imported
          once in <code>layout.tsx</code>. Interactive ZUI components are wrapped
          in client components to satisfy the React Server Components boundary.
        </p>
      </article>
    </div>
  );
}
