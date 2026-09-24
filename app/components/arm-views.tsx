"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { fa, categoryName, fmtMoney, goodName, unitLabel, frequencyLabel, activityTypeLabel } from "@/lib/format";
import { useAuthStore } from "@/lib/auth-store";
import { useBusinessProfile, useFollowBuyerToggle, useFollowToggle, useMarketState } from "@/lib/queries";
import { ContactButton } from "@/app/components/contact-gate";
import { ShareDialog } from "@/app/components/share";
import { useMessages } from "@/i18n/messages/use-messages";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  BadgeCheck,
  Briefcase,
  Check,
  ClipboardList,
  LayoutDashboard,
  Loader2,
  MapPin,
  Package,
  Share2,
  UserRound,
} from "lucide-react";

/*
 * نمای بازوها — یک بار تعریف، دو جا استفاده:
 * صفحات عمومی /sell/{slug} و /buy/{slug} (لینکی که برای مشتری/تامین‌کننده می‌فرستید).
 * شمارنده‌ی فالوور عمومی نداریم (سند ۵.۱) — خریدارها در کارتابلِ خودِ صاحب کاتالوگ دیده می‌شوند.
 * نوار آیکون مالک (ویرایش در کاتالوگ · اشتراک‌گذاری) فقط برای صاحب بازو یا ادمین
 * بالای صفحه ظاهر می‌شود — بازدیدکننده ویترین خالص می‌بیند.
 */

// ─── نوار مالک بالای کاتالوگ — فقط برای صاحب بازو یا ادمین ───

export function isCatalogOwner(
  slug: string,
  businesses: { slug: string }[],
  role?: string
): boolean {
  return !!businesses.find((b) => b.slug === slug) || role === "ADMIN";
}

function OwnerBar({ kind, slug }: { kind: "sell" | "buy"; slug: string }) {
  const [shareOpen, setShareOpen] = useState(false);
  const isSell = kind === "sell";
  const btn =
    "grid size-9 place-items-center rounded-xl text-muted-foreground transition hover:bg-accent hover:text-primary";

  return (
    <>
      {/* نوار ابزار تخت، هم‌عرض صفحه؛ ابزارها گوشه انتهایی ردیف */}
      <div className="mb-3 flex items-center justify-end rounded-2xl border bg-white p-1">
        <Link
          href={isSell ? "/sell/panel" : "/buy/panel"}
          aria-label="داشبورد و تنظیمات"
          className={btn}
        >
          <LayoutDashboard className="size-4.5" />
        </Link>
        <button type="button" onClick={() => setShareOpen(true)} aria-label="اشتراک‌گذاری" className={btn}>
          <Share2 className="size-4.5" />
        </button>
      </div>
      <ShareDialog kind={kind} slug={slug} open={shareOpen} onOpenChange={setShareOpen} />
    </>
  );
}

// ─── ویترین اعتماد — نام شخصِ صاحب کاتالوگ (عکس بعداً):
// در عمده‌فروشی طرف می‌خواهد بداند با چه کسی معامله می‌کند.
function ownerDisplayName(owner?: { name: string; firstName: string | null; lastName: string | null } | null) {
  if (!owner) return null;
  return [owner.firstName, owner.lastName].filter(Boolean).join(" ") || owner.name;
}

function OwnerLine({ owner, tone }: { owner: Parameters<typeof ownerDisplayName>[0]; tone: "sell" | "buy" }) {
  const m = useMessages();
  const name = ownerDisplayName(owner);
  if (!name) return null;
  return (
    <p className="mt-1 flex items-center justify-center gap-1 text-xs text-muted-foreground">
      <UserRound className={`size-3.5 ${tone === "sell" ? "text-primary" : "text-stone-600"}`} />
      {m.common.ownerLine.replace("{name}", name)}
    </p>
  );
}

// ─── نمای بازوی فروش (کاتالوگ عمومی قیمت) ───
export function SellArmView({ slug }: { slug: string }) {
  const { toast } = useToast();
  const { status, businesses: storeBizs, user } = useAuthStore();
  const followToggle = useFollowToggle();

  const profileQ = useBusinessProfile(slug);
  const biz = profileQ.data;

  const isOwner = isCatalogOwner(slug, storeBizs, user?.role);

  const sellListings = (biz?.listings ?? []).filter(
    (l) => (l.mode === "SELL" || l.mode === "BOTH") && l.priceMinor !== null
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
      toast({ title: "اول کسب‌وکارتان را بسازید", description: "از پروفایل، کسب‌وکار بسازید و بعد دنبال کنید." });
      return;
    }
    followToggle.mutate(
      { businessId: mine.id, supplierId: biz!.id, follow: true },
      { onSuccess: () => toast({ title: `${biz!.name} دنبال شد`, description: "قیمت‌هایش در «تابلوهای دنبال‌شده» دستیار خرید شما جمع می‌شود." }) }
    );
  };

  if (profileQ.isLoading) {
    return (
      <div className="grid place-items-center py-32">
        <Loader2 className="size-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!biz) {
    return (
      <div className="grid place-items-center px-4 py-24 text-center">
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
    <>
      {/* نوار مالک — مدیریت · دیدن · اشتراک‌گذاری */}
      {isOwner && <OwnerBar kind="sell" slug={slug} />}

      {/* هدر کاتالوگ — مشخصات کسب‌وکار */}
      <section className="rounded-3xl border bg-white p-5 shadow-sm sm:p-7">
        <div className="flex flex-col items-center text-center">
          {biz.logo?.thumbUrl || biz.logo?.url ? (
            /* next/image — بهینه‌سازی خودکار (خواسته‌ی کاربر) */
            <Image
              src={(biz.logo?.thumbUrl ?? biz.logo?.url)!}
              alt={biz.name}
              width={80}
              height={80}
              className="size-20 rounded-3xl object-cover shadow-inner"
            />
          ) : (
            <span className="grid size-20 place-items-center rounded-3xl bg-primary/10 text-4xl font-black text-primary shadow-inner">
              {biz.name.slice(0, 1)}
            </span>
          )}
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
          <OwnerLine owner={biz.owner} tone="sell" />
          <div className="mt-4 flex items-center gap-8 text-center" aria-label="آمار کاتالوگ">
            <div>
              <p className="text-lg font-black">{fa(sellListings.length)}</p>
              <p className="text-[11px] text-muted-foreground">کالا</p>
            </div>
          </div>

          {/* دکمه‌های تماس و دنبال کردن */}
          <div className="mt-5 flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            <ContactButton slug={slug} bizName={biz.name} label={`تماس با ${isOwner ? "فروشنده" : biz.name}`} className="sm:min-w-44" />
            {!isOwner && (
              <Button variant="outline" onClick={follow} disabled={followToggle.isPending} className="sm:min-w-36">
                دنبال کردن
              </Button>
            )}
          </div>
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
            {sellListings.map((l) => {
              const photo = l.gallery?.[0];
              return (
              <article key={l.id} className="animate-fade-up overflow-hidden rounded-2xl border bg-white shadow-sm transition hover:shadow-md">
                {photo ? (
                  /* next/image — تامبنیل ابر با srcset و فرمت بهینه */
                  <div className="relative aspect-[4/3] w-full overflow-hidden">
                    <Image
                      src={photo.thumbUrl ?? photo.url}
                      alt={goodName(l.good)}
                      fill
                      sizes="(min-width: 640px) 33vw, 50vw"
                      className="object-cover"
                    />
                  </div>
                ) : (
                  // بی‌عکس: کاشی حرفیِ تخت — همان هویت پیش از سیستم فایل‌ها
                  <div className="grid aspect-[4/3] place-items-center bg-gradient-to-br from-accent/70 via-accent/30 to-transparent">
                    <span className="text-5xl font-black text-primary/20" aria-hidden>
                      {goodName(l.good).slice(0, 1)}
                    </span>
                  </div>
                )}
                <div className="p-3">
                  <p className="truncate font-extrabold" title={goodName(l.good)}>
                    {goodName(l.good)}
                    {l.brand && <span className="ms-1.5 text-[11px] font-medium text-muted-foreground">{l.brand.name}</span>}
                  </p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">{categoryName(l.good.category)}</p>
                  <p className="mt-2 text-lg font-black text-primary">
                    {fmtMoney(l.priceMinor, l.currency)}
                  </p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    هر {unitLabel(l.good.unit)} · حداقل {fa(l.minOrder ?? 0)} {unitLabel(l.good.unit)}
                  </p>
                  <Badge variant="secondary" className="mt-2">
                    موجودی: {fa(l.stock ?? 0)}
                  </Badge>
                </div>
              </article>
              );
            })}
          </div>
        )}
      </section>

    </>
  );
}

// ─── نمای بازوی خرید (لیست خرید عمومی) ───
export function BuyArmView({ slug }: { slug: string }) {
  const { toast } = useToast();
  const { status, businesses: storeBizs, user } = useAuthStore();
  const followBuyerToggle = useFollowBuyerToggle();

  // فالوی خریدار — قرینه‌ی «دنبال کردن» کاتالوگ؛ رایگان (خواسته‌ی کاربر:
  // سمت تقاضا اذیت نمی‌شود — جذب تامین‌کننده مسیر رشد بهتری می‌خواهد)
  const mine = storeBizs[0];
  const profileQ = useBusinessProfile(slug);
  const biz = profileQ.data;
  const isOwner = isCatalogOwner(slug, storeBizs, user?.role);
  const stateQ = useMarketState(status === "authed" && !isOwner ? (mine?.id ?? null) : null);
  const mState = stateQ.data;
  const deskFollowed = !!biz && !!mState && mState.followedBuyerIds.includes(biz.id);

  const followDesk = () => {
    if (!biz || !mine) return;
    followBuyerToggle.mutate(
      { businessId: mine.id, buyerId: biz.id, follow: !deskFollowed },
      {
        onSuccess: () =>
          toast(
            deskFollowed
              ? { title: "فالو برداشته شد" }
              : { title: "فالو شد", description: "به عنوان تامین‌کننده در «تامین من» او ظاهر می‌شوید." }
          ),
        onError: (e) => toast({ title: e.message || "خطا", variant: "destructive" }),
      }
    );
  };

  const buyListings = (biz?.listings ?? []).filter(
    (l) => (l.mode === "BUY" || l.mode === "BOTH") && l.volume !== null
  );

  useEffect(() => {
    if (biz) document.title = `${biz.name} — لیست خرید | iMach`;
  }, [biz]);

  if (profileQ.isLoading) {
    return (
      <div className="grid place-items-center py-32">
        <Loader2 className="size-6 animate-spin text-stone-700" />
      </div>
    );
  }

  if (!biz) {
    return (
      <div className="grid place-items-center px-4 py-24 text-center">
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
    <>
      {/* نوار مالک — مدیریت · دیدن · اشتراک‌گذاری */}
      {isOwner && <OwnerBar kind="buy" slug={slug} />}

      {/* هدر لیست خرید */}
      <section className="rounded-3xl border bg-white p-5 shadow-sm sm:p-7">
        <div className="flex flex-col items-center text-center">
          {biz.logo?.thumbUrl || biz.logo?.url ? (
            <Image
              src={(biz.logo?.thumbUrl ?? biz.logo?.url)!}
              alt={biz.name}
              width={80}
              height={80}
              className="size-20 rounded-3xl object-cover shadow-inner"
            />
          ) : (
            <span className="grid size-20 place-items-center rounded-3xl bg-stone-800/10 text-4xl font-black text-stone-700 shadow-inner">
              {biz.name.slice(0, 1)}
            </span>
          )}
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
          <OwnerLine owner={biz.owner} tone="buy" />

          {/* آمار — کلیک = لیست */}
          <div className="mt-4 flex items-center gap-8 text-center" aria-label="آمار لیست خرید">
            <div>
              <p className="text-lg font-black">{fa(buyListings.length)}</p>
              <p className="text-[11px] text-muted-foreground">کالا</p>
            </div>
          </div>

          <div className="mt-5 flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            <ContactButton
              slug={slug}
              bizName={biz.name}
              label={`تماس با ${isOwner ? "خریدار" : biz.name}`}
              arm="buy"
              className="bg-stone-800 hover:bg-stone-900 sm:min-w-44"
            />
            {!isOwner && status === "authed" && mine && (
              <Button
                variant="outline"
                onClick={followDesk}
                disabled={followBuyerToggle.isPending}
                className={`sm:min-w-36 ${deskFollowed ? "border-stone-300 bg-stone-100 text-stone-700" : ""}`}
              >
                {followBuyerToggle.isPending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : deskFollowed ? (
                  <Check className="size-4" />
                ) : null}
                {deskFollowed ? "فالو شد" : "دنبال کردن"}
              </Button>
            )}
          </div>
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
            {buyListings.map((l) => {
              const photo = l.gallery?.[0];
              return (
              <article key={l.id} className="animate-fade-up flex items-center gap-3 rounded-2xl border bg-white p-4 shadow-sm">
                {photo ? (
                  <Image
                    src={photo.thumbUrl ?? photo.url}
                    alt={goodName(l.good)}
                    width={44}
                    height={44}
                    className="size-11 shrink-0 rounded-xl object-cover"
                  />
                ) : (
                  <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-stone-100 text-lg font-black text-stone-600">
                    {goodName(l.good).slice(0, 1)}
                  </span>
                )}
                <div className="min-w-0 grow">
                  <p className="truncate font-extrabold" title={goodName(l.good)}>
                    {goodName(l.good)}
                    {l.brand && <span className="ms-1.5 text-[11px] font-medium text-muted-foreground">{l.brand.name}</span>}
                  </p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">{categoryName(l.good.category)}</p>
                </div>
                <div className="shrink-0 text-end">
                  <Badge variant="outline" className="border-stone-300 bg-stone-50 text-stone-700">
                    {fa(l.volume as number)} {unitLabel(l.good.unit)}
                  </Badge>
                  <p className="mt-1 text-[11px] text-muted-foreground">{frequencyLabel(l.frequency ?? "MONTHLY")}</p>
                </div>
              </article>
              );
            })}
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

    </>
  );
}
