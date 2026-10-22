"use client";

import { use, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AuthGate } from "@/components/imach/auth-gate";
import { AppShell } from "@/components/imach/app-shell";
import { Icon } from "@/components/ui/icon";
import { Sheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { NumberInput } from "@/components/ui/number-input";
import { Spinner, EmptyState } from "@/components/ui/feedback";
import { useMessages } from "@/i18n/messages/use-messages";
import { useLocale } from "@/i18n/locale-context";
import { useAuthStore } from "@/lib/auth-store";
import { listingsApi, pricingApi, unitsApi, type GoodItemDto, type PricingTier } from "@/lib/api";
import { goodName, num, unitLabel, currencyLabel, majorToMinor, minorToMajor } from "@/lib/format";
import { resolveConsumerUnit, packShort } from "@/lib/units";
import { useMoney } from "@/components/imach/prefs-context";

/**
 * `/item/[id]` — اسکرین ۳۷: نمای کالا از دید مالک (M2 + فیکس‌بچ مالک M3:
 * «هر فرمی که پیاده می‌شود یا پیاده نشود یا کامل پیاده شود»).
 *
 * · گالری (همهٔ عکس‌ها؛ اولی قاب اصلی) + قیمت/موجودی/حداقل + بازدید ۳۰روزه
 * · تخفیف‌های کالا (فیکس‌بچ M3): کارت «تخفیف حجمی خرید» (پله‌ها — بهترین پله
 *   سبز؛ الگوی pv-tiers پروتوتایپ ۳۷) + کارت تخفیف مشتری‌ها به تفکیک نوع
 *   (گذری/همکار/قراردادی) — هر دو از /pricing/state زنده
 * · «قیمت سریع» می‌ماند (پرکاربردترین اقدام — FD-35، فرم تک‌فیلدی = شیت)
 * · «ویرایش» = صفحهٔ مستقل /item/[id]/edit (قانون مالک: فرم بزرگ = صفحه؛
 *   شیت کوچک قبلی جایگزین شد) — تصاویر + تخفیف پلکانی/گروهی + حذف کالا
 */

const CUST_LABEL: Record<"p" | "h" | "q", string> = {
  p: "مشتری گذری",
  h: "مشتری همکار",
  q: "مشتری قراردادی",
};

export default function ItemPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <AuthGate>
      <ItemContent id={id} />
    </AuthGate>
  );
}

function ItemContent({ id }: { id: string }) {
  const router = useRouter();
  const m = useMessages();
  const { locale } = useLocale();
  const { fmt } = useMoney();
  const qc = useQueryClient();
  const businesses = useAuthStore((s) => s.businesses);
  const biz = businesses[0];
  const bizId = biz?.id ?? "";

  const listingsQ = useQuery({
    queryKey: ["listings", "mine", bizId, "all"],
    queryFn: () => listingsApi.getMyListings(bizId, { includeInactive: true }),
    enabled: !!bizId,
  });

  /* مدل واحد ۱۰۲۶ — واحد مصرف‌کننده از جدول Unit (دادهٔ قدیمی SACK/CARTON
   * → کیلو/عدد)؛ کش عمومی UnitsBoot */
  const unitsQ = useQuery({
    queryKey: ["units", "all"],
    queryFn: () => unitsApi.list(),
    staleTime: 24 * 3600_000,
  });

  const l: GoodItemDto | undefined = useMemo(
    () => (listingsQ.data ?? []).find((x) => x.id === id),
    [listingsQ.data, id]
  );

  // فیکس‌بچ M3 — قاعدهٔ تخفیف اختصاصی همین کالا (پله‌ها + درصد مشتری‌ها)
  const pricingQ = useQuery({
    queryKey: ["pricing", "state", bizId],
    queryFn: () => pricingApi.state(bizId),
    enabled: !!bizId && !!l,
    staleTime: 30_000,
  });
  const itemRule = useMemo(
    () => (pricingQ.data?.items ?? []).find((it) => it.listingId === id)?.rule ?? null,
    [pricingQ.data, id]
  );
  const tiers: PricingTier[] = itemRule?.tiers ?? [];
  const custPct = itemRule?.custPct ?? {};
  const bestTierIdx = tiers.reduce((best, t, i) => (t.pct > (tiers[best]?.pct ?? -1) ? i : best), 0);

  const [quickOpen, setQuickOpen] = useState(false);

  if (listingsQ.isLoading) {
    return (
      <AppShell arm="sell" title="…">
        <div className="grid place-items-center py-20">
          <Spinner className="size-7 text-arm" />
        </div>
      </AppShell>
    );
  }

  if (!l) {
    return (
      <AppShell arm="sell" title="—" wide back="/catalog">
        <EmptyState icon={<Icon name="info" size={30} />} title="کالا یافت نشد" />
      </AppShell>
    );
  }

  const name = l.title || goodName({ nameFa: l.good.nameFa, nameEn: l.good.nameEn }, locale);
  const consumerKey = resolveConsumerUnit(l.good?.unit, unitsQ.data);
  const unit = unitLabel(consumerKey, locale);
  /* بستهٔ انتخابی (۱۰۲۶): «کیسهٔ ۵۰ کیلویی» — لیبل قیمت و پسوند موجودی */
  const packLabel = l.packaging?.[0]?.label ?? null;
  const packQty = l.packaging?.[0]?.qty ?? l.baseQty ?? null;
  const stockUnit = packLabel ? packShort(packLabel) ?? unit : unit;
  const imgs = (l.gallery ?? []).map((g) => g.thumbUrl ?? g.url).filter(Boolean) as string[];
  const perBase =
    l.pricePerBaseMinor != null ? fmt(l.pricePerBaseMinor, l.currency) : null;

  return (
    <AppShell arm="sell" title={name} wide back="/catalog">
      {/* lg:flex-row ساده — در RTL ستون شناسه (فرزند اول) سمت راست می‌نشیند
          (رفع باگ RTL مالک، هم‌الگوی AppShell)؛ در LTR آینه‌ای سمت چپ */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:gap-7">
        {/* ── ستون شناسه (راست/چسبان دسکتاپ — dk-detail) ── */}
        <div className="flex flex-col gap-3 lg:sticky lg:top-20 lg:w-[340px] lg:shrink-0">
          <div className="overflow-hidden rounded-2xl border border-line bg-surface">
            <div className="relative aspect-[4/3] bg-surface-2">
              {imgs.length > 0 ? (
                // eslint-disable-next-line @next/next/no-img-element -- گالری ساده با اسکرول افقی
                <img src={imgs[0]} alt={name} className="size-full object-cover" />
              ) : (
                <div className="grid size-full place-items-center text-[56px] font-black text-text-4/70">
                  {name.slice(0, 1)}
                </div>
              )}
              {imgs.length > 1 && (
                <div className="absolute bottom-2 start-1/2 flex -translate-x-1/2 gap-1 rtl:translate-x-1/2">
                  {imgs.slice(0, 6).map((src, i) => (
                    // eslint-disable-next-line @next/next/no-img-element -- تامبنیل گالری
                    <img key={src + i} src={src} alt="" className="size-9 rounded-md border-2 border-white object-cover" />
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-2.5 rounded-2xl border border-line bg-surface p-4">
            <div className="flex items-center justify-between">
              <span className="text-[12px] font-bold text-text-3">{m.catalog.views30}</span>
              <b className="text-[14px] font-black text-text">{num(l.viewCount30 ?? 0, locale)}</b>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[12px] font-bold text-text-3">{m.catalog.stockUnit}</span>
              <b className="text-[14px] font-black text-text">
                {l.stock !== null ? `${num(l.stock, locale)} ${stockUnit}` : "—"}
              </b>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[12px] font-bold text-text-3">{m.catalog.minOrderUnit}</span>
              <b className="text-[14px] font-black text-text">
                {l.minOrder !== null ? `${num(l.minOrder, locale)} ${stockUnit}` : "—"}
              </b>
            </div>
          </div>
        </div>

        {/* ── جریان اصلی ── */}
        <div className="flex min-w-0 flex-1 flex-col gap-4">
          <div className="rounded-2xl border border-line bg-surface p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="text-[18px] font-black text-text">{name}</h2>
                {l.variantLabel && <p className="mt-1 text-[12.5px] text-text-3">{l.variantLabel}</p>}
                {l.brand && <p className="mt-0.5 text-[12px] text-text-3">{l.brand.name}</p>}
              </div>
              <div className="flex gap-2">
                <Button variant="arm" size="sm" onClick={() => setQuickOpen(true)}>
                  <Icon name="tag" size={15} />
                  قیمت سریع
                </Button>
                <Button variant="outline" size="sm" onClick={() => router.push(`/item/${l.id}/edit`)}>
                  <Icon name="pencil" size={15} />
                  ویرایش
                </Button>
              </div>
            </div>

            {/* قیمت — واحد اصلی + هر واحد پایه (C1/C5) */}
            <div className="mt-4 flex flex-wrap items-end gap-x-6 gap-y-2 border-t border-dashed border-line pt-4">
              {l.priceMinor !== null ? (
                <span className="flex flex-col">
                  <span className="text-[11.5px] font-bold text-text-3">
                    {packLabel
                      ? `هر ${packLabel}`
                      : packQty && packQty > 1
                        ? `هر بسته (${num(packQty, locale)} ${unit})`
                        : `هر ${unit || "واحد"}`}
                  </span>
                  <b className="text-[24px] font-black leading-tight text-text">{fmt(l.priceMinor, l.currency)}</b>
                </span>
              ) : (
                <span className="rounded-full bg-amber-soft px-3 py-1.5 text-[12px] font-bold text-amber">
                  {m.catalog.noPrice}
                </span>
              )}
              {perBase && packQty && packQty > 1 && (
                <span className="flex flex-col">
                  <span className="text-[11.5px] font-bold text-text-3">هر {unit}</span>
                  <b className="text-[16px] font-black leading-tight text-arm-strong">{perBase}</b>
                </span>
              )}
            </div>

            {l.note && (
              <p className="mt-3 rounded-xl bg-surface-2 px-3.5 py-2.5 text-[12.5px] leading-6 text-text-2">
                {l.note}
              </p>
            )}
          </div>

          {/* ── تخفیف حجمی خرید (فیکس‌بچ M3 — الگوی pv-tiers پروتوتایپ ۳۷) ── */}
          {tiers.length > 0 && (
            <div className="rounded-2xl border border-line bg-surface p-5">
              <div className="flex items-center gap-2">
                <Icon name="percent" size={17} className="text-arm-strong" />
                <b className="text-[14px] font-bold text-text">تخفیف حجمی خرید</b>
                <span className="rounded-full bg-arm-soft px-2 py-0.5 text-[10.5px] font-bold text-arm-strong">
                  {num(tiers.length, "fa")} پله
                </span>
              </div>
              <div className="mt-3 flex flex-col">
                {tiers.map((t, i) => (
                  <div
                    key={`${t.from}-${t.to}`}
                    className={`flex items-center justify-between rounded-xl px-3.5 py-2.5 ${
                      i === bestTierIdx ? "bg-green-soft" : "bg-surface-2/60"
                    }`}
                  >
                    <span className="text-[13px] font-bold text-text-2">
                      {t.to == null
                        ? `از ${num(t.from, "fa")} ${stockUnit} به بالا`
                        : `${num(t.from, "fa")} تا ${num(t.to, "fa")} ${stockUnit}`}
                    </span>
                    <b
                      className={`text-[14px] font-black ${
                        i === bestTierIdx ? "text-green" : "text-arm-strong"
                      }`}
                    >
                      {num(t.pct, "fa")}٪ تخفیف
                    </b>
                  </div>
                ))}
              </div>
              <p className="mt-2.5 text-[11px] leading-5 text-text-4">
                تخفیف روی حجمِ همین کالا در سفارش اعمال می‌شود — پلهٔ بهتر سبز است.
              </p>
            </div>
          )}

          {/* ── تخفیف مشتری‌ها (فیکس‌بچ M3 — سطح کالا؛ الگوی «قیمت برای تو» ۳۷) ── */}
          {Object.keys(custPct).length > 0 && (
            <div className="rounded-2xl border border-line bg-surface p-5">
              <div className="flex items-center gap-2">
                <Icon name="users" size={17} className="text-arm-strong" />
                <b className="text-[14px] font-bold text-text">تخفیف مشتری‌های این کالا</b>
              </div>
              <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
                {(["p", "h", "q"] as const)
                  .filter((k) => custPct[k] != null)
                  .map((k) => (
                    <div key={k} className="rounded-xl bg-surface-2/60 px-3.5 py-2.5 text-center">
                      <p className="text-[11px] font-bold text-text-3">{CUST_LABEL[k]}</p>
                      <b className="mt-0.5 block text-[16px] font-black text-arm-strong">
                        {num(custPct[k]!, "fa")}٪
                      </b>
                    </div>
                  ))}
              </div>
              <p className="mt-2.5 text-[11px] leading-5 text-text-4">
                نوع مشتری را در دفتر مشتریان تعیین می‌کنی — این تخفیف مخصوصِ همین کالا است.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ── شیت قیمت سریع ── */}
      <QuickPriceSheet
        open={quickOpen}
        onClose={() => setQuickOpen(false)}
        l={l}
        bizId={bizId}
        unit={unit}
        onSaved={() => {
          void qc.invalidateQueries({ queryKey: ["listings"] });
          setQuickOpen(false);
        }}
      />
    </AppShell>
  );
}

/** قیمت سریع — فقط قیمت بسته (FD-35: پرکاربردترین اقدام) */
function QuickPriceSheet({
  open,
  onClose,
  l,
  bizId,
  unit,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  l: GoodItemDto;
  bizId: string;
  unit: string;
  onSaved: () => void;
}) {
  // ارز بومی — ورودی تومان/واحد اصلی؛ ذخیره کوچک‌ترین واحد (ریال)
  const cur = l.currency ?? "IRR";
  const [price, setPrice] = useState<number | null>(minorToMajor(l.priceMinor, cur));
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  /* مدل واحد ۱۰۲۶ — لیبل با نام بستهٔ واقعی */
  const packLabel = l.packaging?.[0]?.label ?? null;
  const packQty = l.packaging?.[0]?.qty ?? l.baseQty ?? null;

  const save = async () => {
    if (price === null) return;
    setBusy(true);
    setErr(null);
    try {
      await listingsApi.saveListing({
        businessId: bizId,
        goodId: l.good.id,
        listingId: l.id,
        mode: l.mode,
        title: l.title ?? undefined,
        sell: { priceMinor: majorToMinor(price, cur), stock: l.stock ?? 0, minOrder: l.minOrder ?? 0 },
        buy: l.mode !== "SELL" && l.volume != null ? { volume: l.volume, frequency: l.frequency ?? "MONTHLY" } : undefined,
      });
      onSaved();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "ذخیره نشد");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet open={open} onClose={onClose} title="قیمت سریع">
      <div className="flex flex-col gap-5 py-1">
        <Field
          label={`قیمت هر ${
            packLabel ?? (packQty && packQty > 1 ? `بسته (${num(packQty, "fa")} ${unit})` : `${unit || "واحد"}`)
          } — ${currencyLabel(cur)}`}
          required
        >
          {(id) => <NumberInput id={id} value={price} onChange={setPrice} min={0} autoFocus />}
        </Field>
        {l.priceMinor !== null && price !== null && price !== minorToMajor(l.priceMinor, cur) && (
          <p className="text-[12px] leading-5 text-text-3">
            از {num(minorToMajor(l.priceMinor, cur) ?? 0, "fa")} به {num(price, "fa")} {currencyLabel(cur)} تغییر می‌کند و اعتبار قیمت تازه می‌شود.
          </p>
        )}
        {err && <p className="text-[12px] font-bold text-red">{err}</p>}
        <Button variant="arm" size="lg" loading={busy} disabled={price === null} onClick={() => void save()}>
          ذخیره قیمت
        </Button>
      </div>
    </Sheet>
  );
}
