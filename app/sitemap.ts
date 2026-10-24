import type { MetadataRoute } from "next";

/**
 * `sitemap.ts` — M10 (سند ۰۸ §M10): sitemap زنده.
 * · مسیرهای ایستا + `/reviews` + راهنمای دستیارها
 * · `/c/[slug]` همهٔ کاتالوگ‌های عمومی زنده (publicCatalogs — کش ۱۵دقیقه‌ای بک)
 * · `/buy/[slug]` عمداً نیست: فهرست عمومیِ لیست‌های خرید اندپوینت فهرست‌ده ندارد و
 *   ماهیتش شبکهٔ خصوصی است (انحراف آگاهانه §۱۰).
 */

const BACKEND = process.env.BACKEND_ORIGIN ?? "http://127.0.0.1:4000";
const SITE = process.env.SITE_URL ?? "https://imach.app";

interface PublicCatalogRow {
  slug: string;
  name: string;
  catalogCount: number;
  updatedAt: string;
}

async function fetchPublicCatalogs(): Promise<PublicCatalogRow[]> {
  try {
    const res = await fetch(`${BACKEND}/api/v1/businesses/publicCatalogs`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return [];
    return (await res.json()) as PublicCatalogRow[];
  } catch {
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${SITE}/`, lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: `${SITE}/reviews`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },
    { url: `${SITE}/buy/guide`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: `${SITE}/sell/guide`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: `${SITE}/start`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${SITE}/login`, lastModified: now, changeFrequency: "monthly", priority: 0.3 },
  ];

  const catalogs = await fetchPublicCatalogs();
  const catalogRoutes: MetadataRoute.Sitemap = catalogs.map((c) => ({
    url: `${SITE}/c/${c.slug}`,
    lastModified: new Date(c.updatedAt),
    changeFrequency: "daily",
    priority: 0.9,
  }));

  return [...staticRoutes, ...catalogRoutes];
}
