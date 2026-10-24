"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AuthGate } from "@/components/imach/auth-gate";
import { AppShell } from "@/components/imach/app-shell";
import { Sheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { useToast } from "@/components/ui/toast";
import { useAuthStore } from "@/lib/auth-store";
import {
  listingsApi,
  promosApi,
  walletApi,
  type PromoMineDto,
  type PromoReportDto,
  type PromoPlacement,
  type PromoType,
} from "@/lib/api";
import { fa } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * `/sell/promo` — اسکرین ۳۴: تبلیغات و افزایش فروش (M9 · سند ۰۸ §M9).
 * نوع‌دار: «کمپین فروش ویژه» با مدت ۳/۷/۱۴ روز | «هدفمند» با دو جایگاه
 * (کاتالوک‌های ذخیره‌شده / تابلوی تأمین همان کالا) — سند ۰۳ §۳.۴.
 * • شیت ساخت: انتخاب کالا (از کاتالوگ فروش خودم) + نوع + مدت/جایگاه +
 *   بودجه (تومان) — نرخ‌ها شفاف روی شیت (۱٬۰۰۰/۵٬۰۰۰)
 * • کارت‌های تبلیغ‌های من: وضعیت زنده + نوار بودجه + روزشمار پایان مدت
 * • شیت گزارش: آمار (نمایش/ذخیره/هزینه) + ریز رویدادهای بیننده‌ها (U64)
 * • توقف = REFUND باقیمانده؛ پایان مدت/بودجه خودکار (lazy سرور)
 * • wallet-mini → شارژ (۳۵)
 */
const DURATIONS: { d: 3 | 7 | 14; label: string; hint: string }[] = [
  { d: 3, label: "۳ روز", hint: "موج کوتاه — مناسب پیش‌فروش و تخفیف فوری" },
  { d: 7, label: "۷ روز", hint: "یک هفتهٔ کامل خرید عمده — متعادل‌ترین انتخاب" },
  { d: 14, label: "۱۴ روز", hint: "دو هفته حضور پیوسته — برای کالای فصلی" },
];

const PLACEMENTS: { p: PromoPlacement; label: string; hint: string }[] = [
  {
    p: "SAVED_CATALOGS",
    label: "کاتالوک‌های ذخیره‌شده",
    hint: "خریداری که کالایی مثل تو را دنبال می‌کند، ردیف تو را می‌بیند",
  },
  {
    p: "SUPPLY_BOARD",
    label: "تابلوی تأمین همان کالا",
    hint: "روی تابلوی قیمت تأمین‌کنندگان همان کالا، ردیف تو برچسب می‌گیرد",
  },
];

type ListingLite = { id: string; title: string; variantLabel?: string | null; goodName: string | null; priceMinor: number | null; isActive: boolean };

export default function SellPromoPage() {
  return (
    <AuthGate>
      <PromoContent />
    </AuthGate>
  );
}

function PromoContent() {
  const router = useRouter();
  const { show } = useToast();
  const qc = useQueryClient();
  const businesses = useAuthStore((s) => s.businesses);
  const biz = businesses[0];
  const bizId = biz?.id ?? "";

  const [createOpen, setCreateOpen] = useState(false);
  const [reportOf, setReportOf] = useState<PromoMineDto | null>(null);
  const [stopBusy, setStopBusy] = useState(false);

  const promosQ = useQuery({
    queryKey: ["promos", "mine", bizId],
    queryFn: () => promosApi.mine(bizId),
    enabled: !!bizId,
  });
  const walletQ = useQuery({
    queryKey: ["wallet", bizId],
    queryFn: () => walletApi.getWallet(bizId),
    enabled: !!bizId,
  });
  const listingsQ = useQuery({
    queryKey: ["listings", "mine", bizId, "active"],
    queryFn: () => listingsApi.getMyListings(bizId, {}),
    enabled: !!bizId && createOpen,
  });

  const promos = promosQ.data ?? [];
  const running = promos.filter((p) => p.isActive);
  const listings: ListingLite[] = useMemo(
    () =>
      (listingsQ.data ?? [])
        .filter((l) => l.isActive !== false && l.mode !== "BUY")
        .map((l) => ({
          id: l.id,
          title: l.title ?? l.variantLabel ?? l.good?.nameFa ?? "کالا",
          variantLabel: l.variantLabel,
          goodName: l.good?.nameFa ?? null,
          priceMinor: l.priceMinor,
          isActive: l.isActive !== false,
        })),
    [listingsQ.data]
  );
  // یک تبلیغ فعال به‌ازای هر کالا — کالای در جریان از فهرست انتخاب حذف می‌شود
  const busyListingIds = new Set(running.map((p) => p.listingId));
  const pickable = listings.filter((l) => !busyListingIds.has(l.id));

  const stop = async (p: PromoMineDto) => {
    if (!biz || stopBusy) return;
    setStopBusy(true);
    try {
      await promosApi.stop(biz.id, p.id);
      show({ text: "تبلیغ متوقف شد — باقیماندهٔ بودجه به کیف برگشت", kind: "success" });
      await qc.invalidateQueries({ queryKey: ["promos"] });
      await qc.invalidateQueries({ queryKey: ["wallet"] });
    } catch (e) {
      show({ text: e instanceof Error ? e.message : "توقف انجام نشد", kind: "error" });
    } finally {
      setStopBusy(false);
    }
  };

  return (
    <AppShell arm="sell" title="تبلیغات و افزایش فروش" back="/sell">
      <div className="flex flex-col gap-4">
        {/* ── توضیح (callout پروتوتایپ ۳۴) ── */}
        <section className="flex items-start gap-3 rounded-2xl border border-primary/25 bg-primary-soft/60 p-4">
          <Icon name="sparkles" size={19} className="mt-0.5 shrink-0 text-primary-strong" />
          <div className="min-w-0 text-[11.5px] leading-[2] text-text-2">
            <b className="text-text">کالاهای ویژه، در شرایط مشابه بالاتر دیده می‌شوند.</b>
            <br />
            وقتی خریدارِ هدف در شبکهٔ باز آی‌مچ به دنبال کالایی است که تو در کاتالوگت محصولی از آن را داری، ردیفت
            برجسته می‌شود — فقط وقتی از شارژت نتیجه گرفت، شارژ کم می‌شود.
          </div>
        </section>

        {/* ── wallet-mini → شارژ (۳۵) ── */}
        <button
          type="button"
          data-go-wallet
          onClick={() => router.push("/profile/wallet")}
          className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-4 text-start transition-colors hover:border-line-2"
        >
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-green-soft text-green">
            <Icon name="wallet" size={18} />
          </span>
          <span className="min-w-0 flex-1">
            <b className="block text-[13.5px] font-black text-text">
              {fa(Math.round((walletQ.data?.balanceMinor ?? 0) / 10))} تومان
            </b>
            <span className="mt-0.5 block text-[11px] text-text-3">موجودی شارژ</span>
          </span>
          <span className="shrink-0 rounded-full bg-green-soft px-2.5 py-1 text-[10.5px] font-bold text-green">افزایش</span>
        </button>

        {/* ── دکمهٔ ساخت (مهم‌ترین کنش) ── */}
        <Button variant="arm" size="lg" className="w-full" onClick={() => setCreateOpen(true)}>
          <Icon name="spark-v2" size={17} />
          ساخت تبلیغ تازه
        </Button>

        {/* ── تبلیغ‌های من ── */}
        <section className="flex flex-col gap-2.5">
          <div className="flex items-center justify-between px-1">
            <b className="text-[13px] font-bold text-text">تبلیغ‌های من</b>
            {promos.length > 0 && (
              <span className="text-[10.5px] text-text-4">{fa(running.length)} فعال از {fa(promos.length)}</span>
            )}
          </div>
          {promos.length === 0 && (
            <div className="rounded-2xl border border-dashed border-line-2 bg-surface px-4 py-9 text-center">
              <Icon name="spark-v2" size={26} className="mx-auto text-text-4" />
              <b className="mt-2 block text-[12.5px] font-bold text-text-2">هنوز تبلیغی نداری</b>
              <span className="mt-1 block text-[11px] leading-[1.9] text-text-4">
                کالای پرفروشت را ویژه کن — نمایشش به خریدارانِ همان کالا برسد
              </span>
            </div>
          )}
          <div className="flex flex-col gap-2.5">
            {promos.map((p) => (
              <PromoCard key={p.id} p={p} onReport={() => setReportOf(p)} onStop={() => void stop(p)} stopBusy={stopBusy} />
            ))}
          </div>
        </section>

        {/* ── ریز مصرف (همان زبان ۳۴) ── */}
        <section className="flex flex-col gap-2">
          <b className="px-1 text-[13px] font-bold text-text">مصرف‌ها و افزایش‌های شارژ</b>
          <div className="flex flex-col divide-y divide-line rounded-2xl border border-line bg-surface px-3.5">
            {(walletQ.data?.txns ?? []).length === 0 && (
              <div className="py-8 text-center text-[11.5px] text-text-4">هنوز مصرفی ثبت نشده است</div>
            )}
            {(walletQ.data?.txns ?? []).slice(0, 8).map((t) => {
              const positive = t.amountMinor > 0;
              return (
                <div key={t.id} data-txn-type={t.type} className="flex items-center gap-3 py-3">
                  <span
                    className={cn(
                      "grid size-9 shrink-0 place-items-center rounded-xl",
                      positive ? "bg-green-soft text-green" : "bg-surface-2 text-text-2"
                    )}
                  >
                    <Icon name={positive ? "wallet" : "eye"} size={16} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[12.5px] font-bold text-text">
                      {t.type === "CHARGE"
                        ? "شارژ کیف پول"
                        : t.type === "PROMO_SPEND"
                          ? "قفل بودجهٔ تبلیغ"
                          : t.type === "REFERRAL_REWARD"
                            ? "پاداش دعوت"
                            : "برگشت بودجهٔ تبلیغ"}
                    </div>
                    <div className="mt-0.5 truncate text-[10.5px] text-text-4">
                      {t.description ?? "—"} · {new Date(t.createdAt).toLocaleDateString("fa-IR")}
                    </div>
                  </div>
                  <b className={cn("shrink-0 text-[12.5px] font-black tabular-nums", positive ? "text-green" : "text-text-2")}>
                    {positive ? "+" : "−"} {fa(Math.abs(Math.round(t.amountMinor / 10)))}
                  </b>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      {/* ── شیت ساخت تبلیغ نوع‌دار ── */}
      {createOpen && (
        <CreatePromoSheet
          bizId={bizId}
          balanceMinor={walletQ.data?.balanceMinor ?? 0}
          pickable={pickable}
          onClose={() => setCreateOpen(false)}
          onCreated={async () => {
            setCreateOpen(false);
            await qc.invalidateQueries({ queryKey: ["promos"] });
            await qc.invalidateQueries({ queryKey: ["wallet"] });
          }}
        />
      )}

      {/* ── شیت گزارش ── */}
      {reportOf && biz && (
        <ReportSheet bizId={biz.id} promo={reportOf} onClose={() => setReportOf(null)} />
      )}
    </AppShell>
  );
}

/* ═══ کارت تبلیغ — وضعیت زنده + نوار بودجه + روزشمار ═══ */
function PromoCard({
  p,
  onReport,
  onStop,
  stopBusy,
}: {
  p: PromoMineDto;
  onReport: () => void;
  onStop: () => void;
  stopBusy: boolean;
}) {
  const pct = p.budgetMinor > 0 ? Math.min(100, Math.round((p.spentMinor / p.budgetMinor) * 100)) : 0;
  const daysLeft = p.endsAt ? Math.max(0, Math.ceil((new Date(p.endsAt).getTime() - Date.now()) / 86_400_000)) : null;
  const isCampaign = p.type === "CAMPAIGN";

  return (
    <div data-promo-card data-promo-type={p.type} data-promo-active={p.isActive} className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-4">
      <div className="flex items-start gap-3">
        <span
          className={cn(
            "grid size-10 shrink-0 place-items-center rounded-xl",
            p.isActive ? "bg-arm-soft text-arm-strong" : "bg-surface-2 text-text-3"
          )}
        >
          <Icon name={isCampaign ? "sparkles" : "textlist"} size={18} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <b className="truncate text-[13px] font-bold text-text">{p.goodName ?? "کالا"}</b>
            <span
              className={cn(
                "rounded-full px-1.5 py-0.5 text-[9.5px] font-bold",
                p.isActive ? "bg-green-soft text-green" : "bg-surface-2 text-text-3"
              )}
            >
              {p.isActive ? "در جریان" : "پایان‌یافته"}
            </span>
          </div>
          <div className="mt-1 text-[10.5px] text-text-3">
            {isCampaign
              ? `کمپین فروش ویژه · ${p.durationDays ?? "—"} روز${daysLeft !== null && p.isActive ? ` · ${fa(daysLeft)} روز مانده` : ""}`
              : `هدفمند · ${p.placement === "SUPPLY_BOARD" ? "تابلوی تأمین" : "کاتالوک‌های ذخیره‌شده"}`}
          </div>
        </div>
      </div>

      {/* نوار بودجه — خرج‌شده/باقیمانده */}
      <div className="flex flex-col gap-1.5">
        <div className="h-1.5 overflow-hidden rounded-full bg-surface-2">
          <i data-budget-bar className="block h-full rounded-full bg-arm transition-[width]" style={{ width: `${pct}%` }} />
        </div>
        <div className="flex items-center justify-between text-[10.5px] tabular-nums text-text-3">
          <span>خرج‌شده {fa(Math.round(p.spentMinor / 10))} تومان</span>
          <span>بودجه {fa(Math.round(p.budgetMinor / 10))} تومان</span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-[10.5px] text-text-4">{fa(p.eventCount)} رویداد</span>
        <div className="flex-1" />
        <Button variant="soft" size="sm" onClick={onReport}>
          <Icon name="chart" size={14} />
          گزارش
        </Button>
        {p.isActive && (
          <Button variant="outline" size="sm" disabled={stopBusy} onClick={onStop}>
            <Icon name="power" size={14} />
            توقف
          </Button>
        )}
      </div>
    </div>
  );
}

/* ═══ شیت ساخت — نوع‌دار: کمپین (مدت) | هدفمند (جایگاه) ═══ */
function CreatePromoSheet({
  bizId,
  balanceMinor,
  pickable,
  onClose,
  onCreated,
}: {
  bizId: string;
  balanceMinor: number;
  pickable: ListingLite[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const { show } = useToast();
  const [type, setType] = useState<PromoType>("CAMPAIGN");
  const [durationDays, setDurationDays] = useState<3 | 7 | 14>(7);
  const [placement, setPlacement] = useState<PromoPlacement>("SAVED_CATALOGS");
  const [listingId, setListingId] = useState("");
  const [budget, setBudget] = useState("۱۰۰٬۰۰۰");
  const [busy, setBusy] = useState(false);

  const budgetToman = parseNum(budget);
  const balanceToman = Math.round(balanceMinor / 10);
  const insufficient = budgetToman > balanceToman;
  const canCreate = !!listingId && budgetToman >= 50_000 && !insufficient && !busy;

  const create = async () => {
    if (!canCreate) return;
    setBusy(true);
    try {
      await promosApi.create(bizId, listingId, budgetToman, {
        type,
        ...(type === "CAMPAIGN" ? { durationDays } : { placement }),
      });
      show({
        text:
          type === "CAMPAIGN"
            ? `کمپین فروش ویژهٔ ${fa(durationDays)} روزه فعال شد — بودجه از کیف قفل شد`
            : "تبلیغ هدفمند فعال شد — بودجه از کیف قفل شد",
        kind: "success",
      });
      onCreated();
    } catch (e) {
      show({ text: e instanceof Error ? e.message : "تبلیغ ساخته نشد", kind: "error" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet open onClose={onClose} title="ساخت تبلیغ">
      <div className="flex flex-col gap-4">
        {/* نرخ‌های شفاف — بالای شیت (شفافیت آهنین) */}
        <div className="rounded-xl border border-line bg-surface-2 px-3.5 py-2.5 text-[10.5px] leading-[1.9] text-text-3">
          پرداخت به‌ازای نتیجه: <b className="text-text-2">۱٬۰۰۰ تومان</b> هر نمایشِ هدفمند ·{" "}
          <b className="text-text-2">۵٬۰۰۰ تومان</b> هر ذخیرهٔ حاصل — رتبهٔ تطبیق مستقل از پرداخت می‌ماند.
        </div>

        {/* نوع تبلیغ */}
        <div className="grid grid-cols-2 gap-2">
          {(
            [
              { t: "CAMPAIGN" as PromoType, label: "کمپین فروش ویژه", hint: "مدت‌دار · دیده‌شدن گسترده" },
              { t: "TARGETED" as PromoType, label: "هدفمند", hint: "یک جایگاه · جراحی‌وار" },
            ]
          ).map((o) => (
            <button
              key={o.t}
              type="button"
              data-promo-opt={o.t}
              onClick={() => setType(o.t)}
              className={cn(
                "flex flex-col gap-1 rounded-xl border p-3 text-start transition-colors",
                type === o.t ? "border-arm/50 bg-arm-soft" : "border-line bg-bg hover:border-line-2"
              )}
            >
              <b className="text-[12.5px] font-bold text-text">{o.label}</b>
              <span className="text-[10px] text-text-3">{o.hint}</span>
            </button>
          ))}
        </div>

        {/* مدت (کمپین) یا جایگاه (هدفمند) */}
        {type === "CAMPAIGN" ? (
          <div className="flex flex-col gap-2">
            <b className="text-[12px] font-bold text-text-2">مدت کمپین</b>
            <div className="grid gap-1.5">
              {DURATIONS.map((d) => (
                <button
                  key={d.d}
                  type="button"
                  data-duration={d.d}
                  onClick={() => setDurationDays(d.d)}
                  className={cn(
                    "flex items-center gap-3 rounded-xl border p-3 text-start transition-colors",
                    durationDays === d.d ? "border-arm/50 bg-arm-soft" : "border-line bg-bg hover:border-line-2"
                  )}
                >
                  <span
                    className={cn(
                      "grid size-8 shrink-0 place-items-center rounded-full text-[12px] font-black",
                      durationDays === d.d ? "bg-arm text-white" : "bg-surface-2 text-text-2"
                    )}
                  >
                    {fa(d.d)}
                  </span>
                  <span className="min-w-0">
                    <b className="block text-[12.5px] font-bold text-text">{d.label}</b>
                    <span className="mt-0.5 block text-[10px] leading-[1.7] text-text-3">{d.hint}</span>
                  </span>
                </button>
              ))}
            </div>
            <span className="text-[10px] leading-[1.8] text-text-4">
              پایان مدت = توقف خودکار + برگشتِ باقیماندهٔ بودجه به کیف
            </span>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <b className="text-[12px] font-bold text-text-2">جایگاه تبلیغ</b>
            <div className="grid gap-1.5">
              {PLACEMENTS.map((o) => (
                <button
                  key={o.p}
                  type="button"
                  data-placement={o.p}
                  onClick={() => setPlacement(o.p)}
                  className={cn(
                    "flex items-center gap-3 rounded-xl border p-3 text-start transition-colors",
                    placement === o.p ? "border-arm/50 bg-arm-soft" : "border-line bg-bg hover:border-line-2"
                  )}
                >
                  <Icon name={o.p === "SUPPLY_BOARD" ? "textlist" : "bookmark"} size={16} className="shrink-0 text-arm-strong" />
                  <span className="min-w-0">
                    <b className="block text-[12.5px] font-bold text-text">{o.label}</b>
                    <span className="mt-0.5 block text-[10px] leading-[1.7] text-text-3">{o.hint}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* کالای هدف */}
        <div className="flex flex-col gap-2">
          <b className="text-[12px] font-bold text-text-2">کالای هدف</b>
          {pickable.length === 0 ? (
            <div className="rounded-xl border border-dashed border-line-2 bg-bg px-3 py-5 text-center text-[11px] leading-[1.9] text-text-4">
              کالای فروشِ فعالِ آزاد نداری — اول کالا به کاتالوگ اضافه کن
            </div>
          ) : (
            <div className="scrollbar-none flex max-h-[168px] flex-col gap-1.5 overflow-y-auto">
              {pickable.map((l) => (
                <button
                  key={l.id}
                  type="button"
                  onClick={() => setListingId(l.id)}
                  className={cn(
                    "flex items-center gap-3 rounded-xl border p-2.5 text-start transition-colors",
                    listingId === l.id ? "border-arm/50 bg-arm-soft" : "border-line bg-bg hover:border-line-2"
                  )}
                >
                  <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-surface-2 text-[11px] font-black text-text-2">
                    {(l.goodName ?? "ک").slice(0, 1)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <b className="block truncate text-[12px] font-bold text-text">{l.title}</b>
                    <span className="mt-0.5 block truncate text-[10px] text-text-3">
                      {l.priceMinor ? `${fa(Math.round(l.priceMinor / 10))} تومان` : "بدون قیمت"}
                    </span>
                  </span>
                  {listingId === l.id && <Icon name="check" size={15} className="shrink-0 text-arm-strong" />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* بودجه */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <b className="text-[12px] font-bold text-text-2">بودجه (تومان)</b>
            <span className="text-[10px] text-text-4">موجودی: {fa(balanceToman)} تومان</span>
          </div>
          <div className="relative">
            <input
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              inputMode="numeric"
              autoComplete="off"
              placeholder="مثلاً ۱۰۰٬۰۰۰"
              aria-label="بودجهٔ تبلیغ به تومان"
              className={cn(
                "h-12 w-full rounded-xl border bg-bg ps-4 pe-14 text-[14.5px] font-bold text-text placeholder:font-normal placeholder:text-text-4 focus:outline-none focus:ring-2 focus:ring-arm/15",
                insufficient ? "border-danger/60 focus:border-danger" : "border-line focus:border-arm/50"
              )}
            />
            <span className="pointer-events-none absolute end-3.5 top-1/2 -translate-y-1/2 text-[10.5px] text-text-4">تومان</span>
          </div>
          {insufficient && (
            <span className="text-[10.5px] font-bold text-danger">موجودی کیف کافی نیست — اول شارژ کن</span>
          )}
        </div>

        <Button variant="arm" size="lg" className="w-full" disabled={!canCreate} onClick={() => void create()}>
          <Icon name="spark-v2" size={16} />
          {busy ? "در حال ساخت…" : "فعال‌سازی و قفل بودجه"}
        </Button>
      </div>
    </Sheet>
  );
}

/* ═══ شیت گزارش — آمار + ریز رویدادهای بیننده (U64) ═══ */
function ReportSheet({ bizId, promo, onClose }: { bizId: string; promo: PromoMineDto; onClose: () => void }) {
  const reportQ = useQuery({
    queryKey: ["promos", "report", bizId, promo.id],
    queryFn: () => promosApi.report(bizId, promo.id),
    enabled: !!bizId,
  });
  const r: PromoReportDto | undefined = reportQ.data;
  const viewerName = new Map((r?.viewers ?? []).map((v) => [v.id, v.name]));

  return (
    <Sheet open onClose={onClose} title={`گزارش — ${promo.goodName ?? "کالا"}`}>
      {!r ? (
        <div className="py-10 text-center text-[12px] text-text-4">در حال خواندن گزارش…</div>
      ) : (
        <div className="flex flex-col gap-4">
          {/* آمار فشرده */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { v: fa(r.stats.views), l: "نمایش هدفمند" },
              { v: fa(r.stats.follows), l: "ذخیرهٔ حاصل" },
              {
                v: r.stats.costPerFollowMinor ? fa(Math.round(r.stats.costPerFollowMinor / 10)) : "—",
                l: "هزینهٔ هر مشتری (تومان)",
              },
            ].map((s) => (
              <div key={s.l} className="flex flex-col items-center gap-1 rounded-xl border border-line bg-bg px-2 py-3">
                <b className="text-[17px] font-black leading-none text-text">{s.v}</b>
                <span className="text-center text-[9.5px] leading-[1.5] text-text-3">{s.l}</span>
              </div>
            ))}
          </div>

          {/* وضعیت بودجه */}
          <div className="flex items-center justify-between rounded-xl border border-line bg-surface-2 px-3.5 py-2.5 text-[11px]">
            <span className="text-text-3">
              {r.promo.isActive ? "در جریان" : "پایان‌یافته"} ·{" "}
              {r.promo.type === "CAMPAIGN" ? `کمپین ${r.promo.durationDays ?? "—"} روزه` : "هدفمند"}
            </span>
            <b className="tabular-nums text-text-2">
              خرج {fa(Math.round(r.promo.spentMinor / 10))} / {fa(Math.round(r.promo.budgetMinor / 10))} تومان
            </b>
          </div>

          {/* ریز رویدادها — چه کسانی، کِی، چه کردند */}
          <div className="flex flex-col gap-2">
            <b className="text-[12px] font-bold text-text-2">چه کسانی دیدند؟</b>
            {r.viewerEvents.length === 0 && (
              <div className="rounded-xl border border-dashed border-line-2 bg-bg px-3 py-5 text-center text-[11px] text-text-4">
                هنوز رویدادی ثبت نشده — نمایش اول که برسد همین‌جا می‌نشیند
              </div>
            )}
            <div className="flex flex-col divide-y divide-line rounded-xl border border-line bg-surface px-3.5">
              {r.viewerEvents.slice(0, 20).map((e, i) => (
                <div key={i} data-viewer-event={e.type} className="flex items-center gap-3 py-2.5">
                  <span
                    className={cn(
                      "grid size-8 shrink-0 place-items-center rounded-lg",
                      e.type === "FOLLOW" ? "bg-green-soft text-green" : "bg-surface-2 text-text-2"
                    )}
                  >
                    <Icon name={e.type === "FOLLOW" ? "bookmark" : "eye"} size={14} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[12px] font-bold text-text">
                      {viewerName.get(e.viewerId) ?? "خریدار"}
                    </div>
                    <div className="mt-0.5 text-[10px] text-text-4">
                      {new Date(e.at).toLocaleString("fa-IR", { dateStyle: "short", timeStyle: "short" })}
                    </div>
                  </div>
                  <span
                    className={cn(
                      "shrink-0 rounded-full px-2 py-0.5 text-[9.5px] font-bold",
                      e.type === "FOLLOW" ? "bg-green-soft text-green" : "bg-surface-2 text-text-2"
                    )}
                  >
                    {e.type === "FOLLOW" ? "ذخیره کرد" : "دید"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </Sheet>
  );
}

/* ورودی عددی تایپی: ارقام فارسی/لاتین و جداکننده‌ها را می‌فهمد (FD-26) */
function parseNum(v: string): number {
  const en = v.replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d))).replace(/[^0-9]/g, "");
  return parseInt(en || "0", 10) || 0;
}
