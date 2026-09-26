"use client";

import { useEffect, useRef, useState } from "react";
import { ApiError, goodsApi, productsApi, type CatalogReferenceDto, type ImportPreviewDto } from "@/lib/api";
import { fa, fmtMoney } from "@/lib/format";
import { useMessages } from "@/i18n/messages/use-messages";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Check, ChevronDown, FileSpreadsheet, HelpCircle, Image as ImageIcon, Loader2, Sparkles, TriangleAlert, Upload, X } from "lucide-react";

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
 * میان‌بر هوش مصنوعی (خواسته‌ی کاربر): پرامپت فارسیِ آماده که شامل JSON مرجع
 * کاتالوگ (گودها + برندها + دسته‌ها) هم هست. کاربر پرامپت را کپی می‌کند، به
 * AI می‌دهد و خروجی را در قالب ما می‌گیرد — «۱۰۰۰ کالا در چند دقیقه».
 */

type Step = "drop" | "preview" | "done";

/**
 * ساخت پرامپت کامل هوش مصنوعی — شامل JSON مرجع کاتالوگ.
 * پرامپت به AI می‌گوید: نام کالا را به نزدیک‌ترین گود موجود تطبیق بده.
 * اگر گود نبود، نام استاندارد بنویس تا ادمین بعداً باغبانی کند.
 */
function buildAiPrompt(ref: CatalogReferenceDto): string {
  const lines: string[] = [
    "تو دستیار وارد کردن کالا برای پلتفرم عمده‌فروشی iMach هستی.",
    "کاربر فایل کالاهایش را می‌دهد و تو باید آن را به قالب زیر تبدیل کنی.",
    "",
    "ستون‌های خروجی (به همین ترتیب، با همین نام‌های فارسی):",
    "نام کالا | برند | بسته‌بندی | قیمت فروش (تومان) | موجودی | حداقل سفارش | حجم خرید | لینک عکس",
    "",
    "قواعد:",
    "۱) «نام کالا» را کوتاه و استاندارد بنویس (مثل: شیر پاستوریزه، ماکارونی) و جزئیات مثل وزن یا اندازه را در ستون «بسته‌بندی» بگذار (مثل: ۷۰۰ گرمی).",
    "۲) «نام کالا» حتماً از لیست گودهای موجود زیر انتخاب شود. اگر دقیقاً مطابق نیست، به نزدیک‌ترین گود تطبیق بده. اگر هیچ گود مناسبی نیست، نام استاندارد و کوتاه بنویس (سیستم خودکار آن را ثبت می‌کند).",
    "۳) «برند» را از لیست برندهای موجود زیر انتخاب کن. اگر برند در لیست نیست، همان‌طور که هست بنویس؛ بدون برند، خالی بگذار.",
    "۴) فقط فروشنده‌ای؟ «قیمت فروش» را پر کن و «حجم خرید» را خالی بگذار. فقط خریداری؟ برعکس. هر دو؟ هر دو را پر کن.",
    "۵) قیمت‌ها را عدد تومان بدون جداکننده بنویس.",
    "۶) اگر عکس کالا لینک مستقیم دارد، در ستون «لینک عکس» بگذار؛ وگرنه خالی.",
    "۷) ترتیب ستون‌ها مهم نیست و ستون‌های اضافه نادیده گرفته می‌شوند — حتی اگر سرستون نداشته باشد، ستون‌ها را حدس بزن.",
    "",
    "خروجی را به شکل جدول CSV با همان سرستون‌های فارسی بده، بدون توضیح اضافه.",
    "اگر فایل کاربر فرمت عجیبی دارد (مثلاً PDF یا عکس از قفسه مغازه)، تلاش کن کالاها را استخراج کنی و در همین قالب بدهی.",
    "",
    "═══ لیست گودها و دسته‌بندی‌های موجود (JSON) ═══",
    "این لیست گودهای موجود در سیستم iMach است. «نام کالا» در خروجی باید به این گودها تطبیق بخورد:",
    "",
    JSON.stringify(ref, null, 2),
    "",
    "═══ پایان لیست ═══",
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
  const mode: "SELL" | "BUY" = arm === "sell" ? "SELL" : "BUY";

  const [step, setStep] = useState<Step>("drop");
  const [priceUnit, setPriceUnit] = useState<"toman" | "rial">("toman");
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<ImportPreviewDto | null>(null);
  const [savedCount, setSavedCount] = useState(0);
  const [helpOpen, setHelpOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [aiPrompt, setAiPrompt] = useState<string>("");
  const [aiLoading, setAiLoading] = useState(false);
  const [promptCopied, setPromptCopied] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // وقتی کاربر بخش AI را باز کرد، پرامپت را از سرور بگیر و بساز
  const loadAiPrompt = async () => {
    if (aiPrompt) return; // قبلاً ساخته شده
    setAiLoading(true);
    try {
      const ref = await goodsApi.getCatalogReference();
      setAiPrompt(buildAiPrompt(ref));
    } catch {
      // fallback: پرامپت بدون JSON
      setAiPrompt(buildAiPrompt({ categories: [], brands: [], totalGoods: 0, totalBrands: 0 }));
    } finally {
      setAiLoading(false);
    }
  };

  useEffect(() => {
    if (aiOpen && !aiPrompt) {
      void loadAiPrompt();
    }
  }, [aiOpen]);

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
    if (!aiPrompt) return;
    try {
      await navigator.clipboard.writeText(aiPrompt);
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
            <p className="mt-3 text-sm leading-7 text-muted-foreground">
              فایل اکسل یا CSV کالاهایت را اینجا بگذار. فرمت‌های دیگر هم خوانده می‌شوند و ستون‌ها خودکار تشخیص داده می‌شوند. اول پیش‌نمایش می‌بینی، بعد با تأیید خودت ثبت می‌شود.
            </p>

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

            {/* ─── ساخت اکسل نمونه با هوش مصنوعی (collapsible) ─── */}
            <div className="mt-4 overflow-hidden rounded-xl border border-primary/20">
              {/* تایتل — همیشه دیده می‌شود */}
              <button
                type="button"
                onClick={() => setAiOpen((v) => !v)}
                className="flex w-full items-center gap-2 bg-accent/30 px-3.5 py-3 text-start transition hover:bg-accent/50"
                aria-expanded={aiOpen}
              >
                <Sparkles className="size-4 shrink-0 text-primary" />
                <span className="text-xs font-extrabold text-primary">ساخت اکسل نمونه با هوش مصنوعی</span>
                <ChevronDown className={`ms-auto size-4 shrink-0 text-muted-foreground transition ${aiOpen ? "rotate-180" : ""}`} />
              </button>

              {/* محتوا — وقتی باز شد */}
              {aiOpen && (
                <div className="space-y-3 p-3.5">
                  <p className="text-[11px] leading-6 text-muted-foreground">
                    پرامپت زیر را کپی کن و به یکی از هوش‌های مصنوعی همراه با فایل کالاهایت بده. این پرامپت شامل لیست کامل گودها، برندها و دسته‌بندی‌های موجود در iMach است تا هوش مصنوعی اکسل بسیار دقیقی برایت بسازد.
                    هزار کالا را در چند دقیقه در این قالب تحویل می‌گیری. بعد فایل خروجی را همین‌جا آپلود کن.
                  </p>

                  {/* پرامپت در یک کادر readonly با ارتفاع ۵۰۰px */}
                  {aiLoading ? (
                    <div className="grid h-[500px] place-items-center rounded-lg border bg-muted/30">
                      <Loader2 className="size-5 animate-spin text-primary" />
                      <p className="mt-2 text-xs text-muted-foreground">در حال بارگیری لیست گودها…</p>
                    </div>
                  ) : (
                    <textarea
                      readOnly
                      value={aiPrompt}
                      className="h-[500px] w-full resize-none rounded-lg border bg-muted/20 p-3 font-mono text-[11px] leading-5 text-foreground/80"
                      dir="rtl"
                      onFocus={(e) => e.target.select()}
                    />
                  )}

                  {/* دکمه‌های کپی + لینک‌های AI */}
                  <div className="flex flex-wrap items-center gap-2">
                    <Button type="button" variant="outline" size="sm" onClick={() => void copyPrompt()} disabled={!aiPrompt}>
                      {promptCopied ? <Check className="size-3.5 text-emerald-600" /> : <FileSpreadsheet className="size-3.5" />}
                      {promptCopied ? m.importSheet.aiCopied : m.importSheet.aiCopy}
                    </Button>
                    <span className="text-[11px] text-muted-foreground">{m.importSheet.aiLinksTitle}</span>
                    <a href="https://chatgpt.com" target="_blank" rel="noopener noreferrer" className="rounded-lg border bg-white px-2.5 py-1 text-[11px] font-bold text-primary hover:bg-accent">
                      ChatGPT
                    </a>
                    <a href="https://claude.ai" target="_blank" rel="noopener noreferrer" className="rounded-lg border bg-white px-2.5 py-1 text-[11px] font-bold text-primary hover:bg-accent">
                      Claude
                    </a>
                    <a href="https://gemini.google.com" target="_blank" rel="noopener noreferrer" className="rounded-lg border bg-white px-2.5 py-1 text-[11px] font-bold text-primary hover:bg-accent">
                      Gemini
                    </a>
                  </div>
                </div>
              )}
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
