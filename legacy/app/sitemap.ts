import type { MetadataRoute } from "next";
import { fetchPublicCatalogs } from "@/lib/imach/server-api";

/**
 * sitemap.xml (فاز ۷) — مسیرهای ایستا + کاتالوگ‌های عمومی زنده.
 * کاتالوگ‌ها از اندپوینت عمومی publicCatalogs (کش ۱۵دقیقه‌ای) می‌آیند؛
 * صفحات محرمانه هرگز اینجا نیستند.
 */

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://imatch.ir";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const statics: MetadataRoute.Sitemap = [
    { url: `${SITE}/`, lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: `${SITE}/login`, lastModified: now, changeFrequency: "monthly", priority: 0.3 },
    { url: `${SITE}/start`, lastModified: now, changeFrequency: "monthly", priority: 0.3 },
  ];

  const catalogs = await fetchPublicCatalogs<{ slug: string; updatedAt: string }>();
  const catalogEntries: MetadataRoute.Sitemap = catalogs.map((c) => ({
    url: `${SITE}/c/${c.slug}`,
    lastModified: new Date(c.updatedAt),
    changeFrequency: "daily",
    priority: 0.8,
  }));

  return [...statics, ...catalogEntries];
}
