import type { Metadata } from 'next';
import { WhitepaperLayout } from '../_components/WhitepaperLayout';
import { WhitepaperBody } from '../_components/WhitepaperBody';
import { buildToc } from '../_components/toc';
import { abstract, blocks } from './content';

export const metadata: Metadata = {
  title: 'AURA Harness — A Deterministic Multi-Agent Runtime | Cypher Research',
  description:
    'The AURA Harness whitepaper: a deterministic multi-agent runtime built on per-agent append-only record logs, a sealed kernel boundary, and cross-agent parallelism.',
};

const sections = buildToc(
  blocks.filter((b): b is Extract<typeof b, { kind: 'h' }> => b.kind === 'h')
);

export default function AuraHarnessPaper() {
  return (
    <WhitepaperLayout
      eyebrow="Research / Whitepaper"
      title={
        <>
          AURA Harness: A Deterministic
          <br />
          Multi-Agent Runtime
        </>
      }
      status="Whitepaper · 2025"
      year="2025"
      lead={<p>{abstract}</p>}
      sections={sections}
    >
      <WhitepaperBody blocks={blocks} />
    </WhitepaperLayout>
  );
}
