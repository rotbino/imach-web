"use client";

import { useEffect, useMemo } from "react";
import Link from "next/link";
import type { ExploreItemDto, SupplierSuggestionDto, SuggestionDto } from "@/lib/api";
import { fa, money, proximity, proximityLabel, unitLabel, frequencyLabel } from "@/lib/format";
import { useAuthStore } from "@/lib/auth-store";
import { useActiveBusiness } from "@/lib/active-biz";
import { useExploreFeed, useFollows, useFollowToggle, useSuggestions, useSupplierSuggestions } from "@/lib/queries";
import { AppFooter, AppHeader, MatchRing, MobileTabBar, SectionTitle } from "@/app/components/chrome";
import {
  BuyFeedIcon,
  EmptyFeed,
  ExploreBuyRow,
  ExploreSellCard,
  FeedSpinner,
  SellFeedIcon,
} from "@/app/components/feed-cards";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  BadgeCheck,
  ClipboardList,
  Handshake,
  Loader2,
  MapPin,
  Package,
  ShoppingBag,
  ShoppingBasket,
  Sparkles,
  Store,
  Users,
} from "lucide-react";

/*
 * اکسپلور — موتور تطبیق iMach؛ جایی که هدف اصلی سیستم زندگی می‌کند.
 *
 * برای هر کاربر، بهترین پیشنهادها در دو سمت:
 * • تب فروش → «خریدارهای پیشنهادی»: خریدارهایی که دنبال کالاهایی هستند
 *   که من می‌فروشم — تطبیق کالای مرجع + نزدیکی شهر + هجمه‌ی خرید.
 * • تب خرید → «تامین‌کننده‌های پیشنهادی»: فروشنده‌های همان کالاهایی
 *   که من نیاز دارم — با دکمه دنبال کردن؛ ستون فقرات رابطه بلندمدت.
 *
 * زیر پیشنهادها، «تازه‌های بازار» می‌آید — چیدمان عمومی v۰
 * (شهرِ من اول، بعد حجم/تازگی). مهمان‌ها همان بازارِ باز را می‌بینند.
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
                <Sparkles className="size-4.5" />
              </span>
              اکسپلور
            </h1>
            <p className="mt-1.5 text-xs text-muted-foreground">
              {status === "authed" && active
                ? "بهترین تطبیق‌ها برای خرید و فروش شما — بر اساس کالای مرجع، شهر و حجم"
                : "بازار خرید و فروش کسب‌وکارها"}
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

            <TabsContent value="sell" className="mt-4 space-y-6">
              {status === "authed" && active && <BuyerSuggestions bizId={active.id} myCity={active.city} />}
              <PublicFeedSection mode="SELL" city={city} excludeSlug={active?.slug} />
            </TabsContent>

            <TabsContent value="buy" className="mt-4 space-y-6">
              {status === "authed" && active && <SupplierSuggestions bizId={active.id} />}
              <PublicFeedSection mode="BUY" city={city} excludeSlug={active?.slug} />
            </TabsContent>
          </Tabs>

          {/* دعوت مهمان‌ها — دیدن بازار، اولین قدم عضویت */}
          {status !== "authed" && (
            <section className="mt-8 rounded-3xl border border-primary/25 bg-white p-6 text-center shadow-sm">
              <p className="text-base font-extrabold">این بازار، بازار شما هم می‌تواند باشد</p>
              <p className="mx-auto mt-1 max-w-sm text-xs leading-6 text-muted-foreground">
                کاتالوگ فروش و لیست خرید هوشمند iMach — رایگان. همین حالا کسب‌وکارتان را بسازید تا اکسپلور برای شما پیشنهاد بدهد.
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

// ─── تب فروش — خریدارهای پیشنهادی (موتور تطبیق) ───

function BuyerSuggestions({ bizId, myCity }: { bizId: string; myCity: string }) {
  const suggestionsQ = useSuggestions(bizId);
  const suggestions = suggestionsQ.data ?? [];

  if (suggestionsQ.isLoading) {
    return (
      <section className="grid place-items-center py-10">
        <Loader2 className="size-5 animate-spin text-primary" />
      </section>
    );
  }

  return (
    <section>
      <SectionTitle
        icon={<Handshake className="size-4.5 text-primary" />}
        title="خریدارهای پیشنهادی برای کالاهای شما"
        hint="بر اساس کالای مرجع مشترک، نزدیکی شهر و حجم نیاز — در مدیریت بازوی فروش هم دنبالشان کنید."
      />
      {suggestions.length === 0 ? (
        <EmptyBox
          text="هنوز تطبیقی برای کالاهای فروش شما پیدا نشد — هرچه کاتالوگ کامل‌تر باشد، شانس دیده شدن بیشتر است."
          action={
            <Link href="/new">
              <Button size="sm" variant="outline">
                <Package className="size-4" />
                افزودن کالا
              </Button>
            </Link>
          }
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {suggestions.map((m) => (
            <BuyerSuggestionCard key={`${m.buyerId}-${m.goodId}`} m={m} myCity={myCity} />
          ))}
        </div>
      )}
    </section>
  );
}

function BuyerSuggestionCard({ m, myCity }: { m: SuggestionDto; myCity: string }) {
  return (
    <div className="animate-fade-up rounded-2xl border bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="flex items-center gap-1.5 font-extrabold">
            {m.buyerName}
            {m.buyerVerified && <BadgeCheck className="size-4 text-primary" aria-label="تاییدشده" />}
          </p>
          <span className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="size-3.5" />
            {m.buyerCity} · {proximityLabel(proximity(m.buyerCity, myCity))}
          </span>
        </div>
        <MatchRing score={m.score} />
      </div>
      <div className="mt-3 rounded-lg bg-muted/70 px-3 py-2 text-xs">
        <span className="text-muted-foreground">به دنبال خرید: </span>
        <span className="font-bold">{m.goodName}</span>
        <span className="text-muted-foreground"> — </span>
        <span className="font-bold text-primary">
          {fa(m.volume)} {unitLabel(m.unit)} {frequencyLabel(m.frequency)}
        </span>
      </div>
      <Link href={`/buy/${m.buyerSlug}`}>
        <Button size="sm" variant="outline" className="mt-3 w-full">
          <ClipboardList className="size-4" />
          دیدن لیست خرید این خریدار
        </Button>
      </Link>
    </div>
  );
}

// ─── تب خرید — تامین‌کننده‌های پیشنهادی (موتور تطبیق + دنبال کردن) ───

function SupplierSuggestions({ bizId }: { bizId: string }) {
  const { toast } = useToast();
  const suggestionsQ = useSupplierSuggestions(bizId);
  const followsQ = useFollows(bizId);
  const followToggle = useFollowToggle();

  const suggestions = suggestionsQ.data ?? [];
  const followedIds = useMemo(() => new Set((followsQ.data ?? []).map((f) => f.supplierId)), [followsQ.data]);

  if (suggestionsQ.isLoading) {
    return (
      <section className="grid place-items-center py-10">
        <Loader2 className="size-5 animate-spin text-primary" />
      </section>
    );
  }

  const toggleFollow = (s: SupplierSuggestionDto) => {
    const wasFollowed = followedIds.has(s.supplierId);
    followToggle.mutate(
      { businessId: bizId, supplierId: s.supplierId, follow: !wasFollowed },
      {
        onSuccess: () =>
          toast({
            title: wasFollowed ? `${s.supplierName} دنبال نمی‌شود` : `${s.supplierName} دنبال شد`,
            description: wasFollowed ? undefined : "قیمت‌هایش در «تابلوی قیمت» مدیریت بازوی خرید جمع می‌شود.",
          }),
      }
    );
  };

  return (
    <section>
      <SectionTitle
        icon={<Users className="size-4.5 text-primary" />}
        title="تامین‌کننده‌های پیشنهادی برای نیازهای شما"
        hint="همان کالایی که نیاز دارید، از نزدیک‌ترین و مناسب‌ترین فروشنده — دنبال کنید تا قیمت‌هایشان همیشه دستتان باشد."
      />
      {suggestions.length === 0 ? (
        <EmptyBox
          text="هنوز تطبیقی برای نیازهای خرید شما پیدا نشد — نیازهایتان را در بازوی خرید کامل کنید."
          action={
            <Link href="/new">
              <Button size="sm" variant="outline">
                <Package className="size-4" />
                افزودن کالا
              </Button>
            </Link>
          }
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {suggestions.map((s) => (
            <SupplierSuggestionCard
              key={s.listingId}
              s={s}
              followed={followedIds.has(s.supplierId)}
              onFollow={() => toggleFollow(s)}
              busy={followToggle.isPending}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function SupplierSuggestionCard({
  s,
  followed,
  onFollow,
  busy,
}: {
  s: SupplierSuggestionDto;
  followed: boolean;
  onFollow: () => void;
  busy: boolean;
}) {
  return (
    <div className="animate-fade-up rounded-2xl border bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="flex items-center gap-1.5 font-extrabold">
            {s.supplierName}
            {s.supplierVerified && <BadgeCheck className="size-4 text-primary" aria-label="تاییدشده" />}
          </p>
          <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="size-3.5" />
            {s.supplierCity}
          </p>
        </div>
        <MatchRing score={s.score} />
      </div>
      <div className="mt-3 rounded-lg bg-muted/70 px-3 py-2 text-xs">
        <span className="text-muted-foreground">می‌فروشد: </span>
        <span className="font-bold">{s.goodName}</span>
        <span className="text-muted-foreground"> — </span>
        <span className="font-bold text-primary">{money(s.price)}</span>
        <span className="text-muted-foreground"> هر {unitLabel(s.unit)}</span>
      </div>
      <div className="mt-3 flex items-center gap-2">
        <Button size="sm" variant={followed ? "secondary" : "default"} onClick={onFollow} disabled={busy} className="flex-1">
          {followed ? "دنبال می‌شود" : "دنبال کردن"}
        </Button>
        <Link href={`/sell/${s.supplierSlug}`} className="flex-1">
          <Button size="sm" variant="outline" className="w-full">
            <Store className="size-4" />
            دیدن کاتالوگ
          </Button>
        </Link>
      </div>
    </div>
  );
}

// ─── تازه‌های بازار — فید عمومی (همراه پیشنهادها، و کل دید مهمان) ───

function PublicFeedSection({ mode, city, excludeSlug }: { mode: "SELL" | "BUY"; city?: string; excludeSlug?: string }) {
  const authed = useAuthStore((s) => s.status === "authed");
  const feedQ = useExploreFeed(mode, city);
  const items = (feedQ.data ?? []).filter((l) => l.business.slug !== excludeSlug);

  return (
    <section>
      <SectionTitle
        icon={mode === "SELL" ? <Store className="size-4.5 text-primary" /> : <ClipboardList className="size-4.5 text-stone-600" />}
        title={authed ? "تازه‌های بازار" : mode === "SELL" ? "کالاهای فروش" : "درخواست‌های خرید"}
        hint={
          city
            ? mode === "SELL"
              ? `اول کالاهای شهر شما (${city})`
              : `اول نیازهای شهر شما (${city}) — بزرگ‌ترین حجم‌ها جلوتر`
            : "تازه‌ترین‌های همه کسب‌وکارها"
        }
      />
      <PublicFeed mode={mode} items={items} loading={feedQ.isLoading} />
    </section>
  );
}

function PublicFeed({
  mode,
  items,
  loading,
}: {
  mode: "SELL" | "BUY";
  items: ExploreItemDto[];
  loading: boolean;
}) {
  if (loading) return <FeedSpinner />;

  if (items.length === 0) {
    return mode === "SELL" ? (
      <EmptyFeed icon={<SellFeedIcon />} text="هنوز هیچ کالایی برای فروش ثبت نشده است." />
    ) : (
      <EmptyFeed icon={<BuyFeedIcon />} text="هنوز هیچ نیاز خریدی ثبت نشده است." />
    );
  }

  return mode === "SELL" ? (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {items.map((l) => (
        <ExploreSellCard key={l.id} item={l} />
      ))}
    </div>
  ) : (
    <div className="space-y-3">
      {items.map((l) => (
        <ExploreBuyRow key={l.id} item={l} />
      ))}
    </div>
  );
}

// ─── مشترک ───

function EmptyBox({ text, action }: { text: string; action?: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed bg-white/60 p-6 text-center">
      <p className="mx-auto max-w-md text-sm leading-7 text-muted-foreground">{text}</p>
      {action && <div className="mt-3 flex justify-center">{action}</div>}
    </div>
  );
}
