'use client';

import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { scrollToSection } from './scrollToSection';
import styles from './Footer.module.css';

interface FooterLink {
  label: string;
  href: string;
  external?: boolean;
  // When set, clicking smooth-scrolls to the element with this id on the
  // current page instead of navigating to `href`.
  scrollTo?: string;
  // Optional year shown as a small date tick next to the label.
  year?: string;
}

interface FooterColumn {
  heading: string;
  links: FooterLink[];
}

interface Repo {
  name: string;
  description: string;
}

interface RepoGroup {
  project: string;
  repos: Repo[];
}

const GITHUB_ORG = 'https://github.com/cypher-asi';

// Public org repositories, grouped by project. Static snapshot.
const repoGroups: RepoGroup[] = [
  {
    project: 'AURA',
    repos: [
      { name: 'aura-os', description: 'The Secure OS for AI agents.' },
      { name: 'aura-harness', description: 'A frontier harness for agentic intelligence.' },
      { name: 'aura-router', description: 'Model proxy and billing router for the AURA network.' },
      { name: 'aura-storage', description: 'The execution data layer for the AURA platform.' },
      { name: 'aura-swarm', description: 'An orchestration environment for deploying agent swarms at scale.' },
      { name: 'aura-network', description: 'The social network layer for autonomous agents and teams.' },
      { name: 'aura-bridge', description: 'The AURA bridge to open messaging systems.' },
      { name: 'aura-website', description: 'The official aura.ai website.' },
    ],
  },
  {
    project: 'ZERO',
    repos: [
      { name: 'zero-os', description: 'A verifiable OS.' },
      { name: 'zos', description: 'A secure and resilient communication system.' },
      { name: 'zero-sdk', description: 'Official SDK for the ZERO messaging protocol.' },
      { name: 'zero-auth', description: 'The auth service for zero-id.' },
      { name: 'zero-vault', description: 'A system for secrets, remote key signing, and access policies.' },
      { name: 'zid', description: 'A post-quantum sovereign identity system.' },
    ],
  },
  {
    project: 'The Grid',
    repos: [
      { name: 'the-grid', description: 'The Global Resilient Internet Datalink.' },
      { name: 'machina', description: 'A compute orchestration environment for the Machine Age.' },
      { name: 'the-grid-legacy', description: 'An unstoppable distributed compute network.' },
    ],
  },
  {
    project: 'Wilder World',
    repos: [
      { name: 'wilderworld-com', description: 'The official Wilder World site and web platform.' },
    ],
  },
  {
    project: 'Cypher Core',
    repos: [
      { name: 'cypher-website', description: 'The official cypher.net website.' },
      { name: 'cypher-asi', description: 'Tools for the Machine Age.' },
      { name: 'z-billing', description: 'The core payments, billing and usage system for the Cypher network.' },
      { name: 'orbit', description: 'A fast git system for machines.' },
      { name: 'spectron', description: 'A code analysis tool for complex code bases.' },
      { name: 'shell', description: 'The standard app shell used to build Cypher ecosystem projects.' },
      { name: 'zui', description: 'A future UI kit made for machines.' },
    ],
  },
];

const columns: FooterColumn[] = [
  {
    heading: 'Companies',
    links: [
      { label: 'AURA', href: 'https://aura.ai', external: true },
      { label: 'ZODE', href: 'https://zode.org', external: true },
      { label: 'Wilder World', href: 'https://wilderworld.com', external: true },
      { label: 'Z Chain', href: 'https://zchain.org', external: true },
      { label: 'ZERO', href: 'https://zero.tech', external: true },
    ],
  },
  {
    heading: 'Research',
    links: [
      { label: 'THE GRID', href: '/research/the-grid', year: '2026' },
      { label: 'AURA Harness', href: '/research/aura-harness', year: '2025' },
      { label: 'ZNS', href: '/research/zns', year: '2022' },
      { label: 'ZERO OS', href: '/research/zero-os', year: '2020' },
    ],
  },
  {
    heading: 'Company',
    links: [
      { label: 'Mission', href: '/vision', scrollTo: 'what-we-do' },
      { label: 'News', href: 'https://zine.live', external: true },
      { label: 'Privacy Policy', href: '/privacy' },
      { label: 'Terms', href: '/terms' },
      { label: 'Contact', href: '/contact' },
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
                {column.links.map((link) => {
                  const tick = link.year ? (
                    <span className={styles.yearTick}>{link.year}</span>
                  ) : null;
                  return (
                    <li key={`${column.heading}-${link.label}`}>
                      {link.scrollTo ? (
                        <button
                          type="button"
                          className={styles.link}
                          onClick={() => scrollToSection(link.scrollTo!)}
                        >
                          {link.label}
                          {tick}
                        </button>
                      ) : link.external ? (
                        <a
                          className={styles.link}
                          href={link.href}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {link.label}
                          <ArrowUpRight size={12} className={styles.externalIcon} />
                          {tick}
                        </a>
                      ) : (
                        <Link className={styles.link} href={link.href}>
                          {link.label}
                          {tick}
                        </Link>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        <section className={styles.openSource} aria-label="Open source repositories">
          <div className={styles.openSourceHead}>
            <h2 className={styles.heading}>Open Source</h2>
            <a
              className={styles.openSourceAll}
              href={`${GITHUB_ORG}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              All repositories
              <ArrowUpRight size={12} className={styles.externalIcon} />
            </a>
          </div>
          <div className={styles.repoGroups}>
            {repoGroups.map((group) => (
              <div key={group.project} className={styles.repoGroup}>
                <h3 className={styles.repoGroupHeading}>{group.project}</h3>
                <ul className={styles.repoList}>
                  {group.repos.map((repo) => (
                    <li key={repo.name}>
                      <a
                        className={styles.repoItem}
                        href={`${GITHUB_ORG}/${repo.name}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <span className={styles.repoName}>
                          {repo.name}
                          <ArrowUpRight size={11} className={styles.externalIcon} />
                        </span>
                        <span className={styles.repoDesc}>{repo.description}</span>
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

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
          <img className={styles.brandImage} src="/images/brand/cypher-wordmark.png" alt="/CYPHER" />
        </div>
      </div>
    </footer>
  );
}
