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
    queryFn: () => goodsApi.list(params),
    staleTime: 5 * 60_000,
  });
}

export function useCategories(): UseQueryResult<string[]> {
  return useQuery({
    queryKey: qk.categories(),
    queryFn: () => goodsApi.categories(),
    staleTime: 5 * 60_000,
  });
}

export function useBusinessProfile(slug: string): UseQueryResult<BusinessProfileDto> {
  return useQuery({
    queryKey: qk.businessProfile(slug),
    queryFn: () => businessesApi.profile(slug),
    staleTime: 60_000,
    enabled: !!slug,
  });
}

// ── احرازشده: کسب‌وکار و آگهی‌ها ──

/** کسب‌وکارهای کاربر جاری */
export function useMyBusinesses(): UseQueryResult<(BusinessSummaryDto & { _count: { listings: number } })[]> {
  return useQuery({
    queryKey: qk.myBusinesses(),
    queryFn: () => businessesApi.mine(),
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
    queryFn: () => listingsApi.mine(businessId as string),
    enabled: !!businessId,
    staleTime: 60_000,
  });
}

export function useUpsertListing() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: listingsApi.upsert,
    onSuccess: (listing) => {
      void qc.invalidateQueries({ queryKey: ["listings"] });
      void qc.invalidateQueries({ queryKey: ["business"] });
      void qc.invalidateQueries({ queryKey: ["market"] });
      return listing;
    },
  });
}

// ── بازار: استعلام، پیشنهاد، فالو، تابلو ──

export function useQuoteRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ listingId, note }: { listingId: string; note?: string }) =>
      marketApi.quoteRequest(listingId, note),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["market"] });
    },
  });
}

export function useOffers(businessId: string | null | undefined): UseQueryResult<PageDto<OfferDto>> {
  return useQuery({
    queryKey: qk.offers(businessId ?? ""),
    queryFn: () => marketApi.offers(businessId as string),
    enabled: !!businessId,
    staleTime: 15_000,
  });
}

export function useIncomingInquiries(businessId: string | null | undefined): UseQueryResult<InquiryPageDto> {
  return useQuery({
    queryKey: qk.inquiries(businessId ?? ""),
    queryFn: () => marketApi.inquiries(businessId as string),
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
    queryFn: () => marketApi.follows(businessId as string),
    enabled: !!businessId,
    staleTime: 60_000,
  });
}

export function useFollowToggle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ businessId, supplierId, follow }: { businessId: string; supplierId: string; follow: boolean }) =>
      follow ? marketApi.follow(businessId, supplierId) : marketApi.unfollow(businessId, supplierId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["market"] });
    },
  });
}

export function useBoard(businessId: string | null | undefined): UseQueryResult<BoardRowDto[]> {
  return useQuery({
    queryKey: qk.board(businessId ?? ""),
    queryFn: () => marketApi.board(businessId as string),
    enabled: !!businessId,
    staleTime: 30_000,
  });
}

export function useSuggestions(businessId: string | null | undefined): UseQueryResult<SuggestionDto[]> {
  return useQuery({
    queryKey: qk.suggestions(businessId ?? ""),
    queryFn: () => marketApi.suggestions(businessId as string),
    enabled: !!businessId,
    staleTime: 60_000,
  });
}
