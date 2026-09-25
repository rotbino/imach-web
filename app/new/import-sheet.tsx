"use client";

import { useRef, useState } from "react";
import { ApiError, type ImportPreviewDto } from "@/lib/api";
import { productsApi } from "@/lib/api";
import { fa, fmtMoney } from "@/lib/format";
import { useMessages } from "@/i18n/messages/use-messages";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Check, FileSpreadsheet, HelpCircle, Image as ImageIcon, Loader2, TriangleAlert, Upload, X } from "lucide-react";

/**
 * ─── وارد کردن گروهی از فایل ─────────────────────────────────────────────────
 * سه قاعده‌ی ظرافت (خواسته‌ی کاربر: هنرمندانه و ظریف، بدون شکستن سادگی):
 *  ۱. هیچ فرم جدیدی نیست — همان فایلی که فروشنده از قبل دارد خوانده می‌شود؛
 *     سرستون فازی + هر انکودینگ CSV + حتی فایل بی‌سرستون (تشخیص خودکار).
 *  ۲. هر ردیف از محتوایش بازو می‌گیرد: قیمت فروش → فروش، حجم خرید → خرید،
 *     هر دو → هر دو (خواسته‌ی کاربر: «فقط خرید؟ ستون‌های فروش رو خالی بذار»).
 *  ۳. هیچ‌چیز بی‌اجازه نوشته نمی‌شود — پیش‌نمایش نشان می‌دهد هر ردیف دقیقاً
 *     با کدام SKU هم‌خوان است، چه چیزی ساخته می‌شود و چه چیزی رد می‌شود.
 *
 * میان‌بر هوش مصنوعی (خواسته‌ی کاربر): پرامپت فارسیِ آماده که کاربر همراه
 * فایلش به هر هوش مصنوعی بدهد و خروجی را در قالب ما بگیرد — «۱۰۰۰ کالا در
 * چند دقیقه». لینک عکس هم ستون رسمی است و در پس‌زمینه به گالری می‌پیوندد.
 */

type Step = "drop" | "preview" | "done";

const AI_PROMPT = [
  "من یک فایل اکسل از لیست کالاهای کسب‌وکارم دارم. آن را به قالب زیر تبدیل کن:",
  "ستون‌های خروجی (به همین ترتیب، با همین نام‌های فارسی):",
  "نام کالا | برند | بسته‌بندی | قیمت فروش (تومان) | موجودی | حداقل سفارش | حجم خرید | لینک عکس",
  "قواعد:",
  "۱) نام کالا را کوتاه و استاندارد بنویس (مثل: شیر پاستوریزه، ماکارونی) و جزئیات مثل وزن یا اندازه را در ستون «بسته‌بندی» بگذار (مثل: ۷۰۰ گرمی).",
  "۲) برند را دقیقاً همان‌طور که هست بنویس؛ بدون برند، خالی بگذار.",
  "۳) فقط فروشنده‌ام؟ قیمت فروش را پر کن و حجم خرید را خالی بگذار. فقط خریدارم؟ برعکس. هر دو؟ هر دو را پر کن.",
  "۴) قیمت‌ها را عدد تومان بدون جداکننده بنویس.",
  "۵) اگر عکس کالا لینک مستقیم دارد، در ستون «لینک عکس» بگذار؛ وگرنه خالی.",
  "خروجی را به شکل جدول CSV با همان سرستون‌های فارسی بده، بدون توضیح اضافه.",
].join("\n");

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
  const mode: "SELL" | "BUY" = arm === "sell" ? "SELL" : "BUY";

  const [step, setStep] = useState<Step>("drop");
  const [priceUnit, setPriceUnit] = useState<"toman" | "rial">("toman");
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<ImportPreviewDto | null>(null);
  const [savedCount, setSavedCount] = useState(0);
  const [helpOpen, setHelpOpen] = useState(false);
  const [promptCopied, setPromptCopied] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  /** ردیف‌های ثبت‌شدنی — هر ردیف حداقل یک بازو داشته باشد */
  const willSave = preview ? preview.rows.filter((r) => r.arms.length > 0).length : 0;

  const downloadTemplate = () => {
    // CSV با BOM — اکسل فارسی را درست نشان می‌دهد؛ دو بازو در یک فایل
    const rows = [
      ["نام کالا", "برند", "بسته‌بندی", "قیمت فروش", "موجودی", "حداقل سفارش", "حجم خرید", "لینک عکس"],
      ["ماکارونی", "زر", "۷۰۰ گرمی", "55000", "24", "1", "", ""],
      ["شیر پاستوریزه", "میهن", "۱ لیتری", "28000", "30", "6", "", "https://example.com/milk.jpg"],
      ["شکر", "", "کیسه ۵۰ کیلویی", "", "", "", "40", ""],
      ["چای سیاه", "گلستان", "۵۰۰ گرمی", "98000", "12", "1", "25", ""],
    ];
    const csv = "\uFEFF" + rows.map((r) => r.join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "imach-template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const copyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(AI_PROMPT);
      setPromptCopied(true);
      setTimeout(() => setPromptCopied(false), 2000);
    } catch {
      toast({ title: m.importSheet.copyFailed, variant: "destructive" });
    }
  };

  const readFile = async (file: File) => {
    setBusy(true);
    try {
      const res = await productsApi.importPreview({ file, businessId: bizId, mode, priceUnit });
      setPreview(res);
      setStep("preview");
    } catch (err) {
      toast({
        title: m.importSheet.readFileFailed,
        description: err instanceof ApiError ? err.message : undefined,
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  };

  const confirm = async () => {
    if (!preview) return;
    setBusy(true);
    try {
      const res = await productsApi.importCommit({
        businessId: bizId,
        mode,
        rows: preview.rows
          .filter((r) => r.arms.length > 0)
          .map((r) => ({
            index: r.index,
            name: r.name,
            brand: r.brand ?? undefined,
            spec: r.spec ?? undefined,
            priceMinor: r.priceMinor ?? undefined,
            stock: r.stock ?? undefined,
            minOrder: r.minOrder ?? undefined,
            volume: r.volume ?? undefined,
          })),
      });
      setSavedCount(res.saved);
      setStep("done");
    } catch (err) {
      toast({
        title: m.importSheet.readFileFailed,
        description: err instanceof ApiError ? err.message : undefined,
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  };

  const reset = () => {
    setPreview(null);
    setStep("drop");
  };

  const armChip = (arms: ImportPreviewDto["rows"][number]["arms"]) => {
    if (arms.length === 0) return null;
    const sell = arms.includes("SELL");
    const buy = arms.includes("BUY");
    const label = sell && buy ? m.importSheet.armBoth : sell ? m.importSheet.armSell : m.importSheet.armBuy;
    return (
      <span
        className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
          sell && buy
            ? "bg-violet-100 text-violet-700"
            : sell
              ? "bg-emerald-100 text-emerald-700"
              : "bg-sky-100 text-sky-700"
        }`}
      >
        {label}
      </span>
    );
  };

  const badgeOf = (r: ImportPreviewDto["rows"][number]) => {
    if (r.warning === "noData")
      return (
        <span className="flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">
          <TriangleAlert className="size-3" />
          {m.importSheet.warnNoData}
        </span>
      );
    if (r.warning === "noName")
      return (
        <span className="flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">
          <TriangleAlert className="size-3" />
          {m.importSheet.warnNoName}
        </span>
      );
    if (r.matchType === "product")
      return (
        <span className="flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
          <Check className="size-3" />
          {m.importSheet.matchProduct}
        </span>
      );
    if (r.matchType === "good")
      return (
        <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-bold text-sky-700">
          {m.importSheet.matchGood}
        </span>
      );
    return (
      <span className="rounded-full bg-stone-200 px-2 py-0.5 text-[10px] font-bold text-stone-600">
        {m.importSheet.matchNew}
      </span>
    );
  };

  return (
    <div className="rounded-2xl border bg-white shadow-sm">
      <div className="p-6">
        {step === "drop" && (
          <>
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="size-5 text-primary" />
              <h1 className="text-lg font-extrabold">{m.importSheet.title}</h1>
              <button
                type="button"
                aria-label={m.importSheet.helpTitle}
                onClick={() => setHelpOpen(true)}
                className="ms-auto grid size-7 place-items-center rounded-full text-muted-foreground transition hover:bg-accent hover:text-primary"
              >
                <HelpCircle className="size-4" />
              </button>
            </div>
            <p className="mt-3 text-xs leading-6 text-muted-foreground">{m.importSheet.intro}</p>

            <label
              className={`mt-4 grid cursor-pointer place-items-center rounded-2xl border-2 border-dashed border-primary/30 bg-accent/20 px-6 py-10 text-center transition hover:border-primary/60 hover:bg-accent/40 ${
                busy ? "pointer-events-none opacity-60" : ""
              }`}
            >
              <input
                type="file"
                accept=".xlsx,.xls,.csv,.txt"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  e.target.value = "";
                  if (f) void readFile(f);
                }}
              />
              {busy ? (
                <Loader2 className="size-6 animate-spin text-primary" />
              ) : (
                <Upload className="size-6 text-primary" />
              )}
              <p className="mt-2 text-sm font-extrabold">{m.importSheet.choose}</p>
              <p className="mt-1 text-[11px] text-muted-foreground">xlsx · xls · csv</p>
            </label>

            {/* واحد قیمت + قالب نمونه — یک ردیف آرام */}
            <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                {m.importSheet.priceUnit}
                <span className="inline-flex overflow-hidden rounded-full border">
                  {(["toman", "rial"] as const).map((u) => (
                    <button
                      key={u}
                      type="button"
                      onClick={() => setPriceUnit(u)}
                      aria-pressed={priceUnit === u}
                      className={`px-3 py-1 font-bold transition ${
                        priceUnit === u ? "bg-primary text-primary-foreground" : "hover:text-primary"
                      }`}
                    >
                      {u === "toman" ? m.importSheet.toman : m.importSheet.rial}
                    </button>
                  ))}
                </span>
              </div>
              <button type="button" onClick={downloadTemplate} className="font-bold text-primary underline-offset-2 hover:underline">
                {m.importSheet.template}
              </button>
            </div>

            {/* میان‌بر هوش مصنوعی — پرامپت آماده، یک کلیک */}
            <div className="mt-4 rounded-xl border border-primary/20 bg-accent/30 p-3.5">
              <p className="flex items-center gap-1.5 text-xs font-extrabold text-primary">
                <FileSpreadsheet className="size-3.5" />
                {m.importSheet.aiTitle}
              </p>
              <p className="mt-1.5 text-[11px] leading-5 text-muted-foreground">{m.importSheet.aiHint}</p>
              <Button type="button" variant="outline" size="sm" className="mt-2.5" onClick={() => void copyPrompt()}>
                {promptCopied ? <Check className="size-3.5 text-emerald-600" /> : <FileSpreadsheet className="size-3.5" />}
                {promptCopied ? m.importSheet.aiCopied : m.importSheet.aiCopy}
              </Button>
            </div>
          </>
        )}

        {step === "preview" && preview && (
          <>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={reset}
                aria-label="back"
                className="grid size-8 place-items-center rounded-lg text-muted-foreground transition hover:bg-accent hover:text-foreground"
              >
                <X className="size-4" />
              </button>
              <h1 className="text-lg font-extrabold">{m.importSheet.previewTitle}</h1>
            </div>

            {/* خلاصه‌ی وضعیت — چیپ‌های کوچک */}
            <div className="mt-3 flex flex-wrap gap-1.5 text-[11px] font-bold">
              <span className="rounded-full bg-accent px-2.5 py-1">
                {m.importSheet.summaryTotal.replace("{n}", String(preview.summary.total))}
              </span>
              <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-emerald-700">
                {m.importSheet.summaryMatched.replace("{n}", String(preview.summary.matched))}
              </span>
              <span className="rounded-full bg-sky-100 px-2.5 py-1 text-sky-700">
                {m.importSheet.summaryGood.replace("{n}", String(preview.summary.goodLevel))}
              </span>
              <span className="rounded-full bg-stone-200 px-2.5 py-1 text-stone-600">
                {m.importSheet.summaryNew.replace("{n}", String(preview.summary.newGood))}
              </span>
              {preview.summary.withImage > 0 && (
                <span className="flex items-center gap-1 rounded-full bg-accent px-2.5 py-1 text-primary">
                  <ImageIcon className="size-3" />
                  {m.importSheet.summaryImage.replace("{n}", fa(preview.summary.withImage))}
                </span>
              )}
              {preview.summary.willSkip > 0 && (
                <span className="rounded-full bg-amber-100 px-2.5 py-1 text-amber-700">
                  {m.importSheet.summarySkip.replace("{n}", String(preview.summary.willSkip))}
                </span>
              )}
            </div>

            <div className="mt-4 max-h-[45vh] overflow-y-auto rounded-xl border">
              <table className="w-full text-start text-xs">
                <thead className="sticky top-0 bg-accent/60 text-[10px] text-muted-foreground">
                  <tr>
                    <th className="px-2 py-2 text-start">{m.importSheet.colName}</th>
                    <th className="px-2 py-2 text-start">{m.importSheet.colBrand}</th>
                    <th className="px-2 py-2 text-start">{m.importSheet.colSpec}</th>
                    <th className="px-2 py-2 text-start">{m.importSheet.colPrice}</th>
                    <th className="px-2 py-2 text-start">{m.importSheet.colArms}</th>
                    <th className="px-2 py-2 text-start">{m.importSheet.colStatus}</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {preview.rows.map((r) => (
                    <tr key={r.index} className={r.warning ? "bg-amber-50/50" : ""}>
                      <td className="max-w-36 truncate px-2 py-2 font-extrabold">{r.name}</td>
                      <td className="px-2 py-2 text-muted-foreground">{r.brand ?? "—"}</td>
                      <td className="px-2 py-2 text-muted-foreground">{r.spec ?? "—"}</td>
                      <td className="px-2 py-2">{r.priceMinor !== null ? fmtMoney(r.priceMinor, "IRR") : "—"}</td>
                      <td className="px-2 py-2">{armChip(r.arms)}</td>
                      <td className="px-2 py-2">{badgeOf(r)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <Button className="mt-4 w-full" size="lg" onClick={() => void confirm()} disabled={busy || willSave === 0}>
              {busy ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
              {m.importSheet.confirm.replace("{n}", String(willSave))}
            </Button>
          </>
        )}

        {step === "done" && (
          <div className="py-8 text-center">
            <span className="mx-auto grid size-14 place-items-center rounded-full bg-emerald-100 text-emerald-600">
              <Check className="size-7" />
            </span>
            <p className="mt-4 text-lg font-extrabold">
              {m.importSheet.successTitle.replace("{n}", String(savedCount))}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">{m.importSheet.successDesc}</p>
            <div className="mt-5 flex items-center justify-center gap-2">
              <Button variant="outline" onClick={reset}>
                {m.importSheet.again}
              </Button>
              <Button onClick={() => onDone(arm)}>{m.picker.successTitle.replace("{n}", String(savedCount))}</Button>
            </div>
          </div>
        )}

        {/* ───── مدال راهنمای ستون‌ها ───── */}
        {helpOpen && (
          <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4 backdrop-blur-sm" onClick={() => setHelpOpen(false)}>
            <div className="max-h-[80vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between">
                <h2 className="text-base font-extrabold">{m.importSheet.helpTitle}</h2>
                <button
                  type="button"
                  aria-label="بستن"
                  onClick={() => setHelpOpen(false)}
                  className="grid size-7 place-items-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground"
                >
                  <X className="size-4" />
                </button>
              </div>
              <div className="mt-3 space-y-3 text-xs leading-6 text-muted-foreground">
                {m.importSheet.helpRows.map((line, i) => (
                  <p key={i} className="flex gap-2">
                    <span className="mt-0.5 grid size-4 shrink-0 place-items-center rounded-full bg-accent text-[9px] font-black text-primary">
                      {fa(i + 1)}
                    </span>
                    <span dangerouslySetInnerHTML={{ __html: line }} />
                  </p>
                ))}
              </div>
              <div className="mt-4 flex items-center justify-between gap-2">
                <button type="button" onClick={downloadTemplate} className="text-xs font-bold text-primary underline-offset-2 hover:underline">
                  {m.importSheet.template}
                </button>
                <Button size="sm" variant="outline" onClick={() => setHelpOpen(false)}>
                  {m.importSheet.helpOk}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
