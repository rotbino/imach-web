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
  // منابع توسعه (HMR و…) برای 127.0.0.1 هم باز باشد — وگرنه کلاینت هیدریت نمی‌شود
  allowedDevOrigins: ["127.0.0.1"],
  images: {
    // عکس‌های آپلودی مستقیم از ابر آروان می‌آیند (خواسته‌ی کاربر: دانلود بدون
    // توکن و بدون پروکسی) — next/image آنها را در همان مسیر بهینه می‌کند:
    // srcset + فرمت مدرن (webp/avif). کلیدهای آروان تغییرناپذیرند → کش بلند.
    remotePatterns: [
      { protocol: "https", hostname: "**.arvanstorage.ir" },
      // درایور لوکال (STORAGE_DRIVER=local) — فقط توسعه
      { protocol: "http", hostname: "localhost" },
      { protocol: "http", hostname: "127.0.0.1" },
    ],
    minimumCacheTTL: 2_592_000, // ۳۰ روز — url هر عکس یکتاست و هرگز عوض نمی‌شود
  },
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
