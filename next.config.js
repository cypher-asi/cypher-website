const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  devIndicators: false,
  transpilePackages: ['@cypher-asi/zui'],

  // ZUI ships raw TypeScript source. Next.js type-checks resolve types
  // relative to the source file directory — files in ../zui/ can't find
  // react types in our node_modules. Skip the in-build check; use
  // `npm run typecheck` for project-level validation.
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },

  webpack: (config) => {
    config.resolve.modules = [
      path.resolve(__dirname, 'node_modules'),
      'node_modules',
    ];

    config.resolve.symlinks = true;

    // Polling is required on Linux for symlinked packages outside the
    // project root — inotify doesn't follow symlinks into ../zui.
    config.watchOptions = {
      ...(config.watchOptions ?? {}),
      poll: 1000,
      aggregateTimeout: 300,
      followSymlinks: true,
    };

    // Webpack 5 snapshots skip "managed" paths (node_modules) by default.
    // Clear managedPaths so changes inside the linked package are detected.
    config.snapshot = {
      ...(config.snapshot ?? {}),
      managedPaths: [],
    };

    return config;
  },
};

module.exports = nextConfig;
