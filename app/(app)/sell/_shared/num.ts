"use client";

/** ابزارهای عددی فاز ۵ — نرمال‌سازی ارقام فارسی/عربی + پارس ورودی مالی */

/** ارقام فارسی/عربی → لاتین (همان الگوی quote-form) */
export function toAsciiDigits(s: string): string {
  return s
    .replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)));
}

/** رشتهٔ ورودی → عدد — ارقام فارسی/عربی و ممیز فارسی (٫) لاتین می‌شوند؛
 *  جداکنندهٔ هزارگان (٬ و ,) حذف؛ فقط رقم و یک ممیزِ حداکثر می‌ماند (۵٫۹ → 5.9) */
export function parseNum(s: string): number {
  const cleaned = toAsciiDigits(s)
    .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)))
    .replace(/٫/g, ".")
    .replace(/[\s,٬]/g, "")
    .replace(/[^0-9.]/g, "");
  const first = cleaned.indexOf(".");
  const withOneDot = first === -1 ? cleaned : cleaned.slice(0, first + 1) + cleaned.slice(first + 1).replace(/\./g, "");
  const n = Number(withOneDot);
  return Number.isFinite(n) ? n : 0;
}

/** نمایش عدد با جداکنندهٔ هزارگان فارسی (بدون واحد) — «۸۹٬۵۰۰» */
export function faPlain(n: number): string {
  return Math.round(n).toLocaleString("fa-IR").replace(/,/g, "٬");
}

/** درصد فارسی — «٪۷» یا «٪۷٫۵» */
export function faPct(n: number): string {
  const v = Math.round(n * 10) / 10;
  return "٪" + v.toLocaleString("fa-IR").replace(/\.(\d)$/, "٫$1");
}
