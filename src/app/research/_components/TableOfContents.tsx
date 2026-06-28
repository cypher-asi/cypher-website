'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { collectParentIds, pathTo, type TocNode } from './toc';
import styles from './TableOfContents.module.css';

interface TocItemProps {
  node: TocNode;
  depth: number;
  activeId: string | null;
  expanded: Set<string>;
  onToggle: (id: string) => void;
  onSelect: (id: string) => void;
}

function TocItem({ node, depth, activeId, expanded, onToggle, onSelect }: TocItemProps) {
  const hasChildren = !!node.children && node.children.length > 0;
  const isExpanded = expanded.has(node.id);
  const isActive = activeId === node.id;

  return (
    <li className={styles.item}>
      <div className={styles.row} style={{ paddingLeft: `${depth * 0.85}rem` }}>
        {hasChildren ? (
          <button
            type="button"
            className={styles.toggle}
            aria-label={isExpanded ? 'Collapse section' : 'Expand section'}
            aria-expanded={isExpanded}
            onClick={() => onToggle(node.id)}
          >
            <ChevronRight
              size={12}
              className={`${styles.chevron} ${isExpanded ? styles.chevronOpen : ''}`}
            />
          </button>
        ) : (
          <span className={styles.toggleSpacer} aria-hidden />
        )}
        <a
          href={`#${node.id}`}
          data-tocid={node.id}
          className={`${styles.link} ${isActive ? styles.linkActive : ''}`}
          onClick={(e) => {
            e.preventDefault();
            onSelect(node.id);
          }}
        >
          {node.label}
        </a>
      </div>
      {hasChildren && isExpanded && (
        <ul className={styles.children}>
          {node.children!.map((child) => (
            <TocItem
              key={child.id}
              node={child}
              depth={depth + 1}
              activeId={activeId}
              expanded={expanded}
              onToggle={onToggle}
              onSelect={onSelect}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

interface TableOfContentsProps {
  items: TocNode[];
  activeId: string | null;
  onSelect: (id: string) => void;
}

export function TableOfContents({ items, activeId, onSelect }: TableOfContentsProps) {
  // Start with every parent expanded so subitems are visible by default.
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set(collectParentIds(items)));
  const rootRef = useRef<HTMLUListElement | null>(null);

  // Keep the branch containing the active section expanded.
  useEffect(() => {
    if (!activeId) return;
    const trail = pathTo(items, activeId);
    if (trail && trail.length) {
      setExpanded((prev) => {
        const next = new Set(prev);
        trail.forEach((id) => next.add(id));
        return next;
      });
    }
  }, [activeId, items]);

  // Scroll the active item into view within the TOC's own scroll container
  // (never the page).
  useEffect(() => {
    if (!activeId || !rootRef.current) return;
    const el = rootRef.current.querySelector<HTMLElement>(`[data-tocid="${CSS.escape(activeId)}"]`);
    const container = rootRef.current.closest<HTMLElement>('[data-toc-scroll]');
    if (!el || !container) return;
    const er = el.getBoundingClientRect();
    const cr = container.getBoundingClientRect();
    if (er.top < cr.top) {
      container.scrollTop += er.top - cr.top - 16;
    } else if (er.bottom > cr.bottom) {
      container.scrollTop += er.bottom - cr.bottom + 16;
    }
  }, [activeId]);

  const toggle = useCallback((id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const tree = useMemo(() => items, [items]);

  return (
    <ul className={styles.root} ref={rootRef}>
      {tree.map((node) => (
        <TocItem
          key={node.id}
          node={node}
          depth={0}
          activeId={activeId}
          expanded={expanded}
          onToggle={toggle}
          onSelect={onSelect}
        />
      ))}
    </ul>
  );
}
