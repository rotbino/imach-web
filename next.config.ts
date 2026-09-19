import type { NextConfig } from "next";

/**
 * iMach — frontend (Next.js 16)
 *
 * /api/v1/* is proxied to the Fastify backend so the browser always talks
 * same-origin (cookies stay first-party, no CORS pain in dev).
 * Set BACKEND_ORIGIN when the backend runs elsewhere.
 */
const BACKEND_ORIGIN = process.env.BACKEND_ORIGIN ?? "http://127.0.0.1:4000";

const nextConfig: NextConfig = {
  output: "standalone",
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  async rewrites() {
    return [
      {
        source: "/api/v1/:path*",
        destination: `${BACKEND_ORIGIN}/api/v1/:path*`,
      },
    ];
  },
};

export default nextConfig;
