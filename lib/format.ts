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

export const num = (n: number | string, locale: string): string => (locale === "en" ? en(n) : fa(n));

// ── پول — مبلغ همیشه به کوچک‌ترین واحد ارز ذخیره شده (ریال/سنت…) ──
// exp = تعداد رقم اعشار بین واحد اصلی و کوچک‌ترین واحد (IRR بدون اعشار)
export const CURRENCIES: Record<string, { exp: number; fa: string; en: string; ar: string }> = {
  IRR: { exp: 1, fa: "تومان", en: "Toman", ar: "تومان" } /* نمایش/ورودی تومان — ذخیره ریال (طرح رفرنس همه‌جا تومان است) */,
  USD: { exp: 2, fa: "دلار", en: "US Dollar", ar: "دولار أمريكي" },
  EUR: { exp: 2, fa: "یورو", en: "Euro", ar: "يورو" },
  GBP: { exp: 2, fa: "پوند", en: "Pound", ar: "جنيه إسترليني" },
  AED: { exp: 2, fa: "درهم", en: "Dirham", ar: "درهم إماراتي" },
  TRY: { exp: 2, fa: "لیر", en: "Lira", ar: "ليرة تركية" },
  CNY: { exp: 2, fa: "یوان", en: "Yuan", ar: "يوان صيني" },
  INR: { exp: 2, fa: "روپیه", en: "Rupee", ar: "روبية هندية" },
  PKR: { exp: 2, fa: "روپیه پاکستان", en: "Pakistani Rupee", ar: "روبية باكستانية" },
  AFN: { exp: 2, fa: "افغانی", en: "Afghani", ar: "أفغاني" },
  IQD: { exp: 3, fa: "دینار عراق", en: "Iraqi Dinar", ar: "دينار عراقي" },
  RUB: { exp: 2, fa: "روبل", en: "Ruble", ar: "روبل روسي" },
  SAR: { exp: 2, fa: "ریال سعودی", en: "Saudi Riyal", ar: "ريال سعودي" },
  QAR: { exp: 2, fa: "ریال قطر", en: "Qatari Riyal", ar: "ريال قطري" },
  KWD: { exp: 3, fa: "دینار کویت", en: "Kuwaiti Dinar", ar: "دينار كويتي" },
  BHD: { exp: 3, fa: "دینار بحرین", en: "Bahraini Dinar", ar: "دينار بحريني" },
  OMR: { exp: 3, fa: "ریال عمان", en: "Omani Rial", ar: "ريال عماني" },
  SYP: { exp: 2, fa: "پوند سوریه", en: "Syrian Pound", ar: "ليرة سورية" },
  LBP: { exp: 2, fa: "پوند لبنان", en: "Lebanese Pound", ar: "ليرة لبنانية" },
  JOD: { exp: 3, fa: "دینار اردن", en: "Jordanian Dinar", ar: "دينار أردني" },
  EGP: { exp: 2, fa: "پوند مصر", en: "Egyptian Pound", ar: "جنيه مصري" },
  YER: { exp: 2, fa: "ریال یمن", en: "Yemeni Rial", ar: "ريال يمني" },
  TMT: { exp: 2, fa: "منات ترکمنستان", en: "Turkmen Manat", ar: "منات تركمانستاني" },
  AZN: { exp: 2, fa: "منات آذربایجان", en: "Azerbaijani Manat", ar: "منات أذربيجاني" },
  AMD: { exp: 2, fa: "درام ارمنستان", en: "Armenian Dram", ar: "درام أرميني" },
};

export const currencyLabel = (currency: string | null | undefined, locale?: string): string => {
  const loc = locale ?? readLocaleCookie();
  const c = CURRENCIES[currency ?? "IRR"] ?? { exp: 0, fa: currency ?? "", en: currency ?? "", ar: currency ?? "" };
  return loc === "en" ? c.en : loc === "ar" ? (c.ar || c.en) : c.fa;
};

/** قیمت ذخیره‌شده (کوچک‌ترین واحد) → رشته نمایشی «۷۲۰٬۰۰۰ ریال» */
export const fmtMoney = (
  minor: number | null | undefined,
  currency?: string | null,
  locale?: string
): string => {
  if (minor === null || minor === undefined) return "";
  const loc = locale ?? readLocaleCookie();
  const c = CURRENCIES[currency ?? "IRR"] ?? { exp: 0, fa: currency ?? "", en: currency ?? "", ar: currency ?? "" };
  const label = loc === "en" ? c.en : loc === "ar" ? (c.ar || c.en) : c.fa;
  return `${num(minor / 10 ** c.exp, loc)} ${label}`;
};

// ── نام چندزبانه کالا/دسته — نمایش با زبان فعال، fallback فارسی ──
type BiName = { nameFa: string; nameEn?: string | null; nameAr?: string | null };
export const goodName = (g: BiName, locale?: string): string => {
  const loc = locale ?? readLocaleCookie();
  if (loc === "en" && g.nameEn) return g.nameEn;
  if (loc === "ar") return g.nameAr || g.nameEn || g.nameFa;
  return g.nameFa;
};
export const categoryName = goodName;

// ── برچسب enum های سرور ──
export const UNIT_LABELS: Record<string, { fa: string; en: string; ar?: string }> = {
  KILOGRAM: { fa: "کیلوگرم", en: "kg", ar: "كيلوغرام" },
  TON: { fa: "تن", en: "Ton", ar: "طن" },
  CARTON: { fa: "کارتن", en: "Carton", ar: "كرتون" },
  SACK: { fa: "کیسه", en: "Sack", ar: "كيس" },
  PIECE: { fa: "عدد", en: "Piece", ar: "قطعة" },
  LITER: { fa: "لیتر", en: "Liter", ar: "لتر" },
  BRANCH: { fa: "شاخه", en: "Branch", ar: "فرع" },
  METER: { fa: "متر", en: "Meter", ar: "متر" },
  GRAM: { fa: "گرم", en: "Gram", ar: "غرام" },
  SERVICE: { fa: "پرس", en: "Service", ar: "طبق" },
};

/** فاز ۸ — نام‌های چندزبانهٔ واحد از DB (سرور /units/list) — بر‌اساس کلید */
export const UNIT_DB_NAMES: Record<string, { fa?: string; en?: string; ar?: string }> = {};

export const unitLabel = (u: string, locale?: string): string => {
  const loc = locale ?? readLocaleCookie();
  const db = UNIT_DB_NAMES[u];
  if (db) {
    if (loc === "en" && db.en) return db.en;
    if (loc === "ar" && (db.ar || db.en)) return (db.ar || db.en) as string;
    if (loc !== "en" && loc !== "ar" && db.fa) return db.fa;
  }
  const def = UNIT_LABELS[u];
  if (!def) return u;
  return loc === "en" ? def.en : loc === "ar" ? (def.ar || def.en) : def.fa;
};

export const FREQUENCY_LABELS: Record<string, { fa: string; en: string; ar?: string }> = {
  WEEKLY: { fa: "هفتگی", en: "Weekly", ar: "أسبوعيًا" },
  MONTHLY: { fa: "ماهانه", en: "Monthly", ar: "شهريًا" },
  OCCASIONAL: { fa: "موردی", en: "Occasional", ar: "عند الحاجة" },
};

export const frequencyLabel = (f: string, locale?: string): string => {
  const loc = locale ?? readLocaleCookie();
  const def = FREQUENCY_LABELS[f];
  if (!def) return f;
  return loc === "en" ? def.en : loc === "ar" ? (def.ar || def.en) : def.fa;
};

// ── کشورها و زبان‌ها به lib/countries.ts منتقل شدند — منبع یگانه‌ی داده ──
// (دراپ‌داون سرچ‌دار: components/search-select.tsx)

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
