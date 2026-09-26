"use client";

import { useMutation, useQuery, useQueryClient, type UseQueryResult } from "@tanstack/react-query";
import {
  authApi,
  businessesApi,
  contactsApi,
  filesApi,
  goodsApi,
  listingsApi,
  marketApi,
  notificationsApi,
  productsApi,
  type BoardRowDto,
  type BusinessProfileDto,
  type BusinessSummaryDto,
  type CategoryNodeDto,
  type ContactRowDto,
  type CustomerRowDto,
  type ExploreItemDto,
  type FileDto,
  type FollowDto,
  type GoodDto,
  type GoodItemDto,
  type InquiryPageDto,
  type MarketItemDto,
  type MarketStateDto,
  type NotificationsPageDto,
  type OfferDto,
  type PageDto,
  type ProductPageDto,
  type QuoteRequestResultDto,
  type SupplierSuggestionDto,
} from "./api";
import { useAuthStore } from "./auth-store";

/**
 * Server-state hooks (TanStack Query).
 * staleTime is tuned per resource; mutations invalidate the tags they touch.
 * All authenticated queries wait for `status === "authed"` and enable on the
 * first owned business.
 */

// ── کلیدها ──
export const qk = {
  goods: (params: { q?: string; categoryId?: string }) => ["goods", params] as const,
  categories: () => ["goods", "categories"] as const,
  brands: (q?: string) => ["goods", "brands", q ?? ""] as const,
  businessProfile: (slug: string) => ["business", slug] as const,
  explore: (mode: string, city?: string) => ["explore", mode, city ?? ""] as const,
  buyRequests: (bizId: string) => ["market", "buyRequests", bizId] as const,
  myBusinesses: () => ["businesses", "mine"] as const,
  myListings: (bizId: string) => ["listings", bizId] as const,
  offers: (bizId: string) => ["market", "offers", bizId] as const,
  inquiries: (bizId: string) => ["market", "inquiries", bizId] as const,
  follows: (bizId: string) => ["market", "follows", bizId] as const,
  myFollowers: (bizId: string) => ["market", "myFollowers", bizId] as const,
  board: (bizId: string) => ["market", "board", bizId] as const,
  supplierSuggestions: (bizId: string) => ["market", "supplierSuggestions", bizId] as const,
  marketState: (bizId: string) => ["market", "state", bizId] as const,
  contacts: () => ["contacts"] as const,
  notifications: () => ["notifications"] as const,
};

// ── پابلیک ──

/** جستجوی کالای مرجع — فرم ثبت کالا (debounce در فرم اعمال می‌شود) */
export function useGoods(params: { q?: string; categoryId?: string; limit?: number }): UseQueryResult<PageDto<GoodDto>> {
  return useQuery({
    queryKey: qk.goods(params),
    queryFn: () => goodsApi.getGoods(params),
    staleTime: 5 * 60_000,
    enabled: !!(params.q?.trim() || params.categoryId),
  });
}

/** درخت دسته‌بندی‌ها (fa/en) */
export function useCategories(): UseQueryResult<CategoryNodeDto[]> {
  return useQuery({
    queryKey: qk.categories(),
    queryFn: () => goodsApi.getCategories(),
    staleTime: 5 * 60_000,
  });
}

/** پیشنهاد برند — برای فیلد اختیاری برند در فرم ثبت کالا */
export function useBrands(q: string | null): UseQueryResult<{ id: string; name: string }[]> {
  return useQuery({
    queryKey: qk.brands(q ?? undefined),
    queryFn: () => goodsApi.getBrands(q ?? undefined),
    staleTime: 5 * 60_000,
    enabled: q !== null && q.trim().length >= 1,
  });
}

/** ثبت کالای مرجع جدید — مسیر رشد پنهان کاتالوگ */
export function useCreateGood() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: goodsApi.createGood,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["goods"] });
    },
  });
}

/**
 * فید انتخابگر کاتالوگ مرجع — برگه‌بندی مکانی با نشان‌های فروشنده/داریش.
 * درون انتخابگر صفحه‌بندی می‌شود (cursor در کلید).
 *
 * نوار برند و نوار دسته هم همین‌جا برمی‌گردند — از همان scope فعلی (نه بعد
 * از فیلتر برند/دسته) تا با تغییر فیلتر، نوار ثابت بماند.
 */
export function useProducts(params: {
  businessId: string;
  q?: string;
  categoryId?: string;
  goodId?: string;
  /** فیلتر برند — راهِ سریعِ رسیدن به لیستِ مناسب کسب‌وکار */
  brandId?: string;
  cursor?: string;
  limit?: number;
  enabled?: boolean;
}): UseQueryResult<ProductPageDto> {
  return useQuery({
    queryKey: ["products", params.businessId, params.q ?? "", params.categoryId ?? "", params.goodId ?? "", params.brandId ?? "", params.cursor ?? ""],
    queryFn: () =>
      productsApi.getProducts({
        businessId: params.businessId,
        q: params.q,
        categoryId: params.categoryId,
        goodId: params.goodId,
        brandId: params.brandId,
        cursor: params.cursor,
        limit: params.limit,
      }),
    enabled: params.enabled !== false && !!params.businessId,
    staleTime: 30_000,
  });
}

/** ثبت گروهی انتخابگر — یک تأیید، N آگهی */
export function useBulkSaveListings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: listingsApi.bulkSave,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["listings"] });
      void qc.invalidateQueries({ queryKey: ["business"] });
      void qc.invalidateQueries({ queryKey: ["market"] });
      void qc.invalidateQueries({ queryKey: ["products"] });
    },
  });
}

export function useBusinessProfile(slug: string): UseQueryResult<BusinessProfileDto> {
  return useQuery({
    queryKey: qk.businessProfile(slug),
    queryFn: () => businessesApi.getBusiness(slug),
    staleTime: 60_000,
    enabled: !!slug,
  });
}

/**
 * اکسپلور — کالاهای خرید و فروش همه کسب‌وکارها.
 * چیدمان ساده v۰ (سمت بک‌اند): شهرِ من اول، بعد حجم/تازگی.
 */
export function useExploreFeed(mode: "SELL" | "BUY", city?: string): UseQueryResult<ExploreItemDto[]> {
  return useQuery({
    queryKey: qk.explore(mode, city),
    queryFn: () => businessesApi.getExplore({ mode, city }),
    staleTime: 60_000,
  });
}

/** تقاضای مرتبط با کالاهای من — جریان تقاضای کارتابل فروش */
export function useBuyRequests(businessId: string | null | undefined): UseQueryResult<MarketItemDto[]> {
  return useQuery({
    queryKey: qk.buyRequests(businessId ?? ""),
    queryFn: () => marketApi.getBuyRequests(businessId as string),
    enabled: !!businessId,
    staleTime: 60_000,
  });
}

// ── احرازشده: کسب‌وکار و آگهی‌ها ──

/** کسب‌وکارهای کاربر جاری */
export function useMyBusinesses(): UseQueryResult<(BusinessSummaryDto & { _count: { listings: number } })[]> {
  return useQuery({
    queryKey: qk.myBusinesses(),
    queryFn: () => businessesApi.getMyBusinesses(),
    enabled: useAuthStore((s) => s.status) === "authed",
    staleTime: 5 * 60_000,
  });
}

export function useMyListings(businessId: string | null | undefined): UseQueryResult<GoodItemDto[]> {
  return useQuery({
    queryKey: qk.myListings(businessId ?? ""),
    queryFn: () => listingsApi.getMyListings(businessId as string),
    enabled: !!businessId,
    staleTime: 60_000,
  });
}

export function useCreateBusiness() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: businessesApi.createBusiness,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["businesses"] });
    },
  });
}

export function useSaveListing() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: listingsApi.saveListing,
    onSuccess: (listing) => {
      void qc.invalidateQueries({ queryKey: ["listings"] });
      void qc.invalidateQueries({ queryKey: ["business"] });
      void qc.invalidateQueries({ queryKey: ["market"] });
      return listing;
    },
  });
}

export function useDeleteListing() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: listingsApi.deleteListing,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["listings"] });
      void qc.invalidateQueries({ queryKey: ["business"] });
      void qc.invalidateQueries({ queryKey: ["market"] });
    },
  });
}

/** ویرایش کسب‌وکار از پنل (نام، شهر، نوع فعالیت) */
export function useEditBusiness() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      ...body
    }: {
      id: string;
      name?: string;
      city?: string;
      activityType?: string | null;
      trade?: string | null;
      lat?: number | null;
      lng?: number | null;
      address?: string | null;
    }) => businessesApi.editBusiness(id, body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["businesses"] });
      void qc.invalidateQueries({ queryKey: ["business"] });
    },
  });
}

/** ویرایش پروفایل مالک (نام و نام خانوادگی) — در ویترین کاتالوگ نشان داده می‌شود */
export function useEditProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: authApi.editProfile,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["businesses"] });
      void qc.invalidateQueries({ queryKey: ["business"] });
      void qc.invalidateQueries({ queryKey: ["me"] });
    },
  });
}

// ── بازار: استعلام، پیشنهاد، دنبال کردن، تابلو ──

export function useQuoteRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ listingId, note }: { listingId: string; note?: string }) =>
      marketApi.requestQuote(listingId, note),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["market"] });
    },
  });
}

export function useOffers(businessId: string | null | undefined): UseQueryResult<PageDto<OfferDto>> {
  return useQuery({
    queryKey: qk.offers(businessId ?? ""),
    queryFn: () => marketApi.getOffers(businessId as string),
    enabled: !!businessId,
    staleTime: 15_000,
  });
}

export function useIncomingInquiries(businessId: string | null | undefined): UseQueryResult<InquiryPageDto> {
  return useQuery({
    queryKey: qk.inquiries(businessId ?? ""),
    queryFn: () => marketApi.getInquiries(businessId as string),
    enabled: !!businessId,
    staleTime: 15_000,
  });
}

export function useMarkInquiryRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => marketApi.markInquiryRead(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["market", "inquiries"] });
    },
  });
}

export function useSendOffer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: marketApi.sendOffer,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["market"] });
    },
  });
}

export function useFollows(businessId: string | null | undefined): UseQueryResult<FollowDto[]> {
  return useQuery({
    queryKey: qk.follows(businessId ?? ""),
    queryFn: () => marketApi.getFollows(businessId as string),
    enabled: !!businessId,
    staleTime: 60_000,
  });
}

export function useFollowToggle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ businessId, supplierId, follow }: { businessId: string; supplierId: string; follow: boolean }) =>
      follow ? marketApi.followSupplier(businessId, supplierId) : marketApi.unfollowSupplier(businessId, supplierId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["market"] });
    },
  });
}

export function useBoard(businessId: string | null | undefined): UseQueryResult<BoardRowDto[]> {
  return useQuery({
    queryKey: qk.board(businessId ?? ""),
    queryFn: () => marketApi.getPriceBoard(businessId as string),
    enabled: !!businessId,
    staleTime: 30_000,
  });
}

/** تامین‌کننده‌های پیشنهادی برای نیازهای خرید من — موتور دنبال کردن سمت خرید */
export function useSupplierSuggestions(businessId: string | null | undefined): UseQueryResult<SupplierSuggestionDto[]> {
  return useQuery({
    queryKey: qk.supplierSuggestions(businessId ?? ""),
    queryFn: () => marketApi.getSupplierSuggestions(businessId as string),
    enabled: !!businessId,
    staleTime: 60_000,
  });
}

/** مشتریان من — خریدارهایی که کاتالوگ من را دنبال می‌کنند (غنی + مرتب‌شده) */
export function useMyFollowers(businessId: string | null | undefined): UseQueryResult<CustomerRowDto[]> {
  return useQuery({
    queryKey: qk.myFollowers(businessId ?? ""),
    queryFn: () => marketApi.getMyFollowers(businessId as string),
    enabled: !!businessId,
    staleTime: 60_000,
  });
}

/** حذف یک فالوور از لیست مشتریان من (فالوور بی‌ارزش) */
export function useRemoveFollower() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ businessId, followerBusinessId }: { businessId: string; followerBusinessId: string }) =>
      marketApi.removeFollower(businessId, followerBusinessId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["market"] });
    },
  });
}

/** وضعیت گیت رشد برای بازار خریدارها (بازوی فروش) */
export function useMarketState(businessId: string | null | undefined): UseQueryResult<MarketStateDto> {
  return useQuery({
    queryKey: qk.marketState(businessId ?? ""),
    queryFn: () => marketApi.getMarketState(businessId as string),
    enabled: !!businessId,
    staleTime: 30_000,
  });
}

/** فالو/آنفالوی خریدار از بازار (فالو پشت گیت ۱۰ معرف است) */
export function useFollowBuyerToggle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ businessId, buyerId, follow }: { businessId: string; buyerId: string; follow: boolean }) =>
      follow ? marketApi.followBuyer(businessId, buyerId) : marketApi.unfollowBuyer(businessId, buyerId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["market"] });
    },
  });
}

/** پیشنهاد قیمت مستقیم روی درخواست خرید (پشت گیت ۱۰ معرف) */
export function useOfferBuyRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: marketApi.offerBuyRequest,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["market"] });
    },
  });
}

// ── گیت اشتراک مخاطبین — دفترچه‌ی تلفن کاربر ──

/** مخاطبین من — اعضا اول؛ فقط برای کاربر واردشده فعال است */
export function useContacts(): UseQueryResult<ContactRowDto[]> {
  const authed = useAuthStore((s) => s.status) === "authed";
  return useQuery({
    queryKey: qk.contacts(),
    queryFn: () => contactsApi.getContacts(),
    enabled: authed,
    staleTime: 30_000,
  });
}

/** همگام‌سازی دسته‌ای مخاطبین (انتخاب از گوشی یا ورود دستی) */
export function useSyncContacts() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: contactsApi.sync,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["contacts"] });
    },
  });
}

/** ثبت دعوت یک مخاطب — «این مخاطب دعوت شده» */
export function useInviteContact() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => contactsApi.invite(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["contacts"] });
    },
  });
}

// ── زنگ اعلان‌ها ──

/**
 * فید اعلان‌ها + شمارنده‌ی نخوانده‌ها — پولینگ ۳۰ ثانیه‌ای مادام که کاربر
 * وارد است؛ زنده بودن زنگ بخشی از خودش است.
 */
export function useNotifications(): UseQueryResult<NotificationsPageDto> {
  const authed = useAuthStore((s) => s.status) === "authed";
  return useQuery({
    queryKey: qk.notifications(),
    queryFn: () => notificationsApi.getNotifications(),
    enabled: authed,
    staleTime: 15_000,
    refetchInterval: 30_000,
  });
}

/** همه خوانده شد — موقع باز شدن پنل زنگ */
export function useReadAllNotifications() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: notificationsApi.readAll,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}


// ── فایل‌ها — آپلود/حذف عکس (آواتار، لوگو، گالری آگهی) ────────────────────────

/** آپلود با فشرده‌سازی پیش‌فرض سمت کلاینت؛ onSuccess سبک‌های مرتبط را باطل می‌کند */
export function useUploadFile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (opts: {
      file: File;
      model: "User" | "Business" | "Listing";
      modelId?: string;
      key: string;
      description?: string;
      replace?: boolean;
      /** درصد ۰–۱۰۰ + فاز حین آپلود — برای حلقه‌ی پیشرفت زنده (UploadRing) */
      onProgress?: (pct: number, phase: "sending" | "processing") => void;
    }) => filesApi.upload(opts),
    onSuccess: (_data, opts) => {
      // همان قرارداد بقیه‌ی هوک‌ها: پیشوندهای کلید کافی‌اند تا همه‌ی صفحات
      // مرتبط تازه شوند. «business» = پروفایل عمومی کاتالوگ (arm-views) —
      // بدون آن عکس تازه تا سقف staleTime در کاتالوگ دیده نمی‌شود
      // (خواسته‌ی کاربر: «بلافاصله بعد از ثبت کالا عکس در کاتالوگ دیده بشه»)
      if (opts.model === "Listing") {
        void queryClient.invalidateQueries({ queryKey: ["listings"] });
        void queryClient.invalidateQueries({ queryKey: ["business"] });
      }
      if (opts.model === "Business") {
        void queryClient.invalidateQueries({ queryKey: ["business"] });
        void queryClient.invalidateQueries({ queryKey: ["businesses"] });
      }
      if (opts.model === "User") void queryClient.invalidateQueries({ queryKey: ["me"] });
    },
  });
}

/** حذف فایل از سرور و ابر — عکس سرگردان باقی نمی‌ماند */
export function useRemoveFile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => filesApi.remove(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["listings"] });
      void queryClient.invalidateQueries({ queryKey: ["business"] });
      void queryClient.invalidateQueries({ queryKey: ["me"] });
    },
  });
}

export type { FileDto };


/**
 * اسلات‌های تکی ۴۰۴-محتمل‌اند (کاربر هنوز عکس نگذاشته) — retry خاموش و
 * خطا = «بدون عکس» تا کاشی حرفی آرام جایگزین شود.
 */
function useFileSlot(model: "User" | "Business", modelId: string | null | undefined, key: string) {
  return useQuery({
    queryKey: ["file", model, key, modelId ?? ""],
    queryFn: () => filesApi.getUrl(model, modelId!, key),
    enabled: !!modelId,
    retry: false,
    staleTime: 60_000,
  });
}

/** عکس پروفایل کاربر فعلی */
export function useMyAvatar(userId: string | null | undefined) {
  const q = useFileSlot("User", userId, "avatar");
  return { ...q, data: q.error ? null : (q.data ?? null) };
}

/** لوگوی یک کسب‌وکار (پنل تنظیمات) */
export function useBusinessLogo(bizId: string | null | undefined) {
  const q = useFileSlot("Business", bizId, "logo");
  return { ...q, data: q.error ? null : (q.data ?? null) };
}
