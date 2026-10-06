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
  /** فاز ۳ — دسته‌های شخصی ویترین (چیپ‌های بالای کاتالوگ) */
  customCategories?: CatalogCategoryDto[] | null;
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
  /** فاز ۴ — تناوب خرید خریدار (WEEKLY | MONTHLY | OCCASIONAL) */
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
  /** آخرین درخواست خرید فعال (لیستینگ BUY/BOTH با حجم) — null یعنی درخواست فعالی ندارد */
  latestRequest: {
    volume: number;
    frequency: string | null;
    updatedAt: string;
    good: { nameFa: string; nameEn: string | null; unit: string };
  } | null;
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
  rows: BoardSupplierDto[];
}

/** بدنه‌ی POST /market/requestQuote — فرم طرح ۱۲ */
export interface RequestQuoteBody {
  businessId: string;
  goodId: string;
  volume: number;
  frequency?: "WEEKLY" | "MONTHLY" | "OCCASIONAL";
  delivery?: string;
  /** فاز ۴ مهاجرت (sc-rfq) — محل تحویل (پیش‌فرض شهر خریدار) */
  deliveryCity?: string;
  /** فاز ۴ مهاجرت (sc-rfq) — قیمت هدف اختیاری (ریال/Minor) */
  targetPriceMinor?: number;
  note?: string;
  supplierIds?: string[];
  includeNetwork?: boolean;
}

export interface RequestQuoteResultDto {
  created: number;
  /** گیرنده‌هایی که از شبکه iMach اضافه شدند (نه انتخاب من) */
  networkAdded: number;
  inquiries: { id: string; sellerId: string; status: string }[];
}

// ═══ فاز ۴ مهاجرت — حلقهٔ RFQ: پیشنهادهای گروهی + وضعیت + زمینهٔ فرم پاسخ ═══

/** پیشنهادِ داخل یک گروه استعلام (sc-offers) */
export interface RfqOfferDto {
  id: string;
  sellerId: string;
  listingId: string;
  seller: SellerDto & { phone?: string | null };
  priceMinor: number;
  currency: string;
  minOrder: number;
  payTerm: string | null;
  delivTerm: string | null;
  note: string | null;
  /** نشان خصوصی خریدار: INTERESTED | CONTACTED | REVIEWED | null */
  status: string | null;
  createdAt: string;
}

/** یک استعلام گروهی (کارت «پیشنهادها») — چند Inquiry با rfqGroupId مشترک */
export interface RfqGroupDto {
  /** rfqGroupId · legacy: inquiry.id · پیشنهاد سرد: c+offerId */
  id: string;
  kind: "RFQ" | "COLD";
  createdAt: string;
  volume: number | null;
  frequency: string | null;
  delivery: string | null;
  deliveryCity: string | null;
  targetPriceMinor: number | null;
  note: string | null;
  good: {
    id: string;
    nameFa: string;
    nameEn: string | null;
    unit: string;
    category?: { slug: string; nameFa: string } | null;
  } | null;
  recipients: Array<{
    inquiryId: string;
    sellerId: string;
    status: string;
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
  betterPrices: BetterPriceDto[];
  newSuppliers: NewSupplierDto[];
  alternatives: AlternativeGoodDto[];
}

/**
 * وضعیت گیت رشد برای بازار خریدارها (بازوی فروش) — یک فراخوان:
 * شمارنده معرف (گیت ۱۰تایی)، کالاهای فروشی (گیت کاتالوگ خالی)،
 * و فالو/پیشنهادهای قبلی من روی خریدارهای بازار.
 */
export interface MarketStateDto {
  referral: { count: number; required: number; unlocked: boolean };
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
  quickRegister: (body: { phone: string; country?: string; ref?: string }) =>
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
  editProfile: (body: { firstName?: string; lastName?: string }) =>
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
  /** پیشنهاد برند برای فرم ثبت کالا */
  getBrands: (q?: string) => api<BrandDto[]>("/goods/getBrands", { params: { q }, auth: false }),
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
  }) => api<BusinessSummaryDto>(`/businesses/editBusiness/${id}`, { method: "PATCH", body }),
  getBusiness: (slug: string) => api<BusinessProfileDto>(`/businesses/getBusiness/${slug}`, { auth: false }),
  /** فاز ۳ (طرح ۰۱) — دسته‌های شخصی کاتالوگ: کل لیست یکجا replace می‌شود
   *  (ایجاد/تغییرنام/حذف/مرتب‌سازی idempotent)؛ حذف دسته آگهی‌هایش را بی‌دسته می‌کند */
  setCatalogCategories: (id: string, categories: CatalogCategoryDto[]) =>
    api<BusinessSummaryDto>(`/businesses/catalogCategories/${id}`, {
      method: "PUT",
      body: { categories },
    }),
  /** فاز ۸ (طرح ۱۴) — تنظیمات اعلان از پروفایل؛ ذخیره‌ی ادغامی: فقط کلیدهای
   *  ارسال‌شده عوض می‌شوند. پاسخ = prefs کامل پس از ذخیره. */
  setNotifPrefs: (id: string, body: Partial<NotifPrefsDto>) =>
    api<NotifPrefsDto>(`/businesses/setNotifPrefs/${id}`, { method: "PUT", body }),
  /** فاز ۹ (شکاف ۶) — خاموش/روشن کردن دستیارها از پروفایل؛ merge سمت سرور */
  setArms: (id: string, body: Partial<EnabledArmsDto>) =>
    api<EnabledArmsDto>(`/businesses/setArms/${id}`, { method: "PUT", body }),
  /** گیت ویروسی تماس: شماره فقط به کاربر واردشده داده می‌شود */
  getContact: (slug: string) => api<{ phone: string | null; name: string }>(`/businesses/getContact/${slug}`),
  /** کپی از هم‌صنف‌ها — گام ۱: کاتالوگ‌های زنده بر اساس صنف/نام */
  searchCatalogs: (params: { q?: string; cursor?: string; limit?: number; mineId?: string }) =>
    api<PageDto<CatalogSummaryDto>>("/businesses/searchCatalogs", { params }),
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
     *  همیشه از برند + ویژگی‌ها می‌آید، نه از این label. */
    productLabel?: string;
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
  // ═══ فاز ۵ — دنبال‌کردن قیمت + لیست خرید (طرح ۰۸) ═══
  getWatchedGoods: (businessId: string) =>
    api<WatchedRowDto[]>("/market/getWatchedGoods", { params: { businessId } }),
  watchGood: (businessId: string, goodId: string) =>
    api<{ ok: boolean; watched: boolean }>("/market/watchGood", {
      method: "POST",
      body: { businessId, goodId },
    }),
  unwatchGood: (businessId: string, goodId: string) =>
    api<{ ok: boolean; watched: boolean }>(`/market/unwatchGood/${goodId}`, {
      method: "POST",
      body: { businessId },
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

// ─── طرح ۸ — کمپین «صف اول» (U05..U09) ───

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
  create: (businessId: string, listingId: string, budgetToman: number) =>
    api<{ id: string; budgetMinor: number }>("/promos/create", {
      method: "POST",
      body: { businessId, listingId, budgetToman },
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
  | "BUYER_NEED"; // طرح ۸ — خریدارِ گوش‌به‌زنگ نیاز جدید ثبت کرد

/** متن اعلان سمت کلاینت از روی type ساخته می‌شود — ردیف فقط داده دارد */
export interface NotificationDto {
  id: string;
  type: NotificationType;
  actorId: string | null;
  actorName: string | null;
  actorSlug: string | null;
  good: string | null;
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

/** طرف مقابل گفتگو — پروجکت‌شدهٔ امن کسب‌وکار */
export interface ChatOtherDto {
  id: string;
  slug: string;
  name: string;
  trade: string | null;
  city: string;
  isVerified: boolean;
  catalogCount: number;
  phone: string | null;
}

export interface ThreadRowDto {
  id: string;
  side: "a" | "b";
  other: ChatOtherDto;
  lastText: string | null;
  lastAt: string;
  unread: number;
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
  messages: ChatMessageDto[];
}

export const chatApi = {
  /** فهرست گفتگوهای من + جمع نخوانده (بج تب چت) */
  getThreads: () =>
    api<{ items: ThreadRowDto[]; unreadTotal: number }>("/chat/getThreads"),
  /** شروع/یافتن گفتگو با یک کسب‌وکار */
  startThread: (businessId: string, withBusinessId: string) =>
    api<{ id: string; other: ChatOtherDto; created: boolean }>("/chat/startThread", {
      method: "POST",
      body: { businessId, withBusinessId },
    }),
  /** جزئیات + ۱۰۰ پیام آخر — باز کردن = خواندن */
  getThread: (id: string) => api<ThreadDetailDto>(`/chat/getThread/${id}`),
  /** ارسال پیام — متن (≤۲۰۰۰) + پیوست اختیاری عکس */
  sendMessage: (threadId: string, text: string, fileId?: string) =>
    api<ChatMessageDto>("/chat/sendMessage", {
      method: "POST",
      body: { threadId, text, fileId },
    }),
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
