"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { fa, money, unitLabel, frequencyLabel, activityTypeLabel } from "@/lib/format";
import { useAuthStore } from "@/lib/auth-store";
import { useBusinessProfile, useFollowersBySlug, useFollowToggle, useFollowingBySlug } from "@/lib/queries";
import { manageHref } from "@/lib/active-biz";
import { ContactButton } from "@/app/components/contact-gate";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  BadgeCheck,
  Briefcase,
  ClipboardList,
  Loader2,
  MapPin,
  Package,
  Settings2,
  Store,
  Users,
  UsersRound,
} from "lucide-react";

/*
 * نمای بازوها — یک بار تعریف، دو جا استفاده:
 * • صفحات عمومی /sell/{slug} و /buy/{slug} (لینکی که برای مشتری/تامین‌کننده می‌فرستید)
 * • صفحه «بازوی من» (/arm) — همان ویترین با سوییچر خرید/فروش
 *
 * آمار اینستاگرامی (کالا · دنبال‌کننده · دنبال‌شونده) کلیک‌پذیر است و
 * لیستش را باز می‌کند — مثل اینستاگرام، برای همه visible تا حلقه ویروسی
 * بچرخد (خریدار می‌بیند چه کسانی اینجا خرید می‌کنند).
 * دکمه مدیریت فقط برای صاحب بازو دیده می‌شود و به داشبورد سبک همان بازو می‌رود.
 */

// ─── نمای بازوی فروش (کاتالوگ عمومی قیمت) ───
export function SellArmView({ slug }: { slug: string }) {
  const { toast } = useToast();
  const { status, businesses: storeBizs } = useAuthStore();
  const followToggle = useFollowToggle();
  const [listKind, setListKind] = useState<"followers" | "following" | null>(null);

  const profileQ = useBusinessProfile(slug);
  const biz = profileQ.data;

  const isOwner = !!storeBizs.find((b) => b.slug === slug);

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
      toast({ title: "اول کسب‌وکارتان را بسازید", description: "از پروفایل، کسب‌وکار بسازید و بعد دنبال کنید." });
      return;
    }
    followToggle.mutate(
      { businessId: mine.id, supplierId: biz!.id, follow: true },
      { onSuccess: () => toast({ title: `${biz!.name} دنبال شد`, description: "قیمت‌هایش در «تابلوی قیمت» مدیریت بازوی خرید شما جمع می‌شود." }) }
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
      {/* میان‌بر مدیریت برای صاحب کاتالوگ */}
      {isOwner && (
        <div className="mb-3 flex justify-center">
          <Link
            href={manageHref("sell")}
            className="flex items-center gap-1.5 rounded-full bg-primary px-3.5 py-1.5 text-xs font-bold text-primary-foreground shadow-sm"
          >
            <Settings2 className="size-3.5" />
            مدیریت بازوی فروش
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

          {/* آمار — مثل اینستاگرام؛ کلیک = لیست */}
          <div className="mt-4 flex items-center gap-8 text-center" aria-label="آمار کاتالوگ">
            <div>
              <p className="text-lg font-black">{fa(sellListings.length)}</p>
              <p className="text-[11px] text-muted-foreground">کالا</p>
            </div>
            <StatButton count={biz._count.followers} label="دنبال‌کننده" onClick={() => setListKind("followers")} />
            <StatButton count={biz._count.following} label="دنبال‌شونده" onClick={() => setListKind("following")} />
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
          {isOwner && (
            <p className="mt-3 flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <Store className="size-3.5 text-primary" />
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

      {/* لیست دنبال‌کننده/دنبال‌شونده */}
      <FollowListDialog
        open={listKind !== null}
        onOpenChange={(o) => !o && setListKind(null)}
        kind={listKind ?? "followers"}
        onKindChange={setListKind}
        slug={slug}
        fallbackCount={biz._count.followers}
      />
    </>
  );
}

// ─── نمای بازوی خرید (لیست خرید عمومی) ───
export function BuyArmView({ slug }: { slug: string }) {
  const { status } = useAuthStore();
  const [listKind, setListKind] = useState<"followers" | "following" | null>(null);

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
      {/* میان‌بر مدیریت برای صاحب لیست */}
      {isOwner && (
        <div className="mb-3 flex justify-center">
          <Link
            href={manageHref("buy")}
            className="flex items-center gap-1.5 rounded-full bg-stone-800 px-3.5 py-1.5 text-xs font-bold text-white shadow-sm"
          >
            <Settings2 className="size-3.5" />
            مدیریت بازوی خرید
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

          {/* آمار — کلیک = لیست */}
          <div className="mt-4 flex items-center gap-8 text-center" aria-label="آمار لیست خرید">
            <div>
              <p className="text-lg font-black">{fa(buyListings.length)}</p>
              <p className="text-[11px] text-muted-foreground">کالا</p>
            </div>
            <StatButton count={biz._count.followers} label="دنبال‌کننده" onClick={() => setListKind("followers")} dark />
            <StatButton count={biz._count.following} label="دنبال‌شونده" onClick={() => setListKind("following")} dark />
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

      <FollowListDialog
        open={listKind !== null}
        onOpenChange={(o) => !o && setListKind(null)}
        kind={listKind ?? "followers"}
        onKindChange={setListKind}
        slug={slug}
        fallbackCount={biz._count.followers}
      />
    </>
  );
}

// ─── آمار کلیک‌پذیر ───

function StatButton({
  count,
  label,
  onClick,
  dark,
}: {
  count: number;
  label: string;
  onClick: () => void;
  dark?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-xl px-2 py-1 transition hover:bg-black/5"
      aria-label={`${fa(count)} ${label} — نمایش لیست`}
    >
      <p className={`text-lg font-black ${dark ? "text-stone-800" : ""}`}>{fa(count)}</p>
      <p className="text-[11px] text-muted-foreground">{label}</p>
    </button>
  );
}

// ─── دیالوگ لیست دنبال‌کننده/دنبال‌شونده ───

export function FollowListDialog({
  open,
  onOpenChange,
  kind,
  onKindChange,
  slug,
  fallbackCount,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  kind: "followers" | "following";
  onKindChange: (k: "followers" | "following") => void;
  slug: string;
  fallbackCount: number;
}) {
  const followersQ = useFollowersBySlug(open ? slug : null);
  const followingQ = useFollowingBySlug(open ? slug : null);
  const rows = kind === "followers" ? followersQ.data : followingQ.data;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="sr-only">لیست دنبال‌کننده و دنبال‌شونده</DialogTitle>
          {/* سوییچر دنبال‌کننده / دنبال‌شونده */}
          <div className="flex items-center gap-1 rounded-xl bg-muted p-1" role="tablist">
            {([
              { v: "followers" as const, label: "دنبال‌کننده", icon: Users, count: followersQ.data?.length },
              { v: "following" as const, label: "دنبال‌شونده", icon: UsersRound, count: followingQ.data?.length },
            ]).map((t) => (
              <button
                key={t.v}
                type="button"
                role="tab"
                aria-selected={kind === t.v}
                onClick={() => onKindChange(t.v)}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-bold transition ${
                  kind === t.v ? "bg-white text-primary shadow-sm" : "text-muted-foreground"
                }`}
              >
                <t.icon className="size-3.5" />
                {t.label}
                {typeof t.count === "number" && <span className="text-[10px] font-normal">({fa(t.count)})</span>}
              </button>
            ))}
          </div>
        </DialogHeader>

        {(kind === "followers" ? followersQ.isLoading : followingQ.isLoading) ? (
          <div className="grid place-items-center py-10">
            <Loader2 className="size-5 animate-spin text-primary" />
          </div>
        ) : (rows ?? []).length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            {kind === "followers"
              ? "هنوز کسی این کسب‌وکار را دنبال نکرده است."
              : "این کسب‌وکار فعلا کسی را دنبال نکرده است."}
          </p>
        ) : (
          <div className="max-h-80 space-y-1.5 overflow-y-auto pe-1">
            {rows!.map((b) => (
              <Link
                key={b.slug}
                href={`/sell/${b.slug}`}
                onClick={() => onOpenChange(false)}
                className="flex items-center gap-3 rounded-xl border bg-white p-2.5 transition hover:border-primary/40"
              >
                <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-sm font-black text-primary">
                  {b.name.slice(0, 1)}
                </span>
                <div className="min-w-0 grow">
                  <p className="flex items-center gap-1 truncate text-sm font-bold">
                    {b.name}
                    {b.isVerified && <BadgeCheck className="size-3.5 shrink-0 text-primary" aria-label="تاییدشده" />}
                  </p>
                  <p className="flex items-center gap-0.5 text-[11px] text-muted-foreground">
                    <MapPin className="size-3" />
                    {b.city}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* نکته ویروسی: شماره واقعی از سرور می‌آید؛ اگر لیست خالی بود count هدر همچنان درست است */}
        <p className="text-center text-[11px] text-muted-foreground" aria-hidden>
          {fallbackCount > 0 ? `مجموع: ${fa(fallbackCount)}` : ""}
        </p>
      </DialogContent>
    </Dialog>
  );
}
