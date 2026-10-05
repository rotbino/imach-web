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
 *  · data-theme از cookie (ریل تم؛ سوییچ UI در فاز ۶)
 */

const THEME_COOKIE = "imach_theme";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const cookieStore = await cookies();
  const theme: Theme = cookieStore.get(THEME_COOKIE)?.value === "dark" ? "dark" : "light";
  const initialArm: Arm = "buy";

  return (
    <AuthGate>
      <AppShell initialArm={initialArm} initialTheme={theme}>
        {children}
      </AppShell>
    </AuthGate>
  );
}
