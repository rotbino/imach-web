"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/auth-store";
import { setArmActive, useActiveBusiness } from "@/lib/active-biz";
import { AppFooter, AppHeader, MobileTabBar, SectionTitle } from "@/app/components/chrome";
import { fa, fmtMoney, goodName } from "@/lib/format";
import { useCreatePromo, useMyListings, useMyPromos, useStopPromo, useWallet } from "@/lib/queries";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import type { GoodItemDto, PromoMineDto } from "@/lib/api";
import {
  Check,
  Eye,
  Loader2,
  Megaphone,
  Pause,
  Plus,
  Star,
  Users,
  Wallet as WalletIcon,
} from "lucide-react";

/*
 * کمپین‌های «صف اول» — طرح ۸ (U05..U09):
 * • مدل پولی به‌ازای نتیجه: ۱٬۰۰۰ تومان هر نمایش هدفمند + ۵٬۰۰۰ تومان
 *   هر دنبال‌کردن — بدون مدت ۷روزه، بدون «اعتبار» (U66).
 * • هدف‌گیری شفاف: فقط خریدارانی که کاتالوگ شما را ذخیره نکرده‌اند (U06).
 * • گزارش عددی: چه کسانی دیدند، چه کسانی دنبال کردند، هزینهٔ ریز (U64).
 * • رتبهٔ تطبیق هرگز پولی نیست — برچسب ⭐ شفاف است.
 */

const BUDGET_PACKS = [50_000, 100_000, 200_000]; // تومان

export default function PromosPage() {
  const router = useRouter();
  const { status } = useAuthStore();

  useEffect(() => {
    document.title = "کمپین‌های من | iMach";
    setArmActive("sell");
    if (status === "guest") router.replace("/start");
  }, [status, router]);

  if (status !== "authed") {
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
  return <PromosBody />;
}

function PromosBody() {
  const biz = useActiveBusiness();
  if (!biz) {
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
          <PromosInner bizId={biz.id} />
        </div>
      </main>
      <AppFooter />
      <MobileTabBar />
    </div>
  );
}

function PromosInner({ bizId }: { bizId: string }) {
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <>
      <SectionTitle
        icon={<Megaphone className="size-[18px] text-primary" strokeWidth={1.75} />}
        title="کمپین‌های «صف اول»"
        action={
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="flex items-center gap-1 rounded-xl bg-primary px-3 py-1.5 text-[12px] font-bold text-white transition hover:bg-[#ea580c]"
          >
            <Plus className="size-3.5" />
            کمپین جدید
          </button>
        }
      />

      <RateCard />

      <MyCampaigns bizId={bizId} />

      {createOpen && <CreatePromoSheet bizId={bizId} onClose={() => setCreateOpen(false)} />}
    </>
  );
}

/** کارت نرخ شفاف — همان متن شیت پروموی طرح ۸ */
function RateCard() {
  return (
    <div className="mb-4 rounded-2xl border border-[#e8cf9f] bg-[#fffaf0] p-4">
      <p className="flex items-center gap-1.5 text-[13px] font-extrabold text-[#b45309]">
        <Star className="size-4 fill-[#b45309]" />
        نرخ‌ها — فقط به‌ازای نتیجه
      </p>
      <div className="mt-2.5 grid grid-cols-2 gap-2">
        <div className="rounded-xl bg-white p-2.5 text-center">
          <p className="text-[15px] font-black text-[#b45309]">۱٬۰۰۰ تومان</p>
          <p className="mt-0.5 text-[10.5px] text-muted-foreground">هر نمایش هدفمند</p>
        </div>
        <div className="rounded-xl bg-white p-2.5 text-center">
          <p className="text-[15px] font-black text-[#b45309]">۵٬۰۰۰ تومان</p>
          <p className="mt-0.5 text-[10.5px] text-muted-foreground">هر دنبال‌کردن حاصل</p>
        </div>
      </div>
      <p className="mt-2.5 text-[10.5px] leading-6 text-muted-foreground">
        نمایش فقط به خریدارِ همان کالا که کاتالوگ شما را <b>ذخیره نکرده</b> می‌رسد؛ رتبهٔ تطبیق
        مستقل از پرداخت می‌ماند و برچسب پرومو شفاف است. بودجه تمام شود، نمایش می‌ایستد.
      </p>
    </div>
  );
}

function MyCampaigns({ bizId }: { bizId: string }) {
  const promosQ = useMyPromos(bizId);
  const rows = promosQ.data ?? [];

  if (promosQ.isLoading) {
    return (
      <div className="grid place-items-center py-16">
        <Loader2 className="size-6 animate-spin text-primary" />
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed bg-white/70 p-8 text-center">
        <Megaphone className="mx-auto size-8 text-stone-300" />
        <p className="mt-2 text-sm font-bold">هنوز کمپینی نداشته‌اید</p>
        <p className="mx-auto mt-1.5 max-w-sm text-xs leading-6 text-muted-foreground">
          با ۵۰ هزار تومان، کالای منتخب‌تان در صف اولِ تابلوی خریدارهای همان کالا می‌نشیند — فقط
          کسانی که هنوز شما را ذخیره نکرده‌اند.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2.5">
      {rows.map((p) => (
        <CampaignCard key={p.id} promo={p} bizId={bizId} />
      ))}
    </div>
  );
}

function CampaignCard({ promo, bizId }: { promo: PromoMineDto; bizId: string }) {
  const { toast } = useToast();
  const stopMut = useStopPromo();
  const [open, setOpen] = useState(false);
  const remainingToman = Math.floor(promo.remainingMinor / 10);
  const spentToman = Math.floor(promo.spentMinor / 10);
  const progress = promo.budgetMinor > 0 ? (promo.spentMinor / promo.budgetMinor) * 100 : 0;

  const stop = () => {
    stopMut.mutate(
      { businessId: bizId, promoId: promo.id },
      {
        onSuccess: () =>
          toast({
            title: "کمپین متوقف شد",
            description: remainingToman > 0 ? `${fa(remainingToman.toLocaleString("fa-IR"))} تومان به کیف برگشت.` : undefined,
          }),
        onError: (e) => toast({ title: (e as Error).message || "ناموفق بود", variant: "destructive" }),
      }
    );
  };

  return (
    <div
      className={`rounded-2xl border bg-white p-4 shadow-sm transition ${
        promo.isActive ? "border-[#e8cf9f]" : "opacity-75"
      }`}
    >
      <div className="flex items-center gap-2.5">
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[#fdf0da] text-[#b45309]">
          <Star className="size-4 fill-[#b45309]" />
        </span>
        <div className="min-w-0 grow">
          <p className="flex flex-wrap items-center gap-1.5 text-[13.5px] font-bold">
            {promo.goodName ?? "کالا"}
            {promo.priceMinor != null && (
              <span className="text-[11px] font-medium text-muted-foreground">{fmtMoney(promo.priceMinor, null)}</span>
            )}
            {promo.isActive ? (
              <span className="rounded-full bg-[#e9f7ee] px-2 py-0.5 text-[10px] font-bold text-[#16a34a]">فعال</span>
            ) : (
              <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[10px] font-bold text-stone-500">پایان‌یافته</span>
            )}
          </p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            بودجه {fa(Math.floor(promo.budgetMinor / 10).toLocaleString("fa-IR"))} تومان · خرج‌شده{" "}
            {fa(spentToman.toLocaleString("fa-IR"))} تومان
          </p>
        </div>
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="shrink-0 rounded-lg border px-2.5 py-1.5 text-[11.5px] font-bold text-muted-foreground transition hover:border-primary/40 hover:text-primary"
        >
          {open ? "بستن" : "گزارش"}
        </button>
      </div>

      {/* نوار پیشرفت بودجه */}
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-stone-100">
        <div
          className="h-full rounded-full bg-[#b45309] transition-all"
          style={{ width: `${Math.min(100, progress)}%` }}
        />
      </div>
      <p className="mt-1.5 text-[10.5px] text-muted-foreground">
        باقی‌مانده: {fa(remainingToman.toLocaleString("fa-IR"))} تومان
      </p>

      {open && <CampaignReport promoId={promo.id} bizId={bizId} />}

      {promo.isActive && (
        <Button
          variant="outline"
          className="mt-3 w-full gap-1.5 border-red-200 text-red-600 hover:bg-red-50"
          disabled={stopMut.isPending}
          onClick={stop}
        >
          <Pause className="size-3.5" />
          توقف کمپین — باقیمانده به کیف برمی‌گردد
        </Button>
      )}
    </div>
  );
}

/** گزارش عددی — طرح ۸ (U09/U64): آمار بزرگ + فرمول + بینندگان */
function CampaignReport({ promoId, bizId }: { promoId: string; bizId: string }) {
  const reportQ = usePromoReportSafe(bizId, promoId);

  if (reportQ.isLoading) {
    return (
      <div className="mt-3 grid place-items-center py-6">
        <Loader2 className="size-5 animate-spin text-primary" />
      </div>
    );
  }
  const r = reportQ.data;
  if (!r) return null;

  const spentToman = Math.floor(r.stats.spentMinor / 10);
  const cpf = r.stats.costPerFollowMinor != null ? Math.floor(r.stats.costPerFollowMinor / 10) : null;

  return (
    <div className="mt-3 rounded-2xl bg-[#fdf9f2] p-3.5">
      {/* آمار بزرگ */}
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="rounded-xl bg-white p-2.5">
          <p className="text-[20px] font-black leading-none text-foreground">{fa(r.stats.views)}</p>
          <p className="mt-1 text-[10px] text-muted-foreground">نمایش</p>
        </div>
        <div className="rounded-xl bg-white p-2.5">
          <p className="text-[20px] font-black leading-none text-[#16a34a]">{fa(r.stats.follows)}</p>
          <p className="mt-1 text-[10px] text-muted-foreground">دنبال‌کردن</p>
        </div>
        <div className="rounded-xl bg-white p-2.5">
          <p className="text-[20px] font-black leading-none text-[#b45309]">
            {fa(spentToman.toLocaleString("fa-IR"))}
          </p>
          <p className="mt-1 text-[10px] text-muted-foreground">تومان هزینه</p>
        </div>
      </div>

      {/* فرمول ریز — همان زبان گزارش طرح ۸ */}
      <p className="mt-2.5 rounded-xl bg-white px-3 py-2 text-center text-[11px] font-bold text-muted-foreground">
        {fa(r.stats.views)} × ۱٬۰۰۰ + {fa(r.stats.follows)} × ۵٬۰۰۰ ={" "}
        {fa(spentToman.toLocaleString("fa-IR"))} تومان
      </p>
      {cpf != null && (
        <p className="mt-1.5 text-center text-[10.5px] text-muted-foreground">
          میانگین هزینهٔ هر دنبال‌کننده: {fa(cpf.toLocaleString("fa-IR"))} تومان
        </p>
      )}
      <p className="mt-1.5 text-center text-[10px] text-[#0d5d54]">
        نمایش فقط به غیرذخیره‌کنندگان داده شده (U06)
      </p>

      {/* بینندگان و تبدیل‌شدگان */}
      {r.viewers.length > 0 && (
        <div className="mt-3">
          <p className="mb-1.5 flex items-center gap-1 text-[11.5px] font-bold text-muted-foreground">
            <Eye className="size-3.5" />
            خریدارهایی که دیدند
          </p>
          <div className="flex flex-wrap gap-1.5">
            {r.viewers.map((v) => (
              <span
                key={v.id}
                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10.5px] font-bold ${
                  r.converted.some((c) => c.id === v.id)
                    ? "bg-[#e9f7ee] text-[#16a34a]"
                    : "bg-white text-muted-foreground"
                }`}
              >
                {r.converted.some((c) => c.id === v.id) && <Check className="size-3" />}
                {v.name}
                {v.city ? ` · ${v.city}` : ""}
              </span>
            ))}
          </div>
          <p className="mt-1.5 text-[10px] text-muted-foreground">
            سبز = دنبال کردند — اعداد شفاف، برای تکرار کمپین.
          </p>
        </div>
      )}
    </div>
  );
}

// هوک گزارش — جدا برای جداسازی لود
import { usePromoReport } from "@/lib/queries";
function usePromoReportSafe(bizId: string, promoId: string) {
  return usePromoReport(bizId, promoId);
}

/** شیت ساخت کمپین — انتخاب کالا + بودجه (طرح ۸: شیت پرومو) */
function CreatePromoSheet({ bizId, onClose }: { bizId: string; onClose: () => void }) {
  const { toast } = useToast();
  const listingsQ = useMyListings(bizId);
  const walletQ = useWallet(bizId);
  const createMut = useCreatePromo();
  const [listingId, setListingId] = useState<string | null>(null);
  const [budget, setBudget] = useState<number>(BUDGET_PACKS[0]);
  const [custom, setCustom] = useState("");

  // فقط کالاهای فروشِ فعالِ قیمت‌دار — کمپین روی بی‌قیمت معنا ندارد
  const sellable = (listingsQ.data ?? []).filter(
    (l) => (l.mode === "SELL" || l.mode === "BOTH") && l.isActive !== false && l.priceMinor !== null
  );

  const balanceToman = Math.floor((walletQ.data?.balanceMinor ?? 0) / 10);
  const customToman = Number(custom.replace(/[^\d]/g, "")) || 0;
  const finalBudget = customToman > 0 ? customToman : budget;
  const insufficient = finalBudget > balanceToman;

  const submit = () => {
    if (!listingId || finalBudget < 50_000 || insufficient) return;
    createMut.mutate(
      { businessId: bizId, listingId, budgetToman: finalBudget },
      {
        onSuccess: () => {
          onClose();
          toast({
            title: "کمپین فعال شد",
            description: "کالایتان از همین حالا در صف اولِ تابلوی خریدارهای همان کالا می‌نشیند.",
          });
        },
        onError: (e) =>
          toast({
            title: (e as Error).message.includes("موجودی")
              ? "موجودی کیف کافی نیست"
              : (e as Error).message || "کمپین ساخته نشد",
            description: (e as Error).message.includes("موجودی")
              ? "کیف پول را شارژ کنید و دوباره تلاش کنید."
              : undefined,
            variant: "destructive",
          }),
      }
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center" role="dialog" aria-modal="true">
      <div className="max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-t-3xl border bg-white p-5 shadow-lg sm:rounded-3xl">
        <p className="flex items-center gap-1.5 text-base font-extrabold">
          <Star className="size-4.5 fill-[#b45309] text-[#b45309]" />
          کمپین «صف اول»
        </p>
        <p className="mt-1 text-[11.5px] leading-6 text-muted-foreground">
          ۱٬۰۰۰ تومان هر نمایش هدفمند + ۵٬۰۰۰ تومان هر دنبال‌کردن — فقط به خریدارانی که هنوز
          کاتالوگ شما را ذخیره نکرده‌اند.
        </p>

        {/* انتخاب کالا */}
        <div className="mt-4">
          <p className="mb-1.5 text-[11.5px] font-bold text-muted-foreground">کدام کالا؟</p>
          {listingsQ.isLoading ? (
            <div className="grid place-items-center py-6">
              <Loader2 className="size-5 animate-spin text-primary" />
            </div>
          ) : sellable.length === 0 ? (
            <p className="rounded-xl border border-dashed p-4 text-center text-[11.5px] leading-6 text-muted-foreground">
              کالای فروشِ قیمت‌داری در کاتالوگ ندارید — اول یک کالا با قیمت ثبت کنید.
            </p>
          ) : (
            <div className="flex max-h-44 flex-col gap-1.5 overflow-y-auto">
              {sellable.map((l: GoodItemDto) => (
                <button
                  key={l.id}
                  type="button"
                  onClick={() => setListingId(l.id)}
                  className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-start transition ${
                    listingId === l.id
                      ? "border-primary bg-accent/60"
                      : "border-stone-200 hover:border-primary/40"
                  }`}
                >
                  <span className="min-w-0 grow truncate text-[12.5px] font-bold">
                    {goodName(l.good)}
                    {l.variantLabel ? ` — ${l.variantLabel}` : ""}
                  </span>
                  <span className="shrink-0 text-[11px] text-muted-foreground">
                    {fmtMoney(l.priceMinor, l.currency)}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* بودجه */}
        <div className="mt-4">
          <p className="mb-1.5 flex items-center justify-between text-[11.5px] font-bold text-muted-foreground">
            <span>بودجهٔ کمپین (تومان)</span>
            <span className="flex items-center gap-1 normal-case">
              <WalletIcon className="size-3" />
              کیف: {fa(balanceToman.toLocaleString("fa-IR"))}
            </span>
          </p>
          <div className="grid grid-cols-3 gap-2">
            {BUDGET_PACKS.map((b) => (
              <button
                key={b}
                type="button"
                onClick={() => {
                  setBudget(b);
                  setCustom("");
                }}
                className={`rounded-xl border py-2 text-[12px] font-bold transition ${
                  !custom && budget === b ? "border-primary bg-accent text-primary" : "border-stone-200 bg-white"
                }`}
              >
                {fa((b / 1000).toString())} هزار
              </button>
            ))}
          </div>
          <input
            inputMode="numeric"
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            placeholder="یا مبلغ دلخواه (حداقل ۵۰ هزار)"
            className="mt-2 h-11 w-full rounded-xl border bg-white px-3.5 text-[13px] outline-none placeholder:text-stone-400 focus:border-primary/50"
          />
        </div>

        {/* پیش‌بینی نتیجه — اعداد شهودی (طرح ۸) */}
        {finalBudget >= 50_000 && (
          <p className="mt-3 rounded-xl bg-[#fdf0da] px-3 py-2.5 text-[11px] leading-6 text-[#9a3d06]">
            با {fa(finalBudget.toLocaleString("fa-IR"))} تومان، حدود{" "}
            <b>{fa(Math.floor(finalBudget / 1000))} نمایش</b> یا{" "}
            <b>{fa(Math.floor(finalBudget / 5000))} دنبال‌کردن</b> برای کالایتان می‌خرید.
          </p>
        )}
        {insufficient && (
          <p className="mt-2 rounded-xl bg-[#fdebe8] px-3 py-2.5 text-[11px] leading-6 text-[#c0392b]">
            موجودی کیف ({fa(balanceToman.toLocaleString("fa-IR"))} تومان) کافی نیست — از کیف پول
            شارژ کنید.
          </p>
        )}

        <div className="mt-4 flex items-center gap-2">
          <Button
            className="flex-1 gap-1"
            disabled={!listingId || finalBudget < 50_000 || insufficient || createMut.isPending}
            onClick={submit}
          >
            {createMut.isPending ? <Loader2 className="size-4 animate-spin" /> : <Megaphone className="size-4" />}
            راه‌اندازی کمپین
          </Button>
          <Button variant="outline" onClick={onClose}>
            بی‌خیال
          </Button>
        </div>
      </div>
    </div>
  );
}
