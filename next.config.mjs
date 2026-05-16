/** @type {import('next').NextConfig} */
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? '';

const nextConfig = {
  reactStrictMode: true,
  // GitHub Pages hosts under /<repo-name>; set NEXT_PUBLIC_BASE_PATH at build time.
  basePath: basePath || undefined,
  assetPrefix: basePath || undefined,
  // Static export — `next build` writes a fully-static site to ./out
  output: 'export',
  trailingSlash: true,
  // Required by `output: export` (the next/image optimizer needs a server).
  images: { unoptimized: true },
  serverExternalPackages: ['@etothepii/satisfactory-file-parser'],
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve = config.resolve ?? {};
      config.resolve.fallback = {
        ...(config.resolve.fallback ?? {}),
        fs: false,
        child_process: false,
        path: false,
        'stream/web': false,
        'web-streams-polyfill': false,
      };
    }
    return config;
  },
};

export default nextConfig;
