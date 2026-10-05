import type { ReactNode } from "react";
import { cookies } from "next/headers";
import "@/styles/imach/tokens.css";
import "@/styles/imach/base.css";
import "@/styles/imach/components.css";
import "@/styles/imach/shell.css";
import { AppShell, type Arm, type Theme } from "@/components/imach/app-shell";
import { AuthGate } from "@/components/imach/auth-gate";

/**
 * (app) — شل احراز‌شدهٔ iMach (معماری فاز ۱ مهاجرت · فاز ۲: گارد auth).
 *
 *  · AuthGate: میهمان → /login (الگوی صفحات موجود، متمرکز در layout)
 *  · CSS سیستم طراحی v18 اینجا import می‌شود (scope زیر .ia)
 *  · data-arm پیش‌فرض buy — در فازهای بعد per-route/ذخیره‌شده
 *  · فاز ۶: data-theme + رنگ دلخواه هر arm از کوکی (SSR بدون فلش) —
 *    سوییچ UI از تنظیمات؛ انتخاب روی حساب کاربر هم ذخیره می‌شود (setPrefs)
 */

const THEME_COOKIE = "imach_theme";
const HEX = /^#[0-9a-fA-F]{6}$/;

export default async function AppLayout({ children }: { children: ReactNode }) {
  const cookieStore = await cookies();
  const theme: Theme = cookieStore.get(THEME_COOKIE)?.value === "dark" ? "dark" : "light";
  const initialArm: Arm = "buy";
  const buy = cookieStore.get("imach_arm_buy")?.value;
  const sell = cookieStore.get("imach_arm_sell")?.value;
  const initialArmColors = {
    buy: buy && HEX.test(buy) ? buy : null,
    sell: sell && HEX.test(sell) ? sell : null,
  };

  return (
    <AuthGate>
      <AppShell initialArm={initialArm} initialTheme={theme} initialArmColors={initialArmColors}>
        {children}
      </AppShell>
    </AuthGate>
  );
}
