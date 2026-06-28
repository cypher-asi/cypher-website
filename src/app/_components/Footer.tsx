import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import styles from './Footer.module.css';

interface FooterLink {
  label: string;
  href: string;
  external?: boolean;
}

interface FooterColumn {
  heading: string;
  links: FooterLink[];
}

const columns: FooterColumn[] = [
  {
    heading: 'Companies',
    links: [
      { label: 'AURA', href: 'https://aura.ai', external: true },
      { label: 'ZERO', href: '/zero' },
      { label: 'ZNS', href: '#' },
      { label: 'Z Chain', href: 'https://zchain.org', external: true },
      { label: 'ZODE', href: '/zode' },
      { label: 'Wilder World', href: 'https://wilderworld.com', external: true },
      { label: 'The GRID', href: 'https://github.com/cypher-asi/the-grid', external: true },
    ],
  },
  {
    heading: 'Research',
    links: [
      { label: 'The GRID', href: '#' },
      { label: 'AURA OS', href: '#' },
      { label: 'AURA Harness', href: '#' },
      { label: 'ZERO Name Service', href: '#' },
      { label: 'ZERO Protocol', href: '#' },
    ],
  },
  {
    heading: 'Social',
    links: [
      { label: 'ZINE', href: 'https://zine.live', external: true },
      { label: 'AURA', href: 'https://x.com/aura_asi', external: true },
      { label: 'ZERO', href: 'https://x.com/zero_app', external: true },
      { label: 'ZODE', href: 'https://x.com/zode_org', external: true },
      { label: 'Z Chain', href: 'https://x.com/zchain_org', external: true },
      { label: 'Wilder World', href: 'https://x.com/wilderworld', external: true },
    ],
  },
  {
    heading: 'Company',
    links: [
      { label: 'Mission', href: '/vision' },
      { label: 'About', href: '#' },
      { label: 'Privacy Policy', href: '#' },
      { label: 'Terms', href: '#' },
      { label: 'Contact', href: '#' },
    ],
  },
];

function XIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24h-6.66l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function GithubIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
    </svg>
  );
}

export function Footer() {
  return (
    <footer className={styles.footer} aria-label="Site footer">
      <div className={styles.inner}>
        <nav className={styles.columns} aria-label="Footer navigation">
          {columns.map((column) => (
            <div key={column.heading} className={styles.column}>
              <h2 className={styles.heading}>{column.heading}</h2>
              <ul className={styles.links}>
                {column.links.map((link) => (
                  <li key={`${column.heading}-${link.label}`}>
                    {link.external ? (
                      <a
                        className={styles.link}
                        href={link.href}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {link.label}
                        <ArrowUpRight size={12} className={styles.externalIcon} />
                      </a>
                    ) : (
                      <Link className={styles.link} href={link.href}>
                        {link.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        <div className={styles.bottom}>
          <div className={styles.social}>
            <a
              className={styles.socialLink}
              href="https://x.com/cypher_asi"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Cypher on X"
            >
              <XIcon size={18} />
            </a>
            <a
              className={styles.socialLink}
              href="https://github.com/cypher-asi"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Cypher on GitHub"
            >
              <GithubIcon size={18} />
            </a>
          </div>
          <p className={styles.copyright}>Copyright &copy; 2026 Cypher, Inc.</p>
        </div>

        <div className={styles.brandWrap}>
          <span className={styles.brand}>
            <span className={styles.brandSlash}>/</span>
            <span className={styles.brandLetters}>CYPHER</span>
          </span>
        </div>
      </div>
    </footer>
  );
}
