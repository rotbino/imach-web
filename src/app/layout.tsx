import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { AppProviders } from "./providers";

export const metadata: Metadata = {
  title: "iMach — بازار عمده خرید و تامین",
  description:
    "با یک فرم ساده، بازوی خرید و بازوی فروش اختصاصی بگیر؛ تامین‌کننده‌های درست را پیدا کن و قیمت‌گیری را فعال کن.",
  icons: {
    icon: "https://z-cdn.chatglm.cn/z-ai/static/logo.svg",
  },
};

export const viewport: Viewport = {
  themeColor: "#c05f1e",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fa" dir="rtl" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font -- فونت فارسی Vazirmatn (جانشین ایران‌سنس) برای کل اپلیکیشن */}
        <link
          href="https://fonts.googleapis.com/css2?family=Vazirmatn:wght@300;400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased bg-background text-foreground font-sans">
        <AppProviders>{children}</AppProviders>
        <Toaster />
      </body>
    </html>
  );
}
