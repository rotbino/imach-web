"use client";

import { useEffect, useState } from "react";
import { ApiError, type GoodDto } from "@/lib/api";
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Check, ChevronDown, Loader2, PackagePlus, Search, ShoppingBasket, Store, X } from "lucide-react";

/*
 * فرم ثبت کالا — مشترک بین گام ۳ ویزارد و صفحه «کالای جدید».
 *
 * کالا = «کالای مرجع» (کلاس قابل معامله، مثل «خرمای خازویی»)، نه برند×وزن.
 * جریان عمدا ساده نگه داشته شده:
 *   ۱) جست‌وجو (دوزبانه: فارسی/انگلیسی/مترادف) یا مرور درخت دسته‌ها
 *   ۲) اگر پیدا نشد — ثبت همان کالا به‌عنوان مرجع جدید، بدون ترک فرم
 *   ۳) برند اختیاری (اگر برند ندارد، خالی می‌ماند) + اتریبیوت‌های دسته
 *   ۴) قیمت همیشه در کوچک‌ترین واحدِ ارزِ بازوی فروش (از کشورِ ثبت‌نام)
 */

type Frequency = "WEEKLY" | "MONTHLY" | "OCCASIONAL";
export type ListingKind = "sell" | "buy";

/**
 * واحد پیشنهادی برای کالای مرجع جدید — بر اساس برگِ دسته (استاندارد B2B:
 * واحد مرجعِ ثابت پایه‌ی مقایسه‌پذیری قیمت و تطابق است؛ بسته‌بندی/وزن
 * واریانتِ همان کالا می‌شود، نه واحد دیگر). کاربر می‌تواند عوضش کند.
 */
const UNIT_BY_LEAF: Record<string, string> = {
  "dried-fruit": "KILOGRAM",
  "grains-legumes": "KILOGRAM",
  "fruits-veg": "KILOGRAM",
  livestock: "KILOGRAM",
  pantry: "KILOGRAM",
  dairy: "KILOGRAM",
  drinks: "LITER",
  "bakery-snacks": "CARTON",
  polymers: "KILOGRAM",
  chemicals: "KILOGRAM",
  packaging: "PIECE",
  steel: "KILOGRAM",
  copper: "KILOGRAM",
  "metal-scrap": "KILOGRAM",
  "plastic-scrap": "KILOGRAM",
  clothing: "PIECE",
  fabric: "METER",
  "gold-items": "GRAM",
  logistics: "SERVICE",
  "contract-production": "SERVICE",
};
const FALLBACK_UNIT = "PIECE";

export function ListingForm({
  bizId,
  currency = "IRR",
  firstGood = false,
  submitLabel,
  onSaved,
  kind: kindProp,
  onKindChange,
}: {
  bizId: string;
  /** واحد پول بازوی فروش — از کشورِ انتخابیِ ثبت‌نام می‌آید */
  currency?: string;
  /** حالت ویزارد: لحن «اولین کالا» */
  firstGood?: boolean;
  submitLabel?: string;
  onSaved: (kind: ListingKind) => void;
  /** کنترل‌شده — صفحه، تب را با URL سینک می‌کند (/new?tab=sell|buy) */
  kind?: ListingKind;
  onKindChange?: (kind: ListingKind) => void;
}) {
  const { toast } = useToast();
  const m = useMessages();
  const { locale } = useLocale();
  const saveMutation = useSaveListing();
  const createGoodMutation = useCreateGood();

  const [innerKind, setInnerKind] = useState<ListingKind>(kindProp ?? "sell"); // پیش‌فرض: کاتالوگ فروش
  const kind = kindProp ?? innerKind;
  const setKind = (k: ListingKind) => {
    setInnerKind(k);
    onKindChange?.(k);
  };
  const isSell = kind === "sell";

  // ── انتخاب کالای مرجع ──
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [rootSlug, setRootSlug] = useState("");
  const [leafId, setLeafId] = useState("");
  const [selected, setSelected] = useState<GoodDto | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  // ── برند + اتریبیوت + مشخصات ──
  const [brandName, setBrandName] = useState("");
  const [attrs, setAttrs] = useState<Record<string, string>>({});
  const [price, setPrice] = useState<number | null>(null);
  const [stock, setStock] = useState<number | null>(null);
  const [minOrder, setMinOrder] = useState<number | null>(null);
  const [volume, setVolume] = useState<number | null>(null);
  const [frequency, setFrequency] = useState<Frequency>("MONTHLY");

  // ── فرم کالای جدید (پیدا نشد) ──
  const [newName, setNewName] = useState("");
  const [newRoot, setNewRoot] = useState("");
  const [newLeaf, setNewLeaf] = useState("");
  const [newUnit, setNewUnit] = useState(FALLBACK_UNIT);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), 300);
    return () => clearTimeout(t);
  }, [query]);

  const categoriesQ = useCategories();
  const roots = categoriesQ.data ?? [];
  const activeRoot = roots.find((r) => r.slug === rootSlug) ?? null;
  const searchQ = useGoods(debounced ? { q: debounced, limit: 30 } : {});
  const browseQ = useGoods(leafId && !debounced ? { categoryId: leafId, limit: 100 } : {});
  const searching = searchQ.isFetching;
  const results = debounced ? (searchQ.data?.items ?? []) : (browseQ.data?.items ?? []);

  const brandsQ = useBrands(brandName.trim().length >= 1 ? brandName.trim() : null);
  const brandSuggestions = (brandsQ.data ?? []).filter((b) => b.name !== brandName.trim());

  const curDef = CURRENCIES[currency] ?? CURRENCIES.IRR;
  const curName = currencyLabel(currency, locale);

  // پنل «ثبت کالای جدید» وقتی جستجو بی‌نتیجه است، خودش باز می‌شود
  useEffect(() => {
    if (debounced && !searching && results.length === 0) {
      setShowCreate(true);
      setNewName((n) => n || debounced);
    }
  }, [debounced, searching, results.length]);

  const pickGood = (g: GoodDto) => {
    setSelected(g);
    setShowCreate(false);
    setAttrs({});
    setPrice(null);
    setStock(null);
    setMinOrder(null);
    setVolume(null);
  };

  const newRootObj = roots.find((r) => r.slug === newRoot) ?? null;
  const newLeafObj = newRootObj?.children.find((c) => c.id === newLeaf) ?? null;

  const createNewGood = async () => {
    if (newName.trim().length < 2) {
      toast({ title: m.listing.errors.nameShort, variant: "destructive" });
      return;
    }
    if (!newLeafObj) {
      toast({ title: m.listing.errors.pickCategory, variant: "destructive" });
      return;
    }
    try {
      const created = await createGoodMutation.mutateAsync({
        name: newName.trim(),
        categoryId: newLeafObj.id,
        unit: newUnit,
      });
      pickGood(created);
      setQuery("");
      setDebounced("");
      toast({ title: goodName(created, locale) });
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
    if (isSell) {
      if ((price ?? 0) <= 0 || (stock ?? 0) <= 0) {
        toast({ title: m.listing.errors.sellSpec, variant: "destructive" });
        return;
      }
    } else if ((volume ?? 0) <= 0) {
      toast({ title: m.listing.errors.buySpec, variant: "destructive" });
      return;
    }

    const filledAttrs = Object.fromEntries(Object.entries(attrs).filter(([, v]) => v.trim() !== ""));

    try {
      await saveMutation.mutateAsync({
        businessId: bizId,
        goodId: selected.id,
        mode: isSell ? "SELL" : "BUY",
        ...(brandName.trim() ? { brandName: brandName.trim() } : {}),
        ...(Object.keys(filledAttrs).length > 0 ? { attrs: filledAttrs } : {}),
        ...(isSell
          ? {
              sell: {
                priceMinor: Math.round((price ?? 0) * 10 ** curDef.exp),
                stock: stock ?? 0,
                minOrder: minOrder ?? 0,
              },
            }
          : { buy: { volume: volume ?? 0, frequency } }),
      });
      toast({ title: firstGood ? m.listing.success.savedFirst : m.listing.success.saved });
      onSaved(kind);
    } catch (err) {
      toast({
        title: m.listing.errors.saveFailed,
        description: err instanceof ApiError ? err.message : m.auth.toasts.tryAgain,
        variant: "destructive",
      });
    }
  };

  const catLabel = (g: GoodDto): string => goodName(g.category, locale);
  const attrsOf = selected?.category.attrs ?? [];

  return (
    <div className="rounded-2xl border bg-white p-6 shadow-sm">
      {firstGood && (
        <h1 className="text-lg font-extrabold">
          {isSell ? m.listing.firstGood.sell : m.listing.firstGood.buy}
        </h1>
      )}

      {/* انتخاب بازو: فروش یا خرید — هر دو بازو از اول در دسترس است */}
      <Tabs value={kind} onValueChange={(v) => setKind(v as ListingKind)}>
        <TabsList className="mt-4 grid w-full grid-cols-2">
          <TabsTrigger value="sell" className="gap-1.5">
            <Store className="size-4" />
            {m.listing.tabs.sell}
          </TabsTrigger>
          <TabsTrigger value="buy" className="gap-1.5">
            <ShoppingBasket className="size-4" />
            {m.listing.tabs.buy}
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* جست‌وجوی کالای مرجع — دوزبانه */}
      <div className="relative mt-4">
        <Search className="pointer-events-none absolute end-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          aria-label={m.listing.search.aria}
          placeholder={m.listing.search.placeholder}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pe-9"
        />
      </div>

      {/* کالای انتخاب‌شده */}
      {selected && (
        <div className="mt-3 flex items-center justify-between gap-2 rounded-xl border border-primary/20 bg-accent/50 px-3.5 py-2.5">
          <div className="min-w-0">
            <p className="truncate text-sm font-extrabold text-primary">
              {goodName(selected, locale)}
              <span className="ms-1.5 text-[11px] font-medium text-muted-foreground">
                {catLabel(selected)} · {unitLabel(selected.unit, locale)}
              </span>
            </p>
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

      {/* نتایج جست‌وجو */}
      {!selected && debounced && (
        <div className="mt-3">
          {results.length > 0 && (
            <>
              <p className="mb-2 text-[11px] font-bold text-muted-foreground">{m.listing.search.results}</p>
              <GoodGrid
                items={results}
                onPick={pickGood}
                locale={locale}
                catLabel={catLabel}
                emptyLabel={m.listing.search.empty}
              />
              {/* درختی که نتیجه می‌آید ممکن است همان کالا با املای دیگر باشد —
                  ساخت رکورد جدید همیشه در دسترس می‌ماند تا کاتالوگ دوپلی نشود */}
              {!showCreate && (
                <button
                  type="button"
                  onClick={() => {
                    setShowCreate(true);
                    setNewName((n) => n || debounced);
                  }}
                  className="mt-2 w-full rounded-xl border border-dashed border-primary/30 px-3 py-2 text-xs font-bold text-primary transition hover:bg-accent/50"
                >
                  {m.listing.create.open}
                </button>
              )}
            </>
          )}
          {searching && (
            <p className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              {m.listing.catalogLoading}
            </p>
          )}
        </div>
      )}

      {/* مرور درخت دسته‌ها (وقتی جستجو خالی است) */}
      {!selected && !debounced && (
        <div className="mt-3">
          <p className="mb-2 text-[11px] font-bold text-muted-foreground">{m.listing.search.browse}</p>
          <div className="flex flex-wrap gap-2">
            {roots.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => {
                  setRootSlug(rootSlug === r.slug ? "" : r.slug);
                  setLeafId("");
                }}
                aria-pressed={rootSlug === r.slug}
                className={`rounded-full border px-3 py-1.5 text-xs font-bold transition ${
                  rootSlug === r.slug
                    ? "border-primary bg-primary text-primary-foreground"
                    : "bg-white text-muted-foreground hover:border-primary/40"
                }`}
              >
                {goodName(r, locale)}
              </button>
            ))}
          </div>

          {activeRoot && (
            <div className="mt-2.5 flex flex-wrap gap-2">
              {activeRoot.children.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setLeafId(leafId === c.id ? "" : c.id)}
                  aria-pressed={leafId === c.id}
                  className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                    leafId === c.id
                      ? "border-primary bg-accent text-primary"
                      : "bg-white text-muted-foreground hover:border-primary/40"
                  }`}
                >
                  {goodName(c, locale)}
                </button>
              ))}
            </div>
          )}

          <div className="mt-3">
            {leafId && browseQ.isFetching && (
              <p className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
                {m.listing.catalogLoading}
              </p>
            )}
            {leafId && !browseQ.isFetching && (
              <GoodGrid
                items={results}
                onPick={pickGood}
                locale={locale}
                catLabel={catLabel}
                emptyLabel={m.listing.search.empty}
              />
            )}
          </div>
        </div>
      )}

      {/* ثبت کالای مرجع جدید — وقتی پیدا نشد */}
      {(showCreate || (!selected && debounced && !searching && results.length === 0)) && (
        <div className="mt-3 rounded-xl border border-dashed border-primary/30 bg-accent/30 p-4">
          <p className="flex items-center gap-1.5 text-sm font-extrabold">
            <PackagePlus className="size-4 text-primary" />
            {m.listing.create.title.replace("{name}", newName || debounced)}
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">{m.listing.search.notFoundHint}</p>

          <div className="mt-3 grid gap-2.5">
            <Field label={m.listing.create.nameLabel}>
              <Input value={newName} onChange={(e) => setNewName(e.target.value)} />
            </Field>

            <div className="grid grid-cols-2 gap-2.5">
              <Field label={m.listing.create.categoryLabel}>
                <Select
                  value={newRoot}
                  onValueChange={(v) => {
                    setNewRoot(v);
                    setNewLeaf("");
                  }}
                >
                  <SelectTrigger aria-label={m.listing.create.categoryLabel}>
                    <SelectValue placeholder={m.listing.create.categoryPlaceholder} />
                  </SelectTrigger>
                  <SelectContent>
                    {roots.map((r) => (
                      <SelectItem key={r.id} value={r.slug}>
                        {goodName(r, locale)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="‌">
                <Select
                  value={newLeaf}
                  onValueChange={(v) => {
                    setNewLeaf(v);
                    // واحد پیشنهادی دسته — قابل تغییر
                    const leaf = newRootObj?.children.find((c) => c.id === v);
                    setNewUnit(UNIT_BY_LEAF[leaf?.slug ?? ""] ?? FALLBACK_UNIT);
                  }}
                  disabled={!newRootObj}
                >
                  <SelectTrigger aria-label={m.listing.create.categoryLabel}>
                    <SelectValue placeholder={m.listing.create.categoryPlaceholder} />
                  </SelectTrigger>
                  <SelectContent>
                    {(newRootObj?.children ?? []).map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {goodName(c, locale)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>

            <Field label={m.listing.create.unitLabel}>
              <Select value={newUnit} onValueChange={setNewUnit}>
                <SelectTrigger aria-label={m.listing.create.unitLabel}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["KILOGRAM", "TON", "CARTON", "SACK", "PIECE", "LITER", "METER", "GRAM", "SERVICE"].map((u) => (
                    <SelectItem key={u} value={u}>
                      {unitLabel(u, locale)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>

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

      {/* برند اختیاری + اتریبیوت‌ها + مشخصات */}
      {selected && (
        <div className={`mt-4 rounded-xl border p-4 ${isSell ? "border-primary/15 bg-accent/40" : "border-stone-200 bg-stone-50"}`}>
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
            <div className="mt-4">
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

          {/* مشخصات فروش/خرید */}
          <p className="mb-3 mt-4 flex items-center gap-1.5 text-sm font-extrabold">
            {isSell ? <Store className="size-4 text-primary" /> : <ShoppingBasket className="size-4 text-stone-700" />}
            {isSell
              ? m.listing.specs.sellTitle.replace("{name}", goodName(selected, locale))
              : m.listing.specs.buyTitle.replace("{name}", goodName(selected, locale))}
          </p>
          {isSell ? (
            <div className="grid grid-cols-2 gap-3">
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
              <Field label={m.listing.specs.stock}>
                <NumberInput
                  value={stock}
                  onChange={setStock}
                  min={0}
                  suffix={unitLabel(selected.unit, locale)}
                  aria-label={m.listing.specs.stock}
                />
              </Field>
              <Field label={m.listing.specs.minOrder}>
                <NumberInput
                  value={minOrder}
                  onChange={setMinOrder}
                  min={0}
                  suffix={unitLabel(selected.unit, locale)}
                  aria-label={m.listing.specs.minOrder}
                />
              </Field>
            </div>
          ) : (
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
          )}
        </div>
      )}

      <Button className="mt-5 w-full" onClick={() => void save()} disabled={saveMutation.isPending}>
        {saveMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
        {submitLabel ?? m.listing.save}
      </Button>
    </div>
  );
}

const FREQUENCY_KEYS = { WEEKLY: 1, MONTHLY: 1, OCCASIONAL: 1 } as const;

function GoodGrid({
  items,
  onPick,
  locale,
  catLabel,
  emptyLabel,
}: {
  items: GoodDto[];
  onPick: (g: GoodDto) => void;
  locale: string;
  catLabel: (g: GoodDto) => string;
  emptyLabel: string;
}) {
  return (
    <div className="grid max-h-64 grid-cols-2 gap-2 overflow-y-auto pe-1 sm:grid-cols-3">
      {items.map((g) => (
        <button
          key={g.id}
          type="button"
          onClick={() => onPick(g)}
          className="flex items-center justify-between rounded-xl border p-3 text-start transition hover:border-primary/40"
        >
          <span className="min-w-0">
            <span className="block truncate text-sm font-bold">{goodName(g, locale)}</span>
            <span className="block truncate text-[11px] text-muted-foreground">
              {catLabel(g)} · {unitLabel(g.unit, locale)}
            </span>
          </span>
          <ChevronDown className="size-4 shrink-0 -rotate-90 text-muted-foreground/50" />
        </button>
      ))}
      {items.length === 0 && (
        <p className="col-span-2 py-4 text-sm text-muted-foreground sm:col-span-3">{emptyLabel}</p>
      )}
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
