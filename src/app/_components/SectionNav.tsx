'use client';

import { useState, useEffect, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import { pageSections } from './pageSections';
import styles from './SectionNav.module.css';

export function SectionNav() {
  const pathname = usePathname();
  const sections = pageSections[pathname];
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    if (!sections?.length) return;

    setActiveId(sections[0].id);

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        }
      },
      { rootMargin: '-30% 0px -50% 0px', threshold: 0 }
    );

    for (const { id } of sections) {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    }

    return () => observer.disconnect();
  }, [sections]);

  const handleClick = useCallback((id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, []);

  if (!sections?.length) return null;

  return (
    <div className={styles.wrapper}>
      <nav className={styles.sectionNav}>
        {sections.map(({ id, label }) => (
          <button
            key={id}
            className={`${styles.item} ${activeId === id ? styles.active : ''}`}
            onClick={() => handleClick(id)}
          >
            {label}
          </button>
        ))}
      </nav>
    </div>
  );
}
