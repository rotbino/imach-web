"use client";

import { useEffect, useMemo, useState } from "react";
import { ApiError, type CategoryNodeDto, type GoodDto } from "@/lib/api";
import { useBrands, useCategories, useCreateGood, useGoods, useSaveListing, useUploadFile } from "@/lib/queries";
import { compressImage } from "@/lib/compress";
import { CURRENCIES, currencyLabel, fa, frequencyLabel, goodName, unitLabel } from "@/lib/format";
import { useMessages } from "@/i18n/messages/use-messages";
import { useLocale } from "@/i18n/locale-context";
import { NumberInput } from "@/components/number-input";
import { UploadRing } from "@/components/upload-ring";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  Check,
  ChevronDown,
  ImagePlus,
  Loader2,
  PackagePlus,
  Plus,
  Search,
  ShoppingBasket,
  Store,
  X,
} from "lucide-react";

/**
 * فرم ثبت کالا — دومرحله‌ای:
 *
 *   گام ۱ — انتخاب گروه محصول (سرچ + نتایج).
 *   گام ۲ — بعد از انتخاب کالا، کاربر اول نقشش را می‌گوید:
 *             «من این کالا را: می‌فروشم / می‌خرم / هر دو»
 *           سپس بخش(های) مربوطه باز می‌شوند.
 *           ویژگی‌های کالا (برند + اتریبیوت) بیرون از هر دو کادر، مشترک.
 */

type Frequency = "WEEKLY" | "MONTHLY" | "OCCASIONAL";
export type ListingKind = "sell" | "buy";
type Arm = "sell" | "buy" | "both";

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
  currency?: string;
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

  // ── نقش کاربر برای این کالا
  const [arm, setArm] = useState<Arm | null>(null);

  // ── فروش عمده
  const [price, setPrice] = useState<number | null>(null);
  const [stock, setStock] = useState<number | null>(null);
  const [minOrder, setMinOrder] = useState<number | null>(null);

  // ── خرید عمده
  const [volume, setVolume] = useState<number | null>(null);
  const [frequency, setFrequency] = useState<Frequency>("MONTHLY");

  // ── ویژگی‌های کالا (مشترک بین فروش و خرید)
  const [brandName, setBrandName] = useState("");
  const [attrs, setAttrs] = useState<Record<string, string>>({});
  const [showAttrs, setShowAttrs] = useState(false);

  // ── گالری کالا — فایل‌ها همین‌جا نگه داشته می‌شوند و بلافاصله بعد از ثبتِ
  // آگهی آپلود می‌شوند (فایل قبل از ذخیره‌ی مدل آپلود نشود — خواسته‌ی کاربر)
  // آپلود ترتیبی است و درصدِ هر عکس روی همان کاشی دیده می‌شود
  const uploadFile = useUploadFile();
  const [pendingImages, setPendingImages] = useState<File[]>([]);
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [uploadIndex, setUploadIndex] = useState<number | null>(null);
  const [progress, setProgress] = useState(0);
  /** فاز آپلود فعلی — sending = بایت‌ها، processing = کارِ سرور (آروان + تامبنیل) */
  const [uploadPhase, setUploadPhase] = useState<"sending" | "processing">("sending");

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), 300);
    return () => clearTimeout(t);
  }, [query]);

  const categoriesQ = useCategories();
  const searchQ = useGoods(debounced ? { q: debounced, limit: 30 } : {});
  const searching = searchQ.isFetching;
  const results = debounced ? searchQ.data?.items ?? [] : [];

  // مسیر گروه کالا از درخت
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
    setArm(null);
    setPrice(null);
    setStock(null);
    setMinOrder(null);
    setVolume(null);
    setFrequency("MONTHLY");
    setBrandName("");
    setAttrs({});
    setShowAttrs(false);
    setPendingImages([]);
    setImageUrls([]);
    setQuery("");
    setDebounced("");
  };

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

  const addImage = (file: File) => {
    if (pendingImages.length >= 6) {
      toast({ title: m.files.tooMany, variant: "destructive" });
      return;
    }
    setPendingImages((list) => [...list, file]);
    setImageUrls((list) => [...list, URL.createObjectURL(file)]);
  };

  const removeImage = (index: number) => {
    setPendingImages((list) => list.filter((_, i) => i !== index));
    setImageUrls((list) => list.filter((_, i) => i !== index));
  };

  /**
   * آپلود گالری بعد از ثبت آگهی — غیرمسدودکننده: آگهی ذخیره‌شده می‌ماند.
   * هر عکس اول سمت کلاینت فشرده می‌شود (هدف ≤ ۵۰۰KB) بعد می‌رود؛ درصدِ
   * پیشرفت روی کاشیِ همان عکس نمایش داده می‌شود (خواسته‌ی کاربر).
   */
  const uploadGallery = async (listingId: string) => {
    if (pendingImages.length === 0) return;
    setUploadingImages(true);
    let failed = 0;
    for (let i = 0; i < pendingImages.length; i++) {
      setUploadIndex(i);
      setProgress(0);
      setUploadPhase("sending");
      try {
        const file = await compressImage(pendingImages[i]);
        await uploadFile.mutateAsync({
          file,
          model: "Listing",
          modelId: listingId,
          key: "gallery",
          replace: false,
          onProgress: (pct, phase) => {
            setProgress(pct);
            setUploadPhase(phase);
          },
        });
      } catch {
        failed++;
      }
    }
    setUploadingImages(false);
    setUploadIndex(null);
    if (failed > 0) toast({ title: m.files.failed, description: m.files.galleryPending });
  };

  const save = async () => {
    if (!selected || !arm) return;

    const sellValid = (price ?? 0) > 0 && (stock ?? 0) > 0 && (minOrder ?? 0) > 0;
    const buyValid = (volume ?? 0) > 0;

    // اعتبارسنجی بر اساس انتخاب کاربر
    if (arm === "sell" && !sellValid) {
      if ((price ?? 0) > 0 && (stock ?? 0) > 0 && (minOrder ?? 0) <= 0) {
        toast({ title: m.listing.errors.minOrder, variant: "destructive" });
      } else {
        toast({ title: m.listing.errors.sellSpec, variant: "destructive" });
      }
      return;
    }
    if (arm === "buy" && !buyValid) {
      toast({ title: m.listing.errors.buySpec, variant: "destructive" });
      return;
    }
    if (arm === "both") {
      if (!sellValid) {
        toast({ title: m.listing.errors.sellSpec, variant: "destructive" });
        return;
      }
      if (!buyValid) {
        toast({ title: m.listing.errors.buySpec, variant: "destructive" });
        return;
      }
    }

    const filledAttrs = Object.fromEntries(Object.entries(attrs).filter(([, v]) => v.trim() !== ""));

    try {
      const created = await saveMutation.mutateAsync({
        businessId: bizId,
        goodId: selected.id,
        mode: arm === "both" ? "BOTH" : arm === "sell" ? "SELL" : "BUY",
        ...(brandName.trim() ? { brandName: brandName.trim() } : {}),
        ...(Object.keys(filledAttrs).length > 0 ? { attrs: filledAttrs } : {}),
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
      // آگهی ذخیره شد → حالا (و فقط حالا) عکس‌ها آپلود می‌شوند
      await uploadGallery(created.id);
      toast({ title: firstGood ? m.listing.success.savedFirst : m.listing.success.saved });
      onSaved(arm === "buy" ? "buy" : "sell");
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
        {/* نوار پیشرفت نازک */}
        <div className="flex h-1 gap-1 overflow-hidden rounded-t-2xl">
          <div className={`flex-1 ${step >= 1 ? "bg-primary" : "bg-muted"}`} />
          <div className={`flex-1 ${step >= 2 ? "bg-primary" : "bg-muted"}`} />
        </div>

        <div className="p-6">
          {/* ═══════════ گام ۱: انتخاب گروه محصول ═══════════ */}
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

          {/* ═══════════ گام ۲: مشخصات ═══════════ */}
          {step === 2 && selected && (
              <>
                {/* هدر */}
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

                {/* ───── سؤال نقش ───── */}
                <div className="mt-6">
                  <p className="mb-3 text-sm font-bold">{m.listing.arm.question}</p>
                  <div className="grid grid-cols-3 gap-1 rounded-lg bg-muted p-1">
                    <button
                        type="button"
                        onClick={() => setArm("sell")}
                        className={`rounded-md py-2 text-xs font-bold transition ${
                            arm === "sell" ? "bg-white text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"
                        }`}
                    >
                      {m.listing.arm.sell}
                    </button>
                    <button
                        type="button"
                        onClick={() => setArm("buy")}
                        className={`rounded-md py-2 text-xs font-bold transition ${
                            arm === "buy" ? "bg-white text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"
                        }`}
                    >
                      {m.listing.arm.buy}
                    </button>
                    <button
                        type="button"
                        onClick={() => setArm("both")}
                        className={`rounded-md py-2 text-xs font-bold transition ${
                            arm === "both" ? "bg-white text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"
                        }`}
                    >
                      {m.listing.arm.both}
                    </button>
                  </div>
                </div>

                {/* ───── گالری کالا — بالاتر از مشخصات (خواسته‌ی کاربر) ───── */}
                {arm && (
                    <section className="mt-5">
                      <p className="flex items-center gap-1.5 text-sm font-bold">
                        <ImagePlus className="size-4 text-primary" />
                        {m.files.galleryTitle}
                      </p>
                      <p className="mt-1 text-[11px] leading-5 text-muted-foreground">{m.files.galleryHint}</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {imageUrls.map((url, i) => (
                            <div key={url} className="relative size-20 overflow-hidden rounded-xl border">
                              { }
                              <img src={url} alt="" className="h-full w-full object-cover" />
                              {uploadingImages && uploadIndex === i && (
                                  /* حلقه‌ی پیشرفت برند — بزرگ، درصد با رنگ برند وسط حلقه؛
                                     در فاز پردازشِ سرور قوس چرخان + «در حال پردازش» تا درصدِ
                                     ۹۹ دیگر الکی به‌نظر نرسد (خواسته‌ی کاربر) */
                                  <div className="absolute inset-0 z-10 grid place-items-center bg-background/85 backdrop-blur-[1.5px]">
                                    <UploadRing
                                      progress={progress}
                                      phase={uploadPhase}
                                      size={72}
                                      processingLabel={m.files.processing}
                                    />
                                  </div>
                              )}
                              <button
                                  type="button"
                                  aria-label="remove"
                                  className="absolute end-0.5 top-0.5 grid size-5 place-items-center rounded-full bg-black/60 text-white transition hover:bg-destructive"
                                  onClick={() => removeImage(i)}
                              >
                                <X className="size-3" />
                              </button>
                            </div>
                        ))}
                        {pendingImages.length < 6 && (
                            <label className="grid size-20 cursor-pointer place-items-center rounded-xl border border-dashed text-muted-foreground transition hover:border-primary/60 hover:bg-accent/40 hover:text-primary">
                              <input
                                  type="file"
                                  accept="image/*"
                                  className="hidden"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    e.target.value = "";
                                    if (file) addImage(file);
                                  }}
                                  disabled={uploadingImages}
                              />
                              <ImagePlus className="size-5" strokeWidth={1.75} />
                            </label>
                        )}
                      </div>
                    </section>
                )}

                {/* ───── بخش فروش عمده ───── */}
                {(arm === "sell" || arm === "both") && (
                    <section className="mt-5 rounded-xl border p-4">
                      <h3 className="mb-3 flex items-center gap-1.5 text-sm font-bold">
                        <Store className="size-4 text-primary" />
                        {m.listing.sections.sell}
                      </h3>
                      {/* موبایل: هر فیلد یک ردیف کامل — عددهای بزرگ جا می‌شوند
                          (خواسته‌ی کاربر: «توی موبایل بنداز زیر هم») */}
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <div className="sm:col-span-2">
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
                    </section>
                )}

                {/* ───── بخش خرید عمده ───── */}
                {(arm === "buy" || arm === "both") && (
                    <section className="mt-4 rounded-xl border p-4">
                      <h3 className="mb-3 flex items-center gap-1.5 text-sm font-bold">
                        <ShoppingBasket className="size-4 text-primary" />
                        {m.listing.sections.buy}
                      </h3>
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
                    </section>
                )}

                {/* ───── ویژگی‌های کالا (مشترک، بیرون از دو کادر) ───── */}
                {arm && (
                    <section className="mt-4">
                      <button
                          type="button"
                          onClick={() => setShowAttrs((s) => !s)}
                          aria-expanded={showAttrs}
                          className="flex w-full items-center gap-1.5 text-xs font-bold text-primary"
                      >
                        <ChevronDown className={`size-3.5 transition ${showAttrs ? "rotate-180" : ""}`} />
                        {m.listing.specs.optionalToggle}
                      </button>

                      {showAttrs && (
                          <div className="mt-3 rounded-xl border p-4">
                            <p className="mb-3 text-[11px] leading-5 text-muted-foreground">
                              {m.listing.specs.attrsHint}
                            </p>
                            <div className="grid gap-3">
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

                              {/* اتریبیوت‌ها */}
                              {attrsOf.length > 0 && (
                                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
                          </div>
                      )}
                    </section>
                )}

                {/* ───── ثبت ───── */}
                {arm && (
                    <Button
                        className="mt-6 w-full"
                        size="lg"
                        onClick={() => void save()}
                        disabled={saveMutation.isPending || createGoodMutation.isPending || uploadingImages}
                    >
                      {saveMutation.isPending || uploadingImages ? (
                          <Loader2 className="size-4 animate-spin" />
                      ) : (
                          <Check className="size-4" />
                      )}
                      {uploadingImages ? m.files.uploading : (submitLabel ?? m.listing.save)}
                    </Button>
                )}
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