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

// ─── فاز ۹ (شکاف ۶) — دستیارهای فعالِ کسب‌وکار فعال ───
// null/فیلد غایب = روشن؛ فقط false صریح خاموش است. تالار/هتل‌ها بازوی
// فروش را خاموش می‌کنند → سوییچر شل برایشان غیب می‌شود و همیشه روی
// دستیار خرید می‌مانند.

/** این بازو برای این کسب‌وکار فعال است؟ (null = هر دو فعال) */
export function armEnabled(biz: Pick<BusinessSummaryDto, "enabledArms"> | null | undefined, arm: Arm): boolean {
  return biz?.enabledArms?.[arm] !== false;
}

/** هر دو بازو فعال‌اند؟ (سوییچر فقط در این حالت معنا دارد) */
export function bothArmsEnabled(biz: Pick<BusinessSummaryDto, "enabledArms"> | null | undefined): boolean {
  return armEnabled(biz, "sell") && armEnabled(biz, "buy");
}

/** بازوی پیش‌فرضِ این کسب‌وکار — اولین بازوی فعال (فروش→خرید) */
export function firstEnabledArm(biz: Pick<BusinessSummaryDto, "enabledArms"> | null | undefined): Arm {
  return armEnabled(biz, "sell") ? "sell" : "buy";
}

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

/** بازوی جاری — بعد از mount با localStorage همگام می‌شود (رفرش روی صفحات مشترک)
 *  و اگر بازوی ذخیره‌شده برای کسب‌وکار فعال خاموش شده باشد (فاز ۹)،
 *  خودکار به بازوی فعالِ دیگر می‌افتد. */
export function useArm(): Arm {
  const arm = useArmStore((s) => s.arm);
  const biz = useActiveBusiness();
  useEffect(() => {
    const stored = storedArm();
    if (stored !== useArmStore.getState().arm) useArmStore.setState({ arm: stored });
  }, []);
  const effective = armEnabled(biz, arm) ? arm : firstEnabledArm(biz);
  return effective;
}

/** ثبت بازوی باز‌شده — صفحات هر بازو در mount صدا می‌زنند (خارج از رندر) */
export function setArmActive(arm: Arm): void {
  useArmStore.getState().setArm(arm);
}

/** مقصد ورود کاربر واردشده = بازوی خودش: کاتالوگ فروش یا دستیار خرید.
 *  اگر بازوی ذخیره‌شده برای بیزینس تک‌بازو خاموش باشد، هدرِ شل (AppHeader)
 *  بلافاصله به بازوی فعال ریدایرکت می‌کند — صفحات ورور هم مسیر را از
 *  پاسخ login (enabledArms) هوشمندانه انتخاب می‌کنند. */
export function myArmHref(): string {
  return storedArm() === "buy" ? "/buy" : "/sell";
}

/**
 * سوییچ هوشمند بازو بر اساس کالای ثبت‌شده (خواسته‌ی کاربر):
 *   • کالای فقط خرید (kind=buy) و روی sell هستیم → سوییچ به buy
 *   • کالای فقط فروش (kind=sell) و روی buy هستیم → سوییچ به sell
 *   • کالای هر دو (kind=both) یا همسان با arm فعلی → تکون نخوره
 *
 * این منطق در هر ثبت کالا اعمال می‌شود (نه فقط اولین کالا) تا کاربر همیشه
 * روی بازوی درست قرار بگیرد. یک helper برای استفاده در onSaved callbacks.
 */
export function smartSwitchArm(kind: "sell" | "buy"): void {
  const current = storedArm();
  if (kind === "buy" && current === "sell") {
    useArmStore.getState().setArm("buy");
  } else if (kind === "sell" && current === "buy") {
    useArmStore.getState().setArm("sell");
  }
  // kind="both" یا همسان با current → هیچ کاری نکن
}

/** مسیر پس از احراز هویت (فاز ۲ مهاجرت — از start-wizard به اینجا منتقل شد، فاز ۳).
 *  با در نظر گرفتن بیزینس placeholder (onboard ناتمام → /start) و بازوهای فعال:
 *  خرید → شل جدید /home · فروش → /sell/requests (ورودی v18 شل — فاز ۴). */
export function routeAfterAuth(
  businesses: { city: string; name: string; enabledArms?: { sell?: boolean; buy?: boolean } | null }[]
): string {
  const biz = businesses[0];
  if (!biz || biz.city === "—" || biz.name === "کاتالوگ شما") return "/start";
  const stored = useArmStore.getState().arm;
  const arm: Arm = armEnabled(biz, stored) ? stored : firstEnabledArm(biz);
  return arm === "buy" ? "/home" : "/sell/requests";
}
