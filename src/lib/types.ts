// ─── انواع دیتای سامانه پیوند بازار (ماگ) ───

export type Unit = "کیلوگرم" | "تن" | "کارتن" | "کیسه" | "عدد" | "لیتر" | "شاخه";

export type TradeMode = "sell" | "buy" | "both";

export type Role = "خرده‌فروش" | "عمده‌فروش" | "تولیدکننده" | "بازاریاب";

export type Frequency = "هفتگی" | "ماهانه" | "موردی";

export interface Good {
  id: string;
  name: string;
  category: string;
  unit: Unit;
}

export interface SellSpec {
  price: number; // تومان به ازای هر واحد
  unit: Unit;
  stock: number; // موجودی
  minOrder: number; // حداقل سفارش
}

export interface BuySpec {
  volume: number; // حجم در هر دوره
  unit: Unit;
  frequency: Frequency;
}

/** یک کالا که کاربر برای آن مشخصات ثبت کرده */
export interface Listing {
  goodId: string;
  mode: TradeMode; // چه چیزی برای این کالا فعال است
  sell?: SellSpec; // اگر sell یا both باشد
  buy?: BuySpec; // اگر buy یا both باشد
}

export interface Business {
  slug: string;
  name: string;
  role: Role;
  city: string;
  phone: string;
  listings: Listing[];
  isDemo?: boolean;
  /** آخرین به‌روزرسانی قیمت‌ها برای تابلوی قیمت */
  updatedAt?: string;
  trend?: "up" | "down" | "flat";
}

/** پیشنهاد قیمتی که یک تامین‌کننده برای کالای خرید کاربر می‌فرستد */
export interface Offer {
  supplierSlug: string;
  name: string;
  role: Role;
  city: string;
  goodId: string;
  price: number;
  unit: Unit;
  minOrder: number;
  score: number;
  special?: boolean; // قیمت ویژه برای شما
  time: string;
}

/** درخواست قیمت از سمت خریدار (در بازوی فروش دیده می‌شود) */
export interface Inquiry {
  buyerSlug: string;
  buyerName: string;
  role: Role;
  city: string;
  goodId: string;
  volume: number;
  unit: Unit;
  frequency: Frequency;
  time: string;
  note?: string;
}

/** خریداری که در استخر خریداران برای تطبیق نگه داشته می‌شود */
export interface BuyerPoolEntry {
  slug: string;
  name: string;
  role: Role;
  city: string;
  buys: BuySpec[];
}

export type HashRoute =
  | { view: "landing" }
  | { view: "add" }
  | { view: "welcome"; slug: string }
  | { view: "sell"; slug: string }
  | { view: "buy"; slug: string };
