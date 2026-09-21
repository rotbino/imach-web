"use client";

import { create } from "zustand";
import { useMyBusinesses } from "./queries";
import type { BusinessSummaryDto } from "./api";

/**
 * کسب‌وکار فعال — همان چیزی که آیتم‌های نویگیشن (بازوی فروش / کالای جدید /
 * بازوی خرید) به آن اشاره می‌کنند. مثل اینستاگرام: یک هویت جاری در طول
 * نشست؛ با دراپ‌داون پنل عوض می‌شود و بعد از رفرش به اولین کسب‌وکار برمی‌گردد.
 */

interface ActiveBizState {
  activeId: string | null;
  setActive: (id: string) => void;
}

export const useActiveBizStore = create<ActiveBizState>((set) => ({
  activeId: null,
  setActive: (id) => set({ activeId: id }),
}));

/** کسب‌وکار جاری کاربر — null یعنی هنوز کسب‌وکاری ندارد (یا در حال بارگذاری است) */
export function useActiveBusiness(): BusinessSummaryDto | null {
  const q = useMyBusinesses();
  const mine = q.data ?? [];
  const activeId = useActiveBizStore((s) => s.activeId);
  return mine.find((b) => b.id === activeId) ?? mine[0] ?? null;
}

/**
 * خانه‌ی کاربرِ واردشده = «بازوی من» — ویترین عمومی خودش با سوییچر خرید/فروش.
 * بدون کسب‌وکار → مسیر ساخت کسب‌وکار.
 */
export function myArmHref(): string {
  return "/arm";
}

/** مدیریت بازوها — داشبورد سبک هر بازو (جدا از نمای عمومی) */
export function manageHref(kind: "sell" | "buy"): string {
  return kind === "sell" ? "/manage/sell" : "/manage/buy";
}
