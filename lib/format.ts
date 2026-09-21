// ─── قالب‌بندی اعداد و برچسب‌های فارسی ───

import { readLocaleCookie } from "@/i18n/config";

export const fa = (n: number | string): string => {
  if (typeof n === "string") {
    const num = Number(n);
    if (Number.isNaN(num)) return n;
    n = num;
  }
  return n.toLocaleString("fa-IR");
};

const en = (n: number | string): string => {
  if (typeof n === "string") n = Number(n);
  return Number.isNaN(n as number) ? String(n) : (n as number).toLocaleString("en-US");
};

const num = (n: number | string, locale: string): string => (locale === "en" ? en(n) : fa(n));

// ── پول — مبلغ همیشه به کوچک‌ترین واحد ارز ذخیره شده (ریال/سنت…) ──
// exp = تعداد رقم اعشار بین واحد اصلی و کوچک‌ترین واحد (IRR بدون اعشار)
export const CURRENCIES: Record<string, { exp: number; fa: string; en: string }> = {
  IRR: { exp: 0, fa: "ریال", en: "Rial" },
  USD: { exp: 2, fa: "دلار", en: "US Dollar" },
  EUR: { exp: 2, fa: "یورو", en: "Euro" },
  GBP: { exp: 2, fa: "پوند", en: "Pound" },
  AED: { exp: 2, fa: "درهم", en: "Dirham" },
  TRY: { exp: 2, fa: "لیر", en: "Lira" },
  CNY: { exp: 2, fa: "یوان", en: "Yuan" },
  INR: { exp: 2, fa: "روپیه", en: "Rupee" },
  PKR: { exp: 2, fa: "روپیه پاکستان", en: "Pakistani Rupee" },
  AFN: { exp: 2, fa: "افغانی", en: "Afghani" },
  IQD: { exp: 3, fa: "دینار عراق", en: "Iraqi Dinar" },
  RUB: { exp: 2, fa: "روبل", en: "Ruble" },
};

export const currencyLabel = (currency: string | null | undefined, locale?: string): string => {
  const loc = locale ?? readLocaleCookie();
  const c = CURRENCIES[currency ?? "IRR"] ?? { exp: 0, fa: currency ?? "", en: currency ?? "" };
  return loc === "en" ? c.en : c.fa;
};

/** قیمت ذخیره‌شده (کوچک‌ترین واحد) → رشته نمایشی «۷۲۰٬۰۰۰ ریال» */
export const fmtMoney = (
  minor: number | null | undefined,
  currency?: string | null,
  locale?: string
): string => {
  if (minor === null || minor === undefined) return "";
  const loc = locale ?? readLocaleCookie();
  const c = CURRENCIES[currency ?? "IRR"] ?? { exp: 0, fa: currency ?? "", en: currency ?? "" };
  return `${num(minor / 10 ** c.exp, loc)} ${loc === "en" ? c.en : c.fa}`;
};

// ── نام چندزبانه کالا/دسته — نمایش با زبان فعال، fallback فارسی ──
type BiName = { nameFa: string; nameEn?: string | null };
export const goodName = (g: BiName, locale?: string): string => {
  const loc = locale ?? readLocaleCookie();
  return loc === "en" && g.nameEn ? g.nameEn : g.nameFa;
};
export const categoryName = goodName;

// ── برچسب enum های سرور ──
export const UNIT_LABELS: Record<string, { fa: string; en: string }> = {
  KILOGRAM: { fa: "کیلوگرم", en: "kg" },
  TON: { fa: "تن", en: "Ton" },
  CARTON: { fa: "کارتن", en: "Carton" },
  SACK: { fa: "کیسه", en: "Sack" },
  PIECE: { fa: "عدد", en: "Piece" },
  LITER: { fa: "لیتر", en: "Liter" },
  BRANCH: { fa: "شاخه", en: "Branch" },
  METER: { fa: "متر", en: "Meter" },
  GRAM: { fa: "گرم", en: "Gram" },
  SERVICE: { fa: "خدمت", en: "Service" },
};

export const unitLabel = (u: string, locale?: string): string => {
  const loc = locale ?? readLocaleCookie();
  const def = UNIT_LABELS[u];
  if (!def) return u;
  return loc === "en" ? def.en : def.fa;
};

export const FREQUENCY_LABELS: Record<string, { fa: string; en: string }> = {
  WEEKLY: { fa: "هفتگی", en: "Weekly" },
  MONTHLY: { fa: "ماهانه", en: "Monthly" },
  OCCASIONAL: { fa: "موردی", en: "Occasional" },
};

export const frequencyLabel = (f: string, locale?: string): string => {
  const loc = locale ?? readLocaleCookie();
  const def = FREQUENCY_LABELS[f];
  if (!def) return f;
  return loc === "en" ? def.en : def.fa;
};

// ── کشورها — انتخاب در ثبت‌نام؛ واحد پول پیش‌فرض بازو از همین‌جا می‌آید ──
export const COUNTRIES: { code: string; fa: string; en: string; currency: string }[] = [
  { code: "IR", fa: "ایران", en: "Iran", currency: "IRR" },
  { code: "AE", fa: "امارات", en: "United Arab Emirates", currency: "AED" },
  { code: "TR", fa: "ترکیه", en: "Türkiye", currency: "TRY" },
  { code: "IQ", fa: "عراق", en: "Iraq", currency: "IQD" },
  { code: "AF", fa: "افغانستان", en: "Afghanistan", currency: "AFN" },
  { code: "PK", fa: "پاکستان", en: "Pakistan", currency: "PKR" },
  { code: "CN", fa: "چین", en: "China", currency: "CNY" },
  { code: "IN", fa: "هند", en: "India", currency: "INR" },
  { code: "RU", fa: "روسیه", en: "Russia", currency: "RUB" },
  { code: "DE", fa: "آلمان", en: "Germany", currency: "EUR" },
  { code: "GB", fa: "بریتانیا", en: "United Kingdom", currency: "GBP" },
  { code: "US", fa: "آمریکا", en: "United States", currency: "USD" },
];

export const countryLabel = (code: string, locale?: string): string => {
  const loc = locale ?? readLocaleCookie();
  const c = COUNTRIES.find((x) => x.code === code);
  if (!c) return code;
  return loc === "en" ? c.en : c.fa;
};

// ── نوع فعالیت کسب‌وکار — همان ۱۰ مقدار مجازِ بک‌اند ──
// در ثبت‌نام پرسیده نمی‌شود؛ از پنل، هر وقت خواست، انتخاب می‌کند.
export const ACTIVITY_TYPES: { key: string; fa: string; en: string }[] = [
  { key: "PRODUCER", fa: "تولیدکننده", en: "Producer" },
  { key: "WHOLESALER", fa: "عمده‌فروش", en: "Wholesaler" },
  { key: "RETAILER", fa: "خرده‌فروش", en: "Retailer" },
  { key: "DISTRIBUTOR", fa: "پخش‌کننده", en: "Distributor" },
  { key: "MERCHANT", fa: "بازرگان", en: "Merchant" },
  { key: "SALES_AGENT", fa: "نماینده فروش", en: "Sales Agent" },
  { key: "MARKETER", fa: "بازاریاب", en: "Marketer" },
  { key: "SERVICE_PROVIDER", fa: "ارائه‌دهنده خدمات", en: "Service Provider" },
  { key: "CONTRACTOR", fa: "پیمانکار", en: "Contractor" },
  { key: "BUSINESS_CONSUMER", fa: "مصرف‌کننده تجاری", en: "Business Consumer" },
];

export const activityTypeLabel = (key: string | null | undefined, locale?: string): string => {
  const loc = locale ?? readLocaleCookie();
  const a = ACTIVITY_TYPES.find((x) => x.key === key);
  if (!a) return "";
  return loc === "en" ? a.en : a.fa;
};

/** زمان نسبی خوانا برای createdAt های سرور */
export function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60_000);
  if (min < 1) return "همین حالا";
  if (min < 60) return `${fa(min)} دقیقه پیش`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${fa(h)} ساعت پیش`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${fa(d)} روز پیش`;
  return new Date(iso).toLocaleDateString("fa-IR");
}

// ── شهرها و استان‌ها — هم‌شهری > هم‌استان > دور (مطابق موتور تطبیق) ──
export const CITIES = [
  "تهران",
  "کرج",
  "قم",
  "اصفهان",
  "شیراز",
  "مشهد",
  "تبریز",
  "اردبیل",
  "رشت",
  "همدان",
  "کرمانشاه",
  "ارومیه",
  "قزوین",
  "زنجان",
  "سنندج",
  "یزد",
  "کرمان",
  "اهواز",
] as const;

const CITY_PROVINCE: Record<string, string> = {
  تهران: "تهران",
  کرج: "البرز",
  قم: "قم",
  اصفهان: "اصفهان",
  شیراز: "فارس",
  مشهد: "خراسان رضوی",
  تبریز: "آذربایجان شرقی",
  اردبیل: "اردبیل",
  رشت: "گیلان",
  همدان: "همدان",
  کرمانشاه: "کرمانشاه",
  ارومیه: "آذربایجان غربی",
  قزوین: "قزوین",
  زنجان: "زنجان",
  سنندج: "کردستان",
  یزد: "یزد",
  کرمان: "کرمان",
  اهواز: "خوزستان",
};

export type Proximity = "same" | "near" | "far";

export const proximity = (a: string, b: string): Proximity => {
  if (a === b) return "same";
  const pa = CITY_PROVINCE[a];
  if (pa && pa === CITY_PROVINCE[b]) return "near";
  return "far";
};

export const proximityLabel = (p: Proximity): string =>
  p === "same" ? "هم‌شهری" : p === "near" ? "هم‌استان" : "فاصله دور";

/** هر فرمت شماره‌گیری را به شکل استاندارد 09xxxxxxxxx می‌رساند (پیشوند +98 در UI جدا است) */
export const normalizePhone = (raw: string): string => {
  let p = raw.replace(/[\s\-()]/g, "").replace(/^\+/, "");
  if (p.startsWith("0098")) p = `0${p.slice(4)}`;
  else if (p.startsWith("98") && p.length === 12) p = `0${p.slice(2)}`;
  else if (p.length === 10 && p.startsWith("9")) p = `0${p}`;
  return p;
};
