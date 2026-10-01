"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/auth-store";
import { setArmActive, useActiveBusiness } from "@/lib/active-biz";
import { fa, fmtMoney, frequencyLabel, goodName, unitLabel } from "@/lib/format";
import { useQuoteRequest, useSupplyBoard } from "@/lib/queries";
import { NumberInput } from "@/components/number-input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { ApiError, type BoardSupplierDto } from "@/lib/api";
import { ArrowLeft, BadgeCheck, Info, Loader2, MapPin, Send, Sparkles } from "lucide-react";

/*
 * فرم درخواست قیمت (فاز ۶ · طرح ۱۲ · شکاف ۴)
 *   • شرایط درخواست: مقدار (پیش‌فرض حجمِ BUY listing من) + زمان تحویل (فوری/این ماه) + توضیح اختیاری
 *   • گیرندگان: چک‌باکس از ردیف‌های تابلو (پیش‌انتخاب با ?pre= از دکمه‌ی کارت)
 *   • toggle «تأمین‌کنندگان جدید iMach» — بقیه ظرفیت با موتور تطبیق (حداکثر ۵ در کل)
 *   • ارسال → POST /market/requestQuote → پاسخ‌ها در «درخواست‌های من» می‌نشینند
 * متن legend دقیقاً از طرح ۱۲ — تمایز «درخواست مقطعی» از «تابلوی رصد دائمی».
 */

// پالت آواتار — همان سیستم ۶رنگی
const AVATAR_COLORS = ["#7c3aed", "#0e7490", "#c2703a", "#16a34a", "#db2777", "#4f46e5"];
function avatarColor(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

const DELIVERIES = ["فوری", "این ماه"] as const;

export function QuoteForm({ goodId, pre }: { goodId: string; pre: string | null }) {
  const router = useRouter();
  const { status } = useAuthStore();
  const active = useActiveBusiness();

  useEffect(() => {
    document.title = "درخواست قیمت | iMach";
    setArmActive("buy");
  }, []);

  useEffect(() => {
    if (status === "guest") router.replace("/start");
  }, [status, router]);

  const boardQ = useSupplyBoard(active?.id ?? null, goodId);
  const board = boardQ.data;
  const quote = useQuoteRequest();
  const { toast } = useToast();

  // ── شرایط درخواست — پیش‌فرض از BUY listing خودم (طرح ۱۲: «۲۰ کیسه» + «ماهانه») ──
  // الگوی derived-state: override فقط وقتی کاربر دست بزند؛ تا آن‌موقع پیش‌فرضِ سرور
  const [volumeOverride, setVolumeOverride] = useState<number | null | undefined>(undefined);
  const volume = volumeOverride === undefined ? (board?.volume ?? 1) : volumeOverride;
  const [delivery, setDelivery] = useState<string>("این ماه");
  const [note, setNote] = useState("");

  const rows = useMemo(() => [...(board?.rows ?? [])].sort((a, b) => a.priceMinor - b.priceMinor), [board?.rows]);

  // ── گیرندگان — پیش‌انتخاب: ?pre= از کارت، وگرنه ارزان‌ترین (طرح ۱۲) ──
  // (همان الگو: تا کارک TICK نزده، انتخابِ پیش‌فرض هر رندر مشتق می‌شود)
  const [selectionOverride, setSelectionOverride] = useState<Set<string> | undefined>(undefined);
  const selected: Set<string> =
    selectionOverride === undefined
      ? rows.length > 0
        ? new Set([((pre ? rows.find((r) => r.seller.id === pre) : null) ?? rows[0]).seller.id])
        : new Set<string>()
      : selectionOverride;

  const [includeNetwork, setIncludeNetwork] = useState(true);

  if (status !== "authed" || !active || boardQ.isLoading) {
    return (
      <div className="grid min-h-[100dvh] place-items-center bg-background">
        <Loader2 className="size-6 animate-spin text-stone-700" />
      </div>
    );
  }

  const goodTitle = board?.good ? goodName(board.good) : "کالا";
  const unit = board?.good ? unitLabel(board.good.unit) : "";
  const glyph = board?.variantLabel ?? unit;
  const canSend = (volume ?? 0) >= 1 && (selected.size > 0 || includeNetwork);
  const sendLabel =
    selected.size > 0
      ? `ارسال به ${fa(selected.size)} فروشنده${includeNetwork ? " + شبکه iMach" : ""}`
      : "ارسال به شبکه iMach";

  const toggle = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectionOverride(next);
  };

  const send = () => {
    if (!active || !volume || !canSend || quote.isPending) return;
    quote.mutate(
      {
        businessId: active.id,
        goodId,
        volume,
        frequency:
          board?.frequency === "WEEKLY" || board?.frequency === "MONTHLY" || board?.frequency === "OCCASIONAL"
            ? board.frequency
            : undefined,
        delivery,
        note: note.trim() || undefined,
        supplierIds: selected.size > 0 ? [...selected] : undefined,
        includeNetwork,
      },
      {
        onSuccess: (res) => {
          toast({
            title: `درخواست به ${fa(res.created)} فروشنده رفت`,
            description: "پاسخ‌ها در «درخواست‌های من» می‌نشینند.",
          });
          router.replace("/buy/requests");
        },
        onError: (e) =>
          toast({
            title: e instanceof ApiError ? e.message : "ارسال ناموفق بود",
            variant: "destructive",
          }),
      }
    );
  };

  return (
    <div className="flex min-h-[100dvh] flex-col bg-background">
      {/* ═══ ساب‌هدر: بازگشت به تابلو (طرح ۱۲) ═══ */}
      <header className="sticky top-0 z-20 flex h-[54px] items-center gap-2.5 border-b bg-white/92 px-3 backdrop-blur">
        <button
          type="button"
          aria-label="بازگشت به تابلوی تأمین"
          onClick={() => router.push(`/buy/board/${goodId}`)}
          className="grid size-8.5 shrink-0 place-items-center rounded-[10px] text-stone-500 transition hover:bg-accent hover:text-foreground"
        >
          <ArrowLeft className="size-5 rtl:rotate-180" />
        </button>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-bold leading-tight">درخواست قیمت</p>
          <p className="truncate text-[10.5px] font-normal leading-tight text-muted-foreground">
            {goodTitle} — از تابلوی تأمین
          </p>
        </div>
      </header>

      <main className="mx-auto w-full max-w-2xl grow px-4 py-4 sm:px-6">
        {boardQ.isError || rows.length === 0 ? (
          <p className="rounded-2xl border border-dashed bg-white/70 p-8 text-center text-sm text-muted-foreground">
            تأمین‌کننده‌ای برای این کالا نیست — اول تابلوی تأمین را ببینید.
          </p>
        ) : (
          <>
            {/* ═══ چه کالایی (طرح ۱۲) ═══ */}
            <div className="flex items-center gap-2.5 rounded-2xl border border-stone-200 bg-white p-3 shadow-sm">
              <span className="grid size-11 shrink-0 place-items-center overflow-hidden rounded-[8px] bg-gradient-to-br from-[#f3f1ea] to-[#e9e5db] p-1 text-center">
                <span className="line-clamp-3 text-[9px] font-bold leading-tight text-stone-400">{glyph}</span>
              </span>
              <div className="min-w-0 grow">
                <p className="truncate text-[14px] font-bold text-stone-800">{goodTitle}</p>
                <p className="mt-0.5 truncate text-[10.5px] text-muted-foreground">
                  {board?.variantLabel ?? unit}
                  {board?.watched || board?.volume != null ? " · در لیست خرید شما" : ""}
                </p>
              </div>
              {board?.frequency && (
                <span className="shrink-0 rounded-full bg-stone-100 px-2.5 py-1 text-[10.5px] font-bold text-stone-600">
                  {frequencyLabel(board.frequency)}
                </span>
              )}
            </div>

            {/* ═══ شرایط درخواست (طرح ۱۲) ═══ */}
            <h2 className="mb-2 mt-4 flex items-center gap-1.5 text-[13px] font-bold text-stone-800">
              <span className="h-4 w-1 rounded-full bg-stone-300" />
              شرایط درخواست
            </h2>
            <div className="flex gap-2.5">
              <label className="flex-1">
                <span className="mb-1 block text-[11px] font-bold text-muted-foreground">مقدار</span>
                <NumberInput
                  value={volume}
                  onChange={(v) => setVolumeOverride(v)}
                  min={1}
                  max={1e9}
                  suffix={<span className="text-[11px] text-muted-foreground">{unit}</span>}
                  className="h-11 rounded-xl border-stone-300 bg-white text-[13px] font-bold"
                />
              </label>
              <div className="flex-1">
                <span className="mb-1 block text-[11px] font-bold text-muted-foreground">زمان تحویل</span>
                <div className="flex h-11 gap-1.5">
                  {DELIVERIES.map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setDelivery(d)}
                      className={`flex-1 rounded-xl border text-[12px] font-bold transition ${
                        delivery === d
                          ? "border-stone-800 bg-stone-800 text-white"
                          : "border-stone-300 bg-white text-stone-600 hover:border-stone-400"
                      }`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <label className="mt-2.5 block">
              <span className="mb-1 block text-[11px] font-bold text-muted-foreground">
                توضیح برای فروشنده <span className="font-normal text-stone-400">— اختیاری</span>
              </span>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                maxLength={300}
                placeholder="مثلاً: تحویل قزوین، لطفاً قیمت و شرایط ارسال را بفرمایید."
                className="w-full resize-none rounded-xl border border-stone-300 bg-white px-3.5 py-2.5 text-[12.5px] leading-7 outline-none transition placeholder:text-stone-400 focus:border-stone-500"
              />
            </label>

            {/* ═══ ارسال به چه کسانی؟ (طرح ۱۲: چک‌باکس از تابلو) ═══ */}
            <h2 className="mb-2 mt-4 flex items-center gap-1.5 text-[13px] font-bold text-stone-800">
              <span className="h-4 w-1 rounded-full bg-stone-300" />
              ارسال به چه کسانی؟
            </h2>
            <div className="flex flex-col gap-2">
              {rows.map((r) => (
                <CheckRow key={r.listingId} row={r} checked={selected.has(r.seller.id)} onToggle={() => toggle(r.seller.id)} />
              ))}
            </div>

            {/* ═══ گسترش به شبکه iMach (طرح ۱۲: toggle) ═══ */}
            <button
              type="button"
              role="switch"
              aria-checked={includeNetwork}
              onClick={() => setIncludeNetwork((v) => !v)}
              className="mt-2.5 flex w-full items-center gap-2.5 rounded-2xl border border-stone-200 bg-[#fdfcf9] p-3 text-start transition hover:border-stone-300"
            >
              <span className="grid size-[38px] shrink-0 place-items-center rounded-[11px] bg-stone-100 text-stone-600">
                <Sparkles className="size-[19px]" strokeWidth={1.75} />
              </span>
              <span className="min-w-0 grow">
                <span className="block text-[12.5px] font-bold text-stone-800">تأمین‌کنندگان جدید iMach هم ببینند</span>
                <span className="mt-0.5 block text-[10.5px] leading-[1.8] text-muted-foreground">
                  درخواست به فروشنده‌های منطبقِ دیگر هم می‌رسد (حداکثر ۵ نفر)
                </span>
              </span>
              <span
                className={`relative h-[22px] w-[40px] shrink-0 rounded-full transition ${
                  includeNetwork ? "bg-stone-800" : "bg-stone-300"
                }`}
              >
                <span
                  className={`absolute top-[3px] size-4 rounded-full bg-white shadow transition-all ${
                    includeNetwork ? "right-[3px]" : "right-[21px]"
                  }`}
                />
              </span>
            </button>

            {/* ═══ تمایز از تابلو — متن دقیق طرح ۱۲ ═══ */}
            <div className="mt-4 flex items-start gap-1.5 rounded-xl bg-stone-100/80 px-3 py-2.5 text-[10.5px] leading-[1.9] text-muted-foreground">
              <Info className="mt-[3px] size-[13px] shrink-0 text-stone-500" strokeWidth={1.8} />
              <p>
                این یک درخواست مشخص و مقطعی است — با «تابلوی تأمین» که رصد دائمی قیمت‌هاست فرق دارد.
                پاسخ‌ها در «درخواست‌های من» می‌نشینند.
              </p>
            </div>
          </>
        )}
      </main>

      {/* ═══ اکشن اصلی (طرح ۱۲) ═══ */}
      <div className="sticky bottom-0 z-10 border-t bg-white/97 p-3 backdrop-blur">
        <div className="mx-auto w-full max-w-2xl">
          <Button
            size="lg"
            className="w-full gap-1.5 bg-stone-800 hover:bg-stone-900"
            disabled={!canSend || quote.isPending}
            onClick={send}
          >
            {quote.isPending ? (
              <Loader2 className="size-4.5 animate-spin" />
            ) : (
              <Send className="size-4.5 rtl:-scale-x-100" strokeWidth={1.8} />
            )}
            {sendLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── ردیف گیرنده (طرح ۱۲: checkrow) ───
function CheckRow({
  row,
  checked,
  onToggle,
}: {
  row: BoardSupplierDto;
  checked: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      onClick={onToggle}
      className={`flex w-full items-center gap-2.5 rounded-2xl border px-3 py-2.5 text-start transition ${
        checked ? "border-stone-400 bg-white shadow-sm" : "border-stone-200 bg-white/70 hover:border-stone-300"
      }`}
    >
      <span
        className="grid size-9 shrink-0 place-items-center rounded-xl text-sm font-bold text-white"
        style={{ background: avatarColor(row.seller.name) }}
      >
        {row.seller.name.replace("پخش ", "").slice(0, 1)}
      </span>
      <span className="min-w-0 grow">
        <span className="flex items-center gap-1.5 text-[13px] font-bold text-stone-800">
          <span className="truncate">{row.seller.name}</span>
          {row.seller.isVerified && <BadgeCheck className="size-3 shrink-0 text-[#1d5fb8]" aria-label="تاییدشده" />}
        </span>
        <span className="mt-0.5 flex items-center gap-1 text-[10.5px] text-muted-foreground">
          <MapPin className="size-[11px]" strokeWidth={1.75} />
          {row.seller.city || "—"} · آخرین قیمت {fmtMoney(row.priceMinor, row.currency)}
        </span>
      </span>
      <span
        className={`grid size-[22px] shrink-0 place-items-center rounded-[7px] border-2 transition ${
          checked ? "border-stone-800 bg-stone-800 text-white" : "border-stone-300 bg-white"
        }`}
        aria-hidden
      >
        {checked && (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="size-3.5">
            <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </span>
    </button>
  );
}
