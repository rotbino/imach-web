import type { MetadataRoute } from "next";

/**
 * robots.ts (فاز ۷) — صفحات محرمانه (شل/چت/کیف/…) disallow؛
 * عمومی‌ها (لندینگ/کاتالوک/لیست/کالا) باز. sitemap معرفی می‌شود.
 */

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://imatch.ir";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/c/", "/b/", "/p/", "/login", "/start"],
        disallow: ["/home", "/item", "/board", "/saved", "/offers", "/rfq", "/add", "/msgs", "/profile", "/settings", "/wallet", "/sell", "/buy", "/api"],
      },
    ],
    sitemap: `${SITE}/sitemap.xml`,
  };
}
