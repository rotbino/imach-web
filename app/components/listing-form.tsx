"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { ApiError, type CategoryNodeDto, type GoodDto, type ProductRowDto } from "@/lib/api";
import { useBrands, useCategories, useCreateGood, useGoods, useProducts, useSaveListing, useUploadFile } from "@/lib/queries";
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

  // ── مرحله: ۱ انتخاب گروه محصول، ۱.۵ انتخاب SKU، ۲ مشخصات
  const [step, setStep] = useState<1 | 1.5 | 2>(1);
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [selected, setSelected] = useState<GoodDto | null>(null);

  // ── SKU انتخاب‌شده از کالاهای مرجع (اگر کاربر یکی را برداشت)
  const [selectedProduct, setSelectedProduct] = useState<ProductRowDto | null>(null);
  // ── فیلتر برند برای لیست SKU ها
  const [skuBrandId, setSkuBrandId] = useState<string | null>(null); // null = همه، "other" = بدون برند

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
  // ── برند: کاربر صراحتاً می‌گوید کالایش برند دارد یا نه
  //   • اگر toggle روشن باشد: برند را انتخاب/جست‌وجو می‌کند → بک‌اند Product مرجع می‌سازد
  //   • اگر toggle خاموش باشد: کالای فله، مستقیم روی Good می‌نشیند (productId=null)
  const [hasBrand, setHasBrand] = useState(false);
  const [newBrandMode, setNewBrandMode] = useState(false); // وقتی دکمه «جدید» زده شود
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

  // ── لیست SKU های مرجع برای Good انتخاب‌شده (گام ۱.۵)
  // وقتی کاربر نوع کالا را انتخاب کرد، همه‌ی Product های متصل به آن Good
  // لود می‌شوند تا کاربر بگوید کدامشان منظورش است. برندها از خود لیست
  // استخراج می‌شوند؛ اگر Productی برند ندارد، زیر «سایر» فیلتر می‌شود.
  const skuQ = useProducts({
    businessId: bizId,
    goodId: selected?.id,
    brandId: skuBrandId === "other" ? undefined : skuBrandId ?? undefined,
    limit: 50,
    enabled: step === 1.5 && !!selected,
  });
  const skuRows = skuQ.data?.items ?? [];
  const skuBrands = skuQ.data?.brands ?? [];
  // فیلتر نهایی روی rows — اگر "other" انتخاب شده، فقط بی‌برندها
  const skuDisplayRows = useMemo(() => {
    if (skuBrandId === "other") return skuRows.filter((p) => !p.brand);
    if (skuBrandId) return skuRows.filter((p) => p.brand?.id === skuBrandId);
    return skuRows;
  }, [skuRows, skuBrandId]);

  const pickGood = (g: GoodDto) => {
    setSelected(g);
    setSelectedProduct(null);
    setSkuBrandId(null);
    setStep(1.5); // ── بعد از انتخاب نوع کالا، برو به گام انتخاب SKU
    setArm(null);
    setPrice(null);
    setStock(null);
    setMinOrder(null);
    setVolume(null);
    setFrequency("MONTHLY");
    setHasBrand(false);
    setNewBrandMode(false);
    setBrandName("");
    setAttrs({});
    setShowAttrs(false);
    setPendingImages([]);
    setImageUrls([]);
    setQuery("");
    setDebounced("");
  };

  // ── انتخاب SKU از لیست محصولات — پرش به گام ۲ با(productId پر)
  const pickSku = (p: ProductRowDto) => {
    setSelectedProduct(p);
    // برند SKU را روی فرم set کن تا در گام ۲ نمایش داده شود
    setHasBrand(!!p.brand);
    setNewBrandMode(false);
    setBrandName(p.brand?.name ?? "");
    setStep(2);
  };

  // ── skip کردن گام SKU و ساختن محصول جدید با ویژگی‌ها
  // وقتی هیچ SKU ای وجود ندارد یا کاربر می‌خواهد کالای متفاوتی بسازد
  const skipSku = () => {
    setSelectedProduct(null);
    setHasBrand(false);
    setNewBrandMode(false);
    setBrandName("");
    setAttrs({});
    setShowAttrs(false);
    setStep(2);
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

    // ── منطق برند → Product:
    // • اگر SKU انتخاب شده → productId از SKU می‌آید (همان مسیر)
    // • اگر کاربر گفت «کالا برند دارد» → باید برند را انتخاب/وارد کند
    //   بک‌اند خودش Product مرجع find-or-create می‌کند
    // • اگر کاربر گفت «برند ندارد» → کالای فله، مستقیم روی Good می‌نشیند (productId=null)
    if (!selectedProduct && hasBrand && !brandName.trim()) {
      toast({
        title: m.listing.errors.brandRequired,
        description: m.listing.errors.brandRequiredDesc,
        variant: "destructive",
      });
      return;
    }

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
        // ── اگر SKU انتخاب شده، productId را پاس بده تا Listing به همان Product وصل شود
        ...(selectedProduct ? { productId: selectedProduct.id } : {}),
        // ─ـ برند فقط وقتی فرستاده می‌شود که کاربر صراحتاً «برند دارد» را زده باشد
        // و SKU از قبل انتخاب نشده باشد (در غیر این صورت برند از SKU می‌آید)
        ...(!selectedProduct && hasBrand && brandName.trim() ? { brandName: brandName.trim() } : {}),
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
  // ── برندهایی که در کالاهای مرجع همین Good هستند — برای نمایش سریع به‌عنوان چیپ
  // از skuQ (گام ۱.۵) می‌آیند، ولی اگر کاربر مستقیم از گام ۱ به ۲ پرید، آن‌ها را
  // اینجا هم فراخوانی می‌کنیم (cache می‌شود پس نگران سرعت نیست).
  const goodBrandsQ = useProducts({
    businessId: bizId,
    goodId: selected?.id,
    limit: 50,
    enabled: !!selected && step === 2 && !selectedProduct,
  });
  const goodBrands = useMemo(() => {
    // استخراج برندهای یکتا از لیست Products این Good
    const seen = new Map<string, string>(); // id → name
    for (const p of (goodBrandsQ.data?.items ?? [])) {
      if (p.brand) seen.set(p.brand.id, p.brand.name);
    }
    return [...seen.entries()].map(([id, name]) => ({ id, name }));
  }, [goodBrandsQ.data]);
  const unit = selected ? unitLabel(selected.unit, locale) : "";
  const nothingFound = !!debounced && !searching && results.length === 0 && !selected;
  const pricePlaceholder =
      locale === "en" ? (curDef.exp === 0 ? "4,800,000" : "120") : curDef.exp === 0 ? "۴٬۸۰۰٬۰۰۰" : "۱۲۰";

  return (
      <div className="rounded-2xl border bg-white shadow-sm">
        {/* نوار پیشرفت نازک */}
        <div className="flex h-1 gap-1 overflow-hidden rounded-t-2xl">
          <div className={`flex-1 ${step >= 1 ? "bg-primary" : "bg-muted"}`} />
          <div className={`flex-1 ${step >= 1.5 ? "bg-primary" : "bg-muted"}`} />
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
                      maxLength={20}
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

          {/* ═══════════ گام ۱.۵: انتخاب SKU از کالاهای مرجع ═══════════ */}
          {step === 1.5 && selected && (
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
                    <p className="truncate text-base font-extrabold">
                      {m.listing.sku.title.replace("{good}", goodName(selected, locale))}
                    </p>
                    <p className="truncate text-[11px] text-muted-foreground">
                      {pathOf(selected.category.id)} · {unit}
                    </p>
                  </div>
                </div>

                <p className="mt-3 text-[11px] leading-5 text-muted-foreground">
                  {m.listing.sku.hint}
                </p>

                {/* نوار برند — از خود لیست SKU استخراج شده */}
                {skuBrands.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      <button
                          type="button"
                          onClick={() => setSkuBrandId(null)}
                          className={`rounded-full border px-2.5 py-1 text-[11px] font-bold transition ${
                              skuBrandId === null ? "border-primary bg-primary/10 text-primary" : "border-stone-200 bg-white text-stone-600 hover:border-primary/40"
                          }`}
                      >
                        {m.listing.sku.all}
                      </button>
                      {skuBrands.map((b) => (
                          <button
                              key={b.id}
                              type="button"
                              onClick={() => setSkuBrandId(b.id)}
                              className={`rounded-full border px-2.5 py-1 text-[11px] font-bold transition ${
                                  skuBrandId === b.id ? "border-primary bg-primary/10 text-primary" : "border-stone-200 bg-white text-stone-600 hover:border-primary/40"
                              }`}
                          >
                              {b.name}
                              <span className="ms-1 text-[9px] text-muted-foreground">{fa(b.count)}</span>
                          </button>
                      ))}
                      {/* «سایر» — کالاهای بدون برند */}
                      {skuRows.some((p) => !p.brand) && (
                          <button
                              type="button"
                              onClick={() => setSkuBrandId("other")}
                              className={`rounded-full border px-2.5 py-1 text-[11px] font-bold transition ${
                                  skuBrandId === "other" ? "border-primary bg-primary/10 text-primary" : "border-stone-200 bg-white text-stone-600 hover:border-primary/40"
                              }`}
                          >
                              {m.listing.sku.otherBrand}
                          </button>
                      )}
                    </div>
                )}

                {/* لیست SKU ها */}
                {skuQ.isLoading || skuQ.isFetching ? (
                    <p className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
                      <Loader2 className="size-4 animate-spin" />
                      {m.listing.catalogLoading}
                    </p>
                ) : skuDisplayRows.length === 0 ? (
                    <div className="mt-4 rounded-xl border border-dashed p-6 text-center">
                      <PackagePlus className="mx-auto size-6 text-primary/60" />
                      <p className="mt-2 text-sm font-bold">{m.listing.sku.empty}</p>
                      <p className="mt-1 text-[11px] leading-5 text-muted-foreground">
                        {m.listing.sku.emptyHint}
                      </p>
                      <Button
                          type="button"
                          size="sm"
                          className="mt-3"
                          onClick={skipSku}
                      >
                        <Plus className="size-4" />
                        {m.listing.sku.createNew}
                      </Button>
                    </div>
                ) : (
                    <div className="mt-4 divide-y">
                      {skuDisplayRows.map((p) => (
                          <button
                              key={p.id}
                              type="button"
                              onClick={() => pickSku(p)}
                              className="flex w-full items-center gap-3 rounded-lg px-1 py-3 text-start transition hover:bg-accent/30"
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
                                <span className="block truncate text-[11px] text-muted-foreground">
                                  {p.brand ? p.brand.name : m.listing.sku.otherBrand}
                                </span>
                              </span>
                              <Plus className="size-4 shrink-0 text-muted-foreground" />
                          </button>
                      ))}
                    </div>
                )}

                {/* لینک «ساختن محصول جدید» — همیشه در دسترس */}
                {skuDisplayRows.length > 0 && (
                    <p className="mt-4 text-center text-[11px] leading-5 text-muted-foreground">
                      {m.listing.sku.notHereQuestion}{" "}
                      <button
                          type="button"
                          onClick={skipSku}
                          className="font-bold text-primary underline-offset-2 hover:underline"
                      >
                        {m.listing.sku.createNew}
                      </button>
                    </p>
                )}
              </>
          )}

          {/* ═══════════ گام ۲: مشخصات ═══════════ */}
          {step === 2 && selected && (
              <>
                {/* هدر — اگر محصول انتخاب شده، عنوان محصول بالا و نوع کالا زیرش؛
                    اگر محصول نمی‌سازد (فله)، نوع کالا بالا و «کالای فله» زیرش */}
                <div className="flex items-center gap-3">
                  <button
                      type="button"
                      onClick={() => setStep(selectedProduct ? 1.5 : 1)}
                      aria-label={m.listing.back}
                      className="grid size-8 shrink-0 place-items-center rounded-lg text-muted-foreground transition hover:bg-accent hover:text-foreground"
                  >
                    <ArrowLeft className="size-4 rtl:rotate-180" />
                  </button>
                  <div className="min-w-0 flex-1">
                    {selectedProduct ? (
                      <>
                        <p className="truncate text-base font-extrabold">{selectedProduct.label}</p>
                        <p className="truncate text-[11px] text-muted-foreground">
                          {goodName(selected, locale)} · {pathOf(selected.category.id)}
                        </p>
                      </>
                    ) : hasBrand && brandName.trim() ? (
                      <>
                        {/* دارد محصول می‌سازد: برند بالا، نوع کالا زیر */}
                        <p className="truncate text-base font-extrabold">{brandName.trim()} · {goodName(selected, locale)}</p>
                        <p className="truncate text-[11px] text-muted-foreground">
                          {pathOf(selected.category.id)} · {unit} · {m.listing.sku.buildingHint}
                        </p>
                      </>
                    ) : (
                      <>
                        {/* فله — بدون محصول */}
                        <p className="truncate text-base font-extrabold">{goodName(selected, locale)}</p>
                        <p className="truncate text-[11px] text-muted-foreground">
                          {pathOf(selected.category.id)} · {unit} · {m.listing.sku.bulkHint}
                        </p>
                      </>
                    )}
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
                      {/* دسکتاپ: هر سه فیلد در یک ردیف — موبایل: زیر هم */}
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
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

                {/* ───── برند و ویژگی‌های کالا ───── */}
                {arm && (
                    <section className="mt-4">
                      {/* اگر SKU انتخاب شده، اطلاعاتش را فقط‌خواندنی نشان بده */}
                      {selectedProduct ? (
                          <div className="rounded-xl border border-primary/30 bg-primary/5 p-4">
                            <p className="mb-2 flex items-center gap-1.5 text-xs font-bold text-primary">
                              <Check className="size-3.5" />
                              {m.listing.sku.pickedLabel}
                            </p>
                            <p className="text-sm font-extrabold">{selectedProduct.label}</p>
                            <p className="mt-0.5 text-[11px] text-muted-foreground">
                              {selectedProduct.brand ? selectedProduct.brand.name : m.listing.sku.otherBrand} · {goodName(selected, locale)}
                            </p>
                            <button
                                type="button"
                                onClick={() => { setSelectedProduct(null); setStep(1.5); }}
                                className="mt-2 text-[11px] font-bold text-primary hover:underline"
                            >
                              {m.listing.sku.backToGood}
                            </button>
                          </div>
                      ) : (
                          <div className="rounded-xl border p-4">
                            {/* سؤال برند — toggle صریح */}
                            <div className="flex items-center justify-between gap-3">
                              <div className="min-w-0">
                                <p className="text-sm font-bold">{m.listing.brand.hasBrandQuestion}</p>
                                <p className="mt-0.5 text-[11px] leading-5 text-muted-foreground">
                                  {hasBrand ? m.listing.brand.hasBrandHint : m.listing.brand.noBrandHint}
                                </p>
                              </div>
                              <button
                                  type="button"
                                  role="switch"
                                  aria-checked={hasBrand}
                                  onClick={() => {
                                    setHasBrand((v) => !v);
                                    setNewBrandMode(false); // وقتی toggle می‌شود، حالت جدید را ریست کن
                                    if (hasBrand) setBrandName(""); // وقتی خاموش می‌شود، برند را پاک کن
                                  }}
                                  className={`relative h-6 w-11 shrink-0 rounded-full transition ${hasBrand ? "bg-primary" : "bg-muted-foreground/30"}`}
                              >
                                <span className={`absolute top-0.5 size-5 rounded-full bg-white shadow transition ${hasBrand ? "start-0.5" : "start-5"}`} />
                              </button>
                            </div>

                            {/* انتخابگر برند — فقط وقتی toggle روشن است */}
                            {hasBrand && (
                                <div className="mt-4 space-y-3">
                                  {/* چیپ‌های برندهای موجود برای این Good + دکمه جدید */}
                                  {goodBrands.length > 0 && (
                                      <div>
                                        <p className="mb-1.5 text-[11px] font-bold text-muted-foreground">
                                          {m.listing.brand.pickExisting}
                                        </p>
                                        <div className="flex flex-wrap gap-1.5">
                                          {goodBrands.map((b) => (
                                              <button
                                                  key={b.id}
                                                  type="button"
                                                  onClick={() => { setBrandName(b.name); setNewBrandMode(false); }}
                                                  className={`rounded-full border px-2.5 py-1 text-[11px] font-bold transition ${
                                                    brandName.trim() === b.name && !newBrandMode
                                                      ? "border-primary bg-primary/10 text-primary"
                                                      : "border-stone-200 bg-white text-stone-600 hover:border-primary/40"
                                                  }`}
                                              >
                                                {b.name}
                                              </button>
                                          ))}
                                          {/* دکمه جدید — فقط وقتی کلیک شود تکست باکس می‌آید */}
                                          <button
                                              type="button"
                                              onClick={() => { setNewBrandMode(true); setBrandName(""); }}
                                              className={`rounded-full border px-2.5 py-1 text-[11px] font-bold transition ${
                                                newBrandMode
                                                  ? "border-primary bg-primary/10 text-primary"
                                                  : "border-dashed border-primary/50 text-primary hover:border-primary"
                                              }`}
                                          >
                                            <Plus className="ms-0.5 -mt-0.5 inline size-3" />
                                            {m.listing.brand.newBrandButton}
                                          </button>
                                        </div>
                                      </div>
                                  )}

                                  {/* تکست باکس برند جدید — فقط وقتی دکمه جدید زده شد یا هیچ برند موجودی نیست */}
                                  {(newBrandMode || goodBrands.length === 0) && (
                                      <div className="relative">
                                        <Field label={m.listing.brand.label}>
                                          <Input
                                              value={brandName}
                                              onChange={(e) => setBrandName(e.target.value)}
                                              placeholder={m.listing.brand.newBrandPlaceholder}
                                              aria-label={m.listing.brand.label}
                                              autoFocus
                                          />
                                        </Field>
                                        {brandName.trim() && brandSuggestions.length > 0 && (
                                            <div className="absolute inset-x-0 top-full z-10 mt-1 overflow-hidden rounded-lg border bg-white shadow-lg">
                                              {brandSuggestions.slice(0, 5).map((b) => (
                                                  <button
                                                      key={b.id}
                                                      type="button"
                                                      onClick={() => { setBrandName(b.name); setNewBrandMode(false); }}
                                                      className="flex w-full items-center justify-between px-3 py-2 text-start text-sm transition hover:bg-accent"
                                                  >
                                                    <span className="font-bold">{b.name}</span>
                                                    <Check className="size-3.5 text-primary" />
                                                  </button>
                                              ))}
                                            </div>
                                        )}
                                        {brandName.trim() && (
                                            <p className="mt-1 text-[10px] text-muted-foreground">
                                              {m.listing.brand.newHint}
                                            </p>
                                        )}
                                      </div>
                                  )}
                                </div>
                            )}

                            {/* اتریبیوت‌ها — اختیاری، قابل toggle */}
                            {attrsOf.length > 0 && (
                                <div className="mt-4 border-t pt-4">
                                  <button
                                      type="button"
                                      onClick={() => setShowAttrs((s) => !s)}
                                      aria-expanded={showAttrs}
                                      className="flex w-full items-center gap-1.5 text-xs font-bold text-muted-foreground"
                                  >
                                    <ChevronDown className={`size-3.5 transition ${showAttrs ? "rotate-180" : ""}`} />
                                    {m.listing.specs.optionalToggle}
                                  </button>
                                  {showAttrs && (
                                      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
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