export interface Paper {
  slug: string;
  title: string;
  year: string;
  blurb: string;
  available: boolean;
}

// Ordered newest-first, matching the Research column in the site footer.
export const papers: Paper[] = [
  {
    slug: 'the-grid',
    title: 'The Grid',
    year: '2026',
    blurb: 'A distributed verifiable execution environment that separates execution from coordination, built on zero-knowledge proofs and post-quantum cryptography.',
    available: true,
  },
  {
    slug: 'zns',
    title: 'ZNS',
    year: '2025',
    blurb: 'The Zero Name Service — a tokenized hierarchical identity protocol with names as ERC-721 assets.',
    available: true,
  },
  {
    slug: 'aura-harness',
    title: 'AURA Harness',
    year: '2025',
    blurb: 'A deterministic multi-agent runtime built on per-agent append-only record logs, a sealed kernel boundary, and cross-agent parallelism.',
    available: true,
  },
  {
    slug: 'zero-os',
    title: 'ZERO OS',
    year: '2020',
    blurb: 'A peer-to-peer social operating system and a decentralized alternative to centralized platforms.',
    available: true,
  },
];

export function getPaper(slug: string): Paper | undefined {
  return papers.find((p) => p.slug === slug);
}
