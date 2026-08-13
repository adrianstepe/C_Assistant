import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pin the workspace root so Turbopack does not infer it from a lockfile
  // sitting higher up the filesystem.
  turbopack: { root: __dirname },

  // Fail the production build on type errors rather than shipping them.
  // (Next 16 no longer runs ESLint during `next build` — use `npm run check`.)
  typescript: { ignoreBuildErrors: false },
  poweredByHeader: false,
  reactStrictMode: true,
};

export default nextConfig;
