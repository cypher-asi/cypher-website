// Ensures only one Wilder World mobile video plays at a time. When a video
// starts, the previously playing one is paused. Module-level so every
// tap-to-play instance across the site shares a single "now playing" slot.

let current: HTMLVideoElement | null = null;

/** Pause whatever is playing (if different) and mark `video` as current. */
export function playSingle(video: HTMLVideoElement): void {
  if (current && current !== video) {
    current.pause();
  }
  current = video;
}

/** Release the slot if `video` currently holds it. */
export function release(video: HTMLVideoElement): void {
  if (current === video) current = null;
}
