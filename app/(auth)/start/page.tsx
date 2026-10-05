import type { Metadata } from "next";
import { SignupWizard } from "./signup-wizard";

/**
 * /start — ثبت‌نام دوگامی (پورت sc-signup از Prototype v18 · فاز ۳).
 * در گروه مسیر (auth) — فریم v18 بدون appbar/tabbar، عین sc-login.
 *
 *   /start                     → گام ۱: موبایل (+ کشور) → quickRegister
 *   /start?role=buy|sell       → همان، با نقشِ از-پیش-انتخاب‌شده در گام ۲
 *   /start?mode=login          → ریدایرکت به /login (رفتار موجود)
 *   (authed + بیزینس placeholder) → گام ۲: کسب‌وکار
 *   (authed + بیزینس واقعی)       → ریدایرکت به شل خودش
 */

export const metadata: Metadata = {
  title: "iMach — ساخت حساب",
  robots: { index: false },
};

export default function StartPage() {
  return <SignupWizard />;
}
