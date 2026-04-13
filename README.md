# Cypher Web

Marketing and ecosystem site for **Cypher** — built with [Next.js 15](https://nextjs.org/) (App Router). Presents the tools, protocols, and vision behind autonomous agent infrastructure for the Machine Age.

## Prerequisites

- **Node.js** LTS (20+)
- **npm** 10+

## Install

```bash
npm install
```

## Run

```bash
npm run dev       # Start dev server (http://localhost:3000)
npm run build     # Production build
npm run start     # Serve production build
npm run lint      # Lint with ESLint
npm run typecheck # Type-check with tsc (no emit)
```

## Pages

| Route | Description |
|-------|-------------|
| `/` | Landing page — animated headline ("Tools for the Machine Age") over a Three.js ASCII grid background |
| `/vision` | Mission statement — "Building Infrastructure for the Machine Age" with four pillars (Agent-First Architecture, Trustless Coordination, Composable Swarms, Open & Permissionless) |
| `/components` | Component showcase |
| `/docs` | Getting-started guide — installation and project structure |

## Project Structure

```
src/
  app/
    layout.tsx              # Root layout — fonts, global styles, ThemeProvider
    page.tsx                # Home / landing page
    page.module.css
    docs/
      page.tsx              # Docs page (/docs)
      page.module.css
    components/
      page.tsx              # Component showcase (/components)
      page.module.css
    vision/
      page.tsx              # Vision / mission page (/vision)
      page.module.css
    _components/
      ThemeContext.tsx       # Theme provider & useTheme hook
      ThemeWrapper.tsx       # "use client" wrapper for ThemeProvider
      Nav.tsx               # Navigation with mega-menu dropdowns
      Nav.module.css
      Headline.tsx          # Home page animated headline
      TypewriterText.tsx    # Typewriter text effect
      AsciiBackground.tsx   # Three.js ASCII grid animation
    styles/
      globals.css           # Design tokens, theme variables, resets
```

### Key conventions

- **CSS Modules** for all component/page styles (`*.module.css`)
- **Global CSS** with design tokens and theme variables imported once in `layout.tsx`
- **Theme**: `ThemeProvider` in `ThemeContext.tsx` manages dark/light mode via `data-theme` attribute on `<html>`, persisted to `localStorage`
- **Client boundary**: any component using theme hooks, Three.js, or interactive state is marked `"use client"`
- **Fonts**: Inter (sans-serif) and JetBrains Mono (monospace) via `next/font/google`
