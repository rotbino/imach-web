"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import {
  ApiError,
  type AggregatedItemDto,
  type CatalogSummaryDto,
  type ProductRowDto,
} from "@/lib/api";
import { businessesApi, listingsApi, productsApi } from "@/lib/api";
import { useBulkSaveListings } from "@/lib/queries";
import { CURRENCIES, currencyLabel, fa, fmtMoney, goodName, unitLabel } from "@/lib/format";
import { useMessages } from "@/i18n/messages/use-messages";
import { useLocale } from "@/i18n/locale-context";
import { useAuthStore } from "@/lib/auth-store";
import { useActiveBusiness } from "@/lib/active-biz";
import { iranCityItems, provinceOfCity } from "@/lib/iran-geo";
import { NumberInput } from "@/components/number-input";
import { BrandStrip, CategoryStrip } from "@/app/components/brand-strip";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Check,
  Copy,
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

  // ── صنف و شهرِ خودم — مبنای جست‌وجوی تجمیعی
  const myTrade = active?.trade ?? "";
  const myCity = active?.city ?? "";
  const myProvince = myCity ? (provinceOfCity(myCity) ?? undefined) : undefined;
  const myCountry = active?.country ?? "IR";

  // اگر صنف ندارم، یک مدال برای ورود صنف باز می‌کنیم
  const [needTrade, setNeedTrade] = useState(!myTrade);
  const [tradeInput, setTradeInput] = useState(myTrade);

  useEffect(() => {
    setNeedTrade(!myTrade);
    setTradeInput(myTrade);
  }, [myTrade]);

  // ── جست‌وجو
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), 300);
    return () => clearTimeout(t);
  }, [query]);

  // ── فیلتر برند — چیپ افقی از برندهای موجود در همین لیست
  const [brandId, setBrandId] = useState<string | null>(null);
  const [categoryId, setCategoryId] = useState<string | null>(null);

  // ─ـ فید اولیه — یک صفحه از تجمیعی
  const first = useAggregatedCatalog({
    trade: myTrade,
    city: myCity,
    province: myProvince,
    country: myCountry,
    q: debounced || undefined,
    brandId: brandId ?? undefined,
    categoryId: categoryId ?? undefined,
    mineId: bizId,
    limit: 40,
    enabled: !!myTrade,
  });

  // ─ـ صفحات «بیشتر»
  const [more, setMore] = useState<{ items: AggregatedItemDto[]; next: string | null }>({ items: [], next: null });
  const [loadingMore, setLoadingMore] = useState(false);
  useEffect(() => {
    setMore({ items: [], next: null });
  }, [debounced, brandId, categoryId, myTrade]);

  const rows = useMemo(() => [...(first.data?.items ?? []), ...more.items], [first.data, more]);
  const nextCursor = more.items.length > 0 ? more.next : (first.data?.nextCursor ?? null);
  const brands = first.data?.brands ?? [];
  const categories = first.data?.categories ?? [];
  const foundBusinesses = first.data?.foundBusinesses ?? 0;

  const loadMore = async () => {
    const cur = more.items.length > 0 ? more.next : first.data?.nextCursor;
    if (!cur) return;
    setLoadingMore(true);
    try {
      const res = await businessesApi.getAggregatedCatalog({
        trade: myTrade,
        city: myCity,
        province: myProvince,
        country: myCountry,
        q: debounced || undefined,
        brandId: brandId ?? undefined,
        categoryId: categoryId ?? undefined,
        cursor: cur,
        limit: 40,
        mineId: bizId,
      });
      setMore((s) => ({ items: [...s.items, ...res.items], next: res.nextCursor }));
    } catch {
      /* retry */
    } finally {
      setLoadingMore(false);
    }
  };

  // ─ـ سبد انتخاب (productId → listingId که از peer انتخاب شده برای کپی)
  const [picked, setPicked] = useState<AggregatedItemDto[]>([]);
  const pickedIds = useMemo(() => new Set(picked.map((p) => p.id)), [picked]);
  const toggle = (it: AggregatedItemDto) => {
    setPicked((list) => (pickedIds.has(it.id) ? list.filter((x) => x.id !== it.id) : [...list, it]));
  };

  const copy = async () => {
    if (picked.length === 0) return;
    // تمام قلم‌های انتخاب‌شده از هم‌صنف‌ها هستند → sourceListingIds همان id آنهاست
    // و sourceBusinessId مالکشان. ولی اینجا چندتا کاتالوگ داریم.
    // کپی به روش copyFrom نمی‌تواند چند کاتالوگ را یکجا کپی کند. ولی چون
    // aggregatedItem.productId داریم، می‌توانیم با bulkSave مستقیم بسازیم.
    try {
      const res = await listingsApi.bulkSave({
        businessId: bizId,
        mode: arm === "sell" ? "SELL" : "BUY",
        items: picked
          .filter((p) => p.productId) // فقط قلم‌هایی که productId دارند (که همه‌شان دارند)
          .map((p) => ({
            productId: p.productId!,
            ...(arm === "sell" ? {} : { volume: undefined }),
          })),
      });
      toast({
        title: m.picker.copySuccess.replace("{n}", fa(res.saved)),
        description: res.failed > 0 ? m.picker.copyFailed.replace("{n}", fa(res.failed)) : m.picker.copyPriceHint,
      });
      onDone("sell");
    } catch (err) {
      toast({
        title: m.picker.copyFailed,
        description: err instanceof ApiError ? err.message : undefined,
        variant: "destructive",
      });
    }
  };

  // ── مدال «صنف خود را وارد کن» — وقتی کاربر هنوز صنف ندارد
  if (needTrade) {
    return <TradePrompt bizId={bizId} initialTrade={tradeInput} onSaved={() => setNeedTrade(false)} onSwitchToSolo={onSwitchToSolo} />;
  }

  return (
    <>
      <div className="flex items-center gap-2">
        <Copy className="size-5 shrink-0 text-primary" />
        <h1 className="text-lg font-extrabold">{m.picker.sourceCopy}</h1>
      </div>
      <p className="mt-2 text-xs leading-6 text-muted-foreground">
        {m.picker.copyIntro}{" "}
        {foundBusinesses > 0 && (
          <span className="font-bold text-primary">
            {foundBusinesses} کاتالوگ هم‌صنف پیدا شد
          </span>
        )}
      </p>

      {/* جست‌وجو */}
      <div className="relative mt-4">
        <Search className="pointer-events-none absolute end-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          aria-label={m.picker.copySearchAria}
          placeholder={m.picker.copySearchPlaceholder}
          value={query}
          maxLength={40}
          onChange={(e) => setQuery(e.target.value)}
          className="h-11 pe-9 text-base"
        />
      </div>

      {/* نوار برند — از خود لیست استخراج شده */}
      <div className="mt-2.5">
        <BrandStrip brands={brands} activeBrandId={brandId} onPick={setBrandId} />
      </div>

      {/* نوار دسته — اختیاری، قابل toggle */}
      {categories.length > 0 && (
        <div className="mt-1.5">
          <CategoryStrip categories={categories} activeCategoryId={categoryId} onPick={setCategoryId} locale={locale === "en" ? "en" : "fa"} />
        </div>
      )}

      {/* لیست کالاها */}
      {first.isLoading ? (
        <p className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
        </p>
      ) : rows.length === 0 ? (
        <div className="mt-4 rounded-xl border border-dashed p-6 text-center">
          <Store className="mx-auto size-6 text-primary/60" />
          <p className="mt-2 text-sm font-bold">{m.picker.copyEmpty}</p>
          <p className="mt-1 text-[11px] leading-5 text-muted-foreground">
            صنف خود را عوض کن یا از کاتالوگ مرجع تیک بزن
          </p>
          <button
            type="button"
            onClick={() => setNeedTrade(true)}
            className="mt-3 text-[11px] font-bold text-primary hover:underline"
          >
            عوض کردن صنف
          </button>
        </div>
      ) : (
        <div className="mt-4 divide-y">
          {rows.map((it) => {
            const isPicked = pickedIds.has(it.id);
            return (
              <button
                key={it.id}
                type="button"
                onClick={() => toggle(it)}
                className={`flex w-full items-center gap-3 rounded-lg px-1 py-3 text-start transition ${
                  isPicked ? "bg-accent/40" : "hover:bg-accent/30"
                }`}
              >
                <span className="size-10 shrink-0 overflow-hidden rounded-xl bg-accent/70">
                  {it.thumbUrl ? (
                    <Image src={it.thumbUrl} alt="" width={40} height={40} unoptimized className="size-full object-cover" />
                  ) : (
                    <span className="grid size-full place-items-center text-base font-black text-primary/80">
                      {it.good.nameFa.slice(0, 1)}
                    </span>
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-extrabold">
                    {goodName(it.good, locale)}
                    {it.variantLabel ? ` · ${it.variantLabel}` : ""}
                  </span>
                  <span className="block truncate text-[11px] text-muted-foreground">
                    {it.brandName ? `${it.brandName} · ` : ""}
                    {it.good.category.nameFa}
                  </span>
                </span>
                <span
                  className={`grid size-7 shrink-0 place-items-center rounded-full border transition ${
                    isPicked ? "border-primary bg-primary text-primary-foreground" : "text-muted-foreground"
                  }`}
                >
                  {isPicked ? <Check className="size-4" /> : <Plus className="size-4" />}
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

      {/* سبد شناور */}
      {picked.length > 0 && (
        <div className="sticky bottom-4 mt-4 flex items-center justify-between gap-3 rounded-2xl border bg-white/95 p-2.5 shadow-lg backdrop-blur">
          <span className="ps-2 text-sm font-extrabold">{m.picker.copyTray.replace("{n}", fa(picked.length))}</span>
          <span className="flex items-center gap-1.5">
            <Button size="sm" variant="ghost" onClick={() => setPicked([])}>
              <X className="size-4" />
            </Button>
            <Button size="sm" onClick={() => void copy()} className="gap-1">
              {m.picker.copySubmit.replace("{n}", fa(picked.length))}
              <ArrowLeft className="size-4 rtl:rotate-180" />
            </Button>
          </span>
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

  const submit = async (keepGoing = false) => {
    if (arm === "sell") {
      const missing = picked.filter((p) => !((draftOf(p.id).price ?? 0) > 0));
      if (missing.length > 0) {
        toast({ title: m.picker.needPrice, variant: "destructive" });
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
      toast({
        title: m.picker.successTitle.replace("{n}", fa(res.saved)),
        description: m.picker.successDesc,
      });
      if (res.failed > 0) toast({ title: m.picker.submitFailed.replace("{n}", fa(res.failed)), variant: "destructive" });
      if (keepGoing) {
        // حلقه‌ی افزودن سریع — ثبت شد، سبد خالی می‌ماند و تیک‌زدن ادامه پیدا می‌کند
        setPicked([]);
        setDraft({});
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
        <>
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

          {/* ─── نوار فیلتر — سبک دیوار ─── */}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {/* چیپ دسته */}
            <button
              type="button"
              onClick={() => setCatModalOpen(true)}
              className={`inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-bold transition ${
                categoryId ? "border-primary bg-primary/10 text-primary" : "border-stone-200 bg-white text-stone-600 hover:border-stone-300"
              }`}
            >
              {selectedCatName ?? "دسته"}
              {categoryId && (
                <span
                  role="button"
                  tabIndex={0}
                  onClick={(e) => { e.stopPropagation(); setCategoryId(null); }}
                  className="grid size-4 place-items-center rounded-full bg-primary/20 hover:bg-primary/30"
                >
                  <X className="size-2.5" />
                </span>
              )}
            </button>

            {/* چیپ برند */}
            <button
              type="button"
              onClick={() => setBrandModalOpen(true)}
              className={`inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-bold transition ${
                brandId ? "border-primary bg-primary/10 text-primary" : "border-stone-200 bg-white text-stone-600 hover:border-stone-300"
              }`}
            >
              {selectedBrandName ?? "برند"}
              {brandId && (
                <span
                  role="button"
                  tabIndex={0}
                  onClick={(e) => { e.stopPropagation(); setBrandId(null); }}
                  className="grid size-4 place-items-center rounded-full bg-primary/20 hover:bg-primary/30"
                >
                  <X className="size-2.5" />
                </span>
              )}
            </button>

            {/* چیپ عکس‌دار */}
            <button
              type="button"
              onClick={() => setHasImage(hasImage === true ? null : true)}
              className={`inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-bold transition ${
                hasImage === true ? "border-primary bg-primary/10 text-primary" : "border-stone-200 bg-white text-stone-600 hover:border-stone-300"
              }`}
            >
              عکس‌دار
              {hasImage === true && (
                <span
                  role="button"
                  tabIndex={0}
                  onClick={(e) => { e.stopPropagation(); setHasImage(null); }}
                  className="grid size-4 place-items-center rounded-full bg-primary/20 hover:bg-primary/30"
                >
                  <X className="size-2.5" />
                </span>
              )}
            </button>

            {/* پاک کردن همه فیلترها */}
            {(categoryId || brandId || hasImage !== null) && (
              <button
                type="button"
                onClick={() => { setCategoryId(null); setBrandId(null); setHasImage(null); }}
                className="text-[11px] font-bold text-red-500 hover:text-red-600"
              >
                حذف همه فیلترها
              </button>
            )}
          </div>

          {/* ─── ردیف‌های محصول ─── */}
          {first.isLoading ? (
            <p className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
            </p>
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
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => toggle(p)}
                    className={`flex w-full items-center gap-3 rounded-lg px-1 py-3 text-start transition ${
                      isPicked ? "bg-accent/40" : "hover:bg-accent/30"
                    }`}
                  >
                    <span className="size-10 shrink-0 overflow-hidden rounded-xl bg-accent/70">
                      {p.imageUrl ? (
                        <Image src={p.imageUrl} alt="" width={40} height={40} unoptimized className="size-full object-cover" />
                      ) : (
                        <span className="grid size-full place-items-center text-base font-black text-primary/80">
                          {p.good.nameFa.slice(0, 1)}
                        </span>
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-extrabold">{p.label}</span>
                      <span className="block truncate text-[11px] text-muted-foreground">
                        {goodName(p.good, locale)}
                        {p.brand ? ` · ${p.brand.name}` : ""}
                      </span>
                    </span>
                    <span className="flex shrink-0 items-center gap-1.5">
                      {p.sellers > 0 && (
                        <span className="flex items-center gap-0.5 rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold text-foreground/70">
                          <Store className="size-3" />
                          {m.picker.sellers.replace("{n}", fa(p.sellers))}
                        </span>
                      )}
                      {mine && (
                        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                          {m.picker.mine}
                        </span>
                      )}
                      <span
                        className={`grid size-7 place-items-center rounded-full border transition ${
                          isPicked ? "border-primary bg-primary text-primary-foreground" : "text-muted-foreground"
                        }`}
                      >
                        {isPicked ? <Check className="size-4" /> : <Plus className="size-4" />}
                      </span>
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

          {/* ─── درِ خروج به مسیر آزاد ─── */}
          <p className="mt-4 text-center text-[11px] leading-5 text-muted-foreground">
            {m.picker.notHere}{" "}
            <button type="button" onClick={onSwitchToSolo} className="font-bold text-primary underline-offset-2 hover:underline">
              {m.picker.switchToForm}
            </button>
          </p>

          {/* ─── سبد شناور ─── */}
          {picked.length > 0 && (
            <div className="sticky bottom-4 mt-4 flex items-center justify-between gap-3 rounded-2xl border bg-white/95 p-2.5 shadow-lg backdrop-blur">
              <span className="ps-2 text-sm font-extrabold">{m.picker.tray.replace("{n}", fa(picked.length))}</span>
              <span className="flex items-center gap-1.5">
                <Button size="sm" variant="ghost" onClick={() => setPicked([])}>
                  <X className="size-4" />
                </Button>
                <Button size="sm" onClick={() => setStep("specs")} className="gap-1">
                  {m.picker.continue}
                  <ArrowLeft className="size-4 rtl:rotate-180" />
                </Button>
              </span>
            </div>
          )}

          {/* ─── مدال دسته‌بندی ─── */}
          {catModalOpen && (
            <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" onClick={() => setCatModalOpen(false)}>
              <div className="max-h-[70vh] w-full max-w-sm overflow-y-auto rounded-2xl bg-white p-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-sm font-extrabold">انتخاب دسته</h3>
                  <button type="button" onClick={() => setCatModalOpen(false)} className="grid size-7 place-items-center rounded-lg text-muted-foreground hover:bg-accent"><X className="size-4" /></button>
                </div>
                <div className="space-y-1">
                  {categories.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => { setCategoryId(categoryId === c.id ? null : c.id); setCatModalOpen(false); }}
                      className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-start text-sm transition ${
                        categoryId === c.id ? "bg-primary/10 text-primary font-bold" : "hover:bg-accent"
                      }`}
                    >
                      <span>{c.nameFa}</span>
                      <span className="text-[10px] text-muted-foreground">{fa(c.count)}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ─── مدال برند ─── */}
          {brandModalOpen && (
            <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" onClick={() => setBrandModalOpen(false)}>
              <div className="max-h-[70vh] w-full max-w-sm overflow-y-auto rounded-2xl bg-white p-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-sm font-extrabold">انتخاب برند</h3>
                  <button type="button" onClick={() => setBrandModalOpen(false)} className="grid size-7 place-items-center rounded-lg text-muted-foreground hover:bg-accent"><X className="size-4" /></button>
                </div>
                <div className="space-y-1">
                  {filteredBrands.map((b) => (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => { setBrandId(brandId === b.id ? null : b.id); setBrandModalOpen(false); }}
                      className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-start text-sm transition ${
                        brandId === b.id ? "bg-primary/10 text-primary font-bold" : "hover:bg-accent"
                      }`}
                    >
                      <span>{b.name}</span>
                      <span className="text-[10px] text-muted-foreground">{fa(b.count)}</span>
                    </button>
                  ))}
                  {filteredBrands.length === 0 && (
                    <p className="py-6 text-center text-xs text-muted-foreground">برندی پیدا نشد</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </>
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
            {picked.map((p) => {
              const unit = unitLabel(p.good.unit, locale);
              return (
                <div key={p.id} className="animate-fade-up rounded-xl border p-3">
                  <div className="flex items-center gap-2.5">
                    <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-accent/70 text-sm font-black text-primary/80">
                      {p.good.nameFa.slice(0, 1)}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-extrabold">{p.label}</p>
                      <p className="truncate text-[11px] text-muted-foreground">
                        {goodName(p.good, locale)} · هر {unit}
                      </p>
                    </div>
                    <button
                      type="button"
                      aria-label="حذف"
                      className="ms-auto grid size-7 place-items-center rounded-full text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => toggle(p)}
                    >
                      <X className="size-4" />
                    </button>
                  </div>
                  {arm === "sell" ? (
                    <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-3">
                      <div className="sm:col-span-3">
                        <label className="mb-1 block text-[11px] text-muted-foreground">
                          {m.picker.price.replace("{unit}", unit)}
                        </label>
                        <NumberInput
                          value={draftOf(p.id).price ?? null}
                          onChange={(v) => setDraftOf(p.id, { price: v })}
                          locale={numLocale}
                          min={0}
                          suffix={curName}
                          aria-label={m.picker.price.replace("{unit}", unit)}
                        />
                      </div>
                      <NumberInput
                        value={draftOf(p.id).stock ?? null}
                        onChange={(v) => setDraftOf(p.id, { stock: v })}
                        locale={numLocale}
                        min={0}
                        suffix={unit}
                        placeholder={m.picker.stock}
                        aria-label={m.picker.stock}
                      />
                      <NumberInput
                        value={draftOf(p.id).minOrder ?? null}
                        onChange={(v) => setDraftOf(p.id, { minOrder: v })}
                        locale={numLocale}
                        min={0}
                        suffix={unit}
                        placeholder={m.picker.minOrder}
                        aria-label={m.picker.minOrder}
                      />
                    </div>
                  ) : (
                    <div className="mt-3">
                      <NumberInput
                        value={draftOf(p.id).volume ?? null}
                        onChange={(v) => setDraftOf(p.id, { volume: v })}
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
            })}
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
