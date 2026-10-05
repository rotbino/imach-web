/**
 * فاز ۸ مهاجرت — سیستم ارز نمایش:
 *   · ارز مرجع پایه = IRR (حسابداری کیف/کمپین همیشه در آن می‌ماند)
 *   · نرخ‌ها از پیکربندی ادمین (GET /settings/config · کش ۵m)
 *   · تبدیل فقط در لایهٔ نمایش: minor ذخیره‌شده در ارز بومی آگهی →
 *     واحد اصلیِ ارز نمایش کاربر (کوکی imach_currency + User.prefs.currency)
 *   · نرخ = چند minor ارز مرجع برابر ۱ واحد اصلیِ آن ارز (rate.IRR ≡ ۱۰)
 *
 * ورودی فرم‌ها (قیمت‌گذاری/پیشنهاد) عمداً در ارز بومی می‌ماند — معامله در
 * ارز فروشنده بسته می‌شود؛ تبدیلْ نمایش/مقایسه است نه ورودی.
 */

import { CURRENCIES, currencyLabel, num } from "@/lib/format";

/** نرخ‌ها: baseMinorPerMajor — IRR ≡ ۱۰ (لنگر) */
export type Rates = Record<string, number>;

export const BASE_CURRENCY = "IRR";
export const CURRENCY_COOKIE = "imach_currency";

/** ارزهای قابل انتخاب (هم‌تراز whitelist بک‌اند) */
export const SELECTABLE_CURRENCIES = Object.keys(CURRENCIES);

/** خواندن کوکی ارز نمایش (سمت کلاینت) — null = پیش‌فرض مرجع */
export function readCurrencyCookie(): string | null {
  if (typeof document === "undefined") return null;
  const hit = document.cookie.split("; ").find((c) => c.startsWith(`${CURRENCY_COOKIE}=`));
  if (!hit) return null;
  const v = decodeURIComponent(hit.slice(CURRENCY_COOKIE.length + 1)).toUpperCase();
  return /^[A-Z]{3}$/.test(v) && CURRENCIES[v] ? v : null;
}

/** نوشتن کوکی یک‌ساله — هم‌الگوی تم/زبان */
export function writeCurrencyCookie(currency: string | null): void {
  if (typeof document === "undefined") return;
  if (currency === null) {
    document.cookie = `${CURRENCY_COOKIE}=;path=/;max-age=0;samesite=lax`;
    return;
  }
  document.cookie = `${CURRENCY_COOKIE}=${encodeURIComponent(currency)};path=/;max-age=31536000;samesite=lax`;
}

/**
 * تبدیل minor ارز مبدأ → واحد اصلیِ ارز مقصد.
 * null = نرخ ناموجود → فراخوان باید به نمایش بومی برگردد.
 * ریاضی: minor → major(m) [÷10^exp(m)] → baseMinor [×rate(m)] → major(t) [÷rate(t)]
 */
export function convertMinor(
  minor: number,
  from: string,
  to: string,
  rates: Rates
): number | null {
  if (from === to) {
    const exp = CURRENCIES[from]?.exp ?? 0;
    return minor / 10 ** exp;
  }
  const rf = rates[from];
  const rt = rates[to];
  if (!rf || !rt) return null;
  const expF = CURRENCIES[from]?.exp ?? 0;
  const majorFrom = minor / 10 ** expF;
  return (majorFrom * rf) / rt;
}

/** فرمت مبالغ در ارز نمایش — با نرخ معتبر و تفاوت ارز، تبدیل می‌کند */
export function fmtMoneyIn(
  minor: number | null | undefined,
  from: string | null | undefined,
  display: string,
  rates: Rates | undefined,
  locale?: string
): string {
  if (minor === null || minor === undefined) return "";
  const loc = locale ?? "fa";
  const fromCode = from ?? BASE_CURRENCY;
  if (display !== fromCode && rates?.[fromCode] && rates?.[display]) {
    const major = convertMinor(minor, fromCode, display, rates);
    if (major !== null) {
      return `${num(major, loc)} ${currencyLabel(display, loc)}`;
    }
  }
  // بدون نرخ یا همان ارز — نمایش بومی (fmtMoney استاندارد)
  const exp = CURRENCIES[fromCode]?.exp ?? 0;
  return `${num(minor / 10 ** exp, loc)} ${currencyLabel(fromCode, loc)}`;
}

/** نسخهٔ دو-تکه (برای <b>عدد</b><span class="u">ارز / واحد</span>) */
export function moneyPartsIn(
  minor: number | null | undefined,
  from: string | null | undefined,
  display: string,
  rates: Rates | undefined,
  locale?: string
): { amount: string; label: string } {
  const full = fmtMoneyIn(minor, from, display, rates, locale);
  if (!full) return { amount: "", label: "" };
  // آخرین فاصله جداکنندهٔ عدد/برچسب است (برچسب‌ها فاصلهٔ داخلی ندارند)
  const idx = full.lastIndexOf(" ");
  if (idx === -1) return { amount: full, label: "" };
  return { amount: full.slice(0, idx), label: full.slice(idx + 1) };
}
