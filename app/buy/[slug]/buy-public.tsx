"use client";

import Link from "next/link";
import { useAuthStore } from "@/lib/auth-store";
import { AppHeader, MobileTabBar } from "@/app/components/chrome";
import { BuyArmView } from "@/app/components/arm-views";
import { ShoppingBag, Store } from "lucide-react";
import { Button } from "@/components/ui/button";

/*
 * صفحه عمومی بازوی خرید — لیستی که خریدار برای تامین‌کننده‌ها می‌فرستد.
 * بدنه از arm-views می‌آید (همان چیزی که در «بازوی من» هم دیده می‌شود).
 * تماس پشت گیت ثبت‌نام است — موتور جذب تامین‌کننده.
 */
export default function BuyPublic({ slug }: { slug: string }) {
  const { status } = useAuthStore();
  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-stone-100 via-white to-white">
      <AppHeader />
      <main className="mx-auto w-full max-w-2xl grow px-4 py-5">
        <BuyArmView slug={slug} />

        {/* نوار ویروسی برای مهمان‌ها */}
        {status !== "authed" && (
          <section className="mt-8 rounded-3xl border border-stone-300 bg-white p-6 text-center shadow-sm">
            <p className="text-base font-extrabold">خریداریش را هوشمند انجام دهید</p>
            <p className="mx-auto mt-1 max-w-sm text-xs leading-6 text-muted-foreground">
              لیست خرید iMach نیازهایتان را به تامین‌کننده‌های مناسب می‌رساند و پیشنهاد قیمت‌ها را یک‌جا مقایسه می‌کند — رایگان.
            </p>
            <Link href="/start">
              <Button className="mt-4 rounded-xl bg-stone-800 px-6 shadow-lg hover:bg-stone-900">
                <ShoppingBag className="size-4" />
                ساخت لیست خرید رایگان من
              </Button>
            </Link>
          </section>
        )}
      </main>

      {/* فوتر ویروسی */}
      <footer className="mb-[4.25rem] mt-auto border-t bg-white/70 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 text-center sm:mb-0">
        <Link
          href="/start"
          className="inline-flex items-center gap-1.5 text-sm font-extrabold text-stone-800 hover:underline"
        >
          <span className="grid size-6 place-items-center rounded-lg bg-stone-800 text-white">
            <Store className="size-3" />
          </span>
          ساخته شده با iMach
        </Link>
        <p className="mt-1 pb-2 text-[11px] text-muted-foreground">لیست خرید هوشمند و کاتالوگ فروش — رایگان</p>
      </footer>

      <MobileTabBar />
    </div>
  );
}
