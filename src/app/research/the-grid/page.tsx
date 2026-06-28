import type { Metadata } from 'next';
import { WhitepaperLayout } from '../_components/WhitepaperLayout';
import { WhitepaperBody } from '../_components/WhitepaperBody';
import { buildToc } from '../_components/toc';
import { abstract, blocks } from './content';

export const metadata: Metadata = {
  title: 'THE GRID — The Global Resilient Internet Datalink | Cypher Research',
  description:
    'THE GRID whitepaper: a distributed verifiable execution environment that separates execution from coordination, built on zero-knowledge proofs and post-quantum cryptography.',
};

const sections = buildToc(
  blocks.filter((b): b is Extract<typeof b, { kind: 'h' }> => b.kind === 'h')
);

export default function TheGridPaper() {
  return (
    <WhitepaperLayout
      eyebrow="Research / Whitepaper"
      title={
        <>
          THE GRID:
          <br />
          The Global Resilient Internet Datalink
        </>
      }
      status="Whitepaper · v0.6.0 · 2026"
      author="n3o"
      year="2026"
      lead={
        <>
          {abstract.map((para, i) => (
            <p key={i} style={i > 0 ? { marginTop: '1rem' } : undefined}>
              {para}
            </p>
          ))}
        </>
      }
      sections={sections}
    >
      <WhitepaperBody blocks={blocks} />
    </WhitepaperLayout>
  );
}
