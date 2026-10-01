"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { BadgeCheck, ChevronLeft, Inbox, Loader2, MapPin, Sparkles } from "lucide-react";
import { useAuthStore } from "@/lib/auth-store";
import { setArmActive, useActiveBusiness } from "@/lib/active-biz";
import { AppFooter, AppHeader, MobileTabBar, SectionTitle } from "@/app/components/chrome";
import { fa, frequencyLabel, goodName, proximity, proximityLabel, timeAgo, unitLabel, CURRENCIES, currencyLabel, fmtMoney } from "@/lib/format";
import { useBuyRequests, useIncomingInquiries, useMarketState, useOfferBuyRequest, useMyListings } from "@/lib/queries";
import { NumberInput } from "@/components/number-input";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { ApiError, type InquiryDto, type MarketItemDto } from "@/lib/api";
import { useTabParam } from "@/app/components/url-tabs";

/*
 * درخواست‌های قیمت — دستیار فروش (فاز ۴ · طرح ۰۵)
 * دو حالت با تب داخلی:
 *   «به من»           → Inquiry های مستقیم (getInquiries)
 *   «فرصت‌های بازار»  → BUY لیستینگ‌های هم‌گود از موتور تطبیق (getBuyRequests)
 * پایین صفحه راهنمای تمایز (دقیقاً متن طرح ۰۵).
 */

// پالت آواتار — رنگ پایدار از روی نام خریدار (سیستم ۶رنگی طرح)
const AVATAR_COLORS = ["#7c3aed", "#0e7490", "#c2703a", "#16a34a", "#db2777", "#4f46e5"];
function avatarColor(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

/** «این ماه» به تقویم کاربر فارسی (fa-IR persian) — مثل خودش می‌شمارد */
const faMonthKey = new Intl.DateTimeFormat("fa-IR-u-ca-persian", { year: "numeric", month: "numeric" });
const monthKeyOf = (iso: string) => faMonthKey.format(new Date(iso));

// ─── بج وضعیت (طرح: b-new / b-answered) ───
function statusBadge(q: InquiryDto) {
  if (q.status === "ANSWERED") {
    return <span className="rounded-full bg-[#e9f7ee] px-[9px] py-[2.5px] text-[10.5px] font-bold text-[#16a34a]">پاسخ داده‌شده</span>;
  }
  return <span className="rounded-full bg-[#e8f1fd] px-[9px] py-[2.5px] text-[10.5px] font-bold text-[#1d5fb8]">جدید</span>;
}

// ─── سطر درخواست «به من» (طرح ۰۵: row-card) ───
function InquiryRow({ q, myCity, onOpen }: { q: InquiryDto; myCity: string; onOpen: () => void }) {
  const isNew = !q.isRead && q.status === "NEW";
  const answered = q.status === "ANSWERED";
  const unit = unitLabel(q.listing.good.unit);
  // چیپ نیاز — یادداشت کوتاه، یا تناوب خرید اگر یادداشت نبود
  const noteSnippet = q.note ? (q.note.length > 34 ? `${q.note.slice(0, 34)}…` : q.note) : q.frequency ? frequencyLabel(q.frequency) : null;
  return (
    <button
      onClick={onOpen}
      className={`flex w-full items-center gap-[11px] rounded-[12px] border px-3 py-2.5 text-start transition hover:shadow-sm ${
        isNew ? "border-[#f9c48f] bg-[#fffdf9]" : "border-stone-200 bg-white"
      } ${answered ? "opacity-75" : ""}`}
    >
      <span
        className="grid size-[30px] shrink-0 place-items-center rounded-full text-xs font-bold text-white"
        style={{ background: avatarColor(q.buyer.name) }}
      >
        {q.buyer.name.trim().charAt(0)}
      </span>
      <span className="min-w-0 grow">
        <span className="flex flex-wrap items-center gap-1.5 text-[13.5px] font-bold">
          {q.buyer.name}
          {statusBadge(q)}
        </span>
        <span className="mt-1 flex flex-wrap items-center gap-2 text-[11.5px] text-muted-foreground">
          <span className="flex items-center gap-[3px]">
            <MapPin className="size-[11px]" strokeWidth={1.75} />
            {q.buyer.city} · {proximityLabel(proximity(q.buyer.city, myCity))}
          </span>
          <span className="text-[10px]">{timeAgo(q.createdAt)}</span>
        </span>
        <span
          className={`mt-[7px] block rounded-[9px] px-2.5 py-[7px] text-[12.5px] leading-5 ${
            answered ? "bg-muted text-stone-600" : "bg-accent text-[#9a3d06]"
          }`}
        >
          <b>
            {goodName(q.listing.good)} · {fa(q.volume)} {unit}
          </b>
          {answered ? " — پیشنهاد شما ارسال شد" : noteSnippet ? <> — «{noteSnippet}»</> : null}
        </span>
      </span>
      <ChevronLeft className="size-4 shrink-0 text-stone-300" strokeWidth={1.75} />
    </button>
  );
}

// ─── سطر فرصت بازار (همان کالبد؛ چیپ = نیاز خریدار + تناوب) ───
function OpportunityRow({ item, myCity, offered, onOpen }: { item: MarketItemDto; myCity: string; offered: boolean; onOpen: () => void }) {
  const unit = unitLabel(item.good.unit);
  return (
    <button
      onClick={onOpen}
      className={`flex w-full items-center gap-[11px] rounded-[12px] border px-3 py-2.5 text-start transition hover:shadow-sm ${
        offered ? "border-[#b6dfc5] bg-[#f4fcf6] opacity-90" : "border-stone-200 bg-white"
      }`}
    >
      <span
        className="grid size-[30px] shrink-0 place-items-center rounded-full text-xs font-bold text-white"
        style={{ background: avatarColor(item.business.name) }}
      >
        {item.business.name.trim().charAt(0)}
      </span>
      <span className="min-w-0 grow">
        <span className="flex flex-wrap items-center gap-1.5 text-[13.5px] font-bold">
          {item.business.name}
          {item.business.isVerified && <BadgeCheck className="size-3.5 shrink-0 text-[#1d5fb8]" aria-label="تاییدشده" />}
          {offered && <span className="rounded-full bg-[#e9f7ee] px-[9px] py-[2.5px] text-[10.5px] font-bold text-[#16a34a]">پیشنهاد داده‌اید</span>}
        </span>
        <span className="mt-1 flex flex-wrap items-center gap-2 text-[11.5px] text-muted-foreground">
          <span className="flex items-center gap-[3px]">
            <MapPin className="size-[11px]" strokeWidth={1.75} />
            {item.business.city} · {proximityLabel(proximity(item.business.city, myCity))}
          </span>
          <span className="text-[10px]">{timeAgo(item.updatedAt)}</span>
        </span>
        <span className="mt-[7px] block rounded-[9px] bg-accent px-2.5 py-[7px] text-[12.5px] leading-5 text-[#9a3d06]">
          <b>
            {goodName(item.good)} · {fa(item.volume ?? 0)} {unit}
          </b>
          {item.frequency ? ` — ${frequencyLabel(item.frequency)}` : ""}
        </span>
      </span>
      <ChevronLeft className="size-4 shrink-0 text-stone-300" strokeWidth={1.75} />
    </button>
  );
}

export default function RequestsPage() {
  return (
    <Suspense fallback={<div className="grid min-h-[100dvh] place-items-center"><Loader2 className="size-6 animate-spin text-primary" /></div>}>
      <RequestsBody />
    </Suspense>
  );
}

function RequestsBody() {
  const router = useRouter();
  const { status } = useAuthStore();
  const biz = useActiveBusiness();

  useEffect(() => {
    document.title = "درخواست‌های قیمت | iMach";
    setArmActive("sell");
    if (status === "guest") router.replace("/start");
  }, [status, router]);

  if (status !== "authed" || !biz) {
    return (
      <div className="flex min-h-screen flex-col">
        <AppHeader />
        <main className="grow grid place-items-center py-32">
          <Loader2 className="size-6 animate-spin text-primary" />
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
        <div className="mx-auto max-w-2xl px-4 py-4 pb-24 sm:px-6 sm:pb-8">
          <RequestsTabs bizId={biz.id} myCity={biz.city} currency={biz.currency ?? "IRR"} mySlug={biz.slug} myName={biz.name} />
        </div>
      </main>
      <AppFooter />
      <MobileTabBar />
    </div>
  );
}

function RequestsTabs({ bizId, myCity, currency, mySlug, myName }: { bizId: string; myCity: string; currency: string; mySlug: string; myName: string }) {
  const router = useRouter();
  // تب با URL سینک: ?tab=mine | market
  const [tab, setTab] = useTabParam("mine", ["mine", "market"]);
  const inquiriesQ = useIncomingInquiries(bizId);
  const demandQ = useBuyRequests(bizId);
  const stateQ = useMarketState(bizId);
  const [offerFor, setOfferFor] = useState<MarketItemDto | null>(null);
  const offeredBuyerIds = useMemo(() => new Set(stateQ.data?.offeredBuyerIds ?? []), [stateQ.data]);

  const all = inquiriesQ.data?.items ?? [];
  const mine = all.filter((q) => q.status !== "ARCHIVED");
  const thisMonthKey = monthKeyOf(new Date().toISOString());
  const monthCount = all.filter((q) => monthKeyOf(q.createdAt) === thisMonthKey).length;
  const demand = demandQ.data ?? [];

  return (
    <>
      <SectionTitle
        icon={<Inbox className="size-[18px] text-primary" strokeWidth={1.75} />}
        title="درخواست‌های قیمت"
        action={
          monthCount > 0 ? (
            <span className="text-xs text-muted-foreground">{fa(monthCount)} درخواست این ماه</span>
          ) : undefined
        }
      />

      {/* ═══ تب داخلی (طرح ۰۵: inner-tabs) ═══ */}
      <div className="mb-3 flex gap-1 rounded-[11px] bg-[#f1efe9] p-1">
        <button
          type="button"
          onClick={() => setTab("mine")}
          aria-pressed={tab === "mine"}
          className={`flex h-[34px] flex-1 items-center justify-center rounded-[8px] border-0 text-[12.5px] font-bold transition ${
            tab === "mine" ? "bg-white text-foreground shadow-[0_1px_3px_rgba(42,39,35,0.12)]" : "bg-transparent text-muted-foreground"
          }`}
        >
          به من <span className="ms-1 text-[10.5px] font-normal opacity-75">({fa(mine.length)})</span>
        </button>
        <button
          type="button"
          onClick={() => setTab("market")}
          aria-pressed={tab === "market"}
          className={`flex h-[34px] flex-1 items-center justify-center rounded-[8px] border-0 text-[12.5px] font-bold transition ${
            tab === "market" ? "bg-white text-foreground shadow-[0_1px_3px_rgba(42,39,35,0.12)]" : "bg-transparent text-muted-foreground"
          }`}
        >
          فرصت‌های بازار <span className="ms-1 text-[10.5px] font-normal opacity-75">({fa(demand.length)})</span>
        </button>
      </div>

      {tab === "mine" ? (
        inquiriesQ.isLoading ? (
          <div className="grid place-items-center py-16">
            <Loader2 className="size-6 animate-spin text-primary" />
          </div>
        ) : mine.length === 0 ? (
          <div className="rounded-2xl border-[1.5px] border-dashed border-stone-300 bg-[#fdfcf9] px-4 py-6 text-center text-[12.5px] leading-9 text-muted-foreground">
            هنوز درخواست قیمتی نرسیده.
            <br />
            هر وقت مشتری‌ای از کاتالوگت قیمت بخواهد، همین‌جا با شهر و نیازش می‌بینیش.
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {mine.map((q) => (
              <InquiryRow key={q.id} q={q} myCity={myCity} onOpen={() => router.push(`/sell/requests/${q.id}`)} />
            ))}
          </div>
        )
      ) : demandQ.isLoading ? (
        <div className="grid place-items-center py-16">
          <Loader2 className="size-6 animate-spin text-primary" />
        </div>
      ) : demand.length === 0 ? (
        <div className="rounded-2xl border-[1.5px] border-dashed border-stone-300 bg-[#fdfcf9] px-4 py-6 text-center text-[12.5px] leading-9 text-muted-foreground">
          فعلاً فرصت بازار مرتبطی نیست.
          <br />
          کاتالوگ کامل‌تر، فرصت بیشتری می‌آورد.
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {demand.map((l) => (
            <OpportunityRow key={l.id} item={l} myCity={myCity} offered={offeredBuyerIds.has(l.business.id)} onOpen={() => setOfferFor(l)} />
          ))}
        </div>
      )}

      {/* ═══ راهنمای تمایز — متن دقیق طرح ۰۵ ═══ */}
      <div className="mt-3 flex gap-1.5 rounded-[12px] bg-muted px-3 py-[9px] text-[10.5px] leading-[1.9] text-muted-foreground">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="mt-1 size-[13px] shrink-0 text-primary">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 8v5M12 16.5v.01" />
        </svg>
        <p>
          «به من» = درخواست‌هایی که مستقیم برای کالاهای شما پیام شده.
          <br />
          «فرصت‌های بازار» = نیازی که iMach شبیه کاتالوگ شما دیده و می‌توانید پیشنهاد بدهید.
        </p>
      </div>

      {offerFor && (
        <OpportunityOfferDialog
          item={offerFor}
          bizId={bizId}
          currency={currency}
          mySlug={mySlug}
          myName={myName}
          onClose={() => setOfferFor(null)}
        />
      )}
    </>
  );
}

// ─── پیشنهاد به فرصت بازار — گیت دعوت را رعایت می‌کند (منطق بازار موجود) ───
function OpportunityOfferDialog({
  item,
  bizId,
  currency,
  mySlug,
  myName,
  onClose,
}: {
  item: MarketItemDto;
  bizId: string;
  currency: string;
  mySlug: string;
  myName: string;
  onClose: () => void;
}) {
  const { toast } = useToast();
  const stateQ = useMarketState(bizId);
  const listingsQ = useMyListings(bizId);
  const offerMut = useOfferBuyRequest();
  const state = stateQ.data;
  const unlocked = !!state?.referral.unlocked;

  const exp = (CURRENCIES[currency] ?? CURRENCIES.IRR).exp;
  // قیمت پایه از کاتالوگ من برای همین گود
  const myBase = (listingsQ.data ?? []).find(
    (l) => l.good.id === item.good.id && (l.mode === "SELL" || l.mode === "BOTH")
  )?.priceMinor;
  const [price, setPrice] = useState<number | null>(myBase != null ? myBase / 10 ** exp : null);
  const [note, setNote] = useState("");

  const submit = () => {
    if ((price ?? 0) <= 0) return;
    offerMut.mutate(
      {
        businessId: bizId,
        buyListingId: item.id,
        priceMinor: Math.round((price ?? 0) * 10 ** exp),
        note: note.trim() || undefined,
      },
      {
        onSuccess: () => {
          onClose();
          toast({ title: "پیشنهاد ارسال شد", description: `در پیشنهادهای دریافتی ${item.business.name} می‌افتد.` });
        },
        onError: (e) => toast({ title: e instanceof ApiError ? e.message : "ارسال ناموفق بود", variant: "destructive" }),
      }
    );
  };

  if (!unlocked) {
    // گیت رشد — همان قاعده‌ی بازار خریدارها: پیشنهاد آزاد، جای دعوت
    const count = state?.referral.count ?? 0;
    const required = state?.referral.required ?? 10;
    return (
      <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4" role="dialog" aria-modal="true">
        <div className="w-full max-w-sm rounded-2xl border bg-white p-5 shadow-lg">
          <p className="flex items-center gap-1.5 text-sm font-bold">
            <Sparkles className="size-4 text-primary" />
            برای ارسال پیشنهاد، حد نصاب دعوت را کامل کنید
          </p>
          <p className="mt-2 text-[11.5px] leading-6 text-muted-foreground">
            بهای پیشنهاد به خریدار آماده، دعوت از خریداران جدید است. لینک کاتالوگ «{myName}» را بفرستید — هر ثبت‌نام از لینک شما به
            شما منتسب می‌شود.
          </p>
          <div className="mt-3">
            <div className="flex items-center justify-between text-[10.5px] font-bold text-muted-foreground">
              <span>{fa(count)} از {fa(required)} دعوت</span>
              <span>{fa(Math.min(count, required))} از {fa(required)}</span>
            </div>
            <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${Math.min(100, (count / required) * 100)}%` }} />
            </div>
          </div>
          <p className="mt-2 text-[10.5px] leading-5 text-muted-foreground">
            کاتالوک را از دکمه‌ی اشتراک روی صفحه «کاتالوگ من» هم می‌توانید بفرستید: /sell/{mySlug}
          </p>
          <Button className="mt-3 w-full" variant="outline" onClick={onClose}>
            باشه، فهمیدم
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4" role="dialog" aria-modal="true">
      <div className="w-full max-w-sm rounded-2xl border bg-white p-5 shadow-lg">
        <p className="flex items-center gap-2 text-sm font-bold">
          پیشنهاد برای {item.business.name}
        </p>
        <p className="mt-1 text-[11.5px] leading-6 text-muted-foreground">
          {goodName(item.good)} · {fa(item.volume ?? 0)} {unitLabel(item.good.unit)}
          {item.frequency ? ` · ${frequencyLabel(item.frequency)}` : ""} — در پیشنهادهای دریافتی او می‌افتد و مستقیم دیده می‌شود.
        </p>
        <div className="mt-3 grid gap-2.5">
          <div className="grid gap-1.5">
            <label className="text-[11px] font-bold text-muted-foreground" htmlFor="opp-price">
              قیمت پیشنهادی هر {unitLabel(item.good.unit)}
            </label>
            <NumberInput
              id="opp-price"
              value={price}
              onChange={setPrice}
              min={0}
              suffix={currencyLabel(currency)}
              aria-label="قیمت پیشنهادی هر واحد"
            />
            {myBase != null && price != null && price * 10 ** exp !== myBase && (
              <p className="text-[10.5px] text-muted-foreground">
                قیمت کاتالوگ شما: {fmtMoney(myBase, currency)}
              </p>
            )}
          </div>
          <div className="grid gap-1.5">
            <label className="text-[11px] font-bold text-muted-foreground" htmlFor="opp-note">
              توضیح <span className="font-normal">— اختیاری</span>
            </label>
            <Input
              id="opp-note"
              value={note}
              maxLength={300}
              onChange={(e) => setNote(e.target.value)}
              placeholder="شرایط ارسال، تخفیف، زمان تحویل…"
              aria-label="توضیح پیشنهاد"
            />
          </div>
        </div>
        <div className="mt-4 flex items-center gap-2">
          <Button className="flex-1" disabled={offerMut.isPending || (price ?? 0) <= 0} onClick={submit}>
            {offerMut.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
            ارسال پیشنهاد
          </Button>
          <Button variant="outline" onClick={onClose}>
            بی‌خیال
          </Button>
        </div>
      </div>
    </div>
  );
}
