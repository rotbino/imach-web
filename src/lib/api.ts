// ─── کلاینت API تایپ‌دار برای iMach API (Fastify) ───
//
// • baseURL قابل تنظیم با NEXT_PUBLIC_API_BASE (پیش‌فرض: /api/v1)
// • در سندباکس، درخواست‌های بین‌پورتی با کوئری XTransformPort به گیت‌وی می‌روند
//   (NEXT_PUBLIC_GATEWAY_PORT=4000) — در دیپلوی واقعی خالی بگذارید.
// • Access token در حافظه (zustand) نگه داشته می‌شود؛ رفرش‌توکن httpOnly
//   کوکی است؛ پاسخ 401 یک‌بار ساکت رفرش و سپس تلاش مجدد می‌شود.

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
  role: string;
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
  role: string;
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
  role: string;
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
  buyerRole: string;
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

// ─── اندپوینت‌ها ───

export const authApi = {
  login: (body: { phone: string; password: string }) =>
    api<AuthResponseDto>("/auth/login", { method: "POST", body, auth: false }),
  register: (body: { name: string; phone: string; password: string }) =>
    api<AuthResponseDto>("/auth/register", { method: "POST", body, auth: false }),
  refresh: () => api<AuthResponseDto>("/auth/refresh", { method: "POST", auth: false }),
  logout: () => api<{ ok: boolean }>("/auth/logout", { method: "POST" }),
  me: () => api<{ user: UserDto; businesses: BusinessSummaryDto[] }>("/auth/me"),
};

export const goodsApi = {
  list: (params: { q?: string; category?: string; cursor?: string; limit?: number }) =>
    api<PageDto<GoodDto>>("/goods", { params, auth: false }),
  categories: () => api<string[]>("/goods/categories", { auth: false }),
};

export const businessesApi = {
  mine: () => api<(BusinessSummaryDto & { _count: { listings: number } })[]>("/businesses/mine"),
  create: (body: { name: string; role: string; city: string; phone?: string }) =>
    api<BusinessSummaryDto & { slug: string }>("/businesses", { method: "POST", body }),
  profile: (slug: string) => api<BusinessProfileDto>(`/businesses/${slug}`, { auth: false }),
};

export const listingsApi = {
  mine: (businessId: string) =>
    api<GoodItemDto[]>("/listings/mine", { params: { businessId } }),
  upsert: (body: {
    businessId: string;
    goodId: string;
    mode: string;
    sell?: { price: number; stock: number; minOrder: number };
    buy?: { volume: number; frequency: string };
  }) => api<GoodItemDto>("/listings", { method: "PUT", body }),
  remove: (id: string) => api<{ ok: boolean }>(`/listings/${id}`, { method: "DELETE" }),
};

export const marketApi = {
  quoteRequest: (listingId: string, note?: string) =>
    api<QuoteRequestResultDto>(`/market/listings/${listingId}/quote-request`, {
      method: "POST",
      body: note ? { note } : {},
    }),
  offers: (businessId: string) =>
    api<PageDto<OfferDto>>("/market/offers", { params: { businessId, limit: 100 } }),
  inquiries: (businessId: string) =>
    api<InquiryPageDto>("/market/inquiries", { params: { businessId, limit: 50 } }),
  markInquiryRead: (id: string) =>
    api<{ ok: boolean }>(`/market/inquiries/${id}/read`, { method: "POST" }),
  sendOffer: (body: { inquiryId: string; price: number; note?: string }) =>
    api<OfferDto>("/market/offers", { method: "POST", body }),
  follows: (businessId: string) => api<FollowDto[]>("/market/follows", { params: { businessId } }),
  follow: (businessId: string, supplierId: string) =>
    api<{ ok: boolean }>("/market/follows", { method: "POST", body: { businessId, supplierId } }),
  unfollow: (businessId: string, supplierId: string) =>
    api<{ ok: boolean }>(`/market/follows/${supplierId}`, {
      method: "DELETE",
      params: { businessId },
    }),
  board: (businessId: string) => api<BoardRowDto[]>("/market/board", { params: { businessId } }),
  suggestions: (businessId: string) =>
    api<SuggestionDto[]>("/market/suggestions", { params: { businessId } }),
};
