import type { ReactNode } from "react";
import { cookies } from "next/headers";
import "@/styles/imach/tokens.css";
import "@/styles/imach/base.css";
import "@/styles/imach/components.css";
import "@/styles/imach/shell.css";
import { IconSprite } from "@/components/imach/icon-sprite";

/**
 * (pub) — صفحات عمومی ایندکس‌پذیر با دیزاین‌سیستم v18 (فاز ۷).
 * پروتوتایپ: sc-catalog-public / sc-list-public / sc-sell-product-public.
 * بدون appbar/tabbar (میهمان هم می‌بیند) — pagehead + screen-body، arm خنثی
 * (بدون data-arm = توکن‌های پیش‌فرض، عین data-arm="keep" پروتوتایپ).
 * تم از کوکی — همان ریل شل/auth؛ ربات‌ها همیشه light می‌بینند (کوکی ندارند).
 */

const THEME_COOKIE = "imach_theme";

export default async function PubLayout({ children }: { children: ReactNode }) {
  const cookieStore = await cookies();
  const theme = cookieStore.get(THEME_COOKIE)?.value === "dark" ? "dark" : "light";

  return (
    <div className="ia pub" data-theme={theme}>
      <IconSprite />
      {children}
    </div>
  );
}
