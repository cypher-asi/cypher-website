'use client';

import { useEffect, useRef, useState, type ImgHTMLAttributes } from 'react';
import styles from './FadeInImage.module.css';

type FadeInImageProps = ImgHTMLAttributes<HTMLImageElement>;

/**
 * Drop-in replacement for <img> that fades the image in once it has decoded.
 * Images that are already cached (complete on mount) skip straight to visible
 * to avoid a flash. Users who prefer reduced motion get the image immediately
 * with no transition (handled in the companion CSS module).
 */
export function FadeInImage({ className, onLoad, alt = '', ...props }: FadeInImageProps) {
  const ref = useRef<HTMLImageElement>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const img = ref.current;
    // If the browser served the image from cache, `load` may have already
    // fired (or will never fire) before hydration — reveal it right away.
    if (img?.complete && img.naturalWidth > 0) setLoaded(true);
  }, []);

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      ref={ref}
      alt={alt}
      className={`${styles.image} ${loaded ? styles.loaded : ''} ${className ?? ''}`}
      onLoad={(e) => {
        setLoaded(true);
        onLoad?.(e);
      }}
      {...props}
    />
  );
}
