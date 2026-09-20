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
export const ROLE_LABELS: Record<string, string> = {
  RETAILER: "خرده‌فروش",
  WHOLESALER: "عمده‌فروش",
  PRODUCER: "تولیدکننده",
  MARKETER: "بازاریاب",
};

export const ROLE_HINTS: Record<string, string> = {
  RETAILER: "می‌خرم و می‌فروشم",
  WHOLESALER: "می‌خرم و می‌فروشم",
  PRODUCER: "می‌فروشم؛ مواد اولیه می‌خرم",
  MARKETER: "فقط می‌فروشم",
};

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

export const MODE_LABELS: Record<string, string> = {
  SELL: "فقط می‌فروشم",
  BUY: "فقط می‌خرم",
  BOTH: "هر دو",
};

export const unitLabel = (u: string): string => UNIT_LABELS[u] ?? u;
export const roleLabel = (r: string): string => ROLE_LABELS[r] ?? r;
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

// ── شهرها (گراف مجاورت سمت فرانت فقط برای نمایش برچسب نزدیکی) ──
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
] as const;

const NEIGHBORS: Record<string, readonly string[]> = {
  تهران: ["کرج", "قم"],
  کرج: ["تهران", "قم"],
  قم: ["تهران", "کرج", "اصفهان"],
  اصفهان: ["قم", "شیراز"],
  شیراز: ["اصفهان"],
  مشهد: [],
  تبریز: ["اردبیل"],
  اردبیل: ["تبریز", "رشت"],
  رشت: ["اردبیل"],
};

export type Proximity = "same" | "near" | "far";

export const proximity = (a: string, b: string): Proximity => {
  if (a === b) return "same";
  if (NEIGHBORS[a]?.includes(b)) return "near";
  return "far";
};

export const proximityLabel = (p: Proximity): string =>
  p === "same" ? "هم‌شهری" : p === "near" ? "شهر نزدیک" : "فاصله دور";
