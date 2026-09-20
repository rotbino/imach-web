"use client";

import { useMutation, useQuery, useQueryClient, type UseQueryResult } from "@tanstack/react-query";
import {
  businessesApi,
  goodsApi,
  listingsApi,
  marketApi,
  type BoardRowDto,
  type BusinessProfileDto,
  type BusinessSummaryDto,
  type FollowDto,
  type GoodDto,
  type GoodItemDto,
  type InquiryPageDto,
  type OfferDto,
  type PageDto,
  type QuoteRequestResultDto,
  type SuggestionDto,
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
  goods: (params: { q?: string; category?: string }) => ["goods", params] as const,
  categories: () => ["goods", "categories"] as const,
  businessProfile: (slug: string) => ["business", slug] as const,
  myBusinesses: () => ["businesses", "mine"] as const,
  myListings: (bizId: string) => ["listings", bizId] as const,
  offers: (bizId: string) => ["market", "offers", bizId] as const,
  inquiries: (bizId: string) => ["market", "inquiries", bizId] as const,
  follows: (bizId: string) => ["market", "follows", bizId] as const,
  board: (bizId: string) => ["market", "board", bizId] as const,
  suggestions: (bizId: string) => ["market", "suggestions", bizId] as const,
};

// ── پابلیک ──

export function useGoods(params: { q?: string; category?: string; limit?: number }): UseQueryResult<PageDto<GoodDto>> {
  return useQuery({
    queryKey: qk.goods(params),
    queryFn: () => goodsApi.getGoods(params),
    staleTime: 5 * 60_000,
  });
}

export function useCategories(): UseQueryResult<string[]> {
  return useQuery({
    queryKey: qk.categories(),
    queryFn: () => goodsApi.getCategories(),
    staleTime: 5 * 60_000,
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

/** اولین کسب‌وکار کاربر (MVP: یک کسب‌وکار) */
export function useMyBusiness(): BusinessSummaryDto | null {
  const q = useMyBusinesses();
  return q.data?.[0] ?? null;
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
    mutationFn: ({ id, ...body }: { id: string; name?: string; city?: string; activityType?: string | null }) =>
      businessesApi.editBusiness(id, body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["businesses"] });
      void qc.invalidateQueries({ queryKey: ["business"] });
    },
  });
}

// ── بازار: استعلام، پیشنهاد، فالو، تابلو ──

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

export function useSuggestions(businessId: string | null | undefined): UseQueryResult<SuggestionDto[]> {
  return useQuery({
    queryKey: qk.suggestions(businessId ?? ""),
    queryFn: () => marketApi.getSuggestions(businessId as string),
    enabled: !!businessId,
    staleTime: 60_000,
  });
}
