"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { ApiError, goodsApi, productsApi, type CatalogReferenceDto, type ImportPreviewDto } from "@/lib/api";
import { fa, fmtMoney } from "@/lib/format";
import { useMessages } from "@/i18n/messages/use-messages";
import { useLocale } from "@/i18n/locale-context";
import { NumberInput } from "@/components/number-input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Check, ChevronDown, FileSpreadsheet, HelpCircle, ImagePlus, Loader2, Sparkles, TriangleAlert, Upload, X } from "lucide-react";
import { cn } from "@/lib/utils";

type Step = "drop" | "preview" | "progress" | "done";

type EditableRow = ImportPreviewDto["rows"][number] & {
  status?: "pending" | "saved" | "failed" | "duplicate";
  error?: string;
  /** عکس محصول از Product.imageUrl — قابل ویرایش با URL */
  productImage?: string | null;
  /** URL عکس که کاربر در preview وارد کرده */
  pendingImageUrl?: string;
};

function buildAiPrompt(ref: CatalogReferenceDto): string {
  const lines: string[] = [
    "تو دستیار وارد کردن کالا برای پلتفرم عمده‌فروشی iMach هستی.",
    "کاربر فایل کالاهایش را می‌دهد و تو باید آن را به قالب زیر تبدیل کنی.",
    "",
    "ستون‌های خروجی (با کاما جدا شوند):",
    "نام کالا, برند, بسته‌بندی, قیمت فروش, موجودی, حداقل سفارش, حجم خرید, لینک عکس, دسته, زیردسته",
    "",
    "قواعد:",
    "۱) «نام کالا» را کوتاه و استاندارد بنویس. جزئیات مثل وزن را در «بسته‌بندی» بگذار.",
    "۲) «نام کالا» حتماً از لیست گودهای موجود انتخاب شود.",
    "۳) «برند» را از لیست برندهای موجود انتخاب کن. بدون برند، خالی.",
    "۴) فقط فروشنده‌ای؟ «قیمت فروش» را پر کن. فقط خریداری؟ «حجم خرید». هر دو؟ هر دو.",
    "۵) قیمت‌ها عدد تومان بدون جداکننده.",
    "۶) «دسته» و «زیردسته» را از درخت دسته‌بندی‌های موجود انتخاب کن.",
    "۷) اگر مقدار کاما دارد، داخل کوتیشن بگذار.",
    "",
    "خروجی CSV، بدون توضیح اضافه.",
    "",
    "═══ لیست گودها و دسته‌بندی‌ها (JSON) ═══",
    "",
    JSON.stringify(ref, null, 2),
    "",
    "═══ پایان ═══",
  ];
  return lines.join("\n");
}

export function ImportSheet({
  bizId,
  arm,
  onDone,
}: {
  bizId: string;
  arm: "sell" | "buy";
  onDone: (kind: "sell" | "buy") => void;
}) {
  const { toast } = useToast();
  const m = useMessages();
  const { locale } = useLocale();
  const numLocale: "fa" | "en" = locale === "en" ? "en" : "fa";
  const mode: "SELL" | "BUY" = arm === "sell" ? "SELL" : "BUY";

  const [step, setStep] = useState<Step>("drop");
  const [priceUnit, setPriceUnit] = useState<"toman" | "rial">("toman");
  const [busy, setBusy] = useState(false);
  const [rows, setRows] = useState<EditableRow[]>([]);
  const [savedCount, setSavedCount] = useState(0);
  const [failedCount, setFailedCount] = useState(0);
  const [dupCount, setDupCount] = useState(0);
  const [helpOpen, setHelpOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [aiPrompt, setAiPrompt] = useState<string>("");
  const [aiLoading, setAiLoading] = useState(false);
  const [promptCopied, setPromptCopied] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const loadAiPrompt = async () => {
    if (aiPrompt) return;
    setAiLoading(true);
    try {
      const ref = await goodsApi.getCatalogReference();
      setAiPrompt(buildAiPrompt(ref));
    } catch {
      setAiPrompt(buildAiPrompt({ categories: [], brands: [], totalGoods: 0, totalBrands: 0 }));
    } finally {
      setAiLoading(false);
    }
  };

  useEffect(() => {
    if (aiOpen && !aiPrompt) void loadAiPrompt();
  }, [aiOpen]);

  const downloadTemplate = () => {
    const rows = [
      ["نام کالا", "برند", "بسته‌بندی", "قیمت فروش", "موجودی", "حداقل سفارش", "حجم خرید", "لینک عکس", "دسته", "زیردسته"],
      ["ماکارونی", "زر", "۷۰۰ گرمی", "55000", "24", "1", "", "", "مواد غذایی", "غلات"],
      ["شیر پاستوریزه", "میهن", "۱ لیتری", "28000", "30", "6", "", "https://example.com/milk.jpg", "مواد غذایی", "لبنیات"],
      ["شکر", "", "کیسه ۵۰ کیلویی", "", "", "", "40", "", "مواد غذایی", "مواد اولیه"],
      ["چای سیاه", "گلستان", "۵۰۰ گرمی", "98000", "12", "1", "25", "", "مواد غذایی", "نوشیدنی"],
    ];
    const escape = (v: string) => `"${v.replace(/"/g, '""')}"`;
    const csv = "\uFEFF" + rows.map((r) => r.map(escape).join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "imach-template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const copyPrompt = async () => {
    if (!aiPrompt) return;
    try {
      await navigator.clipboard.writeText(aiPrompt);
      setPromptCopied(true);
      setTimeout(() => setPromptCopied(false), 2000);
    } catch {
      toast({ title: "کپی نشد", variant: "destructive" });
    }
  };

  const readFile = async (file: File) => {
    setBusy(true);
    try {
      const res = await productsApi.importPreview({ file, businessId: bizId, mode, priceUnit });
      setRows(res.rows.map((r) => ({ ...r, status: "pending" as const, productImage: null, pendingImageUrl: "" })));
      setStep("preview");
    } catch (err) {
      toast({
        title: "خواندن فایل ناموفق بود",
        description: err instanceof ApiError ? err.message : "فرمت فایل را بررسی کن",
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  };

  const updateRow = (index: number, patch: Partial<EditableRow>) => {
    setRows((list) => list.map((r) => (r.index === index ? { ...r, ...patch } : r)));
  };

  const totalCount = rows.length;
  const validRows = rows.filter((r) => r.arms.length > 0 && r.warning !== "noName");
  const invalidRows = rows.filter((r) => r.warning === "noName" || (r.arms.length === 0 && r.warning === "noData"));
  const validCount = validRows.length;
  const invalidCount = invalidRows.length;
  const curDef = priceUnit === "toman" ? 10 : 1;

  // ── ستون‌های گرید — عرض‌ها با fr و px دقیق تنظیم شده‌اند ──
  // عکس | نام کالا | برند | بسته‌بندی | قیمت | موجودی | حداقل | حجم | دسته | زیردسته
  const gridCols = "grid-cols-[44px_1.5fr_0.8fr_0.8fr_100px_60px_60px_70px_0.8fr_0.8fr]";

  const confirm = async () => {
    const toSave = validRows.filter((r) => r.arms.length > 0);
    if (toSave.length === 0) return;

    setStep("progress");
    setSavedCount(0);
    setFailedCount(0);
    setDupCount(0);
    setRows((list) => list.map((r) => ({ ...r, status: "pending" as const, error: undefined })));

    let saved = 0;
    let failed = 0;
    let dups = 0;

    for (const row of toSave) {
      try {
        const res = await productsApi.importCommit({
          businessId: bizId,
          mode,
          rows: [{
            index: row.index,
            name: row.name,
            brand: row.brand ?? undefined,
            spec: row.spec ?? undefined,
            priceMinor: row.priceMinor ?? undefined,
            stock: row.stock ?? undefined,
            minOrder: row.minOrder ?? undefined,
            volume: row.volume ?? undefined,
            category: row.category ?? undefined,
            subcategory: row.subcategory ?? undefined,
            imageUrl: row.pendingImageUrl || undefined,
          }],
        });
        if (res.saved > 0) {
          saved++;
          setSavedCount(saved);
          setRows((list) => list.map((r) => (r.index === row.index ? { ...r, status: "saved" } : r)));
        } else if (res.skipped.some((s) => s.reason === "duplicate")) {
          dups++;
          setDupCount(dups);
          setRows((list) => list.map((r) => (r.index === row.index ? { ...r, status: "duplicate" } : r)));
        } else {
          failed++;
          setFailedCount(failed);
          setRows((list) => list.map((r) => (r.index === row.index ? { ...r, status: "failed", error: "ثبت ناموفق" } : r)));
        }
      } catch (err) {
        const code = err instanceof ApiError ? err.code : "";
        if (code === "LISTING_EXISTS" || code === "CONFLICT") {
          dups++;
          setDupCount(dups);
          setRows((list) => list.map((r) => (r.index === row.index ? { ...r, status: "duplicate" } : r)));
        } else {
          failed++;
          setFailedCount(failed);
          const errorMsg = err instanceof ApiError ? err.message : "خطا";
          setRows((list) => list.map((r) => (r.index === row.index ? { ...r, status: "failed", error: errorMsg } : r)));
        }
      }
    }

    setStep("done");
    setSavedCount(saved);
    setFailedCount(failed);
    setDupCount(dups);
  };

  const reset = () => {
    setRows([]);
    setStep("drop");
    setSavedCount(0);
    setFailedCount(0);
    setDupCount(0);
  };

  // ═══ مرحله done ═══
  if (step === "done") {
    const pct = totalCount > 0 ? Math.round((savedCount / totalCount) * 100) : 0;
    return (
      <div className="rounded-2xl border bg-white p-6 shadow-sm">
        <div className="flex flex-col items-center text-center">
          <div className={`grid size-16 place-items-center rounded-full ${savedCount > 0 ? "bg-emerald-100" : "bg-red-100"}`}>
            {savedCount > 0 ? <Check className="size-8 text-emerald-600" /> : <X className="size-8 text-red-600" />}
          </div>
          <h1 className="mt-4 text-lg font-extrabold">
            {savedCount > 0 ? `${fa(savedCount)} کالا ثبت شد` : "ثبت ناموفق بود"}
          </h1>
          <div className="mt-4 w-full max-w-xs">
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div className="h-full bg-primary transition-all duration-500" style={{ width: `${pct}%` }} />
            </div>
            <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
              <span className="font-bold text-emerald-600">{fa(savedCount)} موفق</span>
              {dupCount > 0 && <span className="font-bold text-amber-600">{fa(dupCount)} تکراری</span>}
              {failedCount > 0 && <span className="font-bold text-red-600">{fa(failedCount)} ناموفق</span>}
              <span>{fa(totalCount)} کل</span>
            </div>
          </div>
          {dupCount > 0 && (
            <div className="mt-4 w-full max-w-sm rounded-xl border border-amber-200 bg-amber-50/50 p-3 text-start">
              <p className="flex items-center gap-1.5 text-xs font-bold text-amber-700">
                <TriangleAlert className="size-3.5" />
                {fa(dupCount)} کالای تکراری — قبلاً در کاتالوک ثبت شده‌اند
              </p>
              <div className="mt-2 max-h-32 overflow-y-auto">
                {rows.filter((r) => r.status === "duplicate").map((r) => (
                  <p key={r.index} className="text-[11px] text-amber-600">ردیف {fa(r.index)}: {r.name}{r.brand ? ` · ${r.brand}` : ""}</p>
                ))}
              </div>
              <p className="mt-2 text-[11px] text-amber-600/80">برای ویرایش، از کاتالوک خودتان اصلاح کنید.</p>
            </div>
          )}
          {failedCount > 0 && (
            <div className="mt-4 w-full max-w-sm rounded-xl border border-red-200 bg-red-50/50 p-3 text-start">
              <p className="text-xs font-bold text-red-700">ردیف‌های ناموفق:</p>
              {rows.filter((r) => r.status === "failed").map((r) => (
                <p key={r.index} className="mt-1 text-[11px] text-red-600">ردیف {fa(r.index)}: {r.name} — {r.error}</p>
              ))}
            </div>
          )}
          <div className="mt-6 flex w-full gap-2">
            <Button variant="outline" className="flex-1" onClick={reset}>فایل دیگر</Button>
            <Button className="flex-1" onClick={() => onDone(arm)}>مشاهده {arm === "sell" ? "کاتالوک" : "دستیار خرید"}</Button>
          </div>
        </div>
      </div>
    );
  }

  // ═══ مرحله progress ═══
  if (step === "progress") {
    const processed = savedCount + failedCount + dupCount;
    const pct = validCount > 0 ? Math.round((processed / validCount) * 100) : 0;
    return (
      <div className="rounded-2xl border bg-white p-6 shadow-sm">
        <h1 className="text-lg font-extrabold">در حال ثبت…</h1>
        <div className="mt-4">
          <div className="h-3 overflow-hidden rounded-full bg-muted">
            <div className="h-full bg-primary transition-all duration-300" style={{ width: `${pct}%` }} />
          </div>
          <div className="mt-2 flex items-center justify-between text-xs">
            <span className="font-bold text-emerald-600">{fa(savedCount)} ثبت شد</span>
            {dupCount > 0 && <span className="font-bold text-amber-600">{fa(dupCount)} تکراری</span>}
            {failedCount > 0 && <span className="font-bold text-red-600">{fa(failedCount)} شکست</span>}
            <span className="text-muted-foreground">{fa(processed)} از {fa(validCount)}</span>
          </div>
        </div>
        <div className="mt-4 max-h-80 space-y-1 overflow-y-auto">
          {rows.filter((r) => r.arms.length > 0).map((r) => (
            <div key={r.index} className={cn("flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs",
              r.status === "saved" ? "bg-emerald-50" : r.status === "failed" ? "bg-red-50" :
              r.status === "duplicate" ? "bg-amber-50" : "bg-accent/30")}>
              {r.status === "saved" ? <Check className="size-3.5 shrink-0 text-emerald-600" /> :
               r.status === "failed" ? <X className="size-3.5 shrink-0 text-red-600" /> :
               r.status === "duplicate" ? <TriangleAlert className="size-3.5 shrink-0 text-amber-600" /> :
               <Loader2 className="size-3.5 shrink-0 animate-spin text-primary" />}
              <span className="min-w-0 flex-1 truncate">{r.name}</span>
              {r.brand && <span className="shrink-0 text-muted-foreground">{r.brand}</span>}
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ═══ مرحله preview — جدول گرید حرفه‌ای ═══
  if (step === "preview" && rows.length > 0) {
    const canImport = validCount > 0;
    return (
      <div className="rounded-2xl border bg-white shadow-sm">
        {/* هدر بالای جدول */}
        <div className="border-b p-4">
          <div className="flex items-center gap-2">
            <button type="button" onClick={reset} className="grid size-8 shrink-0 place-items-center rounded-lg text-muted-foreground transition hover:bg-accent hover:text-foreground">
              <X className="size-4" />
            </button>
            <h1 className="text-lg font-extrabold">پیش‌نمایش</h1>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <span className="rounded-full bg-accent px-3 py-1 text-xs font-bold">{fa(totalCount)} کالا</span>
            <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">{fa(validCount)} آماده ثبت</span>
            {invalidCount > 0 && (
              <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-bold text-red-700">{fa(invalidCount)} نیاز به اصلاح</span>
            )}
          </div>
          {invalidCount > 0 && (
            <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50/50 p-2.5">
              <p className="flex items-center gap-1.5 text-xs font-bold text-amber-700">
                <TriangleAlert className="size-3.5" />
                ردیف‌های ناقص ثبت نمی‌شوند — نام یا قیمت/حجم ندارد
              </p>
            </div>
          )}
        </div>

        {/* جدول گرید — در یک container با عرض بزرگ‌تر */}
        <div className="w-full">
          {/* سرستون جدول — sticky */}
          <div className={cn("grid gap-px border-b bg-stone-100 px-2 py-2 text-[10px] font-bold text-stone-500", gridCols)}>
            <span className="text-center">عکس</span>
            <span>نام کالا</span>
            <span>برند</span>
            <span>بسته‌بندی</span>
            <span className="text-center">قیمت ({priceUnit === "toman" ? "ت" : "ر"})</span>
            <span className="text-center">موجودی</span>
            <span className="text-center">حداقل</span>
            <span className="text-center">حجم خرید</span>
            <span>دسته</span>
            <span>زیردسته</span>
          </div>

          {/* بدنه جدول — ScrollArea برای اسکرول عمودی */}
          <ScrollArea className="h-[450px] w-full">
            <div>
              {rows.map((r, idx) => {
                const isInvalid = r.warning === "noName" || (r.arms.length === 0 && r.warning === "noData");
                const imgUrl = r.productImage || r.pendingImageUrl;
                return (
                  <div
                    key={r.index}
                    className={cn(
                      "grid items-center gap-px border-b px-2 py-1 text-xs transition-colors",
                      gridCols,
                      idx % 2 === 1 ? "bg-stone-50/60" : "bg-white",
                      isInvalid && "!bg-red-50/40",
                      r.status === "saved" && "!bg-emerald-50/50",
                      r.status === "failed" && "!bg-red-50/50",
                      r.status === "duplicate" && "!bg-amber-50/50",
                    )}
                  >
                    {/* عکس محصول — قابل کلیک برای ست کردن URL */}
                    <div className="flex items-center justify-center">
                      {imgUrl ? (
                        <div className="relative size-8 overflow-hidden rounded-md border">
                          <Image src={imgUrl} alt="" fill unoptimized className="object-cover" sizes="32px" />
                        </div>
                      ) : (
                        <label className="grid size-8 cursor-pointer place-items-center rounded-md border border-dashed text-stone-300 transition hover:border-primary hover:text-primary">
                          <input
                            type="url"
                            className="sr-only"
                            placeholder="آدرس عکس"
                            onChange={(e) => updateRow(r.index, { pendingImageUrl: e.target.value })}
                            onBlur={(e) => updateRow(r.index, { pendingImageUrl: e.target.value })}
                          />
                          <ImagePlus className="size-3.5" />
                        </label>
                      )}
                    </div>

                    {/* نام کالا — قابل ویرایش */}
                    <Input
                      value={r.name}
                      onChange={(e) => updateRow(r.index, { name: e.target.value })}
                      className="h-7 rounded-sm border-transparent bg-transparent px-1.5 text-xs font-bold hover:border-stone-200 focus:border-primary focus:bg-white"
                      placeholder="نام کالا"
                    />

                    {/* برند — فقط نمایش، قابل ویرایش */}
                    <Input
                      value={r.brand ?? ""}
                      onChange={(e) => updateRow(r.index, { brand: e.target.value })}
                      className="h-7 rounded-sm border-transparent bg-transparent px-1.5 text-xs text-stone-600 hover:border-stone-200 focus:border-primary focus:bg-white"
                      placeholder="—"
                    />

                    {/* بسته‌بندی — فقط نمایش */}
                    <span className="truncate px-1.5 text-xs text-stone-500" title={r.spec ?? ""}>
                      {r.spec || <span className="text-stone-300">—</span>}
                    </span>

                    {/* قیمت — NumberInput قابل ویرایش */}
                    <NumberInput
                      value={r.priceMinor ? r.priceMinor / curDef : null}
                      onChange={(v) => updateRow(r.index, {
                        priceMinor: v ? v * curDef : null,
                        arms: v ? (r.volume ? ["SELL", "BUY"] : ["SELL"]) : r.arms,
                      })}
                      locale={numLocale}
                      min={0}
                      className="h-7 rounded-sm border-transparent bg-transparent hover:border-stone-200 focus:border-primary focus:bg-white"
                    />

                    {/* موجودی */}
                    <NumberInput
                      value={r.stock}
                      onChange={(v) => updateRow(r.index, { stock: v })}
                      locale={numLocale}
                      min={0}
                      className="h-7 rounded-sm border-transparent bg-transparent hover:border-stone-200 focus:border-primary focus:bg-white"
                    />

                    {/* حداقل سفارش */}
                    <NumberInput
                      value={r.minOrder}
                      onChange={(v) => updateRow(r.index, { minOrder: v })}
                      locale={numLocale}
                      min={0}
                      className="h-7 rounded-sm border-transparent bg-transparent hover:border-stone-200 focus:border-primary focus:bg-white"
                    />

                    {/* حجم خرید */}
                    <NumberInput
                      value={r.volume}
                      onChange={(v) => updateRow(r.index, {
                        volume: v,
                        arms: v ? (r.priceMinor ? ["SELL", "BUY"] : ["BUY"]) : r.arms,
                      })}
                      locale={numLocale}
                      min={0}
                      className="h-7 rounded-sm border-transparent bg-transparent hover:border-stone-200 focus:border-primary focus:bg-white"
                    />

                    {/* دسته — فقط نمایش */}
                    <span className="truncate px-1.5 text-xs text-stone-500" title={r.category ?? ""}>
                      {r.category || <span className="text-stone-300">—</span>}
                    </span>

                    {/* زیردسته — فقط نمایش */}
                    <span className="truncate px-1.5 text-xs text-stone-500" title={r.subcategory ?? ""}>
                      {r.subcategory || <span className="text-stone-300">—</span>}
                    </span>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </div>

        {/* دکمه ثبت */}
        <div className="border-t p-4">
          <Button className="w-full" size="lg" onClick={() => void confirm()} disabled={busy || !canImport}>
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
            ثبت {fa(validCount)} کالا
          </Button>
        </div>
      </div>
    );
  }

  // ═══ مرحله drop ═══
  return (
    <div className="rounded-2xl border bg-white shadow-sm">
      <div className="p-6">
        <div className="flex items-center gap-2">
          <FileSpreadsheet className="size-5 text-primary" />
          <h1 className="text-lg font-extrabold">{m.importSheet.title}</h1>
          <button type="button" aria-label={m.importSheet.helpTitle} onClick={() => setHelpOpen(true)} className="ms-auto grid size-7 place-items-center rounded-full text-muted-foreground transition hover:bg-accent hover:text-primary">
            <HelpCircle className="size-4" />
          </button>
        </div>
        <p className="mt-3 text-sm leading-7 text-muted-foreground">فایل اکسل یا CSV کالاهایت را اینجا بگذار. ستون‌ها خودکار تشخیص داده می‌شوند.</p>

        <label className={cn("mt-4 grid cursor-pointer place-items-center rounded-2xl border-2 border-dashed border-primary/30 bg-accent/20 px-6 py-10 text-center transition hover:border-primary/60 hover:bg-accent/40", busy && "pointer-events-none opacity-60")}>
          <input type="file" accept=".xlsx,.xls,.csv,.txt" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) void readFile(f); }} />
          {busy ? <Loader2 className="size-6 animate-spin text-primary" /> : <Upload className="size-6 text-primary" />}
          <p className="mt-2 text-sm font-extrabold">{m.importSheet.choose}</p>
          <p className="mt-1 text-[11px] text-muted-foreground">xlsx · xls · csv</p>
        </label>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            {m.importSheet.priceUnit}
            <span className="inline-flex overflow-hidden rounded-full border">
              {(["toman", "rial"] as const).map((u) => (
                <button key={u} type="button" onClick={() => setPriceUnit(u)} aria-pressed={priceUnit === u} className={cn("px-3 py-1 font-bold transition", priceUnit === u ? "bg-primary text-primary-foreground" : "hover:text-primary")}>
                  {u === "toman" ? m.importSheet.toman : m.importSheet.rial}
                </button>
              ))}
            </span>
          </div>
          <button type="button" onClick={downloadTemplate} className="font-bold text-primary underline-offset-2 hover:underline">{m.importSheet.template}</button>
        </div>

        {/* AI */}
        <div className="mt-4 overflow-hidden rounded-xl border border-primary/20">
          <button type="button" onClick={() => setAiOpen((v) => !v)} className="flex w-full items-center gap-2 bg-accent/30 px-3.5 py-3 text-start transition hover:bg-accent/50" aria-expanded={aiOpen}>
            <Sparkles className="size-4 shrink-0 text-primary" />
            <span className="text-xs font-extrabold text-primary">ساخت اکسل با هوش مصنوعی</span>
            <ChevronDown className={cn("ms-auto size-4 shrink-0 text-muted-foreground transition", aiOpen && "rotate-180")} />
          </button>
          {aiOpen && (
            <div className="space-y-3 p-3.5">
              <p className="text-[11px] leading-6 text-muted-foreground">پرامپت زیر را کپی کن و به یکی از هوش‌های مصنوعی همراه با فایل کالاهایت بده. هزار کالا در چند دقیقه. بعد فایل خروجی را همین‌جا آپلود کن.</p>
              {aiLoading ? (
                <div className="grid h-[400px] place-items-center rounded-lg border bg-muted/30">
                  <Loader2 className="size-5 animate-spin text-primary" />
                  <p className="mt-2 text-xs text-muted-foreground">در حال بارگیری…</p>
                </div>
              ) : (
                <textarea readOnly value={aiPrompt} className="h-[400px] w-full resize-none rounded-lg border bg-muted/20 p-3 font-mono text-[11px] leading-5 text-foreground/80" dir="rtl" onFocus={(e) => e.target.select()} />
              )}
              <div className="flex flex-wrap items-center gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => void copyPrompt()} disabled={!aiPrompt}>
                  {promptCopied ? <Check className="size-3.5 text-emerald-600" /> : <FileSpreadsheet className="size-3.5" />}
                  {promptCopied ? "کپی شد" : "کپی پرامپت"}
                </Button>
                <span className="text-[11px] text-muted-foreground">برو به:</span>
                <a href="https://chatgpt.com" target="_blank" rel="noopener noreferrer" className="rounded-lg border bg-white px-2.5 py-1 text-[11px] font-bold text-primary hover:bg-accent">ChatGPT</a>
                <a href="https://claude.ai" target="_blank" rel="noopener noreferrer" className="rounded-lg border bg-white px-2.5 py-1 text-[11px] font-bold text-primary hover:bg-accent">Claude</a>
                <a href="https://gemini.google.com" target="_blank" rel="noopener noreferrer" className="rounded-lg border bg-white px-2.5 py-1 text-[11px] font-bold text-primary hover:bg-accent">Gemini</a>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
