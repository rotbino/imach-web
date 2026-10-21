import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { cookies } from "next/headers";
import "./globals.css";
import { AppProviders } from "./providers";
import { IconSprite } from "@/components/ui/icon";
import { ToastProvider } from "@/components/ui/toast";
import { getLocale, LOCALES } from "@/i18n/config";

/** IRANSans سلف‌هاست (الگوی موجود — فونت برند iMach). */
const iran = localFont({
  src: [
    { path: "../fonts/IRANSansWeb.woff", weight: "400", style: "normal" },
    { path: "../fonts/IRANSansWeb_Bold.woff2", weight: "700", style: "normal" },
  ],
  display: "swap",
  variable: "--font-iran",
  fallback: ["Tahoma", "Arial", "sans-serif"],
});

export const metadata: Metadata = {
  title: {
    default: "iMach | تطبیق نیازهای خریدار عمده با تامین‌کنندگان مناسب",
    template: "%s | iMach",
  },
  description:
    "آی‌مچ — بازار عمدهٔ واقعی: کاتالوگ فروشنده، لیست خرید، استعلام چندقلمی و تطبیق هوشمند.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#fcfbf8",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = getLocale((await cookies()).get("imach_locale")?.value);
  const dir = LOCALES.find((l) => l.code === locale)?.dir ?? "rtl";

  return (
    <html lang={locale} dir={dir} className={iran.variable}>
      <body className="min-h-dvh antialiased">
        <IconSprite />
        <AppProviders initialLocale={locale}>
          <ToastProvider>{children}</ToastProvider>
        </AppProviders>
      </body>
    </html>
  );
}
