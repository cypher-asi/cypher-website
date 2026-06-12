## Background / Context

The site is a Next.js 15 App Router app. Routes are defined by `page.tsx` files under `src/app` (`/`, `/vision`, `/components`, `/docs`, `/z`, `/zero`, `/zode`). The root `src/app/layout.tsx` renders a persistent shell:

```tsx
<ThemeWrapper>
  <MusicProvider>
    <Nav />
    <main>{children}</main>
  </MusicProvider>
</ThemeWrapper>
```

There is currently **no page transition**: navigating between routes swaps `children` instantly. There is no `template.tsx` (which Next.js re-mounts on every navigation, making it the natural hook for enter animations).

Goal of this spec: when moving between pages, the outgoing page fades out and the incoming page fades in elegantly, without disturbing the persistent `Nav`, `SectionNav`, or `BottomWidget`.

```mermaid
sequenceDiagram
    participant U as User
    participant R as Router
    participant T as template.tsx
    U->>R: click internal Link
    R->>T: route change -> remount template
    T->>T: key=pathname -> fade-out old, fade-in new
    Note over T: <main> content animates; Nav stays mounted
```

## Goals

- Internal route changes visually fade the page content out and the new content in.
- The persistent shell (`Nav`, `SectionNav`, `BottomWidget`, background) does not flicker or re-fade on navigation.
- Transition is smooth (~200-300ms), uses GPU-friendly opacity (and optional small translate), and respects `prefers-reduced-motion`.
- Works with App Router client navigation via `next/link` and browser back/forward.
- No layout shift or scroll-jump introduced by the transition wrapper.

## Non-Goals

- Shared-element / morphing transitions between routes.
- Adding a third-party router-transition or animation library (framer-motion). Prefer App Router `template.tsx` + CSS, or the View Transitions API if adopted deliberately.
- Animating the homepage Three.js ASCII cube specifically (it lives within page content and will fade with the page; no special handling required).
- Mega-panel / nav animations — covered by spec `01`.

## Affected Files & Modules

- `src/app/template.tsx` — **new** file. App Router re-mounts this on every navigation; it wraps `children` and runs the enter animation.
- `src/app/styles/globals.css` — keyframes / classes for the fade (and a `prefers-reduced-motion` guard).
- `src/app/layout.tsx` — unchanged structurally, but verify `<main>` placement so the transition wrapper sits inside `<main>` and outside `Nav`. May add the `id="page-main"` referenced by spec `01` (coordinate to avoid conflicting edits).

## Interfaces & Signatures

New `src/app/template.tsx` (Client Component):

```tsx
'use client';
import { type ReactNode } from 'react';
import styles from './template.module.css'; // or a class from globals.css

export default function Template({ children }: { children: ReactNode }) {
  // Re-mounted per navigation by the App Router, so the enter animation
  // (CSS class with keyframes) runs on each route change automatically.
  return <div className={styles.pageTransition}>{children}</div>;
}
```

CSS contract (enter animation; exit is approximated by the remount):

```css
.pageTransition {
  animation: pageFadeIn 260ms ease-out both;
}
@keyframes pageFadeIn {
  from { opacity: 0; transform: translateY(6px); }
  to   { opacity: 1; transform: translateY(0); }
}
@media (prefers-reduced-motion: reduce) {
  .pageTransition { animation-duration: 1ms; }
}
```

Optional (only if a true cross-fade with an explicit *exit* is required): adopt the View Transitions API gated behind feature detection (`document.startViewTransition`), or manage a pathname-keyed exit state in a client wrapper. Document the choice in the task.

## Design / Approach

1. **Use App Router `template.tsx`.** Unlike `layout.tsx`, `template.tsx` creates a new instance on each navigation, so a CSS enter animation re-runs every route change. This is the simplest correct primitive for fade-in and keeps `Nav`/widgets (in `layout.tsx`) mounted and static.

2. **Fade-in via CSS keyframes.** The wrapper div animates opacity 0→1 with a small upward translate, mirroring the existing `fadeIn` used on the homepage headline for visual consistency (see `page.module.css`). Keep duration ~260ms.

3. **Approximate fade-out.** Pure `template.tsx` gives a reliable enter animation; the previous page is unmounted on navigation. If the team wants a genuine outgoing fade, the recommended path is the **View Transitions API** (`document.startViewTransition`) with `::view-transition-old(root)` / `::view-transition-new(root)` opacity cross-fade, applied only to the page content layer and feature-detected so unsupported browsers fall back to the CSS enter animation. The task should implement the enter fade first, then layer the cross-fade if supported.

4. **Avoid shell flicker.** Keep the transition wrapper strictly inside `<main>` so `Nav`, `SectionNav`, and `BottomWidget` (rendered in `layout.tsx` outside `<main>`) never participate in the animation.

5. **Scroll/layout safety.** The wrapper must not introduce a stacking/overflow context that breaks `position: fixed` children of pages (e.g. the homepage `.page` fixed overlay). Verify the homepage and a normal scrolling page (`/vision`) both behave. Use `transform` only during the animation (`both` fill mode ends at `translateY(0)`), and consider clearing the transform at rest if it interferes with fixed descendants.

6. **Reduced motion.** Collapse the animation duration under `prefers-reduced-motion: reduce`.

## External References

- Next.js App Router docs: `template.tsx` vs `layout.tsx` (templates re-mount and re-run effects/animations on navigation).
- MDN: View Transitions API (`document.startViewTransition`, `::view-transition-old/new`), `@keyframes`, `prefers-reduced-motion`.
- Existing `fadeIn` keyframe in `src/app/page.module.css` for visual consistency.

## Definition of Done

- Navigating between internal routes (e.g. `/` ↔ `/vision` ↔ `/components`) fades the page content in (and out, if the cross-fade path is implemented); the effect is smooth and not jarring.
- `Nav`, `SectionNav`, `BottomWidget`, and the page background do not flicker, re-fade, or unmount during navigation.
- The homepage fixed ASCII/cube overlay and a normal scrolling page both render correctly with no layout shift or scroll jump caused by the wrapper.
- `prefers-reduced-motion: reduce` reduces the transition to effectively instant.
- Browser back/forward navigations animate consistently with link clicks.
- `npm run build` and `npm run typecheck` pass with no new errors.
</markdown_contents>
