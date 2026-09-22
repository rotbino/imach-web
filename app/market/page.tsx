"use client";

import { useEffect, useMemo } from "react";
import Link from "next/link";
import { fa, categoryName, fmtMoney, frequencyLabel, goodName, timeAgo, unitLabel } from "@/lib/format";
import { useAuthStore } from "@/lib/auth-store";
import { useArm } from "@/lib/active-biz";
import { useExploreFeed, useBuyRequests, useSupplierSuggestions } from "@/lib/queries";
import type { ExploreItemDto, MarketItemDto, SupplierSuggestionDto } from "@/lib/api";
import { AppFooter, AppHeader, MatchRing, MobileTabBar } from "@/app/components/chrome";
import { useActiveBusiness } from "@/lib/active-biz";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  BadgeCheck,
  ClipboardList,
  MapPin,
  ShoppingBag,
} from "lucide-react";
import { EmptyFeed, FeedSpinner } from "@/app/components/feed-cards";

/*
 * خریدارها / فروشنده‌ها — میدان کشف آی‌ماچ (بدون تب، خواسته‌ی کاربر):
 * • بازوی فروش → «خریدارها»: فقط درخواست‌های خرید؛ مرتبط‌ترین‌ها با کالاهای
 *   من بالای列表 با امتیاز تطبیق (همان فرمول‌های موتور تطبیق)، بعد بقیه بازار.
 * • بازوی خرید → «فروشنده‌ها»: فقط کالاهای در حال فروش؛ تامین‌کننده‌های
 *   پیشنهادی برای نیازهای من اول، بعد بقیه.
 * • لیست تک‌ستونی در max-w-4xl — دو ستونی تمام‌صفحه زشت است (خواسته‌ی کاربر).
 * • مهمان‌ها هم کامل می‌بینند تا غریبه‌ای که لینکی را باز کرده بتواند بگردد.
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

// ─── فضای خرید — بازوی فروش: درخواست‌های خریدِ مرتبط + بقیه بازار ───

function BuyersField({ authed }: { authed: boolean }) {
  const relatedQ = useRelatedBuyRequests(authed);
  const allQ = useExploreFeed("BUY");

  const related: MarketItemDto[] = relatedQ.data ?? [];
  const relIds = useMemo(() => new Set(related.map((r) => r.id)), [related]);
  const others = (allQ.data ?? []).filter((l) => !relIds.has(l.id));

  if (allQ.isLoading) return <FeedSpinner />;
  if (related.length === 0 && others.length === 0) {
    return <EmptyFeed icon={<ClipboardList className="size-6 text-stone-700" />} text="هنوز هیچ نیاز خریدی ثبت نشده است." />;
  }

  return (
    <div className="space-y-6 pb-6">
      {related.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-extrabold text-muted-foreground">مرتبط‌ترین با کالاهای شما</h2>
          <div className="space-y-3">
            {related.map((l) => (
              <BuyRequestRow key={l.id} item={l} score={l.score} />
            ))}
          </div>
        </section>
      )}

      {others.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-extrabold text-muted-foreground">
            {related.length > 0 ? "سایر درخواست‌های خرید" : "درخواست‌های خرید"}
          </h2>
          <div className="space-y-3">
            {others.map((l) => (
              <BuyRequestRow key={l.id} item={l} />
            ))}
          </div>
        </section>
      )}

      {!authed && <GuestCta />}
    </div>
  );
}

// ─── فضای فروش — بازوی خرید: تامین‌کننده‌های مرتبط + کالاهای در حال فروش ───

function SellersField({ authed }: { authed: boolean }) {
  const relatedQ = useSupplierSuggestionsForMarket(authed);
  const allQ = useExploreFeed("SELL");

  const related: SupplierSuggestionDto[] = relatedQ.data ?? [];
  const relListingIds = useMemo(() => new Set(related.map((r) => r.listingId)), [related]);
  const others = (allQ.data ?? []).filter((l) => !relListingIds.has(l.id));

  if (allQ.isLoading) return <FeedSpinner />;
  if (related.length === 0 && others.length === 0) {
    return <EmptyFeed icon={<ShoppingBag className="size-6 text-primary" />} text="هنوز هیچ کالایی برای فروش ثبت نشده است." />;
  }

  return (
    <div className="space-y-6 pb-6">
      {related.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-extrabold text-muted-foreground">تامین‌کننده‌های پیشنهادی برای نیازهای شما</h2>
          <div className="space-y-3">
            {related.map((s) => (
              <SupplierMatchRow key={s.listingId} s={s} />
            ))}
          </div>
        </section>
      )}

      {others.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-extrabold text-muted-foreground">کالاهای در حال فروش</h2>
          <div className="space-y-3">
            {others.map((l) => (
              <SellRow key={l.id} item={l} />
            ))}
          </div>
        </section>
      )}

      {!authed && <GuestCta />}
    </div>
  );
}

/** درخواست‌های خرید مرتبط — فقط برای عضوِ صاحب کسب‌وکار (موتور تطبیق) */
function useRelatedBuyRequests(authed: boolean) {
  const active = useActiveBusiness();
  return useBuyRequests(authed ? (active?.id ?? null) : null);
}

/** تامین‌کننده‌های پیشنهادی فقط برای عضوِ صاحب کسب‌وکار */
function useSupplierSuggestionsForMarket(authed: boolean) {
  const active = useActiveBusiness();
  return useSupplierSuggestions(authed ? (active?.id ?? null) : null);
}

// ─── کارت درخواست خرید — «نیاز به خرید خرمای خازویی ۵۰۰ گرمی» ───
// هر چیزی که فروشنده باید ببیند: کالا، حجم، تناوب، خریدار، شهر، تازگی، امتیاز.

function BuyRequestRow({ item: l, score }: { item: ExploreItemDto; score?: number }) {
  return (
    <Link href={`/buy/${l.business.slug}`} className="block animate-fade-up">
      <article className="rounded-2xl border bg-white p-4 shadow-sm transition hover:border-stone-300 hover:shadow-md">
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
      </article>
    </Link>
  );
}

// ─── سطر تامین‌کننده‌ی مرتبط — امتیاز تطبیق + قیمت کاتالوگ ───

function SupplierMatchRow({ s }: { s: SupplierSuggestionDto }) {
  return (
    <Link href={`/sell/${s.supplierSlug}`} className="block animate-fade-up">
      <article className="flex items-center gap-3 rounded-2xl border bg-white p-4 shadow-sm transition hover:border-stone-300 hover:shadow-md">
        <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-lg font-black text-primary">
          {s.supplierName.slice(0, 1)}
        </span>
        <div className="min-w-0 grow">
          <p className="flex items-center gap-1.5 truncate font-extrabold">
            {s.supplierName}
            {s.supplierVerified && <BadgeCheck className="size-3.5 shrink-0 text-primary" aria-label="تاییدشده" />}
          </p>
          <p className="mt-0.5 flex items-center gap-1 truncate text-[11px] text-muted-foreground">
            <MapPin className="size-3 shrink-0" />
            {s.supplierCity} · {s.goodName}
          </p>
        </div>
        <div className="shrink-0 text-end">
          <p className="text-base font-black text-primary">{fmtMoney(s.priceMinor, s.currency)}</p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            هر {s.unit} · حداقل {fa(s.minOrder)}
          </p>
        </div>
        {s.score > 0 && <MatchRing score={s.score} size={44} />}
      </article>
    </Link>
  );
}

// ─── سطر کالای فروشی — لیست تک‌ستونی ───

function SellRow({ item: l }: { item: ExploreItemDto }) {
  return (
    <Link href={`/sell/${l.business.slug}`} className="block animate-fade-up">
      <article className="flex items-center gap-3 rounded-2xl border bg-white p-4 shadow-sm transition hover:border-stone-300 hover:shadow-md">
        <div className="grid size-12 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-accent/70 via-accent/30 to-transparent text-xl font-black text-primary/40">
          {goodName(l.good).slice(0, 1)}
        </div>
        <div className="min-w-0 grow">
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
        <div className="shrink-0 text-end">
          <p className="text-base font-black text-primary">{fmtMoney(l.priceMinor, l.currency)}</p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">هر {unitLabel(l.good.unit)}</p>
        </div>
      </article>
    </Link>
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
