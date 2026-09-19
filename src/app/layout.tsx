import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { AppProviders } from "./providers";

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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fa" dir="rtl" className={iranSans.variable} suppressHydrationWarning>
      <body className="antialiased bg-background text-foreground font-sans">
        <AppProviders>{children}</AppProviders>
        <Toaster />
      </body>
    </html>
  );
}
