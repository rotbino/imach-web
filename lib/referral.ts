/**
 * کد رفرال — سرنخ ثبت‌نام (خواسته‌ی کاربر):
 * هر لینکی که از روی یک کاتالوگ/لیست خرید ساخته می‌شود `?ref={businessSlug}`
 * دارد. کد در localStorage هم ذخیره می‌شود تا اگر کاربر بین صفحه‌ها بچرخد
 * و پارامتر از URL بیفتد، ثبت‌نامِ بعدی همچنان منتسب بماند.
 * مقدار کد = slug کسب‌وکار صاحب لینک؛ سمت بک‌اند به ownerId تبدیل می‌شود.
 */

const KEY = "imach.ref";

/** ذخیره/به‌روزرسانی کد رفرال فعال */
export function saveReferralCode(code: string): void {
  if (!code) return;
  try {
    localStorage.setItem(KEY, code);
  } catch {
    /* SSR یا حالت خصوصی مرورگر */
  }
}

/** آخرین کد رفرال ذخیره‌شده (برای پیوستن به payload ثبت‌نام) */
export function loadReferralCode(): string | undefined {
  try {
    return localStorage.getItem(KEY) || undefined;
  } catch {
    return undefined;
  }
}

/** بعد از ثبت‌نام موفق پاک می‌شود — انتصاب فقط یک‌بار معنا دارد */
export function clearReferralCode(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* noop */
  }
}
