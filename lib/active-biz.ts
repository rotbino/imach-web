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
