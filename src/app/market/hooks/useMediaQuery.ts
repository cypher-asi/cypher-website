import { useEffect, useState } from 'react';

/**
 * SSR-safe media-query hook. Defaults to `false` on the server and the first
 * client render (desktop path), then syncs to the real match after mount so
 * hydration stays consistent.
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const sync = () => setMatches(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, [query]);
  return matches;
}
