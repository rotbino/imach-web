"use client";

import { useEffect, useMemo } from "react";
import Link from "next/link";
import type { SupplierSuggestionDto, SuggestionDto } from "@/lib/api";
import { fa, money, proximity, proximityLabel, unitLabel, frequencyLabel } from "@/lib/format";
import { useAuthStore } from "@/lib/auth-store";
import { useActiveBusiness } from "@/lib/active-biz";
import {
  useBuyRequests,
  useExploreFeed,
  useFollows,
  useFollowToggle,
  useSellOffers,
  useSuggestions,
  useSupplierSuggestions,
} from "@/lib/queries";
import { AppFooter, AppHeader, MatchRing, MobileTabBar } from "@/app/components/chrome";
import { UnderlineTabs } from "@/app/components/underline-tabs";
import {
  BadgeCheck,
  ClipboardList,
  Loader2,
  MapPin,
  Package,
  ShoppingBag,
  Store,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  BuyFeedIcon,
  EmptyFeed,
  ExploreBuyRow,
  ExploreSellCard,
  FeedSpinner,
  SellFeedIcon,
} from "@/app/components/feed-cards";

/*
 * بازار — قلب iMach.
 *
 * تب درخواست‌های خرید: نوار «خریدارهای پیشنهادی» + لیست مرتبط‌ترین‌ها.
 * تب پیشنهادهای فروش: نوار «تامین‌کننده‌های پیشنهادی» + لیست مرتبط‌ترین‌ها.
 * رتبه‌بندی کار موتور تطبیق است؛ اینجا فقط نتیجه نشان داده می‌شود.
 * مهمان‌ها بازارِ باز را می‌بینند (دعوت عضویت پایین صفحه).
 */

export default function MarketPage() {
  const { status } = useAuthStore();
  const active = useActiveBusiness();

  useEffect(() => {
    document.title = "بازار | iMach";
  }, []);

  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader />

      <main className="grow">
        {status !== "authed" ? (
          <GuestMarket />
        ) : !active ? (
          <NoBusiness />
        ) : (
          <div className="mx-auto w-full max-w-7xl">
            <UnderlineTabs
              defaultValue="buy"
              items={[
                { value: "buy", label: "درخواست‌های خرید عمده", icon: ClipboardList },
                { value: "sell", label: "تامین‌کنندگان", icon: Store },
              ]}
              panels={{
                buy: <BuyPanel bizId={active.id} city={active.city} />,
                sell: <SellPanel bizId={active.id} city={active.city} />,
              }}
            />
          </div>
        )}
      </main>

      <AppFooter />
      <MobileTabBar />
    </div>
  );
}

// ─── تب درخواست‌های خرید ───

function BuyPanel({ bizId, city }: { bizId: string; city: string }) {
  return (
    <div className="pb-6">
      <BuyerStrip bizId={bizId} city={city} />
      <RelevantBuyList bizId={bizId} />
    </div>
  );
}

function BuyerStrip({ bizId, city }: { bizId: string; city: string }) {
  const { toast } = useToast();
  const suggestionsQ = useSuggestions(bizId);
  const followsQ = useFollows(bizId);
  const followToggle = useFollowToggle();

  const items = suggestionsQ.data ?? [];
  const followedIds = useMemo(() => new Set((followsQ.data ?? []).map((f) => f.supplierId)), [followsQ.data]);

  const toggleFollow = (m: SuggestionDto) => {
    const wasFollowed = followedIds.has(m.buyerId);
    followToggle.mutate(
      { businessId: bizId, supplierId: m.buyerId, follow: !wasFollowed },
      {
        onSuccess: () =>
          toast({
            title: wasFollowed ? `${m.buyerName} دنبال نمی‌شود` : `${m.buyerName} دنبال شد`,
            description: wasFollowed ? undefined : "درخواست‌های خریدش در هوم شما می‌آید.",
          }),
      }
    );
  };

  if (suggestionsQ.isLoading) {
    return (
      <section className="grid place-items-center border-b py-6">
        <Loader2 className="size-5 animate-spin text-primary" />
      </section>
    );
  }
  if (items.length === 0) return null;

  return (
    <Strip label="خریدارهای پیشنهادی" icon={<Users className="size-3.5" />}>
      {items.map((m) => (
        <BuyerStripCard
          key={`${m.buyerId}-${m.goodId}`}
          m={m}
          myCity={city}
          followed={followedIds.has(m.buyerId)}
          onFollow={() => toggleFollow(m)}
          busy={followToggle.isPending}
        />
      ))}
    </Strip>
  );
}

function BuyerStripCard({
  m,
  myCity,
  followed,
  onFollow,
  busy,
}: {
  m: SuggestionDto;
  myCity: string;
  followed: boolean;
  onFollow: () => void;
  busy: boolean;
}) {
  return (
    <article className="animate-fade-up flex h-full w-60 shrink-0 snap-start flex-col rounded-2xl border bg-white p-3.5 shadow-sm transition hover:shadow-md">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="flex items-center gap-1 truncate text-sm font-extrabold">
            {m.buyerName}
            {m.buyerVerified && <BadgeCheck className="size-3.5 shrink-0 text-primary" aria-label="تاییدشده" />}
          </p>
          <p className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground">
            <MapPin className="size-3" />
            {m.buyerCity} · {proximityLabel(proximity(m.buyerCity, myCity))}
          </p>
        </div>
        <MatchRing score={m.score} size={38} />
      </div>
      <div className="mt-2.5 rounded-lg bg-muted/70 px-2.5 py-1.5 text-xs">
        <span className="text-muted-foreground">می‌خواهد: </span>
        <span className="font-bold">{m.goodName}</span>
        <span className="ms-1 font-bold text-primary">
          {fa(m.volume)} {unitLabel(m.unit)}
        </span>
      </div>
      <p className="mt-1.5 text-[11px] text-muted-foreground">{frequencyLabel(m.frequency)}</p>
      <div className="mt-auto flex items-center gap-1.5 pt-2.5">
        <Button size="sm" variant={followed ? "secondary" : "default"} onClick={onFollow} disabled={busy} className="h-7 flex-1 text-xs">
          {followed ? "دنبال می‌شود" : "دنبال کردن"}
        </Button>
        <Link href={`/buy/${m.buyerSlug}`} className="flex-1">
          <Button size="sm" variant="outline" className="h-7 w-full text-xs">
            لیست خرید
          </Button>
        </Link>
      </div>
    </article>
  );
}

function RelevantBuyList({ bizId }: { bizId: string }) {
  const listQ = useBuyRequests(bizId);
  const items = listQ.data ?? [];

  if (listQ.isLoading) return <FeedSpinner />;

  if (items.length === 0) {
    return (
      <EmptyFeed
        icon={<BuyFeedIcon />}
        text="فعلا درخواست خرید مرتبطی پیدا نشد."
      />
    );
  }

  return (
    <div className="grid gap-3 px-4 pt-4 lg:grid-cols-2">
      {items.map((l) => (
        <ExploreBuyRow key={l.id} item={l} />
      ))}
    </div>
  );
}

// ─── تب تامین‌کنندگان ───

function SellPanel({ bizId, city }: { bizId: string; city: string }) {
  return (
    <div className="pb-6">
      <SupplierStrip bizId={bizId} />
      <RelevantSellList bizId={bizId} />
    </div>
  );
}

function SupplierStrip({ bizId }: { bizId: string }) {
  const { toast } = useToast();
  const suggestionsQ = useSupplierSuggestions(bizId);
  const followsQ = useFollows(bizId);
  const followToggle = useFollowToggle();

  const items = suggestionsQ.data ?? [];
  const followedIds = useMemo(() => new Set((followsQ.data ?? []).map((f) => f.supplierId)), [followsQ.data]);

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

  if (suggestionsQ.isLoading) {
    return (
      <section className="grid place-items-center border-b py-6">
        <Loader2 className="size-5 animate-spin text-primary" />
      </section>
    );
  }
  if (items.length === 0) return null;

  return (
    <Strip label="تامین‌کننده‌های پیشنهادی" icon={<Package className="size-3.5" />}>
      {items.map((s) => (
        <SupplierStripCard
          key={s.listingId}
          s={s}
          followed={followedIds.has(s.supplierId)}
          onFollow={() => toggleFollow(s)}
          busy={followToggle.isPending}
        />
      ))}
    </Strip>
  );
}

function SupplierStripCard({
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
    <article className="animate-fade-up w-60 shrink-0 snap-start rounded-2xl border bg-white p-3.5 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="flex items-center gap-1 truncate text-sm font-extrabold">
            {s.supplierName}
            {s.supplierVerified && <BadgeCheck className="size-3.5 shrink-0 text-primary" aria-label="تاییدشده" />}
          </p>
          <p className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground">
            <MapPin className="size-3" />
            {s.supplierCity}
          </p>
        </div>
        <MatchRing score={s.score} size={38} />
      </div>
      <div className="mt-2.5 rounded-lg bg-muted/70 px-2.5 py-1.5 text-xs">
        <span className="text-muted-foreground">می‌فروشد: </span>
        <span className="font-bold">{s.goodName}</span>
        <span className="ms-1 font-bold text-primary">{money(s.price)}</span>
      </div>
      <div className="mt-2.5 flex items-center gap-1.5">
        <Button size="sm" variant={followed ? "secondary" : "default"} onClick={onFollow} disabled={busy} className="h-7 flex-1 text-xs">
          {followed ? "دنبال می‌شود" : "دنبال کردن"}
        </Button>
        <Link href={`/sell/${s.supplierSlug}`} className="flex-1">
          <Button size="sm" variant="outline" className="h-7 w-full text-xs">
            کاتالوگ
          </Button>
        </Link>
      </div>
    </article>
  );
}

function RelevantSellList({ bizId }: { bizId: string }) {
  const listQ = useSellOffers(bizId);
  const items = listQ.data ?? [];

  if (listQ.isLoading) return <FeedSpinner />;

  if (items.length === 0) {
    return (
      <EmptyFeed
        icon={<SellFeedIcon />}
        text="فعلا پیشنهاد فروش مرتبطی پیدا نشد."
      />
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 px-4 pt-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      {items.map((l) => (
        <ExploreSellCard key={l.id} item={l} />
      ))}
    </div>
  );
}

// ─── نوار افقی بالای هر تب ───

function Strip({ label, icon, children }: { label: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="border-b bg-accent/20 pb-3 pt-3">
      <p className="mb-2 flex items-center gap-1 px-4 text-xs font-bold text-muted-foreground">
        {icon}
        {label}
      </p>
      <div className="flex snap-x gap-3 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {children}
      </div>
    </section>
  );
}

// ─── مهمان: بازارِ باز ───

function GuestMarket() {
  return (
    <div className="mx-auto w-full max-w-7xl">
      <UnderlineTabs
        defaultValue="buy"
        items={[
          { value: "buy", label: "درخواست‌های خرید عمده", icon: ClipboardList },
          { value: "sell", label: "تامین‌کنندگان", icon: Store },
        ]}
        panels={{
          buy: <GuestFeed mode="BUY" />,
          sell: <GuestFeed mode="SELL" />,
        }}
      />
    </div>
  );
}

function GuestFeed({ mode }: { mode: "BUY" | "SELL" }) {
  const feedQ = useExploreFeed(mode);
  const items = feedQ.data ?? [];

  return (
    <div className="pb-6">
      {feedQ.isLoading ? (
        <FeedSpinner />
      ) : items.length === 0 ? (
        <div className="pt-4">
          <EmptyFeed
            icon={mode === "SELL" ? <SellFeedIcon /> : <BuyFeedIcon />}
            text={mode === "SELL" ? "هنوز هیچ کالایی برای فروش ثبت نشده است." : "هنوز هیچ نیاز خریدی ثبت نشده است."}
          />
        </div>
      ) : mode === "SELL" ? (
        <div className="grid grid-cols-2 gap-3 px-4 pt-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {items.map((l) => (
            <ExploreSellCard key={l.id} item={l} />
          ))}
        </div>
      ) : (
        <div className="grid gap-3 px-4 pt-4 lg:grid-cols-2">
          {items.map((l) => (
            <ExploreBuyRow key={l.id} item={l} />
          ))}
        </div>
      )}

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
    </div>
  );
}

// ─── کاربر بدون کسب‌وکار ───

function NoBusiness() {
  return (
    <div className="mx-auto max-w-xl px-4 py-16">
      <div className="rounded-3xl border border-dashed bg-white/70 p-10 text-center">
        <p className="text-base font-extrabold">اول کسب‌وکارتان را بسازید</p>
        <p className="mx-auto mt-1 max-w-sm text-sm leading-7 text-muted-foreground">
          برای دیدن پیشنهادهای مرتبط، به یک کسب‌وکار نیاز دارید — فقط نام و شهر.
        </p>
        <Link href="/start">
          <Button className="mt-4">ساخت کسب‌وکار</Button>
        </Link>
      </div>
    </div>
  );
}
