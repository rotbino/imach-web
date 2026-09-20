"use client";

import { useEffect } from "react";
import Link from "next/link";
import { fa, unitLabel, frequencyLabel, activityTypeLabel } from "@/lib/format";
import { useAuthStore } from "@/lib/auth-store";
import { useBusinessProfile } from "@/lib/queries";
import { ContactButton } from "@/app/components/contact-gate";
import { AppHeader, MobileTabBar } from "@/app/components/chrome";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  BadgeCheck,
  Briefcase,
  ClipboardList,
  Loader2,
  MapPin,
  ShoppingBag,
  Store,
} from "lucide-react";

/*
 * نمای بیرونی بازوی خرید — لیست خریدِ عمومی.
 *
 * خریدار همین لینک را برای تامین‌کننده‌هایش می‌فرستد؛ دقیقا مثل لیستی
 * که روی واتساپ برای تامین‌کننده می‌فرستد — با این تفاوت که همیشه
 * به‌روز است و تماس پشت گیت ثبت‌نام iMach است (موتور ویروسی جذب تامین‌کننده).
 * نویگیشن اینستاگرامی اینجا هم هست — سوییچ بین بازوها همه‌جا باید باشد.
 */
export default function BuyArm({ slug }: { slug: string }) {
  const { status } = useAuthStore();

  const profileQ = useBusinessProfile(slug);
  const biz = profileQ.data;

  const isOwner = !!useAuthStore((s) => s.businesses).find((b) => b.slug === slug);

  const buyListings = (biz?.listings ?? []).filter(
    (l) => (l.mode === "BUY" || l.mode === "BOTH") && l.volume !== null
  );

  useEffect(() => {
    if (biz) document.title = `${biz.name} — لیست خرید | iMach`;
  }, [biz]);

  if (profileQ.isLoading) {
    return (
      <div className="grid min-h-screen place-items-center bg-gradient-to-b from-stone-100 via-white to-white">
        <Loader2 className="size-6 animate-spin text-stone-700" />
      </div>
    );
  }

  if (!biz) {
    return (
      <div className="grid min-h-screen place-items-center px-4 text-center">
        <div>
          <p className="text-lg font-bold">این لیست خرید پیدا نشد</p>
          <p className="mt-2 text-sm text-muted-foreground">ممکن است آدرس اشتباه باشد. از صاحب لیست لینک تازه بگیرید.</p>
          <Link href="/">
            <Button className="mt-4">iMach</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-stone-100 via-white to-white">
      {/* نویگیشن اینستاگرامی — روی بازو هم هست */}
      <AppHeader />

      <main className="mx-auto w-full max-w-2xl grow px-4 py-5">
        {/* میان‌بر مدیریت برای صاحب لیست */}
        {isOwner && (
          <div className="mb-3 flex justify-center">
            <Link
              href="/panel"
              className="rounded-full bg-stone-800 px-3.5 py-1.5 text-xs font-bold text-white shadow-sm"
            >
              مدیریت لیست خرید
            </Link>
          </div>
        )}

        {/* هدر لیست خرید */}
        <section className="rounded-3xl border bg-white p-5 shadow-sm sm:p-7">
          <div className="flex flex-col items-center text-center">
            <span className="grid size-20 place-items-center rounded-3xl bg-stone-800/10 text-4xl font-black text-stone-700 shadow-inner">
              {biz.name.slice(0, 1)}
            </span>
            <h1 className="mt-3 flex items-center gap-1.5 text-2xl font-black">
              {biz.name}
              {biz.isVerified && <BadgeCheck className="size-5 text-stone-600" aria-label="تاییدشده" />}
            </h1>
            <p className="mt-1 text-sm font-bold text-muted-foreground">لیست خرید این کسب‌وکار</p>
            <div className="mt-2 flex flex-wrap items-center justify-center gap-2 text-xs text-muted-foreground">
              {biz.activityType && (
                <Badge variant="outline" className="border-stone-300 bg-stone-50 text-stone-700">
                  <Briefcase className="size-3" />
                  {activityTypeLabel(biz.activityType)}
                </Badge>
              )}
              <span className="flex items-center gap-1">
                <MapPin className="size-3.5" />
                {biz.city}
              </span>
            </div>

            <div className="mt-5 flex w-full flex-col sm:w-auto sm:flex-row">
              <ContactButton
                slug={slug}
                bizName={biz.name}
                label={`تماس با ${isOwner ? "خریدار" : biz.name}`}
                className="bg-stone-800 hover:bg-stone-900 sm:min-w-44"
              />
            </div>
            {isOwner && (
              <p className="mt-3 text-[11px] text-muted-foreground">
                این لیست خرید شماست — لینکش را برای تامین‌کننده‌هایتان بفرستید
              </p>
            )}
          </div>
        </section>

        {/* آیتم‌های نیاز خرید */}
        <section className="mt-6">
          <h2 className="mb-3 flex items-center gap-1.5 px-1 text-sm font-extrabold text-muted-foreground">
            <ClipboardList className="size-4 text-stone-700" />
            کالاهایی که نیاز دارد
          </h2>

          {buyListings.length === 0 ? (
            <div className="rounded-3xl border border-dashed bg-white/70 p-10 text-center">
              <p className="text-sm text-muted-foreground">هنوز کالایی در این لیست خرید ثبت نشده است.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {buyListings.map((l) => (
                <article key={l.id} className="animate-fade-up flex items-center gap-3 rounded-2xl border bg-white p-4 shadow-sm">
                  <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-stone-100 text-lg font-black text-stone-600">
                    {l.good.name.slice(0, 1)}
                  </span>
                  <div className="min-w-0 grow">
                    <p className="truncate font-extrabold" title={l.good.name}>
                      {l.good.name}
                    </p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">{l.good.category}</p>
                  </div>
                  <div className="shrink-0 text-end">
                    <Badge variant="outline" className="border-stone-300 bg-stone-50 text-stone-700">
                      {fa(l.volume as number)} {unitLabel(l.good.unit)}
                    </Badge>
                    <p className="mt-1 text-[11px] text-muted-foreground">{frequencyLabel(l.frequency ?? "MONTHLY")}</p>
                  </div>
                </article>
              ))}
            </div>
          )}

          {/* راهنمای تامین‌کننده */}
          {buyListings.length > 0 && status !== "authed" && (
            <p className="mt-4 rounded-2xl bg-stone-100/80 px-4 py-3 text-center text-xs leading-6 text-stone-600">
              این کسب‌وکار دنبال تامین‌کننده است — اگر این کالاها را دارید،
              «تماس» بزنید و مستقیم با او حرف بزنید.
            </p>
          )}
        </section>

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
      <footer className="mt-auto border-t bg-white/70 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 text-center mb-[4.25rem] sm:mb-0">
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

      {/* فوتر چسبان موبایل — سوییچ بازوها */}
      <MobileTabBar />
    </div>
  );
}
