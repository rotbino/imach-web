"use client";

import { useEffect } from "react";
import Link from "next/link";
import type { ExploreItemDto } from "@/lib/api";
import { fa, money, unitLabel, frequencyLabel } from "@/lib/format";
import { useAuthStore } from "@/lib/auth-store";
import { useActiveBusiness } from "@/lib/active-biz";
import { useExploreFeed } from "@/lib/queries";
import { AppFooter, AppHeader, MobileTabBar } from "@/app/components/chrome";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  BadgeCheck,
  ClipboardList,
  Loader2,
  MapPin,
  ShoppingBag,
  ShoppingBasket,
  Store,
} from "lucide-react";

/*
 * اکسپلور — بازار باز و دیدنی iMach.
 *
 * کالاهایی که کسب‌وکارها برای فروش و خرید گذاشته‌اند، در دو تب.
 * الگوریتم چیدمان v۰ (عمدا ساده — بعدا با نوع کالاهای کاربر کامل می‌شود):
 *   ۱) کالاهای هم‌شهرِ کاربر اول
 *   ۲) سمت خرید: بزرگ‌ترین حجم خرید اول — سمت فروش: تازه‌ترین قیمت‌ها
 * این صفحه هم مثل بقیه صفحات اصلی نویگیشن دارد؛ برای مهمان‌ها هم
 * باز است — دیدنِ بازار، اولین انگیزه عضویت است.
 */

export default function ExplorePage() {
  const { status } = useAuthStore();
  const active = useActiveBusiness();
  const city = status === "authed" ? active?.city : undefined;

  useEffect(() => {
    document.title = "اکسپلور | iMach";
  }, []);

  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader />

      <main className="grow">
        <div className="mx-auto max-w-4xl px-4 py-6">
          <header className="mb-4">
            <h1 className="flex items-center gap-2 text-xl font-extrabold">
              <span className="grid size-9 place-items-center rounded-xl bg-primary/10 text-primary">
                <Store className="size-4.5" />
              </span>
              اکسپلور
            </h1>
            <p className="mt-1.5 text-xs text-muted-foreground">
              کالاهای خرید و فروش کسب‌وکارها
              {city ? ` — اول کالاهای شهر شما (${city})` : " — تازه‌ترین‌ها"}
            </p>
          </header>

          <Tabs defaultValue="sell">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="sell" className="gap-1.5">
                <Store className="size-4" />
                فروش
              </TabsTrigger>
              <TabsTrigger value="buy" className="gap-1.5">
                <ShoppingBasket className="size-4" />
                خرید
              </TabsTrigger>
            </TabsList>

            <TabsContent value="sell" className="mt-4">
              <SellTab city={city} excludeSlug={active?.slug} />
            </TabsContent>
            <TabsContent value="buy" className="mt-4">
              <BuyTab city={city} excludeSlug={active?.slug} />
            </TabsContent>
          </Tabs>

          {/* دعوت مهمان‌ها — دیدن بازار، اولین قدم عضویت */}
          {status !== "authed" && (
            <section className="mt-8 rounded-3xl border border-primary/25 bg-white p-6 text-center shadow-sm">
              <p className="text-base font-extrabold">این بازار، بازار شما هم می‌تواند باشد</p>
              <p className="mx-auto mt-1 max-w-sm text-xs leading-6 text-muted-foreground">
                کاتالوگ فروش و لیست خرید هوشمند iMach — رایگان. همین حالا کسب‌وکارتان را بسازید.
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
      </main>

      <AppFooter />
      <MobileTabBar />
    </div>
  );
}

// ─── تب فروش — کاتالوگ‌های همه، مثل آلبوم ───

function SellTab({ city, excludeSlug }: { city?: string; excludeSlug?: string }) {
  const feedQ = useExploreFeed("SELL", city);
  const items = (feedQ.data ?? []).filter((l) => l.business.slug !== excludeSlug);

  if (feedQ.isLoading) return <FeedSpinner />;

  if (items.length === 0) {
    return <EmptyFeed icon={<Store className="size-6 text-primary/40" />} text="هنوز هیچ کالایی برای فروش ثبت نشده است." />;
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {items.map((l) => (
        <ExploreSellCard key={l.id} item={l} />
      ))}
    </div>
  );
}

function ExploreSellCard({ item: l }: { item: ExploreItemDto }) {
  return (
    <Link href={`/sell/${l.business.slug}`} aria-label={`کاتالوگ ${l.business.name}`}>
      <article className="animate-fade-up h-full overflow-hidden rounded-2xl border bg-white shadow-sm transition hover:shadow-md">
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
          {l.price !== null && (
            <p className="mt-2 text-lg font-black text-primary">{money(l.price)}</p>
          )}
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            هر {unitLabel(l.good.unit)}
            {l.minOrder ? ` · حداقل ${fa(l.minOrder)} ${unitLabel(l.good.unit)}` : ""}
          </p>
          <BizRow item={l} tone="sell" />
        </div>
      </article>
    </Link>
  );
}

// ─── تب خرید — نیازهای همه، مثل لیست ───

function BuyTab({ city, excludeSlug }: { city?: string; excludeSlug?: string }) {
  const feedQ = useExploreFeed("BUY", city);
  const items = (feedQ.data ?? []).filter((l) => l.business.slug !== excludeSlug);

  if (feedQ.isLoading) return <FeedSpinner />;

  if (items.length === 0) {
    return <EmptyFeed icon={<ClipboardList className="size-6 text-stone-400" />} text="هنوز هیچ نیاز خریدی ثبت نشده است." />;
  }

  return (
    <div className="space-y-3">
      {items.map((l) => (
        <ExploreBuyRow key={l.id} item={l} />
      ))}
    </div>
  );
}

function ExploreBuyRow({ item: l }: { item: ExploreItemDto }) {
  return (
    <Link href={`/buy/${l.business.slug}`} aria-label={`لیست خرید ${l.business.name}`}>
      <article className="animate-fade-up flex items-center gap-3 rounded-2xl border bg-white p-4 shadow-sm transition hover:shadow-md">
        <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-stone-100 text-lg font-black text-stone-600">
          {l.good.name.slice(0, 1)}
        </span>
        <div className="min-w-0 grow">
          <p className="truncate font-extrabold" title={l.good.name}>
            {l.good.name}
          </p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">{l.good.category}</p>
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

// ─── مشترک‌ها ───

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

function FeedSpinner() {
  return (
    <div className="grid place-items-center py-24">
      <Loader2 className="size-6 animate-spin text-primary" />
    </div>
  );
}

function EmptyFeed({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="rounded-3xl border border-dashed bg-white/70 p-10 text-center">
      <span className="mx-auto grid size-12 place-items-center">{icon}</span>
      <p className="mt-2 text-sm text-muted-foreground">{text}</p>
    </div>
  );
}
