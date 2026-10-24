import type { Metadata } from "next";
import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import { LogoMark } from "@/components/imach/auth-brand-panel";
import { ReviewsPageList } from "@/components/imach/testimonials";
import type { TestimonialDto } from "@/lib/api";

/**
 * `/reviews` — سایر نظرات خریداران (M10 · ۴۳-الگو · فاز ۳۳/۵۶).
 * محتوای عمومی پیش از ورود: فهرست کامل نظرات تأییدشده + ثبت نظر (صف ادمین).
 * SSR با کش ۶۰ثانیه‌ای؛ ثبت نظر از دیالوگ مهمان‌پسند (approved=false).
 */

const BACKEND = process.env.BACKEND_ORIGIN ?? "http://127.0.0.1:4000";

async function fetchTestimonials(): Promise<TestimonialDto[]> {
  try {
    const res = await fetch(`${BACKEND}/api/v1/feedback/testimonials`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return [];
    return (await res.json()) as TestimonialDto[];
  } catch {
    return [];
  }
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "سایر نظرات خریداران — تجربهٔ کاربران | iMach",
    description:
      "تجربهٔ واقعی خریداران و فروشندگان عمده از آیمچ: کاتالوگ با قیمت همیشه به‌روز، استعلام رقابتی، گوش به زنگ و تبلیغ هدفمند.",
    alternates: { canonical: "/reviews" },
  };
}

export default async function PublicReviewsPage() {
  const initial = await fetchTestimonials();

  return (
    <div data-arm="sell" className="min-h-dvh bg-bg">
      {/* هدر عمومی (هم‌الگوی /c/[slug]) */}
      <header className="sticky top-0 z-10 border-b border-line bg-surface/95 px-4 py-3 backdrop-blur lg:px-8">
        <div className="mx-auto flex max-w-[760px] items-center gap-3">
          <Link
            href="/"
            aria-label="بازگشت به صفحهٔ اصلی"
            className="grid size-9 shrink-0 place-items-center rounded-xl bg-surface-2 text-text-2"
          >
            <Icon name="back" size={16} className="rtl:-scale-x-100" />
          </Link>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-[16px] font-black text-text">سایر نظرات</h1>
            <p className="truncate text-[11.5px] text-text-3">تجربهٔ کاربران آیمچ از قابلیت‌ها</p>
          </div>
          <span className="grid size-9 shrink-0 place-items-center rounded-[9px] bg-gradient-to-br from-primary to-primary-strong text-white">
            <LogoMark size={19} />
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-[760px] px-4 pb-32 pt-4 lg:px-8 lg:pb-16">
        <ReviewsPageList initial={initial} />
      </main>

      <footer className="mx-auto max-w-[760px] px-4 py-8 text-center lg:px-8">
        <p className="text-[11px] text-text-4">ویترین نظرات iMach — عمده‌فروشی برای کسب‌وکارها</p>
      </footer>
    </div>
  );
}
