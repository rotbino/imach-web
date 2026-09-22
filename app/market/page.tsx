"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  CURRENCIES,
  categoryName,
  currencyLabel,
  fa,
  fmtMoney,
  frequencyLabel,
  goodName,
  timeAgo,
  unitLabel,
} from "@/lib/format";
import { useAuthStore } from "@/lib/auth-store";
import { useActiveBusiness, useArm } from "@/lib/active-biz";
import {
  useBuyRequests,
  useExploreFeed,
  useFollowBuyerToggle,
  useFollowToggle,
  useFollows,
  useMarketState,
  useOfferBuyRequest,
  useSupplierSuggestions,
} from "@/lib/queries";
import type {
  ExploreItemDto,
  MarketItemDto,
  MarketStateDto,
  SupplierSuggestionDto,
} from "@/lib/api";
import { AppFooter, AppHeader, MatchRing, MobileTabBar } from "@/app/components/chrome";
import { ShareContent } from "@/app/components/share";
import { ContactButton } from "@/app/components/contact-gate";
import { EmptyFeed, FeedSpinner } from "@/app/components/feed-cards";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  BadgeCheck,
  Check,
  ClipboardList,
  Loader2,
  MapPin,
  Package,
  Phone,
  ShoppingBag,
  Users,
} from "lucide-react";

/*
 * خریدارها / فروشنده‌ها — میدان کشف آی‌ماچ:
 * • بازوی فروش → «خریدارها»: درخواست‌های خرید مرتبط با کالاهای من.
 *   گیت ۱ — کاتالوگ خالی: بدون حداقل یک کالا، لیستی نیست (سیمگن تطبیق نداریم).
 *   گیت ۲ — فقط «ارسال پیشنهاد» پشت حد نصاب معرف است؛ و UX خودش در لحظه‌ی
 *   کلیک حرف می‌زند: دکمه همیشه فعالی است، مدالِ لحظه‌ی ارسال پیشرفت و
 *   ابزارهای اشتراک (مخاطبین + پیام‌رسان‌ها) را نشان می‌دهد.
 *   فالو رایگان است (سمت تقاضا اذیت نمی‌شود) — دکمه‌ها بالای کارت، روبه‌روی
 *   عنوان، جلوی چشم (خواسته‌ی کاربر).
 * • بازوی خرید → «فروشنده‌ها»: تامین‌کننده‌های مرتبط + کالاهای در حال فروش؛
 *   فالو و تماس رایگان — خریدارِ کمیاب نباید بهایی بدهد؛ جذب تامین‌کننده
 *   مسیر رشد بهتری می‌خواهد (خواسته‌ی کاربر).
 * • لیست تک‌ستونی در max-w-4xl.
 */

export default function MarketPage() {
  const { status } = useAuthStore();
  const arm = useArm();

  useEffect(() => {
    document.title = arm === "buy" ? "فروشنده‌ها | iMach" : "خریدارها | iMach";
  }, [arm]);

  const isBuyArm = arm === "buy";

  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader />
      <main className="grow">
        <div className="mx-auto max-w-4xl px-4 py-5">
          {/* عنوان صفحه — برای جهت‌دهی فضای خرید/فروش */}
          <h1 className="mb-4 flex items-center gap-2 text-lg font-black">
            {isBuyArm ? (
              <>
                <ShoppingBag className="size-5 text-primary" />
                فروشنده‌ها
              </>
            ) : (
              <>
                <ClipboardList className="size-5 text-stone-700" />
                خریدارها
              </>
            )}
          </h1>

          {isBuyArm ? <SellersField authed={status === "authed"} /> : <BuyersField authed={status === "authed"} />}
        </div>
      </main>
      <AppFooter />
      <MobileTabBar />
    </div>
  );
}

// ─── فضای خرید — بازوی فروش: درخواست‌های خریدِ مرتبط + گیت‌های رشد ───

function BuyersField({ authed }: { authed: boolean }) {
  const active = useActiveBusiness();
  const stateQ = useMarketState(authed ? (active?.id ?? null) : null);
  const relatedQ = useBuyRequests(authed ? (active?.id ?? null) : null);
  const allQ = useExploreFeed("BUY");

  const state = stateQ.data;
  const related: MarketItemDto[] = relatedQ.data ?? [];
  const relIds = useMemo(() => new Set(related.map((r) => r.id)), [related]);
  const others = (allQ.data ?? []).filter((l) => !relIds.has(l.id));

  if (allQ.isLoading || (authed && stateQ.isLoading)) return <FeedSpinner />;

  // گیت ۰ — هنوز کسب‌وکاری ندارد؛ اول هویت، بعد بازار
  if (authed && !active) {
    return (
      <div className="rounded-3xl border border-dashed bg-white/70 p-10 text-center">
        <p className="text-sm font-bold">اول کسب‌وکارتان را بسازید</p>
        <p className="mx-auto mt-2 max-w-sm text-xs leading-6 text-muted-foreground">
          بازار خریدارها با کسب‌وکار شما تطبیق می‌خورد.
        </p>
        <Link
          href="/start"
          className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground shadow-sm"
        >
          ساخت کسب‌وکار
        </Link>
      </div>
    );
  }

  // گیت ۱ — کاتالوگ خالی: بدون کالا، تطبیقی معنا ندارد (خواسته‌ی کاربر)
  if (state && state.sellCount === 0) {
    return (
      <div className="rounded-3xl border border-dashed bg-white/70 p-10 text-center">
        <span className="mx-auto grid size-12 place-items-center">
          <Package className="size-6 text-stone-400" />
        </span>
        <p className="mt-2 text-sm font-bold">برای دیدن خریدارها، اول یک کالا در کاتالوگتان ثبت کنید</p>
        <p className="mx-auto mt-2 max-w-sm text-xs leading-6 text-muted-foreground">
          بازار خریدارها با کالاهای فروش شما تطبیق می‌خورد.
        </p>
        <Link
          href="/sell"
          className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground shadow-sm"
        >
          <Package className="size-3.5" />
          ثبت کالا در کاتالوگ
        </Link>
      </div>
    );
  }

  if (related.length === 0 && others.length === 0) {
    return <EmptyFeed icon={<ClipboardList className="size-6 text-stone-700" />} text="هنوز هیچ نیاز خریدی ثبت نشده است." />;
  }

  return (
    <div className="space-y-6 pb-6">
      {related.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-extrabold text-muted-foreground">مرتبط‌ترین با کالاهای شما</h2>
          <div className="space-y-3">
            {related.map((l) => (
              <BuyRequestRow
                key={l.id}
                item={l}
                score={l.score}
                authed={authed}
                state={state}
                bizId={active?.id ?? null}
                mySlug={active?.slug ?? ""}
                myName={active?.name}
              />
            ))}
          </div>
        </section>
      )}

      {others.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-extrabold text-muted-foreground">
            {related.length > 0 ? "سایر درخواست‌های خرید" : "تمام درخواست‌های خرید بازار"}
          </h2>
          <div className="space-y-3">
            {others.map((l) => (
              <BuyRequestRow key={l.id} item={l} authed={authed} state={state} bizId={active?.id ?? null} mySlug={active?.slug ?? ""} myName={active?.name} />
            ))}
          </div>
        </section>
      )}

      {!authed && <GuestCta />}
    </div>
  );
}

// ─── نوار پیشرفت معرف — داخل مدال پیشنهاد؛ پیش از حد نصاب نشان داده می‌شود ───

function ReferralProgress({ state }: { state: MarketStateDto }) {
  const pct = Math.min(100, Math.round((state.referral.count / state.referral.required) * 100));
  return (
    <div>
      <p className="mb-1.5 flex items-center justify-between gap-2 text-xs font-extrabold">
        <span className="flex items-center gap-1.5">
          <Users className="size-3.5 text-primary" />
          اعضای عضو شده از طریق کاتالوگ شما
        </span>
        <span className="text-primary">
          {fa(state.referral.count)} از {fa(state.referral.required)}
        </span>
      </p>
      <div
        className="h-2 overflow-hidden rounded-full bg-stone-100"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

// ─── کارت درخواست خرید — اقدام‌ها بالای کارت، روبه‌روی عنوان ───

function BuyRequestRow({
  item: l,
  score,
  authed,
  state,
  bizId,
  mySlug,
  myName,
}: {
  item: ExploreItemDto;
  score?: number;
  authed: boolean;
  state: MarketStateDto | undefined;
  bizId: string | null;
  mySlug: string;
  myName?: string;
}) {
  const followed = !!state && state.followedBuyerIds.includes(l.business.id);
  const offered = !!state && state.offeredBuyerIds.includes(l.business.id);
  const canOffer = !!state && state.sellGoodIds.includes(l.good.id);

  return (
    <article className="animate-fade-up rounded-2xl border bg-white p-4 shadow-sm transition hover:border-stone-300 hover:shadow-md">
      {/* عنوان + اقدام‌ها — یک نگاه، هم‌زمان دیده می‌شوند (خواسته‌ی کاربر) */}
      <div className="flex items-start justify-between gap-3">
        <Link href={`/buy/${l.business.slug}`} className="block min-w-0 grow">
          <p className="truncate font-extrabold" title={goodName(l.good)}>
            نیاز به خرید {goodName(l.good)}
          </p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">{categoryName(l.good.category)}</p>
        </Link>
        {authed && state && bizId && (
          <div className="flex shrink-0 items-center gap-1.5">
            <FollowBuyerButton bizId={bizId} buyerId={l.business.id} followed={followed} />
            {canOffer && (
              <OfferButton
                bizId={bizId}
                listingId={l.id}
                offered={offered}
                buyerName={l.business.name}
                state={state}
                mySlug={mySlug}
                myName={myName}
              />
            )}
          </div>
        )}
      </div>

      {/* مشخصات خرید — حجم + تناوب + امتیاز تطبیق */}
      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        <Badge variant="outline" className="border-stone-300 bg-stone-50 text-stone-700">
          {fa(l.volume as number)} {unitLabel(l.good.unit)}
        </Badge>
        <Badge variant="outline" className="border-stone-300 bg-stone-50 text-stone-700">
          {frequencyLabel(l.frequency ?? "MONTHLY")}
        </Badge>
        {score !== undefined && score > 0 && (
          <span className="ms-auto">
            <MatchRing score={score} size={40} />
          </span>
        )}
      </div>

      {/* خریدار — صاحب نیاز */}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t pt-2.5 text-[11px] text-muted-foreground">
        <span className="flex min-w-0 items-center gap-1.5">
          <span
            className="grid size-5 shrink-0 place-items-center rounded-md bg-stone-200 text-[10px] font-black text-stone-700"
            aria-hidden
          >
            {l.business.name.slice(0, 1)}
          </span>
          <span className="truncate font-bold text-foreground">{l.business.name}</span>
          {l.business.isVerified && <BadgeCheck className="size-3.5 shrink-0 text-stone-600" aria-label="تاییدشده" />}
          <span className="flex shrink-0 items-center gap-0.5">
            <MapPin className="size-3" />
            {l.business.city}
          </span>
        </span>
        <span className="shrink-0">{timeAgo(l.updatedAt)}</span>
      </div>
    </article>
  );
}

// ─── دکمه فالو خریدار — رایگان (خواسته‌ی کاربر: سمت تقاضا اذیت نمی‌شود) ───

function FollowBuyerButton({
  bizId,
  buyerId,
  followed,
}: {
  bizId: string;
  buyerId: string;
  followed: boolean;
}) {
  const { toast } = useToast();
  const toggle = useFollowBuyerToggle();

  return (
    <Button
      size="sm"
      variant={followed ? "secondary" : "outline"}
      disabled={toggle.isPending}
      className={`h-8 gap-1.5 rounded-xl px-3 text-xs ${
        followed ? "border-primary/30 bg-primary/10 text-primary hover:bg-primary/15" : ""
      }`}
      onClick={() =>
        toggle.mutate(
          { businessId: bizId, buyerId, follow: !followed },
          {
            onSuccess: () =>
              toast(
                followed
                  ? { title: "فالو برداشته شد" }
                  : { title: "فالو شد", description: "در «تامین من» این خریدار دیده می‌شوید." }
              ),
            onError: (e) => toast({ title: e.message || "خطا", variant: "destructive" }),
          }
        )
      }
    >
      {toggle.isPending ? <Loader2 className="size-3 animate-spin" /> : followed ? <Check className="size-3" /> : null}
      {followed ? "فالو شد" : "فالو"}
    </Button>
  );
}

// ─── ارسال پیشنهاد — دکمه همیشه فعال؛ UX در لحظه‌ی کلیک حرف می‌زند:
//     حد نصاب کامل → مدال فرم پیشنهاد · ناقص → مدال پیشرفت + ابزار اشتراک ───

function OfferButton({
  bizId,
  listingId,
  offered,
  buyerName,
  state,
  mySlug,
  myName,
}: {
  bizId: string;
  listingId: string;
  offered: boolean;
  buyerName: string;
  state: MarketStateDto | undefined;
  mySlug: string;
  myName?: string;
}) {
  const { toast } = useToast();
  const offerMut = useOfferBuyRequest();
  const cur = state?.currency ?? "IRR";
  const exp = CURRENCIES[cur]?.exp ?? 0;
  const unlocked = !!state?.referral.unlocked;

  const [open, setOpen] = useState(false);
  const [price, setPrice] = useState("");
  const [note, setNote] = useState("");
  const digits = price.replace(/\D/g, "");
  const valid = digits.length > 0 && Number(digits) > 0;

  const submit = () => {
    if (!valid) return;
    offerMut.mutate(
      { businessId: bizId, buyListingId: listingId, priceMinor: Math.round(Number(digits) * 10 ** exp), note: note.trim() || undefined },
      {
        onSuccess: () => {
          setOpen(false);
          setPrice("");
          setNote("");
          toast({ title: "پیشنهاد ارسال شد", description: `در پیشنهادهای دریافتی ${buyerName} می‌افتد.` });
        },
        onError: (e) => toast({ title: e.message || "خطا", variant: "destructive" }),
      }
    );
  };

  return (
    <>
      <Button
        size="sm"
        variant={offered ? "secondary" : "outline"}
        className={`h-8 gap-1.5 rounded-xl px-3 text-xs ${
          offered ? "border-primary/30 bg-primary/10 text-primary hover:bg-primary/15" : ""
        }`}
        onClick={() => setOpen(true)}
      >
        {offered ? <Check className="size-3" /> : null}
        {offered ? "ارسال شد" : "ارسال پیشنهاد"}
      </Button>

      {unlocked ? (
        /* حد نصاب کامل — فرم پیشنهاد در مدال */
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>پیشنهاد برای {buyerName}</DialogTitle>
              <DialogDescription>در پیشنهادهای دریافتی او می‌افتد و مستقیم دیده می‌شود.</DialogDescription>
            </DialogHeader>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                submit();
              }}
              className="grid gap-2.5"
            >
              <div className="flex items-center gap-2">
                <Input
                  dir="ltr"
                  inputMode="numeric"
                  placeholder="قیمت هر واحد"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="h-9 grow text-left"
                  aria-label="قیمت پیشنهادی هر واحد"
                />
                <span className="shrink-0 rounded-xl border bg-white px-3 py-2 text-xs font-bold text-muted-foreground">
                  {currencyLabel(cur)}
                </span>
              </div>
              <Input
                placeholder="توضیح (اختیاری)"
                value={note}
                maxLength={300}
                onChange={(e) => setNote(e.target.value)}
                className="h-9"
                aria-label="توضیح پیشنهاد"
              />
              <div className="flex items-center justify-end gap-2">
                <Button type="button" size="sm" variant="ghost" className="h-8 rounded-xl px-3 text-xs" onClick={() => setOpen(false)}>
                  بی‌خیال
                </Button>
                <Button type="submit" size="sm" disabled={offerMut.isPending || !valid} className="h-8 rounded-xl px-4 text-xs">
                  {offerMut.isPending ? <Loader2 className="size-3 animate-spin" /> : null}
                  ارسال
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      ) : (
        /* پیش از حد نصاب — پیامِ درست، همان لحظه‌ای که می‌خواهد اقدام کند */
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>برای ارسال پیشنهاد، حد نصاب دعوت را کامل کنید</DialogTitle>
              <DialogDescription>
                <div className={"text-justify"}>
                  بهای ارسال پیشنهاد قیمت به خریدار آماده، دعوت از خریداران جدید است. با جذب 10 خریدار جدید دسترسی همیشگی به همه خریدارن مرتبط با کالاهای خود خواهید داشت. لینک کاتالوگ خود را برای خریداران خود ارسال کنید تا هم کاتالوگ شمار را فالو کنند و هم برای فالو ثبت نام کنند. خریدارانی که از طریق شما ثبت نام کنند. دعوت شده و فالور شما خواهند شد: {fa(state?.referral.required ?? 10)} عضو با لینک کاتالوگ شما.
                </div>

              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4">
              {state && <ReferralProgress state={state} />}
              {mySlug && <ShareContent kind="sell" slug={mySlug} bizName={myName} />}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}

// ─── فضای فروش — بازوی خرید: تامین‌کننده‌های مرتبط + کالاهای در حال فروش ───

function SellersField({ authed }: { authed: boolean }) {
  const active = useActiveBusiness();
  const relatedQ = useSupplierSuggestions(authed ? (active?.id ?? null) : null);
  const allQ = useExploreFeed("SELL");
  const followsQ = useFollows(authed ? (active?.id ?? null) : null);

  const related: SupplierSuggestionDto[] = relatedQ.data ?? [];
  const relListingIds = useMemo(() => new Set(related.map((r) => r.listingId)), [related]);
  const others = (allQ.data ?? []).filter((l) => !relListingIds.has(l.id));
  const followedIds = useMemo(() => new Set((followsQ.data ?? []).map((f) => f.supplierId)), [followsQ.data]);

  if (allQ.isLoading) return <FeedSpinner />;
  if (related.length === 0 && others.length === 0) {
    return <EmptyFeed icon={<ShoppingBag className="size-6 text-primary" />} text="هنوز هیچ کالایی برای فروش ثبت نشده است." />;
  }

  const followProps = {
    authed,
    bizId: active?.id ?? null,
    selfId: active?.id ?? null,
    followedIds,
  };

  return (
    <div className="space-y-6 pb-6">
      {related.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-extrabold text-muted-foreground">تامین‌کننده‌های پیشنهادی برای نیازهای شما</h2>
          <div className="space-y-3">
            {related.map((s) => (
              <SupplierMatchRow key={s.listingId} s={s} {...followProps} />
            ))}
          </div>
        </section>
      )}

      {others.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-extrabold text-muted-foreground">کالاهای در حال فروش</h2>
          <div className="space-y-3">
            {others.map((l) => (
              <SellRow key={l.id} item={l} {...followProps} />
            ))}
          </div>
        </section>
      )}

      {!authed && <GuestCta />}
    </div>
  );
}

// ─── دکمه فالو تامین‌کننده — رایگان برای خریدار (سمت تقاضا گیت ندارد) ───

function FollowSupplierButton({
  bizId,
  supplierId,
  supplierName,
  followedIds,
}: {
  bizId: string;
  supplierId: string;
  supplierName: string;
  followedIds: Set<string>;
}) {
  const { toast } = useToast();
  const followToggle = useFollowToggle();
  const followed = followedIds.has(supplierId);

  return (
    <Button
      size="sm"
      variant={followed ? "secondary" : "outline"}
      disabled={followToggle.isPending}
      className={`h-8 shrink-0 gap-1.5 rounded-xl px-3 text-xs ${
        followed ? "border-stone-300 bg-stone-100 text-stone-700" : ""
      }`}
      onClick={(e) => {
        e.preventDefault();
        followToggle.mutate(
          { businessId: bizId, supplierId, follow: !followed },
          {
            onSuccess: () =>
              toast(
                followed
                  ? { title: "از شبکه حذف شد" }
                  : { title: "فالو شد", description: `کاتالوگ ${supplierName} در «تامین من» شماست.` }
              ),
            onError: (err) => toast({ title: err.message || "خطا", variant: "destructive" }),
          }
        );
      }}
    >
      {followToggle.isPending ? (
        <Loader2 className="size-3 animate-spin" />
      ) : followed ? (
        <Check className="size-3" />
      ) : null}
      {followed ? "فالو شد" : "فالو"}
    </Button>
  );
}

/** فالو فقط برای عضوِ صاحب کسب‌وکار، نه خودش — بقیه سطر لینک است */
function canFollowRow(authed: boolean, bizId: string | null, selfId: string | null, ownerId: string): boolean {
  return authed && !!bizId && selfId !== ownerId;
}

// ─── سطر تامین‌کننده‌ی مرتبط — امتیاز تطبیق + قیمت + فالو ───

function SupplierMatchRow({
  s,
  authed,
  bizId,
  selfId,
  followedIds,
}: {
  s: SupplierSuggestionDto;
  authed: boolean;
  bizId: string | null;
  selfId: string | null;
  followedIds: Set<string>;
}) {
  const showFollow = canFollowRow(authed, bizId, selfId, s.supplierId);
  return (
    <article className="flex animate-fade-up items-center gap-3 rounded-2xl border bg-white p-4 shadow-sm transition hover:border-stone-300 hover:shadow-md">
      <Link href={`/sell/${s.supplierSlug}`} className="flex min-w-0 grow items-center gap-3">
        <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-lg font-black text-primary">
          {s.supplierName.slice(0, 1)}
        </span>
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 truncate font-extrabold">
            {s.supplierName}
            {s.supplierVerified && <BadgeCheck className="size-3.5 shrink-0 text-primary" aria-label="تاییدشده" />}
          </p>
          <p className="mt-0.5 flex items-center gap-1 truncate text-[11px] text-muted-foreground">
            <MapPin className="size-3 shrink-0" />
            {s.supplierCity} · {s.goodName}
          </p>
        </div>
        <div className="ms-auto shrink-0 text-end">
          <p className="text-base font-black text-primary">{fmtMoney(s.priceMinor, s.currency)}</p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            هر {s.unit} · حداقل {fa(s.minOrder)}
          </p>
        </div>
        {s.score > 0 && <MatchRing score={s.score} size={44} />}
      </Link>
      {/* تماس — حتی برای مهمان (گیت ویروسی عضویت) · خودمان را نمی‌بینیم */}
      {selfId !== s.supplierId && (
        <ContactButton
          slug={s.supplierSlug}
          bizName={s.supplierName}
          label="تماس"
          arm="sell"
          variant="outline"
          size="sm"
          className="h-8 shrink-0 gap-1.5 rounded-xl px-3 text-xs"
        />
      )}
      {showFollow && bizId && (
        <FollowSupplierButton bizId={bizId} supplierId={s.supplierId} supplierName={s.supplierName} followedIds={followedIds} />
      )}
    </article>
  );
}

// ─── سطر کالای فروشی — لیست تک‌ستونی + فالو ───

function SellRow({
  item: l,
  authed,
  bizId,
  selfId,
  followedIds,
}: {
  item: ExploreItemDto;
  authed: boolean;
  bizId: string | null;
  selfId: string | null;
  followedIds: Set<string>;
}) {
  const showFollow = canFollowRow(authed, bizId, selfId, l.business.id);
  return (
    <article className="flex animate-fade-up items-center gap-3 rounded-2xl border bg-white p-4 shadow-sm transition hover:border-stone-300 hover:shadow-md">
      <Link href={`/sell/${l.business.slug}`} className="flex min-w-0 grow items-center gap-3">
        <div className="grid size-12 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-accent/70 via-accent/30 to-transparent text-xl font-black text-primary/40">
          {goodName(l.good).slice(0, 1)}
        </div>
        <div className="min-w-0">
          <p className="truncate font-extrabold" title={goodName(l.good)}>
            {goodName(l.good)}
          </p>
          <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{categoryName(l.good.category)}</p>
          <p className="mt-1.5 flex items-center gap-1 truncate text-[11px] text-muted-foreground">
            <span className="grid size-4.5 shrink-0 place-items-center rounded bg-primary/10 text-[9px] font-black text-primary" aria-hidden>
              {l.business.name.slice(0, 1)}
            </span>
            <span className="font-bold text-foreground">{l.business.name}</span>
            {l.business.isVerified && <BadgeCheck className="size-3 shrink-0 text-primary" aria-label="تاییدشده" />}
            <MapPin className="size-3 shrink-0" />
            {l.business.city}
          </p>
        </div>
        <div className="ms-auto shrink-0 text-end">
          <p className="text-base font-black text-primary">{fmtMoney(l.priceMinor, l.currency)}</p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">هر {unitLabel(l.good.unit)}</p>
        </div>
      </Link>
      {/* تماس — حتی برای مهمان (گیت ویروسی عضویت) · خودمان را نمی‌بینیم */}
      {selfId !== l.business.id && (
        <ContactButton
          slug={l.business.slug}
          bizName={l.business.name}
          label="تماس"
          arm="sell"
          variant="outline"
          size="sm"
          className="h-8 shrink-0 gap-1.5 rounded-xl px-3 text-xs"
        />
      )}
      {showFollow && bizId && (
        <FollowSupplierButton bizId={bizId} supplierId={l.business.id} supplierName={l.business.name} followedIds={followedIds} />
      )}
    </article>
  );
}

// ─── CTA مهمان — بازار، بازار شما هم می‌تواند باشد ───

function GuestCta() {
  return (
    <section className="rounded-3xl border border-primary/25 bg-white p-6 text-center shadow-sm">
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
  );
}
