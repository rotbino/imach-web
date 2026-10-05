import type { ReactNode } from "react";
import { cookies } from "next/headers";
import "@/styles/imach/tokens.css";
import "@/styles/imach/base.css";
import "@/styles/imach/components.css";
import "@/styles/imach/shell.css";
import { AppShell, type Arm, type Theme } from "@/components/imach/app-shell";

/**
 * (app) — شل احراز‌شدهٔ iMach (معماری فاز ۱ مهاجرت).
 *
 *  · layout فقط این گروه را می‌پوشاند — لندینگ/ادمین/legacy دست‌نخورده‌اند
 *  · CSS سیستم طراحی v18 اینجا import می‌شود (scope شده زیر .ia —
 *    توکن‌های shadcn صفحات دیگر را تحت تأثیر قرار نمی‌دهد)
 *  · data-arm پیش‌فرض از نوع مسیر می‌آید (فعلاً buy — فازهای بعد per-route)
 *  · data-theme از cookie خوانده می‌شود (ریل تم؛ سوییچ UI در فاز ۶)
 */

const THEME_COOKIE = "imach_theme";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const cookieStore = await cookies();
  const theme: Theme = cookieStore.get(THEME_COOKIE)?.value === "dark" ? "dark" : "light";
  const initialArm: Arm = "buy";

  return (
    <AppShell initialArm={initialArm} initialTheme={theme}>
      {children}
    </AppShell>
  );
}
