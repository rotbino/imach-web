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
// وزن ۴۰۰ (Regular) + وزن ۷۰۰ (Bold) — عنوان‌ها از این پس بولد واقعی‌اند، نه synthetic
const iranSans = localFont({
  src: [
    { path: "../fonts/IRANSansWeb.woff", weight: "400", style: "normal" },
    { path: "../fonts/IRANSansWeb_Bold.woff2", weight: "700", style: "normal" },
  ],
  display: "swap",
  variable: "--font-iran",
  fallback: ["Tahoma", "Arial", "sans-serif"],
});

export const metadata: Metadata = {
  title: "iMach — ارزان‌تر بخر، بیشتر بفروش | بازار عمده آنلاین",
  description:
    "iMach مغازه‌ها و کارگاه‌ها را مستقیم به تامین‌کننده‌ها و خریدارها می‌رساند: قیمت را بدون واسطه بگیر، کاتالوگت را بفرست دست مغازه‌ها و پیشنهادها را یک‌جا مقایسه کن.",
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
