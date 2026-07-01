'use client';

import { useEffect, useState } from 'react';

const MOBILE_QUERY = '(max-width: 640px)';

type ImageFormat = 'webp' | 'jpg';

type NetworkInformation = {
  saveData?: boolean;
  effectiveType?: string;
  addEventListener?: (type: 'change', listener: () => void) => void;
  removeEventListener?: (type: 'change', listener: () => void) => void;
};

function pickFormat(): ImageFormat {
  if (typeof navigator === 'undefined') return 'webp';
  const conn = (navigator as Navigator & { connection?: NetworkInformation })
    .connection;
  if (!conn) return 'webp';
  if (conn.saveData) return 'jpg';
  const type = conn.effectiveType ?? '';
  return type === 'slow-2g' || type === '2g' || type === '3g' ? 'jpg' : 'webp';
}

/**
 * Reports whether the viewport is phone-sized and which still-image format to
 * serve. On slow or save-data connections we hand back JPEG (smaller decode,
 * more predictable size); otherwise WebP. SSR and the first client render
 * default to the desktop / WebP path and swap after mount.
 */
export function useMobileMedia(): { isMobile: boolean; format: ImageFormat } {
  const [isMobile, setIsMobile] = useState(false);
  const [format, setFormat] = useState<ImageFormat>('webp');

  useEffect(() => {
    const mq = window.matchMedia(MOBILE_QUERY);
    const syncMobile = () => setIsMobile(mq.matches);
    syncMobile();
    mq.addEventListener('change', syncMobile);

    const conn = (navigator as Navigator & { connection?: NetworkInformation })
      .connection;
    const syncFormat = () => setFormat(pickFormat());
    syncFormat();
    conn?.addEventListener?.('change', syncFormat);

    return () => {
      mq.removeEventListener('change', syncMobile);
      conn?.removeEventListener?.('change', syncFormat);
    };
  }, []);

  return { isMobile, format };
}

/** Builds `/images/wilder-world/mobile/<name>_mobile.<format>`. */
export function mobileSrc(name: string, format: ImageFormat): string {
  return `/images/wilder-world/mobile/${name}_mobile.${format}`;
}

/**
 * Rewrites a `/images/wilder-world/<name>.<ext>` path to its pre-generated
 * mobile-optimized copy. Returns the input unchanged for any other path.
 */
export function mobileImageFromPath(
  src: string | undefined,
  format: ImageFormat
): string | undefined {
  if (typeof src !== 'string' || !src.startsWith('/images/wilder-world/')) return src;
  const file = src.split('/').pop() ?? '';
  const base = file.replace(/\.[^.]+$/, '');
  return base ? mobileSrc(base, format) : src;
}
