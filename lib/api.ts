// ─── کلاینت API تایپ‌دار برای iMach API (Fastify) ───
//
// • baseURL قابل تنظیم با NEXT_PUBLIC_API_BASE (پیش‌فرض: /api/v1)
// • در سندباکس، درخواست‌های بین‌پورتی با کوئری XTransformPort به گیت‌وی می‌روند
//   (NEXT_PUBLIC_GATEWAY_PORT=4000) — در دیپلوی واقعی خالی بگذارید.
// • Access token در حافظه (zustand) نگه داشته می‌شود؛ رفرش‌توکن httpOnly
//   کوکی است؛ پاسخ 401 یک‌بار ساکت رفرش و سپس تلاش مجدد می‌شود.

import { readLocaleCookie } from "@/i18n/config";

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string
  ) {
    super(message);
    this.name = "ApiError";
  }
}

const BASE = process.env.NEXT_PUBLIC_API_BASE ?? "/api/v1";
const GATEWAY_PORT = process.env.NEXT_PUBLIC_GATEWAY_PORT;

let getAccessToken: () => string | null = () => null;
let silentRefresh: () => Promise<string | null> = async () => null;

/** تزریق توکن از auth-store (جلوگیری از import چرخشی) */
export function bindAuthHooks(hooks: {
  getToken: () => string | null;
  refresh: () => Promise<string | null>;
}): void {
  getAccessToken = hooks.getToken;
  silentRefresh = hooks.refresh;
}

export interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  params?: Record<string, string | number | undefined>;
  body?: unknown;
  /** multipart body — Content-Type را مرورگر می‌سازد (boundary) */
  form?: FormData;
  /** پیش‌فرض true — درخواست احراز می‌شود */
  auth?: boolean;
  /** تلاش مجدد بعد از رفرش ساکت (داخلی) */
  _retried?: boolean;
}

function buildUrl(path: string, params?: RequestOptions["params"]): string {
  const qs = new URLSearchParams();
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== "") qs.set(k, String(v));
    }
  }
  if (GATEWAY_PORT) qs.set("XTransformPort", GATEWAY_PORT);
  const query = qs.toString();
  return `${BASE}${path}${query ? `?${query}` : ""}`;
}

async function parse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let code = "HTTP_ERROR";
    let message = `خطای ${res.status}`;
    try {
      const data = (await res.json()) as { error?: string; message?: string };
      code = data.error ?? code;
      message = data.message ?? message;
    } catch {
      /* non-JSON error body */
    }
    throw new ApiError(res.status, code, message);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export async function api<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", params, body, form, auth = true, _retried = false } = options;

  const headers: Record<string, string> = {};
  if (body !== undefined) headers["Content-Type"] = "application/json";
  // i18n: اطلاع‌رسانی زبان فعال به بک‌اند تا پیام‌های خطا هم‌زبان UI برگردند
  headers["Accept-Language"] = readLocaleCookie();
  if (auth) {
    const token = getAccessToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(buildUrl(path, params), {
    method,
    headers,
    credentials: "include",
    body: form ?? (body !== undefined ? JSON.stringify(body) : undefined),
  });

  // 401 → یک تلاش رفرش ساکت، بعد تکرار همان درخواست
  if (res.status === 401 && auth && !_retried) {
    const fresh = await silentRefresh();
    if (fresh) {
      return api<T>(path, { ...options, _retried: true });
    }
  }

  return parse<T>(res);
}

// ─── DTO ها (آینه اسکیمای بک‌اند) ───

export interface UserDto {
  id: string;
  name: string;
  /** هویت شخص — از روز اول جدا از نام کسب‌وکار ذخیره می‌شود؛ ردیف‌های قدیمی null */
  firstName: string | null;
  lastName: string | null;
  /** نقش شخص در کسب‌وکار (FD-32 — «صاحب کسب‌وکار / مدیر فروش / …»)؛
   *  M2: در ثبت‌نام انتخاب می‌شود و در پیام‌ها/درخواست‌ها دیده خواهد شد.
   *  ⚠ جای system-role نیست — `role` (MEMBER|ADMIN) سطح دسترسی است. */
  businessRole: string | null;
  phone: string;
  role: string;
  country: string;
  language: string;
  /** پسورد واقعی تنظیم شده؟ ثبت‌نام سریع false دارد؛ دکمه‌ی چشمک‌زن با این کنترل می‌شود */
  passwordSet?: boolean;
}

/** دسته‌ی شخصی کاتالوگ (فاز ۳ — طرح ۰۱) — چیپ‌های ویترین: «هاشمی/طارم/...»
 *  JSON روی خود Business؛ id را کلاینت می‌سازد، آگهی با catalogCategoryId اشاره می‌کند */
export interface CatalogCategoryDto {
  id: string;
  name: string;
}

export interface BusinessSummaryDto {
  id: string;
  slug: string;
  name: string;
  activityType: string | null;
  /** صنف — «سوپرمارکت»؛ کلید جست‌وجوی کپی از هم‌صنف‌ها */
  trade?: string | null;
  /** فاز ۱۰ — پیوند رجیستری اصناف (بازاستفاده از صنف موجود) */
  tradeId?: string | null;
  city: string;
  country?: string;
  currency?: string;
  isVerified: boolean;
  /** فاز ۱۳ — معرفی کوتاه خود نوشته (زیر نام در ویترین عمومی) */
  bio?: string | null;
  /** M5 (FD-37) — شمارهٔ مالیاتی فروشنده؛ روی فاکتور چاپ می‌شود */
  invoiceTaxId?: string | null;
  /** M5 (FD-37) — یادداشت ثابت فاکتور؛ پانوشت چاپی */
  invoiceNote?: string | null;
  /** فاز ۳ — دسته‌های شخصی ویترین (چیپ‌های بالای کاتالوگ) */
  customCategories?: CatalogCategoryDto[] | null;
  /** M2 (G7) — کدام اصناف قیمت کاتالوگ را می‌بینند؛ null/[] = همه */
  priceVisibilityTrades?: string[] | null;
  /** M2 (G7) — اعتبار قیمت به روز (۱..۵)؛ null = هرگز منقضی نمی‌شود */
  priceValidityDays?: number | null;
  /** M3 مهاجرت — شرایط درخواست تامین خریدار (sheet-buycond)؛ خالی = مخفی در عمومی */
  supplyTerms?: string | null;
  /** لوکیشن دقیق اختیاری — فقط مبنای تطابق؛ علنی نمی‌شود */
  lat?: number | null;
  lng?: number | null;
  /** آدرس متنی قابل ویرایش — این یکی علنی است */
  address?: string | null;
  /** فاز ۸ (طرح ۱۴) — تنظیمات اعلان از پروفایل؛ null/غایب = همه روشن */
  notifPrefs?: NotifPrefsDto | null;
  /** فاز ۹ (شکاف ۶) — دستیارهای فعال؛ null/غایب = هر دو روشن.
 *  سوییچر شل برای بیزینسِ تک‌بازو غیب می‌شود (تالار/هتل). */
  enabledArms?: EnabledArmsDto | null;
  /** فاز ۶ مهاجرت — شمارهٔ تماس (sc-edit-biz) */
  phone?: string | null;
  /** فاز ۶ مهاجرت — ساعت پاسخگویی (sc-settings) */
  hours?: string | null;
  /** فاز ۶ مهاجرت — شرایط پرداخت پیش‌فرض (sc-settings) */
  defaultPayTerm?: string | null;
  /** فیکس‌بچ M3 — امتیاز فعالیت هر بازو (ثبت‌نام = ۵؛ موتور کامل M7) —
 *  چیپ امتیاز اپ‌بار همین را می‌خواند. */
  scoreSell?: number;
  scoreBuy?: number;
  /** فیکس‌بچ M3 — تیک عدم نمایش دسته‌بندی در کاتالوک خود فروشنده */
  catalogCategoriesHidden?: boolean;
}

/** فاز ۸ (طرح ۱۴) — چهار toggle اعلان پروفایل خریدار.
 *  غایب/نال = روشن؛ فقط false صریح خاموش است. */
export interface NotifPrefsDto {
  /** PRICE_CHANGE — «تغییر قیمت در تابلوهای من» */
  priceChange?: boolean;
  /** QUOTE + OFFER — «پاسخ درخواست‌های قیمت» */
  quoteReplies?: boolean;
  /** FOLLOW_* + CONTACT_JOINED — «پیشنهادهای جدید iMach» */
  suggestions?: boolean;
  /** گیتِ پوشِ وب — ردیفِ درون‌برنامه‌ای همیشه می‌ماند */
  push?: boolean;
}

/** فاز ۹ (شکاف ۶ — د۹) — دستیارهای فعالِ کسب‌وکار.
 *  غایب/نال/فیلد جاافتاده = روشن. حداقل یکی باید روشن بماند —
 *  سرور هر-دو-خاموش را 400 (ARMS_REQUIRED) می‌دهد و فرانت هم قبل از
 *  ارسال بهشت می‌دهد («بالاخره باید از یکی استفاده کنی»). */
export interface EnabledArmsDto {
  /** دستیار فروش عمده — کاتالوگ + درخواست‌های قیمت */
  sell?: boolean;
  /** دستیار خرید عمده — لیست خرید + تابلوی تأمین */
  buy?: boolean;
}

export interface AuthResponseDto {
  accessToken: string;
  user: UserDto;
  businesses: BusinessSummaryDto[];
}

// ─── کاتالوگ — درخت دسته + کالای مرجع + برند ───

export interface CategoryAttrOption {
  v: string;
  fa: string;
  en: string;
}

export interface CategoryAttr {
  key: string;
  fa: string;
  en: string;
  type: "enum" | "text";
  options?: CategoryAttrOption[];
  /** اگر true باشد، کاربر در فرم ثبت دستی موظف است این ویژگی را پر کند.
   *  کالاهای فله‌ای مثل سیب یا برنج ممکن است برند نداشته باشند ولی
   *  نوع/رنگ/درجه باید حتماً مشخص شود تا کالای مرجع قابل شناسایی باشد. */
  required?: boolean;
}

export interface CategoryNodeDto {
  id: string;
  slug: string;
  nameFa: string;
  nameEn: string;
  /** GS1 GPC Brick code — for global barcode matching */
  gs1GpcCode?: string | null;
  /** HS Code — for customs/tariffs in cross-border matching */
  hsCode?: string | null;
  attrs?: CategoryAttr[] | null;
  /** default wholesale unit of the leaf (KILOGRAM | TON | …) — prefills new goods */
  unit?: string | null;
  children: CategoryNodeDto[];
}

export interface GoodDto {
  id: string;
  nameFa: string;
  nameEn: string | null;
  aliases: string[];
  unit: string;
  category: {
    id: string;
    slug: string;
    nameFa: string;
    nameEn: string;
    attrs?: CategoryAttr[] | null;
  };
}

export interface BrandDto {
  id: string;
  name: string;
}

export interface PageDto<T> {
  items: T[];
  nextCursor: string | null;
}

/**
 * یک ردیف انتخابگر کاتالوگ مرجع — SKU مشترک (برند×وزن) که همه‌ی هم‌فروشنده‌ها
 * به آن وصل‌اند. sellers = اعتماد («۳ فروشنده»)، mineMode = «داریش».
 */
export interface ProductRowDto {
  id: string;
  label: string;
  barcode: string | null;
  /** عکس مرجع محصول — اختیاری. در picker نشان داده می‌شود. */
  imageUrl: string | null;
  status: string;
  goodId: string;
  good: {
    id: string;
    nameFa: string;
    nameEn: string | null;
    unit: string;
    category: { id: string; slug: string; nameFa: string; nameEn: string };
  };
  brand: { id: string; name: string } | null;
  sellers: number;
  mineMode: string | null;
}

/** یک چیپ برند در نوار برند افقی انتخابگر — نام + شمارش محصول‌های آن برند */
export interface BrandChipDto {
  id: string;
  name: string;
  count: number;
}

/** یک چیپ دسته در نوار دسته — نام + شمارش محصول‌های آن دسته */
export interface CategoryChipDto {
  id: string;
  nameFa: string;
  nameEn: string;
  count: number;
}

/**
 * صفحه‌ی انتخابگر — items + نوار برند + نوار دسته. برندها و دسته‌ها از همان
 * scope فعلی (q + categoryId + goodId) استخراج می‌شوند، مگر بعد از انتخاب برند/
 * دسته — تا نوار ثابت بماند و کاربر بتواند بین برندها/دسته‌ها جابجا شود.
 */
export interface ProductPageDto {
  items: ProductRowDto[];
  nextCursor: string | null;
  total: number;
  brands: BrandChipDto[];
  categories: CategoryChipDto[];
}

/** پیش‌نمایش ایمپورت — ردیف‌های طبقه‌بندی‌شده، بدون هیچ نوشتنی */
export interface ImportPreviewDto {
  summary: {
    total: number;
    matched: number;
    goodLevel: number;
    newGood: number;
    willSkip: number;
    withImage: number;
  };
  rows: {
    index: number;
    name: string;
    brand: string | null;
    spec: string | null;
    priceMinor: number | null;
    stock: number | null;
    minOrder: number | null;
    volume: number | null;
    hasImage?: string;
    /** هر ردیف از محتوایش بازو می‌گیرد — قیمت → فروش، حجم → خرید، هر دو → BOTH */
    arms: ("SELL" | "BUY")[];
    matchType: "product" | "good" | "new";
    goodId: string | null;
    goodName: string | null;
    goodUnit: string | null;
    productId: string | null;
    productLabel: string | null;
    sellers: number;
    mineMode: string | null;
    warning: "noData" | "noName" | null;
    category: string | null;
    subcategory: string | null;
  }[];
}

export interface ImportCommitResultDto {
  saved: number;
  failed: number;
  skipped: { index: number; reason: string }[];
  /** شناسه‌ی listingهای ساخته‌شده — برای آپلود عکس بعد از commit */
  listingIds: string[];
}

export interface GoodItemDto {
  id: string;
  mode: string;
  /** مشخص‌کننده‌ی واریانت سمت سرور («weight=500g») — "" = بدون واریانت */
  variantKey?: string;
  /** برچسب خوانای واریانت («۵۰۰ گرمی · کارتن») */
  variantLabel?: string | null;
  // ── M2 — فیلدهای v2 (قرارداد واحد-قیمت + متن شخصی + اعتبار) ──
  /** C5 — تعداد واحد پایه در این ردیف («کیسهٔ ۵۰ کیلویی» → 50)؛ null = فله */
  baseQty?: number | null;
  /** C1 — قیمت هر واحد پایه (سروری: priceMinor ÷ baseQty؛ فله = خودِ قیمت) */
  pricePerBaseMinor?: number | null;
  /** مدل واحد (۱۰۲۶) — بستهٔ انتخابی ردیف: [{label: «کیسهٔ ۵۰ کیلویی», qty: 50}]؛ خالی/ null = فله */
  packaging?: { label: string; qty: number }[] | null;
  /** C6 — عنوان شخصی ردیف در ویترین من؛ جدا از نام مرجع Good */
  title?: string | null;
  /** C2 — توضیح کوتاه فروشنده زیر ردیف */
  note?: string | null;
  /** G7 — مهر آخرین قیمت‌گذاری؛ مبنای بج «قیمت منقضی» */
  pricedAt?: string | null;
  /** FD-9 — اعتبار قیمتِ همین ردیف (۱..۵ روز از فرم ۱۳/۱۴)؛ null = همان تنظیم کاتالوگ */
  priceValidDays?: number | null;
  /** G7/FD-52 — قیمت منقضی شده (فقط در خروجی‌های عمومی) */
  priceExpired?: boolean;
  priceMinor: number | null;
  currency: string | null;
  attrs?: Record<string, string> | null;
  stock: number | null;
  minOrder: number | null;
  volume: number | null;
  frequency: string | null;
  updatedAt?: string;
  /** فاز ۲ — ردیف غیرفعال (نمایش در «غیرفعال‌ها» کاتالوگ) */
  isActive?: boolean;
  /** فاز ۲ — بازدید پنجره ۳۰ روزه (شاخص کارت + «عملکرد ۳۰ روز») */
  viewCount30?: number;
  /** فاز ۲ — بازدید کل از پیدایش آگهی */
  viewCountTotal?: number;
  /** فاز ۳ — دسته‌ی شخصی کاتالوگ (id از Business.customCategories) */
  catalogCategoryId?: string | null;
  brand?: { id: string; name: string } | null;
  /** گالری آگهی — خوانده‌شده از سیستم فایل‌ها (خالی = بی‌عکس، کاشی حرفی) */
  gallery?: FileDto[];
  good: {
    id: string;
    nameFa: string;
    nameEn: string | null;
    unit: string;
    category: { slug: string; nameFa: string; nameEn: string };
  };
  /** عکس مرجع محصول — وقتی گالری آگهی خالی است، این عکس نشان داده می‌شود */
  product?: { imageUrl: string | null } | null;
}

/** فاز ۱۰ — رکورد رجیستری اصناف (فرم ثبت‌نام / ورودی هوشمند) */
export interface TradeDto {
  id: string;
  name: string;
  usageCount: number;
  isCore?: boolean;
}

export interface BusinessProfileDto {
  id: string;
  slug: string;
  name: string;
  activityType: string | null;
  /** فاز ۱۰ — صنف خریدار در نمای عمومی لیست خرید */
  trade?: string | null;
  city: string;
  country?: string;
  currency?: string;
  isVerified: boolean;
  isDemo: boolean;
  /** فاز ۱۳ — معرفی کوتاه فروشنده (زیر نامش در ویترین عمومی) */
  bio?: string | null;
  /** طرح ۸ (U61) — شمار ذخیره‌کنندگان کاتالوگ (عمومی و بی‌خطر) */
  saverCount?: number;
  /** صاحب کاتالوگ — ویترین اعتماد: در عمده‌فروشی طرف می‌خواهد بداند با چه کسی طرف است */
  owner?: {
    id: string;
    name: string;
    firstName: string | null;
    lastName: string | null;
    /** عکس پروفایل مالک (avatar) — فقط برای مالک/ادمین قابل ویرایش است */
    avatar?: { url: string; thumbUrl: string | null } | null;
  } | null;
  /** لوگوی کسب‌وکار — اسلات «logo» جدول فایل‌ها (null = کاشی حرفی) */
  logo?: { url: string; thumbUrl: string | null } | null;
  /** لوکیشن دقیق — فقط مالک می‌بیند */
  lat?: number | null;
  lng?: number | null;
  /** آدرس متنی — قابل ویرایش */
  address?: string | null;
  /** فاز ۳ — دسته‌های شخصی ویترین برای چیپ‌های کاتالوگ عمومی */
  customCategories?: CatalogCategoryDto[] | null;
  listings: GoodItemDto[];
}

/** یک ردیف اکسپلور — کالای یک کسب‌وکارِ دیگر، آماده برای چیدمان شهر/حجم */
export interface ExploreItemDto {
  id: string;
  mode: string;
  priceMinor: number | null;
  currency: string | null;
  stock: number | null;
  minOrder: number | null;
  volume: number | null;
  frequency: string | null;
  updatedAt: string;
  /** گالری آگهی — اولین عکس روی کارت‌های بازار دیده می‌شود (خواسته‌ی کاربر) */
  gallery?: FileDto[];
  good: {
    id: string;
    nameFa: string;
    nameEn: string | null;
    unit: string;
    category: { slug: string; nameFa: string; nameEn: string };
  };
  business: {
    id: string;
    slug: string;
    name: string;
    city: string;
    isVerified: boolean;
    activityType: string | null;
  };
}

/** ردیف شخصی‌سازی‌شده بازار — همان شکل اکسپلور با امتیاز تطبیق */
export type MarketItemDto = ExploreItemDto & { score: number };

export interface SellerDto {
  id: string;
  slug: string;
  name: string;
  city: string;
  isVerified: boolean;
}

export interface OfferDto {
  id: string;
  priceMinor: number;
  currency: string;
  minOrder: number;
  score: number;
  isSpecial: boolean;
  note: string | null;
  /** فاز ۴ مهاجرت (sc-quote) — شرایط پرداخت + زمان تحویل از چیپ‌های فرم */
  payTerm?: string | null;
  delivTerm?: string | null;
  /** فاز ۴ مهاجرت (sheet-offer-status) — نشان خصوصی خریدار: INTERESTED | CONTACTED | REVIEWED | null */
  status?: string | null;
  createdAt: string;
  listing: {
    id: string;
    priceMinor: number | null;
    currency: string | null;
    minOrder: number | null;
    good: {
      id: string;
      nameFa: string;
      nameEn: string | null;
      unit: string;
      category: { slug: string; nameFa: string; nameEn: string };
    };
  };
  seller: SellerDto;
}

export interface InquiryDto {
  id: string;
  volume: number;
  note: string | null;
  /* ── M4 (FD-24) — چندقلمی ── */
  /** اقلامِ «این فروشنده» (حریم سبد خریدار) با قیمت/بستهٔ آگهی خودش */
  items?: Array<{
    goodId: string;
    qty: number;
    listingId: string | null;
    listing: {
      id: string;
      priceMinor: number | null;
      currency: string | null;
      variantLabel: string | null;
      baseQty: number | null;
      packaging: { label: string; qty: number }[] | null;
      pricePerBaseMinor: number | null;
    } | null;
    good: { id: string; nameFa: string; nameEn: string | null; unit: string } | null;
  }>;
  /** n کل قلم‌های استعلام (بج «k از n قلم») */
  itemsTotal?: number;
  /** k = قلم‌هایی که این فروشنده دارد */
  myCover?: number;
  /** روزهای باقی‌ماندهٔ مهلت (null = بدون مهلت) */
  daysLeft?: number | null;
  /** CLOSED | STOPPED | EXPIRED (lazy) | ANSWERED | NEW | ARCHIVED */
  displayStatus?: string;
  expiresAt?: string | null;
  stoppedAt?: string | null;
  closedAt?: string | null;
  resultText?: string | null;
  /** فاز ۴ — تناوب خرید خریدار (WEEKLY | BIWEEKLY | MONTHLY | OCCASIONAL — M3: دوهفتگی) */
  frequency: string | null;
  /** فاز ۴ — انتظار تحویل خریدار («این ماه»، …) */
  delivery: string | null;
  /** فاز ۴ مهاجرت — محل تحویل + قیمت هدف + کلید گروه استعلام */
  deliveryCity?: string | null;
  targetPriceMinor?: number | null;
  rfqGroupId?: string | null;
  status: string;
  isRead: boolean;
  createdAt: string;
  listing: {
    id: string;
    priceMinor: number | null;
    currency: string | null;
    variantLabel: string | null;
    good: {
      id: string;
      nameFa: string;
      nameEn: string | null;
      unit: string;
      category: { slug: string; nameFa: string; nameEn: string };
    };
  };
  buyer: InquiryBuyerDto;
}

/** خریدارِ درخواست — تماس و صنف برای صفحه جزئیات (طرح ۰۶) */
export interface InquiryBuyerDto extends SellerDto {
  trade: string | null;
  activityType: string | null;
  phone: string | null;
}

export interface InquiryPageDto extends PageDto<InquiryDto> {
  unreadCount: number;
}

// ═══ فاز ۵ — دنبال‌کردن قیمت + لیست خرید (طرح ۰۸) ═══

/** فروشنده‌ی ارزان‌ترین ردیفِ تابلوی تأمین یک کالای دنبال‌شده */
export interface CheapestSupplierDto {
  listingId: string;
  priceMinor: number;
  currency: string | null;
  minOrder: number | null;
  variantLabel: string | null;
  seller: SellerDto;
}

/** ردیف لیست خرید — WatchedGood ∪ BUY listing با خلاصه‌ی تابلوی تأمین */
export interface WatchedRowDto {
  goodId: string;
  good: {
    id: string;
    nameFa: string;
    nameEn: string | null;
    unit: string;
    category: { slug: string; nameFa: string; nameEn: string };
  } | null;
  buyListingId: string | null;
  volume: number | null;
  frequency: string | null;
  variantLabel: string | null;
  watched: boolean;
  watchedAt: string | null;
  lastNotifiedAt: string | null;
  /** فاز ۱۲ — آرشیو موقت: non-null یعنی ردیف آرشیوست (رصد می‌ماند) */
  archivedAt: string | null;
  /** M3 مهاجرت — پرچم «در حال اتمام موجودی» (۲۰ج) */
  lowStock: boolean;
  supplierCount: number;
  cheapest: CheapestSupplierDto | null;
  /** درصد تغییر ارزان‌ترین قیمت در ۷ روز — منفی یعنی ارزان‌تر */
  trendPct: number | null;
  /** آیا این هفته قیمتی در تابلوی همان کالا عوض شده؟ (چیپ «تغییر قیمت») */
  priceChanged: boolean;
}

/** «درخواست‌های من» (سمت خریدار) + آخرین پیشنهادِ دریافتی */
export interface MyInquiryDto extends InquiryDto {
  seller: InquiryBuyerDto;
  offer: {
    id: string;
    priceMinor: number;
    currency: string;
    minOrder: number;
    note: string | null;
    createdAt: string;
  } | null;
}

export interface MyInquiriesDto {
  rows: MyInquiryDto[];
  answeredCount: number;
}

export interface FollowDto {
  supplierId: string;
  createdAt: string;
  /** این دنبال کردن از لینک دعوت/کاتالوگ به وجود آمده */
  viaRef?: boolean;
  /**
   * mine → خودم انتخابش کرده‌ام (فالوی کاتالوگش) ·
   * theirs → از بازار خریدارها، میز خرید مرا فالو کرده («خودش آمد»)
   */
  origin?: "mine" | "theirs";
  supplier: SellerDto;
}

/** یک کسب‌وکار در لیست «مشتریان من» — غنی‌شده با آخرین درخواست خرید فعال */
export interface CustomerRowDto {
  id: string;
  slug: string;
  name: string;
  city: string;
  isVerified: boolean;
  followedAt: string;
  /** از طریق لینک دعوت/کاتالوگ صاحب لیست ثبت‌نام کرده */
  viaRef: boolean;
  /** طرح ۸ (U60) — منبعِ رسیدن: ORGANIC | SHARED | PROMO */
  source?: "ORGANIC" | "SHARED" | "PROMO";
  /** فاز ۵ مهاجرت — نوع مشتری از دید فروشنده: PASSING | PARTNER | CONTRACT */
  custType?: "PASSING" | "PARTNER" | "CONTRACT";
  /** M6 — صنف مشتری (فیلتر «صنف» دفتر مشتری ۰۸) */
  trade?: string | null;
  /** M6 — یادداشت شخصی فروشنده روی این مشتری */
  note?: string | null;
  /** M6 (FD-44/45) — مهر تایید مشتری جدید؛ null = «جدید» بالای دفتر */
  ackAt?: string | null;
  /** M6 — مشتری تاییدنشده (برچسب «جدید» + دکمه‌های تایید/حذف) */
  isNew?: boolean;
  /** M6 — شمار سفارش/استعلام همین مشتری نزد من (سبک و تجمعی) */
  orderCount?: number;
  inquiryCount?: number;
  /** آخرین درخواست خرید فعال (لیستینگ BUY/BOTH با حجم) — null یعنی درخواست فعالی ندارد */
  latestRequest: {
    volume: number;
    frequency: string | null;
    updatedAt: string;
    good: { nameFa: string; nameEn: string | null; unit: string };
  } | null;
}

/** M6 — نمای جزئیات مشتری (۰۸ب): شناسنامه + ۲۰ سفارش/استعلام او */
export interface CustomerViewDto {
  customer: CustomerRowDto & {
    ownerName: string | null;
    source: "ORGANIC" | "SHARED" | "PROMO";
    custType: "PASSING" | "PARTNER" | "CONTRACT";
  };
  orders: {
    id: string;
    docNo: number | null;
    status: string;
    createdAt: string;
    itemCount: number;
    totalMinor: number;
  }[];
  inquiries: {
    id: string;
    status: string;
    createdAt: string;
    itemCount: number;
    firstName: string | null;
  }[];
}

// ═══ فاز ۶ — تابلوی تأمین + فرم درخواست قیمت (طرح ۰۹/۱۲) ═══

/** ردیف تابلوی تأمین — یک آگهیِ فروشِ فعال از یک تأمین‌کننده */
export interface BoardSupplierDto {
  listingId: string;
  priceMinor: number;
  currency: string | null;
  minOrder: number | null;
  stock: number | null;
  variantLabel: string | null;
  updatedAt: string;
  seller: SellerDto & { trade?: string | null };
  /** قیمت قبل از آخرین تغییر — سوژه‌ی «▼ از ۲٬۹۰۰٬۰۰۰» (null = بدون تغییر) */
  prevMinor: number | null;
  /** درصد تغییر نسبت به قیمت قبلی — منفی یعنی ارزان‌تر */
  trendPct: number | null;
  /** «دنبال می‌کنم» — کاتالوگش را از میز خرید من فالو کرده‌ام */
  followedByMe: boolean;
  /** «از او خریده‌ام» — سابقه استعلام بین ما روی همین کالا */
  boughtFrom: boolean;
  /** «معرفی iMach» — فلگ آینده؛ فعلاً همیشه false (ساختار UI طرح ۰۹) */
  sponsored: boolean;
}

/** تابلوی تأمین یک کالا + زمینه‌ی خریدار (پیش‌فرض‌های فرم ۱۲) */
export interface SupplyBoardDto {
  good: {
    id: string;
    nameFa: string;
    nameEn: string | null;
    unit: string;
    category: { slug: string; nameFa: string; nameEn: string } | null;
  } | null;
  watched: boolean;
  volume: number | null;
  frequency: string | null;
  variantLabel: string | null;
  /** فاز ۱۲ — شیت «ویرایش نیاز خرید»: ردیف فیزیکی BUY + حالت واقعی +
   *  spec فروش (فقط وقتی BOTH است تا ویرایش سمت فروش را نکند) */
  buyListingId: string | null;
  buyMode: "BUY" | "BOTH" | null;
  buySell: { priceMinor: number; currency: string | null; stock: number | null; minOrder: number | null } | null;
  rows: BoardSupplierDto[];
}

/** بدنه‌ی POST /market/requestQuote — فرم ۲۵ (M4 چندقلمی · FD-24)
 *  · items[] = سبد؛ خالی = مسیر تک‌قلمی legacy (goodId+volume از تابلو)
 *  · چندقلمی ⇒ گیرندگان = اجتماع دارندگان قلم‌ها (تیک قفلِ روشن) */
export interface RequestQuoteBody {
  businessId: string;
  /** M4 — سبد چندقلمی (۱..۸ قلم) */
  items?: { goodId: string; qty: number; listingId?: string }[];
  /** legacy تک‌قلمی */
  goodId?: string;
  volume?: number;
  frequency?: "WEEKLY" | "BIWEEKLY" | "MONTHLY" | "OCCASIONAL";
  delivery?: string;
  /** فاز ۴ مهاجرت (sc-rfq) — محل تحویل (پیش‌فرض شهر خریدار) */
  deliveryCity?: string;
  /** فاز ۴ مهاجرت (sc-rfq) — قیمت هدف اختیاری (ریال/Minor) */
  targetPriceMinor?: number;
  /** M4 — مهلت پاسخ ۱..۵ روز (پیش‌فرض ۳ — pills فرم ۲۵) */
  expiresDays?: number;
  note?: string;
  supplierIds?: string[];
  includeNetwork?: boolean;
}

export interface RequestQuoteResultDto {
  created: number;
  /** M4 — شناسهٔ گروه (کارت «پیشنهادها» ۲۶) */
  groupId: string | null;
  /** گیرنده‌هایی که از شبکه iMach اضافه شدند (نه انتخاب من) */
  networkAdded: number;
  inquiries: { id: string; sellerId: string; status: string }[];
}

// ═══ فاز ۴ مهاجرت — حلقهٔ RFQ: پیشنهادهای گروهی + وضعیت + زمینهٔ فرم پاسخ ═══

/** پیشنهادِ داخل یک گروه استعلام (sc-offers) — M4 چندقلمی (FD-24):
 *  prices[] هم‌ترتیب با اقلام گروه (null = ندارد) + cover/totalMinor
 *  محاسبه‌شدهٔ سروری + شرایط ساختاریافتهٔ pay/dlv (بازتاب فرم ۱۲). */
export interface RfqOfferDto {
  id: string;
  sellerId: string;
  listingId: string;
  seller: SellerDto & { phone?: string | null };
  /** قیمت قلم اول (legacy) — نمایشِ تک‌قلمی */
  priceMinor: number;
  currency: string;
  minOrder: number;
  payTerm: string | null;
  delivTerm: string | null;
  /** M4 — {chk: ۰..۹۹, days} · chk=0 یعنی تمام‌نقدی */
  pay: { chk: number; days: number } | null;
  /** M4 — {ship, by: "seller"|"customer"} · ship=false حضوری */
  dlv: { ship: boolean; by: "seller" | "customer" } | null;
  /** M4 — قیمت هر قلم (null = این قلم را ندارد) */
  prices: Array<number | null>;
  /** M4 — شمار قلم‌های قیمت‌خورده (بج «k از n قلم») */
  cover: number;
  /** M4 — Σ قیمت×مقدار (مرتب‌سازی ۲۶: اول پوشش، بعد جمع) */
  totalMinor: number;
  note: string | null;
  /** نشان خصوصی خریدار: INTERESTED | CONTACTED | REVIEWED | null */
  status: string | null;
  createdAt: string;
}

/** قلم استعلام گروه (سبد خریدار — بدون حریم) */
export interface RfqItemDto {
  goodId: string;
  qty: number;
  good: {
    id: string;
    nameFa: string;
    nameEn: string | null;
    unit: string;
    category?: { slug: string; nameFa: string } | null;
  } | null;
}

/** یک استعلام گروهی (کارت «پیشنهادها») — چند Inquiry با rfqGroupId مشترک */
export interface RfqGroupDto {
  /** rfqGroupId · legacy: inquiry.id · پیشنهاد سرد: c+offerId */
  id: string;
  kind: "RFQ" | "COLD";
  createdAt: string;
  /** M4 — سبد کامل استعلام */
  items: RfqItemDto[];
  volume: number | null;
  frequency: string | null;
  delivery: string | null;
  deliveryCity: string | null;
  targetPriceMinor: number | null;
  note: string | null;
  /** M4 — چرخهٔ سرورمبنا */
  expiresAt: string | null;
  stoppedAt: string | null;
  closedAt: string | null;
  resultText: string | null;
  /** M4 — OPEN | STOPPED | CLOSED | EXPIRED | COLD (lazy از سرور) */
  status: string;
  /** M4 — روزهای باقی‌ماندهٔ مهلت (null = بدون مهلت) */
  daysLeft: number | null;
  /** M4 — قلم اول (legacy تک‌قلمی برای سازگاری) */
  good: RfqItemDto["good"];
  recipients: Array<{
    inquiryId: string;
    sellerId: string;
    status: string;
    /** M4 — پوشش این گیرنده: «k از n قلم» */
    coverage: number;
    answered: boolean;
    seller: SellerDto;
  }>;
  offers: RfqOfferDto[];
  offerCount: number;
  markedCount: number;
  minPriceMinor: number | null;
}

export interface MyRfqsDto {
  groups: RfqGroupDto[];
  /** پیشنهادهای ۷۲ ساعت گذشته — بج/سلام صفحهٔ پیشنهادها */
  recentOfferCount: number;
}

/** زمینهٔ فرم «پاسخ با قیمت» (sc-quote) */
export interface QuoteContextDto {
  kind: "INQUIRY" | "BUY_LISTING";
  inquiryId: string | null;
  buyListingId: string | null;
  buyer: SellerDto & {
    trade: string | null;
    memberSince: string;
  };
  good: { id: string; nameFa: string; nameEn: string | null; unit: string };
  volume: number;
  frequency: string | null;
  delivery: string | null;
  deliveryCity: string | null;
  targetPriceMinor: number | null;
  note: string | null;
  deadlineAt: string | null;
  /** INQUIRY: قبلاً پاسخ داده‌ای؟ · BUY_LISTING: null */
  answered: boolean | null;
  /* ── M4 (FD-24) — فرم ۱۲ چندقلمی ── */
  /** اقلام استعلام با آگهی/قیمتِ خودم برای هر قلم («کاتالوک تو: X») */
  items?: Array<{
    goodId: string;
    qty: number;
    /** این قلم در کاتالوک من هست؟ (بج + فیلد فعال) */
    mine: boolean;
    listing: {
      id: string;
      priceMinor: number | null;
      currency: string | null;
      variantLabel: string | null;
      minOrder: number | null;
      updatedAt: string;
    } | null;
    good: { id: string; nameFa: string; nameEn: string | null; unit: string } | null;
  }>;
  itemsTotal?: number;
  /** استعلام بسته/متوقف است؟ (پاسخ‌دادن ممنوع) */
  rfqClosed?: boolean;
  /** BUY_LISTING: من خریدار را گوش‌به‌زنگ دارم؟ (گیت معرف) · INQUIRY: null */
  watching: boolean | null;
  /** قیمت زندهٔ کاتالوگ خودم در همین کالا — null یعنی کالا در کاتالوگم نیست */
  myListing: {
    id: string;
    priceMinor: number | null;
    currency: string | null;
    variantLabel: string | null;
    minOrder: number | null;
    updatedAt: string;
  } | null;
}

// ═══ فاز ۷ — دایرکتوری تأمین‌کنندگان (طرح ۱۰) + پیشنهادها (طرح ۱۱) ═══

/** چیپ کالای مرتبط روی کارت تأمین‌کننده */
export interface DirectoryGoodChipDto {
  goodId: string;
  nameFa: string;
}

/** ردیف تب «مرتبط با من» — پیشنهاد موتور، گروه‌بندی بر حسب فروشنده */
export interface RelatedSupplierDto {
  supplierId: string;
  slug: string;
  name: string;
  city: string;
  isVerified: boolean;
  trade: string | null;
  goods: DirectoryGoodChipDto[];
  /** «N قیمت از این فروشنده در تابلوهای شماست» */
  priceCount: number;
  followedByMe: boolean;
  /** «از او خریده‌ام» — استعلام پاسخ‌داده‌شده */
  boughtFrom: boolean;
}

/** ردیف تب «دنبال‌شده» — شبکه‌ی فعلی من (mine + theirs) */
export interface FollowedSupplierDto extends Omit<RelatedSupplierDto, "followedByMe"> {
  /** mine → خودم فالو کرده‌ام · theirs → میز خریدم را فالو کرده («خودش آمد») */
  origin: "mine" | "theirs";
  viaRef: boolean;
  createdAt: string;
}

export interface SuppliersDirectoryDto {
  related: RelatedSupplierDto[];
  followed: FollowedSupplierDto[];
}

/** کارت «قیمت بهتر» (طرح ۱۱) — ارزان‌تر از بهترین قیمتِ شبکه‌ی فعلی من */
export interface BetterPriceDto {
  goodId: string;
  goodName: string;
  unit: string;
  listingId: string;
  priceMinor: number;
  currency: string | null;
  minOrder: number | null;
  stock: number | null;
  variantLabel: string | null;
  /** بهترین قیمتِ تأمین‌کننده‌های فعلی من برای همین کالا */
  boardBestMinor: number;
  /** درصد ارزان‌تر (مثبت) */
  pct: number;
  supplier: SellerDto & { trade?: string | null };
}

/** کارت «تأمین‌کننده جدید» (طرح ۱۱) — با حلقه‌ی امتیاز تطبیق */
export interface NewSupplierDto {
  supplier: SellerDto;
  /** ۰-۹۸ — سوژه‌ی MatchRing */
  score: number;
  goodId: string;
  goodName: string;
  unit: string;
  priceMinor: number;
  currency: string | null;
  minOrder: number;
  myVolume: number | null;
  proximity: "same-city" | "same-province" | "same-country" | "far";
}

/** کارت «جایگزین» (طرح ۱۱) — کالای هم‌دسته‌ی ارزان‌تر */
export interface AlternativeGoodDto {
  goodId: string;
  goodName: string;
  unit: string;
  variantLabel: string | null;
  listingId: string;
  priceMinor: number;
  currency: string | null;
  minOrder: number | null;
  supplier: SellerDto;
  /** کالای لیست من که این جایگزینِ آن است («مشابه برنج هاشمی») */
  watchedGoodId: string;
  watchedGoodName: string;
  proximity: "same-city" | "same-province" | "same-country" | "far";
}

export interface SuggestionsDto {
  /** M7 (§۴.۴) — قفلِ شبکهٔ باز: خریدارِ زیر آستانه پاسخ سبک می‌گیرد (خالی) */
  locked?: boolean;
  required?: number;
  score?: number;
  betterPrices: BetterPriceDto[];
  newSuppliers: NewSupplierDto[];
  alternatives: AlternativeGoodDto[];
}

/**
 * وضعیت گیتِ شبکهٔ باز (M7 §۴.۴) برای بازار خریدارها — یک فراخوان:
 * امتیاز دو بازو (گیت موتور تطبیق)، کالاهای فروشی (گیت کاتالوگ خالی)،
 * و فالو/پیشنهادهای قبلی من روی خریدارهای بازار.
 * (گیتِ ۱۰-معرفِ REFERRAL_TARGET بازنشسته شد — سند ۰۸ §M7.)
 */
export interface MarketStateDto {
  /** M7 — گیتِ شبکهٔ باز: امتیاز هر بازو + آستانه */
  open: {
    required: number;
    sell: { score: number; unlocked: boolean };
    buy: { score: number; unlocked: boolean };
  };
  /** تعداد کالاهای فروشی من — صفر یعنی بازار هنوز برای من باز نمی‌شود */
  sellCount: number;
  /** کالاهایی که واقعا می‌فروشم — پیشنهاد فقط برای این‌ها فعال است */
  sellGoodIds: string[];
  /** خریدارهایی که فالو کرده‌ام (SELL من → BUY او) */
  followedBuyerIds: string[];
  /** خریدارهایی که برایشان پیشنهاد داده‌ام */
  offeredBuyerIds: string[];
  /** ارز پیش‌فرض کسب‌وکار من — برای فرم پیشنهاد */
  currency?: string;
}

// ─── اندپوینت‌ها — نام‌گذاری اکشن‌محور، هم‌نام با کنترلرهای NestJS ───

// ─── فایل‌ها — یک جدول چندریختی برای هر عکسی که مدل‌ها لازم دارند ───

/** آیتم فایل از بک‌اند — url مستقیم ابر آروان است (بدون توکن لود می‌شود) */
export interface FileDto {
  id: string;
  fieldKey: string;
  url: string;
  thumbUrl: string | null;
  description: string | null;
  size: number;
  mimeType: string;
  createdAt: string;
}

/**
 * آپلود multipart با رویداد پیشرفت — fetch رویداد upload ندارد؛ XHR دارد.
 * همان قرارداد api() را پیاده می‌کند: BASE + XTransformPort، هدر زبان،
 * Bearer، و روی 401 یک رفرش ساکت + تلاش مجدد.
 *
 * فازها صادقانه‌اند (خواسته‌ی کاربر: درصدِ ۹۹ِ فوری «الکی» بود):
 *   • "sending"    — بایت‌ها در جریان است (تا سقف ۹۹)
 *   • "processing" — بایت‌ها تمام شده؛ سرور مشغول ذخیره در آروان + تامبنیل است.
 *                     زمانِ واقعی همین‌جاست و قبلاً دیده نمی‌شد.
 */
export type UploadPhase = "sending" | "processing";

function uploadWithProgress(opts: {
  file: File;
  model: "User" | "Business" | "Listing";
  modelId?: string;
  key: string;
  description?: string;
  replace?: boolean;
  onProgress?: (pct: number, phase: UploadPhase) => void;
  _retried?: boolean;
}): Promise<FileDto> {
  // همه‌ی پارامترهای معنادار در query string می‌روند — سمت سرور query بر
  // فیلد فرم مقدم است و هر دو مسیر پشتیبانی می‌شود.
  const form = new FormData();
  // فیلدها «قبل از» فایل append می‌شوند: بعضی سرورها فقط فیلدهای پیش از فایل
  // را می‌خوانند؛ ترتیبِ امن، ارزان و بی‌هزینه است.
  if (opts.modelId) form.append("modelId", opts.modelId);
  if (opts.description) form.append("description", opts.description);
  if (opts.replace !== undefined) form.append("replace", String(opts.replace));
  form.append("file", opts.file);

  return new Promise<FileDto>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(
      "POST",
      buildUrl("/files/upload", {
        model: opts.model,
        key: opts.key,
        ...(opts.modelId ? { modelId: opts.modelId } : {}),
        ...(opts.description ? { description: opts.description } : {}),
        ...(opts.replace !== undefined ? { replace: String(opts.replace) } : {}),
      })
    );
    xhr.withCredentials = true;
    xhr.responseType = "text";
    xhr.setRequestHeader("Accept-Language", readLocaleCookie());
    const token = getAccessToken();
    if (token) xhr.setRequestHeader("Authorization", `Bearer ${token}`);

    xhr.upload.onprogress = (e) => {
      if (!opts.onProgress || !e.lengthComputable) return;
      // ۹۹٪ سقفِ ارسال است — ۱۰۰ فقط وقتی پاسخ سرور واقعا آمد
      const pct = Math.min(99, Math.round((e.loaded / e.total) * 100));
      // بایت‌ها تمام شد؟ فاز پردازشِ سمت سرور شروع می‌شود (آروان + تامبنیل)
      const phase: UploadPhase = e.loaded >= e.total ? "processing" : "sending";
      opts.onProgress(pct, phase);
    };

    xhr.onload = async () => {
      if (xhr.status === 401 && !opts._retried) {
        const fresh = await silentRefresh();
        if (fresh) {
          try {
            resolve(await uploadWithProgress({ ...opts, _retried: true }));
          } catch (err) {
            reject(err);
          }
          return;
        }
      }
      let data: { error?: string; message?: string } | null = null;
      try {
        data = JSON.parse(xhr.responseText) as { error?: string; message?: string };
      } catch {
        /* non-JSON error body */
      }
      if (xhr.status >= 200 && xhr.status < 300 && data) {
        opts.onProgress?.(100, "processing");
        resolve(data as FileDto);
      } else {
        reject(
          new ApiError(xhr.status, data?.error ?? "HTTP_ERROR", data?.message ?? `خطای ${xhr.status}`)
        );
      }
    };
    xhr.onerror = () => reject(new ApiError(0, "NETWORK_ERROR", "خطای شبکه در آپلود فایل"));
    xhr.send(form);
  });
}

export const filesApi = {
  /**
   * آپلود multipart — مدل و اسلات (کلید) از سمت کلاینت می‌آید:
   * model = User | Business | Listing · key = avatar | logo | gallery | …
   * replace=true (پیش‌فرض) اسلات تک‌فایلی است: بعد از موفقیتِ آپلود، قبلی‌ها
   * سمت سرور پاک می‌شوند — اولی آپلود شود، تمام که شد قبلی حذف شود.
   *
   * زیرِ hood یک XHR است نه fetch — فقط XHR رویداد upload.onprogress دارد تا
   * درصد پیشرفت هر عکس زنده نمایش داده شود (خواسته‌ی کاربر).
   */
  upload: (opts: {
    file: File;
    model: "User" | "Business" | "Listing";
    modelId?: string;
    key: string;
    description?: string;
    replace?: boolean;
    /** درصد ۰–۱۰۰ + فاز (sending = بایت‌ها، processing = کارِ سرور) حین آپلود */
    onProgress?: (pct: number, phase: UploadPhase) => void;
  }) => uploadWithProgress(opts),
  /** خواندن عمومی یک اسلات — آخرین رکورد؛ ۴۰۴ = هنوز عکسی نیست */
  getUrl: (model: "User" | "Business" | "Listing", modelId: string, key: string) =>
    api<FileDto>("/files/getUrl", { params: { model, modelId, key }, auth: false }),
  /** حذف — از ابر و دیتابیس؛ فقط مالک یا مالک کسب‌وکار/آگهی */
  remove: (id: string) => api<{ ok: boolean }>(`/files/delete/${encodeURIComponent(id)}`, { method: "DELETE" }),
};

export const authApi = {
  loginUser: (body: { phone: string; password: string; country?: string }) =>
    api<AuthResponseDto>("/auth/loginUser", { method: "POST", body, auth: false }),
  /** گام ۱ ثبت‌نام — تک‌بررسیِ غیرهمگام که کلاینت از عهده‌اش برنمی‌آید */
  checkPhone: (body: { phone: string; country?: string }) =>
    api<{ available: boolean; hasPassword: boolean }>("/auth/checkPhone", { method: "POST", body, auth: false }),
  registerUser: (body: {
    firstName: string;
    lastName: string;
    phone: string;
    password: string;
    country?: string;
    language?: string;
    ref?: string;
  }) =>
    api<AuthResponseDto>("/auth/registerUser", { method: "POST", body, auth: false }),
  /** ثبت‌نام سریع — فقط موبایل، بدون پسورد/نام. Business خودکار ساخته می‌شود. */
  quickRegister: (body: { phone: string; country?: string; language?: string; ref?: string }) =>
    api<AuthResponseDto>("/auth/quickRegister", { method: "POST", body, auth: false }),
  /** تنظیم پسورد — برای کاربران ثبت‌نام سریع یا تغییر پسورد */
  setPassword: (body: { currentPassword?: string; newPassword: string }) =>
    api<{ ok: boolean }>("/auth/setPassword", { method: "POST", body }),
  refreshSession: () => api<AuthResponseDto>("/auth/refreshSession", { method: "POST", auth: false }),
  logoutUser: () => api<{ ok: boolean }>("/auth/logoutUser", { method: "POST" }),
  /** فاز ۶ — من: کسب‌وکارها + ترجیحات نمایش (sync کراس-دستگاهی تم/رنگ) */
  getMe: () =>
    api<{ user: UserDto; businesses: BusinessSummaryDto[]; avatar: { url: string; thumbUrl: string | null } | null; prefs: UserPrefsDto }>("/auth/getMe"),
  /** ویرایش پروفایل — نام و نام خانوادگی مالک (در ویترین کاتالوگ نشان داده می‌شود) */
  editProfile: (body: { firstName?: string; lastName?: string; businessRole?: string }) =>
    api<{ user: UserDto }>("/auth/editProfile", { method: "POST", body }),
  /** فاز ۱۰ — حذف حساب توسط خود کاربر (بازگشت از ثبت‌نام / شروع دوباره) */
  deleteMe: () => api<{ ok: boolean }>("/auth/deleteMe", { method: "POST" }),
};

export const goodsApi = {
  /** جستجوی کالای مرجع (fa/en/alias) یا مرور با categoryId */
  getGoods: (params: { q?: string; categoryId?: string; cursor?: string; limit?: number }) =>
    api<PageDto<GoodDto>>("/goods/getGoods", { params, auth: false }),
  /** درخت کامل دسته‌بندی‌ها */
  getCategories: () => api<CategoryNodeDto[]>("/goods/getCategories", { auth: false }),
  /** پیشنهاد برند برای فرم ثبت کالا — M4-prep: limit برای شیت انتخاب برند (پیش‌فرض سرور ۱۰) */
  getBrands: (q?: string, limit?: number) =>
    api<BrandDto[]>("/goods/getBrands", { params: { q, limit }, auth: false }),
  /** JSON مرجع کاتالوگ برای پرامپت هوش مصنوعی — گودها + برندها + دسته‌ها */
  getCatalogReference: () => api<CatalogReferenceDto>("/goods/getCatalogReference", { auth: false }),
  /** ثبت کالای مرجع جدید وقتی جستجو نتیجه‌ای نداشت */
  // categoryId اختیاری — وقتی ندهند بک‌اند خودکار در سبد «سایر › جدید» پارک می‌کند
  createGood: (body: { name: string; categoryId?: string; nameEn?: string; aliases?: string[]; unit?: string }) =>
    api<GoodDto>("/goods/createGood", { method: "POST", body }),
};

/** JSON مرجع کاتالوگ — برای دادن به هوش مصنوعی در ایمپورت */
export interface CatalogReferenceDto {
  categories: CatalogReferenceCategoryDto[];
  brands: string[];
  totalGoods: number;
  totalBrands: number;
}

export interface CatalogReferenceCategoryDto {
  name: string;
  slug: string;
  goods: { name: string; aliases: string[]; unit: string }[];
  children: CatalogReferenceCategoryDto[];
}

// ─── Units — multilingual units with packaging hierarchy ──────────────────

export interface UnitDto {
  id: string;
  key: string;
  nameFa: string;
  nameEn: string;
  /** فاز ۸ — نام عربی (null = fallback انگلیسی) */
  nameAr?: string | null;
  /** null = base unit (عدد، کیلو، متر) | non-null = packaging unit referencing a base unit */
  baseUnitKey: string | null;
  /** how many base units in this packaging? null = product-dependent */
  containsQty: number | null;
  /** true = count is fixed (SACK50 always = 50kg) | false = user can override */
  qtyIsFixed: boolean;
  scope: string | null;
  isActive: boolean;
}

export const unitsApi = {
  list: () => api<UnitDto[]>("/units/list", { auth: false }),
  /** مدل واحد (۱۰۲۶): بستهٔ شخصی کاربر مثل برند عمومی می‌شود — find-or-create
   *  روی جدول Unit تا کاربران بعدی از لیست انتخاب کنند (idempotent). */
  ensure: (body: { nameFa: string; baseUnitKey: string; containsQty: number }) =>
    api<UnitDto>("/units/ensure", { method: "POST", body }),
  create: (body: {
    key: string;
    nameFa: string;
    nameEn: string;
    baseUnitKey?: string | null;
    containsQty?: number | null;
    qtyIsFixed?: boolean;
    scope?: string | null;
  }) => api<UnitDto>("/units/create", { method: "POST", body }),
  update: (body: {
    id: string;
    nameFa?: string;
    nameEn?: string;
    baseUnitKey?: string | null;
    containsQty?: number | null;
    qtyIsFixed?: boolean;
    scope?: string | null;
    isActive?: boolean;
  }) => api<UnitDto>("/units/update", { method: "POST", body }),
};

export const businessesApi = {
  getMyBusinesses: () => api<(BusinessSummaryDto & { _count: { listings: number } })[]>("/businesses/getMyBusinesses"),
  /** فاز ۱۰ — رجیستری اصناف برای چیپ‌های ثبت‌نام (هسته‌ای‌ها اول) */
  getTrades: () =>
    api<TradeDto[]>("/businesses/getTrades", { auth: false }),
  /** فاز ۱۰ — تایپ‌آهد ورودی هوشمند صنف («سایر») */
  searchTrades: (q: string) =>
    api<TradeDto[]>(`/businesses/searchTrades?q=${encodeURIComponent(q)}`, { auth: false }),
  createBusiness: (body: { name: string; city: string; trade?: string; intent?: "sell" | "buy" | "both" }) =>
    api<BusinessSummaryDto & { slug: string }>("/businesses/createBusiness", { method: "POST", body }),
  editBusiness: (id: string, body: {
    name?: string;
    city?: string;
    activityType?: string | null;
    trade?: string | null;
    phone?: string | null;
    hours?: string | null;
    defaultPayTerm?: string | null;
    /** فاز ۱۳ — معرفی کوتاه فروشنده؛ null = پاک کردن */
    bio?: string | null;
    /** فیکس‌بچ M3 — تیک عدم نمایش دسته‌بندی چیپ‌های کاتالوک خود */
    catalogCategoriesHidden?: boolean;
    /** M5 (FD-37) — شمارهٔ مالیاتی فروشنده روی فاکتور چاپ می‌شود */
    invoiceTaxId?: string | null;
    /** M5 (FD-37) — یادداشت ثابت فاکتور (پانوشت چاپی) */
    invoiceNote?: string | null;
  }) => api<BusinessSummaryDto>(`/businesses/editBusiness/${id}`, { method: "PATCH", body }),
  getBusiness: (slug: string) => api<BusinessProfileDto>(`/businesses/getBusiness/${slug}`, { auth: false }),
  /** فاز ۳ (طرح ۰۱) — دسته‌های شخصی کاتالوگ: کل لیست یکجا replace می‌شود
   *  (ایجاد/تغییرنام/حذف/مرتب‌سازی idempotent)؛ حذف دسته آگهی‌هایش را بی‌دسته می‌کند */
  setCatalogCategories: (id: string, categories: CatalogCategoryDto[]) =>
    api<BusinessSummaryDto>(`/businesses/catalogCategories/${id}`, {
      method: "PUT",
      body: { categories },
    }),
  /** M2 (اسکرین ۳۶) — تنظیمات کاتالوگ: دید قیمت بر اساس صنف + اعتبار قیمت.
   *  [] و null هر دو = همه قیمت می‌بینند؛ undefined = بی‌تغییر. */
  setCatalogSettings: (
    id: string,
    body: { priceVisibilityTrades?: string[] | null; priceValidityDays?: number | null }
  ) =>
    api<{ id: string; slug: string; priceVisibilityTrades: string[] | null; priceValidityDays: number | null }>(
      `/businesses/catalogSettings/${id}`,
      { method: "PUT", body }
    ),
  /** M3 مهاجرت (sheet-buycond) — شرایط درخواست تامین خریدار؛ خالی = پاک */
  setSupplyTerms: (id: string, supplyTerms: string | null) =>
    api<{ id: string; slug: string; supplyTerms: string | null }>(
      `/businesses/supplyTerms/${id}`,
      { method: "PUT", body: { supplyTerms } }
    ),
  /** فاز ۸ (طرح ۱۴) — تنظیمات اعلان از پروفایل؛ ذخیره‌ی ادغامی: فقط کلیدهای
   *  ارسال‌شده عوض می‌شوند. پاسخ = prefs کامل پس از ذخیره. */
  setNotifPrefs: (id: string, body: Partial<NotifPrefsDto>) =>
    api<NotifPrefsDto>(`/businesses/setNotifPrefs/${id}`, { method: "PUT", body }),
  /** فاز ۹ (شکاف ۶) — خاموش/روشن کردن دستیارها از پروفایل؛ merge سمت سرور */
  setArms: (id: string, body: Partial<EnabledArmsDto>) =>
    api<EnabledArmsDto>(`/businesses/setArms/${id}`, { method: "PUT", body }),
  /** گیت ویروسی تماس: شماره فقط به کاربر واردشده داده می‌شود */
  getContact: (slug: string) => api<{ phone: string | null; name: string }>(`/businesses/getContact/${slug}`),
  /** M6 — نمای عمومی لیست خرید (۳۲): دو لیست + آمار + شرایط + زمینهٔ بیننده */
  getBuyList: (slug: string) => api<PublicBuyListDto>(`/businesses/getBuyList/${encodeURIComponent(slug)}`),
  /** M6 — زمینهٔ بینندهٔ کاتالوک عمومی (۳۱): گیت قیمت + «در لیست خرید شما» */
  getBusinessContext: (slug: string) =>
    api<BusinessContextDto>(`/businesses/getBusinessContext/${encodeURIComponent(slug)}`),
  /** کپی از هم‌صنف‌ها — گام ۱: کاتالوگ‌های زنده بر اساس صنف/نام */
  searchCatalogs: (params: { q?: string; cursor?: string; limit?: number; mineId?: string }) =>
    api<PageDto<CatalogSummaryDto>>("/businesses/searchCatalogs", { params }),
  /** M2 (اسکرین ۱۳ — کپی از کاتالوک): کاتالوک صاحبِ این شماره — 404 = نبود */
  findCatalogByPhone: (phone: string) =>
    api<{ id: string; slug: string; name: string; city: string; trade: string | null; catalogCount: number; ownerName: string }>(
      "/businesses/findCatalogByPhone",
      { params: { phone } }
    ),
  /** کپی از هم‌صنف‌ها — گام ۲: قلم‌های فروش یک کاتالوگ، با تامبنیل + نوار برند */
  getCatalogItems: (params: { businessId: string; cursor?: string; limit?: number; brandId?: string; mode?: "SELL" | "BUY" }) =>
    api<CatalogItemsPageDto>("/businesses/getCatalogItems", { params }),
};

/** یک کاتالوگ زنده در جست‌وجوی هم‌صنف‌ها */
export interface CatalogSummaryDto {
  id: string;
  slug: string;
  name: string;
  city: string;
  trade: string | null;
  isVerified: boolean;
  isDemo: boolean;
  catalogCount: number;
}

/** یک قلم فروش از کاتالوگ دیگری — برای تیک‌زدن و کپی به کاتالوگ من */
export interface CatalogItemDto {
  id: string;
  mode: string;
  priceMinor: number | null;
  currency: string | null;
  variantLabel: string | null;
  attrs: Record<string, string> | null;
  /** شناسه‌ی برند — برای فیلتر نوار افقی برند */
  brandId?: string | null;
  brandName: string | null;
  productId: string | null;
  /** موجودی و حداقل سفارش (sell) و حجم و دوره (buy) — برای کپی عینا */
  stock: number | null;
  minOrder: number | null;
  volume: number | null;
  frequency: string | null;
  good: {
    id: string;
    nameFa: string;
    nameEn: string | null;
    unit: string;
    category: { id: string; nameFa: string; nameEn: string };
  };
  thumbUrl: string | null;
}

/** صفحه‌ی قلم‌های کاتالوگ — items + نوار برند (با شمارش) */
export interface CatalogItemsPageDto {
  items: CatalogItemDto[];
  nextCursor: string | null;
  brands: BrandChipDto[];
}

export const listingsApi = {
  getMyListings: (
    businessId: string,
    opts?: { includeInactive?: boolean }
  ) =>
    api<GoodItemDto[]>("/listings/getMyListings", {
      params: { businessId, ...(opts?.includeInactive ? { includeInactive: "true" } : {}) },
    }),
  saveListing: (body: {
    businessId: string;
    goodId: string;
    mode: string;
    /** ردیفِ در حال ویرایش — با آن، ذخیره همان ردیف را به‌روز می‌کند و عکس/تاریخچه می‌ماند */
    listingId?: string;
    brandName?: string;
    /** SKU انتخاب‌شده از کاتالوگ مرجع (اختیاری — بدون آن هویت از برند/ویژگی ساخته می‌شود) */
    productId?: string;
    attrs?: Record<string, string>;
    /** عنوان نمایشی محصول — کاربر می‌تواند دلخواه وارد کند؛ اگر خالی باشد،
     *  بک‌اند از نوع کالا + برند + ویژگی‌ها می‌سازد. searchText (هویت تطبیق)
     *  همیشه از برند + ویژگی‌ها می‌آید، نه از این label.
     *  ⚠ M2 (C6): این فیلد دیگر Product.label مرجع را بازنویسی نمی‌کند. */
    productLabel?: string;
    // ── M2 — فیلدهای v2 (سند ۰۶ §۳) ──
    /** C6 — عنوان شخصی ردیف در ویترین من؛ null صریح = پاک، undefined = بی‌تغییر */
    title?: string | null;
    /** C2 — توضیح کوتاه فروشنده زیر ردیف */
    note?: string | null;
    /** C5 — تعداد واحد پایه («کیسهٔ ۵۰ کیلویی» → 50)؛ سرور pricePerBaseMinor را
     *  می‌سازد. undefined = بی‌تغییر (ویرایش)؛ null صریح = فله (بدون بسته). */
    baseQty?: number | null;
    /** مدل واحد (۱۰۲۶) — نام بستهٔ انتخابی («کارتن ۶۰تایی»)؛ undefined = بی‌تغییر،
     *  null صریح = فله. با baseQty در Listing.packaging ذخیره می‌شود. */
    packLabel?: string | null;
    /** FD-9 — یادآوری آپدیت قیمت این ردیف (۱..۵؛ فرم پیش‌فرض ۳ می‌فرستد)؛
     *  null صریح = همان تنظیم کاتالوک؛ undefined = بی‌تغییر. */
    priceValidDays?: number | null;
    sell?: { priceMinor: number; stock: number; minOrder: number };
    buy?: { volume: number; frequency: string };
    /** فاز ۳ — دسته‌ی شخصی کاتالوگ؛ undefined = بدون تغییر، null = بی‌دسته */
    catalogCategoryId?: string | null;
  }) => api<GoodItemDto>("/listings/saveListing", { method: "PUT", body }),
  /** ثبت گروهی از انتخابگر — یک تأیید، N آگهی؛ فروش/خرید می‌توانند بی‌قیمت/بی‌حجم بیایند (صف اسکنر)، BOTH یک ردیف دو-بازو */
  bulkSave: (body: {
    businessId: string;
    mode: "SELL" | "BUY" | "BOTH";
    items: {
      productId: string;
      priceMinor?: number;
      stock?: number;
      minOrder?: number;
      volume?: number;
      frequency?: string;
      /** آگهی مبدا برای کپی گالری عکس‌ها (در CopyFromPeers) */
      sourceListingId?: string;
    }[];
  }) => api<{ saved: number; failed: number; items?: { productId: string; listingId: string }[] }>(
    "/listings/bulkSave",
    { method: "PUT", body }
  ),
  deleteListing: (id: string) => api<{ ok: boolean }>(`/listings/deleteListing/${id}`, { method: "DELETE" }),
  /** M2 (اسکرین ۳۳) — تغییر گروهی قیمت/موجودی + تمدید سریع اعتبار.
   *  هر قلم: قیمت مطلق (اولویت) یا درصد ± / موجودی؛ بدون هیچ‌کدام = فقط تمدید. */
  bulkPriceStock: (body: {
    businessId: string;
    items: { listingId: string; priceMinor?: number; stock?: number; pct?: number }[];
  }) =>
    api<{
      updated: number;
      failed: number;
      items: { id: string; priceMinor: number | null; stock: number | null }[];
    }>("/listings/bulkPriceStock", { method: "PUT", body }),
  /** فاز ۲ — شمارش بازدید عمومی (بدون احراز؛ مهمان هم حساب می‌شود) */
  viewListing: (id: string) => api<{ ok: boolean }>(`/listings/view/${id}`, { method: "POST" }),
  /** فاز ۲ — فعال/غیرفعال کردن کالا (بدون حذف؛ «توقف نمایش») */
  setListingActive: (id: string, active: boolean) =>
    api<GoodItemDto>(`/listings/setActive/${id}`, { method: "PUT", body: { active } }),
};

export const productsApi = {
  /** فید انتخابگر کاتالوگ مرجع — جست‌وجو + فیلتر برند + نشان‌های «فروشنده» و «داریش» */
  getProducts: (params: {
    /** برای ادمین اختیاری — بدون آن نشان «داریش» محاسبه نمی‌شود */
    businessId?: string;
    q?: string;
    categoryId?: string;
    goodId?: string;
    /** فیلتر برند — راهِ سریعِ رسیدن به لیستِ مناسب کسب‌وکار */
    brandId?: string;
    /** مسیر سریع اسکنر — هیتِ ایندکسیِ بارکد، یک SKU */
    barcode?: string;
    /** فیلتر وضعیت محصول — فقط ACTIVE یا PROVISIONAL */
    status?: string;
    /** فیلتر عکس — true = فقط با عکس، false = فقط بدون عکس */
    hasImage?: string;
    cursor?: string;
    limit?: number;
  }) => api<ProductPageDto>("/products/getProducts", { params }),

  /** پیش‌نمایش ایمپورت اکسل/CSV — هیچ چیزی ثبت نمی‌شود */
  importPreview: (input: {
    file: File;
    businessId: string;
    mode: "SELL" | "BUY";
    /** قیمت‌های فایل تومان‌اند (پیش‌فرض) یا ریال — تبدیل در پیش‌نمایش */
    priceUnit?: "toman" | "rial";
  }) => {
    // فیلدها قبل از فایل — پارس سمت سرور ترتیب‌مستقل شد، ولی ترتیبِ امن عادتِ خوبی است
    const form = new FormData();
    form.append("businessId", input.businessId);
    form.append("mode", input.mode);
    form.append("priceUnit", input.priceUnit ?? "toman");
    form.append("file", input.file);
    return api<ImportPreviewDto>("/products/importPreview", { method: "POST", form });
  },

  /** ثبت ردیف‌های تأییدشده‌ی پیش‌نمایش — هر ردیف از محتوایش بازو می‌گیرد */
  importCommit: (body: {
    businessId: string;
    mode: "SELL" | "BUY";
    rows: {
      index: number;
      name: string;
      brand?: string;
      spec?: string;
      priceMinor?: number;
      stock?: number;
      minOrder?: number;
      volume?: number;
      imageUrl?: string;
      category?: string;
      subcategory?: string;
    }[];
    replaceDuplicates?: boolean;
  }) => api<ImportCommitResultDto>("/products/importCommit", { method: "POST", body }),

  /** ادغام ادمین — ردیف‌های شکسته در بازمانده جمع می‌شوند */
  adminMerge: (body: { intoId: string; fromIds: string[] }) =>
    api<{ merged: number; intoId: string }>("/products/adminMerge", { method: "PUT", body }),

  /** ویرایش محصول مرجع — ادمین */
  adminEdit: (id: string, body: {
    label?: string;
    brandId?: string | null;
    goodId?: string;
    barcode?: string | null;
    imageUrl?: string | null;
    status?: string;
    attrs?: Record<string, string> | null;
  }) => api<{ id: string; label: string; barcode: string | null; imageUrl: string | null; status: string; brandId: string | null; goodId: string; attrs: Record<string, string> | null }>(`/products/adminEdit/${id}`, { method: "PATCH", body }),

  /** حذف محصول مرجع — ادمین */
  adminDelete: (id: string) =>
    api<{ ok: boolean }>(`/products/adminDelete/${id}`, { method: "DELETE" }),

  /** ست کردن عکس مرجع Product — وقتی کاربر عکس آپلود می‌کند */
  setProductImage: (body: { productId: string; imageUrl: string }) =>
    api<{ ok: boolean }>("/products/setProductImage", { method: "POST", body }),

  /** ثبت گروهی کالاهای مرجع — JSON array (admin only) */
  bulkCreate: (body: {
    items: {
      brandId: string;
      goodName: string;
      label: string;
      barcode?: string;
      imageUrl?: string;
      attrs?: Record<string, string>;
    }[];
  }) => api<{ saved: number; skipped: number; failed: number; items: { productId?: string; label: string; status: string; error?: string }[] }>(
    "/products/bulkCreate",
    { method: "POST", body }
  ),
};

export const marketApi = {
  requestQuote: (body: RequestQuoteBody) =>
    api<RequestQuoteResultDto>("/market/requestQuote", { method: "POST", body }),
  getInquiries: (businessId: string) =>
    api<InquiryPageDto>("/market/getInquiries", { params: { businessId, limit: 50 } }),
  markInquiryRead: (id: string) =>
    api<{ ok: boolean }>(`/market/markInquiryRead/${id}`, { method: "POST" }),
  archiveInquiry: (id: string) =>
    api<{ ok: boolean }>(`/market/archiveInquiry/${id}`, { method: "POST" }),
  // ═══ M4 (FD-24) — چرخهٔ استعلام چندقلمی + پیشنهاد ساختاریافته ═══
  /** خریدار استعلام باز را می‌بندد (۲۶ «بستن این استعلام») */
  stopRfq: (businessId: string, groupId: string) =>
    api<{ ok: boolean }>(`/market/stopRfq/${groupId}`, { method: "POST", body: { businessId } }),
  /** بازکردن استعلامِ متوقف‌شده */
  restartRfq: (businessId: string, groupId: string) =>
    api<{ ok: boolean }>(`/market/restartRfq/${groupId}`, { method: "POST", body: { businessId } }),
  /** بایگانی گروه — از فهرست خریدار می‌افتد */
  archiveRfq: (businessId: string, groupId: string) =>
    api<{ ok: boolean }>(`/market/archiveRfq/${groupId}`, { method: "POST", body: { businessId } }),
  /** «تکرار درخواست» — کلون سبد با گیرندگانِ تازه */
  repeatRfq: (businessId: string, groupId: string) =>
    api<{ ok: boolean; groupId: string; created: number }>(`/market/repeatRfq/${groupId}`, {
      method: "POST",
      body: { businessId },
    }),
  /** پذیرش پیشنهاد (۲۷) — استعلام می‌بندد + نتیجه + کال‌اوت سفارش (M5) */
  acceptOffer: (businessId: string, offerId: string) =>
    api<{
      ok: boolean;
      resultText: string;
      totalMinor: number;
      items: { goodId: string; qty: number; priceMinor: number }[];
      groupId: string | null;
    }>(`/market/acceptOffer/${offerId}`, { method: "POST", body: { businessId } }),
  /** فرم ۱۲ چندقلمی — prices[] هم‌ترتیب اقلام (null = ندارد) + شرایط ساختاریافته */
  sendOfferV2: (body: {
    inquiryId: string;
    prices?: Array<number | null>;
    priceMinor?: number;
    pay?: { chk: number; days: number };
    dlv?: { ship: boolean; by: "seller" | "customer" };
    payTerm?: string;
    delivTerm?: string;
    note?: string;
  }) => api<OfferDto>("/market/sendOffer", { method: "POST", body }),
  // ═══ فاز ۵ — دنبال‌کردن قیمت + لیست خرید (طرح ۰۸) ═══
  getWatchedGoods: (businessId: string, opts?: { archived?: boolean }) =>
    api<WatchedRowDto[]>("/market/getWatchedGoods", {
      params: { businessId, ...(opts?.archived ? { archived: "true" } : {}) },
    }),
  /** فاز ۱۲ — supplierId مبدأ: دنبال‌کردن کالا از کاتالوک/صفحهٔ محصول یک
   *  فروشنده = همان فروشنده به‌طور خودکار به لیست دنبال‌شده‌های قیمت این
   *  کالا اضافه می‌شود (Follow خودکار در بک‌اند). */
  watchGood: (businessId: string, goodId: string, supplierId?: string) =>
    api<{ ok: boolean; watched: boolean; followed: boolean }>("/market/watchGood", {
      method: "POST",
      body: { businessId, goodId, ...(supplierId ? { supplierId } : {}) },
    }),
  unwatchGood: (businessId: string, goodId: string) =>
    api<{ ok: boolean; watched: boolean }>(`/market/unwatchGood/${goodId}`, {
      method: "POST",
      body: { businessId },
    }),
  /** فاز ۱۲ — آرشیو موقت ردیف دفتر خرید (archived=false = بازگردانی) */
  archiveWatchedGood: (businessId: string, goodId: string, archived: boolean) =>
    api<{ ok: boolean; archived: boolean }>("/market/archiveWatchedGood", {
      method: "POST",
      body: { businessId, goodId, archived },
    }),
  /** M3 مهاجرت (سند ۰۸ §۷ — ۲۰ج): پرچم «در حال اتمام موجودی» — toggle. */
  setLowStock: (businessId: string, goodId: string, lowStock: boolean) =>
    api<{ ok: boolean; lowStock: boolean }>("/market/setLowStock", {
      method: "POST",
      body: { businessId, goodId, lowStock },
    }),
  /** «درخواست‌های من» — استعلام‌های فرستاده‌ی خریدار + پاسخ‌های دریافتی */
  getMyInquiries: (businessId: string) =>
    api<MyInquiriesDto>("/market/getMyInquiries", { params: { businessId } }),
  // ═══ فاز ۶ — تابلوی تأمین + فرم درخواست قیمت (طرح ۰۹/۱۲) ═══
  /** تابلوی تأمین یک کالا — ردیف‌های تأمین‌کننده + برچسب‌های رابطه */
  getSupplyBoard: (businessId: string, goodId: string) =>
    api<SupplyBoardDto>("/market/getSupplyBoard", { params: { businessId, goodId } }),
  // ═══ فاز ۷ — دایرکتوری تأمین‌کنندگان (طرح ۱۰) + پیشنهادها (طرح ۱۱) ═══
  /** دو تب: «مرتبط با من» (موتور تطبیق) + «دنبال‌شده» (شبکه‌ی فعلی) */
  getSuppliersDirectory: (businessId: string) =>
    api<SuppliersDirectoryDto>("/market/getSuppliersDirectory", { params: { businessId } }),
  /** سه کارت: قیمت بهتر / تأمین‌کننده جدید / جایگزین */
  getSuggestions: (businessId: string) =>
    api<SuggestionsDto>("/market/getSuggestions", { params: { businessId } }),
  sendOffer: (body: { inquiryId: string; priceMinor: number; payTerm?: string; delivTerm?: string; note?: string }) =>
    api<OfferDto>("/market/sendOffer", { method: "POST", body }),
  getFollows: (businessId: string) => api<FollowDto[]>("/market/getFollows", { params: { businessId } }),
  followSupplier: (
    businessId: string,
    supplierId: string,
    opts?: { source?: "ORGANIC" | "SHARED" | "PROMO"; promoId?: string }
  ) =>
    api<{ ok: boolean }>("/market/followSupplier", {
      method: "POST",
      body: { businessId, supplierId, ...opts },
    }),
  unfollowSupplier: (businessId: string, supplierId: string) =>
    api<{ ok: boolean }>(`/market/unfollowSupplier/${supplierId}`, {
      method: "POST",
      body: { businessId },
    }),
  /** تقاضای مرتبط با کالاهای من (سمت فروش) */
  getBuyRequests: (businessId: string) =>
    api<MarketItemDto[]>("/market/getBuyRequests", { params: { businessId } }),
  /** مشتریان من — خریدارهایی که کاتالوگ من را دنبال می‌کنند (غنی + مرتب‌شده) */
  getMyFollowers: (businessId: string) =>
    api<FollowersPageDto>("/market/getFollowers", { params: { businessId } }),
  /** حذف یک فالوور از لیست مشتریان من */
  removeFollower: (businessId: string, followerBusinessId: string) =>
    api<{ ok: boolean; removed: number }>("/market/removeFollower", {
      method: "POST",
      body: { businessId, followerBusinessId },
    }),
  /** M6 (FD-44/45) — تایید مشتری جدید (مهر ackAt؛ ردیف از «جدید» می‌رود) */
  ackFollower: (businessId: string, buyerId: string) =>
    api<{ ok: boolean }>("/market/ackFollower", {
      method: "POST",
      body: { businessId, buyerId },
    }),
  /** M6 (۰۸ب) — یادداشت شخصی فروشنده روی مشتری (≤۵۰۰؛ خالی = پاک‌کردن) */
  setFollowerNote: (businessId: string, buyerId: string, note: string) =>
    api<{ ok: boolean; note: string | null }>("/market/setFollowerNote", {
      method: "POST",
      body: { businessId, buyerId, note },
    }),
  /** M6 (۰۸ب) — نمای جزئیات مشتری: شناسنامه + سفارش‌ها + استعلام‌های او */
  getCustomer: (businessId: string, buyerId: string) =>
    api<CustomerViewDto>("/market/getCustomer", { params: { businessId, buyerId } }),
  /** وضعیت گیت رشد برای بازار خریدارها (بازوی فروش) */
  getMarketState: (businessId: string) =>
    api<MarketStateDto>("/market/getMarketState", { params: { businessId } }),
  /** فالو کردن خریدار از بازار — پشت گیت ۱۰ معرف */
  followBuyer: (businessId: string, buyerBusinessId: string, source?: "ORGANIC" | "SHARED") =>
    api<{ ok: boolean }>("/market/followBuyer", {
      method: "POST",
      body: { businessId, buyerBusinessId, source },
    }),
  /** برداشتن فالوی خریدار — همیشه آزاد */
  unfollowBuyer: (businessId: string, buyerBusinessId: string) =>
    api<{ ok: boolean }>(`/market/unfollowBuyer/${buyerBusinessId}`, {
      method: "POST",
      body: { businessId },
    }),
  /** پیشنهاد قیمت مستقیم روی درخواست خرید — پشت گیت ۱۰ معرف */
  offerBuyRequest: (body: { businessId: string; buyListingId: string; priceMinor: number; payTerm?: string; delivTerm?: string; note?: string }) =>
    api<OfferDto>("/market/offerBuyRequest", { method: "POST", body }),

  // ═══ فاز ۴ مهاجرت — حلقهٔ RFQ ═══

  /** استعلام‌های گروهی خریدار + پیشنهادهای رسیده (sc-offers) */
  getMyRfqs: (businessId: string) =>
    api<MyRfqsDto>("/market/getMyRfqs", { params: { businessId } }),
  /** نشان خصوصی خریدار روی پیشنهاد (sheet-offer-status) */
  setOfferStatus: (id: string, status: "INTERESTED" | "CONTACTED" | "REVIEWED" | "NONE") =>
    api<{ ok: boolean; status: string | null }>(`/market/setOfferStatus/${id}`, {
      method: "POST",
      body: { status },
    }),
  /** زمینهٔ فرم «پاسخ با قیمت» — id = Inquiry id یا b+BUY listing id */
  getQuoteContext: (businessId: string, id: string) =>
    api<QuoteContextDto>("/market/getQuoteContext", { params: { businessId, id } }),

  // ═══ طرح ۸ — تحلیل ذخیره‌کنندگان / گوش‌به‌زنگ / تابلوی قیمت ═══

  /** تحلیل کالا × ذخیره‌کننده (U60/U61) — چه کسی قیمت کدام کالای من را دنبال می‌کند */
  getSaverAnalysis: (businessId: string) =>
    api<SaverAnalysisDto>("/market/getSaverAnalysis", { params: { businessId } }),
  /** نیازهای خریدارهای گوش‌به‌زنگ من (U63) — تب سوم درخواست‌های قیمت */
  getWatchedBuyerNeeds: (businessId: string) =>
    api<WatchedBuyerNeedsDto>("/market/getWatchedBuyerNeeds", { params: { businessId } }),
  /** تابلوهای ذخیره‌شده + تزریق پرومو (U05/U06) — خوراک قیمتِ زنده */
  getPriceBoard: (businessId: string) =>
    api<PriceBoardDto>("/market/getPriceBoard", { params: { businessId } }),
};

// ─── طرح ۸ — انواع مشترک تحلیل / کیف / کمپین ───

/** خروجی getFollowers — ردیف‌ها + خط خلاصهٔ عددی منبع‌ها (U60) */
export interface FollowersPageDto {
  rows: CustomerRowDto[];
  summary: { total: number; organic: number; shared: number; promo: number };
}

/** یک ذخیره‌کننده در تحلیل کالا */
export interface SaverRowDto {
  business: { id: string; slug: string; name: string; city: string | null; isVerified: boolean };
  source: "ORGANIC" | "SHARED" | "PROMO";
  since: string;
  need: { volume: number | null; frequency: string | null } | null;
}

/** تحلیل کالا × ذخیره‌کننده — هر کالای فروش من */
export interface SaverAnalysisDto {
  items: {
    listingId: string;
    goodId: string;
    goodName: string | null;
    unit: string | null;
    priceMinor: number | null;
    currency: string | null;
    variantLabel: string | null;
    saverCount: number;
    summary: { total: number; organic: number; shared: number; promo: number };
    savers: SaverRowDto[];
  }[];
}

/** نیاز یک خریدار گوش‌به‌زنگ */
export interface WatchedNeedDto {
  id: string;
  volume: number | null;
  frequency: string | null;
  updatedAt: string;
  buyer: { id: string; slug: string; name: string; city: string | null; isVerified: boolean };
  good: { id: string; nameFa: string; nameEn: string | null; unit: string };
  sellsSameGood: boolean | null;
  /** فاز ۴ مهاجرت — آگهی فروشِ من در همین کالا (null = این کالا در کاتالوگم نیست) */
  myListingId?: string | null;
  /** فاز ۴ مهاجرت — قبلاً به این خریدار در همین کالا پیشنهاد داده‌ام (بج «پاسخ دادی») */
  answeredByMe?: boolean;
}

export interface WatchedBuyerNeedsDto {
  buyers: number;
  needs: WatchedNeedDto[];
}

/** ردیف تابلوی قیمت — یک کالا از لیست خرید من */
export interface PriceBoardRowDto {
  goodId: string;
  goodName: string | null;
  unit: string | null;
  suppliers: {
    listingId: string;
    business: { id: string; slug: string; name: string; city: string | null; isVerified: boolean };
    priceMinor: number | null;
    currency: string | null;
    stock: number | null;
    minOrder: number | null;
    variantLabel: string | null;
    updatedAt: string;
    deltaMinor: number;
  }[];
  bestMinor: number | null;
  promo: {
    promoId: string;
    listingId: string;
    supplier: { id: string; slug: string; name: string; city: string | null; isVerified: boolean };
    priceMinor: number | null;
    currency: string | null;
    variantLabel: string | null;
    goodName: string | null;
  } | null;
}

export interface PriceBoardDto {
  rows: PriceBoardRowDto[];
}

// ─── طرح ۸ — کیف پول تومانی (U08/U12) ───

export interface WalletTxnDto {
  id: string;
  type: "CHARGE" | "PROMO_SPEND" | "REFERRAL_REWARD" | "REFUND";
  amountMinor: number;
  ref: string | null;
  description: string | null;
  createdAt: string;
}

export interface WalletDto {
  balanceMinor: number;
  txns: WalletTxnDto[];
}

export const walletApi = {
  getWallet: (businessId: string) =>
    api<WalletDto>("/wallet/get", { params: { businessId } }),
  /** مبلغ به تومان — سرور به ریال تبدیل می‌کند */
  charge: (businessId: string, amountToman: number) =>
    api<{ ok: boolean; balanceMinor: number; receipt: string }>("/wallet/charge", {
      method: "POST",
      body: { businessId, amountToman },
    }),
};

// ─── طرح ۸ + M9 — تبلیغ نوع‌دار «صف اول» (U05..U09 · سند ۰۳ §۳.۴) ───

/** M9 — نوع تبلیغ: کمپین فروش ویژه (مدت‌دار) | هدفمند (جایگاه‌دار) */
export type PromoType = "CAMPAIGN" | "TARGETED";
/** M9 — جایگاه هدفمند: کاتالوک‌های ذخیره‌شده | تابلوی تأمین همان کالا */
export type PromoPlacement = "SAVED_CATALOGS" | "SUPPLY_BOARD";

export interface PromoMineDto {
  id: string;
  listingId: string;
  goodName: string | null;
  priceMinor: number | null;
  budgetMinor: number;
  spentMinor: number;
  remainingMinor: number;
  isActive: boolean;
  eventCount: number;
  type: PromoType;
  placement: PromoPlacement | null;
  durationDays: number | null;
  endsAt: string | null;
  createdAt: string;
  stoppedAt: string | null;
}

export interface PromoReportDto {
  promo: {
    id: string;
    listingId: string;
    goodName: string | null;
    priceMinor: number | null;
    currency: string | null;
    budgetMinor: number;
    spentMinor: number;
    remainingMinor: number;
    isActive: boolean;
    type: PromoType;
    placement: PromoPlacement | null;
    durationDays: number | null;
    endsAt: string | null;
    stoppedAt: string | null;
    createdAt: string;
  };
  stats: {
    views: number;
    follows: number;
    spentMinor: number;
    viewRateMinor: number;
    followRateMinor: number;
    costPerFollowMinor: number | null;
  };
  viewers: { id: string; slug: string; name: string; city: string | null; isVerified: boolean }[];
  converted: { id: string; slug: string; name: string; city: string | null; isVerified: boolean }[];
  /** فاز ۶ — رویدادهای خام با زمان: هر بیننده کِی دید و همان جلسه دنبال کرد یا نه */
  viewerEvents: { viewerId: string; type: "VIEW" | "FOLLOW"; at: string }[];
}

export const promosApi = {
  /** M9 — ساخت تبلیغ نوع‌دار: کمپین فروش ویژه (مدت ۳/۷/۱۴) یا هدفمند (جایگاه) */
  create: (
    businessId: string,
    listingId: string,
    budgetToman: number,
    opts: { type?: PromoType; durationDays?: number; placement?: PromoPlacement } = {}
  ) =>
    api<{ id: string; budgetMinor: number; type: PromoType; endsAt: string | null }>("/promos/create", {
      method: "POST",
      body: { businessId, listingId, budgetToman, ...opts },
    }),
  stop: (businessId: string, promoId: string) =>
    api<{ id: string; isActive: boolean }>(`/promos/stop/${promoId}`, {
      method: "POST",
      body: { businessId },
    }),
  report: (businessId: string, promoId: string) =>
    api<PromoReportDto>("/promos/report", { params: { businessId, promoId } }),
  mine: (businessId: string) => api<PromoMineDto[]>("/promos/mine", { params: { businessId } }),
};

// ═══ M9 — نمایندهٔ فروش (FD-17 · فضای سوم) ═══

/** قلم سفارش نماینده — آزاد: نام/بسته/تعداد/قیمت (بی‌نیاز به Listing) */
export interface RepItemInput {
  name: string;
  pack?: string | null;
  qty: number;
  unitPriceMinor: number;
}

export type RepStatus = "NEW" | "SENT" | "DELIVERED" | "SETTLED";
export type RepShareVia = "WHATSAPP" | "SMS" | "CLIPBOARD";

export interface RepOrderDto {
  id: string;
  businessId: string;
  business: { id: string; slug: string; name: string; city: string | null; trade: string | null };
  customerName: string;
  items: RepItemInput[];
  itemCount: number;
  totalMinor: number;
  commissionPct: number;
  commissionMinor: number;
  status: RepStatus;
  sharedVia: RepShareVia | null;
  createdAt: string;
  updatedAt: string;
}

export interface RepStatsDto {
  monthStart: string;
  tiles: {
    salesMonthMinor: number;
    commissionMonthMinor: number;
    /** پورسانتِ سفارش‌های تحویل‌شده — «در انتظار تسویه» زنده */
    pendingSettleMinor: number;
    businesses: number;
    ordersMonth: number;
  };
  businesses: {
    id: string;
    slug: string;
    name: string;
    city: string | null;
    trade: string | null;
    catalogCount: number;
    scoreSell: number;
    scoreBuy: number;
    stats: { ordersMonth: number; salesMonth: number; commissionMonth: number; pct: number | null };
  }[];
}

export const repApi = {
  /** ثبت سفارش نماینده — قلم‌های آزاد + پورسانت توافقی */
  create: (
    businessId: string,
    customerName: string,
    items: RepItemInput[],
    commissionPct: number
  ) =>
    api<RepOrderDto>("/rep/orders", {
      method: "POST",
      body: { businessId, customerName, items, commissionPct },
    }),
  /** گزارش واحد — ?businessId فیلتر همان کسب‌وکار (حکم مالک) */
  list: (businessId?: string) =>
    api<RepOrderDto[]>("/rep/orders", { params: businessId ? { businessId } : {} }),
  /** داشبورد — ۴ کاشی ماه + کسب‌وکارهای زیر نمایندگی */
  stats: () => api<RepStatsDto>("/rep/stats"),
  /** ارسال لیست سفارش — بیرون از سیستم؛ متنِ لیست برای پیام‌رسان برمی‌گردد */
  share: (businessId: string, repOrderId: string, via: RepShareVia) =>
    api<{ order: RepOrderDto; text: string }>(`/rep/orders/${repOrderId}/share`, {
      method: "POST",
      body: { businessId, via },
    }),
  deliver: (businessId: string, repOrderId: string) =>
    api<RepOrderDto>(`/rep/orders/${repOrderId}/deliver`, {
      method: "POST",
      body: { businessId },
    }),
  settle: (businessId: string, repOrderId: string) =>
    api<RepOrderDto>(`/rep/orders/${repOrderId}/settle`, {
      method: "POST",
      body: { businessId },
    }),
};

// ─── گیت اشتراک مخاطبین — دفترچه‌ی تلفن کاربر با اجازه‌ی خودش ───

/** یک مخاطب کاربر — عضویت در زمان خواندن با User.phone تطبیق خورده است */
export interface ContactRowDto {
  id: string;
  name: string;
  /** نرمال‌شده‌ی 09xxxxxxxxx */
  phone: string;
  /** عضو iMach = کسب‌وکارش برای لینک دادن؛ null = هنوز عضو نشده */
  member: { id: string; slug: string; name: string; city: string } | null;
  lastInvitedAt: string | null;
}

// ═══ M6 — شبکهٔ خصوصی و دید عمومی (۳۱/۳۲ + supply-proposals) ═══

/** کالای موردنیاز خریدار در نمای عمومی لیست خرید */
export interface BuyListNeededDto {
  goodId: string;
  name: string;
  nameEn: string | null;
  unit: string;
  volume: number | null;
  frequency: string | null;
  pack: string | null;
}

/** گروه استعلامِ باز در نمای عمومی (نوار افقی «در حال استعلام») */
export interface BuyListInquiringDto {
  groupId: string;
  title: string;
  itemNames: string[];
  daysLeft: number | null;
  offerCount: number;
}

/** تطبیق کاتالوک خودم با کالاهای موردنیاز خریدار (goodId — سرورمبنا) */
export interface BuyListMatchDto {
  goodId: string;
  listingId: string;
  pack: string | null;
  priceMinor: number | null;
  minOrder: number | null;
  currency: string | null;
  exact: boolean;
}

/** نمای عمومی لیست خرید (GET /businesses/getBuyList/:slug) */
export interface PublicBuyListDto {
  business: {
    id: string;
    slug: string;
    name: string;
    ownerName: string | null;
    trade: string | null;
    city: string;
    isVerified: boolean;
  };
  supplyTerms: string | null;
  stats: { goods: number; suppliers: number; views: number };
  inquiring: BuyListInquiringDto[];
  needed: BuyListNeededDto[];
  viewer: {
    kind: "owner" | "member";
    isOwner: boolean;
    canPropose: boolean;
    matched: BuyListMatchDto[];
    myOpenProposal: { id: string; createdAt: string; itemCount: number } | null;
    inMyBuyList: string[];
  } | null;
}

/** زمینهٔ بینندهٔ کاتالوک عمومی (GET /businesses/getBusinessContext/:slug) */
export interface BusinessContextDto {
  kind: "guest" | "member" | "customer" | "owner";
  isCustomer: boolean;
  custType: "PASSING" | "PARTNER" | "CONTRACT" | null;
  canSeePrices: boolean;
  priceGated: boolean;
  prices: { listingId: string; priceMinor: number | null; currency: string | null; pricePerBaseMinor: number | null }[];
  inYourBuyList: { listingId: string; goodId: string }[];
}

/** ردیف پیشنهاد تامینِ دریافتی (بالای لیست خرید ۲۰) */
export interface SupplyProposalDto {
  id: string;
  note: string | null;
  items: { goodId: string; name: string; pack: string | null; listingId: string | null; priceMinor: number; minOrder: number; unit: string }[];
  itemCount: number;
  createdAt: string;
  supplier: { id: string; slug: string; name: string; city: string; trade: string | null; isVerified: boolean };
}

export const supplyProposalsApi = {
  /** پیشنهادهای بازِ دریافتی — کارت‌های بالای لیست خرید (۲۰) */
  getMine: (businessId: string) =>
    api<{ rows: SupplyProposalDto[] }>("/supply-proposals", { params: { businessId } }),
  /** ارسال پیشنهاد تامین از نمای عمومی لیست خرید (۳۲) — items خالی = درخواست لخت */
  send: (body: {
    businessId: string;
    buyerSlug: string;
    items?: { goodId: string; priceMinor: number; minOrder: number }[];
    note?: string;
  }) =>
    api<{ id: string; createdAt: string; itemCount: number; catalogAdded: number }>("/supply-proposals", {
      method: "POST",
      body,
    }),
  /** پذیرش = دو رابطهٔ Follow + اعلان به فروشنده */
  accept: (id: string) => api<{ ok: boolean; acceptedAt: string }>(`/supply-proposals/${id}/accept`, { method: "POST", body: {} }),
  /** حذف بی‌صدا از بالای لیست */
  dismiss: (id: string) => api<{ ok: boolean }>(`/supply-proposals/${id}/dismiss`, { method: "POST", body: {} }),
};

export const contactsApi = {
  /** همگام‌سازی دسته‌ای از گوشی/ورود دستی — تا ۵۰۰ ردیف در هر فراخوان */
  sync: (contacts: { name: string; phone: string }[]) =>
    api<{ saved: number; received: number }>("/contacts/sync", { method: "POST", body: { contacts } }),
  /** مخاطبین من — اعضا اول، بعد الفبای فارسی */
  getContacts: () => api<ContactRowDto[]>("/contacts/getContacts"),
  /** ثبت دعوت — «این مخاطب دعوت شده» */
  invite: (id: string) => api<{ ok: boolean }>(`/contacts/invite/${id}`, { method: "POST" }),
};

// ─── زنگ اعلان‌ها — فید درون‌برنامه‌ای ───

export type NotificationType =
  | "FOLLOW_SUPPLIER" // خریداری کاتالوگ من را فالو کرد (مشتری جدید)
  | "FOLLOW_BUYER" // تامین‌کننده‌ای لیست خرید مرا فالو کرد
  | "OFFER" // پیشنهاد تازه روی درخواست خرید من
  | "QUOTE" // استعلام موتور تطبیق به من رسید
  | "CONTACT_JOINED" // شماره‌ای از دفترچه‌ی من عضو شد
  | "PRICE_CHANGE" // فاز ۵ — کالای دنبال‌شده قیمتش عوض شد
  | "BUYER_NEED" // طرح ۸ — خریدارِ گوش‌به‌زنگ نیاز جدید ثبت کرد
  | "ORDER" // M5 — رخدادهای چرخهٔ سفارش (ثبت/پذیرش/ارسال/تحویل/لغو/رد)
  | "SUPPLY_PROPOSAL" // M6 — پیشنهاد تامین (رسید/تایید) — رخداد-محور
  | "SCORE" // M7 — عبور از آستانهٔ ۱۰۰ ⇐ «موتور شتاب‌دهنده فعال شد»
  | "AD_BUDGET_END"; // M9 — تبلیغ تمام شد (بودجه/مدت) + باقیمانده به کیف برگشت

/** متن اعلان سمت کلاینت از روی type ساخته می‌شود — ردیف فقط داده دارد.
 *  M5: رخدادهای ORDER تیتر و مقصد خودشان را دارند (رخداد-محور). */
export interface NotificationDto {
  id: string;
  type: NotificationType;
  actorId: string | null;
  actorName: string | null;
  actorSlug: string | null;
  good: string | null;
  /** M5 — تیتر رویداد («سفارش پذیرفته شد"); null = مشتق از type (legacy) */
  title?: string | null;
  /** M5 — مقصد لمس (لینک عمقی همان رخداد) */
  url?: string | null;
  read: boolean;
  createdAt: string;
}

export interface NotificationsPageDto {
  items: NotificationDto[];
  unreadCount: number;
}

export const notificationsApi = {
  /** ۳۰ ردیف آخر + شمارنده‌ی نخوانده‌ها */
  getNotifications: () => api<NotificationsPageDto>("/notifications/getNotifications"),
  /** همه خوانده شد — الگوی باز کردن پنل */
  readAll: () => api<{ ok: boolean }>("/notifications/readAll", { method: "POST" }),
  /** کلید عمومی VAPID — خالی یعنی سرور پوش ندارد */
  getVapidPublicKey: () => api<{ publicKey: string }>("/notifications/getVapidPublicKey"),
  /** اشتراک این مرورگر بعد از موافقت کاربر */
  subscribePush: (sub: { endpoint: string; keys: { p256dh: string; auth: string } }) =>
    api<{ ok: boolean }>("/notifications/subscribePush", {
      method: "POST",
      body: JSON.stringify(sub),
    }),
};

// ─── M7 — امتیاز، رشد و اعلان‌ها (ScoreModule) ───

export type ScoreArm = "sell" | "buy";

export interface ScoreItemDto {
  id: string;
  title: string;
  sub: string;
  pts: number;
  done: boolean;
  doneAt?: string | null;
}

export interface ScoreDeskNextDto {
  /** جملهٔ گام بعدی — عین متن طرح FD-6/7 */
  t: string;
  /** مقصد دکمه (مسیر وب اپ) */
  go: string;
  /** امتیاز مانده تا ۱۰۰ (شتابدهی) */
  remaining: number;
}

export interface ScoreArmDto {
  arm: ScoreArm;
  score: number;
  /** موتور شتاب‌دهندهٔ این بازو فعال است؟ (score ≥ آستانهٔ شبکهٔ باز) */
  open: boolean;
  items: ScoreItemDto[];
  deskNext: ScoreDeskNextDto | null;
}

export interface ScoreDto {
  /** همان دو شمارهٔ denormalized (چیپ اپ‌بار) — top-level برای راحتی */
  scoreSell: number;
  scoreBuy: number;
  required: number;
  sell: ScoreArmDto;
  buy: ScoreArmDto;
}

export interface ReferralItemDto {
  name: string;
  phone: string;
  joinedAt: string;
  /** SELL = از لینک کاتالوک آمده (مشتری من) · BUY = از لینک میز خرید (تأمین‌کننده من) */
  arm: "SELL" | "BUY";
  rewarded: boolean;
}

export interface ReferralsDto {
  count: number;
  goal: number;
  rewardMinor: number;
  earnedMinor: number;
  links: { catalog: string; buyList: string };
  items: ReferralItemDto[];
}

export const scoreApi = {
  /** صفحهٔ ۱۵ + کارت گام بعدی میزها + موتور فعال */
  getScore: (businessId: string) =>
    api<ScoreDto>(`/score?businessId=${encodeURIComponent(businessId)}`),
  /** صفحهٔ دعوت‌شدگان (۰۶): آمار/هدف/لیست + پاداش کیف */
  getReferrals: (businessId: string) =>
    api<ReferralsDto>(`/score/referrals?businessId=${encodeURIComponent(businessId)}`),
};

// ─── فاز ۵ مهاجرت — قیمت‌گذاری و تخفیف‌ها (PricingModule) ───

/** درصد تخفیف مشتری به تفکیک نوع — کلید غایب = سطح بالاتر */
export type PricingCustPct = Partial<Record<"p" | "h" | "q", number>>;

/** پلهٔ حجمی — بر حجمِ «همان کالا» در سفارش */
export interface PricingTier {
  from: number;
  to: number | null;
  pct: number;
}

/** ورودی سه‌گانهٔ سطح کالا — kind amt/fin به تومان */
export interface PricingTriInput {
  kind: "pct" | "amt" | "fin";
  valueToman: number;
}
export type PricingItemTri = Partial<Record<"p" | "h" | "q", PricingTriInput>>;

export interface PricingItemRule {
  custPct: PricingCustPct;
  tiers: PricingTier[];
  itemTri: PricingItemTri | null;
}

/** خروجی /pricing/state — همهٔ داده‌های صفحهٔ sc-discount */
export interface PricingStateDto {
  catalog: { custPct: PricingCustPct; tiers: PricingTier[] } | null;
  groups: {
    refId: string;
    name: string;
    itemCount: number;
    custPct: PricingCustPct | null;
    tiers: PricingTier[] | null;
  }[];
  items: {
    listingId: string;
    name: string;
    priceMinor: number | null;
    unit: string;
    minOrder: number | null;
    catalogCategoryId: string | null;
    rule: PricingItemRule | null;
  }[];
}

/** خروجی /pricing/preview — قیمت مؤثر + شکست منشأ */
export interface PricingPreviewDto {
  listingId: string;
  goodName: string;
  unit: string;
  baseMinor: number;
  custType: "p" | "h" | "q";
  custPct: number;
  custFrom: "ITEM" | "GROUP" | "CATALOG" | "NONE";
  tierPct: number;
  tierLabel: string | null;
  tierFrom: "ITEM" | "GROUP" | "CATALOG" | null;
  totalPct: number;
  finalMinor: number;
  orderTotalMinor: number;
  hasItemRule: boolean;
}

export const pricingApi = {
  state: (businessId: string) => api<PricingStateDto>("/pricing/state", { params: { businessId } }),
  saveCatalog: (body: { businessId: string; custPct: PricingCustPct; tiers: PricingTier[] }) =>
    api<PricingStateDto>("/pricing/catalog", { method: "PUT", body }),
  saveGroup: (refId: string, body: { businessId: string; custPct: PricingCustPct; tiers: PricingTier[] }) =>
    api<PricingStateDto>(`/pricing/group/${refId}`, { method: "PUT", body }),
  /** mode=CATALOG → ریست قاعدهٔ اختصاصی؛ mode=CUSTOM → tri + tiers */
  saveItem: (
    listingId: string,
    body: {
      businessId: string;
      mode: "CATALOG" | "CUSTOM";
      tri?: PricingItemTri;
      tiers?: PricingTier[];
    }
  ) => api<{ ok: boolean; reset?: boolean; custPct?: PricingCustPct }>(`/pricing/item/${listingId}`, {
    method: "PUT",
    body,
  }),
  bulk: (body: {
    businessId: string;
    listingIds: string[];
    action: "RESET" | "SAME";
    custPct?: PricingCustPct;
  }) => api<{ affected: number; action: string }>("/pricing/bulk", { method: "PUT", body }),
  preview: (params: { businessId: string; listingId: string; custType: "p" | "h" | "q"; qty: number }) =>
    api<PricingPreviewDto>("/pricing/preview", { params }),
  /** تغییر نوع مشتری — روی یال فالو، توسط فروشنده */
  setCustType: (body: { businessId: string; buyerId: string; type: "PASSING" | "PARTNER" | "CONTRACT" }) =>
    api<{ ok: boolean }>("/pricing/custType", { method: "POST", body }),
};

// ─── فاز ۶ مهاجرت — چت کاری (ChatModule · sc-msgs / sc-chat) ───
// M8 (§M8 · FD-22 تصمیم ۸): زمینهٔ گفتگو + حضور زنده (presence).

/** طرف مقابل گفتگو — پروجکت‌شدهٔ امن کسب‌وکار + نشان آنلاین (M8) */
export interface ChatOtherDto {
  id: string;
  slug: string;
  name: string;
  trade: string | null;
  city: string;
  isVerified: boolean;
  catalogCount: number;
  phone: string | null;
  /** M8 — حضور: مالکِ این کسب‌وکار ≤۹۰s ضربان زده باشد */
  online?: boolean;
}

export interface ThreadRowDto {
  id: string;
  side: "a" | "b";
  other: ChatOtherDto;
  lastText: string | null;
  lastAt: string;
  unread: number;
}

/** M8 — زمینهٔ گفتگو (FD-22): سندی که گفتگو از دلِ آن شروع شده.
 *  title فقط در getThread — استنتاج زندهٔ سمت سرور از آیتم‌های سند. */
export interface ThreadContextDto {
  type: "ORDER" | "OFFER" | "SUPPLY_PROPOSAL" | "LISTING" | string;
  refId: string;
  title?: string | null;
}

export interface ChatMessageDto {
  id: string;
  mine: boolean;
  text: string;
  file: { id: string; url: string; thumbUrl: string | null; name: string } | null;
  createdAt: string;
}

export interface ThreadDetailDto {
  id: string;
  other: ChatOtherDto;
  /** M8 — نوار زمینهٔ «دربارهٔ:» — null = گفتگوی آزاد */
  context: ThreadContextDto | null;
  messages: ChatMessageDto[];
}

export const chatApi = {
  /** فهرست گفتگوهای من + جمع نخوانده (بج تب چت) + نشان آنلاین طرف */
  getThreads: () =>
    api<{ items: ThreadRowDto[]; unreadTotal: number }>("/chat/getThreads"),
  /** شروع/یافتن گفتگو با یک کسب‌وکار — با یا بدون زمینهٔ سند (M8) */
  startThread: (
    businessId: string,
    withBusinessId: string,
    context?: { type: string; refId: string }
  ) =>
    api<{ id: string; other: ChatOtherDto; created: boolean; context: ThreadContextDto | null }>("/chat/startThread", {
      method: "POST",
      body: {
        businessId,
        withBusinessId,
        contextType: context?.type,
        contextRefId: context?.refId,
      },
    }),
  /** جزئیات + ۱۰۰ پیام آخر — باز کردن = خواندن؛ زمینه با عنوان زنده */
  getThread: (id: string) => api<ThreadDetailDto>(`/chat/getThread/${id}`),
  /** ارسال پیام — متن (≤۲۰۰۰) + پیوست اختیاری عکس */
  sendMessage: (threadId: string, text: string, fileId?: string) =>
    api<ChatMessageDto>("/chat/sendMessage", {
      method: "POST",
      body: { threadId, text, fileId },
    }),
  /** M8 — ضربان حضور (شل هر ≤۶۰s؛ آنلاین = ≤۹۰s) */
  heartbeat: () => api<{ ok: boolean }>("/chat/heartbeat", { method: "POST", body: {} }),
};

// ─── فاز ۶ مهاجرت — ترجیحات نمایش کاربر (تم/رنگ arm/زبان) ───

export interface UserPrefsDto {
  theme: "light" | "dark";
  armBuyColor: string | null;
  armSellColor: string | null;
  /** فاز ۸ — ارز نمایش (ISO 4217 · null = ارز مرجع IRR) */
  currency: string | null;
}

export const prefsApi = {
  /** ذخیرهٔ ادغایی ترجیحات — همان مقادیر برمی‌گردد */
  setPrefs: (body: {
    theme?: "light" | "dark";
    armBuyColor?: string | null;
    armSellColor?: string | null;
    lang?: string;
    /** فاز ۸ — ارز نمایش (null = ارز مرجع) */
    currency?: string | null;
  }) => api<UserPrefsDto & { lang?: string }>("/auth/setPrefs", { method: "POST", body }),
};

// ─── فاز ۸ مهاجرت — پیکربندی عمومی سیستم (ارز + سوییچ پرداخت) ───

export interface CurrencyConfigDto {
  paymentsEnabled: boolean;
  base: string;
  /** نرخ‌ها: baseMinorPerMajor (IRR ≡ ۱۰) */
  rates: Record<string, number>;
  currencies: string[];
}

export const settingsApi = {
  /** پیکربندی عمومی — بدون احرار؛ کش سرور ۵m + client staleTime ۵m */
  getConfig: () => api<CurrencyConfigDto>("/settings/config", { auth: false }),
};

// ─── M5 (سند ۰۸ §M5 · FD-18/22/26/37) — سفارش‌ها و اسناد ───

/** قلم فریزشدهٔ سفارش — منبع حقیقتِ نمایش/چاپ (۴۰/۴۱) */
export interface OrderItemDto {
  listingId: string | null;
  goodId: string;
  name: string;
  pack: string;
  qty: number;
  unitPriceMinor: number;
}

/** رخداد خط زمانی — یک روایت مشترک برای دو طرف (۱۰/۳۹) */
export interface OrderHistoryDto {
  st: "NEW" | "ACCEPTED" | "SENT" | "DELIVERED" | "REJECTED" | "CANCELLED";
  at: string;
  by: "buyer" | "seller" | "system";
  note?: string;
}

export interface OrderBizDto {
  id: string;
  slug: string;
  name: string;
  city: string;
  isVerified: boolean;
  trade: string | null;
  phone: string | null;
  address?: string | null;
  invoiceTaxId?: string | null;
  invoiceNote?: string | null;
}

export interface OrderDto {
  id: string;
  status: "NEW" | "ACCEPTED" | "SENT" | "DELIVERED" | "REJECTED" | "CANCELLED";
  originType: "CATALOG_BASKET" | "RFQ_OFFER";
  originId: string | null;
  items: OrderItemDto[];
  totalMinor: number;
  currency: string;
  note: string | null;
  sellerNote: string | null;
  pay: { chk: number; days: number } | null;
  dlv: { ship: boolean; by: "seller" | "customer" } | null;
  docNo: number | null;
  deliverDeadline: string | null;
  daysLeft: number | null;
  history: OrderHistoryDto[];
  archivedAt: string | null;
  createdAt: string;
  buyer: OrderBizDto;
  seller: OrderBizDto;
}

export interface OrdersListDto {
  orders: OrderDto[];
  /** ۰۹ — «n سفارش جدید» زیرعنوان زنده */
  newCount?: number;
  /** ۲۸ — «n سفارش جاری» */
  currentCount?: number;
}

export const ordersApi = {
  /** سبد کاتالوک (۳۱) — قیمت از آگهی زنده فریز می‌شود */
  createFromBasket: (body: {
    businessId: string;
    supplierId: string;
    items: { listingId: string; qty: number }[];
    note?: string;
  }) => api<OrderDto>("/orders", { method: "POST", body: { ...body, originType: "CATALOG_BASKET" } }),

  /** کال‌اوت ۲۷ — سفارش با شرایط پیشنهاد پذیرفته‌شده (قیمت فریز) */
  createFromOffer: (businessId: string, offerId: string) =>
    api<OrderDto>("/orders", { method: "POST", body: { businessId, originType: "RFQ_OFFER", offerId } }),

  /** دفتر سفارش‌ها (۰۹ فروشنده / ۲۸ خریدار) — بستنِ تنبل ۷روزه سمت سرور */
  getOrders: (businessId: string, side: "buy" | "sell", opts?: { archived?: boolean }) =>
    api<OrdersListDto>("/orders", {
      params: { businessId, side, ...(opts?.archived ? { archived: "true" } : {}) },
    }),

  /** جزئیات سفارش (۱۰/۳۹) — هر دو طرف یک روایت می‌بینند */
  getOrder: (businessId: string, id: string) =>
    api<OrderDto>(`/orders/${id}`, { params: { businessId } }),

  /** پذیرش با اصلاح اقلام (۱۰) — edits هم‌ترتیب اقلام؛ فقط فیلدهای ارسالی */
  acceptOrder: (
    businessId: string,
    id: string,
    body: { edits?: { qty?: number; unitPriceMinor?: number }[]; note?: string }
  ) => api<{ ok: boolean; status: string; docNo: number | null; totalMinor: number }>(`/orders/${id}/accept`, {
    method: "POST",
    body: { businessId, ...body },
  }),

  /** رد — فقط فروشنده، فقط NEW */
  rejectOrder: (businessId: string, id: string) =>
    api<{ ok: boolean; status: string }>(`/orders/${id}/reject`, { method: "POST", body: { businessId } }),

  /** «ارسال شد» — مهلت ۷روزهٔ تأیید از همین لحظه شروع می‌شود */
  sendOrder: (businessId: string, id: string) =>
    api<{ ok: boolean; status: string }>(`/orders/${id}/send`, { method: "POST", body: { businessId } }),

  /** «تأیید تحویل» = بسته‌شدن (۳۹) */
  deliverOrder: (businessId: string, id: string) =>
    api<{ ok: boolean; status: string }>(`/orders/${id}/deliver`, { method: "POST", body: { businessId } }),

  /** لغو — فقط تا قبل از ارسال */
  cancelOrder: (businessId: string, id: string) =>
    api<{ ok: boolean; status: string }>(`/orders/${id}/cancel`, { method: "POST", body: { businessId } }),

  /** بایگانی خریدار (۲۸) — ردیف از فهرست می‌افتد، تاریخچه می‌ماند */
  archiveOrder: (businessId: string, id: string) =>
    api<{ ok: boolean }>(`/orders/${id}/archive`, { method: "POST", body: { businessId } }),
};

// ═══ M10 — محتوای اجتماعی و SEO عمومی (نظرات · تستايمونی · بازخورد · گوش-به-زنگ) ═══

/** ردیف نظر کاتالوگ — شیت نظرات ۳۱/۳۷ */
export interface CatalogReviewDto {
  id: string;
  rating: number;
  text: string | null;
  reply: string | null;
  repliedAt: string | null;
  createdAt: string;
  authorName: string;
  authorVerified: boolean;
}

export interface ReviewsDto {
  avg: number;
  count: number;
  mine: { id: string; rating: number; text: string | null; reply: string | null; repliedAt: string | null; createdAt: string } | null;
  items: CatalogReviewDto[];
}

export const reviewsApi = {
  /** خلاصه + ریز نظرات یک کاتالوگ — با توکنِ در دسترس (بینندهٔ واردشده mine می‌گیرد؛ مهمان عمومی) */
  list: (businessId: string) => api<ReviewsDto>("/reviews", { params: { businessId } }),
  /** ثبت/به‌روزرسانی نظر خریدار — یک نظر به ازای هر کاتالوگ (upsert) */
  submit: (businessId: string, rating: number, text: string | null) =>
    api<{ id: string; rating: number; text: string | null }>("/reviews", {
      method: "POST",
      body: { businessId, rating, ...(text ? { text } : {}) },
    }),
  /** پاسخ عمومی فروشنده زیر همان نظر */
  reply: (reviewId: string, reply: string) =>
    api<{ id: string; reply: string; repliedAt: string }>(`/reviews/${reviewId}/reply`, {
      method: "POST",
      body: { reply },
    }),
};

/** ردیف ویترین عمومی — نوار «نظر خریداران» لندینگ + صفحهٔ سایر نظرات */
export interface TestimonialDto {
  id: string;
  name: string;
  business: string;
  role: string;
  isBuyer: boolean;
  feature: string | null;
  text: string;
  approved: boolean;
  sortHint: number;
  createdAt: string;
}

/** پست بازخورد/پرسش راهنمای دستیارها */
export interface FeedbackPostDto {
  id: string;
  kind: "FEEDBACK" | "QUESTION";
  arm: "BUY" | "SELL";
  text: string;
  likeCount: number;
  likedByMe: boolean;
  replies: { team?: boolean; businessName: string; text: string; createdAt: string }[];
  createdAt: string;
  authorName: string;
}

export interface VideoLessonDto {
  id: string;
  arm: "BUY" | "SELL";
  title: string;
  durationS: number;
  posterUrl: string;
  bullets: string[];
  sortHint: number;
}

export const socialApi = {
  /** نظرات عمومی تأییدشده — عمومی (مهمان) */
  testimonials: () => api<TestimonialDto[]>("/feedback/testimonials", { auth: false }),
  /** ثبت نظر عمومی — مهمان هم می‌فرستد؛ نمایش پس از تأیید ادمین */
  submitTestimonial: (body: { name: string; business: string; role?: string; isBuyer?: boolean; feature?: string; text: string }) =>
    api<{ id: string }>("/feedback/testimonials", { method: "POST", body, auth: false }),
  /** بازخورد/پرسش‌های یک دستیار — عمومی؛ likedByMe با businessId بیننده (توکن اگر هست) */
  feedback: (kind: "FEEDBACK" | "QUESTION", arm: "BUY" | "SELL", businessId?: string) =>
    api<FeedbackPostDto[]>("/feedback", { params: { kind, arm, businessId } }),
  createFeedback: (businessId: string, kind: "FEEDBACK" | "QUESTION", arm: "BUY" | "SELL", text: string) =>
    api<{ id: string }>("/feedback", { method: "POST", body: { businessId, kind, arm, text } }),
  likeFeedback: (postId: string, businessId: string) =>
    api<{ id: string; likeCount: number; likedByMe: boolean }>(`/feedback/${postId}/like`, {
      method: "POST",
      body: { businessId },
    }),
  replyFeedback: (postId: string, businessId: string | null, text: string) =>
    api<{ id: string; replies: FeedbackPostDto["replies"] }>(`/feedback/${postId}/reply`, {
      method: "POST",
      body: { ...(businessId ? { businessId } : {}), text },
    }),
  /** فیلم‌های آموزشی راهنما — عمومی */
  videoLessons: (arm: "BUY" | "SELL") => api<VideoLessonDto[]>("/feedback/video-lessons", { params: { arm }, auth: false }),
};

/** زنگولهٔ گوش-به-زنگ روی نیاز خریدار (N6) — ردیف‌های لیست خرید عمومی ۲۳ */
export const needAlertsApi = {
  /** روشن‌کردن زنگوله (upsert سه‌تایی فروشنده×خریدار×کالا) */
  set: (businessId: string, buyerBusinessId: string, goodId: string) =>
    api<{ id: string; on: boolean; goodId: string }>("/market/need-alerts", {
      method: "POST",
      body: { businessId, buyerBusinessId, goodId },
    }),
  /** خاموش‌کردن زنگوله */
  unset: (businessId: string, buyerBusinessId: string, goodId: string) =>
    api<{ ok: boolean; on: boolean; goodId: string }>("/market/need-alerts", {
      method: "DELETE",
      params: { businessId, buyerBusinessId, goodId },
    }),
  /** وضعیت زنگوله‌های من روی لیست خرید یک خریدار */
  myForBuyer: (businessId: string, buyerBusinessId: string) =>
    api<{ goodIds: string[] }>("/market/need-alerts", { params: { businessId, buyerBusinessId } }),
};

/** استعلام‌های رسیدهٔ خریدارانِ زنگوله‌خورش — بخش نخست تب «گوش به زنگ» (۱۱) */
export interface WatchedRfqDto {
  id: string;
  buyer: { id: string; name: string; slug: string; city: string | null };
  goods: { id: string; nameFa: string; nameEn: string | null; unit: string }[];
  itemsTotal: number;
  watchedCount: number;
  createdAt: string;
  expiresAt: string | null;
  daysLeft: number | null;
}

export const watchedRfqsApi = {
  list: (businessId: string) => api<{ items: WatchedRfqDto[] }>("/market/watched-buyer-needs", { params: { businessId } }),
};

/** شیت «تاریخچهٔ رویدادها» کالا (۰۳-الگو · N5) */
export interface ListingEventDto {
  id: string;
  listingId: string;
  type: "WATCH_ADD" | "COMPARE_ADD" | "INQUIRY" | "CHAT" | "CAMPAIGN_VIEW";
  actorBusinessId: string | null;
  actorName: string | null;
  createdAt: string;
}

export interface ListingEventsDto {
  viewCount30: number;
  viewCountTotal: number;
  counts: Record<string, number>;
  days: number | null;
  items: ListingEventDto[];
}

export const listingEventsApi = {
  /** خط زمانی تعامل با یک آگهی — فقط مالک */
  list: (listingId: string, days?: 7 | 30) =>
    api<ListingEventsDto>(`/listings/${listingId}/events`, { params: { days } }),
};
