"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { fa, money, proximity, proximityLabel, roleLabel, timeAgo, unitLabel, frequencyLabel } from "@/lib/format";
import { ApiError } from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";
import {
  useBusinessProfile,
  useIncomingInquiries,
  useMarkInquiryRead,
  useMyBusinesses,
  useSendOffer,
  useSuggestions,
} from "@/lib/queries";
import { ArmIdentity, MatchRing, RoleBadge, SectionTitle } from "@/app/components/chrome";
import { AppFooter, AppHeader } from "@/app/components/chrome";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import {
  Bell,
  CheckCircle2,
  Handshake,
  MapPin,
  Send,
  ShoppingBasket,
  Store,
  Tags,
  Loader2,
} from "lucide-react";

export default function SellArm({ slug }: { slug: string }) {
  const { toast } = useToast();
  const { status: authStatus } = useAuthStore();

  const profileQ = useBusinessProfile(slug);
  const biz = profileQ.data;

  const businessesQ = useMyBusinesses();
  const myBiz = businessesQ.data?.find((b) => b.slug === slug);
  const isOwner = !!myBiz;

  const inquiriesQ = useIncomingInquiries(isOwner ? myBiz.id : null);
  const suggestionsQ = useSuggestions(isOwner ? myBiz.id : null);
  const sendOffer = useSendOffer();
  const markRead = useMarkInquiryRead();

  // علامت‌گذاری خودکار درخواست‌های خوانده‌نشده (یک‌بار برای هر دیتا)
  const markedRef = useRef(false);
  useEffect(() => {
    if (!isOwner || markedRef.current) return;
    const unread = (inquiriesQ.data?.items ?? []).filter((i) => !i.isRead);
    if (unread.length > 0 && !inquiriesQ.isLoading) {
      markedRef.current = true;
      for (const i of unread) markRead.mutate(i.id);
    }
  }, [inquiriesQ.data, isOwner, inquiriesQ.isLoading, markRead]);

  const sellListings = (biz?.listings ?? []).filter(
    (l) => (l.mode === "SELL" || l.mode === "BOTH") && l.price !== null
  );

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
          ممکن است بازوی فروش حذف شده باشد. از صفحه اصلی دوباره شروع کنید.
        </p>
        <Link href="/">
          <Button className="mt-4">صفحه اصلی</Button>
        </Link>
      </div>
    );
  }

  const copyLink = () => {
    const url = `${window.location.origin}/sell/${slug}`;
    try {
      navigator.clipboard.writeText(url);
    } catch {
      /* noop */
    }
    toast({ title: "لینک بازوی فروش کپی شد", description: `/sell/${slug}` });
  };

  const inquiries = inquiriesQ.data?.items ?? [];
  const suggestions = suggestionsQ.data ?? [];

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
            armKind="sell"
            otherArm="buy"
            otherLabel="بازوی خرید من"
            onSwitch={() => window.location.assign(`/buy/${slug}`)}
            onCopyLink={copyLink}
          />

          {authStatus === "authed" && !isOwner && (
            <p className="rounded-xl border bg-white px-4 py-3 text-xs text-muted-foreground">
              این بازوی فروش متعلق به شما نیست؛ در حالت مشاهده هستید.
            </p>
          )}

          <Tabs defaultValue="catalog">
            <TabsList className="flex w-full overflow-x-auto">
              <TabsTrigger value="catalog" className="gap-1 whitespace-nowrap text-[11px] sm:text-sm">
                <Store className="size-4" />
                کاتالوگ فروش
                <Badge variant="secondary" className="ms-1 hidden sm:inline-flex">
                  {fa(sellListings.length)}
                </Badge>
              </TabsTrigger>
              {isOwner && (
                <TabsTrigger value="inquiries" className="gap-1 whitespace-nowrap text-[11px] sm:text-sm">
                  <Bell className="size-4" />
                  درخواست‌های قیمت
                  {(inquiriesQ.data?.unreadCount ?? 0) > 0 && (
                    <Badge className="ms-1 hidden bg-primary sm:inline-flex">
                      {fa(inquiriesQ.data?.unreadCount ?? 0)}
                    </Badge>
                  )}
                </TabsTrigger>
              )}
              {isOwner && (
                <TabsTrigger value="buyers" className="gap-1 whitespace-nowrap text-[11px] sm:text-sm">
                  <Handshake className="size-4" />
                  خریدارهای پیشنهادی
                </TabsTrigger>
              )}
            </TabsList>

            {/* ── تب ۱: کاتالوگ فروش (عمومی) ── */}
            <TabsContent value="catalog" className="mt-4">
              <SectionTitle
                icon={<Tags className="size-4.5 text-primary" />}
                title="کالاهایی که می‌فروشد"
                hint="این کاتالوگ با لینک اختصاصی بازوی فروش در دسترس خریدارهاست."
              />
              {sellListings.length === 0 && <EmptyBox text="هنوز کالایی برای فروش ثبت نشده است." />}
              <div className="grid gap-3 sm:grid-cols-2">
                {sellListings.map((l) => (
                  <div key={l.id} className="flex flex-col rounded-2xl border bg-white p-4 shadow-sm">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-extrabold">{l.good.name}</p>
                        <p className="mt-0.5 text-[11px] text-muted-foreground">{l.good.category}</p>
                      </div>
                      <Badge variant="outline" className="border-primary/25 bg-accent text-primary">
                        نمایش فعال
                      </Badge>
                    </div>
                    <div className="mt-3 flex items-end justify-between">
                      <div>
                        <p className="text-lg font-black text-primary">{money(l.price as number)}</p>
                        <p className="text-[11px] text-muted-foreground">
                          هر {unitLabel(l.good.unit)} · حداقل سفارش {fa(l.minOrder ?? 0)}{" "}
                          {unitLabel(l.good.unit)}
                        </p>
                      </div>
                      <Badge variant="secondary">موجودی: {fa(l.stock ?? 0)}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>

            {/* ── تب ۲: درخواست‌های قیمت (فقط مالک) ── */}
            {isOwner && (
              <TabsContent value="inquiries" className="mt-4 space-y-3">
                <SectionTitle
                  icon={<Bell className="size-4.5 text-primary" />}
                  title="خریدارهایی که قیمت گرفته‌اند"
                  hint="خریدارها در بازوی خودشان قیمت‌گیری را فعال کرده‌اند؛ حجم و شهرشان را ببینید و پیشنهاد بدهید."
                />
                {inquiries.length === 0 && (
                  <EmptyBox text="فعلا درخواست قیمتی ندارید. کاتالوگ کامل‌تر = درخواست بیشتر." />
                )}
                {inquiries.map((q) => {
                  const answered = q.status === "ANSWERED";
                  const isNew = !q.isRead;
                  const mySell = sellListings.find((l) => l.good.id === q.listing.good.id);
                  return (
                    <div
                      key={q.id}
                      className={`rounded-2xl border bg-white p-4 shadow-sm ${
                        isNew ? "animate-fade-up border-primary/40 ring-1 ring-primary/15" : ""
                      }`}
                    >
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
                              <RoleBadge role={q.buyer.role} />
                              <span className="flex items-center gap-0.5">
                                <MapPin className="size-3" />
                                {q.buyer.city} · {proximityLabel(proximity(q.buyer.city, biz.city))}
                              </span>
                              <span>{timeAgo(q.createdAt)}</span>
                            </div>
                          </div>
                        </div>
                        <div className="text-end">
                          <p className="text-sm font-bold">{q.listing.good.name}</p>
                          <p className="text-[11px] text-muted-foreground">
                            نیاز: {fa(q.volume)} {unitLabel(q.listing.good.unit)}
                          </p>
                        </div>
                      </div>

                      {q.note && (
                        <p className="mt-2 rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">
                          «{q.note}»
                        </p>
                      )}

                      {answered ? (
                        <p className="mt-3 flex items-center gap-1.5 rounded-lg bg-accent px-3 py-2 text-xs font-bold text-primary">
                          <CheckCircle2 className="size-4" />
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
                                onSuccess: () =>
                                  toast({
                                    title: "پیشنهاد ارسال شد",
                                    description: `پیشنهاد شما برای ${q.buyer.name} در بازوی خریدشان نمایش داده می‌شود.`,
                                  }),
                                onError: (e) =>
                                  toast({
                                    title: "ارسال ناموفق بود",
                                    description: e instanceof ApiError ? e.message : "دوباره تلاش کنید",
                                    variant: "destructive",
                                  }),
                              }
                            );
                          }}
                        />
                      )}
                    </div>
                  );
                })}
              </TabsContent>
            )}

            {/* ── تب ۳: خریدارهای پیشنهادی (فقط مالک) ── */}
            {isOwner && (
              <TabsContent value="buyers" className="mt-4 space-y-3">
                <SectionTitle
                  icon={<Handshake className="size-4.5 text-primary" />}
                  title="خریدارهای مناسب کالاهای شما"
                  hint="بر اساس کالاهای فروش شما، حجم نیاز و شهر محاسبه شده است."
                />
                {suggestions.length === 0 && <EmptyBox text="فعلا تطبیقی برای شما پیدا نشد." />}
                <div className="grid gap-3 sm:grid-cols-2">
                  {suggestions.map((m) => (
                    <div key={`${m.buyerId}-${m.goodId}`} className="rounded-2xl border bg-white p-4 shadow-sm">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-extrabold">{m.buyerName}</p>
                          <div className="mt-1 flex flex-wrap items-center gap-2">
                            <RoleBadge role={m.buyerRole} />
                            <span className="flex items-center gap-1 text-xs text-muted-foreground">
                              <MapPin className="size-3.5" />
                              {m.buyerCity} · {proximityLabel(proximity(m.buyerCity, biz.city))}
                            </span>
                          </div>
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
              </TabsContent>
            )}
          </Tabs>

          {!isOwner && authStatus !== "authed" && (
            <p className="mt-6 text-center text-xs text-muted-foreground">
              برای ساخت بازوی فروش خودتان،{" "}
              <Link href="/start" className="font-bold text-primary underline">
                ثبت‌نام کنید
              </Link>{" "}
              — {roleLabel(biz.role)} بودن اجباری نیست!
            </p>
          )}
        </div>
      </main>
      <AppFooter />
    </>
  );
}

// ─── فرم ارسال پیشنهاد قیمت ───
function OfferSender({
  suggested,
  unit,
  busy,
  onSend,
}: {
  suggested: number;
  unit: string;
  busy: boolean;
  onSend: (price: number) => void;
}) {
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

function EmptyBox({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-dashed bg-white/60 p-6 text-center">
      <p className="mx-auto max-w-md text-sm leading-7 text-muted-foreground">{text}</p>
    </div>
  );
}
