"use client";

import { useEffect } from "react";
import Link from "next/link";
import { fa, money, unitLabel, activityTypeLabel } from "@/lib/format";
import { useAuthStore } from "@/lib/auth-store";
import { useBusinessProfile, useFollowToggle } from "@/lib/queries";
import { ContactButton } from "@/app/components/contact-gate";
import { AppHeader, MobileTabBar } from "@/app/components/chrome";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  BadgeCheck,
  BookmarkCheck,
  BookmarkPlus,
  Briefcase,
  Loader2,
  MapPin,
  Package,
  ShoppingBasket,
  Store,
} from "lucide-react";

/*
 * نمای بیرونی بازوی فروش — کاتالوگ عمومی قیمت.
 *
 * این صفحه چیزهایی است که فروشنده لینکش را برای مشتری‌هایش می‌فرستد؛
 * مثل یک آلبوم تصویری/کاتالوگ زیبا — بدنه‌اش شبیه پنل نیست.
 * نویگیشن اینستاگرامی (هدر/فوتر موبایل) اینجا هم هست — نویگیشن دقیقا
 * برای سوییچ بین بازوهاست و نباید روی بازوها غیبت کند.
 * موتور ویروسی iMach: برای تماس باید عضو شد («گیت تماس») و
 * پایین صفحه «ساخته شده با iMach» بازدیدکننده را به سیستم می‌آورد.
 */
export default function SellArm({ slug }: { slug: string }) {
  const { toast } = useToast();
  const { status, user, businesses: storeBizs } = useAuthStore();
  const followToggle = useFollowToggle();

  const profileQ = useBusinessProfile(slug);
  const biz = profileQ.data;

  const myBiz = storeBizs.find((b) => b.slug === slug);
  const isOwner = !!myBiz;

  const sellListings = (biz?.listings ?? []).filter(
    (l) => (l.mode === "SELL" || l.mode === "BOTH") && l.price !== null
  );

  useEffect(() => {
    if (biz) document.title = `${biz.name} — کاتالوگ فروش | iMach`;
  }, [biz]);

  const follow = () => {
    if (isOwner) return;
    if (status !== "authed") {
      toast({ title: "اول عضو iMach شوید", description: "ثبت‌نام رایگان است؛ با دکمه تماس هم می‌توانید عضو شوید." });
      return;
    }
    const mine = storeBizs[0];
    if (!mine) {
      toast({ title: "اول کسب‌وکارتان را بسازید", description: "از پنل، کسب‌وکار بسازید و بعد دنبال کنید." });
      return;
    }
    followToggle.mutate(
      { businessId: mine.id, supplierId: biz!.id, follow: true },
      { onSuccess: () => toast({ title: `${biz!.name} دنبال شد`, description: "قیمت‌هایش در پنل شما جمع می‌شود." }) }
    );
  };

  if (profileQ.isLoading) {
    return (
      <div className="grid min-h-screen place-items-center bg-gradient-to-b from-accent/40 via-white to-white">
        <Loader2 className="size-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!biz) {
    return (
      <div className="grid min-h-screen place-items-center px-4 text-center">
        <div>
          <p className="text-lg font-bold">این کاتالوگ پیدا نشد</p>
          <p className="mt-2 text-sm text-muted-foreground">ممکن است آدرس اشتباه باشد. از صاحب کاتالوگ لینک تازه بگیرید.</p>
          <Link href="/">
            <Button className="mt-4">iMach</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-accent/40 via-white to-white">
      {/* نویگیشن اینستاگرامی — روی بازو هم هست؛ برای سوییچ بین بازوهاست */}
      <AppHeader />

      <main className="mx-auto w-full max-w-4xl grow px-4 py-5">
        {/* میان‌بر مدیریت برای صاحب کاتالوگ */}
        {isOwner && (
          <div className="mb-3 flex justify-center">
            <Link
              href="/panel"
              className="rounded-full bg-primary px-3.5 py-1.5 text-xs font-bold text-primary-foreground shadow-sm"
            >
              مدیریت کاتالوگ
            </Link>
          </div>
        )}

        {/* هدر کاتالوگ — مشخصات کسب‌وکار */}
        <section className="rounded-3xl border bg-white p-5 shadow-sm sm:p-7">
          <div className="flex flex-col items-center text-center">
            <span className="grid size-20 place-items-center rounded-3xl bg-primary/10 text-4xl font-black text-primary shadow-inner">
              {biz.name.slice(0, 1)}
            </span>
            <h1 className="mt-3 flex items-center gap-1.5 text-2xl font-black">
              {biz.name}
              {biz.isVerified && <BadgeCheck className="size-5 text-primary" aria-label="تاییدشده" />}
            </h1>
            <div className="mt-2 flex flex-wrap items-center justify-center gap-2 text-xs text-muted-foreground">
              {biz.activityType && (
                <Badge variant="outline" className="border-primary/25 bg-accent text-primary">
                  <Briefcase className="size-3" />
                  {activityTypeLabel(biz.activityType)}
                </Badge>
              )}
              <span className="flex items-center gap-1">
                <MapPin className="size-3.5" />
                {biz.city}
              </span>
            </div>

            {/* آمار — مثل اینستاگرام */}
            <div className="mt-4 flex items-center gap-8 text-center" aria-label="آمار کاتالوگ">
              <div>
                <p className="text-lg font-black">{fa(sellListings.length)}</p>
                <p className="text-[11px] text-muted-foreground">کالا</p>
              </div>
              <div>
                <p className="text-lg font-black">{fa(biz._count.followers)}</p>
                <p className="text-[11px] text-muted-foreground">دنبال‌کننده</p>
              </div>
            </div>

            {/* دکمه‌های تماس و دنبال کردن */}
            <div className="mt-5 flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
              <ContactButton slug={slug} bizName={biz.name} label={`تماس با ${isOwner ? "فروشنده" : biz.name}`} className="sm:min-w-44" />
              {!isOwner && (
                <Button variant="outline" onClick={follow} disabled={followToggle.isPending} className="sm:min-w-36">
                  <BookmarkPlus className="size-4" />
                  دنبال کردن
                </Button>
              )}
            </div>
            {isOwner && (
              <p className="mt-3 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <BookmarkCheck className="size-3.5 text-primary" />
                این کاتالوگ شماست — لینکش را برای مشتری‌هایتان بفرستید
              </p>
            )}
          </div>
        </section>

        {/* آلبوم کالاها */}
        <section className="mt-6">
          <h2 className="mb-3 flex items-center gap-1.5 px-1 text-sm font-extrabold text-muted-foreground">
            <Package className="size-4 text-primary" />
            کالاهای فروشی
          </h2>

          {sellListings.length === 0 ? (
            <div className="rounded-3xl border border-dashed bg-white/70 p-10 text-center">
              <p className="text-sm text-muted-foreground">هنوز کالایی در این کاتالوگ ثبت نشده است.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {sellListings.map((l) => (
                <article key={l.id} className="animate-fade-up overflow-hidden rounded-2xl border bg-white shadow-sm transition hover:shadow-md">
                  {/* تا زمان سیستم فایل‌ها: کاشی حرفیِ تخت به‌جای عکس */}
                  <div className="grid aspect-[4/3] place-items-center bg-gradient-to-br from-accent/70 via-accent/30 to-transparent">
                    <span className="text-5xl font-black text-primary/20" aria-hidden>
                      {l.good.name.slice(0, 1)}
                    </span>
                  </div>
                  <div className="p-3">
                    <p className="truncate font-extrabold" title={l.good.name}>
                      {l.good.name}
                    </p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">{l.good.category}</p>
                    <p className="mt-2 text-lg font-black text-primary">
                      {money(l.price as number)}
                    </p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      هر {unitLabel(l.good.unit)} · حداقل {fa(l.minOrder ?? 0)} {unitLabel(l.good.unit)}
                    </p>
                    <Badge variant="secondary" className="mt-2">
                      موجودی: {fa(l.stock ?? 0)}
                    </Badge>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        {/* نوار ویروسی برای مهمان‌ها */}
        {status !== "authed" && (
          <section className="mt-8 rounded-3xl border border-primary/25 bg-white p-6 text-center shadow-sm">
            <p className="text-base font-extrabold">کسب‌وکار شما هم می‌تواند چنین کاتالوگی داشته باشد</p>
            <p className="mx-auto mt-1 max-w-sm text-xs leading-6 text-muted-foreground">
              کاتالوگ فروش و لیست خرید هوشمند iMach — رایگان. همین حالا بسازید و لینکش را به مشتری‌هایتان بفرستید.
            </p>
            <Link href="/start">
              <Button className="mt-4 rounded-xl px-6 shadow-lg shadow-primary/25">
                <ShoppingBasket className="size-4" />
                ساخت کاتالوگ رایگان من
              </Button>
            </Link>
          </section>
        )}
      </main>

      {/* فوتر ویروسی — درِ ورود بازدیدکننده‌ها به iMach */}
      <footer className="mt-auto border-t bg-white/70 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 text-center mb-[4.25rem] sm:mb-0">
        <Link
          href="/start"
          className="inline-flex items-center gap-1.5 text-sm font-extrabold text-primary hover:underline"
        >
          <span className="grid size-6 place-items-center rounded-lg bg-primary text-primary-foreground">
            <Store className="size-3" />
          </span>
          ساخته شده با iMach
        </Link>
        <p className="mt-1 pb-2 text-[11px] text-muted-foreground">
          {user ? "پنل فروش و خرید شما" : "کاتالوگ فروش و لیست خرید هوشمند — رایگان"}
        </p>
      </footer>

      {/* فوتر چسبان موبایل — سوییچ بازوها */}
      <MobileTabBar />
    </div>
  );
}
