import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { cookies } from "next/headers";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { AppProviders } from "./providers";
import { LOCALE_COOKIE, getDir, getLocale } from "@/i18n/config";

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
  // The locale comes from the cookie (set by the language switcher);
  // every component inherits direction from here via logical CSS
  // properties and the Radix DirectionProvider — nothing else sets dir.
  const locale = getLocale((await cookies()).get(LOCALE_COOKIE)?.value);

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
