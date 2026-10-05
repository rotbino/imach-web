import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import "@/styles/imach/tokens.css";
import "@/styles/imach/base.css";
import "@/styles/imach/components.css";
import "@/styles/imach/shell.css";
import { IconSprite } from "@/components/imach/icon-sprite";
import { Onboard } from "@/components/imach/onboard";
import { activeLocale } from "@/lib/imach/metadata";

/**
 * / — صفحهٔ اول سایت (پورت sc-onboard از Prototype v18 · فاز ۳ مهاجرت).
 *
 *  · SEO: این صفحه عمومی و ایندکس‌پذیر است (متن معرفی + سؤال نقش).
 *  · زبان/جهت از ریشهٔ layout می‌آید: cookie → Accept-Language (پروکسیِ
 *    زبان رسمی کشور بازدیدکننده) → فارسی؛ سوییچ زبان داخل صفحه.
 *  · تم از کوکی — همان ریلِ شل و صفحات auth.
 *  · فریم: pagehead ندارد (صفحهٔ معرفی است) — ارث‌بری مستقیم .onboard.
 */

/** فاز ۸ — Metadata چندزبانه (کوکی زبان → سه زبان؛ ربات بدون کوکی → فارسی) */
export async function generateMetadata(): Promise<Metadata> {
  const locale = await activeLocale();
  if (locale === "en") {
    return {
      title: "iMach — matching wholesale buyers' needs with the right suppliers",
      description:
        "iMach matches wholesale buyers' purchase needs with suppliers' products through its dedicated matching engine — buying list with live prices, supply board, smart catalog, and competitive quote requests. Sign-up with just a mobile number.",
      alternates: { canonical: "/" },
    };
  }
  if (locale === "ar") {
    return {
      title: "أي‌ماتش — مطابقة احتياجات المشترين بالجملة مع المورّدين المناسبين",
      description:
        "يطابق أي‌ماتش احتياجات شراء المشترين بالجملة مع منتجات المورّدين عبر محرك مطابقة مخصص — قائمة شراء بأسعار حية، لوحة توريد، كتالوج ذكي، وطلبات استعلام تنافسية. التسجيل برقم الجوّال فقط.",
      alternates: { canonical: "/" },
    };
  }
  return {
    title: "iMach — تطبیق نیازهای خریداران عمده با تامین‌کنندگان",
    description:
      "آی‌مچ با موتور تطبیق اختصاصی خود، درخواست‌های خریدِ خریداران عمده را با محصولات تأمین‌کنندگان مچ می‌کند — لیست خرید با قیمت زنده، تابلوی تأمین، کاتالوگ هوشمند و استعلام قیمت رقابتی. ثبت‌نام فقط با شمارهٔ موبایل.",
    alternates: { canonical: "/" },
  };
}

export const viewport: Viewport = {
  themeColor: "#f97316",
};

const THEME_COOKIE = "imach_theme";

export default async function LandingPage() {
  const cookieStore = await cookies();
  const theme = cookieStore.get(THEME_COOKIE)?.value === "dark" ? "dark" : "light";

  return (
    <div className="ia landing" data-theme={theme}>
      <IconSprite />
      <Onboard />
    </div>
  );
}
