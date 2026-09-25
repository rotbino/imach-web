"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { ApiError, type CatalogItemDto, type CatalogSummaryDto, type ProductRowDto } from "@/lib/api";
import { businessesApi, listingsApi, productsApi } from "@/lib/api";
import { useBrands, useBulkSaveListings, useProducts } from "@/lib/queries";
import { CURRENCIES, currencyLabel, fa, fmtMoney, goodName, unitLabel } from "@/lib/format";
import { useMessages } from "@/i18n/messages/use-messages";
import { useLocale } from "@/i18n/locale-context";
import { NumberInput } from "@/components/number-input";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
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
 * دو منبع، یک صف (خواسته‌ی کاربر: «اولین سوپرمارکت که کالاهاشو وارد کرد بقیه
 * تیک بزنن و بیارن توی کاتالوگ خودشون»):
 *
 *   ۱. «از هم‌صنف‌ها» (پیش‌فرض) — صنف کسب‌وکارت را جست‌وجو کن، کاتالوگ‌های
 *      زنده را باز کن، قلم‌هایش را با همه‌ی مشخصات و عکس‌ها تیک بزن؛ کپی به
 *      کاتالوگ تو می‌آید بی‌قیمت و قیمت‌گذاری با خودت.
 *   ۲. «از کاتالوگ مرجع» — جست‌وجو + فیلتر برند روی لیست مشترک SKUها؛
 *      ناوبری دسته‌ها حذف شد (خواسته‌ی کاربر: ۲۲ گروه وحشت‌آور بود؛
 *      «جستجو بهتره» + «فیلتر برند خیلی کاربردیه»).
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
          <CopyFromCatalogs bizId={bizId} arm={arm} onDone={onDone} onSwitchToSolo={onSwitchToSolo} />
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
// منبع ۱ — کپی از کاتالوگ هم‌صنف‌ها
// ─────────────────────────────────────────────────────────────────────────────

function CopyFromCatalogs({
  bizId,
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

  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), 300);
    return () => clearTimeout(t);
  }, [query]);

  // ── گام ۱: کاتالوگ‌ها / گام ۲: قلم‌ها
  const [source, setSource] = useState<CatalogSummaryDto | null>(null);

  // ── فید کاتالوگ‌ها (کلاینت‌ساید، صفحه‌ای)
  const [catalogs, setCatalogs] = useState<CatalogSummaryDto[]>([]);
  const [catNext, setCatNext] = useState<string | null>(null);
  const [catBusy, setCatBusy] = useState(false);
  const [catLoading, setCatLoading] = useState(true);

  const loadCatalogs = async (cursor?: string) => {
    setCatBusy(true);
    try {
      const res = await businessesApi.searchCatalogs({
        q: debounced || undefined,
        cursor,
        mineId: bizId,
        limit: 20,
      });
      setCatalogs((s) => (cursor ? [...s, ...res.items] : res.items));
      setCatNext(res.nextCursor);
    } catch {
      /* دوباره با همان جست‌وجو */
    } finally {
      setCatLoading(false);
      setCatBusy(false);
    }
  };
  useEffect(() => {
    setCatLoading(true);
    void loadCatalogs();
     
  }, [debounced]);

  // ── قلم‌های کاتالوگ انتخاب‌شده
  const [items, setItems] = useState<CatalogItemDto[]>([]);
  const [itemsNext, setItemsNext] = useState<string | null>(null);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [picked, setPicked] = useState<CatalogItemDto[]>([]);
  const pickedIds = useMemo(() => new Set(picked.map((p) => p.id)), [picked]);

  const openCatalog = async (c: CatalogSummaryDto) => {
    setSource(c);
    setItems([]);
    setPicked([]);
    setItemsLoading(true);
    try {
      const res = await businessesApi.getCatalogItems({ businessId: c.id, limit: 40 });
      setItems(res.items);
      setItemsNext(res.nextCursor);
    } catch {
      toast({ title: m.picker.copyItemsFailed, variant: "destructive" });
    } finally {
      setItemsLoading(false);
    }
  };

  const loadMoreItems = async () => {
    if (!source || !itemsNext) return;
    setItemsLoading(true);
    try {
      const res = await businessesApi.getCatalogItems({ businessId: source.id, cursor: itemsNext, limit: 40 });
      setItems((s) => [...s, ...res.items]);
      setItemsNext(res.nextCursor);
    } catch {
      /* retry from the button */
    } finally {
      setItemsLoading(false);
    }
  };

  const toggle = (it: CatalogItemDto) =>
    setPicked((list) => (pickedIds.has(it.id) ? list.filter((x) => x.id !== it.id) : [...list, it]));

  const copy = async () => {
    try {
      const res = await listingsApi.copyFrom({
        businessId: bizId,
        sourceBusinessId: source!.id,
        sourceListingIds: picked.map((p) => p.id),
      });
      toast({
        title: m.picker.copySuccess.replace("{n}", fa(res.copied)),
        description: res.already > 0 ? m.picker.copyAlready.replace("{n}", fa(res.already)) : m.picker.copyPriceHint,
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

  // ── گام ۲: قلم‌های کاتالوگ هم‌صنف
  if (source) {
    return (
      <>
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label={m.picker.back}
            onClick={() => {
              setSource(null);
              setPicked([]);
            }}
            className="grid size-8 shrink-0 place-items-center rounded-lg text-muted-foreground transition hover:bg-accent hover:text-foreground"
          >
            <ArrowRight className="size-4 rtl:rotate-180" />
          </button>
          <div className="min-w-0 flex-1">
            <p className="truncate text-base font-extrabold">{source.name}</p>
            <p className="truncate text-[11px] text-muted-foreground">
              {source.trade ? `${source.trade} · ` : ""}
              {source.city} · {m.picker.itemsCount.replace("{n}", fa(source.catalogCount))}
            </p>
          </div>
          {source.isVerified && <BadgeCheck className="size-4 shrink-0 text-primary" />}
        </div>

        {itemsLoading && items.length === 0 ? (
          <p className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
          </p>
        ) : items.length === 0 ? (
          <div className="mt-4 rounded-xl border border-dashed p-6 text-center">
            <PackageSearch className="mx-auto size-6 text-primary/60" />
            <p className="mt-2 text-sm font-bold">{m.picker.copyItemsEmpty}</p>
          </div>
        ) : (
          <div className="mt-4 divide-y">
            {items.map((it) => {
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
                      {it.priceMinor !== null
                        ? m.picker.copyHasPrice.replace("{price}", fmtMoney(it.priceMinor, it.currency ?? "IRR"))
                        : m.picker.copyNoPrice}
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

        {itemsNext && items.length > 0 && (
          <Button variant="outline" size="sm" className="mt-3 w-full" onClick={() => void loadMoreItems()} disabled={itemsLoading}>
            {itemsLoading ? <Loader2 className="size-4 animate-spin" /> : null}
            {m.picker.loadMore}
          </Button>
        )}

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
      </>
    );
  }

  // ── گام ۱: جست‌وجوی کاتالوگ‌ها
  return (
    <>
      <div className="flex items-center gap-2">
        <Copy className="size-5 shrink-0 text-primary" />
        <h1 className="text-lg font-extrabold">{m.picker.sourceCopy}</h1>
      </div>
      <p className="mt-2 text-xs leading-6 text-muted-foreground">{m.picker.copyIntro}</p>

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

      {catLoading ? (
        <p className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
        </p>
      ) : catalogs.length === 0 ? (
        <div className="mt-4 rounded-xl border border-dashed p-6 text-center">
          <Store className="mx-auto size-6 text-primary/60" />
          <p className="mt-2 text-sm font-bold">{m.picker.copyEmpty}</p>
          <p className="mt-1 text-[11px] leading-5 text-muted-foreground">{m.picker.copyEmptyHint}</p>
        </div>
      ) : (
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {catalogs.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => void openCatalog(c)}
              className="flex items-center gap-3 rounded-xl border p-3 text-start transition hover:border-primary/50 hover:bg-accent/30"
            >
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent/70 text-base font-black text-primary/80">
                {c.name.slice(0, 1)}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1">
                  <span className="truncate text-sm font-extrabold">{c.name}</span>
                  {c.isVerified && <BadgeCheck className="size-3.5 shrink-0 text-primary" />}
                </span>
                <span className="block truncate text-[11px] text-muted-foreground">
                  {c.trade ? `${c.trade} · ` : ""}
                  {c.city} · {m.picker.itemsCount.replace("{n}", fa(c.catalogCount))}
                </span>
              </span>
            </button>
          ))}
        </div>
      )}

      {catNext && catalogs.length > 0 && (
        <Button variant="outline" size="sm" className="mt-3 w-full" onClick={() => void loadCatalogs(catNext)} disabled={catBusy}>
          {catBusy ? <Loader2 className="size-4 animate-spin" /> : null}
          {m.picker.loadMore}
        </Button>
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
// منبع ۲ — کاتالوگ مرجع (جست‌وجو + فیلتر برند، بدون ناوبری دسته‌ها)
// ─────────────────────────────────────────────────────────────────────────────

function ReferencePicker({
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

  // ── فیلتر برند — راهِ سریعِ رسیدن به لیستِ مناسب (خواسته‌ی کاربر)
  const [brandQuery, setBrandQuery] = useState("");
  const [brandId, setBrandId] = useState<string | null>(null);
  const brandsQ = useBrands(brandQuery.trim().length >= 2 ? brandQuery.trim() : null);
  const brandSuggestions = (brandsQ.data ?? []).filter((b) => b.id !== brandId);
  const brandName = (brandsQ.data ?? []).find((b) => b.id === brandId)?.name ?? "";

  // ── فید محصولات (صفحه‌ی اول + صفحات «بیشتر»)
  const first = useProducts({
    businessId: bizId,
    q: debounced || undefined,
    brandId: brandId ?? undefined,
    limit: 40,
  });
  const [more, setMore] = useState<{ items: ProductRowDto[]; next: string | null }>({ items: [], next: null });
  const [loadingMore, setLoadingMore] = useState(false);
  useEffect(() => {
    setMore({ items: [], next: null });
  }, [debounced, brandId]);

  const rows = useMemo(() => [...(first.data?.items ?? []), ...more.items], [first.data, more]);
  const nextCursor = more.items.length > 0 ? more.next : (first.data?.nextCursor ?? null);

  const loadMore = async () => {
    const cur = more.items.length > 0 ? more.next : first.data?.nextCursor;
    if (!cur) return;
    setLoadingMore(true);
    try {
      const res = await productsApi.getProducts({
        businessId: bizId,
        q: debounced || undefined,
        brandId: brandId ?? undefined,
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

  return (
    <>
      {step === "pick" ? (
        <>
          <div className="flex items-center gap-2">
            <Library className="size-5 shrink-0 text-primary" />
            <h1 className="text-lg font-extrabold">{m.picker.sourceRef}</h1>
            <span className="hidden rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold text-primary sm:inline">
              {m.picker.tabHint}
            </span>
          </div>

          <div className="relative mt-4">
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

          {/* فیلتر برند — چیپ انتخابی + پیشنهادهای زنده */}
          <div className="mt-2.5">
            {brandId ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-bold text-primary">
                <Store className="size-3.5" />
                {brandName || m.picker.brandChip}
                <button type="button" aria-label={m.picker.brandClear} onClick={() => setBrandId(null)}>
                  <X className="size-3.5" />
                </button>
              </span>
            ) : (
              <div className="relative">
                <Input
                  aria-label={m.picker.brandFilter}
                  placeholder={m.picker.brandFilter}
                  value={brandQuery}
                  maxLength={40}
                  onChange={(e) => setBrandQuery(e.target.value)}
                  className="h-9 text-xs"
                />
                {brandQuery.trim().length >= 2 && brandSuggestions.length > 0 && (
                  <div className="absolute inset-x-0 top-full z-10 mt-1 overflow-hidden rounded-lg border bg-white shadow-lg">
                    {brandSuggestions.slice(0, 5).map((b) => (
                      <button
                        key={b.id}
                        type="button"
                        onClick={() => {
                          setBrandId(b.id);
                          setBrandQuery(b.name);
                        }}
                        className="flex w-full items-center justify-between px-3 py-2 text-start text-sm transition hover:bg-accent"
                      >
                        <span className="font-bold">{b.name}</span>
                        <Check className="size-3.5 text-primary" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ───── ردیف‌های محصول ───── */}
          {first.isLoading ? (
            <p className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
            </p>
          ) : rows.length === 0 ? (
            <div className="mt-4 rounded-xl border border-dashed p-6 text-center">
              <PackageSearch className="mx-auto size-6 text-primary/60" />
              <p className="mt-2 text-sm font-bold">{m.picker.empty}</p>
              <p className="mt-1 text-[11px] leading-5 text-muted-foreground">{m.picker.emptyHint}</p>
            </div>
          ) : (
            <div className="mt-4 divide-y">
              {rows.map((p) => {
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
                    <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent/70 text-base font-black text-primary/80">
                      {p.good.nameFa.slice(0, 1)}
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

          {/* ───── درِ خروج به مسیر آزاد — لیست مرجع بن‌بست نیست ───── */}
          <p className="mt-4 text-center text-[11px] leading-5 text-muted-foreground">
            {m.picker.notHere}{" "}
            <button type="button" onClick={onSwitchToSolo} className="font-bold text-primary underline-offset-2 hover:underline">
              {m.picker.switchToForm}
            </button>
          </p>

          {/* ───── سبد شناور ───── */}
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
