import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { cookies } from "next/headers";
import "./globals.css";
import { AppProviders } from "./providers";
import { IconSprite } from "@/components/ui/icon";
import { ToastProvider } from "@/components/ui/toast";
import { getLocale, LOCALES } from "@/i18n/config";
import { CURRENCIES } from "@/lib/format";

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
  metadataBase: new URL(process.env.SITE_URL ?? "https://imach.app"),
  title: {
    default: "iMach | تطبیق نیازهای خریدار عمده با تامین‌کنندگان مناسب",
    template: "%s | iMach",
  },
  description:
    "آی‌مچ — بازار عمدهٔ واقعی: کاتالوگ فروشنده، لیست خرید، استعلام چندقلمی و تطبیق هوشمند.",
  openGraph: {
    type: "website",
    siteName: "iMach",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "آیمچ — تأمین‌کنندگان هر کالا را به خریداران عمدهٔ آن وصل می‌کند" }],
  },
  twitter: {
    card: "summary_large_image",
    images: ["/og.png"],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#fcfbf8",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const locale = getLocale(cookieStore.get("imach_locale")?.value);
  const dir = LOCALES.find((l) => l.code === locale)?.dir ?? "rtl";
  // M2 — ارز نمایش (کوکی صریح کاربر)؛ null = پیش‌فرض کشور (در کلاینت حل می‌شود)
  const currencyRaw = cookieStore.get("imach_currency")?.value?.toUpperCase();
  const initialCurrency = currencyRaw && CURRENCIES[currencyRaw] ? currencyRaw : null;

  return (
    <html lang={locale} dir={dir} className={iran.variable}>
      <body className="min-h-dvh antialiased">
        <IconSprite />
        <AppProviders initialLocale={locale} initialCurrency={initialCurrency}>
          <ToastProvider>{children}</ToastProvider>
        </AppProviders>
      </body>
    </html>
  );
}
