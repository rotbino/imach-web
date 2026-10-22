"use client";

import { use, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AuthGate } from "@/components/imach/auth-gate";
import { AppShell } from "@/components/imach/app-shell";
import { Icon } from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/input";
import { NumberInput } from "@/components/ui/number-input";
import { Spinner, EmptyState } from "@/components/ui/feedback";
import { useToast } from "@/components/ui/toast";
import { useAuthStore } from "@/lib/auth-store";
import {
  listingsApi,
  pricingApi,
  filesApi,
  type GoodItemDto,
  type PricingTier,
  type PricingItemTri,
  type FileDto,
  type UploadPhase,
} from "@/lib/api";
import { goodName, num, unitLabel, currencyLabel, majorToMinor, minorToMajor } from "@/lib/format";
import { useLocale } from "@/i18n/locale-context";
import { cn } from "@/lib/utils";

/**
 * `/item/[id]/edit` — اسکرین ۱۴: ویرایش محصول (فیکس‌بچ مالک M3 — کامل).
 *
 * حکم مالک: «هر فرمی که پیاده می‌شود یا پیاده نشود یا کامل پیاده شود» —
 * شیت ویرایش کوچکِ M2 (۵ فیلد) با این صفحهٔ مستقل جایگزین شد (قانون
 * طراحی: فرم بزرگ/چندبخشی = صفحهٔ مستقل؛ «قیمت سریع» تک‌فیلدی شیت ماند).
 *
 * بخش‌ها (بر اساس 14-sell-edit + 37-product-view پروتوتایپ):
 *  · عکس‌های محصول — آپلود چندتایی (files/upload model=Listing key=gallery
 *    replace=false) با درصد زنده + حذف تک‌عکس؛ ذخیرهٔ لحظه‌ای (عکس = عمل فایل)
 *  · قیمت هر بسته ⇄ قیمت هر واحد (هم‌گام) + موجودی + حداقل سفارش
 *  · عنوان ویترین + توضیح + بسته‌بندی (نام + تعداد در بسته)
 *  · تخفیف مشتری‌ها (گذری/همکار/قراردادی — درصد) + تخفیف حجمی پلکانی
 *    (تا ۶ پله: از/تا/درصد) — pricing/item CUSTOM؛ خالی‌کردن همه = ریست CATALOG
 *  · حذف محصول — کارت قرمز + دیالوگ «آخرین سؤال» (soft delete سرور)
 *  · نوار چسبان ذخیره — saveListing + saveItem با هم
 */

const CUST_LABEL: Record<"p" | "h" | "q", string> = {
  p: "مشتری گذری",
  h: "مشتری همکار",
  q: "مشتری قراردادی",
};

type TierRow = { from: number | null; to: number | null; pct: number | null };

export default function ItemEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <AuthGate>
      <ItemEdit id={id} />
    </AuthGate>
  );
}

function ItemEdit({ id }: { id: string }) {
  const router = useRouter();
  const businesses = useAuthStore((s) => s.businesses);
  const biz = businesses[0];
  const bizId = biz?.id ?? "";

  const listingsQ = useQuery({
    queryKey: ["listings", "mine", bizId, "all"],
    queryFn: () => listingsApi.getMyListings(bizId, { includeInactive: true }),
    enabled: !!bizId,
  });

  const l: GoodItemDto | undefined = useMemo(
    () => (listingsQ.data ?? []).find((x) => x.id === id),
    [listingsQ.data, id]
  );

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

  if (listingsQ.isLoading || !l) {
    return (
      <AppShell arm="sell" title="ویرایش محصول" back={`/item/${id}`}>
        {listingsQ.isLoading ? (
          <div className="grid place-items-center py-20">
            <Spinner className="size-7 text-arm" />
          </div>
        ) : (
          <EmptyState icon={<Icon name="info" size={30} />} title="کالا یافت نشد" />
        )}
      </AppShell>
    );
  }

  return (
    <EditForm key={l.id + String(pricingQ.dataUpdatedAt)} l={l} bizId={bizId} itemRule={itemRule} />
  );
}

function EditForm({
  l,
  bizId,
  itemRule,
}: {
  l: GoodItemDto;
  bizId: string;
  itemRule: {
    custPct: Partial<Record<"p" | "h" | "q", number>>;
    tiers: PricingTier[];
    itemTri: PricingItemTri | null;
  } | null;
}) {
  const router = useRouter();
  const qc = useQueryClient();
  const { show } = useToast();
  const { locale } = useLocale();
  const cur = l.currency ?? "IRR";
  const moneyLabel = currencyLabel(cur);
  const unit = l.good?.unit ? unitLabel(l.good.unit, locale) : "";
  const name = l.title || goodName({ nameFa: l.good.nameFa, nameEn: l.good.nameEn }, locale);

  /* ── فرم اصلی ── */
  const [title, setTitle] = useState(l.title ?? "");
  const [note, setNote] = useState(l.note ?? "");
  const [baseQty, setBaseQty] = useState<number | null>(l.baseQty ?? null);
  const [price, setPrice] = useState<number | null>(minorToMajor(l.priceMinor, cur));
  const [unitPrice, setUnitPrice] = useState<number | null>(null);
  const [stock, setStock] = useState<number | null>(l.stock);
  const [minOrder, setMinOrder] = useState<number | null>(l.minOrder);

  /* ── تخفیف مشتری‌ها (٪ برای هر نوع؛ خالی = همان تنظیمات کاتالوک) ── */
  const tri0 = itemRule?.itemTri ?? null;
  const pctOf = (k: "p" | "h" | "q"): number | null => {
    const t = tri0?.[k];
    if (t) return t.kind === "pct" ? t.valueToman : (itemRule?.custPct[k] ?? null);
    return itemRule?.custPct[k] ?? null;
  };
  const [pPct, setPPct] = useState<number | null>(pctOf("p"));
  const [hPct, setHPct] = useState<number | null>(pctOf("h"));
  const [qPct, setQPct] = useState<number | null>(pctOf("q"));

  /* ── پله‌های حجمی ── */
  const [tiers, setTiers] = useState<TierRow[]>(
    (itemRule?.tiers ?? []).map((t) => ({ from: t.from, to: t.to, pct: t.pct }))
  );

  /* ── گالری ── */
  const [gallery, setGallery] = useState<FileDto[]>(l.gallery ?? []);
  const [uploading, setUploading] = useState<{ pct: number; phase: UploadPhase } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  /* ── حذف ── */
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const hadRule =
    !!itemRule && (Object.keys(itemRule.custPct).length > 0 || (itemRule.tiers?.length ?? 0) > 0);

  /* قیمت بسته ⇄ واحد — هم‌گام (§۱.۷) */
  const setPackPrice = (v: number | null) => {
    setPrice(v);
    setUnitPrice(v !== null && baseQty && baseQty > 1 ? Math.round(v / baseQty) : null);
  };
  const setUnit = (v: number | null) => {
    setUnitPrice(v);
    setPrice(v !== null && baseQty && baseQty > 1 ? Math.round(v * baseQty) : v);
  };
  const setPackQty = (v: number | null) => {
    setBaseQty(v);
    if (v && v > 1 && price !== null) setUnitPrice(Math.round(price / v));
  };

  /* آپلود عکس — ذخیرهٔ لحظه‌ای (عمل فایل، نه بخشی از «ذخیرهٔ تغییرات») */
  const uploadFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    for (const file of Array.from(files).slice(0, 8)) {
      setUploading({ pct: 0, phase: "sending" });
      try {
        const saved = await filesApi.upload({
          file,
          model: "Listing",
          modelId: l.id,
          key: "gallery",
          replace: false,
          onProgress: (pct, phase) => setUploading({ pct, phase }),
        });
        setGallery((g) => [...g, saved]);
      } catch (e) {
        show({ text: e instanceof Error ? e.message : "عکس آپلود نشد", kind: "error" });
      }
    }
    setUploading(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  const removeImage = async (f: FileDto) => {
    try {
      await filesApi.remove(f.id);
      setGallery((g) => g.filter((x) => x.id !== f.id));
    } catch (e) {
      show({ text: e instanceof Error ? e.message : "عکس حذف نشد", kind: "error" });
    }
  };

  /* پله‌ها */
  const addTier = () => setTiers((ts) => [...ts, { from: null, to: null, pct: null }]);
  const setTier = (i: number, patch: Partial<TierRow>) =>
    setTiers((ts) => ts.map((t, idx) => (idx === i ? { ...t, ...patch } : t)));

  const validTiers = tiers.filter((t) => t.from != null && t.from > 0);

  const save = async () => {
    if (price === null || price <= 0) {
      show({ text: "قیمت هر بسته را وارد کن", kind: "error" });
      return;
    }
    setBusy(true);
    try {
      // ۱) مشخصات فروش
      await listingsApi.saveListing({
        businessId: bizId,
        goodId: l.good.id,
        listingId: l.id,
        mode: l.mode,
        title: title.trim() || null,
        note: note.trim() || null,
        baseQty: baseQty ?? undefined,
        sell: {
          priceMinor: majorToMinor(price, cur),
          stock: stock ?? 0,
          minOrder: minOrder ?? 0,
        },
      });

      // ۲) تخفیف‌های اختصاصی این کالا — خالی‌کردن همه = ریست به کاتالوگ
      const tri: PricingItemTri = {};
      if (pPct != null && pPct > 0) tri.p = { kind: "pct", valueToman: pPct };
      if (hPct != null && hPct > 0) tri.h = { kind: "pct", valueToman: hPct };
      if (qPct != null && qPct > 0) tri.q = { kind: "pct", valueToman: qPct };
      const outTiers: PricingTier[] = validTiers.map((t) => ({
        from: t.from!,
        to: t.to ?? null,
        pct: t.pct ?? 0,
      }));
      const hasCustom = Object.keys(tri).length > 0 || outTiers.length > 0;
      if (hasCustom || hadRule) {
        await pricingApi.saveItem(l.id, {
          businessId: bizId,
          mode: hasCustom ? "CUSTOM" : "CATALOG",
          ...(hasCustom ? { tri, tiers: outTiers } : {}),
        });
      }

      void qc.invalidateQueries({ queryKey: ["listings"] });
      void qc.invalidateQueries({ queryKey: ["pricing"] });
      show({ text: "تغییرات ذخیره شد", kind: "success" });
      router.push(`/item/${l.id}`);
    } catch (e) {
      show({ text: e instanceof Error ? e.message : "ذخیره نشد — دوباره تلاش کن", kind: "error" });
    } finally {
      setBusy(false);
    }
  };

  const removeListing = async () => {
    setBusy(true);
    try {
      await listingsApi.deleteListing(l.id);
      void qc.invalidateQueries({ queryKey: ["listings"] });
      show({ text: `«${name}» از کاتالوگ حذف شد`, kind: "success" });
      router.push("/catalog");
    } catch (e) {
      show({ text: e instanceof Error ? e.message : "حذف نشد — دوباره تلاش کن", kind: "error" });
      setBusy(false);
      setConfirmOpen(false);
    }
  };

  return (
    <AppShell arm="sell" title="ویرایش محصول" back={`/item/${l.id}`}>
      <div className="mx-auto flex w-full max-w-[760px] flex-col gap-5">
        {/* ═══ شناسنامهٔ محصول (14-sell-edit: picked-card) ═══ */}
        <div className="flex items-center gap-3.5 rounded-2xl border border-line bg-surface p-4">
          {gallery[0] ? (
            // eslint-disable-next-line @next/next/no-img-element -- عکس اول گالری
            <img
              src={gallery[0].thumbUrl ?? gallery[0].url}
              alt=""
              className="size-14 shrink-0 rounded-2xl border border-line object-cover"
            />
          ) : (
            <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-surface-2 text-[22px] font-black text-text-4/70">
              {name.slice(0, 1)}
            </span>
          )}
          <div className="min-w-0 flex-1">
            <b className="block truncate text-[15px] font-black text-text">{name}</b>
            <span className="mt-0.5 block truncate text-[11.5px] text-text-3">
              {l.brand ? `${l.brand.name} · ` : ""}
              {goodName({ nameFa: l.good.nameFa, nameEn: l.good.nameEn }, locale)}
              {l.variantLabel ? ` · ${l.variantLabel}` : ""}
            </span>
          </div>
        </div>

        {/* ═══ عکس‌های محصول (فیکس‌بچ مالک: تصاویر کالا) ═══ */}
        <Field label="عکس‌های محصول" hint="اولین عکس کاور کاتالوک است — ذخیرهٔ لحظه‌ای">
          {() => (
            <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4">
              {gallery.map((f) => (
                <div
                  key={f.id}
                  className="group relative aspect-square overflow-hidden rounded-xl border border-line bg-surface-2"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element -- تامبنیل گالری */}
                  <img src={f.thumbUrl ?? f.url} alt="" className="size-full object-cover" />
                  <button
                    type="button"
                    onClick={() => void removeImage(f)}
                    aria-label="حذف عکس"
                    className="absolute end-1.5 top-1.5 grid size-7 place-items-center rounded-full bg-black/55 text-white backdrop-blur-sm transition-colors hover:bg-red"
                  >
                    <Icon name="x" size={13} />
                  </button>
                </div>
              ))}
              {/* کاشی افزودن — درصد زندهٔ آپلود */}
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploading != null}
                className="grid aspect-square place-items-center gap-1 rounded-xl border-[1.5px] border-dashed border-line-2 bg-surface text-text-3 transition-colors hover:border-arm/50 hover:bg-arm-soft/40 hover:text-arm-strong disabled:opacity-60"
              >
                {uploading ? (
                  <span className="flex flex-col items-center gap-1.5">
                    <b className="text-[15px] font-black text-arm-strong">{num(uploading.pct, "fa")}٪</b>
                    <span className="text-[9.5px] font-bold text-text-4">
                      {uploading.phase === "sending" ? "در حال ارسال" : "در حال پردازش"}
                    </span>
                  </span>
                ) : (
                  <span className="flex flex-col items-center gap-1">
                    <Icon name="image" size={21} />
                    <span className="text-[10px] font-bold">افزودن عکس</span>
                  </span>
                )}
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                multiple
                hidden
                onChange={(e) => void uploadFiles(e.target.files)}
              />
            </div>
          )}
        </Field>

        {/* ═══ قیمت (با هم‌گامی قیمت واحد — الگوی ویزارد) ═══ */}
        <Field
          label={`قیمت هر بسته${baseQty && baseQty > 1 ? ` (${num(baseQty, "fa")} ${unit})` : ""} — ${moneyLabel}`}
          required
        >
          {(id) => <NumberInput id={id} value={price} onChange={setPackPrice} min={0} suffix={moneyLabel} />}
        </Field>

        {baseQty && baseQty > 1 && (
          <Field
            label={`قیمت هر ${unit || "واحد"} — ${moneyLabel}`}
            hint="خودکار حساب می‌شود — هر کدام را عوض کنی، اونیکی هم تازه می‌شود"
          >
            {(id) => <NumberInput id={id} value={unitPrice} onChange={setUnit} min={0} suffix={moneyLabel} />}
          </Field>
        )}

        <div className="flex flex-col gap-5 sm:flex-row">
          <div className="min-w-0 flex-1">
            <Field label="موجودی">
              {(id) => <NumberInput id={id} value={stock} onChange={setStock} min={0} suffix={unit || undefined} />}
            </Field>
          </div>
          <div className="min-w-0 flex-1">
            <Field label="حداقل سفارش">
              {(id) => (
                <NumberInput id={id} value={minOrder} onChange={setMinOrder} min={0} suffix={unit || undefined} />
              )}
            </Field>
          </div>
        </div>

        {/* ═══ بسته‌بندی + توضیح ═══ */}
        <Field label="بسته‌بندی فروش عمده" hint="خالی بگذاری یعنی تک‌فروشی — مثلاً: کارتن ۶۰ عددی">
          {(id) => (
            <div className="flex gap-2.5">
              <div className="min-w-0 flex-[1.4]">
                <Input
                  id={id}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="مثلاً: کارتن ۶۰ عددی"
                  maxLength={80}
                />
              </div>
              <div className="w-[150px] shrink-0">
                <NumberInput
                  value={baseQty}
                  onChange={setPackQty}
                  min={1}
                  placeholder={num(1, "fa")}
                  suffix={unit || undefined}
                  aria-label="تعداد در بسته"
                />
              </div>
            </div>
          )}
        </Field>

        <Field label="توضیحات" hint="اختیاری — شرایط فروش، پرداخت، تحویل…">
          {(id) => (
            <Textarea
              id={id}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              maxLength={280}
              placeholder="مثلاً: تحویل از انبار تهران، بستهٔ ۵۰ کیلویی"
            />
          )}
        </Field>

        {/* ═══ تخفیف مشتری‌ها (فیکس‌بچ مالک: تخفیف گروهی) ═══ */}
        <div className="rounded-2xl border border-line bg-surface p-4 lg:p-5">
          <div className="flex items-center gap-2">
            <Icon name="users" size={17} className="text-arm-strong" />
            <b className="text-[14px] font-bold text-text">تخفیف مشتری‌های این کالا</b>
          </div>
          <p className="mt-1 text-[11.5px] leading-5 text-text-3">
            درصد تخفیف به تفکیک نوع مشتری — خالی بگذاری، همان تنظیمات کاتالوک اعمال می‌شود.
          </p>
          <div className="mt-3.5 grid grid-cols-3 gap-2.5">
            {(
              [
                ["p", pPct, setPPct],
                ["h", hPct, setHPct],
                ["q", qPct, setQPct],
              ] as const
            ).map(([k, v, set]) => (
              <div key={k} className="flex flex-col gap-1.5">
                <label className="text-[11.5px] font-bold text-text-2">{CUST_LABEL[k]}</label>
                <NumberInput
                  value={v}
                  onChange={set}
                  min={0}
                  max={90}
                  placeholder="۰"
                  suffix="٪"
                  aria-label={`تخفیف ${CUST_LABEL[k]}`}
                />
              </div>
            ))}
          </div>
        </div>

        {/* ═══ تخفیف حجمی پلکانی (فیکس‌بچ مالک) ═══ */}
        <div className="rounded-2xl border border-line bg-surface p-4 lg:p-5">
          <div className="flex items-center gap-2">
            <Icon name="percent" size={17} className="text-arm-strong" />
            <b className="text-[14px] font-bold text-text">تخفیف حجمی خرید (پلکانی)</b>
          </div>
          <p className="mt-1 text-[11.5px] leading-5 text-text-3">
            با هر پلهٔ حجم، خریدار ارزان‌تر می‌خرد — مثلاً از ۱۰ کیسه ۳٪ و از ۵۰ کیسه ۷٪.
          </p>
          <div className="mt-3.5 flex flex-col gap-2">
            {tiers.map((t, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="w-[86px] shrink-0">
                  <NumberInput
                    value={t.from}
                    onChange={(v) => setTier(i, { from: v })}
                    min={1}
                    placeholder="از"
                    aria-label={`پلهٔ ${i + 1} از`}
                  />
                </div>
                <div className="w-[86px] shrink-0">
                  <NumberInput
                    value={t.to}
                    onChange={(v) => setTier(i, { to: v })}
                    min={1}
                    placeholder="تا"
                    aria-label={`پلهٔ ${i + 1} تا`}
                  />
                </div>
                <span className="shrink-0 text-[11px] font-bold text-text-4">{unit || "عدد"}</span>
                <div className="min-w-0 flex-1">
                  <NumberInput
                    value={t.pct}
                    onChange={(v) => setTier(i, { pct: v })}
                    min={0}
                    max={90}
                    placeholder="۰"
                    suffix="٪"
                    aria-label={`پلهٔ ${i + 1} درصد تخفیف`}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setTiers((ts) => ts.filter((_, idx) => idx !== i))}
                  aria-label={`حذف پلهٔ ${i + 1}`}
                  className="grid size-9 shrink-0 place-items-center rounded-full text-text-4 transition-colors hover:bg-red/10 hover:text-red"
                >
                  <Icon name="trash" size={15} />
                </button>
              </div>
            ))}
            {tiers.length === 0 && (
              <p className="rounded-xl border border-dashed border-line-2 bg-surface-2/40 px-4 py-3.5 text-center text-[12px] text-text-3">
                هنوز پله‌ای نداری — خرید عمدهٔ بزرگ‌تر بدون تخفیف می‌ماند.
              </p>
            )}
            {tiers.length < 6 && (
              <Button variant="outline" size="lg" onClick={addTier} className="self-start">
                <Icon name="plus" size={15} /> افزودن پله
              </Button>
            )}
          </div>
        </div>

        {/* ═══ حذف محصول (14-sell-edit — کارت قرمز) ═══ */}
        <div className="rounded-2xl border border-red/25 bg-red-bg/60 p-4 lg:p-5">
          <div className="flex items-center gap-2 text-red">
            <Icon name="trash" size={17} />
            <b className="text-[14px] font-bold">حذف محصول</b>
          </div>
          <p className="mt-1.5 text-[12px] leading-6 text-text-2">
            اگر این محصول را دیگر نمی‌فروشی، حذفش کن. حذف قابل بازگشت است — فقط از کاتالوگ عمومی پنهان می‌شود و تاریخچهٔ قیمت می‌ماند.
          </p>
          <Button
            variant="outline"
            size="lg"
            className="mt-3 !border-red/30 !text-red hover:!bg-red/10"
            onClick={() => setConfirmOpen(true)}
          >
            <Icon name="trash" size={15} /> حذف این محصول از کاتالوگ
          </Button>
        </div>

        {/* نوار چسبان ذخیره (14-sell-edit) */}
        <div className="sticky bottom-20 z-10 -mx-1 bg-gradient-to-t from-bg via-bg/95 to-transparent px-1 pb-2 pt-4 lg:bottom-4">
          <Button variant="arm" size="xl" block loading={busy} onClick={() => void save()}>
            <Icon name="check" size={17} /> ذخیرهٔ تغییرات
          </Button>
        </div>
      </div>

      {/* ═══ دیالوگ «آخرین سؤال» (قانون: تأیید حذف — استثنای وسط‌صفحه) ═══ */}
      {confirmOpen && (
        <div
          className="fixed inset-0 z-[80] grid place-items-center bg-black/45 p-6 backdrop-blur-[2px]"
          onClick={() => setConfirmOpen(false)}
          role="presentation"
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="تأیید حذف محصول"
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-2xl border border-line bg-surface p-5 shadow-[0_24px_70px_rgba(31,29,26,.22)]"
          >
            <div className="grid size-12 place-items-center rounded-full bg-red/10 text-red">
              <Icon name="trash" size={22} />
            </div>
            <b className="mt-3 block text-[15.5px] font-black text-text">«{name}» حذف شود؟</b>
            <p className="mt-1.5 text-[12.5px] leading-6 text-text-3">
              از کاتالوگ عمومی پنهان می‌شود؛ با ثبت دوبارهٔ همان کالا برمی‌گردد. تاریخچهٔ قیمت و استعلام‌ها می‌ماند.
            </p>
            <div className="mt-4 flex gap-2">
              <Button variant="outline" size="lg" className="flex-1" onClick={() => setConfirmOpen(false)}>
                نه، پنهان نکن
              </Button>
              <Button variant="danger" size="lg" className="flex-1" loading={busy} onClick={() => void removeListing()}>
                <Icon name="trash" size={15} /> حذف کن
              </Button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
