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
import { Check, ChevronDown, Loader2, PackagePlus, Search, Settings2, ShoppingBasket, Store, X } from "lucide-react";

/**
 * فرم ثبت کالا — مشترک بین گام ۳ ویزارد و صفحه «کالای جدید».
 *
 * طراحی تازه (خواسته‌ی کاربر — «ساده‌سازی تا حد هلو»):
 *   ۱) کاربر وارد که می‌شود هیچ چیزی نیست جز یک سرچ‌باکس هوشمندِ «نوع کالا» —
 *      نه مرور دسته‌ها، نه تب فروش/خرید، نه دکمه‌ی اضافه.
 *   ۲) نتایج با مسیر دسته (مثلا «مواد غذایی › برنج») می‌آیند تا کاربر بداند
 *      چه چیزی را انتخاب می‌کند؛ دسته‌بندی هرگز مستقیم به او نشان داده نمی‌شود.
 *   ۳) اگر پیدا نشد — عین الگوی برند: زیر سرچ می‌نویسیم «به‌عنوان نوع کالای
 *      جدید ثبت می‌شود» و همان عبارت جست‌وجو ثبت می‌شود؛ بدون انتخاب
 *      گروه/زیرگروه/واحد — خودکار در سبد «سایر › جدید» با واحد «عدد» پارک
 *      می‌شود و ادمین بعداً باغبانی می‌کند. راهنمای جست‌وجوی بهتر هم بالای آن.
 *   ۴) بعد از انتخاب نوع کالا دو کادر می‌آید:
 *        «اگر برای این کالا فروش عمده دارید این قسمت را پر کنید»
 *        «اگر برای این کالا خرید عمده دارید این قسمت را پر کنید»
 *      خریدِ عمده با رنگ برند بولد است تا خرده‌فروش اشتباه نکند. هر کدام
 *      (یا هر دو) پر شوند — بک‌اند با mode=SELL/BUY/BOTH یک‌جا ذخیره می‌کند.
 *   ۵) واژه‌شناسی: هرگز «کالای مرجع» — همیشه «نوع کالا» (خواسته‌ی کاربر:
 *      «کالای مرجع» کاربر را به ثبت «کنسرو مکنزی ۲۴۰ گرم» می‌کشاند).
 *   ۶) قیمت همیشه در کوچک‌ترین واحدِ ارزِ بازوی فروش (از کشورِ ثبت‌نام).
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
  /** حالت ویزارد: لحن «اولین کالا» */
  firstGood?: boolean;
  submitLabel?: string;
  onSaved: (kind: ListingKind) => void;
  /** «بعداً، بذار توی کاتالوگم» — فقط در حالت ویزارد اولین کالا رندر می‌شود */
  onSkip?: () => void;
}) {
  const { toast } = useToast();
  const m = useMessages();
  const { locale } = useLocale();
  const saveMutation = useSaveListing();
  const createGoodMutation = useCreateGood();

  // ── انتخاب نوع کالا — سرچ‌محور؛ بدون مرور دسته‌ها
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [selected, setSelected] = useState<GoodDto | null>(null);

  // ── مشخصات دو کادر
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
  const searchQ = useGoods(debounced ? { q: debounced, limit: 30 } : {});
  const searching = searchQ.isFetching;
  const results = debounced ? (searchQ.data?.items ?? []) : [];

  // مسیر دسته از درخت: برگ → ریشه («مواد غذایی › برنج») — بدون درگیر کردن کاربر
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
    setShowOptional(false); // هر کالای تازه = شروع سریع؛ تکمیلی‌ها جمع‌شده می‌مانند
    setAttrs({});
    setPrice(null);
    setStock(null);
    setMinOrder(null);
    setVolume(null);
    setQuery("");
    setDebounced("");
  };

  // عین الگوی برند: عبارت جست‌وجو خودش نوع کالای جدید می‌شود — بدون هیچ
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
    if (!selected) {
      toast({ title: m.listing.errors.selectGood, variant: "destructive" });
      return;
    }
    // دو کادر مستقل: هر کدام که پر شده اعتبارسنجی و ثبت می‌شود — یا هر دو
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
  const nothingFound = !!debounced && !searching && results.length === 0 && !selected;

  return (
    <div className="rounded-2xl border bg-white p-6 shadow-sm">
      {/* ── عنوان فرم ── */}
      <h1 className="text-lg font-extrabold">
        {firstGood ? m.listing.firstGood.title : m.listing.formTitle}
      </h1>
      <p className="mt-1 text-xs text-muted-foreground">{m.listing.formDesc}</p>

      {/* ── گام ۱: سرچ‌باکس هوشمند نوع کالا — تنها چیزِ ابتدای فرم ── */}
      {!selected && (
        <div className="mt-4">
          <Label className="text-[11px] text-muted-foreground">{m.listing.search.aria}</Label>
          <div className="relative mt-1.5">
            <Search className="pointer-events-none absolute end-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              aria-label={m.listing.search.aria}
              placeholder={m.listing.search.placeholder}
              value={query}
              maxLength={40}
              onChange={(e) => setQuery(e.target.value)}
              className="pe-9"
              autoFocus
            />
          </div>
          <p className="mt-1.5 text-[10px] leading-4 text-muted-foreground">{m.listing.search.typeExplainer}</p>
        </div>
      )}

      {/* ── نوع کالای انتخاب‌شده ── */}
      {selected && (
        <div className="mt-4 flex items-center justify-between gap-2 rounded-xl border border-primary/20 bg-accent/50 px-3.5 py-2.5">
          <div className="min-w-0">
            <p className="truncate text-sm font-extrabold text-primary">
              {goodName(selected, locale)}
              <span className="ms-1.5 text-[11px] font-medium text-muted-foreground">
                {unitLabel(selected.unit, locale)}
              </span>
            </p>
            <p className="truncate text-[11px] text-muted-foreground">{pathOf(selected.category.id)}</p>
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
      )}

      {/* ── نتایج جست‌وجو — مسیر دسته زیر هر نتیجه ── */}
      {!selected && debounced && results.length > 0 && (
        <div className="mt-3">
          <p className="mb-2 text-[11px] font-bold text-muted-foreground">{m.listing.search.results}</p>
          <div className="grid max-h-64 gap-2 overflow-y-auto pe-1">
            {results.map((g) => (
              <button
                key={g.id}
                type="button"
                onClick={() => pickGood(g)}
                className="flex items-center justify-between rounded-xl border p-3 text-start transition hover:border-primary/40"
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm font-bold">{goodName(g, locale)}</span>
                  <span className="block truncate text-[11px] text-muted-foreground">
                    {pathOf(g.category.id)} · {unitLabel(g.unit, locale)}
                  </span>
                </span>
                <ChevronDown className="size-4 shrink-0 -rotate-90 text-muted-foreground/50" />
              </button>
            ))}
          </div>
        </div>
      )}

      {searching && (
        <p className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          {m.listing.catalogLoading}
        </p>
      )}

      {/* ── پیدا نشد؟ راهنمای جست‌وجوی بهتر + ثبت عین الگوی برند ── */}
      {nothingFound && (
        <div className="mt-3 rounded-xl border border-dashed border-primary/30 bg-accent/30 p-4">
          <p className="flex items-center gap-1.5 text-sm font-extrabold">
            <PackagePlus className="size-4 text-primary" />
            {m.listing.search.notFoundTitle}
          </p>
          <p className="mt-1.5 text-[11px] leading-5 text-muted-foreground">{m.listing.search.searchHint}</p>
          <p className="mt-1 text-[11px] leading-5 text-muted-foreground">{m.listing.create.asNew.replace("{name}", debounced)}</p>
          <p className="mt-1 text-[10px] leading-4 text-muted-foreground">{m.listing.create.note}</p>
          <Button
            type="button"
            size="sm"
            className="mt-3 w-full"
            onClick={() => void createNewGood()}
            disabled={createGoodMutation.isPending}
          >
            {createGoodMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
            {createGoodMutation.isPending ? m.listing.create.selecting : m.listing.create.submit}
          </Button>
        </div>
      )}

      {/* ── گام ۲: دو کادر — فروش عمده و خرید عمده؛ هر کدام که دارید ── */}
      {selected && (
        <>
          {/* فروش عمده */}
          <div className="mt-4 rounded-xl border border-primary/15 bg-accent/40 p-4">
            <p className="mb-3 flex items-center gap-1.5 text-sm">
              <Store className="size-4 text-primary" />
              <span>
                اگر برای این کالا <b className="font-extrabold">فروش عمده</b> دارید، این قسمت را پر کنید
              </span>
            </p>
            <div className="grid grid-cols-2 gap-3">
              {/* قیمت — قهرمان فرم؛ ردیف کامل */}
              <div className="col-span-2">
                <Field label={m.listing.specs.price.replace("{unit}", unitLabel(selected.unit, locale))}>
                  <NumberInput
                    value={price}
                    onChange={setPrice}
                    min={0}
                    suffix={curName}
                    placeholder={curDef.exp === 0 ? "7200000" : "120"}
                    aria-label={m.listing.specs.price.replace("{unit}", unitLabel(selected.unit, locale))}
                  />
                </Field>
              </div>
              <Field label={m.listing.specs.minOrder}>
                <NumberInput
                  value={minOrder}
                  onChange={setMinOrder}
                  min={0}
                  suffix={unitLabel(selected.unit, locale)}
                  aria-label={m.listing.specs.minOrder}
                />
              </Field>
              <Field label={m.listing.specs.stock}>
                <NumberInput
                  value={stock}
                  onChange={setStock}
                  min={0}
                  suffix={unitLabel(selected.unit, locale)}
                  aria-label={m.listing.specs.stock}
                />
              </Field>
            </div>

            {/* تکمیلی اختیاری — برند و اتریبیوت‌ها، جمع‌شده تا ثبتِ سریع هیچ‌کس را متوقف نکند */}
            <div className="mt-3 rounded-lg border border-dashed border-primary/25 p-3">
              <button
                type="button"
                onClick={() => setShowOptional((s) => !s)}
                aria-expanded={showOptional}
                className="flex w-full items-center justify-between gap-2 text-start"
              >
                <span className="flex items-center gap-1.5 text-xs font-bold">
                  <Settings2 className="size-3.5 text-primary" />
                  {m.listing.specs.optionalToggle}
                </span>
                <ChevronDown className={`size-4 shrink-0 text-muted-foreground transition ${showOptional ? "rotate-180" : ""}`} />
              </button>

              {showOptional && (
                <div className="mt-3 grid gap-4">
                  <p className="text-[11px] leading-5 text-muted-foreground">{m.listing.specs.optionalHint}</p>
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
                        <p className="border-b bg-muted/60 px-3 py-1.5 text-[10px] font-bold text-muted-foreground">
                          {m.listing.brand.suggestions}
                        </p>
                        {brandSuggestions.slice(0, 6).map((b) => (
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
                    {brandName.trim() && brandSuggestions.length === 0 && !brandsQ.isFetching && (
                      <p className="text-[10px] text-muted-foreground">{m.listing.brand.newHint}</p>
                    )}
                  </div>

                  {/* اتریبیوت‌های دسته — همه اختیاری */}
                  {attrsOf.length > 0 && (
                    <div>
                      <p className="mb-2 text-[11px] font-bold text-muted-foreground">{m.listing.specs.attrsTitle}</p>
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

          {/* خرید عمده — با رنگ برند بولد تا خرده‌فروش اشتباه نکند */}
          <div className="mt-3 rounded-xl border border-primary/30 bg-primary/5 p-4">
            <p className="mb-3 flex items-center gap-1.5 text-sm">
              <ShoppingBasket className="size-4 text-primary" />
              <span>
                اگر برای این کالا <b className="font-extrabold text-primary">خرید عمده</b> دارید، این قسمت را پر کنید
              </span>
            </p>
            <div className="grid grid-cols-2 gap-3">
              <Field label={m.listing.specs.volume}>
                <NumberInput
                  value={volume}
                  onChange={setVolume}
                  min={0}
                  suffix={unitLabel(selected.unit, locale)}
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
        </>
      )}

      <Button
        className="mt-5 w-full"
        onClick={() => void save()}
        disabled={saveMutation.isPending || createGoodMutation.isPending}
      >
        {saveMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
        {submitLabel ?? m.listing.save}
      </Button>

      {firstGood && onSkip && (
        <Button
          variant="ghost"
          className="mt-2 w-full text-muted-foreground hover:text-foreground"
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
      <Label className="text-[11px] text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}
