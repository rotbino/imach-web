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

export interface BusinessSummaryDto {
  id: string;
  slug: string;
  name: string;
  activityType: string | null;
  /** صنف — «سوپرمارکت»؛ کلید جست‌وجوی کپی از هم‌صنف‌ها */
  trade?: string | null;
  city: string;
  country?: string;
  currency?: string;
  isVerified: boolean;
  /** لوکیشن دقیق اختیاری — فقط مبنای تطابق؛ علنی نمی‌شود */
  lat?: number | null;
  lng?: number | null;
  /** آدرس متنی قابل ویرایش — این یکی علنی است */
  address?: string | null;
}

export interface AuthResponseDto {
  accessToken: string;
  user: UserDto;
  businesses: BusinessSummaryDto[];
}

/** پاسخ getMe — عکس پروفایل کاربر اگر آپلود کرده باشد */
export interface MeResponseDto {
  user: UserDto;
  businesses: BusinessSummaryDto[];
  avatar: { url: string; thumbUrl: string | null } | null;
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
}

export interface CategoryNodeDto {
  id: string;
  slug: string;
  nameFa: string;
  nameEn: string;
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
    hasImage: boolean;
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
}

export interface BusinessProfileDto {
  id: string;
  slug: string;
  name: string;
  activityType: string | null;
  city: string;
  country?: string;
  currency?: string;
  isVerified: boolean;
  isDemo: boolean;
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
  status: string;
  isRead: boolean;
  createdAt: string;
  listing: {
    id: string;
    priceMinor: number | null;
    currency: string | null;
    good: {
      id: string;
      nameFa: string;
      nameEn: string | null;
      unit: string;
      category: { slug: string; nameFa: string; nameEn: string };
    };
  };
  buyer: SellerDto;
}

export interface InquiryPageDto extends PageDto<InquiryDto> {
  unreadCount: number;
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

export interface BoardRowDto {
  id: string;
  priceMinor: number;
  currency: string | null;
  stock: number | null;
  minOrder: number | null;
  updatedAt: string;
  good: {
    id: string;
    nameFa: string;
    nameEn: string | null;
    unit: string;
    category: { slug: string; nameFa: string; nameEn: string };
  };
  business: SellerDto;
  priceLogs: { oldMinor: number; newMinor: number; createdAt: string }[];
}

/** تامین‌کننده پیشنهادی برای نیازهای خرید من — موتور دنبال کردن سمت خرید */
export interface SupplierSuggestionDto {
  supplierId: string;
  supplierName: string;
  supplierSlug: string;
  supplierCity: string;
  supplierVerified: boolean;
  listingId: string;
  goodId: string;
  goodName: string;
  unit: string;
  priceMinor: number;
  currency: string | null;
  minOrder: number;
  score: number;
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
  /** آخرین درخواست خرید فعال (لیستینگ BUY/BOTH با حجم) — null یعنی درخواست فعالی ندارد */
  latestRequest: {
    volume: number;
    frequency: string | null;
    updatedAt: string;
    good: { nameFa: string; nameEn: string | null; unit: string };
  } | null;
}

export interface QuoteRequestResultDto {
  created: number;
  offers: OfferDto[];
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
  /** خواندن عمومی همه‌ی فایل‌های یک اسلات (گالری) یا همه‌ی اسلات‌ها */
  getList: (model: "User" | "Business" | "Listing", modelId: string, key?: string) =>
    api<{ items: FileDto[] }>("/files/getList", { params: { model, modelId, key }, auth: false }),
  /** حذف — از ابر و دیتابیس؛ فقط مالک یا مالک کسب‌وکار/آگهی */
  remove: (id: string) => api<{ ok: boolean }>(`/files/delete/${encodeURIComponent(id)}`, { method: "DELETE" }),
};

export const authApi = {
  loginUser: (body: { phone: string; password: string; country?: string }) =>
    api<AuthResponseDto>("/auth/loginUser", { method: "POST", body, auth: false }),
  /** گام ۱ ثبت‌نام — تک‌بررسیِ غیرهمگام که کلاینت از عهده‌اش برنمی‌آید */
  checkPhone: (body: { phone: string; country?: string }) =>
    api<{ available: boolean }>("/auth/checkPhone", { method: "POST", body, auth: false }),
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
  /** تغییر شماره موبایل — برای کاربری که موقع ثبت‌نام سریع شماره‌اش را اشتباه زده */
  changePhone: (body: { phone: string; country?: string }) =>
    api<{ ok: boolean; phone: string }>("/auth/changePhone", { method: "POST", body }),
  refreshSession: () => api<AuthResponseDto>("/auth/refreshSession", { method: "POST", auth: false }),
  logoutUser: () => api<{ ok: boolean }>("/auth/logoutUser", { method: "POST" }),
  getMe: () => api<MeResponseDto>("/auth/getMe"),
  /** ویرایش پروفایل — نام و نام خانوادگی مالک (در ویترین کاتالوگ نشان داده می‌شود) */
  editProfile: (body: { firstName?: string; lastName?: string }) =>
    api<{ user: UserDto }>("/auth/editProfile", { method: "POST", body }),
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

export const businessesApi = {
  getMyBusinesses: () => api<(BusinessSummaryDto & { _count: { listings: number } })[]>("/businesses/getMyBusinesses"),
  createBusiness: (body: { name: string; city: string; trade?: string }) =>
    api<BusinessSummaryDto & { slug: string }>("/businesses/createBusiness", { method: "POST", body }),
  editBusiness: (id: string, body: { name?: string; city?: string; activityType?: string | null; trade?: string | null }) =>
    api<BusinessSummaryDto>(`/businesses/editBusiness/${id}`, { method: "PATCH", body }),
  getBusiness: (slug: string) => api<BusinessProfileDto>(`/businesses/getBusiness/${slug}`, { auth: false }),
  /** گیت ویروسی تماس: شماره فقط به کاربر واردشده داده می‌شود */
  getContact: (slug: string) => api<{ phone: string | null; name: string }>(`/businesses/getContact/${slug}`),
  /** بازار — کشف عمومی؛ بدون عضویت هم کار می‌کند */
  getExplore: (params: { mode?: "SELL" | "BUY"; city?: string }) =>
    api<ExploreItemDto[]>("/businesses/getExplore", { params, auth: false }),
  /** کپی از هم‌صنف‌ها — گام ۱: کاتالوگ‌های زنده بر اساس صنف/نام */
  searchCatalogs: (params: { q?: string; cursor?: string; limit?: number; mineId?: string }) =>
    api<PageDto<CatalogSummaryDto>>("/businesses/searchCatalogs", { params }),
  /** کپی از هم‌صنف‌ها — گام ۲: قلم‌های فروش یک کاتالوگ، با تامبنیل + نوار برند */
  getCatalogItems: (params: { businessId: string; cursor?: string; limit?: number; brandId?: string }) =>
    api<CatalogItemsPageDto>("/businesses/getCatalogItems", { params }),
  /** کاتالوگ تجمیعی هم‌صنف‌ها — هم‌صنف‌های هم‌جغرافیا، SKU یونیک، فیلتر برند/دسته */
  getAggregatedCatalog: (params: {
    trade: string;
    city?: string;
    province?: string;
    country?: string;
    q?: string;
    brandId?: string;
    categoryId?: string;
    cursor?: string;
    limit?: number;
    mineId?: string;
  }) => api<AggregatedCatalogPageDto>("/businesses/getAggregatedCatalog", { params }),
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

/** یک قلم از کاتالوگ تجمیعی هم‌صنف‌ها — SKU یونیک، فاقد قیمت (قیمت با خودت) */
export interface AggregatedItemDto {
  id: string;
  productId: string | null;
  brandId: string | null;
  brandName: string | null;
  variantLabel: string | null;
  good: {
    id: string;
    nameFa: string;
    nameEn: string | null;
    unit: string;
    category: { id: string; nameFa: string; nameEn: string };
  };
  thumbUrl: string | null;
}

/** صفحه‌ی کاتالوگ تجمیعی هم‌صنف‌ها — items + نوار برند + نوار دسته + تعداد کسب‌وکار یافت‌شده */
export interface AggregatedCatalogPageDto {
  items: AggregatedItemDto[];
  nextCursor: string | null;
  brands: BrandChipDto[];
  categories: CategoryChipDto[];
  foundBusinesses: number;
}

export const listingsApi = {
  getMyListings: (businessId: string) =>
    api<GoodItemDto[]>("/listings/getMyListings", { params: { businessId } }),
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
    sell?: { priceMinor: number; stock: number; minOrder: number };
    buy?: { volume: number; frequency: string };
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
    }[];
  }) => api<{ saved: number; failed: number }>(
    "/listings/bulkSave",
    { method: "PUT", body }
  ),
  /** کپی از هم‌صنف‌ها — تیک‌های من به ردیف‌های بی‌قیمت در کاتالوگ من */
  copyFrom: (body: { businessId: string; sourceBusinessId: string; sourceListingIds: string[] }) =>
    api<{ copied: number; already: number; failed: number }>("/listings/copyFrom", { method: "PUT", body }),
  deleteListing: (id: string) => api<{ ok: boolean }>(`/listings/deleteListing/${id}`, { method: "DELETE" }),
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
  }) => api<ImportCommitResultDto>("/products/importCommit", { method: "POST", body }),

  /** ادغام ادمین — ردیف‌های شکسته در بازمانده جمع می‌شوند */
  adminMerge: (body: { intoId: string; fromIds: string[] }) =>
    api<{ merged: number; intoId: string }>("/products/adminMerge", { method: "PUT", body }),
};

export const marketApi = {
  requestQuote: (listingId: string, note?: string) =>
    api<QuoteRequestResultDto>(`/market/requestQuote/${listingId}`, {
      method: "POST",
      body: note ? { note } : {},
    }),
  getOffers: (businessId: string) =>
    api<PageDto<OfferDto>>("/market/getOffers", { params: { businessId, limit: 100 } }),
  getInquiries: (businessId: string) =>
    api<InquiryPageDto>("/market/getInquiries", { params: { businessId, limit: 50 } }),
  markInquiryRead: (id: string) =>
    api<{ ok: boolean }>(`/market/markInquiryRead/${id}`, { method: "POST" }),
  sendOffer: (body: { inquiryId: string; priceMinor: number; note?: string }) =>
    api<OfferDto>("/market/sendOffer", { method: "POST", body }),
  getFollows: (businessId: string) => api<FollowDto[]>("/market/getFollows", { params: { businessId } }),
  followSupplier: (businessId: string, supplierId: string) =>
    api<{ ok: boolean }>("/market/followSupplier", { method: "POST", body: { businessId, supplierId } }),
  unfollowSupplier: (businessId: string, supplierId: string) =>
    api<{ ok: boolean }>(`/market/unfollowSupplier/${supplierId}`, {
      method: "POST",
      body: { businessId },
    }),
  getPriceBoard: (businessId: string) => api<BoardRowDto[]>("/market/getPriceBoard", { params: { businessId } }),
  /** تامین‌کننده‌های پیشنهادی برای نیازهای خرید من (سمت خرید) */
  getSupplierSuggestions: (businessId: string) =>
    api<SupplierSuggestionDto[]>("/market/getSupplierSuggestions", { params: { businessId } }),
  /** تقاضای مرتبط با کالاهای من (سمت فروش) */
  getBuyRequests: (businessId: string) =>
    api<MarketItemDto[]>("/market/getBuyRequests", { params: { businessId } }),
  /** مشتریان من — خریدارهایی که کاتالوگ من را دنبال می‌کنند (غنی + مرتب‌شده) */
  getMyFollowers: (businessId: string) =>
    api<CustomerRowDto[]>("/market/getFollowers", { params: { businessId } }),
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
  followBuyer: (businessId: string, buyerBusinessId: string) =>
    api<{ ok: boolean }>("/market/followBuyer", {
      method: "POST",
      body: { businessId, buyerBusinessId },
    }),
  /** برداشتن فالوی خریدار — همیشه آزاد */
  unfollowBuyer: (businessId: string, buyerBusinessId: string) =>
    api<{ ok: boolean }>(`/market/unfollowBuyer/${buyerBusinessId}`, {
      method: "POST",
      body: { businessId },
    }),
  /** پیشنهاد قیمت مستقیم روی درخواست خرید — پشت گیت ۱۰ معرف */
  offerBuyRequest: (body: { businessId: string; buyListingId: string; priceMinor: number; note?: string }) =>
    api<OfferDto>("/market/offerBuyRequest", { method: "POST", body }),
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
  | "CONTACT_JOINED"; // شماره‌ای از دفترچه‌ی من عضو شد

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
  /** لغو اشتراک این مرورگر */
  unsubscribePush: (endpoint: string) =>
    api<{ ok: boolean }>("/notifications/unsubscribePush", {
      method: "POST",
      body: JSON.stringify({ endpoint }),
    }),
};
