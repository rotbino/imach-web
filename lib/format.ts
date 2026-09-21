// ─── قالب‌بندی اعداد و برچسب‌های فارسی ───

export const fa = (n: number | string): string => {
  if (typeof n === "string") {
    const num = Number(n);
    if (Number.isNaN(num)) return n;
    n = num;
  }
  return n.toLocaleString("fa-IR");
};

export const money = (n: number): string => fa(n) + " تومان";

// ── برچسب enum های سرور ──
export const UNIT_LABELS: Record<string, string> = {
  KILOGRAM: "کیلوگرم",
  TON: "تن",
  CARTON: "کارتن",
  SACK: "کیسه",
  PIECE: "عدد",
  LITER: "لیتر",
  BRANCH: "شاخه",
};

export const FREQUENCY_LABELS: Record<string, string> = {
  WEEKLY: "هفتگی",
  MONTHLY: "ماهانه",
  OCCASIONAL: "موردی",
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

export const activityTypeLabel = (key: string | null | undefined): string =>
  ACTIVITY_TYPES.find((a) => a.key === key)?.fa ?? "";

export const unitLabel = (u: string): string => UNIT_LABELS[u] ?? u;
export const frequencyLabel = (f: string): string => FREQUENCY_LABELS[f] ?? f;

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
