"use client";

import { use, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AuthGate } from "@/components/imach/auth-gate";
import { AppShell } from "@/components/imach/app-shell";
import { Icon } from "@/components/ui/icon";
import { Sheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/input";
import { NumberInput } from "@/components/ui/number-input";
import { Spinner, EmptyState } from "@/components/ui/feedback";
import { useMessages } from "@/i18n/messages/use-messages";
import { useLocale } from "@/i18n/locale-context";
import { useAuthStore } from "@/lib/auth-store";
import { listingsApi, type GoodItemDto } from "@/lib/api";
import { goodName, num, unitLabel, currencyLabel, majorToMinor, minorToMajor } from "@/lib/format";
import { useMoney } from "@/components/imach/prefs-context";

/**
 * `/item/[id]` — اسکرین ۳۷: نمای کالا از دید مالک (M2).
 * گالری چسبان دسکتاپ + قیمت/موجودی/حداقل سفارش + بازدید ۳۰روزه + شیت ویرایش
 * با فیلدهای v2 (title/note/baseQty — C2/C5/C6). تخفیف/کمپین/قیمت سریع پیشرفته
 * در M9؛ این‌جا «قیمت سریع» با NumberInput حکم مالک انجام می‌شود.
 */

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

  const l: GoodItemDto | undefined = useMemo(
    () => (listingsQ.data ?? []).find((x) => x.id === id),
    [listingsQ.data, id]
  );

  const [editOpen, setEditOpen] = useState(false);
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
      <AppShell arm="sell" title="—">
        <EmptyState icon={<Icon name="info" size={30} />} title="کالا یافت نشد" />
      </AppShell>
    );
  }

  const name = l.title || goodName({ nameFa: l.good.nameFa, nameEn: l.good.nameEn }, locale);
  const unit = l.good?.unit ? unitLabel(l.good.unit, locale) : "";
  const imgs = (l.gallery ?? []).map((g) => g.thumbUrl ?? g.url).filter(Boolean) as string[];
  const perBase =
    l.pricePerBaseMinor != null ? fmt(l.pricePerBaseMinor, l.currency) : null;

  return (
    <AppShell arm="sell" title={name}>
      <div className="flex flex-col gap-4 lg:flex-row-reverse lg:items-start lg:gap-7">
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
                {l.stock !== null ? `${num(l.stock, locale)} ${unit}` : "—"}
              </b>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[12px] font-bold text-text-3">{m.catalog.minOrderUnit}</span>
              <b className="text-[14px] font-black text-text">
                {l.minOrder !== null ? `${num(l.minOrder, locale)} ${unit}` : "—"}
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
                <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
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
                    {l.baseQty && l.baseQty > 1 ? `هر بسته (${num(l.baseQty, locale)} ${unit})` : "قیمت"}
                  </span>
                  <b className="text-[24px] font-black leading-tight text-text">{fmt(l.priceMinor, l.currency)}</b>
                </span>
              ) : (
                <span className="rounded-full bg-amber-soft px-3 py-1.5 text-[12px] font-bold text-amber">
                  {m.catalog.noPrice}
                </span>
              )}
              {perBase && l.baseQty && l.baseQty > 1 && (
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
        </div>
      </div>

      {/* ── شیت ویرایش (فیلدهای v2) ── */}
      <EditSheet
        open={editOpen}
        onClose={() => setEditOpen(false)}
        l={l}
        bizId={bizId}
        unit={unit}
        onSaved={() => {
          void qc.invalidateQueries({ queryKey: ["listings"] });
          setEditOpen(false);
        }}
      />

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

/** شیت ویرایش — عنوان/توضیح/بسته/قیمت/موجودی/حداقل (تساوی فیلدهای ورود M1) */
function EditSheet({
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
  // ارز بومی آگهی — ورودی فرم در واحد اصلی (ایران: تومان)؛ ذخیره کوچک‌ترین واحد (ریال)
  const cur = l.currency ?? "IRR";
  const [title, setTitle] = useState(l.title ?? "");
  const [note, setNote] = useState(l.note ?? "");
  const [baseQty, setBaseQty] = useState<number | null>(l.baseQty ?? null);
  const [price, setPrice] = useState<number | null>(minorToMajor(l.priceMinor, cur));
  const [stock, setStock] = useState<number | null>(l.stock);
  const [minOrder, setMinOrder] = useState<number | null>(l.minOrder);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const save = async () => {
    setBusy(true);
    setErr(null);
    try {
      await listingsApi.saveListing({
        businessId: bizId,
        goodId: l.good.id,
        listingId: l.id,
        mode: l.mode,
        title: title.trim() || null,
        note: note.trim() || null,
        baseQty: baseQty ?? undefined,
        sell:
          l.mode !== "BUY"
            ? {
                priceMinor: price === null ? 0 : majorToMinor(price, cur),
                stock: stock ?? 0,
                minOrder: minOrder ?? 0,
              }
            : undefined,
        buy:
          l.mode !== "SELL" && l.volume != null
            ? { volume: l.volume, frequency: l.frequency ?? "MONTHLY" }
            : undefined,
      });
      onSaved();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "ذخیره نشد — دوباره تلاش کن");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet open={open} onClose={onClose} title="ویرایش کالا">
      <div className="flex flex-col gap-5 py-1">
        <Field label="عنوان در ویترین من" hint="نام مرجع کالا دست نمی‌خورد — این فقط ویترین خودت است">
          {(id) => <Input id={id} value={title} onChange={(e) => setTitle(e.target.value)} placeholder={l.good.nameFa} maxLength={120} />}
        </Field>

        <Field label="توضیح کوتاه" hint="مثلاً: تحویل از انبار تهران، بستهٔ ۵۰ کیلویی">
          {(id) => <Textarea id={id} value={note} onChange={(e) => setNote(e.target.value)} maxLength={280} rows={2} />}
        </Field>

        <Field label={`تعداد ${unit || "واحد"} در هر بسته`} hint="قیمتِ هر واحد پایه خودکار محاسبه می‌شود">
          {(id) => <NumberInput id={id} value={baseQty} onChange={setBaseQty} min={1} suffix={unit || undefined} />}
        </Field>

        {l.mode !== "BUY" && (
          <>
            <Field label={`قیمت هر بسته${baseQty && baseQty > 1 ? ` (${num(baseQty, "fa")} ${unit})` : ""} — ${currencyLabel(cur)}`} required>
              {(id) => <NumberInput id={id} value={price} onChange={setPrice} min={0} />}
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="موجودی">
                {(id) => <NumberInput id={id} value={stock} onChange={setStock} min={0} suffix={unit || undefined} />}
              </Field>
              <Field label="حداقل سفارش">
                {(id) => <NumberInput id={id} value={minOrder} onChange={setMinOrder} min={0} suffix={unit || undefined} />}
              </Field>
            </div>
          </>
        )}

        {err && <p className="text-[12px] font-bold text-red">{err}</p>}

        <div className="flex gap-2">
          <Button variant="arm" size="lg" loading={busy} onClick={() => void save()} className="flex-1">
            ذخیره
          </Button>
          <Button variant="ghost" size="lg" onClick={onClose}>
            انصراف
          </Button>
        </div>
      </div>
    </Sheet>
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
        <Field label={`قیمت هر بسته${l.baseQty && l.baseQty > 1 ? ` (${num(l.baseQty, "fa")} ${unit})` : ""} — ${currencyLabel(cur)}`} required>
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
