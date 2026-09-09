import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // @recs/shared ships raw TypeScript (main → ./src/index.ts). Turbopack
  // transpiles workspace packages automatically, but listing it explicitly
  // keeps a webpack build working too.
  transpilePackages: ['@recs/shared'],

  images: {
    // Product imagery is always remote. `images.domains` is deprecated in
    // Next 16 — remotePatterns is the supported form.
    remotePatterns: [
      // Real Amazon product images.
      { protocol: 'https', hostname: 'm.media-amazon.com', pathname: '/**' },
      { protocol: 'https', hostname: 'images-na.ssl-images-amazon.com', pathname: '/**' },
      // Placeholder imagery used by the offline fixtures provider.
      { protocol: 'https', hostname: 'picsum.photos', pathname: '/**' },
      { protocol: 'https', hostname: 'fastly.picsum.photos', pathname: '/**' },
    ],
  },

  typescript: {
    ignoreBuildErrors: false,
  },
};

export default nextConfig;
