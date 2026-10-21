"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AuthGate } from "@/components/imach/auth-gate";
import { AppShell } from "@/components/imach/app-shell";
import { Icon, type IconName } from "@/components/ui/icon";
import { Sheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/input";
import { NumberInput } from "@/components/ui/number-input";
import { Spinner } from "@/components/ui/feedback";
import { useToast } from "@/components/ui/toast";
import { useAuthStore } from "@/lib/auth-store";
import { goodsApi, productsApi, listingsApi, businessesApi, type GoodDto, type ProductRowDto } from "@/lib/api";
import { num, currencyLabel, majorToMinor } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * `/catalog/new` — اسکرین ۱۳: افزودن کالا به کاتالوگ (M2 · FD-30/38).
 *
 * فرم ویزارد سه‌گامی + پنج مسیر ورود (حکم‌های مالک FD-15/22/38):
 *   ۱) دستی — جستجوی نوع کالا → محصول مرجع → بسته‌بندی/قیمت
 *   ۲) اسکنر بارکد — تطبیق با بارکد محصولات مرجع
 *   ۳) افزودن گروهی با متن — لیست قیمت واتساپی → جدول → تیک → ثبت
 *   ۴) اکسل/CSV — پیش‌نمایش سروری (importPreview/Commit)
 *   ۵) کپی از کاتالوک — شمارهٔ دوست → کاتالوکش → کپی قلم‌ها
 *
 * قانون مالک M2: این فرم فارسی است و متن‌ها همین‌جا نوشته می‌شوند
 * (نه در فایل زبان) — چندزبانه‌سازی فرم‌ها بعد از ثبات طراحی.
 * همهٔ فیلدهای عددی با NumberInput (قانون M2: فرمت‌بندی زندهٔ هزارگان).
 * ورودی قیمت در واحد اصلی ارز بومی (ایران: تومان)؛ ذخیره کوچک‌ترین واحد.
 */

const FA_DIGITS = "۰۱۲۳۴۵۶۷۸۹";
const AR_DIGITS = "٠١٢٣٤٥٦٧٨٩";
const toEn = (v: string): string =>
  v.replace(/[۰-۹]/g, (d) => String(FA_DIGITS.indexOf(d))).replace(/[٠-٩]/g, (d) => String(AR_DIGITS.indexOf(d)));

export default function NewItemPage() {
  return (
    <AuthGate>
      <AddWizard />
    </AuthGate>
  );
}

/* ─────────────────────────── ویزارد اصلی ─────────────────────────── */

function AddWizard() {
  const router = useRouter();
  const qc = useQueryClient();
  const { show } = useToast();
  const businesses = useAuthStore((s) => s.businesses);
  const biz = businesses[0];
  const bizId = biz?.id ?? "";
  const cur = biz?.currency ?? "IRR";

  const [step, setStep] = useState<1 | 2 | 3>(1);

  /* ── انتخاب‌ها ── */
  const [good, setGood] = useState<GoodDto | null>(null);
  const [product, setProduct] = useState<ProductRowDto | null>(null);
  const [isNewProduct, setIsNewProduct] = useState(false);

  /* ── فرم گام ۳ ── */
  const [title, setTitle] = useState("");
  const [baseQty, setBaseQty] = useState<number | null>(null);
  const [price, setPrice] = useState<number | null>(null);
  const [unitPrice, setUnitPrice] = useState<number | null>(null);
  const [stock, setStock] = useState<number | null>(null);
  const [minOrder, setMinOrder] = useState<number | null>(null);
  const [note, setNote] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [newBrandName, setNewBrandName] = useState("");
  const [busy, setBusy] = useState(false);

  /* ── شیت‌ها ── */
  const [newGoodOpen, setNewGoodOpen] = useState(false);
  const [scanOpen, setScanOpen] = useState(false);
  const [textOpen, setTextOpen] = useState(false);
  const [excelOpen, setExcelOpen] = useState(false);
  const [copyOpen, setCopyOpen] = useState(false);

  /* ── جستجوی گام ۱ (debounce سبک) ── */
  const [qInput, setQInput] = useState("");
  const [q, setQ] = useState("");
  useEffect(() => {
    const id = setTimeout(() => setQ(qInput.trim()), 250);
    return () => clearTimeout(id);
  }, [qInput]);

  const goodsQ = useQuery({
    queryKey: ["goods", "picker", q],
    queryFn: () => goodsApi.getGoods({ q: q || undefined, limit: 24 }),
    enabled: step === 1,
    staleTime: 60_000,
  });

  /* ── فیلتر برند گام ۲ ── */
  const [brandFilter, setBrandFilter] = useState<string | null>(null);
  const productsQ = useQuery({
    // bizId داخل کلید + گیت: اگر کوئری پیش از اتمام boot() (بدون کسب‌وکار)
    // شلیک شود، 400 BUSINESS_ID_REQUIRED کش می‌شود و دیگر تکرار نمی‌شود؛
    // با کلیدبندی روی bizId، به‌محض رسیدن نشست دوباره اجرا می‌شود.
    queryKey: ["products", "ofGood", good?.id, brandFilter, bizId],
    queryFn: () =>
      productsApi.getProducts({
        goodId: good!.id,
        brandId: brandFilter ?? undefined,
        businessId: bizId || undefined,
        limit: 60,
      }),
    enabled: step === 2 && !!good && !!bizId,
    staleTime: 60_000,
  });

  const goStep = (n: 1 | 2 | 3) => {
    setStep(n);
    window.scrollTo({ top: 0 });
  };

  const pickGood = (g: GoodDto) => {
    setGood(g);
    setBrandFilter(null);
    setProduct(null);
    setIsNewProduct(false);
    goStep(2);
  };

  const resetSpec = () => {
    setTitle("");
    setBaseQty(null);
    setPrice(null);
    setUnitPrice(null);
    setStock(null);
    setMinOrder(null);
    setNote("");
  };

  const pickProduct = (p: ProductRowDto) => {
    setProduct(p);
    setIsNewProduct(false);
    resetSpec();
    goStep(3);
  };

  const startNewProduct = () => {
    setProduct(null);
    setIsNewProduct(true);
    setNewLabel("");
    setNewBrandName("");
    resetSpec();
    goStep(3);
  };

  /** اسکن/کپی از بیرون گام را می‌پرند و مستقیم گام ۳ می‌آیند */
  const applyPickedProduct = (p: ProductRowDto) => {
    setGood({
      id: p.goodId,
      nameFa: p.good.nameFa,
      nameEn: p.good.nameEn,
      aliases: [],
      unit: p.good.unit,
      category: p.good.category as GoodDto["category"],
    });
    setProduct(p);
    setIsNewProduct(false);
    resetSpec();
    goStep(3);
  };

  /* ── قیمت بسته ⇄ قیمت واحد (قانون §۱.۷ — هم‌گام) ── */
  const setPackPrice = (v: number | null) => {
    setPrice(v);
    setUnitPrice(v !== null && baseQty && baseQty > 1 ? Math.round(v / baseQty) : null);
  };
  const setUnit = (v: number | null) => {
    setUnitPrice(v);
    setPrice(v !== null && baseQty && baseQty > 1 ? Math.round(v * baseQty) : v);
  };
  const setPackQty = (v: number | null) => {
    setBaseQty(v);
    if (v && v > 1 && price !== null) setUnitPrice(Math.round(price / v));
  };

  const unit = good?.unit || "";
  const moneyLabel = currencyLabel(cur);

  const save = async () => {
    if (!good) return;
    if (isNewProduct && newLabel.trim().length < 2) {
      show({ text: "عنوان محصول را بنویس — همین را خریداران می‌بینند", kind: "error" });
      return;
    }
    if (price === null || price <= 0) {
      show({ text: "قیمت هر بسته را وارد کن", kind: "error" });
      return;
    }
    setBusy(true);
    try {
      await listingsApi.saveListing({
        businessId: bizId,
        goodId: good.id,
        mode: "SELL",
        ...(product && !isNewProduct ? { productId: product.id } : {}),
        ...(isNewProduct
          ? {
              productLabel: newLabel.trim(),
              brandName: newBrandName.trim() || undefined,
            }
          : {}),
        title: title.trim() || null,
        note: note.trim() || null,
        baseQty: baseQty ?? undefined,
        sell: {
          priceMinor: majorToMinor(price, cur),
          stock: stock ?? 0,
          minOrder: minOrder ?? 0,
        },
      });
      void qc.invalidateQueries({ queryKey: ["listings"] });
      show({
        text: `«${title.trim() || newLabel.trim() || good.nameFa}» به کاتالوگ اضافه شد`,
        kind: "success",
      });
      router.push("/catalog");
    } catch (e) {
      show({ text: e instanceof Error ? e.message : "ذخیره نشد — دوباره تلاش کن", kind: "error" });
    } finally {
      setBusy(false);
    }
  };

  const steps = [
    { n: 1, label: "انتخاب نوع کالا" },
    { n: 2, label: "انتخاب محصول" },
    { n: 3, label: "مشخصات فروش" },
  ] as const;

  return (
    <AppShell arm="sell" title="افزودن کالا" wide>
      <div className="mx-auto w-full max-w-[760px]">
        {/* ═══ نوار پیشرفت سه‌گامی (FD-38 — غیرکلیکی) ═══ */}
        <div aria-hidden className="mb-6">
          <div className="h-1 w-full overflow-hidden rounded-full bg-line">
            <div
              className="h-full rounded-full bg-primary transition-[width] duration-300"
              style={{ width: `${(step * 100) / 3}%` }}
            />
          </div>
          <ol className="mt-2.5 flex items-center justify-between gap-1">
            {steps.map((s) => (
              <li key={s.n} className="flex min-w-0 items-center gap-1.5">
                <span
                  className={cn(
                    "grid size-6 shrink-0 place-items-center rounded-full text-[11px] font-black transition-colors",
                    s.n < step
                      ? "bg-primary text-white"
                      : s.n === step
                        ? "bg-primary-soft text-primary-strong ring-2 ring-primary/30"
                        : "bg-surface-2 text-text-3"
                  )}
                >
                  {s.n < step ? <Icon name="check" size={12} /> : num(s.n, "fa")}
                </span>
                <span
                  className={cn(
                    "truncate text-[10.5px] font-bold",
                    s.n === step ? "text-text" : "text-text-3"
                  )}
                >
                  {s.label}
                </span>
              </li>
            ))}
          </ol>
        </div>

        {/* ═══ گام ۱ — جستجوی نوع کالا ═══ */}
        {step === 1 && (
          <div>
            <div className="flex h-12 items-center gap-2 rounded-xl border border-line bg-surface px-3.5 transition-colors focus-within:border-arm focus-within:ring-2 focus-within:ring-arm/20">
              <Icon name="search" size={18} className="shrink-0 text-text-3" />
              <input
                value={qInput}
                onChange={(e) => setQInput(e.target.value)}
                placeholder="جستجو — مثلاً پفک، برنج، روغن"
                autoComplete="off"
                aria-label="جستجوی نوع کالا"
                className="min-w-0 flex-1 bg-transparent text-[15px] text-text placeholder:text-text-4 focus:outline-none"
              />
              {/* چهار ابزار ثبت سریع (FD-13: دکمه ۳۸px) */}
              <span className="flex shrink-0 items-center gap-1">
                <ToolBtn a11y="اسکن بارکد" icon="scan" onClick={() => setScanOpen(true)} />
                <ToolBtn a11y="افزودن گروهی با متن" icon="textlist" onClick={() => setTextOpen(true)} />
                <ToolBtn a11y="ورود با اکسل" icon="table" onClick={() => setExcelOpen(true)} />
                <ToolBtn a11y="کپی از کاتالوگ" icon="copy" onClick={() => setCopyOpen(true)} />
              </span>
            </div>

            <div className="mt-3 flex flex-col">
              {goodsQ.isLoading && (
                <div className="grid place-items-center py-10">
                  <Spinner />
                </div>
              )}
              {goodsQ.data?.items.map((g) => (
                <PickRow
                  key={g.id}
                  onClick={() => pickGood(g)}
                  title={g.nameFa}
                  sub={`دیدن محصولات این کالا${g.aliases.length ? ` · ${g.aliases.slice(0, 2).join("، ")}` : ""}`}
                  unit={g.unit}
                />
              ))}
              {goodsQ.data && goodsQ.data.items.length === 0 && q && (
                <p className="py-8 text-center text-[13px] leading-6 text-text-3">
                  «{q}» پیدا نشد — می‌توانی همین حالا ثبتش کنی:
                </p>
              )}
              <PickRow
                onClick={() => setNewGoodOpen(true)}
                title={q ? `«${q}» را به‌عنوان کالای جدید ثبت کن` : "کالای جدید ثبت کن"}
                sub="نامی که همهٔ فروشنده‌هایش کنار هم مقایسه می‌شوند"
                plus
              />
            </div>
          </div>
        )}

        {/* ═══ گام ۲ — محصولات مرجع همان کالا (FD-38) ═══ */}
        {step === 2 && good && (
          <div>
            <StepBack onClick={() => goStep(1)}>بازگشت به انتخاب نوع کالا</StepBack>

            <PickedCard title={good.nameFa} sub={`کالا · واحد ${unit || "—"} · ${good.category?.nameFa ?? ""}`} />

            {/* فیلتر برند — چیپ‌های سروری */}
            {productsQ.data && productsQ.data.brands.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-1.5">
                <BrandChip active={brandFilter === null} onClick={() => setBrandFilter(null)}>
                  همهٔ برندها
                </BrandChip>
                {productsQ.data.brands.map((b) => (
                  <BrandChip
                    key={b.id}
                    active={brandFilter === b.id}
                    onClick={() => setBrandFilter(b.id === brandFilter ? null : b.id)}
                  >
                    {b.name} <span className="text-text-4">({num(b.count, "fa")})</span>
                  </BrandChip>
                ))}
              </div>
            )}

            <div className="mt-3 flex flex-col">
              {productsQ.isLoading && (
                <div className="grid place-items-center py-10">
                  <Spinner />
                </div>
              )}
              {productsQ.data?.items.map((p) => (
                <PickRow
                  key={p.id}
                  onClick={() => pickProduct(p)}
                  title={p.label}
                  sub={`${p.brand?.name ?? "بدون برند"}${p.sellers > 0 ? ` · ${num(p.sellers, "fa")} فروشنده` : ""}${p.mineMode ? " · در کاتالوگ تو هست" : ""}`}
                  img={p.imageUrl ?? undefined}
                />
              ))}
              {productsQ.data && productsQ.data.items.length === 0 && (
                <div className="rounded-2xl border border-line bg-surface px-5 py-8 text-center">
                  <b className="text-[14px] text-text">هنوز محصولی برای «{good.nameFa}» ثبت نشده</b>
                  <p className="mt-1.5 text-[12.5px] leading-6 text-text-3">اولین محصول را شما ثبت کنید — خریداران بقیه را کنار هم می‌بینند.</p>
                  <Button variant="arm" size="lg" className="mt-4" onClick={startNewProduct}>
                    <Icon name="plus" size={16} /> ثبت اولین محصول
                  </Button>
                </div>
              )}
              {productsQ.data && productsQ.data.items.length > 0 && (
                <PickRow
                  onClick={startNewProduct}
                  title="محصول شما در این لیست نیست؟"
                  sub="خودتان ثبتش کنید."
                  plus
                />
              )}
            </div>
          </div>
        )}

        {/* ═══ گام ۳ — بسته‌بندی، قیمت و شرایط ═══ */}
        {step === 3 && good && (
          <div className="flex flex-col gap-5">
            <StepBack onClick={() => goStep(2)}>بازگشت به انتخاب محصول</StepBack>

            <PickedCard
              title={product ? product.label : newLabel || good.nameFa}
              sub={
                product
                  ? `${product.brand?.name ?? "بدون برند"} · ${good.nameFa}`
                  : `محصول جدید روی «${good.nameFa}»`
              }
              img={product?.imageUrl ?? undefined}
            />

            {/* فرم محصول جدید — فقط وقتی از مسیر «خودتان ثبتش کنید» آمده */}
            {isNewProduct && (
              <div className="flex flex-col gap-5 rounded-2xl border border-line bg-surface-2/50 p-4 lg:p-5">
                <Field label="عنوان محصول" hint="همین را خریداران می‌بینند — مثلاً: پفک اشی مشی ۱۰۰ گرمی">
                  {(id) => (
                    <Input
                      id={id}
                      value={newLabel}
                      onChange={(e) => setNewLabel(e.target.value)}
                      placeholder={`مثلاً ${good.nameFa} …`}
                      maxLength={90}
                    />
                  )}
                </Field>
                <Field label="برند" hint="اگر محصولت برند ندارد، خالی بگذار">
                  {(id) => (
                    <Input
                      id={id}
                      value={newBrandName}
                      onChange={(e) => setNewBrandName(e.target.value)}
                      placeholder="مثلاً: اشی مشی"
                      maxLength={60}
                    />
                  )}
                </Field>
              </div>
            )}

            {/* بسته‌بندی فروش عمده (FD-15: نام + تعداد کنار هم) */}
            <Field label="بسته‌بندی فروش عمده" hint="خالی بگذاری یعنی تک‌فروشی — مثلاً: کارتن ۶۰ عددی">
              {(id) => (
                <div className="flex gap-2.5">
                  <div className="min-w-0 flex-[1.4]">
                    <Input
                      id={id}
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="مثلاً: کارتن ۶۰ عددی"
                      maxLength={80}
                    />
                  </div>
                  <div className="w-[150px] shrink-0">
                    <NumberInput
                      value={baseQty}
                      onChange={setPackQty}
                      min={1}
                      placeholder={num(1, "fa")}
                      suffix={unit || undefined}
                      aria-label="تعداد در بسته"
                    />
                  </div>
                </div>
              )}
            </Field>

            {/* قیمت بسته + قیمت واحد (§۱.۷ — هم‌گام) */}
            <Field
              label={`قیمت هر بسته${baseQty && baseQty > 1 ? ` (${num(baseQty, "fa")} ${unit})` : ""} — ${moneyLabel}`}
              required
            >
              {(id) => <NumberInput id={id} value={price} onChange={setPackPrice} min={0} suffix={moneyLabel} autoFocus />}
            </Field>

            {baseQty && baseQty > 1 && (
              <Field label={`قیمت هر ${unit || "واحد"} — ${moneyLabel}`} hint="خودکار حساب می‌شود — هر کدام را عوض کنی، اونیکی هم تازه می‌شود">
                {(id) => <NumberInput id={id} value={unitPrice} onChange={setUnit} min={0} suffix={moneyLabel} />}
              </Field>
            )}

            <div className="flex flex-col gap-5 sm:flex-row">
              <div className="min-w-0 flex-1">
                <Field label="موجودی">
                  {(id) => <NumberInput id={id} value={stock} onChange={setStock} min={0} suffix={unit || undefined} />}
                </Field>
              </div>
              <div className="min-w-0 flex-1">
                <Field label="حداقل سفارش">
                  {(id) => (
                    <NumberInput id={id} value={minOrder} onChange={setMinOrder} min={0} suffix={unit || undefined} />
                  )}
                </Field>
              </div>
            </div>

            <Field label="توضیحات" hint="اختیاری — شرایط فروش، پرداخت، تحویل…">
              {(id) => (
                <Textarea
                  id={id}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={2}
                  maxLength={280}
                  placeholder="مثلاً: تحویل از انبار تهران، بستهٔ ۵۰ کیلویی"
                />
              )}
            </Field>

            <p className="rounded-xl bg-surface-2 px-4 py-3 text-[11.5px] leading-6 text-text-3">
              اعتبار قیمت‌ها از «تنظیمات کاتالوگ» می‌آید — بعد از آن روزها قیمت «منقضی» نشان داده می‌شود و یادآوری می‌گیری.
            </p>

            <Button variant="arm" size="xl" block loading={busy} onClick={() => void save()}>
              <Icon name="check" size={17} /> افزودن به کاتالوگ
            </Button>
          </div>
        )}
      </div>

      {/* ═══ شیت‌ها ═══ */}
      <NewGoodSheet
        open={newGoodOpen}
        onClose={() => setNewGoodOpen(false)}
        defaultName={q}
        onCreated={(g) => {
          setNewGoodOpen(false);
          pickGood(g);
        }}
      />
      <ScanSheet
        open={scanOpen}
        onClose={() => setScanOpen(false)}
        bizId={bizId}
        onMatched={(p) => {
          setScanOpen(false);
          applyPickedProduct(p);
          show({ text: "بارکد شناخته شد — فقط قیمت و شرایط را وارد کن", kind: "success" });
        }}
      />
      <TextListSheet
        open={textOpen}
        onClose={() => setTextOpen(false)}
        bizId={bizId}
        cur={cur}
        onDone={(n) => {
          setTextOpen(false);
          void qc.invalidateQueries({ queryKey: ["listings"] });
          show({ text: `${num(n, "fa")} کالا از متن به کاتالوگ اضافه شد`, kind: "success" });
          router.push("/catalog");
        }}
      />
      <ExcelSheet
        open={excelOpen}
        onClose={() => setExcelOpen(false)}
        bizId={bizId}
        cur={cur}
        onDone={(n) => {
          setExcelOpen(false);
          void qc.invalidateQueries({ queryKey: ["listings"] });
          show({ text: `${num(n, "fa")} کالا از فایل ثبت شد`, kind: "success" });
          router.push("/catalog");
        }}
      />
      <CopyCatalogSheet
        open={copyOpen}
        onClose={() => setCopyOpen(false)}
        bizId={bizId}
        onDone={(n) => {
          setCopyOpen(false);
          void qc.invalidateQueries({ queryKey: ["listings"] });
          show({ text: `${num(n, "fa")} کالا کپی شد — قیمت‌ها را بعداً ویرایش کن`, kind: "success" });
          router.push("/catalog");
        }}
      />
    </AppShell>
  );
}

/* ─────────────────────────── اجزای کوچک ─────────────────────────── */

function ToolBtn({ a11y, icon, onClick }: { a11y: string; icon: IconName; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={a11y}
      title={a11y}
      className="grid size-[38px] place-items-center rounded-lg text-text-3 transition-colors hover:bg-surface-2 hover:text-text"
    >
      <Icon name={icon} size={18} />
    </button>
  );
}

function StepBack({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mb-4 inline-flex items-center gap-1.5 self-start p-0 text-[12px] font-bold text-primary-strong transition-opacity active:opacity-70"
    >
      <Icon name="back" size={13} />
      {children}
    </button>
  );
}

function PickRow({
  onClick,
  title,
  sub,
  img,
  unit,
  plus,
}: {
  onClick: () => void;
  title: string;
  sub: string;
  img?: string;
  unit?: string;
  plus?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-xl px-2 py-2.5 text-start transition-colors hover:bg-surface-2"
    >
      {plus ? (
        <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary-strong">
          <Icon name="plus" size={20} />
        </span>
      ) : img ? (
        // eslint-disable-next-line next/next/no-img-element -- تصاویر مرجع با عرض صریح
        <img src={img} alt="" width={44} height={44} className="size-11 shrink-0 rounded-xl border border-line object-cover" />
      ) : (
        <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-surface-2 text-[16px] font-black text-text-3">
          {title.slice(0, 1)}
        </span>
      )}
      <span className="min-w-0 flex-1">
        <b className="block truncate text-[14px] font-bold text-text">{title}</b>
        <span className="block truncate text-[11.5px] text-text-3">{sub}</span>
      </span>
      {unit && <span className="shrink-0 text-[11px] text-text-4">{unit}</span>}
      <Icon name="chev" size={16} className="shrink-0 text-text-4 rtl:-scale-x-100" />
    </button>
  );
}

function PickedCard({ title, sub, img }: { title: string; sub: string; img?: string }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-3.5">
      {img ? (
        // eslint-disable-next-line next/next/no-img-element -- تصاویر مرجع با عرض صریح
        <img src={img} alt="" width={48} height={48} className="size-12 rounded-xl border border-line object-cover" />
      ) : (
        <span className="grid size-12 place-items-center rounded-xl bg-primary-soft text-[18px] font-black text-primary-strong">
          {title.slice(0, 1)}
        </span>
      )}
      <span className="min-w-0 flex-1">
        <b className="block truncate text-[14.5px] font-bold text-text">{title}</b>
        <span className="block truncate text-[11.5px] text-text-3">{sub}</span>
      </span>
    </div>
  );
}

function BrandChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "inline-flex h-8 items-center rounded-full border px-3 text-[11.5px] font-bold transition-colors",
        active
          ? "border-primary bg-primary-soft text-primary-strong"
          : "border-line bg-surface text-text-2 hover:border-line-2"
      )}
    >
      {children}
    </button>
  );
}

/* ═══════════════════════════════════════════════════════════════
   شیت ۱ — ثبت کالای جدید (اگر جستجو چیزی نیاورد)
   ═══════════════════════════════════════════════════════════════ */
function NewGoodSheet({
  open,
  onClose,
  defaultName,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  defaultName: string;
  onCreated: (g: GoodDto) => void;
}) {
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // باز شدن دوباره → نام تازه (پیش‌پر با جستجوی کاربر)
  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setName(defaultName);
      setErr(null);
    }
  }

  const save = async () => {
    const v = name.trim();
    if (v.length < 2) {
      setErr("نام کالا را وارد کن — مثلاً «پفک»");
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      const g = await goodsApi.createGood({ name: v });
      onCreated(g);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "ثبت نشد — دوباره تلاش کن");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet open={open} onClose={onClose} title="ثبت کالای جدید">
      <p className="pb-2 text-[12.5px] leading-5 text-text-3">
        نام کالا را وارد کن — مثلاً «پفک». بعد از تأیید، همهٔ فروشنده‌های این کالا کنار هم مقایسه می‌شوند.
      </p>
      <div className="flex flex-col gap-5 py-1">
        <Field label="نام کالا">
          {(id) => (
            <Input
              id={id}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="مثلاً: پفک"
              maxLength={60}
              autoFocus
            />
          )}
        </Field>
        {err && <p className="text-[12px] font-bold leading-5 text-red">{err}</p>}
        <Button variant="arm" size="lg" loading={busy} onClick={() => void save()}>
          <Icon name="check" size={16} /> ثبت کالا
        </Button>
      </div>
    </Sheet>
  );
}

/* ═══════════════════════════════════════════════════════════════
   شیت ۲ — اسکنر بارکد (FD-15): تطبیق با بارکد محصولات مرجع.
   دوربین/اسکنر بلوتوثی مستقیم همین input را پر می‌کند؛ فعلاً ورودی
   دستی (دموی پروتوتایپ همین بود). بارکد ناشناس → راهنمایی به جستجو.
   ═══════════════════════════════════════════════════════════════ */
function ScanSheet({
  open,
  onClose,
  bizId,
  onMatched,
}: {
  open: boolean;
  onClose: () => void;
  bizId: string;
  onMatched: (p: ProductRowDto) => void;
}) {
  const { show } = useToast();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [miss, setMiss] = useState<string | null>(null);

  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setCode("");
      setMiss(null);
    }
  }

  const match = async () => {
    const v = toEn(code).replace(/\D/g, "");
    if (v.length < 6) {
      show({ text: "بارکد را کامل وارد کن", kind: "error" });
      return;
    }
    setBusy(true);
    setMiss(null);
    try {
      const page = await productsApi.getProducts({ barcode: v, businessId: bizId || undefined, limit: 5 });
      const hit = page.items[0];
      if (hit) {
        onMatched(hit);
      } else {
        setMiss(v);
      }
    } catch {
      setMiss(v);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet open={open} onClose={onClose} title="اسکنر بارکد">
      <p className="pb-2 text-[12.5px] leading-5 text-text-3">
        بارکد کالا را بگیر — با کالاهای مرجع آیمچ تطبیق داده می‌شود و همان محصول برای فروش آماده می‌شود؛ فقط قیمت و شرایط را وارد کن.
      </p>

      {/* قاب اسکن */}
      <div className="grid place-items-center gap-2 rounded-2xl border border-line-2 bg-text/90 py-7">
        <Icon name="scan" size={40} className="text-white/85" />
        <span className="text-[11px] font-bold text-white/70">بارکد را داخل کادر نگه دارید</span>
      </div>

      <div className="mt-4 flex flex-col gap-5 py-1">
        <Field label="بارکد را دستی وارد کن" hint="اگر اسکنر نداری">
          {() => (
            <div className="flex gap-2">
              <Input
                dir="ltr"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="مثلاً ۶۲۶۰۱۰۱۲۰۰۰۱۰"
                inputMode="numeric"
                className="text-start"
                maxLength={20}
                onKeyDown={(e) => e.key === "Enter" && void match()}
              />
              <Button className="shrink-0" loading={busy} onClick={() => void match()}>
                <Icon name="scan" size={15} /> تطبیق
              </Button>
            </div>
          )}
        </Field>

        {miss && (
          <div className="rounded-xl border border-amber/40 bg-amber-soft px-3.5 py-3 text-[12px] leading-6 text-amber">
            <b className="block">محصولی با بارکد «{miss}» پیدا نشد</b>
            <span>از جستجوی بالا دنبالش بگرد یا دستی ثبتش کن — بارکدهای ناشناس بعداً با اسکن واقعی کامل می‌شوند.</span>
          </div>
        )}
      </div>
    </Sheet>
  );
}

/* ═══════════════════════════════════════════════════════════════
   شیت ۳ — افزودن گروهی با متن (FD-15): لیست قیمت کپی‌شده از
   واتساپ/اکسل → جدول → تطبیق مرجع → تیک → bulkSave.
   پارسِ ردیف‌ها این‌جا سمت کلاینت است (الگوی txParse پروتوتایپ).
   ═══════════════════════════════════════════════════════════════ */

interface TxRow {
  raw: string;
  name: string;
  brand: string;
  price: number | null;
  minOrder: number | null;
  productId: string | null;
  matchLabel: string | null;
  checked: boolean;
  status: "match" | "new" | "noprice";
}

/** هر خط: نام [برند] [قیمت] [حداقل] — ستون‌ها با Tab یا چند فاصله */
function parsePriceList(text: string): TxRow[] {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const rows: TxRow[] = [];
  for (const line of lines) {
    const cells = line.split(/\t+| {2,}|،(?=\s)/).map((c) => c.trim()).filter(Boolean);
    if (cells.length === 0) continue;
    // خط عنوان ستون‌ها → تشخیص با «نام» و بدون هیچ رقمی
    const digits = toEn(line).replace(/\D/g, "");
    if (!digits && /نام|قیمت|کالا|برند/.test(line)) continue;
    const name = cells[0] ?? "";
    let brand = "";
    let price: number | null = null;
    let minOrder: number | null = null;
    // آخرین سلول‌های عددی از ته: [حداقل،] قیمت
    const tailNums: number[] = [];
    const body: string[] = [];
    for (let i = cells.length - 1; i >= 1; i--) {
      const n = toEn(cells[i]).replace(/[٬،,\s]/g, "");
      if (/^\d{1,12}$/.test(n) && tailNums.length < 2) {
        tailNums.unshift(Number(n));
      } else {
        body.unshift(cells[i]);
      }
    }
    if (tailNums.length === 2) {
      // ستون‌ها از ته: [name, …, قیمت, حداقل] — عین مثال شیت («پفک … ۲٬۴۰۰٬۰۰۰ ۲»).
      // unshift از ته پیمایش می‌کند → tailNums = [قیمت(دوم‌به‌آخر)، حداقل(آخر)].
      // (باگ M2-QA: قبلاً برعکس خوانده می‌شد — قیمت=آخرین عدد.)
      price = tailNums[0];
      minOrder = tailNums[1];
    } else if (tailNums.length === 1) {
      price = tailNums[0];
    }
    brand = (body[0] ?? "").replace(/^[-–|:]\s*/, "");
    rows.push({
      raw: line,
      name,
      brand,
      price,
      minOrder,
      productId: null,
      matchLabel: null,
      checked: price !== null,
      status: price === null ? "noprice" : "new",
    });
  }
  return rows.slice(0, 40);
}

function TextListSheet({
  open,
  onClose,
  bizId,
  cur,
  onDone,
}: {
  open: boolean;
  onClose: () => void;
  bizId: string;
  cur: string;
  onDone: (n: number) => void;
}) {
  const { show } = useToast();
  const [view, setView] = useState<"paste" | "review">("paste");
  const [text, setText] = useState("");
  const [rows, setRows] = useState<TxRow[]>([]);
  const [matching, setMatching] = useState(false);
  const [busy, setBusy] = useState(false);

  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setView("paste");
      setText("");
      setRows([]);
    }
  }

  const moneyLabel = currencyLabel(cur);

  /** تطبیق هر ردیف با محصولات مرجع — جستجوی موازی (۶تا۶تا) */
  const runMatch = async (input: TxRow[]) => {
    setMatching(true);
    const out = [...input];
    for (let i = 0; i < out.length; i += 6) {
      const chunk = out.slice(i, i + 6);
      const found = await Promise.all(
        chunk.map(async (r) => {
          if (!r.name || r.name.length < 2) return r;
          try {
            const page = await productsApi.getProducts({ q: r.name, businessId: bizId || undefined, limit: 3 });
            const best =
              page.items.find((p) => {
                const hay = `${p.label} ${p.good?.nameFa ?? ""} ${p.brand?.name ?? ""}`;
                return hay.includes(r.name) || r.name.includes(p.good?.nameFa ?? "###");
              }) ?? page.items[0];
            if (best) {
              return {
                ...r,
                productId: best.id,
                matchLabel: best.label,
                status: r.price === null ? ("noprice" as const) : ("match" as const),
              };
            }
          } catch {
            /* آفلاین/خطا — همان ردیف دست‌نخورده می‌ماند */
          }
          return r;
        })
      );
      out.splice(i, chunk.length, ...found);
      setRows([...out]);
    }
    setMatching(false);
  };

  const parse = () => {
    const parsed = parsePriceList(text);
    if (parsed.length === 0) {
      show({ text: "چیزی از متن خوانده نشد — هر خط یک کالا و ستون‌ها با Tab یا چند فاصله", kind: "error" });
      return;
    }
    setRows(parsed);
    setView("review");
    void runMatch(parsed);
  };

  const checked = rows.filter((r) => r.checked && r.productId && r.price !== null);

  const commit = async () => {
    if (checked.length === 0) return;
    setBusy(true);
    try {
      const res = await listingsApi.bulkSave({
        businessId: bizId,
        mode: "SELL",
        items: checked.map((r) => ({
          productId: r.productId!,
          priceMinor: majorToMinor(r.price!, cur),
          minOrder: r.minOrder ?? undefined,
        })),
      });
      onDone(res.saved);
    } catch (e) {
      show({ text: e instanceof Error ? e.message : "ثبت نشد — دوباره تلاش کن", kind: "error" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet open={open} onClose={onClose} title="افزودن گروهی با متن" maxHeightClass="max-h-[88dvh]">
      {view === "paste" ? (
        <div className="flex flex-col gap-5 py-1">
          <p className="text-[12.5px] leading-5 text-text-3">
            لیست قیمت‌هایت را از واتساپ، اکسل یا هر جایی کپی کن و این‌جا بچسبان — آیمچ خودش جدول کالا می‌سازد.
          </p>
          <Field label="متن لیست قیمت">
            {(id) => (
              <Textarea
                id={id}
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={7}
                placeholder={"هر خط یک کالا — ستون‌ها با Tab یا چند فاصله:\nنام کالا · برند · قیمت هر بسته · حداقل سفارش"}
              />
            )}
          </Field>
          <p className="rounded-xl bg-surface-2 px-3.5 py-2.5 text-[11px] leading-6 text-text-3">
            مثال: «پفک نمکی   اشی مشی   ۲٬۴۰۰٬۰۰۰   ۲» — خط اول می‌تواند عنوان ستون‌ها باشد؛ بدون قیمت، کالا آمادهٔ افزودن نمی‌شود.
          </p>
          <Button variant="arm" size="lg" onClick={parse}>
            <Icon name="textlist" size={16} /> تبدیل به جدول کالا
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-4 py-1">
          <p className="text-[12.5px] leading-5 text-text-3">
            {num(rows.length, "fa")} کالا از متن خوانده شد{matching ? " — در حال تطبیق با کالاهای مرجع…" : ` · ${num(checked.length, "fa")} تاییدشده`}
          </p>

          <div className="flex flex-col">
            {rows.map((r, i) => (
              <button
                key={i}
                type="button"
                role="checkbox"
                aria-checked={r.checked}
                disabled={!r.productId || r.price === null}
                onClick={() =>
                  setRows((rs) => rs.map((x, j) => (j === i ? { ...x, checked: !x.checked } : x)))
                }
                className={cn(
                  "flex items-center gap-3 rounded-xl px-2 py-2.5 text-start transition-colors",
                  r.checked ? "bg-arm-soft/60" : "hover:bg-surface-2",
                  (!r.productId || r.price === null) && "opacity-60"
                )}
              >
                <span
                  className={cn(
                    "grid size-6 shrink-0 place-items-center rounded-[7px] border-[1.5px] transition-colors",
                    r.checked ? "border-primary bg-primary text-white" : "border-line-2 bg-surface text-transparent"
                  )}
                >
                  <Icon name="check" size={13} />
                </span>
                <span className="min-w-0 flex-1">
                  <b className="block truncate text-[13.5px] font-bold text-text">{r.name}</b>
                  <span className="block truncate text-[11px] text-text-3">
                    {r.productId
                      ? r.matchLabel || "تطبیق شد"
                      : r.price === null
                        ? "قیمت ندارد — دستی اضافه کن یا متن را اصلاح کن"
                        : "کالای مرجع پیدا نشد — از جستجو دستی اضافه کن"}
                    {r.brand ? ` · ${r.brand}` : ""}
                  </span>
                </span>
                {r.price !== null && (
                  <span className="shrink-0 text-[12.5px] font-bold text-text-2">
                    {num(r.price, "fa")} <span className="text-[10px] font-medium text-text-4">{moneyLabel}</span>
                  </span>
                )}
              </button>
            ))}
          </div>

          <p className="rounded-xl bg-surface-2 px-3.5 py-2.5 text-[11px] leading-6 text-text-3">
            کالاهای بدون تیک اضافه نمی‌شوند — بعداً از جستجو دستی اضافه‌شان کن، یا متن را اصلاح و دوباره تبدیل کن.
          </p>

          <div className="flex flex-col gap-2">
            <Button variant="arm" size="lg" loading={busy} disabled={checked.length === 0} onClick={() => void commit()}>
              <Icon name="check" size={16} /> افزودن {checked.length > 0 ? num(checked.length, "fa") : ""} کالای تاییدشده
            </Button>
            <Button variant="outline" size="lg" onClick={() => setView("paste")}>
              اصلاح متن
            </Button>
          </div>
        </div>
      )}
    </Sheet>
  );
}

/* ═══════════════════════════════════════════════════════════════
   شیت ۴ — اکسل/CSV: پیش‌نمایش سروری (importPreview) → ثبت (importCommit)
   ═══════════════════════════════════════════════════════════════ */
function ExcelSheet({
  open,
  onClose,
  bizId,
  cur,
  onDone,
}: {
  open: boolean;
  onClose: () => void;
  bizId: string;
  cur: string;
  onDone: (n: number) => void;
}) {
  const { show } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<import("@/lib/api").ImportPreviewDto | null>(null);
  const [fileName, setFileName] = useState("");
  const [busy, setBusy] = useState(false);

  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setPreview(null);
      setFileName("");
    }
  }

  const pick = async (f: File | undefined) => {
    if (!f) return;
    setFileName(f.name);
    setBusy(true);
    try {
      const res = await productsApi.importPreview({ file: f, businessId: bizId, mode: "SELL" });
      setPreview(res);
    } catch (e) {
      show({ text: e instanceof Error ? e.message : "فایل خوانده نشد", kind: "error" });
      setPreview(null);
    } finally {
      setBusy(false);
    }
  };

  const commit = async () => {
    if (!preview) return;
    const okRows = preview.rows.filter((r) => r.matchType !== undefined && !r.warning);
    setBusy(true);
    try {
      const res = await productsApi.importCommit({
        businessId: bizId,
        mode: "SELL",
        rows: okRows.map((r) => ({
          index: r.index,
          name: r.name,
          brand: r.brand ?? undefined,
          spec: r.spec ?? undefined,
          priceMinor: r.priceMinor ?? undefined,
          stock: r.stock ?? undefined,
          minOrder: r.minOrder ?? undefined,
        })),
      });
      onDone(res.saved);
    } catch (e) {
      show({ text: e instanceof Error ? e.message : "ثبت نشد — دوباره تلاش کن", kind: "error" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet open={open} onClose={onClose} title="ورود با اکسل" maxHeightClass="max-h-[88dvh]">
      <p className="pb-2 text-[12.5px] leading-5 text-text-3">
        فایل اکسل یا CSV لیست فروش را انتخاب کن — اول پیش‌نمایش می‌بینی، بعد با تأییدت ثبت می‌شود.
      </p>

      <input
        ref={fileRef}
        type="file"
        accept=".xlsx,.xls,.csv"
        hidden
        onChange={(e) => void pick(e.target.files?.[0])}
      />

      <div className="flex flex-col gap-4 py-1">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="flex flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-line-2 bg-surface-2/40 px-4 py-8 text-center transition-colors hover:border-primary/50"
        >
          <span className="grid size-12 place-items-center rounded-2xl bg-primary-soft text-primary-strong">
            <Icon name="table" size={22} />
          </span>
          {fileName ? (
            <>
              <b className="text-[13px] text-text">{fileName}</b>
              {busy && <Spinner />}
            </>
          ) : (
            <>
              <b className="text-[13.5px] text-text">انتخاب فایل اکسل / CSV</b>
              <span className="text-[11.5px] text-text-3">ستون‌ها: نام کالا · برند · بسته‌بندی · قیمت · موجودی · حداقل سفارش</span>
            </>
          )}
        </button>

        {preview && (
          <>
            <div className="grid grid-cols-3 gap-2 rounded-xl bg-surface-2 p-3 text-center">
              <StatMini label="کل ردیف‌ها" value={num(preview.summary.total, "fa")} />
              <StatMini label="تطبیق‌شده" value={num(preview.summary.matched, "fa")} />
              <StatMini label="کالای جدید" value={num(preview.summary.newGood, "fa")} />
            </div>

            <div className="flex max-h-[38dvh] flex-col overflow-y-auto rounded-xl border border-line">
              {preview.rows.slice(0, 60).map((r) => (
                <div key={r.index} className="flex items-center gap-2.5 border-b border-line px-3 py-2 last:border-0">
                  <span
                    className={cn(
                      "shrink-0 rounded-full px-2 py-0.5 text-[9.5px] font-black",
                      r.matchType === "product"
                        ? "bg-emerald-soft text-emerald-strong"
                        : r.matchType === "good"
                          ? "bg-arm-soft text-arm-strong"
                          : "bg-surface-2 text-text-3"
                    )}
                  >
                    {r.matchType === "product" ? "محصول" : r.matchType === "good" ? "کالا" : "جدید"}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-[12.5px] font-bold text-text">{r.name}</span>
                  {r.priceMinor !== null && (
                    <span className="shrink-0 text-[11.5px] text-text-3">{num(r.priceMinor / (cur === "IRR" ? 10 : 1), "fa")}</span>
                  )}
                </div>
              ))}
            </div>

            <Button variant="arm" size="lg" loading={busy} onClick={() => void commit()}>
              <Icon name="check" size={16} /> ثبت {num(preview.summary.total - preview.summary.willSkip, "fa")} ردیف
            </Button>
          </>
        )}
      </div>
    </Sheet>
  );
}

function StatMini({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <b className="block text-[16px] font-black text-text">{value}</b>
      <span className="text-[10.5px] text-text-3">{label}</span>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   شیت ۵ — کپی از کاتالوگ (FD-22): شمارهٔ دوست → کاتالوگش →
   کپی قلم‌های فروش (bulkSave با sourceListingId برای گالری عکس‌ها).
   ضدتکرار: قلم‌هایی که productIdشان در کاتالوک من هست رد می‌شوند.
   ═══════════════════════════════════════════════════════════════ */
function CopyCatalogSheet({
  open,
  onClose,
  bizId,
  onDone,
}: {
  open: boolean;
  onClose: () => void;
  bizId: string;
  onDone: (n: number) => void;
}) {
  const { show } = useToast();
  const [phone, setPhone] = useState("");
  const [country, setCountry] = useState("IR");
  const [found, setFound] = useState<{ id: string; name: string; city: string; trade: string | null; catalogCount: number; ownerName: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setPhone("");
      setFound(null);
      setErr(null);
    }
  }

  const intl = useMemo(() => {
    const clean = toEn(phone).replace(/\D/g, "");
    if (!clean) return null;
    return country === "IR" ? `98${clean.replace(/^0+/, "").slice(0, 10)}` : clean.slice(0, 12);
  }, [phone, country]);

  const find = async () => {
    if (!intl) {
      setErr("شمارهٔ موبایل صاحب کاتالوک را وارد کن");
      return;
    }
    setBusy(true);
    setErr(null);
    setFound(null);
    try {
      const res = await businessesApi.findCatalogByPhone(intl);
      setFound(res);
    } catch (e) {
      setErr(
        e instanceof Error && e.message ? e.message : "کاتالوکی با این شماره پیدا نشد"
      );
    } finally {
      setBusy(false);
    }
  };

  const copy = async () => {
    if (!found) return;
    setBusy(true);
    try {
      // قلم‌های فروش او + کاتالوک خودم برای ضدتکرار
      const [page, mine] = await Promise.all([
        businessesApi.getCatalogItems({ businessId: found.id, mode: "SELL", limit: 200 }),
        listingsApi.getMyListings(bizId),
      ]);
      const myProductIds = new Set(
        mine.map((l) => (l as unknown as { productId?: string | null }).productId).filter(Boolean)
      );
      const items = (page.items as unknown as Array<Record<string, unknown> & { id: string; mode: string; productId: string | null; priceMinor: number | null; stock: number | null; minOrder: number | null }>)
        .filter((it) => it.productId && (it.mode === "SELL" || it.mode === "BOTH") && !myProductIds.has(it.productId))
        .slice(0, 200)
        .map((it) => ({
          productId: it.productId!,
          priceMinor: it.priceMinor ?? undefined,
          stock: it.stock ?? undefined,
          minOrder: it.minOrder ?? undefined,
          sourceListingId: it.id,
        }));
      if (items.length === 0) {
        show({ text: "همهٔ کالاهایش از قبل در کاتالوک تو هست", kind: "info" });
        return;
      }
      const res = await listingsApi.bulkSave({ businessId: bizId, mode: "SELL", items });
      onDone(res.saved);
    } catch (e) {
      show({ text: e instanceof Error ? e.message : "کپی نشد — دوباره تلاش کن", kind: "error" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet open={open} onClose={onClose} title="کپی از کاتالوک">
      <p className="pb-2 text-[12.5px] leading-5 text-text-3">
        کاتالوک همکار یا دوستت را با شمارهٔ موبایلش پیدا کن — همهٔ کالاهایش یک‌جا به کاتالوک تو می‌آید؛ قیمت‌ها را بعداً عوض می‌کنی.
      </p>

      <div className="flex flex-col gap-5 py-1">
        <Field label="شمارهٔ موبایل صاحب کاتالوک">
          {() => (
            <div dir="ltr" className="flex h-12 items-stretch overflow-hidden rounded-lg border border-line bg-surface transition-colors focus-within:border-arm focus-within:ring-2 focus-within:ring-arm/20">
              <select
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                aria-label="کشور شماره"
                className="shrink-0 border-e border-line bg-surface px-2 text-[13px] font-bold text-text focus:outline-none"
              >
                <option value="IR">🇮🇷 +۹۸</option>
                <option value="TR">🇹🇷 +۹۰</option>
                <option value="AE">🇦🇪 +۹۷۱</option>
                <option value="IQ">🇮🇶 +۹۶۴</option>
                <option value="AF">🇦🇫 +۹۳</option>
                <option value="PK">🇵🇰 +۹۲</option>
              </select>
              <input
                dir="ltr"
                type="tel"
                inputMode="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder={country === "IR" ? "۹۱۲ …" : "5xx …"}
                className="min-w-0 flex-1 bg-transparent px-3.5 text-start text-[15px] text-text placeholder:text-text-4 focus:outline-none"
                onKeyDown={(e) => e.key === "Enter" && void find()}
              />
            </div>
          )}
        </Field>

        {err && <p className="text-[12px] font-bold leading-5 text-red">{err}</p>}

        {found && (
          <div className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-3.5">
            <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-primary-soft text-[18px] font-black text-primary-strong">
              {found.name.slice(0, 1)}
            </span>
            <span className="min-w-0 flex-1">
              <b className="block truncate text-[14.5px] font-bold text-text">{found.name}</b>
              <span className="block truncate text-[11.5px] text-text-3">
                {found.ownerName} · {found.city}
                {found.trade ? ` · ${found.trade}` : ""}
              </span>
            </span>
            <span className="shrink-0 rounded-full bg-emerald-soft px-2.5 py-1 text-[11px] font-black text-emerald-strong">
              {num(found.catalogCount, "fa")} کالا
            </span>
          </div>
        )}

        {found ? (
          <Button variant="arm" size="lg" loading={busy} onClick={() => void copy()}>
            <Icon name="copy" size={16} /> کپی کالاها
          </Button>
        ) : (
          <Button variant="arm" size="lg" loading={busy} onClick={() => void find()}>
            <Icon name="search" size={16} /> پیدا کردن کاتالوک
          </Button>
        )}
      </div>
    </Sheet>
  );
}
