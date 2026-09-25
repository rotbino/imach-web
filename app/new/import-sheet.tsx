"use client";

import { useRef, useState } from "react";
import { ApiError, type ImportPreviewDto } from "@/lib/api";
import { productsApi } from "@/lib/api";
import { fmtMoney } from "@/lib/format";
import { useMessages } from "@/i18n/messages/use-messages";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Check, FileSpreadsheet, Loader2, TriangleAlert, Upload, X } from "lucide-react";

/**
 * ─── وارد کردن گروهی از فایل ─────────────────────────────────────────────────
 * سه قاعده‌ی ظرافت (خواسته‌ی کاربر: هنرمندانه و ظریف، بدون شکستن سادگی):
 *  ۱. هیچ فرم جدیدی نیست — همان فایلی که فروشنده از قبل دارد خوانده می‌شود؛
 *     سرستون با مترادف‌های فارسی/انگلیسی شناسایی می‌شود.
 *  ۲. هیچ‌چیز بی‌اجازه نوشته نمی‌شود — پیش‌نمایش نشان می‌دهد هر ردیف دقیقاً
 *     با کدام SKU هم‌خوان است، چه چیزی ساخته می‌شود و چه چیزی رد می‌شود.
 *  ۳. ردیفِ ناشناخته بن‌بست نیست — با یک خطای واضح کنار گذاشته می‌شود تا با
 *     فرم آزاد اضافه شود و برای ایمپورت بعدی همان‌جا بنشیند.
 */

type Step = "drop" | "preview" | "done";

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
  const fileRef = useRef<HTMLInputElement>(null);

  const willSave = preview
    ? preview.rows.filter((r) => r.goodId && !(mode === "SELL" && r.warning === "noPrice")).length
    : 0;

  const downloadTemplate = () => {
    // CSV با BOM — اکسل فارسی را درست نشان می‌دهد
    const rows = [
      ["نام کالا", "برند", "بسته‌بندی", "قیمت", "موجودی", "حداقل سفارش"],
      ["ماکارونی", "زر", "۷۰۰ گرمی", "55000", "24", "1"],
      ["شیر پاستوریزه", "میهن", "۱ لیتری", "28000", "30", "6"],
    ];
    const csv = "\uFEFF" + rows.map((r) => r.join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "imach-template.csv";
    a.click();
    URL.revokeObjectURL(url);
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
          .filter((r) => r.goodId && !(mode === "SELL" && r.warning === "noPrice"))
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

  const badgeOf = (r: ImportPreviewDto["rows"][number]) => {
    if (r.warning === "noPrice")
      return (
        <span className="flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">
          <TriangleAlert className="size-3" />
          {m.importSheet.warnNoPrice}
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
              <span className="hidden rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold text-primary sm:inline">
                {m.importSheet.tabHint}
              </span>
            </div>
            <p className="mt-3 text-xs leading-6 text-muted-foreground">{m.importSheet.intro}</p>

            <label
              className={`mt-4 grid cursor-pointer place-items-center rounded-2xl border-2 border-dashed border-primary/30 bg-accent/20 px-6 py-10 text-center transition hover:border-primary/60 hover:bg-accent/40 ${
                busy ? "pointer-events-none opacity-60" : ""
              }`}
            >
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
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

            {/* واحد قیمت + قالب نمونه — یک ردیف آرام، بدون سر و صدا */}
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

            {/* خلاصه‌ی وضعیت — چهار چیپ کوچک */}
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
      </div>
    </div>
  );
}
