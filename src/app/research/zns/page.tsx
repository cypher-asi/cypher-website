import type { Metadata } from 'next';
import { WhitepaperLayout } from '../_components/WhitepaperLayout';
import { WhitepaperBody } from '../_components/WhitepaperBody';
import { buildToc } from '../_components/toc';
import { abstract, blocks } from './content';

export const metadata: Metadata = {
  title: 'ZNS — A Tokenized Hierarchical Identity Protocol | Cypher Research',
  description:
    'The Zero Name Service (ZNS) whitepaper: an on-chain naming protocol that tokenizes hierarchical domain names as ERC-721 assets.',
};

const sections = buildToc(
  blocks.filter((b): b is Extract<typeof b, { kind: 'h' }> => b.kind === 'h')
);

export default function ZnsPaper() {
  return (
    <WhitepaperLayout
      eyebrow="Research / Whitepaper"
      title={
        <>
          Zero Name Service:
          <br />
          A Tokenized Identity Protocol
        </>
      }
      status="Whitepaper · 2025"
      author="n3o"
      year="2025"
      lead={<p>{abstract}</p>}
      sections={sections}
    >
      <WhitepaperBody blocks={blocks} />
    </WhitepaperLayout>
  );
}
