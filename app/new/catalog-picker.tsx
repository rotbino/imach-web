"use client";

import { useEffect, useMemo, useState } from "react";
import { ApiError, type CategoryNodeDto, type ProductRowDto } from "@/lib/api";
import { productsApi } from "@/lib/api";
import { useBulkSaveListings, useCategories, useProducts } from "@/lib/queries";
import { CURRENCIES, categoryName, currencyLabel, fa, goodName, unitLabel } from "@/lib/format";
import { useMessages } from "@/i18n/messages/use-messages";
import { useLocale } from "@/i18n/locale-context";
import { NumberInput } from "@/components/number-input";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronLeft,
  Library,
  Loader2,
  PackageSearch,
  Plus,
  Search,
  Store,
  X,
} from "lucide-react";

/**
 * ─── انتخابگر کاتالوگ مرجع ───────────────────────────────────────────────────
 * برای خرده‌فروشِ پرقلم (خواسته‌ی کاربر): به‌جای تایپ تک‌به‌تکِ صدها کالا،
 * از لیست مشترک تیک می‌زند، در یک جدول فشرده قیمت می‌دهد و یک‌جا ثبت می‌کند.
 *
 * سه قانون ظرافت که در طراحی این صفحه رعایت شده:
 *  ۱. هیچ فیلد اجباریِ تازه‌ای در کار نیست — فقط قیمت (فروش) یا حتی هیچ (خرید).
 *  ۲. هر ردیف دو نشان اعتماد دارد: «N فروشنده» (این SKU مشترک است) و «داریش».
 *  ۳. اگر کالایی در لیست نبود، یک کلیک به فرم آزاد برمی‌گردد — لیست مرجع
 *     هرگز بن‌بست نیست؛ کالای جدید از همان مسیر تایپ به لیست اضافه می‌شود
 *     و برای فروشنده‌ی بعدی همین‌جا ظاهر می‌شود (رشد ارگانیک).
 */

type Draft = { price?: number | null; stock?: number | null; minOrder?: number | null; volume?: number | null };

export function CatalogPicker({
  bizId,
  currency,
  arm,
  onDone,
  onSwitchToForm,
}: {
  bizId: string;
  currency: string;
  /** بازوی هدف این دفعه — انتخابگر هر بار یک بازو را پر می‌کند */
  arm: "sell" | "buy";
  onDone: (kind: "sell" | "buy") => void;
  onSwitchToForm: () => void;
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

  // ── جست‌وجو + مرور دسته‌ها
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), 300);
    return () => clearTimeout(t);
  }, [query]);
  const categoriesQ = useCategories();
  const [path, setPath] = useState<CategoryNodeDto[]>([]);
  const leaf = path.length > 0 ? path[path.length - 1] : null;
  const categoryId = leaf ? leaf.id : undefined;

  // ── فید محصولات (صفحه‌ی اول + صفحات «بیشتر»)
  const first = useProducts({
    businessId: bizId,
    q: debounced || undefined,
    categoryId,
    limit: 40,
  });
  const [more, setMore] = useState<{ items: ProductRowDto[]; next: string | null }>({ items: [], next: null });
  const [loadingMore, setLoadingMore] = useState(false);
  useEffect(() => {
    setMore({ items: [], next: null });
  }, [debounced, categoryId]);

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
        categoryId,
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
        // حلقه‌ی افزودن سریع (خواسته‌ی کاربر: لیست خرید کم‌کم تشکیل می‌شود) —
        // ثبت شد، سبد خالی می‌ماند و همان‌جا تیک‌زدن ادامه پیدا می‌کند
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

  // ── سطح فعلی درخت دسته‌ها
  const level = useMemo(() => (path.length > 0 ? path[path.length - 1].children : categoriesQ.data ?? []), [path, categoriesQ.data]);

  return (
    <div className="relative rounded-2xl border bg-white shadow-sm">
      <div className="p-6">
        {step === "pick" ? (
          <>
            {/* ───── سرچ + مسیر دسته‌ها ───── */}
            <div className="flex items-center gap-2">
              <Library className="size-5 shrink-0 text-primary" />
              <h1 className="text-lg font-extrabold">{m.picker.tabLabel}</h1>
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

            {/* نان‌ریزه‌ی دسته‌ها + چیپ‌های سطح جاری */}
            <div className="mt-3">
              <div className="flex flex-wrap items-center gap-1 text-[11px] text-muted-foreground">
                <button
                  type="button"
                  className="rounded px-1 py-0.5 font-bold transition hover:text-primary"
                  onClick={() => setPath([])}
                >
                  {m.picker.categoryRoot}
                </button>
                {path.map((n, i) => (
                  <span key={n.id} className="flex items-center gap-1">
                    <ChevronLeft className="size-3 rtl:rotate-180" />
                    <button
                      type="button"
                      className="rounded px-1 py-0.5 font-bold transition hover:text-primary"
                      onClick={() => setPath(path.slice(0, i + 1))}
                    >
                      {goodName(n, locale)}
                    </button>
                  </span>
                ))}
              </div>
              {!debounced && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {level.map((n) => (
                    <button
                      key={n.id}
                      type="button"
                      onClick={() => setPath([...path, n])}
                      className="rounded-full border bg-accent/40 px-3 py-1.5 text-xs font-bold text-foreground/80 transition hover:border-primary/50 hover:text-primary"
                    >
                      {goodName(n, locale)}
                    </button>
                  ))}
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
                      className={`flex w-full items-center gap-3 py-3 text-start transition ${
                        isPicked ? "bg-accent/40" : "hover:bg-accent/30"
                      } rounded-lg px-1`}
                    >
                      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent/70 text-base font-black text-primary/80">
                        {p.good.nameFa.slice(0, 1)}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-extrabold">{p.label}</span>
                        <span className="block truncate text-[11px] text-muted-foreground">
                          {goodName(p.good, locale)} · {categoryName(p.good.category)}
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
              <button type="button" onClick={onSwitchToForm} className="font-bold text-primary underline-offset-2 hover:underline">
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
                aria-label={m.picker.categoryRoot}
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
      </div>
    </div>
  );
}
