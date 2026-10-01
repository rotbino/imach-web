"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/lib/auth-store";
import { setArmActive, useActiveBusiness } from "@/lib/active-biz";
import { fa, fmtMoney, goodName, proximity, unitLabel } from "@/lib/format";
import { useFollowToggle, useSupplyBoard, useUnwatchGood, useWatchGood } from "@/lib/queries";
import type { BoardSupplierDto } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  BadgeCheck,
  Bookmark,
  BookmarkCheck,
  Check,
  ChevronLeft,
  Info,
  Loader2,
  MapPin,
  Package,
  Plus,
  Store,
} from "lucide-react";

/*
 * تابلوی تأمین یک کالا (فاز ۶ · طرح ۰۹ · شکاف ۵)
 * جریان متمرکز مثل «درخواست‌های من» (فاز ۵): ساب‌هدر بازگشت، بدون هدر/تب‌بار.
 *   • چیپ‌های مرتب‌سازی: ارزان‌ترین / تازه‌ترین / آشنا (خریده‌ام) / نزدیک‌ترین
 *   • کارت هر تأمین‌کننده: قیمت + روند + شرایط + برچسب رابطه (از او خریده‌ام / دنبال می‌کنم)
 *   • کارتِ ارزان‌ترین حالت .best (قاب سبز) — طرح ۰۹
 *   • «معرفی iMach» فقط ساختار UI (فلگ sponsored فعلاً خالی) + legend شفافیت
 * اکشن‌های هر کارت: درخواست قیمت (فرم با پیش‌انتخاب) · کاتالوک · دنبال‌کردن.
 */

// پالت آواتار — همان سیستم ۶رنگی فاز ۴/۵
const AVATAR_COLORS = ["#7c3aed", "#0e7490", "#c2703a", "#16a34a", "#db2777", "#4f46e5"];
function avatarColor(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

type SortKey = "CHEAPEST" | "FRESHEST" | "FAMILIAR" | "NEAREST";

const SORTS: { key: SortKey; label: string }[] = [
  { key: "CHEAPEST", label: "ارزان‌ترین" },
  { key: "FRESHEST", label: "تازه‌ترین" },
  { key: "FAMILIAR", label: "آشنا (خریده‌ام)" },
  { key: "NEAREST", label: "نزدیک‌ترین" },
];

export function SupplyBoardPage({ goodId }: { goodId: string }) {
  const router = useRouter();
  const { status } = useAuthStore();
  const active = useActiveBusiness();

  useEffect(() => {
    document.title = "تابلوی تأمین | iMach";
    setArmActive("buy");
  }, []);

  useEffect(() => {
    if (status === "guest") router.replace("/start");
  }, [status, router]);

  const boardQ = useSupplyBoard(active?.id ?? null, goodId);
  const board = boardQ.data;

  const [sort, setSort] = useState<SortKey>("CHEAPEST");

  const rows = useMemo(() => {
    const list = [...(board?.rows ?? [])];
    const myCity = active?.city ?? "";
    const nearRank = (r: BoardSupplierDto) => {
      const p = proximity(myCity, r.seller.city ?? "");
      return p === "same" ? 0 : p === "near" ? 1 : 2;
    };
    switch (sort) {
      case "FRESHEST":
        return list.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
      case "FAMILIAR":
        return list.sort(
          (a, b) =>
            Number(b.boughtFrom || b.followedByMe) - Number(a.boughtFrom || a.followedByMe) ||
            a.priceMinor - b.priceMinor
        );
      case "NEAREST":
        return list.sort((a, b) => nearRank(a) - nearRank(b) || a.priceMinor - b.priceMinor);
      default:
        return list.sort((a, b) => a.priceMinor - b.priceMinor);
    }
  }, [board?.rows, sort, active?.city]);

  if (status !== "authed" || !active || boardQ.isLoading) {
    return (
      <div className="grid min-h-[100dvh] place-items-center bg-background">
        <Loader2 className="size-6 animate-spin text-stone-700" />
      </div>
    );
  }

  const goodTitle = board?.good ? goodName(board.good) : "تابلوی تأمین";

  return (
    <div className="flex min-h-[100dvh] flex-col bg-background">
      {/* ═══ ساب‌هدر: بازگشت + عنوان کالا + نشانک دنبال‌کردن (طرح ۰۹) ═══ */}
      <header className="sticky top-0 z-20 flex h-[54px] items-center gap-2.5 border-b bg-white/92 px-3 backdrop-blur">
        <button
          type="button"
          aria-label="بازگشت به لیست خرید"
          onClick={() => router.push("/buy")}
          className="grid size-8.5 shrink-0 place-items-center rounded-[10px] text-stone-500 transition hover:bg-accent hover:text-foreground"
        >
          <ArrowLeft className="size-5 rtl:rotate-180" />
        </button>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-bold leading-tight">{goodTitle}</p>
          <p className="truncate text-[10.5px] font-normal leading-tight text-muted-foreground">
            تابلوی تأمین ·{" "}
            {board && board.rows.length > 0
              ? `${fa(board.rows.length)} تأمین‌کننده`
              : "رصد قیمت فروشنده‌ها"}
          </p>
        </div>
        <WatchToggle bizId={active.id} goodId={goodId} watched={board?.watched ?? false} />
      </header>

      <main className="mx-auto w-full max-w-2xl grow px-4 py-4 sm:px-6">
        {boardQ.isError ? (
          <p className="rounded-2xl border border-dashed bg-white/70 p-8 text-center text-sm text-muted-foreground">
            تابلو در دسترس نیست — دوباره تلاش کنید.
          </p>
        ) : rows.length === 0 ? (
          <EmptyBoard goodTitle={goodTitle} />
        ) : (
          <>
            {/* ═══ مرتب‌سازی (طرح ۰۹) ═══ */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {SORTS.map((s) => (
                <button
                  key={s.key}
                  type="button"
                  onClick={() => setSort(s.key)}
                  className={`shrink-0 rounded-full border px-3.5 py-[6px] text-[12px] font-bold transition ${
                    sort === s.key
                      ? "border-stone-800 bg-stone-800 text-white"
                      : "border-stone-300 bg-white text-stone-600 hover:border-stone-400"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>

            {/* ═══ کارت‌های تأمین‌کننده ═══ */}
            <div className="mt-3 flex flex-col gap-2.5">
              {rows.map((r) => (
                <SupplierCard
                  key={r.listingId}
                  row={r}
                  goodId={goodId}
                  unit={board?.good ? unitLabel(board.good.unit) : ""}
                  cheapest={r.listingId === cheapestId(rows)}
                />
              ))}
            </div>

            {/* ═══ تأمین‌کننده دیگری (طرح ۰۹) → صفحه تأمین‌کنندگان ═══ */}
            <Button
              variant="outline"
              className="mt-3 w-full gap-1.5 border-stone-300 bg-white font-bold text-stone-700"
              onClick={() => router.push("/buy/suppliers")}
            >
              <Plus className="size-4" strokeWidth={2} />
              تأمین‌کننده دیگری برای این کالا پیدا کن
            </Button>

            {/* ═══ شفافیت معرفی‌ها — متن دقیق طرح ۰۹ ═══ */}
            <div className="mt-4 flex items-start gap-1.5 rounded-xl bg-stone-100/80 px-3 py-2.5 text-[10.5px] leading-[1.9] text-muted-foreground">
              <Info className="mt-[3px] size-[13px] shrink-0 text-stone-500" strokeWidth={1.8} />
              <p>
                «معرفی iMach» یعنی این تأمین‌کننده از سوی شبکه iMach معرفی شده — با نتایج طبیعیِ تطبیق
                شما جدا و شفاف است و رتبه‌بندی را تغییر نمی‌دهد.
              </p>
            </div>
          </>
        )}
      </main>

      {/* ═══ اکشن اصلی: درخواست قیمت از چند تأمین‌کننده (طرح ۰۹) ═══ */}
      {rows.length > 0 && (
        <div className="sticky bottom-0 z-10 border-t bg-white/97 p-3 backdrop-blur">
          <div className="mx-auto w-full max-w-2xl">
            <Button
              size="lg"
              className="w-full gap-1.5 bg-stone-800 hover:bg-stone-900"
              onClick={() => router.push(`/buy/board/${goodId}/quote`)}
            >
              <Bookmark className="size-4.5" strokeWidth={1.9} />
              درخواست قیمت از تأمین‌کننده‌های انتخابی
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── تازگی ردیف تابلو (طرح ۰۹) — تا ۳۰ روز «N روز پیش»، بعد تاریخ ───
function freshness(iso: string): string {
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (d < 1) return "همین امروز";
  if (d < 30) return `${fa(d)} روز پیش`;
  return new Date(iso).toLocaleDateString("fa-IR");
}

function cheapestId(rows: BoardSupplierDto[]): string | null {
  let best: BoardSupplierDto | null = null;
  for (const r of rows) if (!best || r.priceMinor < best.priceMinor) best = r;
  return best?.listingId ?? null;
}

// ─── نشانک ساب‌هدر — دنبال‌کردن/برداشتن همین کالا (طرح ۰۹) ───
function WatchToggle({ bizId, goodId, watched }: { bizId: string; goodId: string; watched: boolean }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const watch = useWatchGood();
  const unwatch = useUnwatchGood();
  const pending = watch.isPending || unwatch.isPending;

  const toggle = () => {
    const m = watched ? unwatch : watch;
    m.mutate(
      { businessId: bizId, goodId },
      {
        onSuccess: () => {
          void qc.invalidateQueries({ queryKey: ["market", "supplyBoard"] });
          toast({
            title: watched ? "دنبال‌کردن برداشته شد" : "دنبال شد",
            description: watched ? undefined : "قیمتش که عوض شود خبرتان می‌کنیم.",
          });
        },
        onError: (e) => toast({ title: e.message || "ناموفق بود", variant: "destructive" }),
      }
    );
  };

  return (
    <button
      type="button"
      aria-label={watched ? "برداشتن دنبال‌کردن" : "دنبال کردن قیمت"}
      aria-pressed={watched}
      disabled={pending}
      onClick={toggle}
      className={`grid size-8.5 shrink-0 place-items-center rounded-[10px] transition ${
        watched
          ? "bg-stone-800 text-white hover:bg-stone-900"
          : "text-stone-500 hover:bg-accent hover:text-foreground"
      }`}
    >
      {watched ? <BookmarkCheck className="size-[18px]" strokeWidth={1.9} /> : <Bookmark className="size-[18px]" strokeWidth={1.9} />}
    </button>
  );
}

// ─── کارت تأمین‌کننده (طرح ۰۹: .best + شرایط + اکشن‌ها) ───
function SupplierCard({
  row,
  goodId,
  unit,
  cheapest,
}: {
  row: BoardSupplierDto;
  goodId: string;
  unit: string;
  cheapest: boolean;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const followToggle = useFollowToggle();
  const [followed, setFollowed] = useState(row.followedByMe);
  const bizId = useActiveBusiness()?.id;

  const doFollow = () => {
    if (!bizId) return;
    const next = !followed;
    setFollowed(next); // به‌روزرسانی خوش‌بینانه — خطا برگردد، برمی‌گردد
    followToggle.mutate(
      { businessId: bizId, supplierId: row.seller.id, follow: next },
      {
        onSuccess: () => {
          toast({
            title: next ? `${row.seller.name} دنبال شد` : "دنبال‌کردن برداشته شد",
            description: next ? "به‌روزرسانی کاتالوگش به شما می‌رسد." : undefined,
          });
        },
        onError: () => {
          setFollowed(!next);
          toast({ title: "دنبال‌کردن ناموفق بود", variant: "destructive" });
        },
      }
    );
  };

  return (
    <article
      className={`rounded-[14px] border p-3.5 shadow-sm transition ${
        cheapest
          ? "border-[#b6dfc5] bg-gradient-to-b from-[#f4fcf6] to-white"
          : row.sponsored
            ? "border-dashed border-stone-300 bg-white"
            : "border-stone-200 bg-white"
      }`}
    >
      {/* معرفی iMach — فلگ آینده (فعلاً خالی) */}
      {row.sponsored && (
        <span className="mb-1.5 inline-flex items-center gap-1 rounded-full bg-stone-100 px-2 py-0.5 text-[10.5px] font-bold text-stone-600">
          معرفی iMach
        </span>
      )}

      <div className="flex items-center gap-2.5">
        <span
          className="grid size-10 shrink-0 place-items-center rounded-xl text-base font-bold text-white"
          style={{ background: avatarColor(row.seller.name) }}
        >
          {row.seller.name.replace("پخش ", "").slice(0, 1)}
        </span>
        <div className="min-w-0 grow">
          <p className="flex items-center gap-1.5 text-[14px] font-bold text-stone-800">
            <span className="truncate">{row.seller.name}</span>
            {row.seller.isVerified && <BadgeCheck className="size-[15px] shrink-0 text-[#1d5fb8]" aria-label="تاییدشده" />}
          </p>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-0.5">
              <MapPin className="size-[11px]" strokeWidth={1.75} />
              {row.seller.city || "—"}
            </span>
            <span>به‌روزرسانی {freshness(row.updatedAt)}</span>
          </p>
        </div>
        <div className="shrink-0 text-end">
          <p className="text-[15px] font-extrabold text-stone-800">
            {fmtMoney(row.priceMinor, row.currency)}
          </p>
          <TrendLine row={row} />
        </div>
      </div>

      {/* شرایط + برچسب رابطه (طرح ۰۹) */}
      <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
        {row.variantLabel && <Cond>{row.variantLabel}</Cond>}
        {row.minOrder != null && row.minOrder > 0 && (
          <Cond>
            حداقل {fa(row.minOrder)} {unit}
          </Cond>
        )}
        {row.stock != null && (
          <Cond tone={row.stock > 0 ? "ok" : "off"}>{row.stock > 0 ? "موجود" : "ناموجود"}</Cond>
        )}
        {row.boughtFrom && (
          <span className="inline-flex items-center gap-1 rounded-full bg-[#e9f7ee] px-2.5 py-[3px] text-[10.5px] font-bold text-[#16a34a]">
            از او خریده‌ام
          </span>
        )}
        {followed && !row.boughtFrom && (
          <span className="inline-flex items-center gap-1 rounded-full bg-[#e8f1fd] px-2.5 py-[3px] text-[10.5px] font-bold text-[#1d5fb8]">
            دنبال می‌کنم
          </span>
        )}
      </div>

      {/* اکشن‌ها (طرح ۰۹): درخواست قیمت · کاتالوک · دنبال‌کردن */}
      <div className="mt-2.5 flex items-center gap-2 border-t border-stone-100 pt-2.5">
        <Button
          size="sm"
          className="h-9 flex-1 gap-1 bg-stone-800 font-bold hover:bg-stone-900"
          onClick={() => router.push(`/buy/board/${goodId}/quote?pre=${row.seller.id}`)}
        >
          درخواست قیمت
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="h-9 flex-1 gap-1 border-stone-300 bg-white font-bold text-stone-700 hover:bg-stone-50"
          onClick={() => router.push(`/sell/${row.seller.slug}`)}
        >
          <Store className="size-4" strokeWidth={1.75} />
          کاتالوگ
        </Button>
        <Button
          size="sm"
          variant="outline"
          aria-label={followed ? "دنبال‌کردن برداشته شود" : "دنبال کردن فروشنده"}
          aria-pressed={followed}
          disabled={followToggle.isPending}
          onClick={doFollow}
          className={`h-9 shrink-0 border-stone-300 ${
            followed ? "bg-[#e9f7ee] text-[#16a34a] hover:bg-[#ddf3e5]" : "bg-white text-stone-600 hover:bg-stone-50"
          }`}
        >
          {followed ? <Check className="size-4" strokeWidth={2.2} /> : <Bookmark className="size-4" strokeWidth={1.9} />}
        </Button>
      </div>
    </article>
  );
}

function Cond({ children, tone = "plain" }: { children: React.ReactNode; tone?: "plain" | "ok" | "off" }) {
  const cls =
    tone === "ok"
      ? "bg-[#e9f7ee] text-[#16a34a]"
      : tone === "off"
        ? "bg-stone-100 text-stone-500"
        : "bg-stone-100 text-stone-600";
  return <span className={`rounded-full px-2.5 py-[3px] text-[10.5px] font-bold ${cls}`}>{children}</span>;
}

// ─── روندِ آخرین تغییر قیمت (طرح ۰۹): ▼ از ۲٬۹۰۰٬۰۰۰ / ▲ از … / — بدون تغییر ───
function TrendLine({ row }: { row: BoardSupplierDto }) {
  if (row.prevMinor == null || row.trendPct == null) {
    return <span className="text-[10.5px] font-normal text-muted-foreground">— بدون تغییر</span>;
  }
  const pct = row.trendPct;
  if (pct < 0) {
    return (
      <span className="text-[10.5px] font-bold text-[#16a34a]">
        ▼ از {fmtMoney(row.prevMinor, row.currency)}
      </span>
    );
  }
  if (pct > 0) {
    return (
      <span className="text-[10.5px] font-bold text-[#dc2626]">
        ▲ از {fmtMoney(row.prevMinor, row.currency)}
      </span>
    );
  }
  return <span className="text-[10.5px] font-normal text-muted-foreground">— بدون تغییر</span>;
}

// ─── حالت خالی — کالای بی‌تابلو ───
function EmptyBoard({ goodTitle }: { goodTitle: string }) {
  const router = useRouter();
  return (
    <div className="rounded-2xl border border-dashed bg-white/70 p-10 text-center">
      <Package className="mx-auto size-8 text-stone-300" strokeWidth={1.75} />
      <p className="mt-2 text-sm font-bold">هنوز تابلویی برای «{goodTitle}» ساخته نشده</p>
      <p className="mt-1 text-xs leading-6 text-muted-foreground">
        فروشنده‌ای که این کالا را بفروشد، همین‌جا با قیمتش می‌نشیند؛ با دنبال‌کردن قیمت، خبر اولین
        تأمین‌کننده را می‌گیرید.
      </p>
      <Button
        variant="outline"
        className="mt-4 gap-1 border-stone-300 bg-white font-bold text-stone-700"
        onClick={() => router.push("/buy/suppliers")}
      >
        <ChevronLeft className="size-4 rtl:rotate-180" />
        سراغ تأمین‌کنندگان برو
      </Button>
    </div>
  );
}
