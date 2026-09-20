import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { cookies, headers } from "next/headers";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { AppProviders } from "./providers";
import {
  LOCALE_COOKIE,
  detectLocaleFromAcceptLanguage,
  getDir,
  getLocale,
} from "@/i18n/config";

// فونت ایران‌سنس لوکال (self-hosted) — بدون وابستگی به CDN
// weight فقط 400 موجود است؛ وزن‌های سنگین‌تر با synthetic bold رندر می‌شوند
const iranSans = localFont({
  src: "../fonts/IRANSansWeb.woff",
  weight: "400",
  style: "normal",
  display: "swap",
  variable: "--font-iran",
  fallback: ["Tahoma", "Arial", "sans-serif"],
});

export const metadata: Metadata = {
  title: "iMach — بازار عمده خرید و تامین",
  description:
    "با یک فرم ساده، بازوی خرید و بازوی فروش اختصاصی بگیر؛ تامین‌کننده‌های درست را پیدا کن و قیمت‌گیری را فعال کن.",
  icons: {
    icon: "https://z-cdn.chatglm.cn/z-ai/static/logo.svg",
  },
};

export const viewport: Viewport = {
  themeColor: "#f97316",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // ── i18n: THE single place where language & direction are applied ──────
  // Priority: cookie (visitor's explicit choice) → Accept-Language
  // (their location/browser language, e.g. fa-IR → fa) → Persian.
  // Every component inherits direction from here via logical CSS
  // properties and the Radix DirectionProvider — nothing else sets dir.
  const cookieStore = await cookies();
  const headerStore = await headers();
  const locale = getLocale(
    cookieStore.get(LOCALE_COOKIE)?.value ?? detectLocaleFromAcceptLanguage(headerStore.get("accept-language"))
  );

  return (
    <html
      lang={locale}
      dir={getDir(locale)}
      className={iranSans.variable}
      suppressHydrationWarning
    >
      <body className="antialiased bg-background text-foreground font-sans">
        <AppProviders initialLocale={locale}>{children}</AppProviders>
        <Toaster />
      </body>
    </html>
  );
}
