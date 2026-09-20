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
  phone: string;
  role: string;
}

export interface BusinessSummaryDto {
  id: string;
  slug: string;
  name: string;
  activityType: string | null;
  city: string;
  isVerified: boolean;
}

export interface AuthResponseDto {
  accessToken: string;
  user: UserDto;
  businesses: BusinessSummaryDto[];
}

export interface GoodDto {
  id: string;
  name: string;
  category: string;
  unit: string;
}

export interface PageDto<T> {
  items: T[];
  nextCursor: string | null;
}

export interface GoodItemDto {
  id: string;
  mode: string;
  price: number | null;
  stock: number | null;
  minOrder: number | null;
  volume: number | null;
  frequency: string | null;
  updatedAt?: string;
  good: { id: string; name: string; category: string; unit: string };
}

export interface BusinessProfileDto {
  id: string;
  slug: string;
  name: string;
  activityType: string | null;
  city: string;
  phone: string | null;
  isVerified: boolean;
  isDemo: boolean;
  listings: GoodItemDto[];
}

export interface SellerDto {
  id: string;
  slug: string;
  name: string;
  city: string;
  isVerified: boolean;
}

export interface OfferDto {
  id: string;
  price: number;
  minOrder: number;
  score: number;
  isSpecial: boolean;
  note: string | null;
  createdAt: string;
  listing: {
    id: string;
    price: number | null;
    minOrder: number | null;
    good: { id: string; name: string; category: string; unit: string };
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
    price: number | null;
    good: { id: string; name: string; category: string; unit: string };
  };
  buyer: SellerDto;
}

export interface InquiryPageDto extends PageDto<InquiryDto> {
  unreadCount: number;
}

export interface FollowDto {
  supplierId: string;
  createdAt: string;
  supplier: SellerDto;
}

export interface BoardRowDto {
  id: string;
  price: number;
  stock: number | null;
  minOrder: number | null;
  updatedAt: string;
  good: { id: string; name: string; category: string; unit: string };
  business: SellerDto;
  priceLogs: { oldPrice: number; newPrice: number; createdAt: string }[];
}

export interface SuggestionDto {
  buyerId: string;
  buyerName: string;
  buyerSlug: string;
  buyerCity: string;
  buyerVerified: boolean;
  buyListingId: string;
  goodId: string;
  goodName: string;
  unit: string;
  volume: number;
  frequency: string;
  score: number;
}

export interface QuoteRequestResultDto {
  created: number;
  offers: OfferDto[];
}

// ─── اندپوینت‌ها — نام‌گذاری اکشن‌محور، هم‌نام با کنترلرهای NestJS ───

export const authApi = {
  loginUser: (body: { phone: string; password: string }) =>
    api<AuthResponseDto>("/auth/loginUser", { method: "POST", body, auth: false }),
  registerUser: (body: { name: string; phone: string; password: string }) =>
    api<AuthResponseDto>("/auth/registerUser", { method: "POST", body, auth: false }),
  refreshSession: () => api<AuthResponseDto>("/auth/refreshSession", { method: "POST", auth: false }),
  logoutUser: () => api<{ ok: boolean }>("/auth/logoutUser", { method: "POST" }),
  getMe: () => api<{ user: UserDto; businesses: BusinessSummaryDto[] }>("/auth/getMe"),
};

export const goodsApi = {
  getGoods: (params: { q?: string; category?: string; cursor?: string; limit?: number }) =>
    api<PageDto<GoodDto>>("/goods/getGoods", { params, auth: false }),
  getCategories: () => api<string[]>("/goods/getCategories", { auth: false }),
};

export const businessesApi = {
  getMyBusinesses: () => api<(BusinessSummaryDto & { _count: { listings: number } })[]>("/businesses/getMyBusinesses"),
  createBusiness: (body: { name: string; city: string }) =>
    api<BusinessSummaryDto & { slug: string }>("/businesses/createBusiness", { method: "POST", body }),
  editBusiness: (id: string, body: { name?: string; city?: string; activityType?: string | null }) =>
    api<BusinessSummaryDto>(`/businesses/editBusiness/${id}`, { method: "PATCH", body }),
  getBusiness: (slug: string) => api<BusinessProfileDto>(`/businesses/getBusiness/${slug}`, { auth: false }),
};

export const listingsApi = {
  getMyListings: (businessId: string) =>
    api<GoodItemDto[]>("/listings/getMyListings", { params: { businessId } }),
  saveListing: (body: {
    businessId: string;
    goodId: string;
    mode: string;
    sell?: { price: number; stock: number; minOrder: number };
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
  sendOffer: (body: { inquiryId: string; price: number; note?: string }) =>
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
  getSuggestions: (businessId: string) =>
    api<SuggestionDto[]>("/market/getSuggestions", { params: { businessId } }),
};
