import type { ReactNode } from 'react';
import Image from 'next/image';
import type { Block } from '../zero-os/content';
import styles from './WhitepaperBody.module.css';

function isTopLevel(num: string) {
  return /^\d+\.0$/.test(num) || num.startsWith('Appendix');
}

// Many list items follow a "Term: definition" shape. Emphasize the term so
// the lists read like a glossary rather than a wall of text.
function renderItem(item: string): ReactNode {
  const idx = item.indexOf(':');
  if (idx > 0 && idx <= 48) {
    const term = item.slice(0, idx);
    const rest = item.slice(idx + 1);
    // Only treat as a label when the term is short and has no sentence break.
    if (!/[.!?]/.test(term)) {
      return (
        <>
          <strong className={styles.term}>{term}</strong>
          {rest}
        </>
      );
    }
  }
  return item;
}

export function WhitepaperBody({ blocks }: { blocks: Block[] }) {
  return (
    <div className={styles.body}>
      {blocks.map((block, i) => {
        switch (block.kind) {
          case 'h': {
            const top = isTopLevel(block.num);
            const HeadingTag = top ? 'h2' : 'h3';
            return (
              <HeadingTag
                key={i}
                id={block.id}
                className={`${styles.heading} ${top ? styles.h2 : styles.h3}`}
              >
                <span className={styles.headingNum}>{block.num}</span>
                {block.title}
              </HeadingTag>
            );
          }
          case 'p':
            return (
              <p key={i} className={styles.paragraph}>
                {block.text}
              </p>
            );
          case 'ul':
            return (
              <ul key={i} className={styles.list}>
                {block.items.map((it, j) => (
                  <li key={j}>{renderItem(it)}</li>
                ))}
              </ul>
            );
          case 'ol':
            return (
              <ol key={i} className={`${styles.list} ${styles.ordered}`}>
                {block.items.map((it, j) => (
                  <li key={j}>{renderItem(it)}</li>
                ))}
              </ol>
            );
          case 'figure':
            return (
              <figure key={i} className={styles.figure}>
                <Image
                  src={block.src}
                  width={block.w}
                  height={block.h}
                  alt={block.caption ?? 'Whitepaper figure'}
                  sizes="(max-width: 880px) 100vw, 720px"
                  className={styles.figureImg}
                  unoptimized
                />
                {block.caption && (
                  <figcaption className={styles.figcaption}>{block.caption}</figcaption>
                )}
              </figure>
            );
          default:
            return null;
        }
      })}
    </div>
  );
}
