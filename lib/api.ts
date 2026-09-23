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
  const { method = "GET", params, body, auth = true, _retried = false } = options;

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
    body: body !== undefined ? JSON.stringify(body) : undefined,
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
}

export interface BusinessSummaryDto {
  id: string;
  slug: string;
  name: string;
  activityType: string | null;
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
    name: string;
    firstName: string | null;
    lastName: string | null;
  } | null;
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
  refreshSession: () => api<AuthResponseDto>("/auth/refreshSession", { method: "POST", auth: false }),
  logoutUser: () => api<{ ok: boolean }>("/auth/logoutUser", { method: "POST" }),
  getMe: () => api<{ user: UserDto; businesses: BusinessSummaryDto[] }>("/auth/getMe"),
};

export const goodsApi = {
  /** جستجوی کالای مرجع (fa/en/alias) یا مرور با categoryId */
  getGoods: (params: { q?: string; categoryId?: string; cursor?: string; limit?: number }) =>
    api<PageDto<GoodDto>>("/goods/getGoods", { params, auth: false }),
  /** درخت کامل دسته‌بندی‌ها */
  getCategories: () => api<CategoryNodeDto[]>("/goods/getCategories", { auth: false }),
  /** پیشنهاد برند برای فرم ثبت کالا */
  getBrands: (q?: string) => api<BrandDto[]>("/goods/getBrands", { params: { q }, auth: false }),
  /** ثبت کالای مرجع جدید وقتی جستجو نتیجه‌ای نداشت */
  createGood: (body: { name: string; categoryId: string; nameEn?: string; aliases?: string[]; unit: string }) =>
    api<GoodDto>("/goods/createGood", { method: "POST", body }),
};

export const businessesApi = {
  getMyBusinesses: () => api<(BusinessSummaryDto & { _count: { listings: number } })[]>("/businesses/getMyBusinesses"),
  createBusiness: (body: { name: string; city: string }) =>
    api<BusinessSummaryDto & { slug: string }>("/businesses/createBusiness", { method: "POST", body }),
  editBusiness: (id: string, body: { name?: string; city?: string; activityType?: string | null }) =>
    api<BusinessSummaryDto>(`/businesses/editBusiness/${id}`, { method: "PATCH", body }),
  getBusiness: (slug: string) => api<BusinessProfileDto>(`/businesses/getBusiness/${slug}`, { auth: false }),
  /** گیت ویروسی تماس: شماره فقط به کاربر واردشده داده می‌شود */
  getContact: (slug: string) => api<{ phone: string | null; name: string }>(`/businesses/getContact/${slug}`),
  /** بازار — کشف عمومی؛ بدون عضویت هم کار می‌کند */
  getExplore: (params: { mode?: "SELL" | "BUY"; city?: string }) =>
    api<ExploreItemDto[]>("/businesses/getExplore", { params, auth: false }),
};

export const listingsApi = {
  getMyListings: (businessId: string) =>
    api<GoodItemDto[]>("/listings/getMyListings", { params: { businessId } }),
  saveListing: (body: {
    businessId: string;
    goodId: string;
    mode: string;
    brandName?: string;
    attrs?: Record<string, string>;
    sell?: { priceMinor: number; stock: number; minOrder: number };
    buy?: { volume: number; frequency: string };
  }) => api<GoodItemDto>("/listings/saveListing", { method: "PUT", body }),
  deleteListing: (id: string) => api<{ ok: boolean }>(`/listings/deleteListing/${id}`, { method: "DELETE" }),
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
