"use client";

import { useMemo } from "react";
import Link from "next/link";
import { BadgeCheck, MapPin, Package } from "lucide-react";
import type { SupplierSuggestionDto } from "@/lib/api";
import { fmtMoney } from "@/lib/format";
import {
  useFollows,
  useFollowToggle,
  useMyListings,
  useOffers,
  useSupplierSuggestions,
} from "@/lib/queries";
import { EmptyBox, OffersSection, StatsStrip } from "@/app/components/sections";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

/*
 * کارتابل خرید — صندوق خبرهای خرید (سند فصل ۷.۱):
 * پیشنهادهای دریافتی از تامین‌کننده‌ها و تامین‌کننده‌های پیشنهادی برای
 * نیازهای خرید من. خبرهای محیط فروش اینجا دیده نمی‌شود.
 */

export function BuyCartable({ bizId, slug, city }: { bizId: string; slug: string; city: string }) {
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
            text="تابلوهای قیمت دنبال‌شده و نیازهای خرید، در «میز خرید» جمع شده‌اند."
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
            description: wasFollowed ? undefined : "قیمت‌هایش در «تابلوهای دنبال‌شده» میز خرید جمع می‌شود.",
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
