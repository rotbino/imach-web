"use client";

import Link from "next/link";
import type { ExploreItemDto } from "@/lib/api";
import { fa, categoryName, fmtMoney, goodName, unitLabel, frequencyLabel } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { BadgeCheck, ClipboardList, Loader2, MapPin, Store } from "lucide-react";

/*
 * کارت‌های فید مشترک — هم اکسپلور و هم هوم از این‌ها استفاده می‌کنند:
 * کارت فروش شبیه آلبوم اینستاگرام، سطر خرید شبیه لیست.
 */

export function FeedSpinner() {
  return (
    <div className="grid place-items-center py-24">
      <Loader2 className="size-6 animate-spin text-primary" />
    </div>
  );
}

export function EmptyFeed({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="rounded-3xl border border-dashed bg-white/70 p-10 text-center">
      <span className="mx-auto grid size-12 place-items-center">{icon}</span>
      <p className="mt-2 text-sm text-muted-foreground">{text}</p>
    </div>
  );
}

export function ExploreSellCard({ item: l }: { item: ExploreItemDto }) {
  return (
    <Link href={`/sell/${l.business.slug}`} aria-label={`کاتالوگ ${l.business.name}`}>
      <article className="animate-fade-up h-full overflow-hidden rounded-2xl border bg-white shadow-sm transition hover:shadow-md">
        {/* تا زمان سیستم فایل‌ها: کاشی حرفیِ تخت به‌جای عکس */}
        <div className="grid aspect-[4/3] place-items-center bg-gradient-to-br from-accent/70 via-accent/30 to-transparent">
          <span className="text-5xl font-black text-primary/20" aria-hidden>
            {goodName(l.good).slice(0, 1)}
          </span>
        </div>
        <div className="p-3">
          <p className="truncate font-extrabold" title={goodName(l.good)}>
            {goodName(l.good)}
          </p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">{categoryName(l.good.category)}</p>
          {l.priceMinor !== null && (
            <p className="mt-2 text-lg font-black text-primary">{fmtMoney(l.priceMinor, l.currency)}</p>
          )}
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            {unitLabel(l.good.unit)}
            {l.minOrder ? ` · ${fa(l.minOrder)} ${unitLabel(l.good.unit)}` : ""}
          </p>
          <BizRow item={l} tone="sell" />
        </div>
      </article>
    </Link>
  );
}

export function ExploreBuyRow({ item: l }: { item: ExploreItemDto }) {
  return (
    <Link href={`/buy/${l.business.slug}`} aria-label={`لیست خرید ${l.business.name}`}>
      <article className="animate-fade-up flex items-center gap-3 rounded-2xl border bg-white p-4 shadow-sm transition hover:shadow-md">
        <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-stone-100 text-lg font-black text-stone-600">
          {goodName(l.good).slice(0, 1)}
        </span>
        <div className="min-w-0 grow">
          <p className="truncate font-extrabold" title={goodName(l.good)}>
            {goodName(l.good)}
          </p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">{categoryName(l.good.category)}</p>
          <BizRow item={l} tone="buy" />
        </div>
        <div className="shrink-0 text-end">
          <Badge variant="outline" className="border-stone-300 bg-stone-50 text-stone-700">
            {fa(l.volume as number)} {unitLabel(l.good.unit)}
          </Badge>
          <p className="mt-1 text-[11px] text-muted-foreground">{frequencyLabel(l.frequency ?? "MONTHLY")}</p>
        </div>
      </article>
    </Link>
  );
}

export function SellFeedIcon() {
  return <Store className="size-6 text-primary/40" />;
}

export function BuyFeedIcon() {
  return <ClipboardList className="size-6 text-stone-400" />;
}

/** سطر کسب‌وکار — صاحبِ کالا، با نشان تایید و شهر */
function BizRow({ item: l, tone }: { item: ExploreItemDto; tone: "sell" | "buy" }) {
  return (
    <div className="mt-2.5 flex items-center gap-1.5 border-t pt-2.5 text-[11px] text-muted-foreground">
      <span
        className={`grid size-5 shrink-0 place-items-center rounded-md text-[10px] font-black ${
          tone === "sell" ? "bg-primary/10 text-primary" : "bg-stone-200 text-stone-700"
        }`}
        aria-hidden
      >
        {l.business.name.slice(0, 1)}
      </span>
      <span className="flex min-w-0 items-center gap-1">
        <span className="truncate font-bold text-foreground">{l.business.name}</span>
        {l.business.isVerified && (
          <BadgeCheck className={`size-3.5 shrink-0 ${tone === "sell" ? "text-primary" : "text-stone-600"}`} aria-label="تاییدشده" />
        )}
      </span>
      <span className="ms-auto flex shrink-0 items-center gap-0.5">
        <MapPin className="size-3" />
        {l.business.city}
      </span>
    </div>
  );
}
