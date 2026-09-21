"use client";

import { api } from "@/lib/api";
import { useQuery, useQueryClient, useInfiniteQuery, useMutation } from "@tanstack/react-query";

/*
 * لایه API پنل ادمین — فیزیکی جدا از lib/api.ts تا روز انتقال، یک‌جا جابه‌جا شود.
 * فقط کلاینت پایه (api) و کامپوننت‌های ui مشترک از بیرون می‌آید.
 * مسیرها آینه‌ی کنترلرهای src/admin/<entity> بک‌اند هستند.
 */

// ── DTO ها ───────────────────────────────────────────────────────────────────

export type AdminStatus = "ACTIVE" | "PROVISIONAL";
export type AdminCreator = "USER" | "ADMIN" | "BRAND_OWNER";

export interface AdminStatsDto {
  goods: number;
  provisional: number;
  userGoods: number;
  pendingBrands: number;
  listings: number;
  buyListings: number;
  businesses: number;
  users: number;
  brands: number;
  categories: number;
}

export interface AdminGoodDto {
  id: string;
  nameFa: string;
  nameEn: string | null;
  aliases: string[];
  unit: string;
  source: "SEED" | "USER";
  status: AdminStatus;
  creatorRole: AdminCreator | null;
  createdBy: { id: string; name: string } | null;
  category: { id: string; slug: string; nameFa: string; nameEn: string };
  _count: { listings: number };
}

export interface AdminBrandDto {
  id: string;
  name: string;
  source: "SEED" | "USER";
  status: AdminStatus;
  creatorRole: AdminCreator | null;
  createdBy: { id: string; name: string } | null;
  _count: { listings: number };
}

export interface AdminCategoryNodeDto {
  id: string;
  slug: string;
  nameFa: string;
  nameEn: string;
  direct: number;
  total: number;
  children: AdminCategoryNodeDto[];
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
  getStats: () => api<AdminStatsDto>("/admin/overview/getStats"),

  getGoods: (params: {
    q?: string;
    status?: string;
    creator?: string;
    categoryId?: string;
    cursor?: string;
    limit?: number;
  }) => api<PageDto<AdminGoodDto>>("/admin/goods/list", { params }),

  createGood: (body: AdminGoodInput) =>
    api<AdminGoodDto>("/admin/goods/create", { method: "POST", body }),

  editGood: (
    id: string,
    body: Partial<AdminGoodInput & { status: AdminStatus }>
  ) => api<AdminGoodDto>(`/admin/goods/edit/${id}`, { method: "PATCH", body }),

  mergeGood: (id: string, targetId: string) =>
    api<{ ok: boolean }>(`/admin/goods/merge/${id}`, { method: "POST", body: { targetId } }),

  deleteGood: (id: string) =>
    api<{ ok: boolean }>(`/admin/goods/delete/${id}`, { method: "DELETE" }),

  getBrands: (params: { q?: string; status?: string; cursor?: string; limit?: number }) =>
    api<PageDto<AdminBrandDto>>("/admin/brands/list", { params }),

  createBrand: (name: string) =>
    api<AdminBrandDto>("/admin/brands/create", { method: "POST", body: { name } }),

  editBrand: (id: string, body: { status?: AdminStatus }) =>
    api<AdminBrandDto>(`/admin/brands/edit/${id}`, { method: "PATCH", body }),

  mergeBrand: (id: string, targetId: string) =>
    api<{ ok: boolean }>(`/admin/brands/merge/${id}`, { method: "POST", body: { targetId } }),

  deleteBrand: (id: string) =>
    api<{ ok: boolean }>(`/admin/brands/delete/${id}`, { method: "DELETE" }),

  getCategoryTree: () => api<AdminCategoryNodeDto[]>("/admin/categories/tree"),
};

// ── هوک‌ها ───────────────────────────────────────────────────────────────────

export const ak = {
  stats: ["admin", "stats"] as const,
  goods: (params: { q?: string; status?: string; creator?: string; categoryId?: string }) =>
    ["admin", "goods", params] as const,
  brands: (params: { q?: string; status?: string }) => ["admin", "brands", params] as const,
  categories: ["admin", "categories"] as const,
};

export function useAdminStats() {
  return useQuery({ queryKey: ak.stats, queryFn: adminApi.getStats, staleTime: 15_000 });
}

/** صفحه‌بندی بی‌نهایت روی کالاهای مرجع — فیلترها از URL می‌آیند. */
export function useAdminGoods(params: {
  q?: string;
  status?: string;
  creator?: string;
  categoryId?: string;
}) {
  return useInfiniteQuery({
    queryKey: ak.goods(params),
    queryFn: ({ pageParam }) =>
      adminApi.getGoods({ ...params, q: params.q || undefined, cursor: pageParam || undefined, limit: 30 }),
    initialPageParam: "",
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });
}

/** صفحه‌بندی بی‌نهایت روی برندها — فیلتر وضعیت از URL می‌آید. */
export function useAdminBrands(params: { q?: string; status?: string }) {
  return useInfiniteQuery({
    queryKey: ak.brands(params),
    queryFn: ({ pageParam }) =>
      adminApi.getBrands({ q: params.q || undefined, status: params.status || undefined, cursor: pageParam || undefined, limit: 30 }),
    initialPageParam: "",
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });
}

/** درخت کامل دسته‌بندی‌ها با شمارش کالاها — برای صفحه اطلاعات پایه. */
export function useAdminCategories() {
  return useQuery({ queryKey: ak.categories, queryFn: adminApi.getCategoryTree, staleTime: 60_000 });
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
