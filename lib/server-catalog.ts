// ─── M2 — هلپرهای سمت سرور برای ویترین عمومی ───

/** همان listingPriceExpired بک‌اند — نسخهٔ فرانت برای رندر SSR (FD-52) */
export function listingPriceExpiredServer(
  pricedAt: string | Date | null | undefined,
  validityDays: number | null | undefined
): boolean {
  if (!pricedAt || !validityDays || validityDays <= 0) return false;
  const expires = new Date(pricedAt).getTime() + validityDays * 24 * 3600 * 1000;
  return expires < Date.now();
}
