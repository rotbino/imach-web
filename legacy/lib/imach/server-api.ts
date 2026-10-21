/**
 * فاز ۷ — واکشی سروری برای صفحات عمومی (pub).
 * RSC به بک‌اند مستقیم می‌زند (بدون ریدایرکت پراکسی) با revalidate کشی؛
 * همان اندپوینت‌های عمومی که مرورگر هم می‌خواند (getBusiness عمومی است).
 */

const BACKEND_ORIGIN = process.env.BACKEND_ORIGIN ?? "http://127.0.0.1:4000";

/** پروفایل عمومی کسب‌وکار + آگهی‌ها (GET /businesses/getBusiness/:slug — عمومی) */
export async function fetchPublicBusiness<T>(slug: string): Promise<T | null> {
  try {
    const res = await fetch(
      `${BACKEND_ORIGIN}/api/v1/businesses/getBusiness/${encodeURIComponent(slug)}`,
      { next: { revalidate: 60, tags: ["pub-business"] } }
    );
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

/** فهرست کاتالوگ‌های عمومی برای sitemap (GET /businesses/publicCatalogs — عمومی) */
export async function fetchPublicCatalogs<T>(): Promise<T[]> {
  try {
    const res = await fetch(`${BACKEND_ORIGIN}/api/v1/businesses/publicCatalogs`, {
      next: { revalidate: 900, tags: ["pub-catalogs"] },
    });
    if (!res.ok) return [];
    return (await res.json()) as T[];
  } catch {
    return [];
  }
}
