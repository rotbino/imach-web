import type { MetadataRoute } from "next";

/**
 * `robots.ts` — M10: ربات‌ها به سطوح عمومی؛ صفحات خصوصی (پنل/پیام/پروفایل) بسته.
 * عمومی‌های قابل ایندکس: `/` · `/reviews` · `/c/[slug]` · `/buy/[slug]` ·
 * `/buy/guide` · `/sell/guide` (پیشوندهای خصوصی صریح لیست شده‌اند تا مسیرهای
 * عمومیِ هم‌پیشوند — مثل /buy/[slug] و /sell/guide — بسته نشوند).
 */
const SITE = process.env.SITE_URL ?? "https://imach.app";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/me",
          "/profile",
          "/msgs",
          "/notifs",
          "/home",
          "/catalog",
          "/item",
          "/sell/orders",
          "/sell/rfqs",
          "/sell/promo",
          "/buy-list",
          "/buy/rfqs",
          "/buy/orders",
          "/suppliers",
          "/customers",
          "/contacts",
          "/rep",
          "/referrals",
          "/demo",
          "/api",
        ],
      },
    ],
    sitemap: `${SITE}/sitemap.xml`,
  };
}
