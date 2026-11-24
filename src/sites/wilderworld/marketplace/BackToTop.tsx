'use client';
import { useEffect, useState } from 'react';
import { ArrowUp } from 'lucide-react';
import styles from './BackToTop.module.css';

// Shown once the visitor has scrolled about one and a half screens down a long
// product list; scrolls the window back to the top.
const SHOW_AFTER_VIEWPORTS = 1.5;

export default function BackToTop() {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const update = () => setVisible(window.scrollY > window.innerHeight * SHOW_AFTER_VIEWPORTS);
    update();
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, []);
  if (!visible) return null;
  const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  return (
    <button
      type="button"
      className={styles.backToTop}
      aria-label="Back to top"
      onClick={() => window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' })}
    >
      <ArrowUp size={18} aria-hidden />
    </button>
  );
}
