# Cypher Web

Minimal Next.js site powered by the [ZUI](../zui) design system from `@cypher-asi/zui`.

## Prerequisites

- **Node.js** LTS (20+)
- **npm** 10+
- The `@cypher-asi/zui` repo checked out at `../zui` (sibling directory)

## Install

```bash
npm install
```

## Link ZUI (local development)

The project references ZUI via `"file:../zui"` in `package.json`, so `npm install` creates a symlink automatically. If you prefer the explicit link workflow:

```bash
# 1. In the ZUI directory
cd ../zui
npm install

# 2. Register ZUI as a global link
npm link

# 3. Back in this project
cd ../cypher-web
npm link @cypher-asi/zui
```

> **Package name:** `@cypher-asi/zui` (from `../zui/package.json` → `name`)

## Run

```bash
npm run dev       # Start dev server (http://localhost:3000)
npm run build     # Production build
npm run start     # Serve production build
npm run lint      # Lint with ESLint
npm run typecheck # Type-check with tsc (no emit)
```

## Developing ZUI

ZUI ships TypeScript source directly (no build step). When you edit files inside `../zui/src/`, changes are picked up by Next.js automatically because:

1. `next.config.js` includes `transpilePackages: ["@cypher-asi/zui"]`
2. The symlink points directly to the ZUI source

In most cases, **saving a ZUI file triggers a hot reload** in the Next.js dev server. If it doesn't, restart the dev server.

## Project Structure

```
src/
  app/
    layout.tsx              # Root layout — imports ZUI styles + ThemeProvider
    page.tsx                # Home page (/)
    docs/
      page.tsx              # Docs page (/docs)
    components/
      page.tsx              # ZUI Showcase (/components) — server component
    _components/
      ThemeWrapper.tsx      # "use client" wrapper for ThemeProvider
      Nav.tsx               # Site navigation (client component)
      ZuiDemo.tsx           # "use client" component that renders ZUI widgets
    styles/
      globals.css           # Base resets + layout primitives
```

### Key conventions

- **CSS Modules** for all component/page styles (`*.module.css`)
- **ZUI global CSS** imported once in `layout.tsx` via `import '@cypher-asi/zui/styles'`
- **Client boundary**: any component using ZUI hooks or interactive components is marked `"use client"` (e.g., `ThemeWrapper.tsx`, `ZuiDemo.tsx`, `Nav.tsx`)

## Troubleshooting

### Invalid hook call (duplicate React)

This happens when ZUI resolves its own copy of React instead of sharing the site's copy.

**Diagnosis:**

```bash
# From project root
ls -la node_modules/react
ls -la node_modules/@cypher-asi/zui/node_modules/react 2>/dev/null
```

If both exist, React is duplicated.

**Fixes:**

1. ZUI already declares `react` / `react-dom` as **peerDependencies** — it should not bundle its own. If a nested `node_modules/react` appears inside the ZUI symlink, delete it:

   ```bash
   rm -rf ../zui/node_modules/react ../zui/node_modules/react-dom
   ```

2. The `next.config.js` already uses `resolve.modules` to force the bundler to look in this project's `node_modules` first. If the problem persists, add explicit aliases:

   ```js
   const path = require('path');

   // Inside the webpack callback:
   config.resolve.alias = {
     ...config.resolve.alias,
     react: path.resolve(__dirname, 'node_modules/react'),
     'react-dom': path.resolve(__dirname, 'node_modules/react-dom'),
   };
   ```

   **Warning:** explicit React aliases can break Next.js 15's internal server/client React resolution. Only add them as a last resort.

### Next.js doesn't compile ZUI / module not found

Make sure `next.config.js` includes:

```js
transpilePackages: ['@cypher-asi/zui']
```

This tells Next.js to compile the linked package through its bundler, which is required because ZUI ships raw TypeScript source.

### Changes to ZUI not reflecting

1. Confirm the symlink is correct: `ls -la node_modules/@cypher-asi/zui` should point to `../../zui`.
2. Save the changed file in `../zui/src/` — Next.js file watcher should pick it up.
3. If hot reload doesn't trigger, restart the dev server (`Ctrl-C` then `npm run dev`).

### Missing peer dependencies (clsx, lucide-react, @dnd-kit/core)

ZUI source imports `clsx`, `lucide-react`, `prism-react-renderer`, and `@dnd-kit/core`, but some of these are not declared in ZUI's `package.json`. This project installs them directly so the bundler can resolve them via the `resolve.modules` config. If you see "Module not found", run:

```bash
npm install clsx lucide-react prism-react-renderer @dnd-kit/core
```

### TypeScript errors during `next build`

Because ZUI ships raw TypeScript source and lives outside this project's directory tree, the Next.js type checker can't resolve `react` types from `../zui/src/`. The build is configured with `typescript.ignoreBuildErrors: true` to work around this. Run `npm run typecheck` separately to validate your own source files.
