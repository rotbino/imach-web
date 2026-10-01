"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { ApiError, type ProductRowDto } from "@/lib/api";
import { productsApi } from "@/lib/api";
import { useBulkSaveListings, useUploadFile } from "@/lib/queries";
import { CURRENCIES, currencyLabel, fa, goodName } from "@/lib/format";
import { useMessages } from "@/i18n/messages/use-messages";
import { useLocale } from "@/i18n/locale-context";
import { NumberInput } from "@/components/number-input";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Camera, CameraOff, Check, ImagePlus, Keyboard, Loader2, ScanLine, TriangleAlert, X } from "lucide-react";

/**
 * ─── ثبت سریع با اسکنر ───────────────────────────────────────────────────────
 *
 * سه مد ورودی، همه به یک گرید:
 *   • دوربین (موبایل/لپ‌تاپ) — BarcodeDetector بومی (اندروید/کروم) و ZXing برای iOS/سافاری
 *   • اسکنر سخت‌افزاری (USB/بلوتوث) — مثل کیبورد تایپ + Enter می‌کنند
 *   • تایپ دستی بارکد
 *
 * بعد از هر اسکن موفق، صدای بوق می‌آید و کالا مستقیم به گرید اضافه می‌شود —
 * بدون مدال نقش. نقش از URL می‌آید (?tab=sell یا ?tab=buy). اگر بارکد
 * پیدا نشد، صدای خطا می‌آید و toast نشان می‌دهد.
 *
 * گرید مثل اکسل: ستون‌های قیمت/موجودی/حداقل سفارش (sell) یا حجم (buy).
 * کاربر بعداً مقادیر را پر می‌کند و یک‌جا تأیید می‌زند.
 */

type Arm = "sell" | "buy";
type GridRow = {
  product: ProductRowDto;
  price: number | null;
  stock: number | null;
  minOrder: number | null;
  volume: number | null;
};

// ستون‌ها: # | حذف | عکس | محصول+برند | قیمت | موجودی | حداقل (sell)
// ستون‌ها: # | حذف | عکس | محصول+برند | حجم | دوره (buy)
// ورودی‌ها عریض‌تر شده‌اند تا عددها زیر قایم نشوند
const GRID_SELL = "28px 32px 44px minmax(160px,1.5fr) minmax(110px,0.8fr) minmax(85px,0.6fr) minmax(85px,0.6fr)";
const GRID_BUY  = "28px 32px 44px minmax(160px,1.5fr) minmax(110px,0.8fr) minmax(90px,0.6fr)";

interface BarcodeDetectorLike {
  detect: (source: HTMLVideoElement) => Promise<{ rawValue: string }[]>;
}
type BarcodeDetectorCtor = new (opts?: { formats?: string[] }) => BarcodeDetectorLike;

/** بوق کوتاه با Web Audio API — نیازی به فایل صوتی نیست */
function beep(type: "success" | "error") {
  try {
    const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    // موفقیت: دو نت صعودی (۸۸۰Hz → ۱۳۲۰Hz)؛ خطا: یک نت پایین (۴۴۰Hz)
    if (type === "success") {
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.setValueAtTime(1320, ctx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.2);
    } else {
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      osc.frequency.setValueAtTime(330, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.3);
    }
    // پاک‌سازی بعد از پایان
    setTimeout(() => ctx.close(), 500);
  } catch {
    /* مرورگر قدیمی یا autoplay policy — بی‌صدا رد شو */
  }
}

export function ScanEntry({
  bizId,
  currency,
  arm,
  onDone,
  onSwitchToForm,
}: {
  bizId: string;
  currency?: string;
  arm: Arm;
  onDone: (kind: Arm) => void;
  onSwitchToForm: () => void;
}) {
  const { toast } = useToast();
  const m = useMessages();
  const { locale } = useLocale();
  const numLocale: "fa" | "en" = locale === "en" ? "en" : "fa";
  const bulk = useBulkSaveListings();

  const curDef = CURRENCIES[currency ?? "IRR"] ?? CURRENCIES.IRR;
  const curName = currencyLabel(currency ?? "IRR", locale);
  const GRID_COLS = arm === "sell" ? GRID_SELL : GRID_BUY;
  const inputCls = "h-8 rounded border-stone-200 bg-stone-50/50 px-2 text-xs hover:border-stone-300 focus:border-primary focus:bg-white";

  // ── دوربین
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cam, setCam] = useState<"starting" | "on" | "off" | "black">("starting");
  const [deviceType, setDeviceType] = useState<"mobile" | "laptop" | "desktop">("laptop");
  const [camRetry, setCamRetry] = useState(0);
  const lastCode = useRef<{ code: string; at: number }>({ code: "", at: 0 });

  useEffect(() => {
    if (typeof window === "undefined") return;
    const ua = navigator.userAgent.toLowerCase();
    const isMobile = /android|iphone|ipad|ipod|mobile|tablet/.test(ua);
    setDeviceType(isMobile ? "mobile" : "laptop");
  }, []);

  // ── صف / گرید
  const [rows, setRows] = useState<GridRow[]>([]);
  const [manual, setManual] = useState("");
  const [busy, setBusy] = useState(false);
  const [dupCount, setDupCount] = useState(0);
  const [savedCount, setSavedCount] = useState(0);
  const [failedCount, setFailedCount] = useState(0);
  // ── عکس‌های آپلودشده برای Product ها (productId → imageUrl) — وقتی کاربر
  // برای کالایی که عکس ندارد عکس آپلود می‌کند، آن عکس روی Product ست می‌شود
  const [productImages, setProductImages] = useState<Record<string, string>>({});
  const [uploadingImageFor, setUploadingImageFor] = useState<string | null>(null);
  const uploadFile = useUploadFile();
  const queryClient = useQueryClient();

  // ── آپلود عکس برای محصول — عکس روی Product.imageUrl ست می‌شود تا همه ببینند
  const onPickProductImage = (productId: string) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      setUploadingImageFor(productId);
      try {
        // آپلود استیج (بدون modelId) — URL برمی‌گردد
        const uploaded = await uploadFile.mutateAsync({
          file,
          model: "Listing",
          key: "gallery",
        });
        // ست کردن عکس روی Product.imageUrl
        await productsApi.setProductImage({ productId, imageUrl: uploaded.url });
        setProductImages((s) => ({ ...s, [productId]: uploaded.url }));
        toast({ title: "عکس ثبت شد" });
      } catch (err) {
        toast({
          title: "آپلود عکس ناموفق بود",
          description: err instanceof ApiError ? err.message : undefined,
          variant: "destructive",
        });
      } finally {
        setUploadingImageFor(null);
      }
    };
    input.click();
  };

  const rowIds = useMemo(() => new Set(rows.map((r) => r.product.id)), [rows]);
  const incompleteCount = useMemo(() => {
    if (arm === "sell") {
      return rows.filter((r) => !(r.price && r.price > 0 && (r.stock ?? 0) >= 0 && r.minOrder && r.minOrder > 0)).length;
    }
    return rows.filter((r) => !(r.volume && r.volume > 0)).length;
  }, [rows, arm]);
  const selectedCount = rows.length - incompleteCount;

  // ── جست‌وجوی بارکد: دقیق (ایندکس) → متنی → ناشناس
  const handleCode = useCallback(
    async (raw: string) => {
      const code = raw.trim().replace(/[\s\u200c]/g, "");
      if (code.length < 4 || code.length > 20) return;
      const now = Date.now();
      if (lastCode.current.code === code && now - lastCode.current.at < 2500) return;
      lastCode.current = { code, at: now };

      setBusy(true);
      try {
        const exact = await productsApi.getProducts({ barcode: code, businessId: bizId, limit: 1 });
        if (exact.items.length > 0) {
          const p = exact.items[0];
          if (rowIds.has(p.id)) {
            // تکراری — صدای خطا و هشدار کوتاه
            beep("error");
            toast({ title: "قبلاً اسکن شده", description: p.label, duration: 1500 });
          } else {
            beep("success");
            setRows((r) => [...r, { product: p, price: null, stock: null, minOrder: null, volume: null }]);
          }
          return;
        }
        const fuzzy = await productsApi.getProducts({ q: code, businessId: bizId, limit: 1 });
        if (fuzzy.items.length === 1) {
          const p = fuzzy.items[0];
          if (rowIds.has(p.id)) {
            beep("error");
            toast({ title: "قبلاً اسکن شده", description: p.label, duration: 1500 });
          } else {
            beep("success");
            setRows((r) => [...r, { product: p, price: null, stock: null, minOrder: null, volume: null }]);
          }
          return;
        }
        // پیدا نشد
        beep("error");
        toast({ title: m.scan.notFound, description: `${code} — ${m.scan.notFoundHint}`, variant: "destructive" });
      } catch (err) {
        beep("error");
        toast({
          title: m.scan.lookupFailed,
          description: err instanceof ApiError ? err.message : undefined,
          variant: "destructive",
        });
      } finally {
        setBusy(false);
      }
    },
    [bizId, m, toast, rowIds]
  );

  // ── حلقه‌ی دوربین
  useEffect(() => {
    let stopped = false;
    let interval: ReturnType<typeof setInterval> | null = null;
    let blackTimer: ReturnType<typeof setTimeout> | null = null;
    setCam("starting");

    const start = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
          audio: false,
        });
        if (stopped) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        const videoTracks = stream.getVideoTracks();
        if (videoTracks.length === 0) {
          if (!stopped) setCam("off");
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        streamRef.current = stream;
        const video = videoRef.current;
        if (!video) return;
        video.srcObject = stream;
        await video.play().catch(() => undefined);

        blackTimer = setTimeout(() => {
          if (stopped) return;
          if (video.readyState < 2 || video.videoWidth === 0) {
            setCam("black");
            stream.getTracks().forEach((t) => t.stop());
            if (interval) clearInterval(interval);
          }
        }, 3000);

        const Ctor = (window as unknown as { BarcodeDetector?: BarcodeDetectorCtor }).BarcodeDetector;
        if (Ctor) {
          const detector = new Ctor({
            formats: ["ean_13", "ean_8", "code_128", "code_39", "upc_a", "upc_e", "itf", "qr_code"],
          });
          interval = setInterval(async () => {
            if (stopped || video.readyState < 2) return;
            try {
              const found = await detector.detect(video);
              if (found.length > 0 && found[0].rawValue) void handleCode(found[0].rawValue);
            } catch {
              /* a missed frame is fine */
            }
          }, 350);
          setCam("on");
        } else {
          const { BrowserMultiFormatReader } = await import("@zxing/library");
          const reader = new BrowserMultiFormatReader();
          await reader.decodeFromStream(stream, video, (result) => {
            if (result && !stopped) void handleCode(result.getText());
          });
          if (!stopped) setCam("on");
        }
      } catch {
        if (!stopped) setCam("off");
      }
    };
    void start();

    return () => {
      stopped = true;
      if (interval) clearInterval(interval);
      if (blackTimer) clearTimeout(blackTimer);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, [handleCode, camRetry]);

  // ── به‌روزرسانی ردیف
  const updateRow = (id: string, patch: Partial<GridRow>) =>
    setRows((r) => r.map((row) => (row.product.id === id ? { ...row, ...patch } : row)));

  const removeRow = (id: string) => setRows((r) => r.filter((row) => row.product.id !== id));

  const reset = () => {
    setRows([]);
    setDupCount(0);
    setSavedCount(0);
    setFailedCount(0);
    lastCode.current = { code: "", at: 0 };
  };

  // ── ثبت نهایی — مثل اکسل، همه‌ی ردیف‌های کامل را یک‌جا بفرست
  const confirm = async () => {
    if (rows.length === 0) return;
    setBusy(true);
    let saved = 0;
    let failed = 0;
    try {
      const items = rows.map((r) => ({
        productId: r.product.id,
        ...(arm === "sell"
          ? {
              priceMinor: r.price ? Math.round(r.price * 10 ** curDef.exp) : undefined,
              stock: r.stock ?? undefined,
              minOrder: r.minOrder ?? undefined,
            }
          : { volume: r.volume ?? undefined }),
      }));
      const res = await bulk.mutateAsync({
        businessId: bizId,
        mode: arm === "sell" ? "SELL" : "BUY",
        items,
      });
      saved = res.saved;
      failed = res.failed;
      setSavedCount(saved);
      setFailedCount(failed);
      if (saved > 0) {
        toast({ title: m.scan.saved.replace("{n}", fa(saved)) });
      }
      if (failed > 0) {
        toast({ title: m.scan.failedSome.replace("{n}", fa(failed)), variant: "destructive" });
      }
      setTimeout(() => onDone(arm), 1500);
    } catch (err) {
      toast({
        title: m.scan.lookupFailed,
        description: err instanceof ApiError ? err.message : undefined,
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-2xl border bg-white shadow-sm">
      <div className="p-6">
        <div className="flex items-center gap-2">
          <ScanLine className="size-5 text-primary" />
          <h1 className="text-lg font-extrabold">{m.scan.title}</h1>
          <span className="hidden rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold text-primary sm:inline">
            {arm === "sell" ? "کاتالوگ فروش" : "دستیار خرید"}
          </span>
        </div>
        <p className="mt-2 text-xs leading-6 text-muted-foreground">{m.scan.intro}</p>

        {/* ───── دوربین ───── */}
        <div className="relative mt-4 aspect-[4/3] overflow-hidden rounded-2xl border bg-stone-900 sm:aspect-[16/9]">
          <video ref={videoRef} muted playsInline className={`size-full object-cover ${cam === "on" ? "" : "opacity-0"}`} />
          {cam === "on" && (
            <>
              <div className="pointer-events-none absolute inset-x-8 top-1/2 h-0.5 -translate-y-1/2 rounded-full bg-emerald-400/70" />
              <span className="absolute bottom-2 end-2 rounded-full bg-black/50 px-2 py-0.5 text-[10px] font-bold text-white">
                <Camera className="me-1 inline size-3" />
                {m.scan.camOn}
              </span>
            </>
          )}
          {cam === "starting" && (
            <div className="absolute inset-0 grid place-items-center p-6 text-center">
              <p className="text-xs text-stone-300">{m.scan.camStarting}</p>
            </div>
          )}
          {cam === "off" && (
            <div className="absolute inset-0 grid place-items-center p-6 text-center">
              <div className="max-w-xs">
                <CameraOff className="mx-auto size-6 text-stone-400" />
                <p className="mt-2 text-xs leading-5 text-stone-300">
                  {deviceType === "mobile" ? m.scan.camHintMobile : m.scan.camHintNoCamera}
                </p>
                <button
                  type="button"
                  onClick={() => setCamRetry((c) => c + 1)}
                  className="mt-3 rounded-lg border border-stone-500 px-3 py-1.5 text-xs font-bold text-stone-200 hover:bg-stone-800"
                >
                  {m.scan.camTryAgain}
                </button>
              </div>
            </div>
          )}
          {cam === "black" && (
            <div className="absolute inset-0 grid place-items-center p-6 text-center">
              <div className="max-w-xs">
                <CameraOff className="mx-auto size-6 text-amber-400" />
                <p className="mt-2 text-xs font-bold leading-5 text-amber-200">{m.scan.camBlackTitle}</p>
                <p className="mt-1 text-[11px] leading-5 text-stone-300">{m.scan.camBlackHint}</p>
                <button
                  type="button"
                  onClick={() => setCamRetry((c) => c + 1)}
                  className="mt-3 rounded-lg border border-stone-500 px-3 py-1.5 text-xs font-bold text-stone-200 hover:bg-stone-800"
                >
                  {m.scan.camTryAgain}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ───── فیلد بارکد — اسکنر سخت‌افزاری و تایپ دستی ───── */}
        <div className="mt-3 flex items-center gap-2">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent/60 text-primary">
            <Keyboard className="size-4" />
          </span>
          <Input
            aria-label={m.scan.manualAria}
            placeholder={m.scan.manualPlaceholder}
            value={manual}
            inputMode="text"
            autoComplete="off"
            onChange={(e) => setManual(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && manual.trim()) {
                e.preventDefault();
                const code = manual;
                setManual("");
                void handleCode(code);
              }
            }}
            className="h-11 text-base"
            dir="ltr"
          />
          <Button
            type="button"
            size="sm"
            className="h-11"
            onClick={() => {
              if (manual.trim()) {
                const code = manual;
                setManual("");
                void handleCode(code);
              }
            }}
            disabled={busy}
          >
            {busy ? <span className="size-4 animate-spin rounded-full border-2 border-white/40 border-t-white" /> : <ScanLine className="size-4" />}
            {m.scan.lookup}
          </Button>
        </div>

        {/* ───── گرید اسکن‌شده‌ها — مثل اکسل ───── */}
        {rows.length > 0 && (
          <>
            {/* خلاصه */}
            <div className="mt-5 flex flex-wrap items-center gap-2 border-b pb-2">
              <span className="rounded-full bg-accent px-3 py-1 text-xs font-bold">{fa(rows.length)} کالا</span>
              <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">{fa(selectedCount)} کامل</span>
              {incompleteCount > 0 && <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-bold text-red-700">{fa(incompleteCount)} ناقص</span>}
            </div>

            {/* جدول */}
            <div className="mt-2 overflow-auto" style={{ maxHeight: "400px" }}>
              {/* سرستون */}
              <div style={{ display: "grid", gridTemplateColumns: GRID_COLS, position: "sticky", top: 0, zIndex: 10 }} className="border-b bg-stone-100 text-[10px] font-bold text-stone-500">
                <div className="px-1 py-2.5 text-center">#</div>
                <div className="px-1 py-2.5" />
                <div className="px-1 py-2.5 text-center">عکس</div>
                <div className="px-2 py-2.5">محصول · برند</div>
                {arm === "sell" ? (
                  <>
                    <div className="px-2 py-2.5 text-center">قیمت ({curName})</div>
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
              {rows.map((r, i) => {
                const p = r.product;
                const isComplete = arm === "sell"
                  ? !!(r.price && r.price > 0 && (r.stock ?? 0) >= 0 && r.minOrder && r.minOrder > 0)
                  : !!(r.volume && r.volume > 0);
                const imgUrl = productImages[p.id] ?? p.imageUrl;
                const isUploading = uploadingImageFor === p.id;
                // عنوان نمایشی: اگر برند دارد → «نوع کالا · برند»؛ وگرنه فقط نوع کالا
                const displayTitle = p.brand
                  ? `${goodName(p.good, locale)} · ${p.brand.name}`
                  : goodName(p.good, locale);
                return (
                  <div
                    key={p.id}
                    style={{ display: "grid", gridTemplateColumns: GRID_COLS }}
                    className={`border-b text-xs transition ${isComplete ? "bg-emerald-50/30" : "bg-red-50/20"}`}
                  >
                    <div className="grid place-items-center px-1 py-2 text-[10px] font-bold text-stone-400">{fa(i + 1)}</div>
                    <div className="grid place-items-center px-1 py-2">
                      <button
                        type="button"
                        onClick={() => removeRow(p.id)}
                        className="grid size-5 place-items-center rounded text-stone-400 hover:bg-red-100 hover:text-red-600"
                        aria-label="حذف"
                      >
                        <X className="size-3.5" />
                      </button>
                    </div>
                    {/* عکس محصول — اگر دارد نشان بده، اگر ندارد دکمه آپلود */}
                    <div className="grid place-items-center px-1 py-1.5">
                      <button
                        type="button"
                        onClick={() => !imgUrl && !isUploading && onPickProductImage(p.id)}
                        disabled={!!imgUrl || isUploading}
                        aria-label={imgUrl ? "" : "افزودن عکس"}
                        className={`grid size-9 shrink-0 place-items-center overflow-hidden rounded-lg transition ${
                          imgUrl
                            ? "bg-accent/70"
                            : "border-2 border-dashed border-primary/40 hover:border-primary hover:bg-accent/40"
                        }`}
                      >
                        {isUploading ? (
                          <Loader2 className="size-3.5 animate-spin text-primary" />
                        ) : imgUrl ? (
                          <Image src={imgUrl} alt="" width={36} height={36} unoptimized className="size-full object-cover" />
                        ) : (
                          <ImagePlus className="size-3.5 text-primary/60" />
                        )}
                      </button>
                    </div>
                    {/* محصول · برند — عنوان ترکیبی */}
                    <div className="min-w-0 px-2 py-2">
                      <p className="truncate text-xs font-bold">{displayTitle}</p>
                      <p className="truncate text-[10px] text-muted-foreground">{p.label}</p>
                    </div>
                    {arm === "sell" ? (
                      <>
                        <div className="px-1 py-1.5">
                          <NumberInput
                            value={r.price}
                            onChange={(v) => updateRow(p.id, { price: v })}
                            locale={numLocale}
                            min={0}
                            suffix={curName}
                            placeholder="—"
                            className={inputCls}
                            aria-label="قیمت"
                          />
                        </div>
                        <div className="px-1 py-1.5">
                          <NumberInput
                            value={r.stock}
                            onChange={(v) => updateRow(p.id, { stock: v })}
                            locale={numLocale}
                            min={0}
                            placeholder="—"
                            className={inputCls}
                            aria-label="موجودی"
                          />
                        </div>
                        <div className="px-1 py-1.5">
                          <NumberInput
                            value={r.minOrder}
                            onChange={(v) => updateRow(p.id, { minOrder: v })}
                            locale={numLocale}
                            min={0}
                            placeholder="—"
                            className={inputCls}
                            aria-label="حداقل سفارش"
                          />
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="px-1 py-1.5">
                          <NumberInput
                            value={r.volume}
                            onChange={(v) => updateRow(p.id, { volume: v })}
                            locale={numLocale}
                            min={0}
                            placeholder="—"
                            className={inputCls}
                            aria-label="حجم خرید"
                          />
                        </div>
                        <div className="grid place-items-center px-1 py-2 text-[10px] text-muted-foreground">ماهیانه</div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>

            {/* دکمه‌های ثبت */}
            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              <Button
                className="sm:flex-1"
                onClick={() => void confirm()}
                disabled={busy || bulk.isPending || selectedCount === 0}
              >
                {busy || bulk.isPending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Check className="size-4" />
                )}
                ثبت {fa(selectedCount)} کالا
              </Button>
              <Button variant="outline" onClick={reset} disabled={busy || bulk.isPending}>
                <X className="size-4" />
                پاک کردن همه
              </Button>
            </div>
            {incompleteCount > 0 && (
              <p className="mt-2 text-center text-[11px] leading-5 text-muted-foreground">
                {fa(incompleteCount)} کالا ناقص است — مقادیرشان را پر کن یا حذفشان کن
              </p>
            )}
          </>
        )}

        {/* درِ خروج به فرم دستی — بارکد ناشناس بن‌بست نیست */}
        <p className="mt-4 text-center text-[11px] leading-5 text-muted-foreground">
          {m.scan.notHere}{" "}
          <button type="button" onClick={onSwitchToForm} className="font-bold text-primary underline-offset-2 hover:underline">
            {m.picker.switchToForm}
          </button>
        </p>
      </div>
    </div>
  );
}
