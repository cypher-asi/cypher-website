'use client';

import { type ImgHTMLAttributes } from 'react';
import { FadeInImage } from '@/components/FadeInImage';
import { useMobileMedia, mobileImageFromPath } from './useMobileMedia';

/**
 * Drop-in for FadeInImage that, on phones, serves the pre-generated
 * mobile-optimized copy of a Wilder World image
 * (`/images/wilder-world/<name>.<ext>` -> `<name>_mobile.<webp|jpg>`), picking
 * JPEG on slow / save-data connections. Falls back to the original src on
 * desktop or if the path can't be derived.
 */
export function MobileImage({ src, ...props }: ImgHTMLAttributes<HTMLImageElement>) {
  const { isMobile, format } = useMobileMedia();
  const resolved = isMobile && typeof src === 'string' ? mobileImageFromPath(src, format) : src;
  return <FadeInImage src={resolved} {...props} />;
}
