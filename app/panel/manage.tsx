"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { fa, money, proximity, proximityLabel, timeAgo, unitLabel, frequencyLabel } from "@/lib/format";
import { ApiError, type OfferDto } from "@/lib/api";
import { useBoard, useFollows, useFollowToggle, useIncomingInquiries, useMarkInquiryRead, useOffers, useSendOffer, useSuggestions } from "@/lib/queries";
import { MatchRing, SectionTitle } from "@/app/components/chrome";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowDownWideNarrow,
  Bell,
  BookmarkCheck,
  BookmarkPlus,
  Handshake,
  Loader2,
  MapPin,
  Minus,
  RefreshCw,
  Send,
  Signal,
  Table2,
  TrendingDown,
  TrendingUp,
} from "lucide-react";

/*
 * بخش‌های مدیریت پنل — از بازوهای قدیمی به اینجا منتقل شده‌اند:
 * پنل جای کار است؛ نمای بیرونی بازوها (/sell و /buy) ویترین عمومی است.
 */

// ─── درخواست‌های قیمت (سمت فروش) ───
export function InquiriesSection({ bizId, myCity, sellListings }: { bizId: string; myCity: string; sellListings: { goodId: string; price: number | null }[] }) {
  const { toast } = useToast();
  const inquiriesQ = useIncomingInquiries(bizId);
  const sendOffer = useSendOffer();
  const markRead = useMarkInquiryRead();

  // علامت‌گذاری خودکار درخواست‌های خوانده‌نشده (یک‌بار برای هر دیتا)
  const markedRef = useRef(false);
  useEffect(() => {
    if (markedRef.current || inquiriesQ.isLoading) return;
    const unread = (inquiriesQ.data?.items ?? []).filter((i) => !i.isRead);
    if (unread.length > 0) {
      markedRef.current = true;
      for (const i of unread) markRead.mutate(i.id);
    }
  }, [inquiriesQ.data, inquiriesQ.isLoading, markRead]);

  const inquiries = inquiriesQ.data?.items ?? [];

  return (
    <section className="space-y-3">
      <SectionTitle
        icon={<Bell className="size-4.5 text-primary" />}
        title="درخواست‌های قیمت"
        hint="خریدارها در بازوی خودشان قیمت‌گیری را فعال کرده‌اند؛ حجم و شهرشان را ببینید و پیشنهاد بدهید."
      />
      {inquiries.length === 0 && <EmptyBox text="فعلا درخواست قیمتی ندارید. کاتالوگ کامل‌تر = درخواست بیشتر." />}
      {inquiries.map((q) => {
        const answered = q.status === "ANSWERED";
        const isNew = !q.isRead;
        const mySell = sellListings.find((l) => l.goodId === q.listing.good.id);
        return (
          <div key={q.id} className={`rounded-2xl border bg-white p-4 shadow-sm ${isNew ? "animate-fade-up border-primary/40 ring-1 ring-primary/15" : ""}`}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="grid size-9 place-items-center rounded-xl bg-primary/10 text-base font-black text-primary">
                  {q.buyer.name.slice(0, 1)}
                </span>
                <div>
                  <p className="flex items-center gap-1.5 text-sm font-bold">
                    {q.buyer.name}
                    {isNew && <Badge className="bg-primary text-[10px]">جدید</Badge>}
                  </p>
                  <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                    <span className="flex items-center gap-0.5">
                      <MapPin className="size-3" />
                      {q.buyer.city} · {proximityLabel(proximity(q.buyer.city, myCity))}
                    </span>
                    <span>{timeAgo(q.createdAt)}</span>
                  </div>
                </div>
              </div>
              <div className="text-end">
                <p className="text-sm font-bold">{q.listing.good.name}</p>
                <p className="text-[11px] text-muted-foreground">نیاز: {fa(q.volume)} {unitLabel(q.listing.good.unit)}</p>
              </div>
            </div>

            {q.note && <p className="mt-2 rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">«{q.note}»</p>}

            {answered ? (
              <p className="mt-3 flex items-center gap-1.5 rounded-lg bg-accent px-3 py-2 text-xs font-bold text-primary">
                پیشنهاد ارسال شد — منتظر پاسخ خریدار بمانید
              </p>
            ) : (
              <OfferSender
                suggested={mySell?.price ?? 0}
                unit={unitLabel(q.listing.good.unit)}
                busy={sendOffer.isPending}
                onSend={(price) => {
                  sendOffer.mutate(
                    { inquiryId: q.id, price },
                    {
                      onSuccess: () => toast({ title: "پیشنهاد ارسال شد", description: `پیشنهاد شما برای ${q.buyer.name} در بازوی خریدشان نمایش داده می‌شود.` }),
                      onError: (e) => toast({ title: "ارسال ناموفق بود", description: e instanceof ApiError ? e.message : "دوباره تلاش کنید", variant: "destructive" }),
                    }
                  );
                }}
              />
            )}
          </div>
        );
      })}
    </section>
  );
}

// ─── خریدارهای پیشنهادی (سمت فروش) ───
export function SuggestionsSection({ bizId, myCity }: { bizId: string; myCity: string }) {
  const suggestionsQ = useSuggestions(bizId);
  const suggestions = suggestionsQ.data ?? [];

  return (
    <section className="space-y-3">
      <SectionTitle
        icon={<Handshake className="size-4.5 text-primary" />}
        title="خریدارهای پیشنهادی"
        hint="بر اساس کالاهای فروش شما، حجم نیاز و شهر محاسبه شده است."
      />
      {suggestions.length === 0 && <EmptyBox text="فعلا تطبیقی برای شما پیدا نشد." />}
      <div className="grid gap-3 sm:grid-cols-2">
        {suggestions.map((m) => (
          <div key={`${m.buyerId}-${m.goodId}`} className="rounded-2xl border bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-extrabold">{m.buyerName}</p>
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
            <Link href={`/sell/${m.buyerSlug}`}>
              <Button size="sm" variant="outline" className="mt-3 w-full">
                <Send className="size-4" />
                معرفی کاتالوگ به این خریدار
              </Button>
            </Link>
          </div>
        ))}
      </div>
    </section>
  );
}

// ─── پیشنهادهای دریافتی (سمت خرید) ───
export function OffersSection({ bizId, myCity }: { bizId: string; myCity: string }) {
  const { toast } = useToast();
  const offersQ = useOffers(bizId);
  const followsQ = useFollows(bizId);
  const followToggle = useFollowToggle();

  const [sortMode, setSortMode] = useState<"score" | "price">("score");

  const offersByGood = useMemo(() => {
    const map = new Map<string, OfferDto[]>();
    for (const o of offersQ.data?.items ?? []) {
      const gid = o.listing.good.id;
      const arr = map.get(gid) ?? [];
      arr.push(o);
      map.set(gid, arr);
    }
    return map;
  }, [offersQ.data]);

  const followedIds = new Set((followsQ.data ?? []).map((f) => f.supplierId));

  const toggleFollow = (supplierId: string, supplierName: string) => {
    const wasFollowed = followedIds.has(supplierId);
    followToggle.mutate(
      { businessId: bizId, supplierId, follow: !wasFollowed },
      {
        onSuccess: () =>
          toast({
            title: wasFollowed ? `${supplierName} از فالو خارج شد` : `${supplierName} فالو شد`,
            description: wasFollowed ? undefined : "قیمت‌هایش در «تابلوی قیمت» جمع می‌شود.",
          }),
      }
    );
  };

  return (
    <section className="space-y-3">
      <SectionTitle
        icon={<Signal className="size-4.5 text-primary" />}
        title="پیشنهادهای تامین‌کننده‌ها"
        hint="پاسخ قیمت‌گیری‌های بازوی خرید شما — گروه‌شده بر اساس کالا."
      />
      {(offersQ.data?.items ?? []).length === 0 && <EmptyBox text="هنوز پیشنهادی ندارید؛ از بخش «کالاهای من» روی کالاهای خرید، قیمت‌گیری را فعال کنید." />}
      {[...offersByGood.entries()].map(([gid, offers]) => {
        const cheapest = sortMode === "price" ? [...offers].sort((a, b) => a.price - b.price)[0] : null;
        return (
          <div key={gid} className="rounded-2xl border bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-extrabold">{offers[0].listing.good.name}</p>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">{fa(offers.length)} پیشنهاد</Badge>
                <div className="flex items-center gap-0.5 rounded-lg bg-muted p-0.5">
                  <ArrowDownWideNarrow className="mx-1 size-3.5 text-muted-foreground" />
                  {([
                    { v: "score" as const, label: "مناسب‌ترین" },
                    { v: "price" as const, label: "ارزان‌ترین" },
                  ]).map((o) => (
                    <button
                      key={o.v}
                      type="button"
                      onClick={() => setSortMode(o.v)}
                      className={`rounded-md px-2 py-1 text-[11px] font-bold transition ${
                        sortMode === o.v ? "bg-white text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {o.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="mt-3 space-y-2">
              {[...offers]
                .sort((a, b) => (sortMode === "price" ? a.price - b.price : b.score - a.score))
                .map((o, i) => (
                  <OfferCard
                    key={o.id}
                    offer={o}
                    index={i}
                    myCity={myCity}
                    followed={followedIds.has(o.seller.id)}
                    cheapest={cheapest?.id === o.id && offers.length > 1}
                    onFollow={() => toggleFollow(o.seller.id, o.seller.name)}
                  />
                ))}
            </div>
          </div>
        );
      })}
    </section>
  );
}

// ─── تابلوی قیمت (سمت خرید) ───
export function BoardSection({ bizId }: { bizId: string }) {
  const boardQ = useBoard(bizId);
  const rows = boardQ.data ?? [];

  return (
    <section className="space-y-3">
      <SectionTitle
        icon={<Table2 className="size-4.5 text-primary" />}
        title="تابلوی قیمت فالو‌شده‌ها"
        hint="قیمت‌های تامین‌کننده‌هایی که فالو کرده‌اید؛ دکمه «بررسی به‌روزرسانی» تغییرات قیمت را همین‌جا نشان می‌دهد."
        action={
          rows.length > 0 ? (
            <Button size="sm" variant="outline" onClick={() => void boardQ.refetch()}>
              <RefreshCw className={boardQ.isFetching ? "size-4 animate-spin" : "size-4"} />
              بررسی به‌روزرسانی
            </Button>
          ) : undefined
        }
      />
      {rows.length === 0 ? (
        <EmptyBox text="هنوز تامین‌کننده‌ای فالو نشده. از پیشنهادها فالو کنید تا قیمت‌ها اینجا جمع شود." />
      ) : (
        <BoardView rows={rows} />
      )}
    </section>
  );
}

// ─── کارت پیشنهاد قیمت ───
function OfferCard({ offer, index, myCity, followed, cheapest, onFollow }: {
  offer: OfferDto;
  index: number;
  myCity: string;
  followed: boolean;
  cheapest?: boolean;
  onFollow: () => void;
}) {
  const p = proximity(myCity, offer.seller.city);
  return (
    <div className="animate-fade-up rounded-xl border bg-muted/30 p-3" style={{ animationDelay: `${index * 120}ms` }}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="grid size-9 place-items-center rounded-xl bg-primary/10 text-base font-black text-primary">
            {offer.seller.name.slice(0, 1)}
          </span>
          <div>
            <p className="flex items-center gap-1.5 text-sm font-bold">
              {offer.seller.name}
              {offer.isSpecial && <Badge className="bg-primary text-[10px]">قیمت ویژه برای شما</Badge>}
              {cheapest && <Badge variant="outline" className="border-primary/25 bg-primary/10 text-primary text-[10px]">ارزان‌ترین پیشنهاد</Badge>}
            </p>
            <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
              <span className="flex items-center gap-0.5">
                <MapPin className="size-3" />
                {offer.seller.city} · {proximityLabel(p)}
              </span>
              <span>{timeAgo(offer.createdAt)}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-end">
            <p className="text-base font-black text-primary">{money(offer.price)}</p>
            <p className="text-[11px] text-muted-foreground">
              هر {unitLabel(offer.listing.good.unit)} · حداقل {fa(offer.minOrder)} {unitLabel(offer.listing.good.unit)}
            </p>
          </div>
          {offer.score > 0 && <MatchRing score={offer.score} size={40} />}
        </div>
      </div>
      <div className="mt-2.5 flex items-center justify-end gap-2 border-t pt-2.5">
        <Button size="sm" variant={followed ? "secondary" : "default"} onClick={onFollow}>
          {followed ? (
            <>
              <BookmarkCheck className="size-4 text-primary" />
              فالو شد
            </>
          ) : (
            <>
              <BookmarkPlus className="size-4" />
              فالو
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

// ─── تابلوی قیمت ───
function BoardView({ rows }: { rows: Awaited<ReturnType<typeof useBoard>>["data"] }) {
  const byGood = useMemo(() => {
    const map = new Map<string, NonNullable<typeof rows>>();
    for (const r of rows ?? []) {
      const arr = map.get(r.good.id) ?? [];
      arr.push(r);
      map.set(r.good.id, arr);
    }
    return map;
  }, [rows]);

  return (
    <div className="space-y-4">
      {[...byGood.entries()].map(([goodId, list]) => {
        const best = Math.min(...list.map((r) => r.price));
        return (
          <div key={goodId} className="overflow-hidden rounded-2xl border bg-white shadow-sm">
            <div className="flex items-center justify-between border-b bg-muted/50 px-4 py-2.5">
              <p className="text-sm font-extrabold">{list[0]?.good.name}</p>
              <Badge variant="outline" className="bg-white">
                {fa(list.length)} تامین‌کننده
              </Badge>
            </div>
            <div className="divide-y">
              {list.map((r) => {
                const log = r.priceLogs[0];
                const trend = log ? (r.price < log.oldPrice ? "down" : r.price > log.oldPrice ? "up" : "flat") : "flat";
                return (
                  <div key={r.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="grid size-8 place-items-center rounded-lg bg-primary/10 text-sm font-black text-primary">
                        {r.business.name.slice(0, 1)}
                      </span>
                      <div>
                        <p className="text-sm font-bold">{r.business.name}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {r.business.city} · حداقل {fa(r.minOrder ?? 0)} {unitLabel(r.good.unit)} · {timeAgo(r.updatedAt)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <TrendChip dir={trend} />
                      <div className="text-end">
                        <p className="text-sm font-extrabold text-primary">{money(r.price)}</p>
                        <p className="text-[11px] text-muted-foreground">
                          هر {unitLabel(r.good.unit)}
                          {log && log.oldPrice !== r.price && (
                            <span className="ms-1 text-muted-foreground/70 line-through">{fa(log.oldPrice)}</span>
                          )}
                        </p>
                      </div>
                      {r.price === best && <Badge className="bg-primary">ارزان‌ترین</Badge>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function TrendChip({ dir }: { dir: "up" | "down" | "flat" }) {
  if (dir === "down")
    return (
      <span className="flex items-center gap-0.5 text-[10px] font-bold text-emerald-600">
        <TrendingDown className="size-3.5" />
        کاهش
      </span>
    );
  if (dir === "up")
    return (
      <span className="flex items-center gap-0.5 text-[10px] font-bold text-rose-600">
        <TrendingUp className="size-3.5" />
        افزایش
      </span>
    );
  return (
    <span className="flex items-center gap-0.5 text-[10px] font-bold text-muted-foreground">
      <Minus className="size-3.5" />
      ثابت
    </span>
  );
}

// ─── فرم ارسال پیشنهاد قیمت ───
function OfferSender({ suggested, unit, busy, onSend }: { suggested: number; unit: string; busy: boolean; onSend: (price: number) => void }) {
  const [price, setPrice] = useState(suggested ? String(suggested) : "");
  return (
    <div className="mt-3 flex items-end gap-2 border-t pt-3">
      <div className="grid grow gap-1.5">
        <span className="text-[11px] text-muted-foreground">
          قیمت پیشنهادی شما (تومان / هر {unit})
          {suggested > 0 && " — پیشنهاد ما همان قیمت کاتالوگ شماست"}
        </span>
        <Input
          type="number"
          min={0}
          dir="ltr"
          className="text-left"
          placeholder={suggested ? String(suggested) : "قیمت…"}
          value={price}
          onChange={(e) => setPrice(e.target.value)}
        />
      </div>
      <Button size="sm" onClick={() => onSend(Number(price))} disabled={busy || !price}>
        {busy ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
        ارسال پیشنهاد
      </Button>
    </div>
  );
}

export function EmptyBox({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-dashed bg-white/60 p-6 text-center">
      <p className="mx-auto max-w-md text-sm leading-7 text-muted-foreground">{text}</p>
    </div>
  );
}
