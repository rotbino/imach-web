"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/auth-store";
import { setArmActive, useActiveBusiness } from "@/lib/active-biz";
import { AppFooter, AppHeader, MobileTabBar } from "@/app/components/chrome";
import { NoBusinessState } from "@/app/components/no-business";
import { SetPasswordButton } from "@/app/components/set-password-button";
import { fa, categoryName, fmtMoney, frequencyLabel, goodName, unitLabel } from "@/lib/format";
import { useMyInquiries, useMyListings, usePriceBoard, useWatchGood, useWatchedGoods, useFollowToggle } from "@/lib/queries";
import type { BusinessSummaryDto, GoodItemDto, WatchedRowDto } from "@/lib/api";
import { ShareDialog } from "@/app/components/share";
import { BuyItemSettingsDialog } from "./item-settings";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  Bookmark,
  BookmarkCheck,
  ChevronLeft,
  Info,
  Loader2,
  Plus,
  Search,
  Settings2,
  Share2,
  Star,
} from "lucide-react";

/*
 * لیست خرید — دستیار خرید (فاز ۵ · طرح ۰۸ + طرح ۸)
 * هر کالا یک تابلوی تأمین کوچک است:
 *   • ردیف‌ها = WatchedGoodها + BUY listingهای موجود (ادغام بر حسب کالا)
 *   • شاخص‌های هر ردیف: تعداد تامین‌کننده / ارزان‌ترین + فروشنده‌اش / روند هفتگی
 *   • کالای بی‌تابلو: ردیف خط‌چین + CTA «دنبال کردن»
 *   • چیپ‌ها: همه / تغییر قیمت / هفتگی / ماهانه — از داده‌ی واقعی
 * طرح ۸:
 *   • نوار اشتراک لیست (U62) — لیست خرید دعوت‌نامهٔ تأمین‌کننده‌هاست
 *   • ردیف‌های «صف اول» (U01/U05) — پروموی کالاهای لیست من از فروشنده‌های
 *     ذخیره‌نشده، با دکمهٔ پر «دنبال کن ⭐» (U06 — فقط غیرذخیره‌کنندگان)
 */

export default function BuyPage() {
  const router = useRouter();
  const { status } = useAuthStore();

  useEffect(() => {
    document.title = "لیست خرید | iMach";
    setArmActive("buy");
  }, []);

  useEffect(() => {
    if (status === "guest") router.replace("/start");
  }, [status, router]);

  if (status !== "authed") {
    return (
      <div className="flex min-h-screen flex-col">
        <AppHeader />
        <main className="grow">
          <div className="grid place-items-center py-32">
            <Loader2 className="size-6 animate-spin text-stone-700" />
          </div>
        </main>
        <AppFooter />
        <MobileTabBar />
      </div>
    );
  }

  return <BuyBody />;
}

function BuyBody() {
  const active = useActiveBusiness();

  if (!active) {
    return (
      <div className="flex min-h-screen flex-col">
        <AppHeader />
        <main className="grow">
          <NoBusinessState variant="buy" />
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
        <div className="mx-auto max-w-4xl px-4 py-5 sm:px-6 sm:py-7">
          <MyBuyList biz={active} />
        </div>
      </main>
      <AppFooter />
      <MobileTabBar />
    </div>
  );
}

// ─── فیلتر چیپ‌ها ───
type ChipFilter = "ALL" | "CHANGED" | "WEEKLY" | "MONTHLY";

function MyBuyList({ biz }: { biz: BusinessSummaryDto }) {
  const router = useRouter();
  const bizId = biz.id;
  const rowsQ = useWatchedGoods(bizId);
  const myInqQ = useMyInquiries(bizId);
  // BUY listing کامل برای دیالوگ تنظیمات (حجم/دوره/حذف) — از getMyListings
  const listingsQ = useMyListings(bizId, { includeInactive: true });
  // طرح ۸ — تابلوی قیمت با پرومو (U05)
  const boardQ = usePriceBoard(bizId);
  const [shareOpen, setShareOpen] = useState(false);

  const [q, setQ] = useState("");
  const [chip, setChip] = useState<ChipFilter>("ALL");
  const [settingsFor, setSettingsFor] = useState<GoodItemDto | null>(null);

  const rows = rowsQ.data ?? [];
  const answered = myInqQ.data?.answeredCount ?? 0;
  // پروموهای قابل نمایش — هر کدام برای کالایی از لیست خرید من
  const promos = (boardQ.data?.rows ?? []).map((r) => r.promo).filter((p): p is NonNullable<typeof p> => !!p);

  const changedCount = rows.filter((r) => r.priceChanged).length;
  const weeklyCount = rows.filter((r) => r.frequency === "WEEKLY").length;
  const monthlyCount = rows.filter((r) => r.frequency === "MONTHLY").length;

  const filtered = rows.filter((r) => {
    if (chip === "CHANGED" && !r.priceChanged) return false;
    if (chip === "WEEKLY" && r.frequency !== "WEEKLY") return false;
    if (chip === "MONTHLY" && r.frequency !== "MONTHLY") return false;
    if (!q.trim()) return true;
    const needle = q.trim().toLowerCase();
    return [r.good && goodName(r.good), r.variantLabel, r.good && categoryName(r.good.category)]
      .filter(Boolean)
      .some((s) => (s as string).toLowerCase().includes(needle));
  });

  if (rowsQ.isLoading) {
    return (
      <div className="grid place-items-center py-24">
        <Loader2 className="size-6 animate-spin text-stone-700" />
      </div>
    );
  }

  return (
    <>
      {/* ═══ عنوان بخش + «درخواست‌های من» با بج پاسخ‌ها (طرح ۰۸) ═══ */}
      <div className="mt-1 mb-2.5 flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-1.5 text-[15px] font-bold text-stone-800">
          <ListIcon />
          لیست خرید من
        </h2>
        <Link
          href="/buy/requests"
          className="flex items-center gap-1.5 text-[12px] text-muted-foreground transition hover:text-stone-700"
        >
          درخواست‌های من
          {answered > 0 && (
            <span className="rounded-full bg-[#e8f1fd] px-[9px] py-[2px] text-[10.5px] font-bold text-[#1d5fb8]">
              {fa(answered)}
            </span>
          )}
        </Link>
      </div>

      {/* ═══ نوار اشتراک لیست خرید (طرح ۸ — U62) ═══ */}
      {rows.length > 0 && (
        <div className="mb-2.5 flex items-center gap-2.5 rounded-2xl border border-[#bfe5e0] bg-[#f5fdfb] px-3 py-2.5">
          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[#0d9488] text-white">
            <Share2 className="size-4" />
          </span>
          <p className="min-w-0 grow text-[11.5px] leading-5 text-muted-foreground">
            <b className="text-[12.5px] text-foreground">لیست خریدتان، دعوت‌نامهٔ تأمین‌کننده‌هاست</b>
            <br />
            هر تأمین‌کننده‌ای این لیست را ببیند و «گوش به زنگ» شما شود، نیاز بعدی‌تان را اول خبر می‌شود.
          </p>
          <Button
            className="h-9 shrink-0 bg-[#0d9488] px-3 text-[12px] hover:bg-[#0f766e]"
            onClick={() => setShareOpen(true)}
          >
            اشتراک‌گذاری
          </Button>
        </div>
      )}

      {/* ═══ جست‌وجو + افزودن کالا (طرح ۰۸: searchbar + btn-stone) ═══ */}
      <div className="flex items-center gap-2">
        <label className="flex h-11 flex-1 items-center gap-2.5 rounded-xl border border-stone-300 bg-white px-3.5">
          <Search className="size-4.5 shrink-0 text-muted-foreground" />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="جستجو در لیست…"
            className="h-full w-full bg-transparent text-[13px] outline-none placeholder:text-stone-400"
          />
        </label>
        <Button
          className="h-11 gap-1 bg-[#0d9488] px-4 hover:bg-[#0f766e]"
          onClick={() => router.push("/new?tab=buy")}
        >
          <Plus className="size-4" />
          افزودن کالا
        </Button>
      </div>

      <SetPasswordButton variant="header" />

      {/* ═══ چیپ‌ها — همه / تغییر قیمت / هفتگی / ماهانه ═══ */}
      <div className="mt-2.5 flex items-center gap-1.5 overflow-x-auto pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <ChipBtn active={chip === "ALL"} onClick={() => setChip("ALL")}>
          همه {rows.length > 0 && `(${fa(rows.length)})`}
        </ChipBtn>
        <ChipBtn active={chip === "CHANGED"} onClick={() => setChip("CHANGED")}>
          تغییر قیمت {changedCount > 0 && `(${fa(changedCount)})`}
        </ChipBtn>
        <ChipBtn active={chip === "WEEKLY"} onClick={() => setChip("WEEKLY")}>
          هفتگی
        </ChipBtn>
        <ChipBtn active={chip === "MONTHLY"} onClick={() => setChip("MONTHLY")}>
          ماهانه
        </ChipBtn>
      </div>

      {/* ═══ ردیف‌های «صف اول» — پروموی کالاهای لیست من (طرح ۸ — U01/U05/U06) ═══ */}
      {promos.length > 0 && (
        <section className="mt-2.5">
          <div className="mb-2 flex items-center gap-1.5 px-1">
            <Star className="size-3.5 fill-[#b45309] text-[#b45309]" />
            <h3 className="text-[12.5px] font-extrabold text-[#b45309]">صف اول</h3>
            <span className="text-[10.5px] text-muted-foreground">— پیشنهاد پولیِ شفاف برای کالاهای لیست شما</span>
          </div>
          <div className="flex flex-col gap-2">
            {promos.map((p) => (
              <PromoRow key={p.promoId} promo={p} bizId={bizId} />
            ))}
          </div>
        </section>
      )}

      {/* ═══ ردیف‌ها — هر کالا یک تابلوی تأمین (طرح ۰۸: row-card) ═══ */}
      <section className="mt-2.5 flex flex-col gap-2">
        {rows.length === 0 ? (
          <EmptyList />
        ) : filtered.length === 0 ? (
          <p className="rounded-2xl border border-dashed bg-white/70 p-8 text-center text-sm text-muted-foreground">
            چیزی مطابق فیلتر/جست‌وجو پیدا نشد.
          </p>
        ) : (
          filtered.map((r) => (
            <BuyRow
              key={r.goodId}
              row={r}
              listing={
                r.buyListingId
                  ? (listingsQ.data ?? []).find((l) => l.id === r.buyListingId) ?? null
                  : null
              }
              bizId={bizId}
              onSettings={(l) => setSettingsFor(l)}
            />
          ))
        )}
      </section>

      {/* ═══ راهنما: این لیست چطور پر می‌شود (متن دقیق طرح ۰۸) ═══ */}
      {rows.length > 0 && (
        <div className="mt-4 flex items-start gap-1.5 rounded-xl bg-stone-100/80 px-3 py-2.5 text-[10.5px] leading-[1.9] text-muted-foreground">
          <Info className="mt-[3px] size-[13px] shrink-0 text-primary" strokeWidth={1.8} />
          <p>
            هر کالایی را در کاتالوگ فروشنده‌ها «دنبال کردن قیمت» بزنید، این‌جا می‌نشیند و تابلوی
            تأمینش ساخته می‌شود.
          </p>
        </div>
      )}

      {settingsFor && (
        <BuyItemSettingsDialog
          listing={settingsFor}
          bizId={bizId}
          currency={biz.currency ?? "IRR"}
          open
          onOpenChange={(o) => !o && setSettingsFor(null)}
        />
      )}

      <ShareDialog
        kind="buy"
        slug={biz.slug}
        bizName={biz.name}
        open={shareOpen}
        onOpenChange={setShareOpen}
      />
    </>
  );
}

// ─── ردیف پروموی «صف اول» (طرح ۸ — U01): دکمهٔ پر نارنجی + ⭐ ───
function PromoRow({
  promo,
  bizId,
}: {
  promo: {
    promoId: string;
    listingId: string;
    supplier: { id: string; slug: string; name: string; city: string | null; isVerified: boolean };
    priceMinor: number | null;
    currency: string | null;
    variantLabel: string | null;
    goodName: string | null;
  };
  bizId: string;
}) {
  const { toast } = useToast();
  const follow = useFollowToggle();

  const doFollow = () => {
    follow.mutate(
      { businessId: bizId, supplierId: promo.supplier.id, follow: true, source: "PROMO", promoId: promo.promoId },
      {
        onSuccess: () =>
          toast({
            title: `کاتالوگ ${promo.supplier.name} ذخیره شد`,
            description: "قیمتش از این به بعد در تابلوی شما زنده است.",
          }),
        onError: (e) => toast({ title: e.message || "ناموفق بود", variant: "destructive" }),
      }
    );
  };

  return (
    <article
      className="flex items-center gap-[11px] rounded-[14px] border border-[#e8cf9f] bg-[#fffaf0] px-3 py-2.5 shadow-[0_2px_10px_rgba(180,83,9,0.06)]"
      style={{ boxShadow: "inset 0 0 0 1.5px rgba(180,83,9,0.08)" }}
    >
      <Link href={`/sell/${promo.supplier.slug}/${promo.listingId}`} className="flex min-w-0 flex-1 items-center gap-[11px]">
        <span className="grid size-[46px] shrink-0 place-items-center rounded-[8px] bg-gradient-to-br from-[#fdf0da] to-[#f9e3bd] p-1 text-center">
          <Star className="size-5 fill-[#b45309] text-[#b45309]" />
        </span>
        <span className="min-w-0 grow">
          <span className="flex flex-wrap items-center gap-1.5 text-[14px] font-bold text-foreground">
            {promo.goodName ?? "کالا"}
            <span className="inline-flex items-center gap-1 rounded-full bg-[#fdf0da] px-[9px] py-[2px] text-[10.5px] font-bold text-[#b45309]">
              <Star className="size-3 fill-[#b45309]" />
              پرومو
            </span>
          </span>
          <span className="mt-[3px] flex flex-wrap items-center gap-2 text-[11.5px] text-muted-foreground">
            {promo.priceMinor != null && <b className="font-bold text-foreground">{fmtMoney(promo.priceMinor, promo.currency)}</b>}
            · {promo.supplier.name}
            {promo.supplier.city ? ` · ${promo.supplier.city}` : ""}
          </span>
        </span>
      </Link>
      {/* U01 — دکمهٔ پر (نارنجی + ⭐): دنبال‌کردن از پرومو */}
      <button
        type="button"
        onClick={doFollow}
        disabled={follow.isPending}
        className="flex shrink-0 items-center gap-1 rounded-[10px] bg-primary px-3.5 py-2 text-[12.5px] font-bold text-white shadow-[0_4px_12px_rgba(249,115,22,0.35)] transition hover:bg-[#ea580c] disabled:opacity-50"
      >
        <Star className="size-3.5 fill-white" />
        {follow.isPending ? "…" : "دنبال کن"}
      </button>
    </article>
  );
}

// ─── حالت خالی — مسیرهای شروع (متن الگوی طرح، داده از دیتابیس نیست) ───
function EmptyList() {
  const router = useRouter();
  return (
    <div className="rounded-2xl border border-dashed bg-white/70 p-10 text-center">
      <Bookmark className="mx-auto size-8 text-stone-300" strokeWidth={1.75} />
      <p className="mt-2 text-sm font-bold">لیست خریدتان هنوز خالی است</p>
      <p className="mt-1 text-xs leading-6 text-muted-foreground">
        کاتالوگ فروشنده‌ها را بگردید و «دنبال کردن قیمت» بزنید؛ یا نیاز خریدتان را ثبت کنید تا
        تامین‌کننده‌ها پیدا شوند.
      </p>
      <Button className="mt-4 gap-1 bg-[#0d9488] hover:bg-[#0f766e]" onClick={() => router.push("/new?tab=buy")}>
        <Plus className="size-4" />
        افزودن کالا
      </Button>
    </div>
  );
}

// ─── ردیف لیست خرید — تابلودار (خط پر) / بی‌تابلو (خط‌چین + CTA) ───
function BuyRow({
  row,
  listing,
  bizId,
  onSettings,
}: {
  row: WatchedRowDto;
  listing: GoodItemDto | null;
  bizId: string;
  onSettings: (l: GoodItemDto) => void;
}) {
  const hasBoard = row.supplierCount > 0 && row.cheapest !== null;
  const unit = row.good ? unitLabel(row.good.unit) : "";
  const glyph = row.variantLabel ?? unit;

  if (!hasBoard) {
    return <NoBoardRow row={row} glyph={glyph} bizId={bizId} />;
  }

  const c = row.cheapest!;
  // فاز ۶ — زدن ردیف → تابلوی تأمین همان کالا (طرح ۰۸→۰۹)
  const href = `/buy/board/${row.goodId}`;
  // فقط‌یکی → «تنها قیمت»، چند فروشنده → «ارزان‌ترین» (زبان طرح ۰۸)
  const priceLabel = row.supplierCount === 1 ? "تنها قیمت" : "ارزان‌ترین";

  return (
    <article className="flex items-center gap-[11px] rounded-[12px] border border-stone-200 bg-white px-3 py-2.5 transition hover:shadow-sm">
      <Link href={href} className="flex min-w-0 flex-1 items-center gap-[11px]">
        <span className="grid size-[46px] shrink-0 place-items-center overflow-hidden rounded-[8px] bg-gradient-to-br from-[#f3f1ea] to-[#e9e5db] p-1 text-center">
          <span className="line-clamp-3 text-[9px] font-bold leading-tight text-stone-400">{glyph}</span>
        </span>
        <span className="min-w-0 grow">
          <span className="flex flex-wrap items-center gap-1.5 text-[14px] font-bold text-stone-800">
            {row.good ? goodName(row.good) : "—"}
            <span className="rounded-full bg-stone-100 px-[9px] py-[2px] text-[10.5px] font-bold text-stone-600">
              {fa(row.supplierCount)} تأمین‌کننده
            </span>
          </span>
          <span className="mt-[3px] flex flex-wrap items-center gap-2 text-[11.5px] text-muted-foreground">
            {priceLabel}: <b className="font-bold text-stone-800">{fmtMoney(c.priceMinor, c.currency)}</b> ·{" "}
            {c.seller.name}
          </span>
          <span className="mt-[2px] flex flex-wrap items-center gap-2 text-[11.5px]">
            <Trend pct={row.trendPct} />
            {row.volume !== null && (
              <span className="text-muted-foreground">
                {row.frequency ? `${frequencyLabel(row.frequency)} · ` : ""}
                {fa(row.volume)} {unit}
              </span>
            )}
          </span>
        </span>
      </Link>

      {/* تنظیمات نیاز خرید (حجم/دوره/حذف) — فقط ردیف‌های دارای BUY listing */}
      {listing && (
        <button
          type="button"
          onClick={() => onSettings(listing)}
          aria-label={`تنظیمات ${row.good ? goodName(row.good) : "کالا"}`}
          className="grid size-7 shrink-0 place-items-center rounded-lg text-stone-300 transition hover:bg-accent hover:text-primary"
        >
          <Settings2 className="size-4" strokeWidth={1.75} />
        </button>
      )}
      <ChevronLeft className="size-4 shrink-0 text-stone-300" strokeWidth={1.75} />
    </article>
  );
}

// ─── ردیف بی‌تابلو — خط‌چین + CTA «دنبال کردن» (متن طرح ۰۸) ───
function NoBoardRow({ row, glyph, bizId }: { row: WatchedRowDto; glyph: string; bizId: string }) {
  const { toast } = useToast();
  const watch = useWatchGood();

  const name = row.good ? goodName(row.good) : "—";

  const doWatch = () => {
    watch.mutate(
      { businessId: bizId, goodId: row.goodId },
      {
        onSuccess: () =>
          toast({
            title: `${name} دنبال شد`,
            description: "قیمتش که عوض شود خبرتان می‌کنیم؛ تامین‌کننده‌ای آمد، تابلویش ساخته می‌شود.",
          }),
        onError: (e) => toast({ title: e.message || "ناموفق بود", variant: "destructive" }),
      }
    );
  };

  return (
    <div className="flex items-center gap-[11px] rounded-[12px] border border-dashed border-stone-300 bg-white px-3 py-2.5">
      <span className="grid size-[46px] shrink-0 place-items-center overflow-hidden rounded-[8px] bg-gradient-to-br from-[#f3f1ea] to-[#e9e5db] p-1 text-center">
        <span className="line-clamp-3 text-[9px] font-bold leading-tight text-stone-400">{glyph}</span>
      </span>
      <div className="min-w-0 grow">
        <p className="text-[14px] font-bold text-stone-800">{name}</p>
        <p className="mt-[3px] text-[11.5px] leading-5 text-muted-foreground">
          {row.watched
            ? "دنبال می‌کنید — هنوز فروشنده‌ای قیمت نداده؛ اولین قیمت که ثبت شود این‌جا می‌نشیند."
            : "هنوز تابلویی ندارد — با دنبال کردن قیمت، تأمین‌کننده‌ها پیدا می‌شوند"}
        </p>
      </div>
      {row.watched ? (
        <span className="flex shrink-0 items-center gap-1.5 rounded-[10px] bg-stone-100 px-3 py-1.5 text-[12.5px] font-bold text-stone-500">
          <BookmarkCheck className="size-3.5" strokeWidth={1.9} />
          دنبال می‌کنم
        </span>
      ) : (
        <button
          type="button"
          onClick={doWatch}
          disabled={watch.isPending}
          className="shrink-0 rounded-[10px] border border-stone-300 bg-white px-3.5 py-1.5 text-[12.5px] font-bold text-stone-600 transition hover:border-stone-400 hover:bg-stone-50 disabled:opacity-50"
        >
          {watch.isPending ? "…" : "دنبال کردن"}
        </button>
      )}
    </div>
  );
}

// ─── روند هفتگی (طرح: trend up/down/flat) ───
function Trend({ pct }: { pct: number | null }) {
  if (pct === null || pct === 0) {
    return <span className="text-[11px] font-bold text-muted-foreground">— بدون تغییر</span>;
  }
  if (pct < 0) {
    return (
      <span className="flex items-center gap-[2px] text-[11px] font-bold text-green-600">
        ▼ {fa(Math.abs(pct))}٪ این هفته
      </span>
    );
  }
  return (
    <span className="flex items-center gap-[2px] text-[11px] font-bold text-red-600">
      ▲ {fa(pct)}٪ این هفته
    </span>
  );
}

// ─── چیپ فیلتر (طرح ۰۸: chip / chip.active — رنگ سنگیِ بازوی خرید) ───
function ChipBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`shrink-0 rounded-full border px-3.5 py-1.5 text-[12.5px] transition ${
        active
          ? "border-transparent bg-stone-100 font-bold text-stone-800"
          : "border-stone-300 bg-white text-stone-500 hover:bg-stone-50"
      }`}
    >
      {children}
    </button>
  );
}

// آیکون فهرست (طرح ۰۸: i-list)
function ListIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="size-[18px] text-stone-800">
      <path d="M8 6h13M8 12h13M8 18h13" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="3.5" cy="6" r="1.3" fill="currentColor" stroke="none" />
      <circle cx="3.5" cy="12" r="1.3" fill="currentColor" stroke="none" />
      <circle cx="3.5" cy="18" r="1.3" fill="currentColor" stroke="none" />
    </svg>
  );
}
