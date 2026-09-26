"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { ApiError, goodsApi, productsApi, type CatalogReferenceDto, type ImportPreviewDto } from "@/lib/api";
import { fa } from "@/lib/format";
import { useMessages } from "@/i18n/messages/use-messages";
import { useLocale } from "@/i18n/locale-context";
import { NumberInput } from "@/components/number-input";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Check, ChevronDown, FileSpreadsheet, ImagePlus, Loader2, Sparkles, Trash2, TriangleAlert, Upload, X } from "lucide-react";
import { cn } from "@/lib/utils";

type Step = "drop" | "preview" | "progress" | "done";

type EditableRow = ImportPreviewDto["rows"][number] & {
  status?: "pending" | "saved" | "failed" | "duplicate";
  error?: string;
  productImage?: string | null;
  pendingImageUrl?: string;
  /** دوره خرید — هفتگی/ماهیانه/موردی */
  frequency?: string | null;
};

/** عرض ستون‌ها — فروش و خرید متفاوت */
const GRID_SELL = "48px 28px minmax(140px,1.6fr) minmax(70px,0.7fr) minmax(70px,0.7fr) 120px 70px 70px 100px";
const GRID_BUY  = "48px 28px minmax(140px,1.6fr) minmax(70px,0.7fr) minmax(70px,0.7fr) 90px 90px";

const FREQUENCIES = [
  { v: "WEEKLY", label: "هفتگی" },
  { v: "MONTHLY", label: "ماهیانه" },
  { v: "OCCASIONAL", label: "موردی" },
];

/** پرامپت AI — بر اساس arm متفاوت */
function buildAiPrompt(ref: CatalogReferenceDto, arm: "sell" | "buy"): string {
  return [
    "تو دستیار وارد کردن کالا برای پلتفرم عمده‌فروشی iMach هستی.",
    `کاربر فایل ${arm === "sell" ? "کالاهای فروش" : "کالاهای خرید"} خود را می‌دهد و تو باید آن را به قالب زیر تبدیل کنی.`,
    "",
    "ستون‌های خروجی (با کاما جدا شوند):",
    arm === "sell"
      ? "نام کالا, برند, بسته‌بندی, قیمت فروش, موجودی, حداقل سفارش, لینک عکس"
      : "نام کالا, برند, بسته‌بندی, حجم خرید, دوره خرید, لینک عکس",
    "",
    "قواعد:",
    "۱) «نام کالا» را کوتاه و استاندارد بنویس.",
    "۲) «نام کالا» از لیست گودهای موجود انتخاب شود.",
    "۳) «برند» از لیست برندهای موجود. بدون برند خالی.",
    arm === "sell"
      ? "۴) این کالاهایی است که کاربر عمده می‌فروشد — قیمت، موجودی و حداقل سفارش را پر کن."
      : "۴) این کالاهایی است که کاربر عمده می‌خرد — حجم خرید و دوره خرید را پر کن.",
    arm === "buy" ? "۵) «دوره خرید» یکی از این سه باشد: هفتگی، ماهیانه، موردی." : "۵) قیمت عدد تومان بدون جداکننده.",
    "۶) اگر عکس کالا لینک مستقیم دارد، در «لینک عکس» بگذار.",
    "۷) اگر مقدار کاما دارد، داخل کوتیشن.",
    "",
    "خروجی CSV بدون توضیح.",
    "",
    "═══ لیست گودها و دسته‌بندی‌ها (JSON) ═══",
    JSON.stringify(ref, null, 2),
    "═══ پایان ═══",
  ].join("\n");
}

/** محاسبه نقص‌های یک ردیف */
function getRowIssues(r: EditableRow, arm: "sell" | "buy"): string[] {
  const issues: string[] = [];
  if (!r.name?.trim()) issues.push("نام ندارد");
  if (arm === "sell") {
    if (!r.priceMinor || r.priceMinor <= 0) issues.push("قیمت ندارد");
  } else {
    if (!r.volume || r.volume <= 0) issues.push("حجم ندارد");
  }
  // عکس اجباری نیست — کالا بدون عکس هم ثبت می‌شود، بعداً از کاتالوک اضافه می‌کند
  return issues;
}

export function ImportSheet({ bizId, arm, onDone }: { bizId: string; arm: "sell" | "buy"; onDone: (kind: "sell" | "buy") => void }) {
  const { toast } = useToast();
  const m = useMessages();
  const { locale } = useLocale();
  const numLocale: "fa" | "en" = locale === "en" ? "en" : "fa";
  const mode: "SELL" | "BUY" = arm === "sell" ? "SELL" : "BUY";
  const armLabel = arm === "sell" ? "فروش" : "خرید";
  const GRID_COLS = arm === "sell" ? GRID_SELL : GRID_BUY;

  const [step, setStep] = useState<Step>("drop");
  const [priceUnit, setPriceUnit] = useState<"toman" | "rial">("toman");
  const [busy, setBusy] = useState(false);
  const [rows, setRows] = useState<EditableRow[]>([]);
  const [savedCount, setSavedCount] = useState(0);
  const [failedCount, setFailedCount] = useState(0);
  const [dupCount, setDupCount] = useState(0);
  const [aiOpen, setAiOpen] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [promptCopied, setPromptCopied] = useState(false);

  const loadAiPrompt = async () => {
    if (aiPrompt) return;
    setAiLoading(true);
    try {
      const ref = await goodsApi.getCatalogReference();
      setAiPrompt(buildAiPrompt(ref, arm));
    } catch {
      setAiPrompt(buildAiPrompt({ categories: [], brands: [], totalGoods: 0, totalBrands: 0 }, arm));
    } finally { setAiLoading(false); }
  };
  useEffect(() => { if (aiOpen && !aiPrompt) void loadAiPrompt(); }, [aiOpen, aiPrompt]);

  const downloadTemplate = () => {
    const sellRows = [
      ["نام کالا", "برند", "بسته‌بندی", "قیمت فروش", "موجودی", "حداقل سفارش", "لینک عکس"],
      ["ماکارونی", "زر", "۷۰۰ گرمی", "55000", "24", "1", ""],
      ["شیر پاستوریزه", "میهن", "۱ لیتری", "28000", "30", "6", "https://example.com/milk.jpg"],
      ["چای سیاه", "گلستان", "۵۰۰ گرمی", "98000", "12", "1", ""],
    ];
    const buyRows = [
      ["نام کالا", "برند", "بسته‌بندی", "حجم خرید", "دوره خرید", "لینک عکس"],
      ["شکر", "", "کیسه ۵۰ کیلویی", "40", "ماهیانه", ""],
      ["روغن مایع", "آفتاب", "۱.۸ لیتری", "25", "هفتگی", ""],
      ["برنج", "طارم", "۱۰ کیلویی", "30", "موردی", ""],
    ];
    const data = arm === "sell" ? sellRows : buyRows;
    const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
    const csv = "\uFEFF" + data.map((r) => r.map(esc).join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url; a.download = `imach-${arm}-template.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const copyPrompt = async () => {
    if (!aiPrompt) return;
    try { await navigator.clipboard.writeText(aiPrompt); setPromptCopied(true); setTimeout(() => setPromptCopied(false), 2000); }
    catch { toast({ title: "کپی نشد", variant: "destructive" }); }
  };

  const readFile = async (file: File) => {
    setBusy(true);
    try {
      const res = await productsApi.importPreview({ file, businessId: bizId, mode, priceUnit });
      setRows(res.rows.map((r) => ({
        ...r,
        status: "pending" as const,
        productImage: null,
        pendingImageUrl: "",
        frequency: r.volume ? "MONTHLY" : null,
      })));
      setStep("preview");
    } catch (err) {
      toast({ title: "خواندن فایل ناموفق بود", description: err instanceof ApiError ? err.message : "فرمت فایل را بررسی کن", variant: "destructive" });
    } finally { setBusy(false); }
  };

  const updateRow = (index: number, patch: Partial<EditableRow>) => {
    setRows((list) => list.map((r) => (r.index === index ? { ...r, ...patch } : r)));
  };
  const deleteRow = (index: number) => setRows((list) => list.filter((r) => r.index !== index));

  const curDef = priceUnit === "toman" ? 10 : 1;
  const totalCount = rows.length;

  // اعتبارسنجی — نقص‌ها از getRowIssues محاسبه می‌شوند
  const isRowValid = (r: EditableRow) => getRowIssues(r, arm).length === 0 && r.mineMode === null;
  const isRowDuplicate = (r: EditableRow) => r.mineMode !== null && r.mineMode !== undefined;
  const isRowIncomplete = (r: EditableRow) => getRowIssues(r, arm).length > 0 && !isRowDuplicate(r);
  const validRows = rows.filter(isRowValid);
  const validCount = validRows.length;
  const dupCount2 = rows.filter(isRowDuplicate).length;
  const incompleteCount = rows.filter(isRowIncomplete).length;
  const invalidCount = dupCount2 + incompleteCount;

  const confirm = async () => {
    const toSave = validRows;
    if (toSave.length === 0) return;
    setStep("progress");
    setSavedCount(0); setFailedCount(0); setDupCount(0);
    setRows((list) => list.map((r) => ({ ...r, status: "pending" as const, error: undefined })));
    let saved = 0, failed = 0, dups = 0;
    for (const row of toSave) {
      try {
        const res = await productsApi.importCommit({
          businessId: bizId, mode,
          rows: [{
            index: row.index, name: row.name,
            brand: row.brand ?? undefined, spec: row.spec ?? undefined,
            priceMinor: row.priceMinor ?? undefined, stock: row.stock ?? undefined,
            minOrder: row.minOrder ?? undefined, volume: row.volume ?? undefined,
            imageUrl: row.pendingImageUrl || row.productImage || undefined,
          }],
        });
        if (res.saved > 0) { saved++; setSavedCount(saved); setRows((l) => l.map((r) => r.index === row.index ? { ...r, status: "saved" } : r)); }
        else if (res.skipped.some((s) => s.reason === "duplicate")) { dups++; setDupCount(dups); setRows((l) => l.map((r) => r.index === row.index ? { ...r, status: "duplicate" } : r)); }
        else { failed++; setFailedCount(failed); setRows((l) => l.map((r) => r.index === row.index ? { ...r, status: "failed", error: "ثبت ناموفق" } : r)); }
      } catch (err) {
        const code = err instanceof ApiError ? err.code : "";
        if (code === "LISTING_EXISTS" || code === "CONFLICT") { dups++; setDupCount(dups); setRows((l) => l.map((r) => r.index === row.index ? { ...r, status: "duplicate" } : r)); }
        else { failed++; setFailedCount(failed); const msg = err instanceof ApiError ? err.message : "خطا"; setRows((l) => l.map((r) => r.index === row.index ? { ...r, status: "failed", error: msg } : r)); }
      }
    }
    setStep("done"); setSavedCount(saved); setFailedCount(failed); setDupCount(dups);
  };

  const reset = () => { setRows([]); setStep("drop"); setSavedCount(0); setFailedCount(0); setDupCount(0); };

  // ═══ done ═══
  if (step === "done") {
    const pct = totalCount > 0 ? Math.round((savedCount / totalCount) * 100) : 0;
    return (
      <div className="rounded-2xl border bg-white p-6 shadow-sm">
        <div className="flex flex-col items-center text-center">
          <div className={cn("grid size-16 place-items-center rounded-full", savedCount > 0 ? "bg-emerald-100" : "bg-red-100")}>
            {savedCount > 0 ? <Check className="size-8 text-emerald-600" /> : <X className="size-8 text-red-600" />}
          </div>
          <h1 className="mt-4 text-lg font-extrabold">{savedCount > 0 ? `${fa(savedCount)} کالا ثبت شد` : "ثبت ناموفق بود"}</h1>
          <div className="mt-4 w-full max-w-xs">
            <div className="h-2 overflow-hidden rounded-full bg-muted"><div className="h-full bg-primary transition-all duration-500" style={{ width: `${pct}%` }} /></div>
            <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
              <span className="font-bold text-emerald-600">{fa(savedCount)} موفق</span>
              {dupCount > 0 && <span className="font-bold text-amber-600">{fa(dupCount)} تکراری</span>}
              {failedCount > 0 && <span className="font-bold text-red-600">{fa(failedCount)} ناموفق</span>}
              <span>{fa(totalCount)} کل</span>
            </div>
          </div>
          {dupCount > 0 && (
            <div className="mt-4 w-full max-w-sm rounded-xl border border-amber-200 bg-amber-50/50 p-3 text-start">
              <p className="flex items-center gap-1.5 text-xs font-bold text-amber-700"><TriangleAlert className="size-3.5" />{fa(dupCount)} کالای تکراری</p>
              <div className="mt-2 max-h-32 overflow-y-auto">{rows.filter((r) => r.status === "duplicate").map((r) => (<p key={r.index} className="text-[11px] text-amber-600">{r.name}{r.brand ? ` · ${r.brand}` : ""}</p>))}</div>
              <p className="mt-2 text-[11px] text-amber-600/80">از کاتالوک خودتان ویرایش کنید.</p>
            </div>
          )}
          {failedCount > 0 && (
            <div className="mt-4 w-full max-w-sm rounded-xl border border-red-200 bg-red-50/50 p-3 text-start">
              <p className="text-xs font-bold text-red-700">ناموفق:</p>
              {rows.filter((r) => r.status === "failed").map((r) => (<p key={r.index} className="mt-1 text-[11px] text-red-600">{r.name} — {r.error}</p>))}
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

  // ═══ progress ═══
  if (step === "progress") {
    const processed = savedCount + failedCount + dupCount;
    const pct = validCount > 0 ? Math.round((processed / validCount) * 100) : 0;
    return (
      <div className="rounded-2xl border bg-white p-6 shadow-sm">
        <h1 className="text-lg font-extrabold">در حال ثبت…</h1>
        <div className="mt-4">
          <div className="h-3 overflow-hidden rounded-full bg-muted"><div className="h-full bg-primary transition-all duration-300" style={{ width: `${pct}%` }} /></div>
          <div className="mt-2 flex items-center justify-between text-xs">
            <span className="font-bold text-emerald-600">{fa(savedCount)} ثبت شد</span>
            {dupCount > 0 && <span className="font-bold text-amber-600">{fa(dupCount)} تکراری</span>}
            {failedCount > 0 && <span className="font-bold text-red-600">{fa(failedCount)} شکست</span>}
            <span className="text-muted-foreground">{fa(processed)} از {fa(validCount)}</span>
          </div>
        </div>
        <div className="mt-4 max-h-80 space-y-1 overflow-y-auto">
          {rows.filter((r) => r.arms.length > 0).map((r) => (
            <div key={r.index} className={cn("flex items-center gap-2 rounded px-2.5 py-2 text-xs",
              r.status === "saved" ? "bg-emerald-50" : r.status === "failed" ? "bg-red-50" : r.status === "duplicate" ? "bg-amber-50" : "bg-accent/30")}>
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

  // ═══ preview ═══
  if (step === "preview" && rows.length > 0) {
    return (
      <div className="rounded-2xl border bg-white shadow-sm">
        <div className="border-b p-4">
          <div className="flex items-center gap-2">
            <button type="button" onClick={reset} className="grid size-8 shrink-0 place-items-center rounded-lg text-muted-foreground transition hover:bg-accent hover:text-foreground"><X className="size-4" /></button>
            <h1 className="text-lg font-extrabold">پیش‌نمایش {armLabel}</h1>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <span className="rounded-full bg-accent px-3 py-1 text-xs font-bold">{fa(totalCount)} کالا</span>
            <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">{fa(validCount)} آماده ثبت</span>
            {invalidCount > 0 && <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-bold text-red-700">{fa(invalidCount)} نیاز به اصلاح</span>}
          </div>
        </div>

        {/* جدول */}
        <div className="overflow-auto" style={{ maxHeight: "500px" }}>
          {/* سرستون */}
          <div style={{ display: "grid", gridTemplateColumns: GRID_COLS, position: "sticky", top: 0, zIndex: 10 }} className="border-b bg-stone-100 text-[10px] font-bold text-stone-500">
            <div className="px-1 py-2.5 text-center">عکس</div>
            <div className="px-1 py-2.5" />
            <div className="px-2 py-2.5">نام کالا</div>
            <div className="px-2 py-2.5">برند</div>
            <div className="px-2 py-2.5">بسته‌بندی</div>
            {arm === "sell" ? (
              <>
                <div className="px-2 py-2.5 text-center">قیمت ({priceUnit === "toman" ? "ت" : "ر"})</div>
                <div className="px-2 py-2.5 text-center">موجودی</div>
                <div className="px-2 py-2.5 text-center">حداقل</div>
              </>
            ) : (
              <>
                <div className="px-2 py-2.5 text-center">حجم خرید</div>
                <div className="px-2 py-2.5 text-center">دوره</div>
              </>
            )}
          </div>

          {/* ردیف‌ها */}
          {rows.map((r, idx) => {
            const isDup = isRowDuplicate(r);
            const issues = getRowIssues(r, arm);
            const isInc = issues.length > 0 && !isDup;
            const imgUrl = r.productImage || r.pendingImageUrl;
            return (
              <div
                key={r.index}
                style={{ display: "grid", gridTemplateColumns: GRID_COLS }}
                className={cn(
                  "border-b text-xs transition-colors",
                  idx % 2 === 1 ? "bg-stone-50/50" : "bg-white",
                  isInc && "!bg-red-50/30",
                  isDup && "!bg-amber-50/30",
                  r.status === "saved" && "!bg-emerald-50/50",
                  r.status === "failed" && "!bg-red-50/50",
                  r.status === "duplicate" && "!bg-amber-50/50",
                )}
              >
                {/* عکس */}
                <div className="flex items-center justify-center px-1 py-1.5">
                  {imgUrl ? (
                    <div className="relative size-8 overflow-hidden rounded border border-stone-200">
                      <Image src={imgUrl} alt="" fill unoptimized className="object-cover" sizes="32px" />
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        const url = window.prompt("آدرس عکس کالا را وارد کن:");
                        if (url && url.trim()) updateRow(r.index, { pendingImageUrl: url.trim() });
                      }}
                      className="grid size-8 cursor-pointer place-items-center rounded border border-dashed border-stone-300 text-stone-300 transition hover:border-primary hover:text-primary"
                      title="آدرس عکس را وارد کن"
                    >
                      <ImagePlus className="size-3.5" />
                    </button>
                  )}
                </div>

                {/* وضعیت / حذف */}
                <div className="flex items-center justify-center px-0.5">
                  {isDup ? (
                    <span className="rounded bg-amber-100 px-1 py-0.5 text-[8px] font-bold text-amber-700" title="تکراری">تکراری</span>
                  ) : isInc ? (
                    <span className="rounded bg-red-100 px-1 py-0.5 text-[8px] font-bold text-red-600" title={issues.join("، ")}>ناقص</span>
                  ) : (
                    <button type="button" onClick={() => deleteRow(r.index)} className="grid size-5 place-items-center rounded text-stone-300 transition hover:bg-red-50 hover:text-red-500" title="حذف">
                      <Trash2 className="size-3" />
                    </button>
                  )}
                </div>

                {/* نام */}
                <div className="px-1 py-1">
                  <Input value={r.name} onChange={(e) => updateRow(r.index, { name: e.target.value })} className="h-7 border-transparent bg-transparent px-1.5 text-xs font-bold hover:border-stone-200 focus:border-primary focus:bg-white" placeholder="نام" />
                </div>

                {/* برند */}
                <div className="px-1 py-1">
                  <Input value={r.brand ?? ""} onChange={(e) => updateRow(r.index, { brand: e.target.value })} className="h-7 border-transparent bg-transparent px-1.5 text-xs text-stone-600 hover:border-stone-200 focus:border-primary focus:bg-white" placeholder="—" />
                </div>

                {/* بسته‌بندی */}
                <div className="truncate px-2 py-2 text-xs text-stone-500" title={r.spec ?? ""}>{r.spec || <span className="text-stone-300">—</span>}</div>

                {/* ستون‌های فروش یا خرید */}
                {arm === "sell" ? (
                  <>
                    <div className="px-1 py-1">
                      <NumberInput value={r.priceMinor ? r.priceMinor / curDef : null} onChange={(v) => updateRow(r.index, { priceMinor: v ? v * curDef : null, arms: v ? ["SELL"] : r.arms })} locale={numLocale} min={0} className="h-7 border-transparent bg-transparent text-center hover:border-stone-200 focus:border-primary focus:bg-white" />
                    </div>
                    <div className="px-1 py-1">
                      <NumberInput value={r.stock} onChange={(v) => updateRow(r.index, { stock: v })} locale={numLocale} min={0} className="h-7 border-transparent bg-transparent text-center hover:border-stone-200 focus:border-primary focus:bg-white" />
                    </div>
                    <div className="px-1 py-1">
                      <NumberInput value={r.minOrder} onChange={(v) => updateRow(r.index, { minOrder: v })} locale={numLocale} min={0} className="h-7 border-transparent bg-transparent text-center hover:border-stone-200 focus:border-primary focus:bg-white" />
                    </div>
                  </>
                ) : (
                  <>
                    <div className="px-1 py-1">
                      <NumberInput value={r.volume} onChange={(v) => updateRow(r.index, { volume: v, arms: v ? ["BUY"] : r.arms })} locale={numLocale} min={0} className="h-7 border-transparent bg-transparent text-center hover:border-stone-200 focus:border-primary focus:bg-white" />
                    </div>
                    <div className="px-1 py-1">
                      <select
                        value={r.frequency ?? "MONTHLY"}
                        onChange={(e) => updateRow(r.index, { frequency: e.target.value })}
                        className="h-7 w-full border-transparent bg-transparent px-1 text-xs text-stone-600 hover:border-stone-200 focus:border-primary focus:bg-white outline-none"
                      >
                        {FREQUENCIES.map((f) => (
                          <option key={f.v} value={f.v}>{f.label}</option>
                        ))}
                      </select>
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>

        {/* دکمه ثبت */}
        <div className="border-t p-4">
          <Button className="w-full" size="lg" onClick={() => void confirm()} disabled={busy || validCount === 0}>
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
            ثبت {fa(validCount)} کالا
          </Button>
        </div>
      </div>
    );
  }

  // ═══ drop ═══
  return (
    <div className="rounded-2xl border bg-white shadow-sm">
      <div className="p-6">
        <div className="flex items-center gap-2">
          <FileSpreadsheet className="size-5 text-primary" />
          <h1 className="text-lg font-extrabold">اکسل {armLabel}</h1>
        </div>
        <p className="mt-3 text-sm leading-7 text-muted-foreground">
          فایل اکسل کالاهایی که {arm === "sell" ? "عمده می‌فروشی" : "عمده می‌خری"} را اینجا بگذار.
        </p>

        <label className={cn("mt-4 grid cursor-pointer place-items-center rounded-2xl border-2 border-dashed border-primary/30 bg-accent/20 px-6 py-10 text-center transition hover:border-primary/60 hover:bg-accent/40", busy && "pointer-events-none opacity-60")}>
          <input type="file" accept=".xlsx,.xls,.csv,.txt" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) void readFile(f); }} />
          {busy ? <Loader2 className="size-6 animate-spin text-primary" /> : <Upload className="size-6 text-primary" />}
          <p className="mt-2 text-sm font-extrabold">{m.importSheet.choose}</p>
          <p className="mt-1 text-[11px] text-muted-foreground">xlsx · xls · csv</p>
        </label>

        {/* واحد قیمت فقط فروش + فایل نمونه */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-xs">
          {arm === "sell" ? (
            <div className="flex items-center gap-1.5 text-muted-foreground">
              {m.importSheet.priceUnit}
              <span className="inline-flex overflow-hidden rounded-full border">
                {(["toman","rial"] as const).map((u) => (
                  <button key={u} type="button" onClick={() => setPriceUnit(u)} aria-pressed={priceUnit === u} className={cn("px-3 py-1 font-bold transition", priceUnit === u ? "bg-primary text-primary-foreground" : "hover:text-primary")}>{u === "toman" ? m.importSheet.toman : m.importSheet.rial}</button>
                ))}
              </span>
            </div>
          ) : <div />}
          <button type="button" onClick={downloadTemplate} className="font-bold text-primary underline-offset-2 hover:underline">فایل نمونه {armLabel}</button>
        </div>

        {/* AI */}
        <div className="mt-4 overflow-hidden rounded-xl border border-primary/20">
          <button type="button" onClick={() => setAiOpen((v) => !v)} className="flex w-full items-center gap-2 bg-accent/30 px-3.5 py-3 text-start transition hover:bg-accent/50" aria-expanded={aiOpen}>
            <Sparkles className="size-4 shrink-0 text-primary" />
            <span className="text-xs font-extrabold text-primary">ساخت اکسل {armLabel} با هوش مصنوعی</span>
            <ChevronDown className={cn("ms-auto size-4 shrink-0 text-muted-foreground transition", aiOpen && "rotate-180")} />
          </button>
          {aiOpen && (
            <div className="space-y-3 p-3.5">
              <p className="text-[11px] leading-6 text-muted-foreground">
                پرامپت زیر را کپی کن و به هوش مصنوعی همراه با فایل کالاهایت بده.
                {arm === "sell" ? " اکسل فروش" : " اکسل خرید"} ساخته می‌شود. بعد فایل خروجی را همین‌جا آپلود کن.
              </p>

              {/* نوار ابزار — بالای کادر متن */}
              <div className="flex flex-wrap items-center gap-2 border-b pb-2">
                <Button type="button" variant="outline" size="sm" onClick={() => void copyPrompt()} disabled={!aiPrompt}>
                  {promptCopied ? <Check className="size-3.5 text-emerald-600" /> : <FileSpreadsheet className="size-3.5" />}
                  {promptCopied ? "کپی شد" : "کپی پرامپت"}
                </Button>
                <span className="text-[11px] text-muted-foreground">برو به:</span>
                <a href="https://chatgpt.com" target="_blank" rel="noopener noreferrer" className="rounded-lg border bg-white px-2.5 py-1 text-[11px] font-bold text-primary hover:bg-accent">ChatGPT</a>
                <a href="https://claude.ai" target="_blank" rel="noopener noreferrer" className="rounded-lg border bg-white px-2.5 py-1 text-[11px] font-bold text-primary hover:bg-accent">Claude</a>
                <a href="https://gemini.google.com" target="_blank" rel="noopener noreferrer" className="rounded-lg border bg-white px-2.5 py-1 text-[11px] font-bold text-primary hover:bg-accent">Gemini</a>
              </div>

              {/* کادر متن */}
              {aiLoading ? (
                <div className="grid h-[400px] place-items-center rounded-lg border bg-muted/30"><Loader2 className="size-5 animate-spin text-primary" /><p className="mt-2 text-xs text-muted-foreground">در حال بارگیری…</p></div>
              ) : (
                <textarea readOnly value={aiPrompt} className="h-[400px] w-full resize-none rounded-lg border bg-muted/20 p-3 font-mono text-[11px] leading-5 text-foreground/80" dir="rtl" onFocus={(e) => e.target.select()} />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
