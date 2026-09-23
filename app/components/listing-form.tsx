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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  Check,
  ChevronDown,
  Loader2,
  PackageSearch,
  Plus,
  Search,
  ShoppingBasket,
  Store,
  Tag,
  X,
} from "lucide-react";

/**
 * فرم «ثبت خرید یا فروش عمده» — بازطراحی کامل از صفر (خواسته‌ی کاربر:
 * «کلا این سبک فعلی رو بریز دوره و از صفر یه طرح دیگه بزن»).
 *
 * اصول طراحی این نسخه:
 *   ۱) تا گروه کالا انتخاب نشده «هیچ» دکمه‌ای دیده نمی‌شود — نه ثبت، نه
 *      چیز دیگر. تنها چیزِ ابتدای فرم یک جست‌وجوی تمیز است؛ نتایج در یک
 *      پنل چسبیده به سرچ‌باکس می‌آیند (کامبوباکس یکپارچه — نه کارت‌های
 *      جداجدا که «لیست قشنگ نمیاد»).
 *   ۲) واژه‌شناسی: «گروه کالا» (تصمیم کاربر) — هرگز «کالای مرجع/نوع کالا».
 *   ۳) پیدا نشد؟ یک ردیف در همان پنل: «ثبت «X» به‌عنوان گروه کالای جدید» —
 *      عین الگوی برند؛ بدون پنل اضافه و بدون توضیح اضافه. گروهِ جدید خودکار
 *      در «سایر › جدید» با واحد «عدد» پارک می‌شود و ادمین بعداً جابه‌جا می‌کند.
 *   ۴) بعد از انتخاب: کارت گروه کالا (واحدِ جدا از عنوان — هرگز چسبیده) و
 *      سپس دو بخش مستقل «فروش عمده» و «خرید عمده» (خرید با رنگ برند تا
 *      خرده‌فروش اشتباه نکند). دکمه‌ی ثبت فقط بعد از انتخاب رندر می‌شود.
 *   ۵) همه‌ی اعداد با NumberInput (فرمت زنده‌ی هزارگان)؛ واحد همیشه تهِ باکس.
 *   ۶) صفر توضیحِ اضافه — placeholder مثال می‌دهد و فرم خودش را توضیح می‌دهد.
 */

type Frequency = "WEEKLY" | "MONTHLY" | "OCCASIONAL";
export type ListingKind = "sell" | "buy";

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
  /** حالت ویزارد: دکمه‌ی «بعداً» قبل از انتخاب گروه کالا رندر می‌شود */
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

  // ── انتخاب گروه کالا — سرچ‌محور
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [selected, setSelected] = useState<GoodDto | null>(null);

  // ── مشخصات دو بخش
  const [brandName, setBrandName] = useState("");
  const [attrs, setAttrs] = useState<Record<string, string>>({});
  const [showOptional, setShowOptional] = useState(false); // برند+اتریبیوت جمع‌شده — ثبت سریع اول
  const [price, setPrice] = useState<number | null>(null);
  const [stock, setStock] = useState<number | null>(null);
  const [minOrder, setMinOrder] = useState<number | null>(null);
  const [volume, setVolume] = useState<number | null>(null);
  const [frequency, setFrequency] = useState<Frequency>("MONTHLY");

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), 300);
    return () => clearTimeout(t);
  }, [query]);

  const categoriesQ = useCategories();
  const searchQ = useGoods(debounced.length >= 2 ? { q: debounced, limit: 30 } : {});
  const searching = searchQ.isFetching;
  const results = debounced ? (searchQ.data?.items ?? []) : [];

  // مسیر دسته از درخت: برگ → ریشه («کشاورزی › خشکبار › برنج») — بدون درگیر کردن کاربر
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

  // پنل نتایج — فقط وقتی باز است که کاربر واقعا در حال جست‌وجوست
  const q = query.trim();
  const panelOpen = !selected && q.length >= 2;
  const typing = q !== debounced;
  const spinnerRow = panelOpen && (typing || searching);
  const notFoundRow = panelOpen && !spinnerRow && results.length === 0 && debounced.length >= 2;

  const pickGood = (g: GoodDto) => {
    setSelected(g);
    setShowOptional(false); // هر کالای تازه = شروع سریع؛ تکمیلی‌ها جمع‌شده می‌مانند
    setAttrs({});
    setPrice(null);
    setStock(null);
    setMinOrder(null);
    setVolume(null);
    setQuery("");
    setDebounced("");
  };

  // عین الگوی برند: عبارت جست‌وجو خودش گروه کالای جدید می‌شود — بدون هیچ
  // انتخاب دسته/واحد؛ بک‌اند خودکار در «سایر › جدید» با واحد عدد پارک می‌کند
  // و اگر همین عبارت از قبل وجود داشته باشد، همان رکورد موجود برمی‌گردد.
  const createNewGood = async () => {
    const name = debounced || q;
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
    if (!selected) return; // دکمه بدون انتخاب اصلا رندر نمی‌شود

    // دو بخش مستقل: هر کدام که پر شده اعتبارسنجی و ثبت می‌شود — یا هر دو
    const sellTouched = price !== null || stock !== null || minOrder !== null;
    const sellValid = (price ?? 0) > 0 && (stock ?? 0) > 0 && (minOrder ?? 0) > 0;
    const buyTouched = volume !== null;
    const buyValid = (volume ?? 0) > 0;

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
  const pricePlaceholder = locale === "en"
    ? curDef.exp === 0
      ? "4,800,000"
      : "120"
    : curDef.exp === 0
      ? "۴٬۸۰۰٬۰۰۰"
      : "۱۲۰";

  return (
    <div className="rounded-2xl border bg-white p-6 shadow-sm">
      {/* ── عنوان فرم — بدون هیچ توضیح اضافه ── */}
      <h1 className="text-lg font-extrabold tracking-tight">{m.listing.formTitle}</h1>

      {/* ── گروه کالای انتخاب‌شده — واحد جدا از عنوان، هرگز چسبیده ── */}
      {selected ? (
        <div className="mt-4 flex items-start gap-3 rounded-xl border border-primary/25 bg-primary/[0.04] p-3.5">
          <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
            <PackageSearch className="size-4.5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-extrabold">{goodName(selected, locale)}</p>
            <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
              {pathOf(selected.category.id)}
            </p>
            <span className="mt-2 inline-flex items-center gap-1 rounded-md border bg-white px-1.5 py-0.5 text-[10px] font-bold text-muted-foreground">
              <Tag className="size-3 text-primary" />
              {m.listing.selected.unit.replace("{unit}", unit)}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setSelected(null)}
            aria-label="remove"
            className="grid size-7 shrink-0 place-items-center rounded-lg text-muted-foreground transition hover:bg-accent hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </div>
      ) : (
        /* ── کامبوباکس یکپارچه: سرچ‌باکس + پنل چسبیده — یک سطح بصری واحد ── */
        <div className="relative mt-4">
          <div
            className={cn(
              "flex h-12 items-center gap-2.5 border border-input bg-white px-3.5 transition",
              "focus-within:ring-2 focus-within:ring-ring/40",
              panelOpen ? "rounded-t-xl border-b-0" : "rounded-xl"
            )}
          >
            <Search className="pointer-events-none size-4 shrink-0 text-muted-foreground" />
            <input
              aria-label={m.listing.search.aria}
              placeholder={m.listing.search.placeholder}
              value={query}
              maxLength={40}
              onChange={(e) => setQuery(e.target.value)}
              className="h-full w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              autoFocus
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                aria-label="clear"
                className="grid size-6 shrink-0 place-items-center rounded-md text-muted-foreground transition hover:bg-accent hover:text-foreground"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>

          {panelOpen && (
            <div className="absolute inset-x-0 top-full z-20 max-h-72 overflow-y-auto overscroll-contain rounded-b-xl border border-t-0 bg-white shadow-lg">
              {spinnerRow && (
                <p className="flex items-center gap-2 px-3.5 py-3 text-xs text-muted-foreground">
                  <Loader2 className="size-3.5 animate-spin" />
                  {m.listing.search.searching}
                </p>
              )}

              {!spinnerRow &&
                results.map((g) => (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => pickGood(g)}
                    className="flex w-full items-center gap-3 border-t px-3.5 py-2.5 text-start transition first:border-t-0 hover:bg-accent/60"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-bold">{goodName(g, locale)}</span>
                      <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">
                        {pathOf(g.category.id)}
                      </span>
                    </span>
                    <span className="shrink-0 rounded-md bg-muted px-2 py-1 text-[10px] font-bold text-muted-foreground">
                      {unitLabel(g.unit, locale)}
                    </span>
                  </button>
                ))}

              {notFoundRow && (
                <button
                  type="button"
                  onClick={() => void createNewGood()}
                  disabled={createGoodMutation.isPending}
                  className="flex w-full items-center gap-3 border-t px-3.5 py-3 text-start transition hover:bg-accent/60 disabled:opacity-60"
                >
                  <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                    {createGoodMutation.isPending ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Plus className="size-4" />
                    )}
                  </span>
                  <span className="min-w-0 flex-1 text-sm font-bold">
                    {createGoodMutation.isPending
                      ? m.listing.create.selecting
                      : m.listing.create.asNew.replace("{name}", debounced)}
                  </span>
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── بخش فروش عمده ── */}
      {selected && (
        <div className="mt-5 overflow-hidden rounded-2xl border">
          <div className="flex items-center gap-2.5 border-b bg-muted/30 px-4 py-3">
            <div className="grid size-7 place-items-center rounded-lg bg-primary/10 text-primary">
              <Store className="size-4" />
            </div>
            <p className="text-sm font-extrabold">{m.listing.specs.sellTitle}</p>
            <span className="ms-auto rounded-full border px-2 py-0.5 text-[10px] font-bold text-muted-foreground">
              {m.listing.specs.optionalChip}
            </span>
          </div>

          <div className="grid gap-4 p-4">
            {/* قیمت — قهرمان فرم؛ ردیف کامل */}
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
            <div className="grid grid-cols-2 gap-3">
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

            {/* تکمیلی اختیاری — برند و اتریبیوت‌ها، جمع‌شده تا ثبتِ سریع هیچ‌کس را متوقف نکند */}
            <div className="rounded-xl border border-dashed">
              <button
                type="button"
                onClick={() => setShowOptional((s) => !s)}
                aria-expanded={showOptional}
                className="flex w-full items-center justify-between gap-2 px-3.5 py-2.5 text-start"
              >
                <span className="text-xs font-bold text-muted-foreground">
                  {m.listing.specs.optionalToggle}
                </span>
                <ChevronDown
                  className={cn(
                    "size-4 shrink-0 text-muted-foreground transition",
                    showOptional && "rotate-180"
                  )}
                />
              </button>

              {showOptional && (
                <div className="grid gap-4 px-3.5 pb-3.5">
                  {/* برند */}
                  <div className="relative grid gap-1.5">
                    <Label className="text-[11px] text-muted-foreground">{m.listing.brand.label}</Label>
                    <Input
                      value={brandName}
                      onChange={(e) => setBrandName(e.target.value)}
                      placeholder={m.listing.brand.placeholder}
                    />
                    {brandName.trim() && brandSuggestions.length > 0 && (
                      <div className="absolute inset-x-0 top-full z-10 mt-1 overflow-hidden rounded-xl border bg-white shadow-lg">
                        {brandSuggestions.slice(0, 6).map((b) => (
                          <button
                            key={b.id}
                            type="button"
                            onClick={() => setBrandName(b.name)}
                            className="flex w-full items-center justify-between px-3 py-2 text-start text-sm transition first:border-t hover:bg-accent"
                          >
                            <span className="font-bold">{b.name}</span>
                            <Check className="size-3.5 text-primary" />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* اتریبیوت‌های دسته — همه اختیاری */}
                  {attrsOf.length > 0 && (
                    <div className="grid gap-2.5">
                      <p className="text-[11px] font-bold text-muted-foreground">
                        {m.listing.specs.attrsTitle}
                      </p>
                      <div className="grid grid-cols-2 gap-2.5">
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
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── بخش خرید عمده — رنگ برند تا خرده‌فروش اشتباه نکند ── */}
      {selected && (
        <div className="mt-3 overflow-hidden rounded-2xl border border-primary/25">
          <div className="flex items-center gap-2.5 border-b border-primary/15 bg-primary/[0.04] px-4 py-3">
            <div className="grid size-7 place-items-center rounded-lg bg-primary text-primary-foreground">
              <ShoppingBasket className="size-4" />
            </div>
            <p className="text-sm font-extrabold text-primary">{m.listing.specs.buyTitle}</p>
            <span className="ms-auto rounded-full border border-primary/25 px-2 py-0.5 text-[10px] font-bold text-primary/70">
              {m.listing.specs.optionalChip}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 p-4">
            <Field label={m.listing.specs.volume}>
              <NumberInput
                value={volume}
                onChange={setVolume}
                locale={numLocale}
                min={0}
                suffix={unit}
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

      {/* ── ثبت — فقط بعد از انتخاب گروه کالا؛ بدون انتخاب هیچ دکمه‌ای نیست ── */}
      {selected && (
        <Button
          className="mt-5 h-11 w-full rounded-xl text-sm font-extrabold"
          onClick={() => void save()}
          disabled={saveMutation.isPending || createGoodMutation.isPending}
        >
          {saveMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
          {submitLabel ?? m.listing.save}
        </Button>
      )}

      {/* ویزارد: «بعداً» فقط قبل از انتخاب — هرگز زیر دکمه‌ی ثبت نمی‌نشیند */}
      {!selected && firstGood && onSkip && (
        <Button
          variant="ghost"
          className="mt-3 w-full text-muted-foreground hover:text-foreground"
          onClick={onSkip}
          disabled={saveMutation.isPending}
        >
          {m.listing.firstGood.skip}
        </Button>
      )}
    </div>
  );
}

const FREQUENCY_KEYS = { WEEKLY: 1, MONTHLY: 1, OCCASIONAL: 1 } as const;

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1.5">
      <Label className="text-xs font-semibold text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}
