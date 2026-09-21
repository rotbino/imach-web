"use client";

import { useEffect } from "react";
import Link from "next/link";
import { fa, categoryName, fmtMoney, goodName, unitLabel, frequencyLabel } from "@/lib/format";
import { useAuthStore } from "@/lib/auth-store";
import { useExploreFeed } from "@/lib/queries";
import type { ExploreItemDto } from "@/lib/api";
import { AppFooter, AppHeader, MobileTabBar } from "@/app/components/chrome";
import { UrlTabs } from "@/app/components/url-tabs";
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
 * بازار — میدان کشف عمومی آی‌ماچ (سند فصل ۴.۴):
 * سطح اپ است و جزو هیچ محیطی نیست؛ بدون عضویت هم کامل کار می‌کند تا
 * غریبه‌ای که لینکی را در گروهی باز کرده، از همین‌جا هم بتواند بگردد.
 * پیشنهادهای شخصی‌سازی‌شده در کارتابلِ محیط‌ها زندگی می‌کنند، نه اینجا.
 */

export default function MarketPage() {
  const { status } = useAuthStore();

  useEffect(() => {
    document.title = "بازار | iMach";
  }, []);

  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader />
      <main className="grow">
        <UrlTabs
          defaultValue="sell"
          items={[
            { value: "sell", label: "کالاهای در حال فروش", icon: ShoppingBag },
            { value: "buy", label: "درخواست‌های خرید", icon: ClipboardList },
          ]}
          panels={{
            sell: <Feed mode="SELL" showCta={status !== "authed"} />,
            buy: <Feed mode="BUY" showCta={status !== "authed"} />,
          }}
        />
      </main>
      <AppFooter />
      <MobileTabBar />
    </div>
  );
}

function Feed({ mode, showCta }: { mode: "SELL" | "BUY"; showCta: boolean }) {
  const feedQ = useExploreFeed(mode);
  const items = feedQ.data ?? [];

  return (
    <div className="pb-6">
      {feedQ.isLoading ? (
        <FeedSpinner />
      ) : items.length === 0 ? (
        <div className="pt-4">
          <EmptyFeed
            icon={mode === "SELL" ? <ShoppingBag className="size-6 text-primary" /> : <ClipboardList className="size-6 text-stone-700" />}
            text={mode === "SELL" ? "هنوز هیچ کالایی برای فروش ثبت نشده است." : "هنوز هیچ نیاز خریدی ثبت نشده است."}
          />
        </div>
      ) : mode === "SELL" ? (
        <div className="grid grid-cols-2 gap-3 px-4 pt-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {items.map((l) => (
            <SellCard key={l.id} item={l} />
          ))}
        </div>
      ) : (
        <div className="grid gap-3 px-4 pt-4 lg:grid-cols-2">
          {items.map((l) => (
            <BuyRow key={l.id} item={l} />
          ))}
        </div>
      )}

      {showCta && (
        <section className="mx-4 mt-8 rounded-3xl border border-primary/25 bg-white p-6 text-center shadow-sm">
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
      )}
    </div>
  );
}

// ─── کارت فروش — شبیه تابلوی قیمت ───

function SellCard({ item: l }: { item: ExploreItemDto }) {
  return (
    <Link
      href={`/sell/${l.business.slug}`}
      className="animate-fade-up overflow-hidden rounded-2xl border bg-white shadow-sm transition hover:shadow-md"
    >
      <div className="grid aspect-[4/3] place-items-center bg-gradient-to-br from-accent/70 via-accent/30 to-transparent">
        <span className="text-5xl font-black text-primary/20" aria-hidden>
          {goodName(l.good).slice(0, 1)}
        </span>
      </div>
      <div className="p-3">
        <p className="truncate font-extrabold" title={goodName(l.good)}>
          {goodName(l.good)}
        </p>
        <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{categoryName(l.good.category)}</p>
        <p className="mt-2 text-lg font-black text-primary">{fmtMoney(l.priceMinor, l.currency)}</p>
        <p className="mt-1 flex items-center gap-1 truncate text-[11px] text-muted-foreground">
          <MapPin className="size-3 shrink-0" />
          {l.business.city}
          {l.business.isVerified && <BadgeCheck className="size-3 shrink-0 text-primary" aria-label="تاییدشده" />}
        </p>
      </div>
    </Link>
  );
}

// ─── سطر خرید — شبیه لیست ───

function BuyRow({ item: l }: { item: ExploreItemDto }) {
  return (
    <Link
      href={`/buy/${l.business.slug}`}
      className="animate-fade-up flex items-center gap-3 rounded-2xl border bg-white p-4 shadow-sm transition hover:shadow-md"
    >
      <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-stone-100 text-lg font-black text-stone-600">
        {goodName(l.good).slice(0, 1)}
      </span>
      <div className="min-w-0 grow">
        <p className="flex items-center gap-1.5 truncate font-extrabold" title={goodName(l.good)}>
          {goodName(l.good)}
          {l.business.isVerified && <BadgeCheck className="size-3.5 shrink-0 text-stone-600" aria-label="تاییدشده" />}
        </p>
        <p className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground">
          {l.business.name} · {l.business.city}
        </p>
      </div>
      <div className="shrink-0 text-end">
        <Badge variant="outline" className="border-stone-300 bg-stone-50 text-stone-700">
          {fa(l.volume as number)} {unitLabel(l.good.unit)}
        </Badge>
        <p className="mt-1 text-[11px] text-muted-foreground">{frequencyLabel(l.frequency ?? "OCCASIONAL")}</p>
      </div>
    </Link>
  );
}
