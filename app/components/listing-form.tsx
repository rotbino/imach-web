"use client";

import { useEffect, useMemo, useState } from "react";
import { ApiError, type CategoryNodeDto, type GoodDto } from "@/lib/api";
import { useBrands, useCategories, useCreateGood, useGoods, useSaveListing } from "@/lib/queries";
import { CURRENCIES, currencyLabel, frequencyLabel, goodName, unitLabel } from "@/lib/format";
import { useMessages } from "@/i18n/messages/use-messages";
import { useLocale } from "@/i18n/locale-context";
import { NumberInput } from "@/components/number-input";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  Check,
  ChevronDown,
  Loader2,
  PackagePlus,
  Plus,
  Search,
  ShoppingBasket,
  Store,
} from "lucide-react";

/**
 * فرم «ثبت خرید یا فروش عمده» — ساختار دومرحله‌ای بر اساس طرح کاربر:
 *
 *   گام ۱ — انتخاب گروه محصول: فقط سرچ (نتایج به‌صورت ردیف‌های ساده با
 *   هاور ملایم)؛ پیدا نشد؟ کادر خط‌چین «ثبت این گروه محصول» (عین الگوی
 *   برند — بدون انتخاب دسته/واحد، بک‌اند در «سایر › جدید» با واحد عدد
 *   پارک می‌کند). در ویزارد دکمه‌ی «بعداً» همین‌جاست.
 *
 *   گام ۲ — مشخصات: هدر با دکمه‌ی بازگشت + گروه محصول انتخاب‌شده، بخش
 *   «فروش عمده»، جداکننده‌ی «یا»، بخش «خرید عمده» که پیش‌فرض بسته است و
 *   با دکمه‌ی خط‌چین اضافه می‌شود (و قابل حذف است)؛ بعد دکمه‌ی ثبت.
 *
 * واژه‌شناسی (تصمیم کاربر): به دسته‌بندی‌ها «گروه کالا» می‌گوییم و به
 * کالای مرجعِ روی فرم‌ها «گروه محصول» — هرگز «کالای مرجع/نوع کالا».
 */

type Frequency = "WEEKLY" | "MONTHLY" | "OCCASIONAL";
export type ListingKind = "sell" | "buy";

const FREQUENCY_KEYS = { WEEKLY: 1, MONTHLY: 1, OCCASIONAL: 1 } as const;

export function ListingForm({
  bizId,
  currency = "IRR",
  firstGood = false,
  submitLabel,
  onSaved,
  onSkip,
}: {
  bizId: string;
  /** واحد پول بازوی فروش — از کشورِ انتخابیِ ثبت‌نام می‌آید */
  currency?: string;
  /** حالت ویزارد: عنوان «اولین کالا» + دکمه‌ی «بعداً» */
  firstGood?: boolean;
  submitLabel?: string;
  onSaved: (kind: ListingKind) => void;
  onSkip?: () => void;
}) {
  const { toast } = useToast();
  const m = useMessages();
  const { locale } = useLocale();
  const numLocale: "fa" | "en" = locale === "en" ? "en" : "fa";
  const saveMutation = useSaveListing();
  const createGoodMutation = useCreateGood();

  // ── مرحله: ۱ انتخاب گروه محصول، ۲ مشخصات
  const [step, setStep] = useState<1 | 2>(1);
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [selected, setSelected] = useState<GoodDto | null>(null);

  // ── مشخصات
  const [brandName, setBrandName] = useState("");
  const [attrs, setAttrs] = useState<Record<string, string>>({});
  const [showExtras, setShowExtras] = useState(false);
  const [price, setPrice] = useState<number | null>(null);
  const [stock, setStock] = useState<number | null>(null);
  const [minOrder, setMinOrder] = useState<number | null>(null);
  const [buyEnabled, setBuyEnabled] = useState(false);
  const [volume, setVolume] = useState<number | null>(null);
  const [frequency, setFrequency] = useState<Frequency>("MONTHLY");

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), 300);
    return () => clearTimeout(t);
  }, [query]);

  const categoriesQ = useCategories();
  const searchQ = useGoods(debounced ? { q: debounced, limit: 30 } : {});
  const searching = searchQ.isFetching;
  const results = debounced ? searchQ.data?.items ?? [] : [];

  // مسیر گروه کالا از درخت: برگ → ریشه («کشاورزی › خشکبار › برنج»)
  const parentOf = useMemo(() => {
    const map = new Map<string, string>();
    const walk = (nodes: CategoryNodeDto[], parent: string | null) => {
      for (const n of nodes) {
        if (parent) map.set(n.id, parent);
        walk(n.children, n.id);
      }
    };
    walk(categoriesQ.data ?? [], null);
    return map;
  }, [categoriesQ.data]);

  const nameOf = useMemo(() => {
    const map = new Map<string, string>();
    const walk = (nodes: CategoryNodeDto[]) => {
      for (const n of nodes) {
        map.set(n.id, goodName(n, locale));
        walk(n.children);
      }
    };
    walk(categoriesQ.data ?? []);
    return map;
  }, [categoriesQ.data, locale]);

  const pathOf = (catId: string): string => {
    const parts: string[] = [];
    let cur: string | undefined = catId;
    while (cur && parts.length < 5) {
      const label = nameOf.get(cur);
      if (label) parts.unshift(label);
      cur = parentOf.get(cur);
    }
    return parts.join(" › ");
  };

  const brandsQ = useBrands(brandName.trim().length >= 1 ? brandName.trim() : null);
  const brandSuggestions = (brandsQ.data ?? []).filter((b) => b.name !== brandName.trim());

  const curDef = CURRENCIES[currency] ?? CURRENCIES.IRR;
  const curName = currencyLabel(currency, locale);

  const pickGood = (g: GoodDto) => {
    setSelected(g);
    setStep(2);
    setShowExtras(false);
    setAttrs({});
    setPrice(null);
    setStock(null);
    setMinOrder(null);
    setBuyEnabled(false);
    setVolume(null);
    setQuery("");
    setDebounced("");
  };

  // عین الگوی برند: عبارت جست‌وجو خودش گروه محصول جدید می‌شود — بدون هیچ
  // انتخاب دسته/واحد؛ بک‌اند خودکار در «سایر › جدید» با واحد عدد پارک می‌کند
  // و اگر همین عبارت از قبل وجود داشته باشد، همان رکورد موجود برمی‌گردد.
  const createNewGood = async () => {
    const name = debounced || query.trim();
    if (name.length < 2) {
      toast({ title: m.listing.errors.nameShort, variant: "destructive" });
      return;
    }
    try {
      const created = await createGoodMutation.mutateAsync({ name });
      toast({ title: goodName(created, locale) });
      pickGood(created);
    } catch (err) {
      toast({
        title: m.listing.errors.createGoodFailed,
        description: err instanceof ApiError ? err.message : m.auth.toasts.tryAgain,
        variant: "destructive",
      });
    }
  };

  const save = async () => {
    if (!selected) return;
    // دو بخش مستقل: فروش همیشه هست، خرید فقط وقتی کاربر اضافه‌اش کرده
    const sellTouched = price !== null || stock !== null || minOrder !== null;
    const sellValid = (price ?? 0) > 0 && (stock ?? 0) > 0 && (minOrder ?? 0) > 0;
    const buyTouched = buyEnabled && volume !== null;
    const buyValid = buyEnabled && (volume ?? 0) > 0;

    if (sellTouched && !sellValid) {
      // اگر فقط حداقل سفارش جا مانده، پیام دقیق‌تر بده — هسته‌ی تطبیق است
      if ((price ?? 0) > 0 && (stock ?? 0) > 0 && (minOrder ?? 0) <= 0) {
        toast({ title: m.listing.errors.minOrder, variant: "destructive" });
      } else {
        toast({ title: m.listing.errors.sellSpec, variant: "destructive" });
      }
      return;
    }
    if (buyTouched && !buyValid) {
      toast({ title: m.listing.errors.buySpec, variant: "destructive" });
      return;
    }
    if (!sellValid && !buyValid) {
      toast({ title: m.listing.errors.nothingFilled, variant: "destructive" });
      return;
    }

    const filledAttrs = Object.fromEntries(Object.entries(attrs).filter(([, v]) => v.trim() !== ""));

    try {
      await saveMutation.mutateAsync({
        businessId: bizId,
        goodId: selected.id,
        mode: sellValid && buyValid ? "BOTH" : sellValid ? "SELL" : "BUY",
        ...(sellValid && brandName.trim() ? { brandName: brandName.trim() } : {}),
        ...(sellValid && Object.keys(filledAttrs).length > 0 ? { attrs: filledAttrs } : {}),
        ...(sellValid
          ? {
              sell: {
                priceMinor: Math.round((price ?? 0) * 10 ** curDef.exp),
                stock: stock ?? 0,
                minOrder: minOrder ?? 0,
              },
            }
          : {}),
        ...(buyValid ? { buy: { volume: volume ?? 0, frequency } } : {}),
      });
      toast({ title: firstGood ? m.listing.success.savedFirst : m.listing.success.saved });
      onSaved(sellValid ? "sell" : "buy");
    } catch (err) {
      toast({
        title: m.listing.errors.saveFailed,
        description: err instanceof ApiError ? err.message : m.auth.toasts.tryAgain,
        variant: "destructive",
      });
    }
  };

  const attrsOf = selected?.category.attrs ?? [];
  const unit = selected ? unitLabel(selected.unit, locale) : "";
  const nothingFound = !!debounced && !searching && results.length === 0 && !selected;
  const pricePlaceholder =
    locale === "en" ? (curDef.exp === 0 ? "4,800,000" : "120") : curDef.exp === 0 ? "۴٬۸۰۰٬۰۰۰" : "۱۲۰";

  return (
    <div className="rounded-2xl border bg-white shadow-sm">
      {/* ── نوار پیشرفت نازک ── */}
      <div className="flex h-1 gap-1 overflow-hidden rounded-t-2xl">
        <div className={`flex-1 ${step >= 1 ? "bg-primary" : "bg-muted"}`} />
        <div className={`flex-1 ${step >= 2 ? "bg-primary" : "bg-muted"}`} />
      </div>

      <div className="p-6">
        {/* ── مرحله ۱: انتخاب گروه محصول ── */}
        {step === 1 && (
          <>
            <h1 className="text-lg font-extrabold">
              {firstGood ? m.listing.firstGood.title : m.listing.formTitle}
            </h1>

            <div className="relative mt-5">
              <Search className="pointer-events-none absolute end-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                aria-label={m.listing.search.aria}
                placeholder={m.listing.search.placeholder}
                value={query}
                maxLength={40}
                onChange={(e) => setQuery(e.target.value)}
                className="h-11 pe-9 text-base"
                autoFocus
              />
            </div>

            {/* نتایج — ردیف‌های ساده با هاور ملایم */}
            {debounced && results.length > 0 && (
              <div className="mt-3 max-h-72 overflow-y-auto">
                {results.map((g) => (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => pickGood(g)}
                    className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-start transition hover:bg-accent"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-bold">{goodName(g, locale)}</span>
                      <span className="block truncate text-[11px] text-muted-foreground">
                        {pathOf(g.category.id)}
                      </span>
                    </span>
                    <Plus className="size-4 shrink-0 text-muted-foreground" />
                  </button>
                ))}
              </div>
            )}

            {searching && (
              <p className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
                {m.listing.catalogLoading}
              </p>
            )}

            {/* پیدا نشد — عین الگوی برند */}
            {nothingFound && (
              <div className="mt-3 rounded-lg border border-dashed p-4">
                <p className="flex items-center gap-1.5 text-sm font-bold">
                  <PackagePlus className="size-4 text-primary" />
                  {m.listing.search.notFoundTitle}
                </p>
                <p className="mt-2 text-[11px] leading-5 text-muted-foreground">
                  {m.listing.create.asNew.replace("{name}", debounced)}
                </p>
                <Button
                  type="button"
                  size="sm"
                  className="mt-3 w-full"
                  onClick={() => void createNewGood()}
                  disabled={createGoodMutation.isPending}
                >
                  {createGoodMutation.isPending ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Plus className="size-4" />
                  )}
                  {m.listing.create.submit}
                </Button>
              </div>
            )}

            {/* ویزارد: «بعداً» — ثبت‌نام هرگز به ثبت کالا گروگان نیست */}
            {firstGood && onSkip && (
              <Button
                variant="ghost"
                className="mt-4 w-full text-muted-foreground hover:text-foreground"
                onClick={onSkip}
                disabled={saveMutation.isPending}
              >
                {m.listing.firstGood.skip}
              </Button>
            )}
          </>
        )}

        {/* ── مرحله ۲: مشخصات ── */}
        {step === 2 && selected && (
          <>
            {/* هدر: بازگشت + گروه محصول انتخاب‌شده */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setStep(1)}
                aria-label={m.listing.back}
                className="grid size-8 shrink-0 place-items-center rounded-lg text-muted-foreground transition hover:bg-accent hover:text-foreground"
              >
                <ArrowLeft className="size-4 rtl:rotate-180" />
              </button>
              <div className="min-w-0 flex-1">
                <p className="truncate text-base font-extrabold">{goodName(selected, locale)}</p>
                <p className="truncate text-[11px] text-muted-foreground">
                  {pathOf(selected.category.id)} · {unit}
                </p>
              </div>
            </div>

            {/* ── فروش عمده ── */}
            <div className="mt-6">
              <p className="mb-3 flex items-center gap-1.5 text-sm font-bold">
                <Store className="size-4 text-primary" />
                {m.listing.sections.sell}
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <Field label={m.listing.specs.price.replace("{unit}", unit)}>
                    <NumberInput
                      value={price}
                      onChange={setPrice}
                      locale={numLocale}
                      min={0}
                      suffix={curName}
                      placeholder={pricePlaceholder}
                      aria-label={m.listing.specs.price.replace("{unit}", unit)}
                    />
                  </Field>
                </div>
                <Field label={m.listing.specs.minOrder}>
                  <NumberInput
                    value={minOrder}
                    onChange={setMinOrder}
                    locale={numLocale}
                    min={0}
                    suffix={unit}
                    aria-label={m.listing.specs.minOrder}
                  />
                </Field>
                <Field label={m.listing.specs.stock}>
                  <NumberInput
                    value={stock}
                    onChange={setStock}
                    locale={numLocale}
                    min={0}
                    suffix={unit}
                    aria-label={m.listing.specs.stock}
                  />
                </Field>
              </div>

              {/* جزئیات اختیاری */}
              <button
                type="button"
                onClick={() => setShowExtras((s) => !s)}
                aria-expanded={showExtras}
                className="mt-3 flex w-full items-center gap-1.5 text-xs font-bold text-primary"
              >
                <ChevronDown className={`size-3.5 transition ${showExtras ? "rotate-180" : ""}`} />
                {m.listing.specs.optionalToggle}
              </button>

              {showExtras && (
                <div className="mt-3 grid gap-3">
                  {/* برند */}
                  <div className="relative">
                    <Field label={m.listing.brand.label}>
                      <Input
                        value={brandName}
                        onChange={(e) => setBrandName(e.target.value)}
                        placeholder={m.listing.brand.placeholder}
                      />
                    </Field>
                    {brandName.trim() && brandSuggestions.length > 0 && (
                      <div className="absolute inset-x-0 top-full z-10 mt-1 overflow-hidden rounded-lg border bg-white shadow-lg">
                        {brandSuggestions.slice(0, 5).map((b) => (
                          <button
                            key={b.id}
                            type="button"
                            onClick={() => setBrandName(b.name)}
                            className="flex w-full items-center justify-between px-3 py-2 text-start text-sm transition hover:bg-accent"
                          >
                            <span className="font-bold">{b.name}</span>
                            <Check className="size-3.5 text-primary" />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* اتریبیوت‌های گروه کالای برگ — همه اختیاری */}
                  {attrsOf.length > 0 && (
                    <div className="grid grid-cols-2 gap-3">
                      {attrsOf.map((a) => (
                        <Field key={a.key} label={locale === "en" ? a.en : a.fa}>
                          {a.type === "enum" && a.options ? (
                            <Select
                              value={attrs[a.key] ?? ""}
                              onValueChange={(v) => setAttrs((s) => ({ ...s, [a.key]: v }))}
                            >
                              <SelectTrigger aria-label={locale === "en" ? a.en : a.fa}>
                                <SelectValue placeholder="—" />
                              </SelectTrigger>
                              <SelectContent>
                                {a.options.map((o) => (
                                  <SelectItem key={o.v} value={o.v}>
                                    {locale === "en" ? o.en : o.fa}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            <Input
                              value={attrs[a.key] ?? ""}
                              onChange={(e) => setAttrs((s) => ({ ...s, [a.key]: e.target.value }))}
                            />
                          )}
                        </Field>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* ── جداکننده ── */}
            <div className="my-5 flex items-center gap-3">
              <div className="h-px flex-1 bg-border" />
              <span className="text-[10px] font-bold text-muted-foreground">{m.listing.sections.or}</span>
              <div className="h-px flex-1 bg-border" />
            </div>

            {/* ── خرید عمده — پیش‌فرض بسته؛ با یک دکمه اضافه می‌شود ── */}
            {!buyEnabled ? (
              <button
                type="button"
                onClick={() => setBuyEnabled(true)}
                className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed py-3 text-xs font-bold text-muted-foreground transition hover:border-primary/40 hover:text-primary"
              >
                <ShoppingBasket className="size-3.5" />
                {m.listing.sections.addBuy}
              </button>
            ) : (
              <div>
                <div className="mb-3 flex items-center justify-between">
                  <p className="flex items-center gap-1.5 text-sm font-bold">
                    <ShoppingBasket className="size-4 text-primary" />
                    {m.listing.sections.buy}
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setBuyEnabled(false);
                      setVolume(null);
                    }}
                    className="text-[11px] text-muted-foreground transition hover:text-foreground"
                  >
                    {m.listing.sections.removeBuy}
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Field label={m.listing.specs.volume}>
                    <NumberInput
                      value={volume}
                      onChange={setVolume}
                      locale={numLocale}
                      min={0}
                      suffix={unit}
                      placeholder="200"
                      aria-label={m.listing.specs.volume}
                    />
                  </Field>
                  <Field label={m.listing.specs.frequency}>
                    <Select value={frequency} onValueChange={(v) => setFrequency(v as Frequency)}>
                      <SelectTrigger aria-label={m.listing.specs.frequency}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(Object.keys(FREQUENCY_KEYS) as Frequency[]).map((f) => (
                          <SelectItem key={f} value={f}>
                            {frequencyLabel(f, locale)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                </div>
              </div>
            )}

            {/* ── ثبت — فقط در گام ۲ رندر می‌شود ── */}
            <Button
              className="mt-6 w-full"
              size="lg"
              onClick={() => void save()}
              disabled={saveMutation.isPending || createGoodMutation.isPending}
            >
              {saveMutation.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Check className="size-4" />
              )}
              {submitLabel ?? m.listing.save}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1.5">
      <Label className="text-[11px] text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}
