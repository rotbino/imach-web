"use client";

import Link from "next/link";
import { useAuthStore } from "@/lib/auth-store";
import { AppHeader, MobileTabBar } from "@/app/components/chrome";
import { SellArmView } from "@/app/components/arm-views";
import { ShoppingBasket, Store } from "lucide-react";
import { Button } from "@/components/ui/button";
import { saveReferralCode } from "@/lib/referral";

/*
 * صفحه عمومی بازوی فروش — کاتالوگ قیمتی که فروشنده لینکش را می‌فرستد.
 * بدنه از arm-views می‌آید (همان چیزی که در «بازوی من» هم دیده می‌شود)؛
 * این قاب فقط هویت صفحه را می‌سازد: پس‌زمینه، نویگیشن، فوتر ویروسی.
 * موتور ویروسی: گیت تماس + «ساخته شده با iMach» → عضویت بازدیدکننده.
 * فوتر و CTA لینک را با کد رفرال صاحب کاتالوگ می‌فرستند (سرنخ ثبت‌نام).
 */
export default function SellPublic({ slug }: { slug: string }) {
  const { status } = useAuthStore();
  // هر لمس به لینک‌های عضویت این صفحه، کد رفرال صاحب کاتالوگ را نگه می‌دارد
  const keepRef = () => saveReferralCode(slug);
  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-accent/40 via-white to-white">
      <AppHeader />
      <main className="mx-auto w-full max-w-4xl grow px-4 py-5">
        <SellArmView slug={slug} />

        {/* نوار ویروسی برای مهمان‌ها */}
        {status !== "authed" && (
          <section className="mt-8 rounded-3xl border border-primary/25 bg-white p-6 text-center shadow-sm">
            <p className="text-base font-extrabold">کسب‌وکار شما هم می‌تواند چنین کاتالوگی داشته باشد</p>
            <p className="mx-auto mt-1 max-w-sm text-xs leading-6 text-muted-foreground">
              کاتالوگ فروش و لیست خرید هوشمند iMach — رایگان. همین حالا بسازید و لینکش را به مشتری‌هایتان بفرستید.
            </p>
            <Link href={`/start?ref=${encodeURIComponent(slug)}`} onClick={keepRef}>
              <Button className="mt-4 rounded-xl px-6 shadow-lg shadow-primary/25">
                <ShoppingBasket className="size-4" />
                ساخت کاتالوگ رایگان من
              </Button>
            </Link>
          </section>
        )}
      </main>

      {/* فوتر ویروسی — درِ ورود بازدیدکننده‌ها به iMach؛ با کد رفرال صاحب کاتالوگ */}
      <footer className="mb-[4.25rem] mt-auto border-t bg-white/70 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 text-center sm:mb-0">
        <Link
          href={`/start?ref=${encodeURIComponent(slug)}`}
          onClick={keepRef}
          className="inline-flex items-center gap-1.5 text-sm font-extrabold text-primary hover:underline"
        >
          <span className="grid size-6 place-items-center rounded-lg bg-primary text-primary-foreground">
            <Store className="size-3" />
          </span>
          ساخته شده با iMach
        </Link>
        <p className="mt-1 pb-2 text-[11px] text-muted-foreground">
          {status === "authed" ? "پنل فروش و خرید شما" : "کاتالوگ فروش و لیست خرید هوشمند — رایگان"}
        </p>
      </footer>

      <MobileTabBar />
    </div>
  );
}
