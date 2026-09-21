import type {
  Business,
  BuyerPoolEntry,
  Frequency,
  Inquiry,
  Listing,
  Offer,
  Role,
  Unit,
} from "./types";

// ─── اعداد فارسی ───
export const fa = (n: number | string): string => {
  if (typeof n === "string") {
    const num = Number(n);
    if (Number.isNaN(num)) return n;
    n = num;
  }
  return n.toLocaleString("fa-IR");
};

export const money = (n: number): string => fa(n) + " تومان";

// ─── کالاهای پایه ───
export interface GoodDef {
  id: string;
  name: string;
  category: string;
  unit: Unit;
}

export const GOODS: GoodDef[] = [
  { id: "rice", name: "برنج هاشمی", category: "حبوبات و غلات", unit: "کیلوگرم" },
  { id: "flour", name: "آرد گندم", category: "حبوبات و غلات", unit: "کیسه" },
  { id: "wheat", name: "گندم خام", category: "حبوبات و غلات", unit: "تن" },
  { id: "lentil", name: "عدس", category: "حبوبات و غلات", unit: "کیلوگرم" },
  { id: "bean", name: "لوبیا قرمز", category: "حبوبات و غلات", unit: "کیلوگرم" },
  { id: "chickpea", name: "نخود", category: "حبوبات و غلات", unit: "کیلوگرم" },
  { id: "oil", name: "روغن نباتی", category: "روغن و خواربار", unit: "کارتن" },
  { id: "sugar", name: "شکر", category: "روغن و خواربار", unit: "کیسه" },
  { id: "pasta", name: "ماکارونی", category: "روغن و خواربار", unit: "کارتن" },
  { id: "tomato-paste", name: "رب گوجه‌فرنگی", category: "روغن و خواربار", unit: "کارتن" },
  { id: "tea", name: "چای سیاه", category: "نوشیدنی", unit: "کارتن" },
  { id: "juice", name: "آب‌میوه", category: "نوشیدنی", unit: "کارتن" },
  { id: "honey", name: "عسل طبیعی", category: "خشکبار و سوغات", unit: "کیلوگرم" },
  { id: "pistachio", name: "پسته", category: "خشکبار و سوغات", unit: "کیلوگرم" },
  { id: "raisin", name: "کشمش", category: "خشکبار و سوغات", unit: "کیلوگرم" },
  { id: "date", name: "خرما", category: "خشکبار و سوغات", unit: "کیلوگرم" },
  { id: "carton", name: "کارتن بسته‌بندی", category: "مواد تولید و بسته‌بندی", unit: "عدد" },
  { id: "film", name: "فیلم سلفون بسته‌بندی", category: "مواد تولید و بسته‌بندی", unit: "شاخه" },
];

export const CATEGORIES = Array.from(new Set(GOODS.map((g) => g.category)));

export const goodById = (id: string): GoodDef =>
  GOODS.find((g) => g.id === id) ?? { id, name: id, category: "سایر", unit: "عدد" };

// ─── شهرها و نزدیکی جغرافیایی ───
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
];

const NEIGHBORS: Record<string, string[]> = {
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
  if ((NEIGHBORS[a] ?? []).includes(b)) return "near";
  return "far";
};

export const proximityLabel = (p: Proximity): string =>
  p === "same" ? "هم‌شهری" : p === "near" ? "شهر نزدیک" : "فاصله دور";

// ─── موتور امتیاز تطبیق (کالا + شهر + حجم) ───
export function matchScore(
  myCity: string,
  theirCity: string,
  myVolume: number,
  theirMinOrder: number
): number {
  const p = proximity(myCity, theirCity);
  let s = 45 + (p === "same" ? 38 : p === "near" ? 22 : 6);
  if (theirMinOrder > 0 && myVolume >= theirMinOrder) s += 9;
  else if (theirMinOrder > myVolume * 2) s -= 7;
  return Math.max(42, Math.min(98, Math.round(s)));
}

// ─── کسب‌وکارهای نمونه (تامین‌کننده‌ها و بازیگران زنجیره) ───
const L = (
  goodId: string,
  mode: Listing["mode"],
  sell?: Partial<Listing["sell"]> & { price: number; unit: Unit },
  buy?: { volume: number; unit: Unit; frequency: Frequency }
): Listing => ({
  goodId,
  mode,
  sell: sell ? { price: sell.price, unit: sell.unit, stock: sell.stock ?? 500, minOrder: sell.minOrder ?? 10 } : undefined,
  buy,
});

export const BUSINESSES: Business[] = [
  {
    slug: "khorshid-market",
    name: "خورشید مارکت",
    role: "خرده‌فروش",
    city: "تهران",
    phone: "09121234567",
    isDemo: true,
    updatedAt: "امروز ۱۰:۲۴",
    trend: "flat",
    listings: [
      L("rice", "both", { price: 87000, unit: "کیلوگرم", stock: 600, minOrder: 5 }, { volume: 2000, unit: "کیلوگرم", frequency: "ماهانه" }),
      L("oil", "both", { price: 1380000, unit: "کارتن", stock: 120, minOrder: 2 }, { volume: 300, unit: "کارتن", frequency: "ماهانه" }),
      L("sugar", "both", { price: 2180000, unit: "کیسه", stock: 130, minOrder: 5 }, { volume: 40, unit: "کیسه", frequency: "ماهانه" }),
      L("tea", "both", { price: 2980000, unit: "کارتن", stock: 45, minOrder: 1 }, { volume: 25, unit: "کارتن", frequency: "ماهانه" }),
      L("pasta", "sell", { price: 655000, unit: "کارتن", stock: 80, minOrder: 5 }),
      L("lentil", "buy", undefined, { volume: 800, unit: "کیلوگرم", frequency: "ماهانه" }),
    ],
  },
  {
    slug: "tabiat-daneh",
    name: "طبیعت‌دانه پخش",
    role: "عمده‌فروش",
    city: "تهران",
    phone: "02155667788",
    isDemo: true,
    updatedAt: "امروز ۰۹:۴۰",
    trend: "down",
    listings: [
      L("rice", "sell", { price: 79500, unit: "کیلوگرم", stock: 18000, minOrder: 500 }),
      L("lentil", "sell", { price: 68500, unit: "کیلوگرم", stock: 9000, minOrder: 300 }),
      L("bean", "sell", { price: 72800, unit: "کیلوگرم", stock: 7000, minOrder: 300 }),
      L("chickpea", "sell", { price: 58400, unit: "کیلوگرم", stock: 5000, minOrder: 300 }),
      L("wheat", "buy", undefined, { volume: 60, unit: "تن", frequency: "ماهانه" }),
    ],
  },
  {
    slug: "berenj-gilan",
    name: "برنج‌سرای گیلان",
    role: "عمده‌فروش",
    city: "رشت",
    phone: "01333221100",
    isDemo: true,
    updatedAt: "امروز ۰۹:۱۵",
    trend: "flat",
    listings: [
      L("rice", "sell", { price: 80500, unit: "کیلوگرم", stock: 12000, minOrder: 400 }),
      L("lentil", "sell", { price: 67000, unit: "کیلوگرم", stock: 4000, minOrder: 200 }),
    ],
  },
  {
    slug: "pakhsh-gostar",
    name: "پخش گستر البرز",
    role: "عمده‌فروش",
    city: "کرج",
    phone: "02634445566",
    isDemo: true,
    updatedAt: "دیروز ۱۸:۱۲",
    trend: "up",
    listings: [
      L("oil", "sell", { price: 1315000, unit: "کارتن", stock: 2400, minOrder: 50 }),
      L("sugar", "sell", { price: 2075000, unit: "کیسه", stock: 1800, minOrder: 50 }),
      L("juice", "sell", { price: 478000, unit: "کارتن", stock: 900, minOrder: 30 }),
      L("tomato-paste", "sell", { price: 1120000, unit: "کارتن", stock: 600, minOrder: 25 }),
    ],
  },
  {
    slug: "shirin-asal",
    name: "شیرین‌عسل اردبیل",
    role: "تولیدکننده",
    city: "اردبیل",
    phone: "04533221100",
    isDemo: true,
    updatedAt: "امروز ۰۸:۰۵",
    trend: "flat",
    listings: [
      L("honey", "sell", { price: 645000, unit: "کیلوگرم", stock: 3200, minOrder: 10 }),
      L("carton", "buy", undefined, { volume: 4000, unit: "عدد", frequency: "ماهانه" }),
      L("film", "buy", undefined, { volume: 800, unit: "شاخه", frequency: "ماهانه" }),
    ],
  },
  {
    slug: "asyab-pars",
    name: "آسیاب پارس مشهد",
    role: "تولیدکننده",
    city: "مشهد",
    phone: "05138442211",
    isDemo: true,
    updatedAt: "امروز ۱۱:۳۰",
    trend: "down",
    listings: [
      L("flour", "sell", { price: 965000, unit: "کیسه", stock: 8000, minOrder: 100 }),
      L("wheat", "buy", undefined, { volume: 120, unit: "تن", frequency: "هفتگی" }),
      L("carton", "buy", undefined, { volume: 2500, unit: "عدد", frequency: "ماهانه" }),
    ],
  },
  {
    slug: "omid-trading",
    name: "تجارت‌سرای امید",
    role: "بازاریاب",
    city: "تهران",
    phone: "09129876543",
    isDemo: true,
    updatedAt: "دیروز ۲۰:۴۵",
    trend: "flat",
    listings: [
      L("tea", "sell", { price: 2790000, unit: "کارتن", stock: 300, minOrder: 20 }),
      L("pasta", "sell", { price: 618000, unit: "کارتن", stock: 400, minOrder: 30 }),
      L("juice", "sell", { price: 452000, unit: "کارتن", stock: 260, minOrder: 30 }),
    ],
  },
];

export const businessBySlug = (slug: string): Business | undefined =>
  BUSINESSES.find((b) => b.slug === slug);

// ─── استخر خریداران (برای درخواست قیمت و خریدارهای پیشنهادی) ───
export interface BuyerPoolEntry {
  slug: string;
  name: string;
  role: Role;
  city: string;
  /** هر نیاز خرید به کالای مشخصی وصل است تا واحد و حجم واقعی بماند */
  wants: { goodId: string; volume: number; unit: Unit; frequency: Frequency }[];
}

export const BUYER_POOL: BuyerPoolEntry[] = [
  {
    slug: "hyper-mehrban",
    name: "هایپر مهربان",
    role: "خرده‌فروش",
    city: "تهران",
    wants: [
      { goodId: "oil", volume: 40, unit: "کارتن", frequency: "ماهانه" },
      { goodId: "rice", volume: 500, unit: "کیلوگرم", frequency: "ماهانه" },
      { goodId: "pasta", volume: 30, unit: "کارتن", frequency: "هفتگی" },
    ],
  },
  {
    slug: "nikavar",
    name: "پخش نیک‌آور",
    role: "عمده‌فروش",
    city: "قم",
    wants: [
      { goodId: "tea", volume: 60, unit: "کارتن", frequency: "ماهانه" },
      { goodId: "sugar", volume: 100, unit: "کیسه", frequency: "ماهانه" },
      { goodId: "rice", volume: 2000, unit: "کیلوگرم", frequency: "ماهانه" },
    ],
  },
  {
    slug: "rahat-bakery",
    name: "نان‌وری رحمت",
    role: "تولیدکننده",
    city: "کرج",
    wants: [
      { goodId: "flour", volume: 300, unit: "کیسه", frequency: "هفتگی" },
      { goodId: "sugar", volume: 50, unit: "کیسه", frequency: "هفتگی" },
    ],
  },
  {
    slug: "zeytoun",
    name: "فروشگاه زیتون",
    role: "خرده‌فروش",
    city: "شیراز",
    wants: [
      { goodId: "juice", volume: 25, unit: "کارتن", frequency: "ماهانه" },
      { goodId: "honey", volume: 20, unit: "کیلوگرم", frequency: "ماهانه" },
      { goodId: "date", volume: 150, unit: "کیلوگرم", frequency: "ماهانه" },
    ],
  },
];

// ─── تولید درخواست‌های قیمت برای بازوی فروش یک کسب‌وکار ───
const INQUIRY_NOTES = [
  "قیمت عمده برای همکاری مستمر می‌خواهم.",
  "پرداخت نقدی، ارسال به انبار خودم.",
  "اگر امکان تخفیف روی حجم بالاتر باشد خوب است.",
  "برای تمدید قرارداد ماهانه در حال قیمت‌گیری هستم.",
];
const INQUIRY_TIMES = ["۲ ساعت پیش", "۵ ساعت پیش", "دیروز", "۳ روز پیش"];

export function inquiriesFor(biz: Business): Inquiry[] {
  const out: Inquiry[] = [];
  let i = 0;
  for (const buyer of BUYER_POOL) {
    for (const want of buyer.wants) {
      const sells = biz.listings.some((l) => l.goodId === want.goodId && l.sell);
      if (!sells) continue;
      out.push({
        buyerSlug: buyer.slug,
        buyerName: buyer.name,
        role: buyer.role,
        city: buyer.city,
        goodId: want.goodId,
        volume: want.volume,
        unit: want.unit,
        frequency: want.frequency,
        time: INQUIRY_TIMES[i % INQUIRY_TIMES.length],
        note: i % 2 === 0 ? INQUIRY_NOTES[i % INQUIRY_NOTES.length] : undefined,
      });
      i++;
      if (out.length >= 4) return out;
    }
  }
  return out;
}

// ─── خریدارهای پیشنهادی برای کالاهای فروش من ───
export interface BuyerMatch {
  slug: string;
  name: string;
  role: Role;
  city: string;
  goodId: string;
  volume: number;
  unit: Unit;
  frequency: Frequency;
  score: number;
}

export function suggestedBuyersFor(biz: Business): BuyerMatch[] {
  const out: BuyerMatch[] = [];
  for (const buyer of BUYER_POOL) {
    for (const want of buyer.wants) {
      const mySell = biz.listings.find((l) => l.goodId === want.goodId && l.sell);
      if (!mySell?.sell) continue;
      const score = matchScore(buyer.city, biz.city, want.volume, mySell.sell.minOrder);
      if (score < 45) continue;
      out.push({
        slug: buyer.slug,
        name: buyer.name,
        role: buyer.role,
        city: buyer.city,
        goodId: want.goodId,
        volume: want.volume,
        unit: want.unit,
        frequency: want.frequency,
        score,
      });
    }
  }
  return out.sort((a, b) => b.score - a.score).slice(0, 6);
}

// ─── تامین‌کننده‌های پیشنهادی برای کالای خرید من ───
export function findSuppliersFor(biz: Business, goodId: string, volume: number, unit: Unit): Offer[] {
  const out: Offer[] = [];
  for (const b of BUSINESSES) {
    if (b.slug === biz.slug || b.name === biz.name) continue;
    const sell = b.listings.find((x) => x.goodId === goodId && x.sell)?.sell;
    if (!sell) continue;
    const score = matchScore(biz.city, b.city, volume, sell.minOrder);
    out.push({
      supplierSlug: b.slug,
      name: b.name,
      role: b.role,
      city: b.city,
      goodId,
      price: sell.price,
      unit: sell.unit,
      minOrder: sell.minOrder,
      score,
      special: score >= 90,
      time: b.updatedAt ?? "امروز",
    });
  }
  return out.sort((a, b) => b.score - a.score).slice(0, 3);
}

export function suggestedSuppliersFor(biz: Business): (Offer & { goodName: string })[] {
  const buyListings = biz.listings.filter((l) => l.buy);
  const out: (Offer & { goodName: string })[] = [];
  for (const b of BUSINESSES) {
    if (b.slug === biz.slug || b.name === biz.name) continue;
    for (const l of b.listings) {
      if (!l.sell) continue;
      const myBuy = buyListings.find((x) => x.goodId === l.goodId);
      if (myBuy?.buy) continue; // این کالا در تب خریدها مدیریت می‌شود
      // تطبیق کلی: تامین‌کننده‌ای که کالایی می‌فروشد که من معمولا می‌خرم یا ممکن است بخرم
      const score = matchScore(biz.city, b.city, myBuy?.buy?.volume ?? l.sell.minOrder * 2, l.sell.minOrder);
      out.push({
        supplierSlug: b.slug,
        name: b.name,
        role: b.role,
        city: b.city,
        goodId: l.goodId,
        goodName: goodById(l.goodId).name,
        price: l.sell.price,
        unit: l.sell.unit,
        minOrder: l.sell.minOrder,
        score,
        time: b.updatedAt ?? "امروز",
      });
    }
  }
  return out.sort((a, b) => b.score - a.score).slice(0, 6);
}

// ─── ذخیره‌سازی محلی (ماگ؛ در نسخه واقعی دیتابیس) ───
const PROFILES_KEY = "peyvand.profiles";

export function loadProfiles(): Record<string, Business> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(PROFILES_KEY) ?? "{}");
  } catch {
    return {};
  }
}

export function saveProfile(biz: Business): void {
  if (typeof window === "undefined") return;
  const all = loadProfiles();
  all[biz.slug] = biz;
  localStorage.setItem(PROFILES_KEY, JSON.stringify(all));
}

export function getBusiness(slug: string): Business | undefined {
  return loadProfiles()[slug] ?? businessBySlug(slug);
}

export function makeSlug(name: string): string {
  const clean = name
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^\p{L}\p{N}-]/gu, "");
  if (/^[a-z0-9-]+$/i.test(clean) && clean.length <= 24) return clean.toLowerCase();
  return "u-" + Math.random().toString(36).slice(2, 7);
}
