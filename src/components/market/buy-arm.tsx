"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  fa,
  money,
  proximity,
  proximityLabel,
  timeAgo,
  unitLabel,
  frequencyLabel,
} from "@/lib/format";
import { ApiError, type OfferDto } from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";
import {
  useBoard,
  useBusinessProfile,
  useFollows,
  useFollowToggle,
  useMyBusinesses,
  useOffers,
  useQuoteRequest,
} from "@/lib/queries";
import { ArmIdentity, MatchRing, RoleBadge, SectionTitle } from "./chrome";
import { AppFooter, AppHeader } from "./chrome";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowDownWideNarrow,
  BookmarkCheck,
  BookmarkPlus,
  Loader2,
  MapPin,
  Radio,
  RefreshCw,
  ShoppingBag,
  Signal,
  Table2,
  TrendingDown,
  TrendingUp,
  Minus,
} from "lucide-react";

export default function BuyArm({ slug }: { slug: string }) {
  const { toast } = useToast();
  const { status: authStatus } = useAuthStore();

  const profileQ = useBusinessProfile(slug);
  const biz = profileQ.data;

  const businessesQ = useMyBusinesses();
  const myBiz = businessesQ.data?.find((b) => b.slug === slug);
  const isOwner = !!myBiz;

  const offersQ = useOffers(isOwner ? myBiz.id : null);
  const boardQ = useBoard(isOwner ? myBiz.id : null);
  const followsQ = useFollows(isOwner ? myBiz.id : null);
  const quoteRequest = useQuoteRequest();
  const followToggle = useFollowToggle();

  const [sortMode, setSortMode] = useState<"score" | "price">("score");

  const buyListings = useMemo(
    () =>
      (biz?.listings ?? []).filter(
        (l) => (l.mode === "BUY" || l.mode === "BOTH") && l.volume !== null
      ),
    [biz]
  );

  /** پیشنهادهای دریافتی گروه‌شده بر اساس کالا */
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

  if (profileQ.isLoading) {
    return (
      <div className="grid place-items-center py-32">
        <Loader2 className="size-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!biz) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <p className="text-lg font-bold">این لینک پیدا نشد</p>
        <p className="mt-2 text-sm text-muted-foreground">
          ممکن است بازوی خرید حذف شده باشد. از صفحه اصلی دوباره شروع کنید.
        </p>
        <Link href="/">
          <Button className="mt-4">صفحه اصلی</Button>
        </Link>
      </div>
    );
  }

  const copyLink = () => {
    const url = `${window.location.origin}/buy/${slug}`;
    try {
      navigator.clipboard.writeText(url);
    } catch {
      /* noop */
    }
    toast({ title: "لینک بازوی خرید کپی شد", description: `/buy/${slug}` });
  };

  const activateInquiry = (listingId: string, goodName: string) => {
    if (!isOwner || !myBiz) {
      toast({
        title: "اول وارد شوید",
        description: "قیمت‌گیری مخصوص صاحب این بازوی خرید است؛ از دکمه «ورود» بالا وارد شوید.",
        variant: "destructive",
      });
      return;
    }
    quoteRequest.mutate(
      { listingId },
      {
        onSuccess: (res) => {
          toast({
            title: "پیشنهاد قیمت رسید",
            description: `${fa(res.created)} تامین‌کننده برای «${goodName}» پیشنهاد دادند.`,
          });
        },
        onError: (e) =>
          toast({
            title: "قیمت‌گیری ناموفق بود",
            description: e instanceof ApiError ? e.message : "دوباره تلاش کنید",
            variant: "destructive",
          }),
      }
    );
  };

  const toggleFollow = (supplierId: string, supplierName: string) => {
    if (!isOwner || !myBiz) {
      toast({ title: "اول وارد شوید", description: "فالو مخصوص کاربران وارد‌شده است.", variant: "destructive" });
      return;
    }
    const wasFollowed = (followsQ.data ?? []).some((f) => f.supplierId === supplierId);
    followToggle.mutate(
      { businessId: myBiz.id, supplierId, follow: !wasFollowed },
      {
        onSuccess: () =>
          toast({
            title: wasFollowed ? `${supplierName} از فالو خارج شد` : `${supplierName} فالو شد`,
            description: wasFollowed ? undefined : "قیمت‌هایش در «تابلوی قیمت» جمع می‌شود.",
          }),
      }
    );
  };

  const followedIds = new Set((followsQ.data ?? []).map((f) => f.supplierId));

  return (
    <>
      <AppHeader />
      <main className="grow">
        <div className="mx-auto max-w-4xl space-y-5 px-4 py-6">
          <ArmIdentity
            bizName={biz.name}
            bizRole={biz.role}
            bizCity={biz.city}
            bizPhone={biz.phone}
            armKind="buy"
            otherArm="sell"
            otherLabel="بازوی فروش من"
            onSwitch={() => window.location.assign(`/sell/${slug}`)}
            onCopyLink={copyLink}
          />

          {authStatus === "authed" && !isOwner && (
            <p className="rounded-xl border bg-white px-4 py-3 text-xs text-muted-foreground">
              این بازوی خرید متعلق به شما نیست؛ در حالت مشاهده هستید.
            </p>
          )}

          <Tabs defaultValue="purchases">
            <TabsList className="flex w-full overflow-x-auto">
              <TabsTrigger value="purchases" className="gap-1 whitespace-nowrap text-[11px] sm:text-sm">
                <ShoppingBag className="size-4" />
                خریدهای من
                <Badge variant="secondary" className="ms-1 hidden sm:inline-flex">
                  {fa(buyListings.length)}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="board" className="gap-1 whitespace-nowrap text-[11px] sm:text-sm">
                <Table2 className="size-4" />
                تابلوی قیمت
                {isOwner && (followsQ.data?.length ?? 0) > 0 && (
                  <Badge className="ms-1 hidden bg-primary sm:inline-flex">
                    {fa(followsQ.data?.length ?? 0)}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>

            {/* ── تب ۱: خریدهای من + قیمت‌گیری ── */}
            <TabsContent value="purchases" className="mt-4 space-y-3">
              <SectionTitle
                icon={<ShoppingBag className="size-4.5 text-primary" />}
                title="کالاهایی که می‌خواهد"
                hint={
                  isOwner
                    ? "برای قیمت‌گیری، دکمه فعال‌سازی را بزنید تا موتور تطبیق iMach تامین‌کننده‌های مناسب را پیدا و پیشنهادشان را ثبت کند."
                    : "پیشنهادهای تامین‌کننده‌ها برای هر کالا این‌جا جمع می‌شود."
                }
              />
              {buyListings.length === 0 && (
                <EmptyBox text="هنوز کالایی برای خرید ثبت نشده است. از «ثبت کالاها» اضافه کنید." />
              )}
              {buyListings.map((l) => {
                const offers = offersByGood.get(l.good.id) ?? [];
                const active = offers.length > 0;
                const searching = quoteRequest.isPending && quoteRequest.variables?.listingId === l.id;
                const cheapest = sortMode === "price" ? [...offers].sort((a, b) => a.price - b.price)[0] : null;
                return (
                  <div key={l.id} className="rounded-2xl border bg-white p-4 shadow-sm">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="font-extrabold">{l.good.name}</p>
                        <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          <Badge variant="outline" className="border-primary/25 bg-primary/10 text-primary">
                            {fa(l.volume as number)} {unitLabel(l.good.unit)}
                          </Badge>
                          <span>هر {frequencyLabel(l.frequency ?? "MONTHLY")}</span>
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        {active && (
                          <Badge className="bg-primary">
                            <Signal className="size-3" />
                            قیمت‌گیری فعال
                          </Badge>
                        )}
                        {isOwner && (
                          <Button
                            size="sm"
                            onClick={() => activateInquiry(l.id, l.good.name)}
                            disabled={quoteRequest.isPending}
                          >
                            <Radio className="size-4" />
                            {searching ? "در حال اطلاع‌رسانی…" : active ? "قیمت‌گیری مجدد" : "فعال‌سازی قیمت‌گیری"}
                          </Button>
                        )}
                      </div>
                    </div>

                    {searching && (
                      <p className="animate-soft-pulse mt-3 rounded-lg bg-accent px-3 py-2 text-xs text-primary">
                        نیاز شما برای تامین‌کننده‌های هم‌سطح و نزدیک ارسال شد؛ در حال دریافت پیشنهادها…
                      </p>
                    )}

                    {active && (
                      <div className="mt-3 space-y-2">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="text-xs font-bold text-muted-foreground">
                            پیشنهاد تامین‌کننده‌ها ({fa(offers.length)}):
                          </p>
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
                                  sortMode === o.v
                                    ? "bg-white text-primary shadow-sm"
                                    : "text-muted-foreground hover:text-foreground"
                                }`}
                              >
                                {o.label}
                              </button>
                            ))}
                          </div>
                        </div>
                        {[...offers]
                          .sort((a, b) =>
                            sortMode === "price" ? a.price - b.price : b.score - a.score
                          )
                          .map((o, i) => (
                            <OfferCard
                              key={o.id}
                              offer={o}
                              index={i}
                              myCity={biz.city}
                              followed={followedIds.has(o.seller.id)}
                              cheapest={cheapest?.id === o.id && offers.length > 1}
                              onFollow={() => toggleFollow(o.seller.id, o.seller.name)}
                              canFollow={isOwner}
                            />
                          ))}
                      </div>
                    )}

                    {!active && !searching && (
                      <p className="mt-3 rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">
                        {isOwner
                          ? "برای این کالا هنوز قیمت‌گیری فعال نشده؛ با فعال‌سازی، تامین‌کننده‌ها پیشنهاد می‌دهند."
                          : "هنوز پیشنهادی برای این کالا ثبت نشده است."}
                      </p>
                    )}
                  </div>
                );
              })}
            </TabsContent>

            {/* ── تب ۲: تابلوی قیمت ── */}
            <TabsContent value="board" className="mt-4">
              <SectionTitle
                icon={<Table2 className="size-4.5 text-primary" />}
                title="تابلوی قیمت فالو‌شده‌ها"
                hint="قیمت‌های تامین‌کننده‌هایی که فالو کرده‌اید؛ دکمه «بررسی به‌روزرسانی» تغییرات قیمت را همین‌جا نشان می‌دهد."
                action={
                  isOwner && (boardQ.data?.length ?? 0) > 0 ? (
                    <Button size="sm" variant="outline" onClick={() => void boardQ.refetch()}>
                      <RefreshCw className={boardQ.isFetching ? "size-4 animate-spin" : "size-4"} />
                      بررسی به‌روزرسانی
                    </Button>
                  ) : undefined
                }
              />
              {!isOwner ? (
                <EmptyBox text="تابلوی قیمت مخصوص صاحب این بازوی خرید است. اگر شما صاحبش هستید، وارد شوید." />
              ) : (boardQ.data?.length ?? 0) === 0 ? (
                <EmptyBox text="هنوز تامین‌کننده‌ای فالو نشده. از پیشنهادها فالو کنید تا قیمت‌ها اینجا جمع شود." />
              ) : (
                <BoardView rows={boardQ.data ?? []} />
              )}
            </TabsContent>
          </Tabs>
        </div>
      </main>
      <AppFooter />
    </>
  );
}

// ─── کارت پیشنهاد قیمت ───
function OfferCard({
  offer,
  index,
  myCity,
  followed,
  cheapest,
  onFollow,
  canFollow,
}: {
  offer: OfferDto;
  index: number;
  myCity: string;
  followed: boolean;
  cheapest?: boolean;
  onFollow: () => void;
  canFollow: boolean;
}) {
  const p = proximity(myCity, offer.seller.city);
  return (
    <div
      className="animate-fade-up rounded-xl border bg-muted/30 p-3"
      style={{ animationDelay: `${index * 120}ms` }}
    >
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
              <RoleBadge role={offer.seller.role} />
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
              هر {unitLabel(offer.listing.good.unit)} · حداقل {fa(offer.minOrder)}{" "}
              {unitLabel(offer.listing.good.unit)}
            </p>
          </div>
          {offer.score > 0 && <MatchRing score={offer.score} size={40} />}
        </div>
      </div>
      {canFollow && (
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
      )}
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
                  <div
                    key={r.id}
                    className="flex flex-wrap items-center justify-between gap-2 px-4 py-3"
                  >
                    <div className="flex items-center gap-2">
                      <span className="grid size-8 place-items-center rounded-lg bg-primary/10 text-sm font-black text-primary">
                        {r.business.name.slice(0, 1)}
                      </span>
                      <div>
                        <p className="text-sm font-bold">{r.business.name}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {r.business.city} · حداقل {fa(r.minOrder ?? 0)} {unitLabel(r.good.unit)} ·{" "}
                          {timeAgo(r.updatedAt)}
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
                            <span className="ms-1 text-muted-foreground/70 line-through">
                              {fa(log.oldPrice)}
                            </span>
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

function EmptyBox({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-dashed bg-white/60 p-6 text-center">
      <p className="mx-auto max-w-md text-sm leading-7 text-muted-foreground">{text}</p>
    </div>
  );
}
