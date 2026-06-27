import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import styles from './page.module.css';

interface Product {
  id: string;
  name: string;
  tagline: string;
  href: string;
  external?: boolean;
  accent: 'cyan' | 'blue' | 'purple' | 'green' | 'orange' | 'rose';
  /** bento placement class applied to the card */
  span?: string;
}

const products: Product[] = [
  {
    id: 'aura',
    name: 'AURA',
    tagline: 'Autonomous engineering agents.',
    href: 'https://aura.ai',
    external: true,
    accent: 'cyan',
    span: 'tall',
  },
  {
    id: 'zero',
    name: 'ZERO',
    tagline: 'A secure OS for an agentic world.',
    href: '/zero',
    accent: 'blue',
  },
  {
    id: 'wilder-world',
    name: 'Wilder World',
    tagline: 'An immersive on-chain metaverse.',
    href: '#',
    accent: 'purple',
  },
  {
    id: 'z-chain',
    name: 'Z Chain',
    tagline: 'Trust layer for autonomous systems.',
    href: 'https://zchain.org',
    external: true,
    accent: 'green',
  },
  {
    id: 'zode',
    name: 'ZODE',
    tagline: 'Agentic coding, end to end.',
    href: '/zode',
    accent: 'orange',
    span: 'wide',
  },
  {
    id: 'the-grid',
    name: 'THE GRID',
    tagline: 'Distributed compute fabric.',
    href: 'https://github.com/cypher-asi/the-grid',
    external: true,
    accent: 'rose',
  },
  {
    id: 'zns',
    name: 'ZNS',
    tagline: 'Naming for the network.',
    href: '#',
    accent: 'cyan',
    span: 'banner',
  },
];

function CardInner({ product, index }: { product: Product; index: number }) {
  return (
    <>
      <span className={styles.cardGrid} aria-hidden />
      <span className={styles.cardArrow}>
        <ArrowUpRight size={16} />
      </span>
      <span className={styles.cardMeta}>0{index + 1}</span>
      <span className={styles.cardBody}>
        <span className={styles.cardName}>{product.name}</span>
        <span className={styles.cardTagline}>{product.tagline}</span>
      </span>
    </>
  );
}

export default function Home() {
  return (
    <div className={styles.page}>
      <header className={styles.intro}>
        <p className={styles.eyebrow}>PRODUCTS</p>
        <h1 className={styles.headline}>
          Tools for the <span className={styles.headlineMuted}>Machine Age.</span>
        </h1>
      </header>

      <div className={styles.grid}>
        {products.map((product, index) => {
          const className = `${styles.card} ${product.span ? styles[product.span] : ''}`;
          const style = { animationDelay: `${120 + index * 70}ms` } as const;

          return product.external ? (
            <a
              key={product.id}
              href={product.href}
              target="_blank"
              rel="noopener noreferrer"
              className={className}
              data-accent={product.accent}
              style={style}
            >
              <CardInner product={product} index={index} />
            </a>
          ) : (
            <Link
              key={product.id}
              href={product.href}
              className={className}
              data-accent={product.accent}
              style={style}
            >
              <CardInner product={product} index={index} />
            </Link>
          );
        })}
      </div>
    </div>
  );
}
