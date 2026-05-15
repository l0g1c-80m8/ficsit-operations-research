/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  serverExternalPackages: ['@etothepii/satisfactory-file-parser'],
  webpack: (config, { isServer }) => {
    // javascript-lp-solver's External/lpsolve branch references Node-only
    // modules (fs, child_process) that we never reach client-side.
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
