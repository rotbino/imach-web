"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import {
  ApiError,
  type AggregatedItemDto,
  type CatalogItemDto,
  type CatalogSummaryDto,
  type ProductRowDto,
} from "@/lib/api";
import { businessesApi, listingsApi, productsApi } from "@/lib/api";
import { useBulkSaveListings, useUploadFile } from "@/lib/queries";
import { CURRENCIES, currencyLabel, fa, fmtMoney, goodName, unitLabel } from "@/lib/format";
import { useMessages } from "@/i18n/messages/use-messages";
import { useLocale } from "@/i18n/locale-context";
import type { LocaleDef } from "@/i18n/config";
import { useAuthStore } from "@/lib/auth-store";
import { useActiveBusiness } from "@/lib/active-biz";
import { iranCityItems, provinceOfCity } from "@/lib/iran-geo";
import { NumberInput } from "@/components/number-input";
import { BrandStrip, CategoryStrip } from "@/app/components/brand-strip";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Check,
  Copy,
  ImagePlus,
  Library,
  Loader2,
  PackageSearch,
  Plus,
  Search,
  Store,
  X,
} from "lucide-react";

/**
 * ─── انتخابگر کاتالوگ‌ها ─────────────────────────────────────────────────────
 * دو منبع، یک صف:
 *
 *   ۱. «از هم‌صنف‌ها» (پیش‌فرض) — کاتالوگ تجمیعی هم‌صنف‌ها: صنف خودت را سرچ
 *      کن، سیستم همه‌ی کاتالوگ‌های هم‌صنفِ همان شهر/استان/کشور را پیدا می‌کند،
 *      کالاهایشان را fetch و یونیک می‌کند، با نوار برند و نوار دسته قابل
 *      فیلتر نشان می‌دهد. تیک بزن → کپی به کاتالوگ خودت بیاید.
 *
 *      اگر صنف خودت را هنوز وارد نکرده‌ای، یک مدال کوچک باز می‌شود.
 *
 *   ۲. «از کاتالوگ مرجع» — جست‌وجو + فیلتر برند روی لیست مشترک SKUها.
 *
 * هیچ منبعی بن‌بست نیست — کالای غایب با ثبت تکی ساخته می‌شود و دفعه‌ی بعد
 * همین‌جا ظاهر می‌شود (رشد ارگانیک، همان قرارداد همیشگی).
 */

type Draft = { price?: number | null; stock?: number | null; minOrder?: number | null; volume?: number | null };

export function CatalogPicker({
  bizId,
  currency,
  arm,
  onDone,
  onSwitchToSolo,
}: {
  bizId: string;
  currency: string;
  /** بازوی هدف این دفعه — انتخابگر هر بار یک بازو را پر می‌کند */
  arm: "sell" | "buy";
  onDone: (kind: "sell" | "buy") => void;
  onSwitchToSolo: () => void;
}) {
  const m = useMessages();
  const [source, setSource] = useState<"copy" | "ref">("copy");

  return (
    <div className="rounded-2xl border bg-white shadow-sm">
      <div className="p-6">
        {/* دو منبع — کوچک و بی‌سر و صدا، بالای کارت */}
        <div className="mx-auto mb-4 flex w-fit gap-1 rounded-full border bg-accent/30 p-1">
          <SourceTab active={source === "copy"} onClick={() => setSource("copy")} icon={<Copy className="size-3.5" />} label={m.picker.sourceCopy} />
          <SourceTab active={source === "ref"} onClick={() => setSource("ref")} icon={<Library className="size-3.5" />} label={m.picker.sourceRef} />
        </div>

        {source === "copy" ? (
          <CopyFromPeers bizId={bizId} arm={arm} onDone={onDone} onSwitchToSolo={onSwitchToSolo} />
        ) : (
          <ReferencePicker bizId={bizId} currency={currency} arm={arm} onDone={onDone} onSwitchToSolo={onSwitchToSolo} />
        )}
      </div>
    </div>
  );
}

function SourceTab({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold transition ${
        active ? "bg-white text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// منبع ۱ — کاتالوگ تجمیعی هم‌صنف‌ها (Aggregated Catalog)
// ─────────────────────────────────────────────────────────────────────────────

type CatalogGridRow = {
  productId: string;
  label: string;
  goodName: string;
  brandName: string | null;
  thumbUrl: string | null;
  price: number | null;
  stock: number | null;
  minOrder: number | null;
  volume: number | null;
  sourceListingId?: string;
};

const CAT_GRID_SELL = "28px 32px 44px minmax(160px,1.5fr) minmax(110px,0.8fr) minmax(85px,0.6fr) minmax(85px,0.6fr)";
const CAT_GRID_BUY  = "28px 32px 44px minmax(160px,1.5fr) minmax(110px,0.8fr) minmax(90px,0.6fr)";

export function CopyFromPeers({
  bizId,
  arm,
  onDone,
  onSwitchToSolo,
}: {
  bizId: string;
  arm: "sell" | "buy";
  onDone: (kind: "sell" | "buy") => void;
  onSwitchToSolo: () => void;
}) {
  const { toast } = useToast();
  const m = useMessages();
  const { locale } = useLocale();
  const active = useActiveBusiness();
  const bulk = useBulkSaveListings();

  const curDef = CURRENCIES[active?.currency ?? "IRR"] ?? CURRENCIES.IRR;
  const curName = currencyLabel(active?.currency ?? "IRR", locale);
  const numLocale: "fa" | "en" = locale === "en" ? "en" : "fa";
  const CAT_GRID_COLS = arm === "sell" ? CAT_GRID_SELL : CAT_GRID_BUY;
  const inputCls = "h-8 rounded border-stone-200 bg-stone-50/50 px-2 text-xs hover:border-stone-300 focus:border-primary focus:bg-white";

  // ── جست‌وجوی کاتالوگ‌ها — با نام کسب‌وکار یا صنف
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), 300);
    return () => clearTimeout(t);
  }, [query]);

  // ── پیش‌فرض: صنف خودم را جست‌وجو کن
  const myTrade = active?.trade ?? "";
  const effectiveQuery = debounced || myTrade;

  // ── لیست کاتالوگ‌ها — با searchCatalogs
  const catalogsQ = useQuery({
    queryKey: ["catalogs", effectiveQuery, bizId],
    queryFn: () => businessesApi.searchCatalogs({ q: effectiveQuery || undefined, mineId: bizId, limit: 20 }),
    staleTime: 30_000,
  });

  // ── کاتالوگ انتخاب‌شده — وقتی کاربر روی یکی کلیک می‌کند
  const [selectedCatalog, setSelectedCatalog] = useState<CatalogSummaryDto | null>(null);
  const [catalogItems, setCatalogItems] = useState<CatalogItemDto[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);

  // ── گرید تأیید — قلم‌های انتخاب‌شده از کاتالوگ‌ها
  const [gridRows, setGridRows] = useState<CatalogGridRow[]>([]);
  const gridProductIds = useMemo(() => new Set(gridRows.map((r) => r.productId)), [gridRows]);

  const loadCatalogItems = async (biz: CatalogSummaryDto) => {
    setSelectedCatalog(biz);
    setLoadingItems(true);
    setCatalogItems([]);
    try {
      let allItems: CatalogItemDto[] = [];
      let cursor: string | undefined = undefined;
      // لود همه‌ی قلم‌های کاتالوگ (صفحه‌بندی تا ۵ صفحه)
      for (let i = 0; i < 5; i++) {
        const res = await businessesApi.getCatalogItems({ businessId: biz.id, cursor, limit: 50 });
        const mode = arm === "sell" ? "SELL" : "BUY";
        const filtered = res.items.filter((it) => it.mode === mode || it.mode === "BOTH");
        allItems = [...allItems, ...filtered];
        if (!res.nextCursor) break;
        cursor = res.nextCursor;
      }
      setCatalogItems(allItems);
    } catch (err) {
      toast({
        title: "بارگیری کاتالوگ ناموفق بود",
        description: err instanceof ApiError ? err.message : undefined,
        variant: "destructive",
      });
    } finally {
      setLoadingItems(false);
    }
  };

  const toggleItem = (item: CatalogItemDto) => {
    const productId = item.productId;
    if (!productId) return;
    if (gridProductIds.has(productId)) {
      setGridRows((r) => r.filter((x) => x.productId !== productId));
    } else {
      // ── کپی عینا از کاتالوگ مبدا: قیمت، موجودی، حداقل سفارش، عکس
      // کاربر می‌تواند بعداً ویرایش کند، ولی پیش‌فرض همان مقادیر مبدا است
      setGridRows((r) => [...r, {
        productId,
        label: item.variantLabel ?? goodName(item.good, locale),
        goodName: goodName(item.good, locale),
        brandName: item.brandName,
        thumbUrl: item.thumbUrl,
        price: item.priceMinor ? Math.round(item.priceMinor / 10 ** curDef.exp) : null,
        stock: item.stock,
        minOrder: item.minOrder,
        volume: null,
        sourceListingId: item.id,
      }]);
    }
  };

  const updateGridRow = (productId: string, patch: Partial<CatalogGridRow>) =>
    setGridRows((r) => r.map((row) => (row.productId === productId ? { ...row, ...patch } : row)));

  const removeGridRow = (productId: string) =>
    setGridRows((r) => r.filter((row) => row.productId !== productId));

  const incompleteCount = useMemo(() => {
    if (arm === "sell") {
      return gridRows.filter((r) => !(r.price && r.price > 0 && (r.stock ?? 0) >= 0 && r.minOrder && r.minOrder > 0)).length;
    }
    return gridRows.filter((r) => !(r.volume && r.volume > 0)).length;
  }, [gridRows, arm]);
  const selectedCount = gridRows.length - incompleteCount;

  const confirm = async () => {
    if (gridRows.length === 0) return;
    try {
      const items = gridRows.map((r) => ({
        productId: r.productId,
        // ── sourceListingId برای کپی عکس‌های گالری از آگهی مبدا
        ...(r.sourceListingId ? { sourceListingId: r.sourceListingId } : {}),
        ...(arm === "sell"
          ? {
              priceMinor: r.price ? Math.round(r.price * 10 ** curDef.exp) : undefined,
              stock: r.stock ?? undefined,
              minOrder: r.minOrder ?? undefined,
            }
          : { volume: r.volume ?? undefined }),
      }));
      const res = await bulk.mutateAsync({ businessId: bizId, mode: arm === "sell" ? "SELL" : "BUY", items });
      toast({ title: m.picker.successTitle.replace("{n}", fa(res.saved)) });
      if (res.failed > 0) toast({ title: m.picker.submitFailed.replace("{n}", fa(res.failed)), variant: "destructive" });
      onDone(arm);
    } catch (err) {
      toast({
        title: m.picker.submitFailed.replace("{n}", fa(gridRows.length)),
        description: err instanceof ApiError ? err.message : undefined,
        variant: "destructive",
      });
    }
  };

  // اگر کاتالوگی انتخاب نشده، لیست کاتالوگ‌ها را نشان بده
  if (!selectedCatalog) {
    return (
      <>
        <div className="flex items-center gap-2">
          <Copy className="size-5 shrink-0 text-primary" />
          <h1 className="text-lg font-extrabold">{m.picker.sourceCopy}</h1>
        </div>
        <p className="mt-2 text-xs leading-6 text-muted-foreground">
          {m.picker.copyIntro}
        </p>

        {/* جست‌وجو */}
        <div className="relative mt-4">
          <Search className="pointer-events-none absolute end-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            aria-label={m.picker.copySearchAria}
            placeholder="نام کاتالوگ، کسب‌وکار یا صنف… مثلا سوپرمارکت"
            value={query}
            maxLength={40}
            onChange={(e) => setQuery(e.target.value)}
            className="h-11 pe-9 text-base"
          />
        </div>

        {/* اگر جست‌وجو خالی است و صنف دارد، نشان بده که با صنف خودت جست‌وجو می‌کند */}
        {!debounced && myTrade && (
          <p className="mt-2 text-[11px] text-muted-foreground">
            پیش‌فرض: کاتالوگ‌های «{myTrade}» — برای جست‌وجوی دیگر، بنویس.
          </p>
        )}

        {/* لیست کاتالوگ‌ها */}
        {catalogsQ.isLoading || catalogsQ.isFetching ? (
          <p className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> در حال بارگیری…
          </p>
        ) : (catalogsQ.data?.items ?? []).length === 0 ? (
          <div className="mt-4 rounded-xl border border-dashed p-6 text-center">
            <Store className="mx-auto size-6 text-primary/60" />
            <p className="mt-2 text-sm font-bold">کاتالوگی پیدا نشد</p>
            <p className="mt-1 text-[11px] leading-5 text-muted-foreground">
              نام دیگری را امتحان کن یا صنف خودت را در پروفایل کامل کن.
            </p>
          </div>
        ) : (
          <div className="mt-4 divide-y">
            {(catalogsQ.data?.items ?? []).map((biz) => (
              <button
                key={biz.id}
                type="button"
                onClick={() => void loadCatalogItems(biz)}
                className="flex w-full items-center gap-3 rounded-lg px-1 py-3 text-start transition hover:bg-accent/30"
              >
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent/70 text-sm font-black text-primary/80">
                  {biz.name.slice(0, 1)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-extrabold">{biz.name}</span>
                  <span className="block truncate text-[11px] text-muted-foreground">
                    {biz.trade ?? "—"} · {biz.city} · {fa(biz.catalogCount)} کالا
                  </span>
                </span>
                <ArrowLeft className="size-4 shrink-0 text-muted-foreground rtl:rotate-180" />
              </button>
            ))}
          </div>
        )}

        {/* گرید تأیید — وقتی قلم‌ای انتخاب شده */}
        {gridRows.length > 0 && (
          <div className="mt-6 rounded-xl border p-3">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-bold">{fa(gridRows.length)} کالا انتخاب شد</p>
              <Button size="sm" onClick={() => void confirm()} disabled={bulk.isPending || selectedCount === 0}>
                {bulk.isPending ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
                ثبت {fa(selectedCount)} کالا
              </Button>
            </div>
            <div className="space-y-1">
              {gridRows.map((r) => (
                <div key={r.productId} className="flex items-center gap-2 rounded-lg bg-accent/30 px-2 py-1.5 text-xs">
                  <span className="truncate font-bold">{r.goodName}</span>
                  {r.brandName && <span className="text-muted-foreground">· {r.brandName}</span>}
                  <button
                    type="button"
                    onClick={() => removeGridRow(r.productId)}
                    className="ms-auto grid size-5 place-items-center rounded text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  >
                    <X className="size-3.5" />
                  </button>
                </div>
              ))}
            </div>
            {incompleteCount > 0 && (
              <p className="mt-2 text-center text-[11px] text-muted-foreground">
                {fa(incompleteCount)} کالا ناقص است — بعد از انتخاب کاتالوگ، مقادیر را پر کن
              </p>
            )}
          </div>
        )}

        <p className="mt-4 text-center text-[11px] leading-5 text-muted-foreground">
          {m.picker.notHere}{" "}
          <button type="button" onClick={onSwitchToSolo} className="font-bold text-primary underline-offset-2 hover:underline">
            {m.picker.switchToForm}
          </button>
        </p>
      </>
    );
  }

  // ── کاتالوگ انتخاب شده — لیست کالاهاش با تیک
  return (
    <>
      {/* هدر — بازگشت به لیست کاتالوگ‌ها */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => { setSelectedCatalog(null); setCatalogItems([]); }}
          aria-label={m.picker.back}
          className="grid size-8 shrink-0 place-items-center rounded-lg text-muted-foreground transition hover:bg-accent hover:text-foreground"
        >
          <ArrowRight className="size-4 rtl:rotate-180" />
        </button>
        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-extrabold">{selectedCatalog.name}</p>
          <p className="truncate text-[11px] text-muted-foreground">
            {selectedCatalog.trade ?? "—"} · {selectedCatalog.city} · {fa(catalogItems.length)} کالا
          </p>
        </div>
      </div>

      {/* لیست کالاها — تیک بزن تا به گرید بیاید */}
      {loadingItems ? (
        <p className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> در حال بارگیری کالاها…
        </p>
      ) : catalogItems.length === 0 ? (
        <div className="mt-4 rounded-xl border border-dashed p-6 text-center">
          <Store className="mx-auto size-6 text-primary/60" />
          <p className="mt-2 text-sm font-bold">کالایی در این کاتالوگ نیست</p>
        </div>
      ) : (
        <div className="mt-4 divide-y">
          {catalogItems.map((item) => {
            const isPicked = item.productId ? gridProductIds.has(item.productId) : false;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => toggleItem(item)}
                className={`flex w-full items-center gap-3 rounded-lg px-1 py-3 text-start transition ${isPicked ? "bg-accent/40" : "hover:bg-accent/30"}`}
              >
                <span className="size-10 shrink-0 overflow-hidden rounded-xl bg-accent/70">
                  {item.thumbUrl ? (
                    <Image src={item.thumbUrl} alt="" width={40} height={40} unoptimized className="size-full object-cover" />
                  ) : (
                    <span className="grid size-full place-items-center text-base font-black text-primary/80">{item.good.nameFa.slice(0, 1)}</span>
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-extrabold">
                    {item.variantLabel ?? goodName(item.good, locale)}
                  </span>
                  <span className="block truncate text-[11px] text-muted-foreground">
                    {goodName(item.good, locale)}{item.brandName ? ` · ${item.brandName}` : ""}
                  </span>
                </span>
                {item.priceMinor && (
                  <span className="shrink-0 text-[11px] font-bold text-primary">
                    {fmtMoney(item.priceMinor, item.currency)}
                  </span>
                )}
                <span className={`grid size-7 shrink-0 place-items-center rounded-full border transition ${isPicked ? "border-primary bg-primary text-primary-foreground" : "text-muted-foreground"}`}>
                  {isPicked ? <Check className="size-4" /> : <Plus className="size-4" />}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* گرید تأیید — پایین صفحه */}
      {gridRows.length > 0 && (
        <div className="sticky bottom-4 mt-4 rounded-2xl border bg-white/95 p-3 shadow-lg backdrop-blur">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-extrabold">
              {fa(gridRows.length)} کالا انتخاب شد
              {incompleteCount > 0 && <span className="ms-2 text-[11px] font-bold text-amber-600">{fa(incompleteCount)} ناقص</span>}
            </p>
            <span className="flex items-center gap-1.5">
              <Button size="sm" variant="ghost" onClick={() => setGridRows([])}>
                <X className="size-4" />
              </Button>
              <Button size="sm" onClick={() => void confirm()} disabled={bulk.isPending || selectedCount === 0}>
                {bulk.isPending ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
                ثبت {fa(selectedCount)} کالا
              </Button>
            </span>
          </div>
          {/* گرید فشرده — برای ویرایش سریع قیمت/موجودی */}
          <div className="max-h-60 overflow-auto">
            <div style={{ display: "grid", gridTemplateColumns: CAT_GRID_COLS, position: "sticky", top: 0, zIndex: 10 }} className="border-b bg-stone-100 text-[10px] font-bold text-stone-500">
              <div className="px-1 py-1.5 text-center">#</div>
              <div className="px-1 py-1.5" />
              <div className="px-1 py-1.5 text-center">عکس</div>
              <div className="px-2 py-1.5">محصول</div>
              {arm === "sell" ? (
                <>
                  <div className="px-2 py-1.5 text-center">قیمت</div>
                  <div className="px-2 py-1.5 text-center">موجودی</div>
                  <div className="px-2 py-1.5 text-center">حداقل</div>
                </>
              ) : (
                <>
                  <div className="px-2 py-1.5 text-center">حجم</div>
                  <div className="px-2 py-1.5 text-center">دوره</div>
                </>
              )}
            </div>
            {gridRows.map((r, i) => {
              const isComplete = arm === "sell"
                ? !!(r.price && r.price > 0 && (r.stock ?? 0) >= 0 && r.minOrder && r.minOrder > 0)
                : !!(r.volume && r.volume > 0);
              return (
                <div
                  key={r.productId}
                  style={{ display: "grid", gridTemplateColumns: CAT_GRID_COLS }}
                  className={`border-b text-xs ${isComplete ? "bg-emerald-50/30" : "bg-red-50/20"}`}
                >
                  <div className="grid place-items-center px-1 py-1.5 text-[10px] font-bold text-stone-400">{fa(i + 1)}</div>
                  <div className="grid place-items-center px-1 py-1.5">
                    <button
                      type="button"
                      onClick={() => removeGridRow(r.productId)}
                      className="grid size-5 place-items-center rounded text-stone-400 hover:bg-red-100 hover:text-red-600"
                      aria-label="حذف"
                    >
                      <X className="size-3.5" />
                    </button>
                  </div>
                  <div className="grid place-items-center px-1 py-1">
                    <span className="grid size-8 shrink-0 place-items-center overflow-hidden rounded-lg bg-accent/70 text-[10px] font-black text-primary/80">
                      {r.thumbUrl ? (
                        <Image src={r.thumbUrl} alt="" width={32} height={32} unoptimized className="size-full object-cover" />
                      ) : (
                        r.goodName.slice(0, 1)
                      )}
                    </span>
                  </div>
                  <div className="min-w-0 px-2 py-1.5">
                    <p className="truncate text-xs font-bold">{r.goodName}</p>
                    <p className="truncate text-[10px] text-muted-foreground">{r.brandName ?? "—"}</p>
                  </div>
                  {arm === "sell" ? (
                    <>
                      <div className="px-1 py-1">
                        <NumberInput
                          value={r.price}
                          onChange={(v) => updateGridRow(r.productId, { price: v })}
                          locale={numLocale}
                          min={0}
                          suffix={curName}
                          placeholder="—"
                          className={inputCls}
                          aria-label="قیمت"
                        />
                      </div>
                      <div className="px-1 py-1">
                        <NumberInput
                          value={r.stock}
                          onChange={(v) => updateGridRow(r.productId, { stock: v })}
                          locale={numLocale}
                          min={0}
                          placeholder="—"
                          className={inputCls}
                          aria-label="موجودی"
                        />
                      </div>
                      <div className="px-1 py-1">
                        <NumberInput
                          value={r.minOrder}
                          onChange={(v) => updateGridRow(r.productId, { minOrder: v })}
                          locale={numLocale}
                          min={0}
                          placeholder="—"
                          className={inputCls}
                          aria-label="حداقل سفارش"
                        />
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="px-1 py-1">
                        <NumberInput
                          value={r.volume}
                          onChange={(v) => updateGridRow(r.productId, { volume: v })}
                          locale={numLocale}
                          min={0}
                          placeholder="—"
                          className={inputCls}
                          aria-label="حجم خرید"
                        />
                      </div>
                      <div className="grid place-items-center px-1 py-1.5 text-[10px] text-muted-foreground">ماهیانه</div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
          {incompleteCount > 0 && (
            <p className="mt-2 text-center text-[11px] text-muted-foreground">
              {fa(incompleteCount)} کالا ناقص است — مقادیرشان را پر کن
            </p>
          )}
        </div>
      )}
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// مدال «صنف خود را وارد کن» — وقتی کاربر هنوز صنف ندارد
// ─────────────────────────────────────────────────────────────────────────────

function TradePrompt({
  bizId,
  initialTrade,
  onSaved,
  onSwitchToSolo,
}: {
  bizId: string;
  initialTrade: string;
  onSaved: () => void;
  onSwitchToSolo: () => void;
}) {
  const { toast } = useToast();
  const m = useMessages();
  const [trade, setTrade] = useState(initialTrade);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (trade.trim().length < 2) {
      toast({ title: "صنف کسب‌وکار را بنویس", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      // استفاده از editBusiness که هم trade را ست می‌کند و هم خودش invalidate می‌کند
      const { businessesApi } = await import("@/lib/api");
      await businessesApi.editBusiness(bizId, { trade: trade.trim() });
      // کش را invalidate کنیم
      const { useQueryClient } = await import("@tanstack/react-query");
      const qc = useQueryClient();
      await qc.invalidateQueries({ queryKey: ["businesses"] });
      toast({ title: "صنف ثبت شد", description: "کاتالوگ‌های هم‌صنف را برایت پیدا می‌کنیم…" });
      onSaved();
    } catch (err) {
      toast({
        title: "ذخیره ناموفق بود",
        description: err instanceof ApiError ? err.message : "دوباره تلاش کن",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="flex items-center gap-2">
        <Store className="size-5 shrink-0 text-primary" />
        <h1 className="text-lg font-extrabold">صنف کسب‌وکارت</h1>
      </div>

      <div className="mt-4">
        <Input
          value={trade}
          maxLength={60}
          onChange={(e) => setTrade(e.target.value)}
          placeholder="مثلا سوپرمارکت، قنادی، پخش مواد غذایی"
          className="h-11 text-base"
          autoFocus
        />
        {/* چند پیشنهاد سریع */}
        <div className="mt-3 flex flex-wrap gap-1.5">
          {["سوپرمارکت", "قنادی", "پخش مواد غذایی", "پوشاک", "ابزار و یراق", "لوازم یدکی"].map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTrade(t)}
              className={`rounded-full border px-2.5 py-1 text-[11px] font-bold transition ${
                trade === t ? "border-primary bg-primary/10 text-primary" : "text-muted-foreground hover:border-primary/40 hover:text-primary"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <Button className="mt-5 w-full" onClick={() => void save()} disabled={saving}>
        {saving ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
        ادامه
      </Button>

      <p className="mt-4 text-center text-[11px] leading-5 text-muted-foreground">
        {m.picker.notHere}{" "}
        <button type="button" onClick={onSwitchToSolo} className="font-bold text-primary underline-offset-2 hover:underline">
          {m.picker.switchToForm}
        </button>
      </p>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// منبع ۲ — کاتالوگ مرجع (جست‌وجو + نوار برند افقی)
// ─────────────────────────────────────────────────────────────────────────────

export function ReferencePicker({
  bizId,
  currency,
  arm,
  onDone,
  onSwitchToSolo,
}: {
  bizId: string;
  currency: string;
  arm: "sell" | "buy";
  onDone: (kind: "sell" | "buy") => void;
  onSwitchToSolo: () => void;
}) {
  const { toast } = useToast();
  const m = useMessages();
  const { locale } = useLocale();
  const numLocale: "fa" | "en" = locale === "en" ? "en" : "fa";
  const bulk = useBulkSaveListings();

  const curDef = CURRENCIES[currency] ?? CURRENCIES.IRR;
  const curName = currencyLabel(currency, locale);

  // ── گام ۱: انتخاب / گام ۲: قیمت‌گذاری
  const [step, setStep] = useState<"pick" | "specs">("pick");

  // ── جست‌وجو
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), 300);
    return () => clearTimeout(t);
  }, [query]);

  // ── فیلتر برند — نوار افقی از برندهای موجود در همین لیست (نه تکست‌باکس)
  const [brandId, setBrandId] = useState<string | null>(null);
  const [categoryId, setCategoryId] = useState<string | null>(null);

  // ── فید محصولات (صفحه‌ی اول + صفحات «بیشتر»)
  const first = useProducts({
    businessId: bizId,
    q: debounced || undefined,
    brandId: brandId ?? undefined,
    categoryId: categoryId ?? undefined,
    limit: 40,
  });
  const [more, setMore] = useState<{ items: ProductRowDto[]; next: string | null }>({ items: [], next: null });
  const [loadingMore, setLoadingMore] = useState(false);
  useEffect(() => {
    setMore({ items: [], next: null });
  }, [debounced, brandId, categoryId]);

  const rows = useMemo(() => [...(first.data?.items ?? []), ...more.items], [first.data, more]);
  const nextCursor = more.items.length > 0 ? more.next : (first.data?.nextCursor ?? null);
  const brands = first.data?.brands ?? [];
  const categories = first.data?.categories ?? [];

  const loadMore = async () => {
    const cur = more.items.length > 0 ? more.next : first.data?.nextCursor;
    if (!cur) return;
    setLoadingMore(true);
    try {
      const res = await productsApi.getProducts({
        businessId: bizId,
        q: debounced || undefined,
        brandId: brandId ?? undefined,
        categoryId: categoryId ?? undefined,
        cursor: cur,
        limit: 40,
      });
      setMore((s) => ({ items: [...s.items, ...res.items], next: res.nextCursor }));
    } catch {
      /* تلاش دوباره با همان دکمه */
    } finally {
      setLoadingMore(false);
    }
  };

  // ── سبد انتخاب
  const [picked, setPicked] = useState<ProductRowDto[]>([]);
  const pickedIds = useMemo(() => new Set(picked.map((p) => p.id)), [picked]);
  const toggle = (p: ProductRowDto) => {
    setPicked((list) => (pickedIds.has(p.id) ? list.filter((x) => x.id !== p.id) : [...list, p]));
  };

  // ── گام ۲: قیمت‌ها
  const [draft, setDraft] = useState<Record<string, Draft>>({});
  const draftOf = (id: string): Draft => draft[id] ?? {};
  const setDraftOf = (id: string, patch: Draft) => setDraft((s) => ({ ...s, [id]: { ...draftOf(id), ...patch } }));

  // ── عکس‌های آپلودشده برای Product ها (productId → File object)
  // عکس در مرحله‌ی قیمت‌گذاری فقط stage می‌شود (فایل در حالت pending)؛
  // خودِ آپلود بعد از submit انجام می‌شود چونListing هنوز ساخته نشده و
  // modelId لازم است تا عکس به گالری آگهی بچسبد. بعد از submit:
  //   ۱. عکس به گالری Listing (modelId=listingId) آپلود می‌شود
  //   ۲. اگر Product.imageUrl خالی است، همان URL روی Product ست می‌شود
  //      تا برای همه‌ی کاربران آینده در لیست مرجع دیده شود.
  const [pendingImages, setPendingImages] = useState<Record<string, File>>({});
  const [productImages, setProductImages] = useState<Record<string, string>>({});
  const uploadFile = useUploadFile();
  const queryClient = useQueryClient();

  const onPickProductImage = (productId: string) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      // stage: فقط فایل را در state نگه می‌داریم + preview با URL.createObjectURL
      setPendingImages((s) => ({ ...s, [productId]: file }));
    };
    input.click();
  };

  const submit = async (keepGoing = false) => {
    if (arm === "sell") {
      const missingPrice = picked.filter((p) => !((draftOf(p.id).price ?? 0) > 0));
      if (missingPrice.length > 0) {
        toast({ title: m.picker.needPrice, variant: "destructive" });
        return;
      }
      const missingStock = picked.filter((p) => !((draftOf(p.id).stock ?? 0) > 0));
      if (missingStock.length > 0) {
        toast({ title: m.picker.needStock, variant: "destructive" });
        return;
      }
      const missingMinOrder = picked.filter((p) => !((draftOf(p.id).minOrder ?? 0) > 0));
      if (missingMinOrder.length > 0) {
        toast({ title: m.picker.needMinOrder, variant: "destructive" });
        return;
      }
    }
    try {
      const res = await bulk.mutateAsync({
        businessId: bizId,
        mode: arm === "sell" ? "SELL" : "BUY",
        items: picked.map((p) => ({
          productId: p.id,
          ...(arm === "sell"
            ? {
                priceMinor: Math.round((draftOf(p.id).price ?? 0) * 10 ** curDef.exp),
                stock: draftOf(p.id).stock ?? undefined,
                minOrder: draftOf(p.id).minOrder ?? undefined,
              }
            : { volume: draftOf(p.id).volume ?? undefined }),
        })),
      });

      // ── آپلود عکس‌های stage شده به گالری Listing + ست کردن Product.imageUrl
      // بعد از bulkSave، listingId ها در res.items برمی‌گردند. هر کالایی که
      // عکس stage شده دارد، حالا به Listing آپلود می‌شود و اگر Product.imageUrl
      // خالی است، همان URL روی Product هم ست می‌شود (برای همه‌ی کاربران آینده).
      const items = (res as { items?: { productId: string; listingId: string }[] }).items ?? [];
      const imageUploads: Promise<void>[] = [];
      for (const item of items) {
        const file = pendingImages[item.productId];
        if (!file || !item.listingId) continue;
        const pid = item.productId;
        const lid = item.listingId;
        const p = picked.find((x) => x.id === pid);
        // اگر Product قبلاً imageUrl دارد، عکس فقط به گالری Listing می‌رود.
        const productHasImage = !!(p?.imageUrl);
        imageUploads.push(
          (async () => {
            try {
              // ۱. آپلود به گالری Listing (با modelId)
              const uploaded = await uploadFile.mutateAsync({
                file,
                model: "Listing",
                modelId: lid,
                key: "gallery",
              });
              // ۲. اگر Product.imageUrl خالی است، همان URL روی Product ست کن
              if (!productHasImage) {
                await productsApi.setProductImage({ productId: pid, imageUrl: uploaded.url });
              }
            } catch (err) {
              // آپلود عکس شکست خورد — ولی Listing ساخته شده، فقط عکس نیامد
              toast({
                title: "آپلود عکس ناموفق بود",
                description: err instanceof ApiError ? err.message : undefined,
                variant: "destructive",
              });
            }
          })()
        );
      }
      // منتظر آپلود عکس‌ها می‌مانیم — ولی UI را بلاک نمی‌کنیم تا کاربر منتظر نماند
      if (imageUploads.length > 0) {
        // invalidate بعد از آپلود عکس‌ها تا کاتالوگ تازه‌سازی شود
        Promise.all(imageUploads).finally(() => {
          void queryClient.invalidateQueries({ queryKey: ["products"] });
          void queryClient.invalidateQueries({ queryKey: ["listings"] });
          void queryClient.invalidateQueries({ queryKey: ["business"] });
        });
      }

      toast({
        title: m.picker.successTitle.replace("{n}", fa(res.saved)),
        description: m.picker.successDesc,
      });
      if (res.failed > 0) toast({ title: m.picker.submitFailed.replace("{n}", fa(res.failed)), variant: "destructive" });
      if (keepGoing) {
        // حلقه‌ی افزودن سریع — ثبت شد، سبد خالی می‌ماند و تیک‌زدن ادامه پیدا می‌کند
        setPicked([]);
        setDraft({});
        setPendingImages({});
        setProductImages({});
        setStep("pick");
      } else {
        onDone(arm);
      }
    } catch (err) {
      toast({
        title: m.picker.submitFailed.replace("{n}", fa(picked.length)),
        description: err instanceof ApiError ? err.message : undefined,
        variant: "destructive",
      });
    }
  };

  // ── فیلتر عکس‌دار/بی‌عکس
  const [hasImage, setHasImage] = useState<boolean | null>(null);

  // ── مدال دسته‌بندی
  const [catModalOpen, setCatModalOpen] = useState(false);
  const [brandModalOpen, setBrandModalOpen] = useState(false);

  // ── فیلتر برندها بر اساس دسته انتخاب‌شده
  const filteredBrands = useMemo(() => {
    if (!categoryId) return brands;
    // وقتی دسته انتخاب شده، فقط برندهای همان دسته نمایش داده شوند
    // brands از API بر اساس scope فعلی می‌آید — وقتی categoryId ست شده،
    // API خودش برندهای آن دسته را برمی‌گرداند
    return brands;
  }, [brands, categoryId]);

  // ─ـ نام دسته/برند انتخاب‌شده برای نمایش روی چیپ ──
  const selectedCatName = categories.find((c) => c.id === categoryId)?.nameFa ?? null;
  const selectedBrandName = filteredBrands.find((b) => b.id === brandId)?.name ?? null;

  // ── فیلتر نهایی روی rows (برای hasImage) ──
  const displayRows = useMemo(() => {
    if (hasImage === null) return rows;
    return rows.filter((r) => hasImage ? !!r.imageUrl : !r.imageUrl);
  }, [rows, hasImage]);

  return (
    <>
      {step === "pick" ? (
        <div className="flex gap-4">
          {/* ─── سایدبار فیلتر — دسکتاپ ─── */}
          <aside className="hidden w-56 shrink-0 sm:block">
            <div className="sticky top-4 space-y-4 rounded-xl border bg-white p-4">
              <h3 className="text-xs font-extrabold text-stone-500">فیلترها</h3>

              {/* دسته */}
              <div>
                <p className="mb-1.5 text-[11px] font-bold text-stone-600">دسته</p>
                <div className="space-y-0.5">
                  <button
                    type="button"
                    onClick={() => setCategoryId(null)}
                    className={`flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-xs transition ${!categoryId ? "bg-primary/10 text-primary font-bold" : "hover:bg-accent"}`}
                  >
                    <span>همه</span>
                  </button>
                  {categories.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setCategoryId(categoryId === c.id ? null : c.id)}
                      className={`flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-xs transition ${categoryId === c.id ? "bg-primary/10 text-primary font-bold" : "hover:bg-accent"}`}
                    >
                      <span>{c.nameFa}</span>
                      <span className="text-[10px] text-muted-foreground">{fa(c.count)}</span>
                    </button>
                  ))}
                </div>
              </div>

              <hr className="border-stone-100" />

              {/* برند */}
              <div>
                <p className="mb-1.5 text-[11px] font-bold text-stone-600">برند</p>
                <div className="max-h-48 space-y-0.5 overflow-y-auto">
                  <button
                    type="button"
                    onClick={() => setBrandId(null)}
                    className={`flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-xs transition ${!brandId ? "bg-primary/10 text-primary font-bold" : "hover:bg-accent"}`}
                  >
                    <span>همه</span>
                  </button>
                  {filteredBrands.map((b) => (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => setBrandId(brandId === b.id ? null : b.id)}
                      className={`flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-xs transition ${brandId === b.id ? "bg-primary/10 text-primary font-bold" : "hover:bg-accent"}`}
                    >
                      <span className="truncate">{b.name}</span>
                      <span className="shrink-0 text-[10px] text-muted-foreground">{fa(b.count)}</span>
                    </button>
                  ))}
                  {filteredBrands.length === 0 && !first.isLoading && !first.isFetching && <p className="py-3 text-center text-[11px] text-muted-foreground">برندی نیست</p>}
                  {first.isLoading || first.isFetching ? <p className="py-3 text-center text-[11px] text-muted-foreground"><Loader2 className="mx-auto size-3 animate-spin" /></p> : null}
                </div>
              </div>

              <hr className="border-stone-100" />

              {/* عکس‌دار */}
              <div>
                <p className="mb-1.5 text-[11px] font-bold text-stone-600">فقط عکس‌دار</p>
                <button
                  type="button"
                  onClick={() => setHasImage(hasImage === true ? null : true)}
                  className={`flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-xs transition ${hasImage === true ? "bg-primary/10 text-primary font-bold" : "hover:bg-accent"}`}
                >
                  <span>{hasImage === true ? "✓ فعال" : "غیرفعال"}</span>
                </button>
              </div>

              {(categoryId || brandId || hasImage !== null) && (
                <button type="button" onClick={() => { setCategoryId(null); setBrandId(null); setHasImage(null); }} className="w-full text-[11px] font-bold text-red-500 hover:text-red-600">
                  حذف همه فیلترها
                </button>
              )}
            </div>
          </aside>

          {/* ─── محتوای اصلی ─── */}
          <div className="min-w-0 flex-1">
            {/* سرچ باکس */}
            <div className="relative">
              <Search className="pointer-events-none absolute end-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                aria-label={m.picker.searchAria}
                placeholder={m.picker.searchPlaceholder}
                value={query}
                maxLength={40}
                onChange={(e) => setQuery(e.target.value)}
                className="h-11 pe-9 text-base"
              />
            </div>

            {/* نوار چیپ فیلتر — موبایل */}
            <div className="mt-3 flex flex-wrap items-center gap-2 sm:hidden">
              <button
                type="button"
                onClick={() => setCatModalOpen(true)}
                className={`inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-bold transition ${categoryId ? "border-primary bg-primary/10 text-primary" : "border-stone-200 bg-white text-stone-600"}`}
              >
                {selectedCatName ?? "دسته"}
                {categoryId && <span role="button" tabIndex={0} onClick={(e) => { e.stopPropagation(); setCategoryId(null); }} className="grid size-4 place-items-center rounded-full bg-primary/20"><X className="size-2.5" /></span>}
              </button>
              <button
                type="button"
                onClick={() => setBrandModalOpen(true)}
                className={`inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-bold transition ${brandId ? "border-primary bg-primary/10 text-primary" : "border-stone-200 bg-white text-stone-600"}`}
              >
                {selectedBrandName ?? "برند"}
                {brandId && <span role="button" tabIndex={0} onClick={(e) => { e.stopPropagation(); setBrandId(null); }} className="grid size-4 place-items-center rounded-full bg-primary/20"><X className="size-2.5" /></span>}
              </button>
              <button
                type="button"
                onClick={() => setHasImage(hasImage === true ? null : true)}
                className={`inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-bold transition ${hasImage === true ? "border-primary bg-primary/10 text-primary" : "border-stone-200 bg-white text-stone-600"}`}
              >
                عکس‌دار
                {hasImage === true && <span role="button" tabIndex={0} onClick={(e) => { e.stopPropagation(); setHasImage(null); }} className="grid size-4 place-items-center rounded-full bg-primary/20"><X className="size-2.5" /></span>}
              </button>
              {(categoryId || brandId || hasImage !== null) && (
                <button type="button" onClick={() => { setCategoryId(null); setBrandId(null); setHasImage(null); }} className="text-[11px] font-bold text-red-500">حذف همه</button>
              )}
            </div>

            {/* ردیف‌های محصول */}
            {first.isLoading || first.isFetching ? (
              <p className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" /> در حال بارگیری…</p>
            ) : displayRows.length === 0 ? (
              <div className="mt-4 rounded-xl border border-dashed p-6 text-center">
                <PackageSearch className="mx-auto size-6 text-primary/60" />
                <p className="mt-2 text-sm font-bold">{m.picker.empty}</p>
                <p className="mt-1 text-[11px] leading-5 text-muted-foreground">{m.picker.emptyHint}</p>
              </div>
            ) : (
              <div className="mt-4 divide-y">
                {displayRows.map((p) => {
                  const isPicked = pickedIds.has(p.id);
                  const mine = p.mineMode !== null;
                  // اگر کاربر قبلاً این کالا را دارد، دیگر نمی‌تواند دوباره اضافه‌اش کند
                  const disabled = mine;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => !disabled && toggle(p)}
                      disabled={disabled}
                      className={`flex w-full items-center gap-3 rounded-lg px-1 py-3 text-start transition ${
                        disabled
                          ? "cursor-default opacity-70"
                          : isPicked
                            ? "bg-accent/40 hover:bg-accent/40"
                            : "hover:bg-accent/30"
                      }`}
                    >
                      <span className="size-10 shrink-0 overflow-hidden rounded-xl bg-accent/70">
                        {p.imageUrl ? (
                          <Image src={p.imageUrl} alt="" width={40} height={40} unoptimized className="size-full object-cover" />
                        ) : (
                          <span className="grid size-full place-items-center text-base font-black text-primary/80">{p.good.nameFa.slice(0, 1)}</span>
                        )}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-extrabold">{p.label}</span>
                        <span className="block truncate text-[11px] text-muted-foreground">{goodName(p.good, locale)}{p.brand ? ` · ${p.brand.name}` : ""}</span>
                      </span>
                      <span className="flex shrink-0 items-center gap-1.5">
                        {p.sellers > 0 && (
                          <span className="flex items-center gap-0.5 rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold text-foreground/70"><Store className="size-3" />{m.picker.sellers.replace("{n}", fa(p.sellers))}</span>
                        )}
                        {disabled ? (
                          // کالای اضافه‌شده — برچسب سبز با تیک
                          <span className="flex items-center gap-0.5 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                            <Check className="size-3" />
                            {m.picker.mine}
                          </span>
                        ) : (
                          <span className={`grid size-7 place-items-center rounded-full border transition ${isPicked ? "border-primary bg-primary text-primary-foreground" : "text-muted-foreground"}`}>
                            {isPicked ? <Check className="size-4" /> : <Plus className="size-4" />}
                          </span>
                        )}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            {nextCursor && rows.length > 0 && (
              <Button variant="outline" size="sm" className="mt-3 w-full" onClick={() => void loadMore()} disabled={loadingMore}>
                {loadingMore ? <Loader2 className="size-4 animate-spin" /> : null}
                {m.picker.loadMore}
              </Button>
            )}

            {/* فقط وقتی لیست خالی است «ثبت تکی» را نشان بده */}
            {displayRows.length === 0 && !first.isLoading && !first.isFetching && (
              <p className="mt-4 text-center text-[11px] leading-5 text-muted-foreground">
                {m.picker.notHere}{" "}
                <button type="button" onClick={onSwitchToSolo} className="font-bold text-primary underline-offset-2 hover:underline">{m.picker.switchToForm}</button>
              </p>
            )}

            {picked.length > 0 && (
              <div className="sticky bottom-4 mt-4 flex items-center justify-between gap-3 rounded-2xl border bg-white/95 p-2.5 shadow-lg backdrop-blur">
                <span className="ps-2 text-sm font-extrabold">{m.picker.tray.replace("{n}", fa(picked.length))}</span>
                <span className="flex items-center gap-1.5">
                  <Button size="sm" variant="ghost" onClick={() => setPicked([])}><X className="size-4" /></Button>
                  <Button size="sm" onClick={() => setStep("specs")} className="gap-1">{m.picker.continue}<ArrowLeft className="size-4 rtl:rotate-180" /></Button>
                </span>
              </div>
            )}
          </div>

          {/* ─── bottom-sheet دسته — موبایل ─── */}
          {catModalOpen && (
            <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/40 sm:hidden" onClick={() => setCatModalOpen(false)}>
              <div className="max-h-[60vh] w-full overflow-y-auto rounded-t-2xl bg-white p-4 pb-8 shadow-xl" onClick={(e) => e.stopPropagation()}>
                <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-stone-200" />
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-sm font-extrabold">انتخاب دسته</h3>
                  <button type="button" onClick={() => setCatModalOpen(false)} className="grid size-7 place-items-center rounded-lg text-muted-foreground hover:bg-accent"><X className="size-4" /></button>
                </div>
                <div className="space-y-1">
                  <button type="button" onClick={() => { setCategoryId(null); setCatModalOpen(false); }} className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-start text-sm transition ${!categoryId ? "bg-primary/10 text-primary font-bold" : "hover:bg-accent"}`}>
                    <span>همه</span>
                  </button>
                  {categories.map((c) => (
                    <button key={c.id} type="button" onClick={() => { setCategoryId(categoryId === c.id ? null : c.id); setCatModalOpen(false); }} className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-start text-sm transition ${categoryId === c.id ? "bg-primary/10 text-primary font-bold" : "hover:bg-accent"}`}>
                      <span>{c.nameFa}</span>
                      <span className="text-[10px] text-muted-foreground">{fa(c.count)}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ─── bottom-sheet برند — موبایل ─── */}
          {brandModalOpen && (
            <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/40 sm:hidden" onClick={() => setBrandModalOpen(false)}>
              <div className="max-h-[60vh] w-full overflow-y-auto rounded-t-2xl bg-white p-4 pb-8 shadow-xl" onClick={(e) => e.stopPropagation()}>
                <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-stone-200" />
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-sm font-extrabold">انتخاب برند</h3>
                  <button type="button" onClick={() => setBrandModalOpen(false)} className="grid size-7 place-items-center rounded-lg text-muted-foreground hover:bg-accent"><X className="size-4" /></button>
                </div>
                <div className="space-y-1">
                  <button type="button" onClick={() => { setBrandId(null); setBrandModalOpen(false); }} className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-start text-sm transition ${!brandId ? "bg-primary/10 text-primary font-bold" : "hover:bg-accent"}`}>
                    <span>همه</span>
                  </button>
                  {filteredBrands.map((b) => (
                    <button key={b.id} type="button" onClick={() => { setBrandId(brandId === b.id ? null : b.id); setBrandModalOpen(false); }} className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-start text-sm transition ${brandId === b.id ? "bg-primary/10 text-primary font-bold" : "hover:bg-accent"}`}>
                      <span>{b.name}</span>
                      <span className="text-[10px] text-muted-foreground">{fa(b.count)}</span>
                    </button>
                  ))}
                  {filteredBrands.length === 0 && <p className="py-6 text-center text-xs text-muted-foreground">برندی نیست</p>}
                </div>
              </div>
            </div>
          )}
        </div>

      ) : (
        <>
          {/* ───── گام ۲: قیمت‌گذاری فشرده ───── */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label={m.picker.back}
              onClick={() => setStep("pick")}
              className="grid size-8 shrink-0 place-items-center rounded-lg text-muted-foreground transition hover:bg-accent hover:text-foreground"
            >
              <ArrowRight className="size-4 rtl:rotate-180" />
            </button>
            <h1 className="text-lg font-extrabold">{m.picker.specsTitle}</h1>
          </div>
          <p className="mt-2 text-[11px] leading-5 text-muted-foreground">
            {arm === "sell" ? m.picker.specsHintSell : m.picker.specsHintBuy}
          </p>

          <div className="mt-4 space-y-3">
            {picked.map((p) => (
              <SpecRow
                key={p.id}
                p={p}
                arm={arm}
                unit={unitLabel(p.good.unit, locale)}
                curName={curName}
                numLocale={numLocale}
                draft={draftOf(p.id)}
                setDraft={(patch) => setDraftOf(p.id, patch)}
                pendingImage={pendingImages[p.id]}
                productImage={productImages[p.id] ?? null}
                onPickImage={() => onPickProductImage(p.id)}
                onRemove={() => toggle(p)}
                m={m}
                locale={locale}
              />
            ))}
          </div>

          {/* ثبت — یا خروج، یا ماندن در حلقه‌ی تیک‌زدن */}
          <div className="mt-5 flex flex-col gap-2 sm:flex-row">
            <Button variant="outline" className="sm:flex-1" onClick={() => void submit(true)} disabled={bulk.isPending}>
              {bulk.isPending ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
              {m.picker.submitAndContinue}
            </Button>
            <Button className="sm:flex-1" onClick={() => void submit(false)} disabled={bulk.isPending}>
              {bulk.isPending ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
              {m.picker.submit.replace("{n}", fa(picked.length))}
            </Button>
          </div>
        </>
      )}
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// hook های محلی — استفاده‌ی هم‌صنف‌ها + لیست محصولات
// ─────────────────────────────────────────────────────────────────────────────

function useProducts(params: {
  businessId: string;
  q?: string;
  categoryId?: string;
  brandId?: string;
  cursor?: string;
  limit?: number;
  enabled?: boolean;
}) {
  return useQuery({
    queryKey: ["products", params.businessId, params.q ?? "", params.categoryId ?? "", params.brandId ?? "", params.cursor ?? ""],
    queryFn: () =>
      productsApi.getProducts({
        businessId: params.businessId,
        q: params.q,
        categoryId: params.categoryId,
        brandId: params.brandId,
        cursor: params.cursor,
        limit: params.limit,
      }),
    enabled: params.enabled !== false && !!params.businessId,
    staleTime: 30_000,
  });
}

function useAggregatedCatalog(params: {
  trade: string;
  city?: string;
  province?: string;
  country?: string;
  q?: string;
  brandId?: string;
  categoryId?: string;
  cursor?: string;
  limit?: number;
  mineId?: string;
  enabled?: boolean;
}) {
  return useQuery({
    queryKey: ["aggregated", params.trade, params.city ?? "", params.province ?? "", params.country ?? "", params.q ?? "", params.brandId ?? "", params.categoryId ?? "", params.cursor ?? ""],
    queryFn: () => businessesApi.getAggregatedCatalog(params),
    enabled: params.enabled !== false && !!params.trade,
    staleTime: 30_000,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// SpecRow — یک ردیف از مرحله‌ی قیمت‌گذاری (عکس + نام + سه فیلد)
// جداسازی شده تا URL.createObjectURL در useEffect مدیریت شود و leak نکند.
// ─────────────────────────────────────────────────────────────────────────────

function SpecRow({
  p,
  arm,
  unit,
  curName,
  numLocale,
  draft,
  setDraft,
  pendingImage,
  productImage,
  onPickImage,
  onRemove,
  m,
  locale,
}: {
  p: ProductRowDto;
  arm: "sell" | "buy";
  unit: string;
  curName: string;
  numLocale: "fa" | "en";
  draft: Draft;
  setDraft: (patch: Draft) => void;
  pendingImage?: File;
  productImage: string | null;
  onPickImage: () => void;
  onRemove: () => void;
  m: ReturnType<typeof useMessages>;
  locale: LocaleDef["code"];
}) {
  // preview از فایل stage‌شده — useMemo تا فقط وقتی فایل عوض شد URL بسازد
  const previewUrl = useMemo(
    () => (pendingImage ? URL.createObjectURL(pendingImage) : null),
    [pendingImage]
  );
  // revoke کردن URL وقتی فایل عوض می‌شود یا کامپوننت از mount خارج می‌شود
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const displayImg = productImage ?? previewUrl ?? p.imageUrl ?? null;

  return (
    <div className="animate-fade-up rounded-xl border p-3">
      {/* ── هدر: عکس بزرگ + نام + حذف ── */}
      <div className="flex items-center gap-2.5">
        {/* عکس کالا — دکمه‌ی آپلود بزرگ با متن «افزودن عکس» */}
        <button
          type="button"
          onClick={() => !displayImg && onPickImage()}
          disabled={!!displayImg}
          aria-label={m.picker.addImage}
          className={`grid size-14 shrink-0 place-items-center overflow-hidden rounded-xl transition ${
            displayImg
              ? "bg-accent/70"
              : "border-2 border-dashed border-primary/40 hover:border-primary hover:bg-accent/40"
          }`}
        >
          {displayImg ? (
            <Image src={displayImg} alt="" width={56} height={56} unoptimized className="size-full object-cover" />
          ) : (
            <span className="flex flex-col items-center gap-0.5 text-primary/70">
              <ImagePlus className="size-5" />
              <span className="text-[9px] font-bold leading-none">عکس</span>
            </span>
          )}
        </button>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-extrabold">{p.label}</p>
          <p className="truncate text-[11px] text-muted-foreground">
            {goodName(p.good, locale)} · هر {unit}
          </p>
          {!displayImg && (
            <button
              type="button"
              onClick={onPickImage}
              className="mt-0.5 text-[11px] font-bold text-primary hover:underline"
            >
              {m.picker.addImage}
            </button>
          )}
        </div>
        <button
          type="button"
          aria-label="حذف"
          className="ms-auto grid size-7 shrink-0 place-items-center rounded-full text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive"
          onClick={onRemove}
        >
          <X className="size-4" />
        </button>
      </div>
      {arm === "sell" ? (
        /* ── سه فیلد در یک ردیف روی دسکتاپ ── */
        <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-3">
          <div>
            <label className="mb-1 block text-[11px] text-muted-foreground">
              {m.picker.price.replace("{unit}", unit)}
            </label>
            <NumberInput
              value={draft.price ?? null}
              onChange={(v) => setDraft({ price: v })}
              locale={numLocale}
              min={0}
              suffix={curName}
              aria-label={m.picker.price.replace("{unit}", unit)}
            />
          </div>
          <div>
            <label className="mb-1 block text-[11px] text-muted-foreground">
              {m.picker.stock}
            </label>
            <NumberInput
              value={draft.stock ?? null}
              onChange={(v) => setDraft({ stock: v })}
              locale={numLocale}
              min={0}
              suffix={unit}
              placeholder={m.picker.stock}
              aria-label={m.picker.stock}
            />
          </div>
          <div>
            <label className="mb-1 block text-[11px] text-muted-foreground">
              {m.picker.minOrder}
            </label>
            <NumberInput
              value={draft.minOrder ?? null}
              onChange={(v) => setDraft({ minOrder: v })}
              locale={numLocale}
              min={0}
              suffix={unit}
              placeholder={m.picker.minOrder}
              aria-label={m.picker.minOrder}
            />
          </div>
        </div>
      ) : (
        <div className="mt-3">
          <NumberInput
            value={draft.volume ?? null}
            onChange={(v) => setDraft({ volume: v })}
            locale={numLocale}
            min={0}
            suffix={unit}
            placeholder={m.picker.volume}
            aria-label={m.picker.volume}
          />
        </div>
      )}
    </div>
  );
}
