import type { ReactNode } from 'react';
import Image from 'next/image';
import type { Block } from '../zero-os/content';
import styles from './WhitepaperBody.module.css';

function isTopLevel(num: string) {
  return /^\d+\.0$/.test(num) || num.startsWith('Appendix');
}

// Lightweight inline markup so data files can stay plain strings: `code`,
// **bold**, and *emphasis*. Returns React nodes with the markers stripped.
function renderInline(text: string): ReactNode {
  const tokens = text.split(/(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)/g);
  return tokens.map((tok, i) => {
    if (tok.startsWith('`') && tok.endsWith('`')) {
      return (
        <code key={i} className={styles.inlineCode}>
          {tok.slice(1, -1)}
        </code>
      );
    }
    if (tok.startsWith('**') && tok.endsWith('**')) {
      return <strong key={i}>{tok.slice(2, -2)}</strong>;
    }
    if (tok.startsWith('*') && tok.endsWith('*')) {
      return <em key={i}>{tok.slice(1, -1)}</em>;
    }
    return tok;
  });
}

// Many list items follow a "Term: definition" shape. Emphasize the term so
// the lists read like a glossary rather than a wall of text.
function renderItem(item: string): ReactNode {
  const idx = item.indexOf(':');
  if (idx > 0 && idx <= 48) {
    const term = item.slice(0, idx);
    const rest = item.slice(idx + 1);
    // Only treat as a label when the term is short, has no sentence break, and
    // carries no inline markup of its own.
    if (!/[.!?`*]/.test(term)) {
      return (
        <>
          <strong className={styles.term}>{term}</strong>
          {renderInline(rest)}
        </>
      );
    }
  }
  return renderInline(item);
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
                {renderInline(block.text)}
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
          case 'table':
            return (
              <div key={i} className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      {block.headers.map((h, j) => (
                        <th key={j}>{renderInline(h)}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {block.rows.map((row, r) => (
                      <tr key={r}>
                        {row.map((cell, c) => (
                          <td key={c}>{renderInline(cell)}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          case 'code':
            return (
              <pre key={i} className={styles.code}>
                <code>{block.text}</code>
              </pre>
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
