import type { ReactNode } from "react";
import { cookies } from "next/headers";
import "@/styles/imach/tokens.css";
import "@/styles/imach/base.css";
import "@/styles/imach/components.css";
import "@/styles/imach/shell.css";
import { IconSprite } from "@/components/imach/icon-sprite";

/**
 * (auth) — صفحات احراز هویت با دیزاین‌سیستم v18 (پروتوتایپ: sc-login/sc-signup).
 * بدون appbar/tabbar — pagehead + screen-body، همان ساختار Prototype.
 * arm خنثی (بدون data-arm) = توکن‌های پیش‌فرض فیروزه‌ای، عین data-arm="keep".
 */

const THEME_COOKIE = "imach_theme";

export default async function AuthLayout({ children }: { children: ReactNode }) {
  const cookieStore = await cookies();
  const theme = cookieStore.get(THEME_COOKIE)?.value === "dark" ? "dark" : "light";

  return (
    <div className="ia auth" data-theme={theme}>
      <IconSprite />
      {children}
    </div>
  );
}
