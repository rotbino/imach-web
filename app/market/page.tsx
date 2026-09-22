"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  CURRENCIES,
  categoryName,
  currencyLabel,
  fa,
  fmtMoney,
  frequencyLabel,
  goodName,
  timeAgo,
  unitLabel,
} from "@/lib/format";
import { useAuthStore } from "@/lib/auth-store";
import { useActiveBusiness, useArm } from "@/lib/active-biz";
import {
  useBuyRequests,
  useExploreFeed,
  useFollowBuyerToggle,
  useFollowToggle,
  useFollows,
  useMarketState,
  useOfferBuyRequest,
  useSupplierSuggestions,
} from "@/lib/queries";
import type {
  ExploreItemDto,
  MarketItemDto,
  MarketStateDto,
  SupplierSuggestionDto,
} from "@/lib/api";
import { AppFooter, AppHeader, MatchRing, MobileTabBar } from "@/app/components/chrome";
import { ShareContent } from "@/app/components/share";
import { EmptyFeed, FeedSpinner } from "@/app/components/feed-cards";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import {
  BadgeCheck,
  Check,
  ClipboardList,
  Link2,
  Loader2,
  Lock,
  MapPin,
  Package,
  ShoppingBag,
  Users,
} from "lucide-react";

/*
 * خریدارها / فروشنده‌ها — میدان کشف آی‌ماچ:
 * • بازوی فروش → «خریدارها»: درخواست‌های خرید مرتبط با کالاهای من.
 *   گیت ۱ — کاتالوگ خالی: بدون حداقل یک کالا، لیستی نیست (سیمگن تطبیق نداریم).
 *   گیت ۲ — معرف: فالو و ارسال پیشنهاد فقط بعد از آوردن {REFERRAL_TARGET}
 *   عضو با لینک کاتالوگ فعال می‌شود؛ پیشرفت همیشه بالای صفحه دیده می‌شود
 *   (خواسته‌ی کاربر: هیچ‌چیز مفت به دست نمی‌آید — بهای دسترسی، توزیع است).
 *   گشتن در کل بازار آزاد است؛ عمل کردن گیت دارد.
 * • بازوی خرید → «فروشنده‌ها»: تامین‌کننده‌های مرتبط + کالاهای در حال فروش؛
 *   فالوی تامین‌کننده برای خریدار رایگان است — خریدارِ کمیاب نباید بهایی بدهد
 *   (نقد پذیرفته‌شده؛ سمت تقاضا باید آزاد بماند).
 * • لیست تک‌ستونی در max-w-4xl.
 */

export default function MarketPage() {
  const { status } = useAuthStore();
  const arm = useArm();

  useEffect(() => {
    document.title = arm === "buy" ? "فروشنده‌ها | iMach" : "خریدارها | iMach";
  }, [arm]);

  const isBuyArm = arm === "buy";

  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader />
      <main className="grow">
        <div className="mx-auto max-w-4xl px-4 py-5">
          {/* عنوان صفحه — برای جهت‌دهی فضای خرید/فروش */}
          <h1 className="mb-4 flex items-center gap-2 text-lg font-black">
            {isBuyArm ? (
              <>
                <ShoppingBag className="size-5 text-primary" />
                فروشنده‌ها
              </>
            ) : (
              <>
                <ClipboardList className="size-5 text-stone-700" />
                خریدارها
              </>
            )}
          </h1>

          {isBuyArm ? <SellersField authed={status === "authed"} /> : <BuyersField authed={status === "authed"} />}
        </div>
      </main>
      <AppFooter />
      <MobileTabBar />
    </div>
  );
}

// ─── فضای خرید — بازوی فروش: درخواست‌های خریدِ مرتبط + گیت‌های رشد ───

function BuyersField({ authed }: { authed: boolean }) {
  const active = useActiveBusiness();
  const stateQ = useMarketState(authed ? (active?.id ?? null) : null);
  const relatedQ = useBuyRequests(authed ? (active?.id ?? null) : null);
  const allQ = useExploreFeed("BUY");

  const state = stateQ.data;
  const related: MarketItemDto[] = relatedQ.data ?? [];
  const relIds = useMemo(() => new Set(related.map((r) => r.id)), [related]);
  const others = (allQ.data ?? []).filter((l) => !relIds.has(l.id));

  if (allQ.isLoading || (authed && stateQ.isLoading)) return <FeedSpinner />;

  // گیت ۰ — هنوز کسب‌وکاری ندارد؛ اول هویت، بعد بازار
  if (authed && !active) {
    return (
      <div className="rounded-3xl border border-dashed bg-white/70 p-10 text-center">
        <p className="text-sm font-bold">اول کسب‌وکارتان را بسازید</p>
        <p className="mx-auto mt-2 max-w-sm text-xs leading-6 text-muted-foreground">
          بازار خریدارها با کسب‌وکار شما تطبیق می‌خورد.
        </p>
        <Link
          href="/start"
          className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground shadow-sm"
        >
          ساخت کسب‌وکار
        </Link>
      </div>
    );
  }

  // گیت ۱ — کاتالوگ خالی: بدون کالا، تطبیقی معنا ندارد (خواسته‌ی کاربر)
  if (state && state.sellCount === 0) {
    return (
      <div className="rounded-3xl border border-dashed bg-white/70 p-10 text-center">
        <span className="mx-auto grid size-12 place-items-center">
          <Package className="size-6 text-stone-400" />
        </span>
        <p className="mt-2 text-sm font-bold">برای دیدن خریدارها، اول یک کالا در کاتالوگتان ثبت کنید</p>
        <p className="mx-auto mt-2 max-w-sm text-xs leading-6 text-muted-foreground">
          بازار خریدارها با کالاهای فروش شما تطبیق می‌خورد.
        </p>
        <Link
          href="/sell"
          className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground shadow-sm"
        >
          <Package className="size-3.5" />
          ثبت کالا در کاتالوگ
        </Link>
      </div>
    );
  }

  if (related.length === 0 && others.length === 0) {
    return <EmptyFeed icon={<ClipboardList className="size-6 text-stone-700" />} text="هنوز هیچ نیاز خریدی ثبت نشده است." />;
  }

  const locked = !!state && !state.referral.unlocked;

  return (
    <div className="space-y-6 pb-6">
      {/* گیت ۲ — نوار پیشرفت معرف: تا آنلاک، همیشه جلوی چشم */}
      {state && locked && active && (
        <ReferralStrip state={state} slug={active.slug} name={active.name} />
      )}

      {related.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-extrabold text-muted-foreground">مرتبط‌ترین با کالاهای شما</h2>
          <div className="space-y-3">
            {related.map((l) => (
              <BuyRequestRow key={l.id} item={l} score={l.score} authed={authed} state={state} bizId={active?.id ?? null} />
            ))}
          </div>
        </section>
      )}

      {others.length > 0 && (
        <section>
          {/* مشکل ۲ — وقتی مچ دقیق خالی است، صادقانه؛ گشتن آزاد، عمل کردن گیت‌دار */}
          {state && !locked && related.length === 0 && active && (
            <ShareNudge slug={active.slug} name={active.name} />
          )}
          <h2 className="mb-3 text-sm font-extrabold text-muted-foreground">
            {related.length > 0 ? "سایر درخواست‌های خرید" : "تمام درخواست‌های خرید بازار"}
          </h2>
          <div className="space-y-3">
            {others.map((l) => (
              <BuyRequestRow key={l.id} item={l} authed={authed} state={state} bizId={active?.id ?? null} />
            ))}
          </div>
        </section>
      )}

      {!authed && <GuestCta />}
    </div>
  );
}

// ─── نوار گیت معرف — پیشرفت + ابزار اشتراک (موتور رشد) ───

function ReferralStrip({ state, slug, name }: { state: MarketStateDto; slug: string; name: string }) {
  const pct = Math.min(100, Math.round((state.referral.count / state.referral.required) * 100));
  return (
    <section className="rounded-2xl border border-primary/25 bg-accent/50 p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="flex items-center gap-1.5 text-sm font-extrabold">
          <Users className="size-4 text-primary" />
          فالو و پیشنهاد قیمت
          <span className="text-primary">
            {fa(state.referral.count)} از {fa(state.referral.required)}
          </span>
        </p>
        <div
          className="h-1.5 w-20 shrink-0 overflow-hidden rounded-full bg-white"
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
        </div>
      </div>
      <ShareContent kind="sell" slug={slug} bizName={name} />
      <p className="mt-3 flex items-center gap-1 text-[11px] text-muted-foreground">
        <Link2 className="size-3" />
        هر ثبت‌نام از این لینک، هم مشتری شما می‌شود هم یک قدم تا فعال شدن پیشنهاد قیمت.
      </p>
    </section>
  );
}

// ─── نوار اشتراک وقتی مچ دقیق خالی است — بدون بن‌بست ───

function ShareNudge({ slug, name }: { slug: string; name: string }) {
  return (
    <section className="mb-3 rounded-2xl border border-primary/25 bg-accent/50 p-4">
      <p className="mb-3 text-sm font-extrabold">هنوز درخواستی دقیقاً برای کالاهای شما ثبت نشده</p>
      <ShareContent kind="sell" slug={slug} bizName={name} />
      <p className="mt-3 flex items-center gap-1 text-[11px] text-muted-foreground">
        <Link2 className="size-3" />
        خریدارهای مرتبط از لینک کاتالوگ شما می‌آیند.
      </p>
    </section>
  );
}

// ─── کارت درخواست خرید + اقدام‌های گیت‌دار (فالو / ارسال پیشنهاد) ───

function BuyRequestRow({
  item: l,
  score,
  authed,
  state,
  bizId,
}: {
  item: ExploreItemDto;
  score?: number;
  authed: boolean;
  state: MarketStateDto | undefined;
  bizId: string | null;
}) {
  const locked = !!state && !state.referral.unlocked;
  const followed = !!state && state.followedBuyerIds.includes(l.business.id);
  const offered = !!state && state.offeredBuyerIds.includes(l.business.id);
  const canOffer = !!state && state.sellGoodIds.includes(l.good.id);

  return (
    <article className="animate-fade-up rounded-2xl border bg-white p-4 shadow-sm transition hover:border-stone-300 hover:shadow-md">
      <Link href={`/buy/${l.business.slug}`} className="block">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate font-extrabold" title={goodName(l.good)}>
              نیاز به خرید {goodName(l.good)}
            </p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">{categoryName(l.good.category)}</p>
          </div>
          {score !== undefined && score > 0 && <MatchRing score={score} size={44} />}
        </div>

        {/* مشخصات خرید — حجم + تناوب */}
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <Badge variant="outline" className="border-stone-300 bg-stone-50 text-stone-700">
            {fa(l.volume as number)} {unitLabel(l.good.unit)}
          </Badge>
          <Badge variant="outline" className="border-stone-300 bg-stone-50 text-stone-700">
            {frequencyLabel(l.frequency ?? "MONTHLY")}
          </Badge>
        </div>

        {/* خریدار — صاحب نیاز */}
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t pt-2.5 text-[11px] text-muted-foreground">
          <span className="flex min-w-0 items-center gap-1.5">
            <span
              className="grid size-5 shrink-0 place-items-center rounded-md bg-stone-200 text-[10px] font-black text-stone-700"
              aria-hidden
            >
              {l.business.name.slice(0, 1)}
            </span>
            <span className="truncate font-bold text-foreground">{l.business.name}</span>
            {l.business.isVerified && <BadgeCheck className="size-3.5 shrink-0 text-stone-600" aria-label="تاییدشده" />}
            <span className="flex shrink-0 items-center gap-0.5">
              <MapPin className="size-3" />
              {l.business.city}
            </span>
          </span>
          <span className="shrink-0">{timeAgo(l.updatedAt)}</span>
        </div>
      </Link>

      {/* اقدام‌ها — پشت گیت معرف (خواسته‌ی کاربر) */}
      {authed && state && bizId && (
        <div className="mt-3 flex items-center gap-2 border-t pt-3">
          <FollowBuyerButton bizId={bizId} buyerId={l.business.id} locked={locked} followed={followed} />
          {canOffer && <OfferButton bizId={bizId} listingId={l.id} locked={locked} offered={offered} buyerName={l.business.name} />}
        </div>
      )}
    </article>
  );
}

// ─── دکمه فالو خریدار — قفل/فعال/فالوشده ───

function FollowBuyerButton({
  bizId,
  buyerId,
  locked,
  followed,
}: {
  bizId: string;
  buyerId: string;
  locked: boolean;
  followed: boolean;
}) {
  const { toast } = useToast();
  const toggle = useFollowBuyerToggle();

  if (locked) {
    return (
      <Button size="sm" variant="outline" disabled className="h-8 gap-1.5 rounded-xl px-3 text-xs text-muted-foreground">
        <Lock className="size-3" />
        فالو
      </Button>
    );
  }

  return (
    <Button
      size="sm"
      variant={followed ? "secondary" : "outline"}
      disabled={toggle.isPending}
      className={`h-8 gap-1.5 rounded-xl px-3 text-xs ${
        followed ? "border-primary/30 bg-primary/10 text-primary hover:bg-primary/15" : ""
      }`}
      onClick={() =>
        toggle.mutate(
          { businessId: bizId, buyerId, follow: !followed },
          {
            onSuccess: () =>
              toast(
                followed
                  ? { title: "فالو برداشته شد" }
                  : { title: "فالو شد", description: "در «تامین من» این خریدار دیده می‌شوید." }
              ),
            onError: (e) => toast({ title: e.message || "خطا", variant: "destructive" }),
          }
        )
      }
    >
      {toggle.isPending ? <Loader2 className="size-3 animate-spin" /> : followed ? <Check className="size-3" /> : null}
      {followed ? "فالو شد" : "فالو"}
    </Button>
  );
}

// ─── دکمه + فرم ارسال پیشنهاد — روی کالاهایی که واقعاً می‌فروشم ───

function OfferButton({
  bizId,
  listingId,
  locked,
  offered,
  buyerName,
}: {
  bizId: string;
  listingId: string;
  locked: boolean;
  offered: boolean;
  buyerName: string;
}) {
  const { toast } = useToast();
  const offerMut = useOfferBuyRequest();
  const state = useMarketState(bizId);
  const cur = state.data?.currency ?? "IRR";
  const exp = CURRENCIES[cur]?.exp ?? 0;

  const [open, setOpen] = useState(false);
  const [price, setPrice] = useState("");
  const [note, setNote] = useState("");
  const digits = price.replace(/\D/g, "");
  const valid = digits.length > 0 && Number(digits) > 0;

  if (locked) {
    return (
      <Button size="sm" variant="outline" disabled className="h-8 gap-1.5 rounded-xl px-3 text-xs text-muted-foreground">
        <Lock className="size-3" />
        ارسال پیشنهاد
      </Button>
    );
  }

  const submit = () => {
    if (!valid) return;
    offerMut.mutate(
      { businessId: bizId, buyListingId: listingId, priceMinor: Math.round(Number(digits) * 10 ** exp), note: note.trim() || undefined },
      {
        onSuccess: () => {
          setOpen(false);
          setPrice("");
          setNote("");
          toast({ title: "پیشنهاد ارسال شد", description: `در پیشنهادهای دریافتی ${buyerName} می‌افتد.` });
        },
        onError: (e) => toast({ title: e.message || "خطا", variant: "destructive" }),
      }
    );
  };

  return (
    <div className="grow">
      <Button
        size="sm"
        variant={offered ? "secondary" : "outline"}
        className={`h-8 gap-1.5 rounded-xl px-3 text-xs ${
          offered ? "border-primary/30 bg-primary/10 text-primary hover:bg-primary/15" : ""
        }`}
        onClick={() => setOpen((o) => !o)}
      >
        {offered ? <Check className="size-3" /> : null}
        {offered ? "ارسال شد" : "ارسال پیشنهاد"}
      </Button>

      {open && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
          className="mt-2.5 rounded-xl border border-primary/25 bg-accent/40 p-3"
        >
          <div className="flex items-center gap-2">
            <Input
              dir="ltr"
              inputMode="numeric"
              placeholder="قیمت هر واحد"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="h-9 grow text-left"
              aria-label="قیمت پیشنهادی هر واحد"
            />
            <span className="shrink-0 rounded-xl border bg-white px-3 py-2 text-xs font-bold text-muted-foreground">
              {currencyLabel(cur)}
            </span>
          </div>
          <Input
            placeholder="توضیح (اختیاری)"
            value={note}
            maxLength={300}
            onChange={(e) => setNote(e.target.value)}
            className="mt-2 h-9"
            aria-label="توضیح پیشنهاد"
          />
          <div className="mt-2.5 flex items-center justify-end gap-2">
            <Button type="button" size="sm" variant="ghost" className="h-8 rounded-xl px-3 text-xs" onClick={() => setOpen(false)}>
              بی‌خیال
            </Button>
            <Button type="submit" size="sm" disabled={offerMut.isPending || !valid} className="h-8 rounded-xl px-4 text-xs">
              {offerMut.isPending ? <Loader2 className="size-3 animate-spin" /> : null}
              ارسال
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}

// ─── فضای فروش — بازوی خرید: تامین‌کننده‌های مرتبط + کالاهای در حال فروش ───

function SellersField({ authed }: { authed: boolean }) {
  const active = useActiveBusiness();
  const relatedQ = useSupplierSuggestions(authed ? (active?.id ?? null) : null);
  const allQ = useExploreFeed("SELL");
  const followsQ = useFollows(authed ? (active?.id ?? null) : null);

  const related: SupplierSuggestionDto[] = relatedQ.data ?? [];
  const relListingIds = useMemo(() => new Set(related.map((r) => r.listingId)), [related]);
  const others = (allQ.data ?? []).filter((l) => !relListingIds.has(l.id));
  const followedIds = useMemo(() => new Set((followsQ.data ?? []).map((f) => f.supplierId)), [followsQ.data]);

  if (allQ.isLoading) return <FeedSpinner />;
  if (related.length === 0 && others.length === 0) {
    return <EmptyFeed icon={<ShoppingBag className="size-6 text-primary" />} text="هنوز هیچ کالایی برای فروش ثبت نشده است." />;
  }

  const followProps = {
    authed,
    bizId: active?.id ?? null,
    selfId: active?.id ?? null,
    followedIds,
  };

  return (
    <div className="space-y-6 pb-6">
      {related.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-extrabold text-muted-foreground">تامین‌کننده‌های پیشنهادی برای نیازهای شما</h2>
          <div className="space-y-3">
            {related.map((s) => (
              <SupplierMatchRow key={s.listingId} s={s} {...followProps} />
            ))}
          </div>
        </section>
      )}

      {others.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-extrabold text-muted-foreground">کالاهای در حال فروش</h2>
          <div className="space-y-3">
            {others.map((l) => (
              <SellRow key={l.id} item={l} {...followProps} />
            ))}
          </div>
        </section>
      )}

      {!authed && <GuestCta />}
    </div>
  );
}

// ─── دکمه فالو تامین‌کننده — رایگان برای خریدار (سمت تقاضا گیت ندارد) ───

function FollowSupplierButton({
  bizId,
  supplierId,
  supplierName,
  followedIds,
}: {
  bizId: string;
  supplierId: string;
  supplierName: string;
  followedIds: Set<string>;
}) {
  const { toast } = useToast();
  const followToggle = useFollowToggle();
  const followed = followedIds.has(supplierId);

  return (
    <Button
      size="sm"
      variant={followed ? "secondary" : "outline"}
      disabled={followToggle.isPending}
      className={`h-8 shrink-0 gap-1.5 rounded-xl px-3 text-xs ${
        followed ? "border-stone-300 bg-stone-100 text-stone-700" : ""
      }`}
      onClick={(e) => {
        e.preventDefault();
        followToggle.mutate(
          { businessId: bizId, supplierId, follow: !followed },
          {
            onSuccess: () =>
              toast(
                followed
                  ? { title: "از شبکه حذف شد" }
                  : { title: "فالو شد", description: `کاتالوگ ${supplierName} در «تامین من» شماست.` }
              ),
            onError: (err) => toast({ title: err.message || "خطا", variant: "destructive" }),
          }
        );
      }}
    >
      {followToggle.isPending ? (
        <Loader2 className="size-3 animate-spin" />
      ) : followed ? (
        <Check className="size-3" />
      ) : null}
      {followed ? "فالو شد" : "فالو"}
    </Button>
  );
}

/** فالو فقط برای عضوِ صاحب کسب‌وکار، نه خودش — بقیه سطر لینک است */
function canFollowRow(authed: boolean, bizId: string | null, selfId: string | null, ownerId: string): boolean {
  return authed && !!bizId && selfId !== ownerId;
}

// ─── سطر تامین‌کننده‌ی مرتبط — امتیاز تطبیق + قیمت + فالو ───

function SupplierMatchRow({
  s,
  authed,
  bizId,
  selfId,
  followedIds,
}: {
  s: SupplierSuggestionDto;
  authed: boolean;
  bizId: string | null;
  selfId: string | null;
  followedIds: Set<string>;
}) {
  const showFollow = canFollowRow(authed, bizId, selfId, s.supplierId);
  return (
    <article className="flex animate-fade-up items-center gap-3 rounded-2xl border bg-white p-4 shadow-sm transition hover:border-stone-300 hover:shadow-md">
      <Link href={`/sell/${s.supplierSlug}`} className="flex min-w-0 grow items-center gap-3">
        <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-lg font-black text-primary">
          {s.supplierName.slice(0, 1)}
        </span>
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 truncate font-extrabold">
            {s.supplierName}
            {s.supplierVerified && <BadgeCheck className="size-3.5 shrink-0 text-primary" aria-label="تاییدشده" />}
          </p>
          <p className="mt-0.5 flex items-center gap-1 truncate text-[11px] text-muted-foreground">
            <MapPin className="size-3 shrink-0" />
            {s.supplierCity} · {s.goodName}
          </p>
        </div>
        <div className="ms-auto shrink-0 text-end">
          <p className="text-base font-black text-primary">{fmtMoney(s.priceMinor, s.currency)}</p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            هر {s.unit} · حداقل {fa(s.minOrder)}
          </p>
        </div>
        {s.score > 0 && <MatchRing score={s.score} size={44} />}
      </Link>
      {showFollow && bizId && (
        <FollowSupplierButton bizId={bizId} supplierId={s.supplierId} supplierName={s.supplierName} followedIds={followedIds} />
      )}
    </article>
  );
}

// ─── سطر کالای فروشی — لیست تک‌ستونی + فالو ───

function SellRow({
  item: l,
  authed,
  bizId,
  selfId,
  followedIds,
}: {
  item: ExploreItemDto;
  authed: boolean;
  bizId: string | null;
  selfId: string | null;
  followedIds: Set<string>;
}) {
  const showFollow = canFollowRow(authed, bizId, selfId, l.business.id);
  return (
    <article className="flex animate-fade-up items-center gap-3 rounded-2xl border bg-white p-4 shadow-sm transition hover:border-stone-300 hover:shadow-md">
      <Link href={`/sell/${l.business.slug}`} className="flex min-w-0 grow items-center gap-3">
        <div className="grid size-12 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-accent/70 via-accent/30 to-transparent text-xl font-black text-primary/40">
          {goodName(l.good).slice(0, 1)}
        </div>
        <div className="min-w-0">
          <p className="truncate font-extrabold" title={goodName(l.good)}>
            {goodName(l.good)}
          </p>
          <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{categoryName(l.good.category)}</p>
          <p className="mt-1.5 flex items-center gap-1 truncate text-[11px] text-muted-foreground">
            <span className="grid size-4.5 shrink-0 place-items-center rounded bg-primary/10 text-[9px] font-black text-primary" aria-hidden>
              {l.business.name.slice(0, 1)}
            </span>
            <span className="font-bold text-foreground">{l.business.name}</span>
            {l.business.isVerified && <BadgeCheck className="size-3 shrink-0 text-primary" aria-label="تاییدشده" />}
            <MapPin className="size-3 shrink-0" />
            {l.business.city}
          </p>
        </div>
        <div className="ms-auto shrink-0 text-end">
          <p className="text-base font-black text-primary">{fmtMoney(l.priceMinor, l.currency)}</p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">هر {unitLabel(l.good.unit)}</p>
        </div>
      </Link>
      {showFollow && bizId && (
        <FollowSupplierButton bizId={bizId} supplierId={l.business.id} supplierName={l.business.name} followedIds={followedIds} />
      )}
    </article>
  );
}

// ─── CTA مهمان — بازار، بازار شما هم می‌تواند باشد ───

function GuestCta() {
  return (
    <section className="rounded-3xl border border-primary/25 bg-white p-6 text-center shadow-sm">
      <p className="text-base font-extrabold">این بازار، بازار شما هم می‌تواند باشد</p>
      <p className="mx-auto mt-1 max-w-sm text-xs leading-6 text-muted-foreground">
        کاتالوگ فروش و لیست خرید هوشمند iMach — رایگان.
      </p>
      <Link href="/start">
        <Button className="mt-4 rounded-xl px-6 shadow-lg shadow-primary/25">
          <ShoppingBag className="size-4" />
          ساخت کسب‌وکار رایگان من
        </Button>
      </Link>
    </section>
  );
}
