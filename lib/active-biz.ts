"use client";

import { useEffect } from "react";
import { create } from "zustand";
import { useMyBusinesses } from "./queries";
import type { BusinessSummaryDto } from "./api";

/**
 * کسب‌وکار فعال — صاحب صفحه‌ها. مثل اینستاگرام: یک هویت جاری در طول نشست؛
 * با دراپ‌داون عوض می‌شود و بعد از رفرش به اولین کسب‌وکار برمی‌گردد.
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

// ─── بازوها — دو صفحه‌ی حساب، مثل پیج‌های اینستاگرام (سند فصل ۴) ───
// • کاتالوگ فروش من (sell) — بازوی فروشنده
// • دستیار خرید (buy) — بازوی خریدار
// بازو از مسیر فعلی خوانده می‌شود؛ در صفحات مشترک از آخرین بازوی
// باز‌شده (localStorage) که با ورود اولین کالا تعیین شده است.

export type Arm = "sell" | "buy";

const ARM_KEY = "imach.arm";

export function storedArm(): Arm {
  if (typeof window === "undefined") return "sell";
  return window.localStorage.getItem(ARM_KEY) === "buy" ? "buy" : "sell";
}

interface ArmState {
  arm: Arm;
  /** تعویض بازو — هم استور و هم localStorage را به‌روز می‌کند */
  setArm: (arm: Arm) => void;
}

export const useArmStore = create<ArmState>((set) => ({
  arm: "sell",
  setArm: (arm) => {
    if (typeof window !== "undefined") window.localStorage.setItem(ARM_KEY, arm);
    set({ arm });
  },
}));

/** بازوی جاری — بعد از mount با localStorage همگام می‌شود (رفرش روی صفحات مشترک) */
export function useArm(): Arm {
  const arm = useArmStore((s) => s.arm);
  useEffect(() => {
    const stored = storedArm();
    if (stored !== useArmStore.getState().arm) useArmStore.setState({ arm: stored });
  }, []);
  return arm;
}

/** ثبت بازوی باز‌شده — صفحات هر بازو در mount صدا می‌زنند (خارج از رندر) */
export function setArmActive(arm: Arm): void {
  useArmStore.getState().setArm(arm);
}

/** مقصد ورود کاربر واردشده = بازوی خودش: کاتالوگ فروش یا دستیار خرید */
export function myArmHref(): string {
  return storedArm() === "buy" ? "/buy" : "/sell";
}
