"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, BadgeCheck, Check, Loader2, MapPin, Phone, Tag } from "lucide-react";
import { useAuthStore } from "@/lib/auth-store";
import { useActiveBusiness } from "@/lib/active-biz";
import { CURRENCIES, currencyLabel, fa, frequencyLabel, fmtMoney, goodName, proximity, proximityLabel, timeAgo, unitLabel } from "@/lib/format";
import { useArchiveInquiry, useIncomingInquiries, useMarkInquiryRead, useSendOffer } from "@/lib/queries";
import { NumberInput } from "@/components/number-input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { ApiError } from "@/lib/api";

/*
 * جزئیات درخواست قیمت + فرم پاسخ — فاز ۴ (طرح ۰۶).
 * جریان متمرکز مثل طرح: ساب‌هدر بازگشت + کارت خریدار + کارت درخواست +
 * کارت «مطابق کاتالوگ شما» + فرم پاسخ + نوار اکشن چسبان.
 * بدون هدر/تب‌بار — کاربر در جریان پاسخ است (همان الگوی /new).
 */

// پالت آواتار — همان سیستم ۶رنگی
const AVATAR_COLORS = ["#7c3aed", "#0e7490", "#c2703a", "#16a34a", "#db2777", "#4f46e5"];
function avatarColor(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

export function RequestDetail({ inquiryId }: { inquiryId: string }) {
  const router = useRouter();
  const { status } = useAuthStore();
  const biz = useActiveBusiness();

  useEffect(() => {
    document.title = "درخواست قیمت | iMach";
    if (status === "guest") router.replace("/start");
  }, [status, router]);

  if (status !== "authed" || !biz) {
    return <div className="grid min-h-[100dvh] place-items-center"><Loader2 className="size-6 animate-spin text-primary" /></div>;
  }

  return <DetailBody inquiryId={inquiryId} bizId={biz.id} currency={biz.currency ?? "IRR"} myCity={biz.city} />;
}

function DetailBody({ inquiryId, bizId, currency, myCity }: { inquiryId: string; bizId: string; currency: string; myCity: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const inquiriesQ = useIncomingInquiries(bizId);
  const markRead = useMarkInquiryRead();
  const archive = useArchiveInquiry();
  const sendOffer = useSendOffer();

  const q = useMemo(
    () => (inquiriesQ.data?.items ?? []).find((x) => x.id === inquiryId) ?? null,
    [inquiriesQ.data, inquiryId]
  );

  // درخواست خوانده‌نشده → همان لحظه خوانده شود (شمارش صندوق تازه می‌شود)
  useEffect(() => {
    if (q && !q.isRead) markRead.mutate(q.id);
  }, [q, markRead]);

  const exp = (CURRENCIES[currency] ?? CURRENCIES.IRR).exp;
  const unit = q ? unitLabel(q.listing.good.unit) : "";
  const baseMinor = q?.listing.priceMinor ?? null;
  const baseMajor = baseMinor != null ? baseMinor / 10 ** exp : null;

  const [price, setPrice] = useState<number | null>(null);
  const [note, setNote] = useState("");
  const [priceTouched, setPriceTouched] = useState(false);
  // قیمت مؤثر: تا وقتی کاربر دست نزده، پایه‌ی کاتالوگ (بدون افکت — همان رندر)
  const effectivePrice = priceTouched ? price : baseMajor;

  if (inquiriesQ.isLoading) {
    return (
      <div className="min-h-[100dvh] bg-background">
        <div className="grid place-items-center py-32">
          <Loader2 className="size-6 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!q) {
    return (
      <div className="min-h-[100dvh] bg-background">
        <header className="sticky top-0 z-20 flex h-[54px] items-center gap-2.5 border-b bg-white/92 px-3 backdrop-blur">
          <button
            type="button"
            aria-label="بازگشت"
            onClick={() => router.push("/sell/requests")}
            className="grid size-8.5 shrink-0 place-items-center rounded-[10px] text-stone-500 transition hover:bg-accent hover:text-foreground"
          >
            <ArrowLeft className="size-5 rtl:rotate-180" />
          </button>
          <p className="text-[15px] font-bold leading-tight">درخواست قیمت</p>
        </header>
        <main className="mx-auto max-w-2xl px-4 py-8">
          <p className="rounded-2xl border border-dashed bg-white/70 p-8 text-center text-sm leading-7 text-muted-foreground">
            این درخواست پیدا نشد — ممکن است بایگانی یا حذف شده باشد.
          </p>
        </main>
      </div>
    );
  }

  const answered = q.status === "ANSWERED";
  const archived = q.status === "ARCHIVED";
  const buyerSub = [q.buyer.trade, q.buyer.city, proximityLabel(proximity(q.buyer.city, myCity))].filter(Boolean).join(" · ");

  const doSend = () => {
    if ((effectivePrice ?? 0) <= 0) {
      toast({ title: "قیمت پیشنهادی را بنویسید", variant: "destructive" });
      return;
    }
    sendOffer.mutate(
      { inquiryId: q.id, priceMinor: Math.round((effectivePrice ?? 0) * 10 ** exp), note: note.trim() || undefined },
      {
        onSuccess: () =>
          toast({
            title: "پیشنهاد ارسال شد",
            description: `پیشنهاد شما برای ${q.buyer.name} در دستیار خریدِ او نمایش داده می‌شود.`,
          }),
        onError: (e) =>
          toast({ title: "ارسال ناموفق بود", description: e instanceof ApiError ? e.message : "دوباره تلاش کنید", variant: "destructive" }),
      }
    );
  };

  const doArchive = () => {
    archive.mutate(q.id, {
      onSuccess: () => {
        toast({ title: "بایگانی شد", description: "از صندوق درخواست‌ها بیرون رفت." });
        router.push("/sell/requests");
      },
      onError: () => toast({ title: "بایگانی ناموفق بود", variant: "destructive" }),
    });
  };

  return (
    <div className="min-h-[100dvh] bg-background">
      {/* ═══ ساب‌هدر (طرح ۰۶): بازگشت + عنوان + بج وضعیت ═══ */}
      <header className="sticky top-0 z-20 flex h-[54px] items-center gap-2.5 border-b bg-white/92 px-3 backdrop-blur">
        <button
          type="button"
          aria-label="بازگشت به درخواست‌ها"
          onClick={() => router.push("/sell/requests")}
          className="grid size-8.5 shrink-0 place-items-center rounded-[10px] text-stone-500 transition hover:bg-accent hover:text-foreground"
        >
          <ArrowLeft className="size-5 rtl:rotate-180" />
        </button>
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-bold leading-tight">درخواست قیمت</p>
          <p className="truncate text-[10.5px] font-normal leading-tight text-muted-foreground">
            دریافته {timeAgo(q.createdAt)} · {q.buyer.city}
          </p>
        </div>
        {archived ? (
          <span className="shrink-0 rounded-full bg-muted px-[9px] py-[2.5px] text-[10.5px] font-bold text-muted-foreground">آرشیو</span>
        ) : answered ? (
          <span className="shrink-0 rounded-full bg-[#e9f7ee] px-[9px] py-[2.5px] text-[10.5px] font-bold text-[#16a34a]">پاسخ داده‌شده</span>
        ) : (
          <span className="shrink-0 rounded-full bg-[#e8f1fd] px-[9px] py-[2.5px] text-[10.5px] font-bold text-[#1d5fb8]">جدید</span>
        )}
      </header>

      {/* ═══ بدنه ═══ */}
      <main className="mx-auto w-full max-w-2xl px-4 py-4 pb-28 sm:px-6">
        {/* خریدار */}
        <div className="card flex items-center gap-[11px] rounded-2xl border bg-white p-3 shadow-sm">
          <span
            className="grid size-[38px] shrink-0 place-items-center rounded-full text-sm font-bold text-white"
            style={{ background: avatarColor(q.buyer.name) }}
          >
            {q.buyer.name.trim().charAt(0)}
          </span>
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-[5px] text-sm font-bold">
              <span className="truncate">{q.buyer.name}</span>
              {q.buyer.isVerified && <BadgeCheck className="size-3.5 shrink-0 text-[#1d5fb8]" aria-label="تاییدشده" />}
            </p>
            <p className="mt-[3px] flex items-center gap-[5px] text-[11px] text-muted-foreground">
              <MapPin className="size-[11px] shrink-0" strokeWidth={1.75} />
              <span className="truncate">{buyerSub}</span>
            </p>
          </div>
          {q.buyer.phone ? (
            <a
              href={`tel:${q.buyer.phone.replace(/[\s-]/g, "")}`}
              aria-label={`تماس با ${q.buyer.name}`}
              className="grid size-[38px] shrink-0 place-items-center rounded-xl border bg-white text-stone-500 transition hover:bg-accent hover:text-primary"
            >
              <Phone className="size-4.5" strokeWidth={1.8} />
            </a>
          ) : null}
        </div>

        {/* متن درخواست */}
        <div className="mt-2.5 rounded-2xl border bg-white p-3 shadow-sm">
          <p className="mb-2 text-[12.5px] font-bold">درخواست خریدار</p>
          <div className="flex flex-col gap-1.5 text-[13px]">
            <div className="flex justify-between gap-3">
              <span className="text-muted-foreground">کالا</span>
              <b className="text-end">
                {goodName(q.listing.good)}
                {q.listing.variantLabel ? <span className="font-normal text-muted-foreground"> — {q.listing.variantLabel}</span> : null}
              </b>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-muted-foreground">مقدار</span>
              <b>
                {fa(q.volume)} {unit}
              </b>
            </div>
            {q.frequency ? (
              <div className="flex justify-between gap-3">
                <span className="text-muted-foreground">دوره خرید</span>
                <b>{frequencyLabel(q.frequency)}</b>
              </div>
            ) : null}
            {q.delivery ? (
              <div className="flex justify-between gap-3">
                <span className="text-muted-foreground">زمان تحویل</span>
                <b>{q.delivery}</b>
              </div>
            ) : null}
          </div>
          {q.note ? (
            <p className="mt-2.5 rounded-[9px] bg-muted px-[11px] py-[9px] text-xs leading-[1.9] text-stone-600">«{q.note}»</p>
          ) : null}
        </div>

        {/* مطابق کاتالوگ شما — قیمت پایه */}
        {baseMinor != null ? (
          <div className="mt-2.5 rounded-2xl border border-[#f9c48f] bg-[#fffdf9] p-3 shadow-sm">
            <p className="flex items-center gap-2 text-[12.5px] font-bold">
              <Tag className="size-4 text-primary" strokeWidth={1.8} />
              مطابق کاتالوگ شما
            </p>
            <div className="mt-2.5 flex items-center justify-between text-[13px]">
              <span className="min-w-0 truncate">
                {goodName(q.listing.good)}
                {q.listing.variantLabel ? ` — ${q.listing.variantLabel}` : ""}
              </span>
              <b className="shrink-0">{fmtMoney(baseMinor, q.listing.currency)}</b>
            </div>
            <p className="mt-1 text-[10.5px] text-muted-foreground">قیمت پایه از کاتالوگ شما — قابل ویرایش در پاسخ</p>
          </div>
        ) : null}

        {/* پاسخ */}
        {archived ? (
          <div className="mt-3 rounded-2xl border bg-muted/60 p-4 text-center text-[12.5px] leading-7 text-muted-foreground">
            این درخواست بایگانی شده — از صندوق درخواست‌های شما بیرون است.
          </div>
        ) : answered ? (
          <div className="mt-3 flex items-center gap-2 rounded-2xl border border-[#b6dfc5] bg-[#f4fcf6] p-3.5 text-xs font-bold text-[#16a34a]">
            <Check className="size-4 shrink-0" strokeWidth={2.4} />
            پیشنهاد شما ارسال شد — منتظر پاسخ خریدار بمانید
          </div>
        ) : (
          <>
            <div className="mb-3 mt-5 flex items-end justify-between">
              <h2 className="text-[15px] font-bold">پاسخ شما</h2>
            </div>
            <div className="mb-3.5">
              <label className="mb-1.5 block text-[12.5px] font-bold" htmlFor="reply-price">
                قیمت پیشنهادی هر {unit}
              </label>
              <NumberInput
                id="reply-price"
                value={effectivePrice}
                onChange={(v) => {
                  setPrice(v);
                  setPriceTouched(true);
                }}
                min={0}
                suffix={currencyLabel(currency)}
                aria-label={`قیمت پیشنهادی هر ${unit}`}
              />
              {baseMajor != null && effectivePrice != null && effectivePrice > 0 && effectivePrice < baseMajor ? (
                <p className="mt-1.5 text-[10.5px] leading-[1.8] text-muted-foreground">
                  برای این خریدار کمی زیر قیمت کاتالوگ گذاشتید.
                </p>
              ) : null}
            </div>
            <div>
              <label className="mb-1.5 block text-[12.5px] font-bold" htmlFor="reply-note">
                توضیح کوتاه <span className="font-normal text-[10.5px] text-muted-foreground">— اختیاری</span>
              </label>
              <textarea
                id="reply-note"
                value={note}
                maxLength={300}
                onChange={(e) => setNote(e.target.value)}
                placeholder="مثلاً: شرایط ارسال، تخفیف خرید ماهانه، زمان تحویل…"
                className="h-[64px] w-full resize-none rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-[12.5px] leading-[1.9] outline-none transition placeholder:text-stone-400 focus:border-primary"
              />
            </div>
          </>
        )}
      </main>

      {/* ═══ نوار اکشن چسبان (طرح ۰۶: action-bar) ═══ */}
      {!archived ? (
        <div
          className="fixed inset-x-0 bottom-0 z-30 border-t bg-white/97 backdrop-blur"
          style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
        >
          <div className="mx-auto flex max-w-2xl items-center gap-2.5 px-4 py-2.5 sm:px-6">
            {!answered ? (
              <>
                <Button
                  className="flex-[1.4]"
                  size="lg"
                  onClick={doSend}
                  disabled={sendOffer.isPending || (effectivePrice ?? 0) <= 0}
                >
                  {sendOffer.isPending ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" strokeWidth={2.4} />}
                  ارسال پیشنهاد
                </Button>
                <Button variant="outline" size="lg" className="flex-1" onClick={doArchive} disabled={archive.isPending}>
                  {archive.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
                  بایگانی
                </Button>
              </>
            ) : (
              <Button variant="outline" size="lg" className="flex-1" onClick={doArchive} disabled={archive.isPending}>
                {archive.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
                بایگانی
              </Button>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
