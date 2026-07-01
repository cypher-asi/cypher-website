'use client';

import { useEffect, useRef, useState } from 'react';
import styles from './PlotMetrics.module.css';

const TOTAL = { label: 'Total Island Plots', value: 4444 };

const METRICS = [
  { label: 'Residential', value: 2629 },
  { label: 'Commercial', value: 1120 },
  { label: 'Industrial', value: 450 },
  { label: 'Mixed Use', value: 220 },
  { label: 'Legendary', value: 25 },
];

const DURATION = 1600;

function useCountUp(target: number, run: boolean) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!run) return;
    let raf = 0;
    const start = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / DURATION);
      const eased = 1 - Math.pow(1 - p, 3);
      setN(Math.round(target * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, run]);
  return n;
}

function Stat({
  label,
  value,
  run,
  large,
}: {
  label: string;
  value: number;
  run: boolean;
  large?: boolean;
}) {
  const n = useCountUp(value, run);
  return (
    <div className={`${styles.stat} ${large ? styles.statLarge : ''}`}>
      <span className={styles.value}>{n.toLocaleString('en-US')}</span>
      <span className={styles.label}>{label}</span>
    </div>
  );
}

export default function PlotMetrics() {
  const ref = useRef<HTMLDivElement>(null);
  const [run, setRun] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setRun(true);
          io.disconnect();
        }
      },
      { threshold: 0.3 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div className={styles.wrap} ref={ref}>
      <Stat label={TOTAL.label} value={TOTAL.value} run={run} large />
      <div className={styles.grid}>
        {METRICS.map((m) => (
          <Stat key={m.label} label={m.label} value={m.value} run={run} />
        ))}
      </div>
    </div>
  );
}
