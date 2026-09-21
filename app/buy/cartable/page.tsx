"use client";

import { useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, MapPin, Package, BadgeCheck } from "lucide-react";
import { useAuthStore } from "@/lib/auth-store";
import { setArmActive, useActiveBusiness } from "@/lib/active-biz";
import { AppFooter, AppHeader, MobileTabBar } from "@/app/components/chrome";
import { EmptyBox, OffersSection, StatsStrip } from "@/app/components/sections";
import type { SupplierSuggestionDto } from "@/lib/api";
import { fmtMoney } from "@/lib/format";
import {
  useFollows,
  useFollowToggle,
  useMyBusinesses,
  useMyListings,
  useOffers,
  useSupplierSuggestions,
} from "@/lib/queries";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

/*
 * کارتابل خرید — صندوق خبرهای بازوی خرید (سند فصل ۷.۱):
 * پیشنهادهای دریافتی از تامین‌کننده‌ها و تامین‌کننده‌های پیشنهادی برای
 * نیازهای خرید من. خبرهای بازوی فروش اینجا دیده نمی‌شود.
 */

export default function BuyCartablePage() {
  const router = useRouter();
  const { status } = useAuthStore();

  useEffect(() => {
    document.title = "کارتابل خرید | iMach";
    setArmActive("buy");
    if (status === "guest") router.replace("/start");
  }, [status, router]);

  if (status !== "authed") {
    return (
      <div className="flex min-h-screen flex-col">
        <AppHeader />
        <main className="grow">
          <div className="grid place-items-center py-32">
            <Loader2 className="size-6 animate-spin text-stone-700" />
          </div>
        </main>
        <AppFooter />
        <MobileTabBar />
      </div>
    );
  }

  return <BuyCartableBody />;
}

function BuyCartableBody() {
  const active = useActiveBusiness();
  const bizQ = useMyBusinesses();

  if (bizQ.isLoading) {
    return (
      <div className="flex min-h-screen flex-col">
        <AppHeader />
        <main className="grow">
          <div className="grid place-items-center py-32">
            <Loader2 className="size-6 animate-spin text-stone-700" />
          </div>
        </main>
        <AppFooter />
        <MobileTabBar />
      </div>
    );
  }

  if (!active) {
    return (
      <div className="flex min-h-screen flex-col">
        <AppHeader />
        <main className="grow">
          <div className="mx-auto max-w-xl px-4 py-16 text-center">
            <p className="text-lg font-extrabold">اول کسب‌وکارتان را بسازید</p>
            <p className="mt-2 text-sm text-muted-foreground">فقط نام و شهر — بقیه‌اش با ما.</p>
            <button
              onClick={() => (window.location.href = "/start")}
              className="mt-4 rounded-xl bg-stone-800 px-5 py-2.5 text-sm font-bold text-white shadow-sm"
            >
              ساخت کسب‌وکار
            </button>
          </div>
        </main>
        <AppFooter />
        <MobileTabBar />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader />
      <main className="grow">
        <BuyCartable bizId={active.id} slug={active.slug} city={active.city} />
      </main>
      <AppFooter />
      <MobileTabBar />
    </div>
  );
}

function BuyCartable({ bizId, slug, city }: { bizId: string; slug: string; city: string }) {
  const listingsQ = useMyListings(bizId);
  const offersQ = useOffers(bizId);
  const followsQ = useFollows(bizId);

  const listings = listingsQ.data ?? [];
  const buyCount = listings.filter((l) => (l.mode === "BUY" || l.mode === "BOTH") && l.volume !== null).length;
  const freshOffers = offersQ.data?.items.length ?? 0;
  const following = followsQ.data?.length ?? 0;

  return (
    <div className="pb-6">
      <SupplierStrip bizId={bizId} />
      <div className="mx-auto max-w-2xl px-4 py-6">
        <StatsStrip
          stats={[
            { label: "نیازهای خرید", value: buyCount },
            { label: "دنبال‌شونده", value: following },
            { label: "پیشنهاد تازه", value: freshOffers, accent: true },
          ]}
        />
        <div className="mt-6">
          <OffersSection bizId={bizId} myCity={city} />
        </div>
        <div className="mt-6">
          <EmptyBox
            text="تابلوهای قیمت دنبال‌شده و نیازهای خرید، در «دستیار خرید» جمع شده‌اند."
            action={
              <Link href={`/buy/${slug}`} className="text-xs font-bold text-primary hover:underline">
                دیدن لیست خرید عمومی
              </Link>
            }
          />
        </div>
      </div>
    </div>
  );
}

// ─── نوار تامین‌کننده‌های پیشنهادی — موتور دنبال کردن سمت خرید ───

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
            description: wasFollowed ? undefined : "قیمت‌هایش در «تابلوهای دنبال‌شده» دستیار خرید جمع می‌شود.",
          }),
      }
    );
  };

  if (suggestionsQ.isLoading) return null;
  if (items.length === 0) return null;

  return (
    <section className="border-b bg-accent/20 pb-3 pt-3">
      <p className="mb-2 flex items-center gap-1 px-4 text-xs font-bold text-muted-foreground sm:px-6 lg:px-8">
        <Package className="size-3.5" />
        تامین‌کننده‌های پیشنهادی برای نیازهای شما
      </p>
      <div className="flex snap-x gap-3 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:px-6 lg:px-8 [&::-webkit-scrollbar]:hidden">
        {items.map((s) => (
          <SupplierStripCard
            key={s.listingId}
            s={s}
            followed={followedIds.has(s.supplierId)}
            onFollow={() => toggleFollow(s)}
            busy={followToggle.isPending}
          />
        ))}
      </div>
    </section>
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
      </div>
      <div className="mt-2.5 rounded-lg bg-muted/70 px-2.5 py-1.5 text-xs">
        <span className="text-muted-foreground">می‌فروشد: </span>
        <span className="font-bold">{s.goodName}</span>
        <span className="ms-1 font-bold text-primary">{fmtMoney(s.priceMinor, s.currency)}</span>
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
