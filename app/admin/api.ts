"use client";

import { api } from "@/lib/api";
import { useQuery, useQueryClient, useInfiniteQuery, useMutation } from "@tanstack/react-query";

/*
 * لایه API پنل ادمین — فیزیکی جدا از lib/api.ts تا روز انتقال، یک‌جا جابه‌جا شود.
 * فقط کلاینت پایه (api) و کامپوننت‌های ui مشترک از بیرون می‌آید.
 */

// ── DTO ها ───────────────────────────────────────────────────────────────────

export interface AdminStatsDto {
  goods: number;
  provisional: number;
  userGoods: number;
  listings: number;
  buyListings: number;
  businesses: number;
  users: number;
  brands: number;
}

export interface AdminGoodDto {
  id: string;
  nameFa: string;
  nameEn: string | null;
  aliases: string[];
  unit: string;
  source: "SEED" | "USER";
  status: "ACTIVE" | "PROVISIONAL";
  category: { id: string; slug: string; nameFa: string; nameEn: string };
  _count: { listings: number };
}

export interface AdminBrandDto {
  id: string;
  name: string;
  source: "SEED" | "USER";
  _count: { listings: number };
}

export interface PageDto<T> {
  items: T[];
  nextCursor: string | null;
}

export interface AdminGoodInput {
  nameFa: string;
  nameEn?: string;
  aliases?: string[];
  unit: string;
  categoryId: string;
}

// ── فراخوانی‌ها ──────────────────────────────────────────────────────────────

export const adminApi = {
  getStats: () => api<AdminStatsDto>("/admin/getStats"),

  getGoods: (params: {
    q?: string;
    status?: string;
    source?: string;
    cursor?: string;
    limit?: number;
  }) => api<PageDto<AdminGoodDto>>("/admin/getGoods", { params }),

  createGood: (body: AdminGoodInput) =>
    api<AdminGoodDto>("/admin/createGood", { method: "POST", body }),

  editGood: (
    id: string,
    body: Partial<AdminGoodInput & { status: "ACTIVE" | "PROVISIONAL" }>
  ) => api<AdminGoodDto>(`/admin/editGood/${id}`, { method: "PATCH", body }),

  mergeGood: (id: string, targetId: string) =>
    api<{ ok: boolean }>(`/admin/mergeGood/${id}`, { method: "POST", body: { targetId } }),

  deleteGood: (id: string) =>
    api<{ ok: boolean }>(`/admin/deleteGood/${id}`, { method: "DELETE" }),

  getBrands: (params: { q?: string; cursor?: string; limit?: number }) =>
    api<PageDto<AdminBrandDto>>("/admin/getBrands", { params }),

  mergeBrand: (id: string, targetId: string) =>
    api<{ ok: boolean }>(`/admin/mergeBrand/${id}`, { method: "POST", body: { targetId } }),

  deleteBrand: (id: string) =>
    api<{ ok: boolean }>(`/admin/deleteBrand/${id}`, { method: "DELETE" }),
};

// ── هوک‌ها ───────────────────────────────────────────────────────────────────

export const ak = {
  stats: ["admin", "stats"] as const,
  goods: (params: { q?: string; status?: string; source?: string }) =>
    ["admin", "goods", params] as const,
  brands: (params: { q?: string }) => ["admin", "brands", params] as const,
};

export function useAdminStats() {
  return useQuery({ queryKey: ak.stats, queryFn: adminApi.getStats, staleTime: 15_000 });
}

/** صفحه‌بندی بی‌نهایت روی کالاهای مرجع — فیلترها از URL می‌آیند. */
export function useAdminGoods(params: { q?: string; status?: string; source?: string }) {
  return useInfiniteQuery({
    queryKey: ak.goods(params),
    queryFn: ({ pageParam }) =>
      adminApi.getGoods({ ...params, q: params.q || undefined, cursor: pageParam || undefined, limit: 30 }),
    initialPageParam: "",
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });
}

export function useAdminBrands(params: { q?: string }) {
  return useInfiniteQuery({
    queryKey: ak.brands(params),
    queryFn: ({ pageParam }) =>
      adminApi.getBrands({ q: params.q || undefined, cursor: pageParam || undefined, limit: 30 }),
    initialPageParam: "",
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });
}

/** بیخ‌کننده‌ی کش ادمین — بعد از هر جهش همه‌ی صفحات پنل تازه می‌شوند. */
export function useAdminInvalidate() {
  const qc = useQueryClient();
  return () => {
    void qc.invalidateQueries({ queryKey: ["admin"] });
  };
}

/** جهش ادمین — همه‌ی فراخوانی‌ها بی‌آرگومان‌اند؛ موفقیت = بیخ کش ادمین. */
export function useAdminMutation(fn: () => Promise<unknown>, onSuccess?: () => void) {
  const invalidate = useAdminInvalidate();
  return useMutation({
    mutationFn: () => fn(),
    onSuccess: () => {
      invalidate();
      onSuccess?.();
    },
  });
}
