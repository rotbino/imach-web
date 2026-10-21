// ─── کشورها، زبان‌ها و هویت بین‌المللی موبایل ────────────────────────────────
// قانون نمایش نام‌ها (خواسته‌ی کاربر، فعلاً):
//   ایران → فارسی · کشورهای عربی → عربی · بقیه → انگلیسی
// هر کشور: کد ISO + کد تلفن + پول رسمی + زبان رسمی (زبانِ پیش‌فرض فرم).

export interface Country {
  /** ISO 3166-1 alpha-2 */
  code: string;
  /** کد تلفن بین‌المللی — بدون + و بدون صفر */
  dial: string;
  /** ISO 4217 */
  currency: string;
  /** زبان رسمی اصلی — زبانِ انتخابیِ خودکار فرم (BCP-47 base) */
  lang: string;
  /** نام نمایشی مطابق قانون بالا */
  name: string;
}

export const COUNTRIES: Country[] = [
  // ایران + همسایگان
  { code: "IR", dial: "98", currency: "IRR", lang: "fa", name: "ایران" },
  { code: "AF", dial: "93", currency: "AFN", lang: "fa", name: "Afghanistan" },
  { code: "PK", dial: "92", currency: "PKR", lang: "ur", name: "Pakistan" },
  { code: "TM", dial: "993", currency: "TMT", lang: "tk", name: "Turkmenistan" },
  { code: "AZ", dial: "994", currency: "AZN", lang: "az", name: "Azerbaijan" },
  { code: "AM", dial: "374", currency: "AMD", lang: "hy", name: "Armenia" },
  { code: "TR", dial: "90", currency: "TRY", lang: "tr", name: "Türkiye" },
  // جهان عرب
  { code: "IQ", dial: "964", currency: "IQD", lang: "ar", name: "العراق" },
  { code: "SY", dial: "963", currency: "SYP", lang: "ar", name: "سوريا" },
  { code: "LB", dial: "961", currency: "LBP", lang: "ar", name: "لبنان" },
  { code: "JO", dial: "962", currency: "JOD", lang: "ar", name: "الأردن" },
  { code: "AE", dial: "971", currency: "AED", lang: "ar", name: "الإمارات" },
  { code: "SA", dial: "966", currency: "SAR", lang: "ar", name: "السعودية" },
  { code: "QA", dial: "974", currency: "QAR", lang: "ar", name: "قطر" },
  { code: "KW", dial: "965", currency: "KWD", lang: "ar", name: "الكويت" },
  { code: "BH", dial: "973", currency: "BHD", lang: "ar", name: "البحرين" },
  { code: "OM", dial: "968", currency: "OMR", lang: "ar", name: "عُمان" },
  { code: "YE", dial: "967", currency: "YER", lang: "ar", name: "اليمن" },
  { code: "EG", dial: "20", currency: "EGP", lang: "ar", name: "مصر" },
  // بازارهای بزرگ دیگر
  { code: "CN", dial: "86", currency: "CNY", lang: "zh", name: "China" },
  { code: "IN", dial: "91", currency: "INR", lang: "hi", name: "India" },
  { code: "RU", dial: "7", currency: "RUB", lang: "ru", name: "Russia" },
  { code: "DE", dial: "49", currency: "EUR", lang: "de", name: "Germany" },
  { code: "GB", dial: "44", currency: "GBP", lang: "en", name: "United Kingdom" },
  { code: "US", dial: "1", currency: "USD", lang: "en", name: "United States" },
];

export const countryByCode = (code: string | null | undefined): Country | undefined =>
  COUNTRIES.find((c) => c.code === code);

export const dialOf = (code: string | null | undefined): string =>
  countryByCode(code)?.dial ?? "98";

export const countryLabel = (code: string | null | undefined): string =>
  countryByCode(code)?.name ?? code ?? "";

/** زبان رسمی کشور — فرم ثبت‌نام زبان را با تغییر کشور خودکار هم‌تراز می‌کند */
export const langOfCountry = (code: string | null | undefined): string =>
  countryByCode(code)?.lang ?? "fa";

// ─── زبان‌های رسمی کشورهای فهرست — نام بومی، ذخیره در دیتابیس ────────────────
export interface LanguageDef {
  code: string; // BCP-47 base — در User.language ذخیره می‌شود
  label: string; // نام بومی
}

export const LANGUAGES: LanguageDef[] = [
  { code: "fa", label: "فارسی" },
  { code: "ar", label: "العربية" },
  { code: "en", label: "English" },
  { code: "tr", label: "Türkçe" },
  { code: "az", label: "Azərbaycanca" },
  { code: "tk", label: "Türkmençe" },
  { code: "hy", label: "Հայերեն" },
  { code: "ur", label: "اردو" },
  { code: "hi", label: "हिन्दी" },
  { code: "zh", label: "中文" },
  { code: "ru", label: "Русский" },
  { code: "de", label: "Deutsch" },
];

export const languageLabel = (code: string | null | undefined): string =>
  LANGUAGES.find((l) => l.code === code)?.label ?? code ?? "";

// ─── تشخیص تقریبی کشور — timezone مرورگر، بدون هیچ درخواست شبکه ─────────────
// VPN کاربر را گول نمی‌زند (منطقه‌ی زمانی عوض نمی‌شود)؛ اگر هم اشتباه از در
// آمد، کاربر خودش از دراپ‌داون عوض می‌کند — چون انتخاب دستی همیشه آزاد است.
const TZ_COUNTRY: Record<string, string> = {
  "Asia/Tehran": "IR",
  "Asia/Kabul": "AF",
  "Asia/Karachi": "PK",
  "Asia/Ashgabat": "TM",
  "Asia/Baku": "AZ",
  "Asia/Yerevan": "AM",
  "Europe/Istanbul": "TR",
  "Asia/Baghdad": "IQ",
  "Asia/Damascus": "SY",
  "Asia/Beirut": "LB",
  "Asia/Amman": "JO",
  "Asia/Dubai": "AE",
  "Asia/Riyadh": "SA",
  "Asia/Qatar": "QA",
  "Asia/Kuwait": "KW",
  "Asia/Bahrain": "BH",
  "Asia/Muscat": "OM",
  "Asia/Aden": "YE",
  "Africa/Cairo": "EG",
  "Asia/Shanghai": "CN",
  "Asia/Kolkata": "IN",
  "Europe/Moscow": "RU",
  "Europe/Berlin": "DE",
  "Europe/London": "GB",
  "America/New_York": "US",
  "America/Chicago": "US",
  "America/Los_Angeles": "US",
};

/** کشور محتمل کاربر: timezone → منطقه‌ی locale (fa-IR → IR) → ایران */
export function guessCountryCode(): string {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (tz && TZ_COUNTRY[tz]) return TZ_COUNTRY[tz];
  } catch {
    /* Intl ناقص — می‌رویم سراغ locale */
  }
  try {
    const lang = typeof navigator !== "undefined" ? navigator.language : "";
    const region = lang.split("-")[1]?.toUpperCase();
    if (region && COUNTRIES.some((c) => c.code === region)) return region;
  } catch {
    /* ignore */
  }
  return "IR";
}

// ─── هویت موبایل: کد کشور + شماره بدون صفر اول ──────────────────────────────
// 0912…، 912…، +98912…، 0098912… همه می‌شوند 98912… — پس شماره‌ی دو کاربر
// از دو کشور مختلف هیچ‌وقت تکراری نمی‌شود. صفر اول هرگز ذخیره نمی‌شود.

/** هر فرمتی را به شکل استاندارد بین‌المللی می‌رساند؛ null یعنی نامعتبر */
export function normalizeIntlPhone(raw: string, countryCode: string): string | null {
  const dial = dialOf(countryCode);
  let d = raw.replace(/\D/g, "");
  if (d.startsWith("00")) d = d.slice(2); // پیشوند بین‌الملل
  if (d.startsWith(dial)) d = d.slice(dial.length); // شماره با کد کشور چسبیده
  while (d.startsWith("0")) d = d.slice(1); // صفر ترانک — هرگز ذخیره نمی‌شود
  // قاعده‌ی اعتبار: ایران دقیقا ۱۰ رقم و شروع با ۹؛ بقیه ۷ تا ۱۲ رقم
  const valid = countryCode === "IR" ? /^9\d{9}$/.test(d) : /^\d{7,12}$/.test(d);
  return valid ? dial + d : null;
}

/** نمایش خوانا: ایران به شکل محلی ۰۹۱۲ …، بقیه با +کد کشور */
export function fmtPhone(intl: string | null | undefined): string {
  if (!intl) return "";
  if (/^98(9\d{9})$/.test(intl)) {
    const n = intl.slice(2);
    return `0${n.slice(0, 4)} ${n.slice(4, 7)} ${n.slice(7)}`;
  }
  const plus = `+${intl}`;
  return plus.length > 8 ? `${plus.slice(0, plus.length - 7)} ${plus.slice(-7, -4)} ${plus.slice(-4)}` : plus;
}
