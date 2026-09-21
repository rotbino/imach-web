"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  fa,
  CURRENCIES,
  currencyLabel,
  fmtMoney,
  goodName,
  proximity,
  proximityLabel,
  timeAgo,
  unitLabel,
  frequencyLabel,
} from "@/lib/format";
import { ApiError, type GoodItemDto, type OfferDto } from "@/lib/api";
import {
  useBoard,
  useDeleteListing,
  useFollows,
  useFollowToggle,
  useIncomingInquiries,
  useMarkInquiryRead,
  useMyFollowers,
  useMyListings,
  useOffers,
  useQuoteRequest,
  useSendOffer,
} from "@/lib/queries";
import { MatchRing, SectionTitle } from "@/app/components/chrome";
import { ShareContent } from "@/app/components/share";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowDownWideNarrow,
  Bell,
  BookmarkCheck,
  BookmarkPlus,
  Loader2,
  MapPin,
  Minus,
  Package,
  Plus,
  Radio,
  RefreshCw,
  Send,
  ShoppingBasket,
  Signal,
  Store,
  Table2,
  Trash2,
  TrendingDown,
  TrendingUp,
  Users,
  UsersRound,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/*
 * بخش‌های مشترک محیط‌ها — یک بار تعریف، محیط فروش و محیط خرید:
 * استعلام‌ها/پیشنهادها، کالاهای من، تابلوی قیمت، اشتراک‌گذاری لینک، آمار.
 */

// ─── نوار آمار — وضعیت کل محیط یک‌جا ───

export function StatsStrip({
  stats,
}: {
  stats: { label: string; value: number; accent?: boolean }[];
}) {
  return (
    <div className="grid grid-cols-3 gap-2 sm:gap-3">
      {stats.map((s) => (
        <div key={s.label} className="rounded-2xl border bg-white p-3 text-center shadow-sm sm:p-4">
          <p className={`text-lg font-black sm:text-xl ${s.accent ? "text-primary" : ""}`}>
            {fa(s.value)}
          </p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">{s.label}</p>
        </div>
      ))}
    </div>
  );
}

// ─── کالاهای من — فقط یک سمتِ محیط ───

export function MyItemsSection({ bizId, side }: { bizId: string; side: "sell" | "buy" }) {
  const { toast } = useToast();
  const router = useRouter();
  const listingsQ = useMyListings(bizId);
  const deleteListing = useDeleteListing();
  const quoteRequest = useQuoteRequest();

  const [target, setTarget] = useState<GoodItemDto | null>(null);

  const isSell = side === "sell";
  const listings = (listingsQ.data ?? []).filter((l) =>
    isSell ? (l.mode === "SELL" || l.mode === "BOTH") && l.priceMinor !== null : (l.mode === "BUY" || l.mode === "BOTH") && l.volume !== null
  );

  const remove = async () => {
    if (!target) return;
    try {
      await deleteListing.mutateAsync(target.id);
      toast({ title: "کالا حذف شد", description: goodName(target.good) });
    } catch {
      toast({ title: "حذف ناموفق بود", variant: "destructive" });
    } finally {
      setTarget(null);
    }
  };

  const activateQuote = (l: GoodItemDto) => {
    quoteRequest.mutate(
      { listingId: l.id },
      {
        onSuccess: (res) =>
          toast({ title: "قیمت‌گیری انجام شد", description: `${fa(res.created)} تامین‌کننده برای «${goodName(l.good)}» پیشنهاد دادند.` }),
        onError: (e) =>
          toast({ title: "قیمت‌گیری ناموفق بود", description: e instanceof ApiError ? e.message : "دوباره تلاش کنید", variant: "destructive" }),
      }
    );
  };

  return (
    <section className="rounded-2xl border bg-white p-5 shadow-sm">
      <SectionTitle
        icon={<Package className="size-4.5 text-primary" />}
        title={isSell ? "کالاهای فروشی من" : "نیازهای خرید من"}
        action={
          <Button size="sm" onClick={() => router.push(isSell ? "/new?tab=sell" : "/new?tab=buy")}>
            <Plus className="size-4" />
            کالای جدید
          </Button>
        }
      />

      {listings.length === 0 && (
        <EmptyBox
          text={
            isSell
              ? "هنوز کالایی برای فروش ثبت نکرده‌اید — اولین کالای‌تان را اضافه کنید."
              : "هنوز نیاز خریدی ثبت نکرده‌اید — با ثبت نیاز، تامین‌کننده‌ها پیشنهاد می‌دهند."
          }
        />
      )}

      <div className="space-y-2">
        {listings.map((l) => (
          <div key={l.id} className="flex items-center gap-3 rounded-xl border bg-muted/20 p-3">
            <span
              className={`grid size-10 shrink-0 place-items-center rounded-xl text-base font-black ${
                isSell ? "bg-primary/10 text-primary" : "bg-stone-200 text-stone-700"
              }`}
            >
              {goodName(l.good).slice(0, 1)}
            </span>
            <div className="min-w-0 grow">
              <p className="truncate text-sm font-extrabold">
                {goodName(l.good)}
                {l.brand && <span className="ms-1.5 text-[11px] font-medium text-muted-foreground">{l.brand.name}</span>}
              </p>
              <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
                {isSell ? (
                  <Badge variant="outline" className="border-primary/25 bg-accent text-primary">
                    فروش · {fmtMoney(l.priceMinor, l.currency)}
                  </Badge>
                ) : (
                  <Badge variant="outline">
                    خرید · {fa(l.volume as number)} {unitLabel(l.good.unit)} {frequencyLabel(l.frequency ?? "MONTHLY")}
                  </Badge>
                )}
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              {!isSell && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => activateQuote(l)}
                  disabled={quoteRequest.isPending}
                  aria-label={`قیمت‌گیری ${goodName(l.good)}`}
                  className="text-primary"
                >
                  <Radio className="size-4" />
                  قیمت‌گیری
                </Button>
              )}
              <Button
                size="icon"
                variant="ghost"
                onClick={() => setTarget(l)}
                aria-label={`حذف ${goodName(l.good)}`}
                className="size-8 text-destructive hover:text-destructive"
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* تایید حذف */}
      <Dialog open={!!target} onOpenChange={(o) => !o && setTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>حذف «{target ? goodName(target.good) : ""}»؟</DialogTitle>
            <DialogDescription>
              {isSell
                ? "این کالا از کاتالوگ فروش شما حذف می‌شود. این کار برگشت‌پذیر نیست."
                : "این نیاز از لیست خرید شما حذف می‌شود. این کار برگشت‌پذیر نیست."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setTarget(null)}>
              انصراف
            </Button>
            <Button variant="destructive" onClick={() => void remove()} disabled={deleteListing.isPending}>
              {deleteListing.isPending && <Loader2 className="size-4 animate-spin" />}
              حذف کن
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}

// ─── درخواست‌های قیمت (سمت فروش) ───
export function InquiriesSection({ bizId, myCity, sellListings }: { bizId: string; myCity: string; sellListings: { goodId: string; priceMinor: number | null; currency: string | null }[] }) {
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
                <p className="text-sm font-bold">{goodName(q.listing.good)}</p>
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
                suggestedMinor={mySell?.priceMinor ?? 0}
                currency={mySell?.currency ?? "IRR"}
                unit={unitLabel(q.listing.good.unit)}
                busy={sendOffer.isPending}
                onSend={(minorPrice) => {
                  sendOffer.mutate(
                    { inquiryId: q.id, priceMinor: minorPrice },
                    {
                      onSuccess: () => toast({ title: "پیشنهاد ارسال شد", description: `پیشنهاد شما برای ${q.buyer.name} در محیط خریدشان نمایش داده می‌شود.` }),
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
            title: wasFollowed ? `${supplierName} دنبال نمی‌شود` : `${supplierName} دنبال شد`,
            description: wasFollowed ? undefined : "قیمت‌هایش در «تابلوهای دنبال‌شده» جمع می‌شود.",
          }),
      }
    );
  };

  return (
    <section className="space-y-3">
      <SectionTitle
        icon={<Signal className="size-4.5 text-primary" />}
        title="پیشنهادهای تامین‌کننده‌ها"
      />
      {(offersQ.data?.items ?? []).length === 0 && <EmptyBox text="هنوز پیشنهادی ندارید؛ از «نیازهای خرید من» روی کالاها قیمت‌گیری بزنید." />}
      {[...offersByGood.entries()].map(([gid, offers]) => {
        const cheapest = sortMode === "price" ? [...offers].sort((a, b) => a.priceMinor - b.priceMinor)[0] : null;
        return (
          <div key={gid} className="rounded-2xl border bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-extrabold">{goodName(offers[0].listing.good)}</p>
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
                .sort((a, b) => (sortMode === "price" ? a.priceMinor - b.priceMinor : b.score - a.score))
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

// ─── تابلوهای دنبال‌شده (میز خرید) ───
export function BoardSection({ bizId }: { bizId: string }) {
  const boardQ = useBoard(bizId);
  const rows = boardQ.data ?? [];

  return (
    <section className="space-y-3">
      <SectionTitle
        icon={<Table2 className="size-4.5 text-primary" />}
        title="تابلوهای دنبال‌شده"
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
        <EmptyBox text="هنوز تامین‌کننده‌ای دنبال نکرده‌اید. تامین‌کننده‌ها را از کارتابل خرید یا بازار دنبال کنید تا قیمت‌هایشان اینجا جمع شود." />
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
            <p className="text-base font-black text-primary">{fmtMoney(offer.priceMinor, offer.currency)}</p>
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
              دنبال می‌شود
            </>
          ) : (
            <>
              <BookmarkPlus className="size-4" />
              دنبال کردن
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
        const best = Math.min(...list.map((r) => r.priceMinor));
        return (
          <div key={goodId} className="overflow-hidden rounded-2xl border bg-white shadow-sm">
            <div className="flex items-center justify-between border-b bg-muted/50 px-4 py-2.5">
              <p className="text-sm font-extrabold">{list[0] ? goodName(list[0].good) : ""}</p>
              <Badge variant="outline" className="bg-white">
                {fa(list.length)} تامین‌کننده
              </Badge>
            </div>
            <div className="divide-y">
              {list.map((r) => {
                const log = r.priceLogs[0];
                const trend = log ? (r.priceMinor < log.oldMinor ? "down" : r.priceMinor > log.oldMinor ? "up" : "flat") : "flat";
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
                        <p className="text-sm font-extrabold text-primary">{fmtMoney(r.priceMinor, r.currency)}</p>
                        <p className="text-[11px] text-muted-foreground">
                          هر {unitLabel(r.good.unit)}
                          {log && log.oldMinor !== r.priceMinor && (
                            <span className="ms-1 text-muted-foreground/70 line-through">{fmtMoney(log.oldMinor, r.currency)}</span>
                          )}
                        </p>
                      </div>
                      {r.priceMinor === best && <Badge className="bg-primary">ارزان‌ترین</Badge>}
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

// ─── فرم ارسال پیشنهاد قیمت — ورودی به واحد اصلی ارز، ارسال به کوچک‌ترین واحد ───
function OfferSender({
  suggestedMinor,
  currency,
  unit,
  busy,
  onSend,
}: {
  suggestedMinor: number;
  currency: string;
  unit: string;
  busy: boolean;
  onSend: (priceMinor: number) => void;
}) {
  const exp = CURRENCIES[currency]?.exp ?? 0;
  const suggestedMajor = suggestedMinor ? suggestedMinor / 10 ** exp : 0;
  const [price, setPrice] = useState(suggestedMajor ? String(suggestedMajor) : "");
  return (
    <div className="mt-3 flex items-end gap-2 border-t pt-3">
      <div className="grid grow gap-1.5">
        <span className="text-[11px] text-muted-foreground">
          قیمت پیشنهادی شما ({currencyLabel(currency)} / هر {unit})
          {suggestedMajor > 0 && " — پیشنهاد ما همان قیمت کاتالوگ شماست"}
        </span>
        <Input
          type="number"
          min={0}
          dir="ltr"
          className="text-left"
          placeholder={suggestedMajor ? String(suggestedMajor) : "قیمت…"}
          value={price}
          onChange={(e) => setPrice(e.target.value)}
        />
      </div>
      <Button
        size="sm"
        onClick={() => onSend(Math.round(Number(price) * 10 ** exp))}
        disabled={busy || !price}
      >
        {busy ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
        ارسال پیشنهاد
      </Button>
    </div>
  );
}

// ─── کارت لینک اختصاصی محیط — ابزار اشتراک‌گذاری ───
export function ShareCard({
  kind,
  slug,
  bizName,
  onView,
}: {
  kind: "sell" | "buy";
  slug: string;
  bizName?: string;
  onView: () => void;
}) {
  const isSell = kind === "sell";

  return (
    <div
      className={`rounded-2xl border p-5 ${
        isSell ? "border-primary/25 bg-accent/50" : "border-stone-300/70 bg-stone-50/70"
      }`}
    >
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2 font-bold">
          <span
            className={`grid size-9 place-items-center rounded-xl text-white shadow-sm ${
              isSell ? "bg-primary" : "bg-stone-700"
            }`}
          >
            {isSell ? <Store className="size-4" /> : <ShoppingBasket className="size-4" />}
          </span>
          <div>
            <p className="text-sm">{isSell ? "لینک کاتالوگ فروش" : "لینک لیست خرید"}</p>
            <p className="text-xs font-normal text-muted-foreground">
              {isSell ? "برای مشتری‌هایتان بفرستید" : "برای تامین‌کننده‌هایتان بفرستید"}
            </p>
          </div>
        </div>
        <Badge variant="outline" className="bg-white">
          {isSell ? "فروش" : "خرید"}
        </Badge>
      </div>
      <ShareContent kind={kind} slug={slug} bizName={bizName} onView={onView} />
    </div>
  );
}

// ─── کارت پیگیری‌ها — دنبال‌کننده‌های کاتالوگ من / دنبال‌شونده‌های من ───
export function FollowCard({ kind, bizId }: { kind: "followers" | "following"; bizId: string }) {
  const [open, setOpen] = useState(false);
  const followersQ = useMyFollowers(kind === "followers" ? bizId : null);
  const followsQ = useFollows(kind === "following" ? bizId : null);
  // دو شکل دیتا → یک شکل مشترک
  const rows: { slug: string; name: string; city: string; isVerified: boolean }[] = (
    kind === "followers"
      ? followersQ.data
      : followsQ.data?.map((f) => f.supplier)
  ) ?? [];
  const isFollowers = kind === "followers";

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-white p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
          {isFollowers ? <Users className="size-4" /> : <UsersRound className="size-4" />}
        </span>
        <div>
          <p className="text-sm font-bold">{isFollowers ? "دنبال‌کننده‌های کاتالوگم" : "تامین‌کننده‌های دنبال‌شده"}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {isFollowers ? "خریدارهایی که تابلوی قیمت شما را پیگیری می‌کنند" : "قیمت‌هایشان در تابلوهای دنبال‌شده است"}
          </p>
        </div>
      </div>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        دیدن لیست
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{isFollowers ? "دنبال‌کننده‌ها" : "دنبال‌شونده‌ها"}</DialogTitle>
          </DialogHeader>
          {(kind === "followers" ? followersQ.isLoading : followsQ.isLoading) ? (
            <div className="grid place-items-center py-10">
              <Loader2 className="size-5 animate-spin text-primary" />
            </div>
          ) : rows.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              {isFollowers ? "هنوز کسی تابلوی قیمت شما را پیگیری نمی‌کند." : "هنوز تامین‌کننده‌ای دنبال نکرده‌اید."}
            </p>
          ) : (
            <div className="max-h-80 space-y-1.5 overflow-y-auto pe-1">
              {rows.map((b) => (
                <Link
                  key={b.slug}
                  href={isFollowers ? `/buy/${b.slug}` : `/sell/${b.slug}`}
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 rounded-xl border bg-white p-2.5 transition hover:border-primary/40"
                >
                  <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-sm font-black text-primary">
                    {b.name.slice(0, 1)}
                  </span>
                  <div className="min-w-0 grow">
                    <p className="truncate text-sm font-bold">{b.name}</p>
                    <p className="flex items-center gap-0.5 text-[11px] text-muted-foreground">
                      <MapPin className="size-3" />
                      {b.city}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── جعبه خالی ───
export function EmptyBox({ text, action }: { text: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed bg-white/60 p-6 text-center">
      <p className="mx-auto max-w-md text-sm leading-7 text-muted-foreground">{text}</p>
      {action && <div className="mt-3 flex justify-center">{action}</div>}
    </div>
  );
}
