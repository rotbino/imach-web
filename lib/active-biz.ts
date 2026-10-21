"use client";

import type { BusinessSummaryDto } from "./api";

/**
 * بازوها و مسیر پس از احراز — سالواح M1 از legacy/lib/active-biz.ts
 * (فقط بخش مورد نیاز M1؛ پوستهٔ کامل بازوها با AppShell در M2 می‌آید).
 *
 * · Arm = دو صفحهٔ حساب مثل پیج‌های اینستاگرام: فروش (sell) / خرید (buy)
 * · بازوی انتخابی در localStorage می‌ماند تا M2 شل همان‌جا باز شود
 * · routeAfterAuth = مقصد پس از ورود/ثبت‌نام با احترام به placeholder
 *   آنبوردینگ (quickRegister بیزینس «کاتالوگ شما» می‌سازد تا گام ۲ پر شود)
 */

export type Arm = "sell" | "buy";

const ARM_KEY = "imach.arm";

/** این بازو برای این کسب‌وکار فعال است؟ (null/غایب = هر دو فعال — سند ۰۳) */
export function armEnabled(
  biz: Pick<BusinessSummaryDto, "enabledArms"> | null | undefined,
  arm: Arm
): boolean {
  return biz?.enabledArms?.[arm] !== false;
}

/** بازوی پیش‌فرضِ این کسب‌وکار — اولین بازوی فعال (فروش → خرید) */
export function firstEnabledArm(
  biz: Pick<BusinessSummaryDto, "enabledArms"> | null | undefined
): Arm {
  return armEnabled(biz, "sell") ? "sell" : "buy";
}

/** بازوی ذخیره‌شدهٔ کاربر (پیش‌فرض فروش) — بدون رفرش سرور */
export function storedArm(): Arm {
  if (typeof window === "undefined") return "sell";
  return window.localStorage.getItem(ARM_KEY) === "buy" ? "buy" : "sell";
}

/** ثبت بازوی فعال — M2 شل با همین مقدار بالا می‌آید */
export function setArmActive(arm: Arm): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(ARM_KEY, arm);
  } catch {
    /* حالت خصوصی مرورگر */
  }
}

/** بیزینسِ خالیِ ثبت‌نام سریع — تا وقتی گام ۲ ویزارد پر شود */
export function isPlaceholderBiz(b: { city: string; name: string } | undefined): boolean {
  return !!b && (b.city === "—" || b.name === "کاتالوگ شما");
}

/**
 * مسیر پس از احراز هویت (سالواح فاز ۲/۳ legacy).
 * M1: میزها هنوز ساخته نشده‌اند (M2) → مقصد موقت /me (صفحهٔ نشست واقعی).
 * TODO(M2): با رسیدن اسکرین‌های ۰۴/۰۹، خروجی نهایی = "/home" (خرید) / "/sell/catalog" (فروش).
 */
export function routeAfterAuth(
  businesses: Pick<BusinessSummaryDto, "city" | "name" | "enabledArms">[]
): string {
  const biz = businesses[0];
  if (!biz || isPlaceholderBiz(biz)) return "/start";
  const arm: Arm = armEnabled(biz, storedArm()) ? storedArm() : firstEnabledArm(biz);
  // eslint-disable-next-line @typescript-eslint/no-unused-expressions -- TODO(M2): arm === "buy" ? "/home" : "/sell/catalog"
  void arm;
  return "/me";
}
