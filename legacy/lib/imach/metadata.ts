import { cookies } from "next/headers";
import type { Metadata } from "next";

/**
 * فاز ۸ — عنوان/توصیف Metadata بر اساس زبان فعال (کوکی imach_locale).
 * ربات‌ها بدون کوکی → فارسی (زبان اصلی بازار هدف).
 */

export const LOCALE_COOKIE = "imach_locale";

export async function activeLocale(): Promise<"fa" | "en" | "ar"> {
  const cookieStore = await cookies();
  const v = cookieStore.get(LOCALE_COOKIE)?.value;
  return v === "en" || v === "ar" ? v : "fa";
}

/** پسوند برند در عنوان — بر اساس زبان */
export function titleSuffix(locale: "fa" | "en" | "ar"): string {
  return locale === "fa" ? "| آی‌مچ" : locale === "ar" ? "| أي‌ماتش" : "| iMach";
}

/** فرمت عنوان استاندارد: «{title} {suffix}» */
export function pageTitle(title: string, locale: "fa" | "en" | "ar"): string {
  return `${title} ${titleSuffix(locale)}`;
}

/** توصیف متادیتای عمومی کاتالوک — سه‌زبانه */
export function catalogDescription(
  name: string,
  trade: string | null,
  city: string,
  count: number,
  locale: "fa" | "en" | "ar"
): string {
  if (locale === "en") {
    return `Public catalog of ${name}${trade ? ` — ${trade}` : ""} in ${city} · ${count} items with live prices · direct call, messaging, and group quote requests on iMach`;
  }
  if (locale === "ar") {
    return `كتالوج عام لـ${name}${trade ? ` — ${trade}` : ""} في ${city} · ${count} صنفًا بأسعار حية · اتصال مباشر ومراسلة واستعلام سعر جماعي على أي‌ماتش`;
  }
  return `کاتالوگ عمومی ${name}${trade ? ` — ${trade}` : ""} در ${city} · ${count} کالا با قیمت زنده · تماس مستقیم، پیام و استعلام قیمت گروهی در آی‌مچ`;
}

/** توصیف متادیتای کالای عمومی — سه‌زبانه */
export function productDescription(
  name: string,
  bizName: string,
  city: string | null,
  price: string,
  locale: "fa" | "en" | "ar"
): string {
  if (locale === "en") {
    return `${name} from ${bizName}${city ? ` in ${city}` : ""} · ${price} · direct call, messaging, and group quote requests on iMach`;
  }
  if (locale === "ar") {
    return `${name} من ${bizName}${city ? ` في ${city}` : ""} · ${price} · اتصال مباشر ومراسلة واستعلام جماعي على أي‌ماتش`;
  }
  return `${name} از ${bizName}${city ? ` در ${city}` : ""} · ${price} · تماس مستقیم، پیام و استعلام قیمت گروهی در آی‌مچ`;
}

/** توصیف لیست خرید عمومی — سه‌زبانه */
export function listDescription(
  name: string,
  trade: string | null,
  city: string,
  count: number,
  locale: "fa" | "en" | "ar"
): string {
  if (locale === "en") {
    return `Public buying list of ${name}${trade ? ` — ${trade}` : ""} in ${city} · ${count} items with regular needs · suppliers get alerted on every announcement`;
  }
  if (locale === "ar") {
    return `قائمة شراء عامة لـ${name}${trade ? ` — ${trade}` : ""} في ${city} · ${count} أصناف با احتياجات منتظمة · الموردّون يُنبَّهون عند كل إعلان`;
  }
  return `لیست خرید عمومی ${name}${trade ? ` — ${trade}` : ""} در ${city} · ${count} کالا با نیاز منظم · تأمین‌کننده‌ها گوش‌به‌زنگ نیازها می‌شوند`;
}

export type PageMetadata = Metadata;
