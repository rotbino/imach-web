// ─── مدل واحد (حکم مالک ۱۰۲۶ — «یک‌بار برای همیشه») ───
//
// سه گونهٔ واحد در جدول Unit (همان مدل پیاده‌سازی قدیمی که پایه‌اش در
// دیتابیس سالم است):
//   ۱) ساده/ریشه — گرم، کیلوگرم، عدد، لیتر… (baseUnitKey = null)
//   ۲) عمده با ضریب ثابت — تن (×۱۰۰۰ کیلو)، کیسهٔ ۵۰ کیلویی، کارتن ۲۴تایی
//   ۳) عمده با ضریب متغیر — کارتن، جامبو، باکس: تعداد در بسته را کاربر
//      موقع ثبت می‌گوید («کارتن ۶۰تایی») و از آن پس مثل گونهٔ ۲ عمومی می‌شود.
//
// قاعدهٔ طلایی: قیمتِ همیشه‌ای برای مقایسه، «قیمت هر واحد مصرف‌کننده» است
// (Listing.pricePerBaseMinor)؛ قیمت بسته = قیمت واحد × تعداد. کاربر هر کدام
// را وارد کند، اونیکی خودکار حساب می‌شود.
//
// واژگان: کالاهای فله (برنج) → واحد مصرف‌کننده «کیلوگرم»؛ کالاهای بسته‌ای
// (پفک) → «عدد». Good.unit در دادهٔ قدیمی گاهی ظرف را نگه داشته (SACK/CARTON)
// — resolveConsumerUnit پایهٔ درست را از همان جدول استخراج می‌کند.

import type { UnitDto } from "@/lib/api";
import { num } from "@/lib/format";

/** ریشه‌های مجاز — بسته‌بندی باید مستقیم روی یکی از این‌ها بنشیند. */
const UNIT_ROOTS = new Set([
  "PIECE",
  "SET",
  "KILOGRAM",
  "GRAM",
  "TON",
  "LITER",
  "MILLILITER",
  "METER",
  "SQUARE_METER",
  "CUBIC_METER",
  "KWH",
  "WATT",
  "SERVICE",
]);

export const isUnitRoot = (key: string | null | undefined): boolean => !!key && UNIT_ROOTS.has(key);

/**
 * واحد مصرف‌کنندهٔ کالا از روی Good.unit (و جدول Unit) — بدون مهاجرت داده:
 *  · ریشه (KILOGRAM/PIECE/…) → خودش
 *  · ظرف با پایهٔ صریح (CARTON→PIECE، JUMBO→KILOGRAM، SACK_50KG→KILOGRAM) → پایه‌اش
 *  · ظرفِ بی‌پایه (SACK، BAG، BOTTLE…) → پرتکرارترین پایهٔ خانواده‌اش (SACK_*KG→KILOGRAM)
 *  · نبود اطلاعات → KILOGRAM (کم‌خسارت‌ترین پیش‌فرض خوراکی‌های فله)
 */
export function resolveConsumerUnit(
  goodUnitKey: string | null | undefined,
  units: UnitDto[] | undefined | null,
): string {
  if (!goodUnitKey) return "PIECE";
  if (!units || units.length === 0) return UNIT_ROOTS.has(goodUnitKey) ? goodUnitKey : "KILOGRAM";
  const byKey = new Map(units.map((u) => [u.key, u]));
  const u = byKey.get(goodUnitKey);
  if (!u) return UNIT_ROOTS.has(goodUnitKey) ? goodUnitKey : "KILOGRAM";
  if (u.baseUnitKey) return u.baseUnitKey; // CARTON→PIECE · JUMBO/SACK_50KG/TON→KILOGRAM
  if (isUnitRoot(u.key)) return u.key; // ریشهٔ صریح
  // ظرفِ بی‌پایه: خانوادهٔ «SACK_*» را ببین — پرتکرارترین پایه برنده است
  const family = units.filter((x) => x.key.startsWith(`${u.key}_`) && x.baseUnitKey);
  if (family.length > 0) {
    const counts = new Map<string, number>();
    for (const f of family) counts.set(f.baseUnitKey!, (counts.get(f.baseUnitKey!) ?? 0) + 1);
    const best = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
    return best[0];
  }
  return "KILOGRAM";
}

/**
 * چیپ‌های بسته‌بندیِ پیشنهادی برای یک واحد مصرف‌کننده — گونهٔ ۲ و ۳ جدول
 * Unit که پایه‌شان همان است (برنج→کیلو: بستهٔ ۵ کیلویی…کیسهٔ ۵۰ کیلویی،
 * جامبو، تن؛ پفک→عدد: کارتن ۶/۱۲/۲۴/۳۰/۴۸، شرینک، باکس، کارتنِ متغیر).
 * مرتب: کم→زیباد؛ متغیرها آخرِ فهرستِ ثابت‌ها.
 */
export function packUnitsFor(consumerKey: string, units: UnitDto[] | undefined | null): UnitDto[] {
  if (!units) return [];
  const fixed = units
    .filter((u) => u.baseUnitKey === consumerKey && u.containsQty != null && u.isActive)
    .sort((a, b) => (a.containsQty ?? 0) - (b.containsQty ?? 0));
  const variable = units
    .filter((u) => u.baseUnitKey === consumerKey && u.containsQty == null && u.isActive)
    .sort((a, b) => a.nameFa.localeCompare(b.nameFa, "fa"));
  return [...fixed, ...variable];
}

/** شمارهٔ داخل متن فارسی/لاتین — «گونی ۷۰ کیلویی» → 70 (یا null). */
export function parseCountFromLabel(label: string): number | null {
  const faToEn = (s: string) =>
    s.replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)));
  const m = faToEn(label).match(/(\d[\d,\s.]*)/);
  if (!m) return null;
  const n = Number(m[1].replace(/[,\s.]/g, ""));
  return Number.isFinite(n) && n > 0 ? Math.round(n) : null;
}

/**
 * تعدادِ بسته از روی نام — با آگاهی از واحد مصرف‌کننده (فیکس مالک ۱۰۲۶-۲):
 * «تریلی ۲۴ تنی» یعنی ۲۴ *تن* برنج، نه ۲۴ کیلو — واژهٔ «تن/تنی» در نام و
 * پایهٔ کیلوگرم → عدد × ۱۰۰۰ می‌شود («گونی ۷۰ کیلویی» دست‌نخورده می‌ماند).
 */
export function parsePackCount(label: string, consumerKey: string): number | null {
  const n = parseCountFromLabel(label);
  if (n == null) return null;
  if (consumerKey !== "KILOGRAM" || n >= 1000) return n;
  const hasTonWord = label
    .split(/\s+/)
    .some((w) => {
      const bare = w.replace(/[\d\u06F0-\u06F9\u0660-\u0669٬،.]/g, "");
      return bare === "تن" || bare === "تنی";
    });
  return hasTonWord ? n * 1000 : n;
}

/**
 * برچسب کامل بسته از نام + تعداد — «کارتن» + ۶۰ + عدد → «کارتن ۶۰تایی»،
 * «گونی» + ۷۰ + کیلوگرم → «گونی ۷۰ کیلوگرمی» (سبکِ نام‌گذاری سید:
 * کارتن ۲۴تایی / کیسهٔ ۵۰ کیلویی). اگر خودِ نام عدد دارد، دست نمی‌زنیم.
 */
export function composePackLabel(
  name: string,
  qty: number | null | undefined,
  consumerKey: string,
  consumerName: string,
): string {
  const base = name.trim();
  if (!base) return "";
  if (parseCountFromLabel(base) != null) return base; // «کارتن ۱۰۰ عددی» خودش کامل است
  if (!qty || qty < 1) return base;
  const n = num(qty, "fa");
  // عدد → «تایی» (کارتن ۶۰تایی)؛ بقیه → «کیلوگرمی/گرمی/لیتری…»
  return consumerKey === "PIECE" ? `${base} ${n}تایی` : `${base} ${n} ${consumerName}ی`;
}

/** واژهٔ کوتاهِ بسته برای پسوند موجودی/حداقل سفارش — «کیسهٔ ۵۰ کیلویی» → «کیسه». */
export const packShort = (label: string | null | undefined): string | null => {
  if (!label) return null;
  const w = label.trim().split(/\s+/)[0];
  return w || null;
};
