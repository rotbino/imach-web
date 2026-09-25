"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ApiError, type ProductRowDto } from "@/lib/api";
import { productsApi } from "@/lib/api";
import { useBulkSaveListings } from "@/lib/queries";
import { CURRENCIES, currencyLabel, fa, goodName } from "@/lib/format";
import { useMessages } from "@/i18n/messages/use-messages";
import { useLocale } from "@/i18n/locale-context";
import { NumberInput } from "@/components/number-input";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Camera, CameraOff, Check, Keyboard, ScanLine, TriangleAlert, X } from "lucide-react";

/**
 * ─── ثبت سریع با اسکنر ───────────────────────────────────────────────────────
 * (خواسته‌ی کاربر: «ثبت با اسکنر از کالاهای بارکددار سرچ هوشمند می‌کند و
 * کاربر فقط قیمت و حداقل را می‌دهد — کالاهای کامل بالا، بقیه در «نیاز به
 * تکمیل قیمت» پایین؛ برای خرید هم همینطور»)
 *
 * سه مد ورودی، همه به یک صف:
 *   • دوربین موبایل — BarcodeDetector بومی (اندروید/کروم) و ZXing برای
 *     iOS/سافاری؛ بارکد GTIN همان کلیدِ دقیقِ لیست مرجع است (ایندکس‌هیت).
 *   • اسکنر سخت‌افزاری (USB/بلوتوث) — اسکنرهای کیبورد-ویج همه مدل‌ها فقط
 *     «تایپ + Enter» می‌کنند؛ فیلد بارکدِ همیشه‌روشن دقیقاً همان را می‌خواند
 *     (پاسخ به «اگر کدنویسیش برای همه مدل‌ها جواب می‌دهد بزن» — جواب می‌دهد).
 *   • تایپ دستی بارکد — همان فیلد.
 *
 * بعد از هر اسکن یک مدال ساده نقش کالا را می‌پرسد (خرید/فروش/هر دو)؛ انتخابِ
 * آخر به‌عنوان پیش‌فرض می‌ماند و با تیک «دیگر نپرس» اسکن‌های بعدی بی‌صدا
 * با همان نقش به صف می‌روند.
 */

type Arm = "sell" | "buy" | "both";
type QueueItem = {
  product: ProductRowDto;
  arm: Arm;
  price: number | null;
  stock: number | null;
  minOrder: number | null;
  volume: number | null;
};

const PREF_KEY = "imach.scanArm";
type ScanPref = { lastArm: Arm; ask: boolean };

function loadPref(): ScanPref {
  try {
    const raw = localStorage.getItem(PREF_KEY);
    if (!raw) return { lastArm: "sell", ask: true };
    const p = JSON.parse(raw) as Partial<ScanPref>;
    return { lastArm: p.lastArm === "buy" ? "buy" : p.lastArm === "both" ? "both" : "sell", ask: p.ask !== false };
  } catch {
    return { lastArm: "sell", ask: true };
  }
}

function savePref(p: ScanPref): void {
  try {
    localStorage.setItem(PREF_KEY, JSON.stringify(p));
  } catch {
    /* private mode — the default just does not persist */
  }
}

/** what makes a row «آماده‌ی ثبت» per arm — sell needs price+min order, buy needs volume */
function isComplete(item: QueueItem): boolean {
  if (item.arm === "buy") return (item.volume ?? 0) > 0;
  if ((item.price ?? 0) <= 0 || (item.minOrder ?? 0) <= 0) return false;
  return true;
}

interface BarcodeDetectorLike {
  detect: (source: HTMLVideoElement) => Promise<{ rawValue: string }[]>;
}
type BarcodeDetectorCtor = new (opts?: { formats?: string[] }) => BarcodeDetectorLike;

export function ScanEntry({
  bizId,
  currency,
  onDone,
  onSwitchToForm,
}: {
  bizId: string;
  currency?: string;
  onDone: (kind: "sell" | "buy") => void;
  /** بارکد ناشناس — به فرم دستی می‌رود تا کالا ساخته شود */
  onSwitchToForm: () => void;
}) {
  const { toast } = useToast();
  const m = useMessages();
  const { locale } = useLocale();
  const numLocale: "fa" | "en" = locale === "en" ? "en" : "fa";
  const bulk = useBulkSaveListings();

  const curDef = CURRENCIES[currency ?? "IRR"] ?? CURRENCIES.IRR;
  const curName = currencyLabel(currency ?? "IRR", locale);

  // ── دوربین
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cam, setCam] = useState<"starting" | "on" | "off">("starting");
  const lastCode = useRef<{ code: string; at: number }>({ code: "", at: 0 });

  // ── صف + مدال نقش + کاندیدها
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [armAsk, setArmAsk] = useState<ProductRowDto | null>(null);
  const [candidates, setCandidates] = useState<ProductRowDto[] | null>(null);
  const [manual, setManual] = useState("");
  const [busy, setBusy] = useState(false);
  const [remember, setRemember] = useState(false);
  const prefRef = useRef<ScanPref>(loadPref());

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
          setArmAsk(exact.items[0]);
          return;
        }
        const fuzzy = await productsApi.getProducts({ q: code, businessId: bizId, limit: 8 });
        if (fuzzy.items.length === 1) {
          setArmAsk(fuzzy.items[0]);
        } else if (fuzzy.items.length > 1) {
          setCandidates(fuzzy.items);
        } else {
          toast({ title: m.scan.notFound, description: m.scan.notFoundHint, variant: "destructive" });
        }
      } catch (err) {
        toast({
          title: m.scan.lookupFailed,
          description: err instanceof ApiError ? err.message : undefined,
          variant: "destructive",
        });
      } finally {
        setBusy(false);
      }
    },
    [bizId, m, toast]
  );

  // ── حلقه‌ی دوربین — بومی اگر بود، وگرنه ZXing (سافاری/iOS)
  useEffect(() => {
    let stopped = false;
    let interval: ReturnType<typeof setInterval> | null = null;

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
        streamRef.current = stream;
        const video = videoRef.current;
        if (!video) return;
        video.srcObject = stream;
        await video.play().catch(() => undefined);

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
          // سافاری/iOS — ZXing روی همان استریم
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
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, [handleCode]);

  // ── صف
  const pushToQueue = (product: ProductRowDto, arm: Arm) => {
    setQueue((q) =>
      q.some((i) => i.product.id === product.id)
        ? q
        : [...q, { product, arm, price: null, stock: null, minOrder: null, volume: null }]
    );
  };

  const chooseArm = (arm: Arm) => {
    if (!armAsk) return;
    prefRef.current = { lastArm: arm, ask: remember ? false : prefRef.current.ask };
    savePref(prefRef.current);
    pushToQueue(armAsk, arm);
    setArmAsk(null);
    setRemember(false);
  };

  const patchItem = (id: string, patch: Partial<QueueItem>) =>
    setQueue((q) => q.map((i) => (i.product.id === id ? { ...i, ...patch } : i)));

  const removeItem = (id: string) => setQueue((q) => q.filter((i) => i.product.id !== id));

  const complete = useMemo(() => queue.filter(isComplete), [queue]);
  const pending = useMemo(() => queue.filter((i) => !isComplete(i)), [queue]);

  const submit = async () => {
    type BulkItem = { productId: string; priceMinor?: number; stock?: number; minOrder?: number; volume?: number };
    const groups: { mode: "SELL" | "BUY" | "BOTH"; items: BulkItem[] }[] = [];
    const byArm = (arm: Arm) => queue.filter((i) => i.arm === arm);
    for (const arm of ["sell", "buy", "both"] as Arm[]) {
      const group = byArm(arm);
      if (group.length === 0) continue;
      groups.push({
        mode: arm === "sell" ? "SELL" : arm === "buy" ? "BUY" : "BOTH",
        items: group.map((i) => ({
          productId: i.product.id,
          ...(arm !== "buy"
            ? {
                priceMinor: i.price ? Math.round(i.price * 10 ** curDef.exp) : undefined,
                stock: i.stock ?? undefined,
                minOrder: i.minOrder ?? undefined,
              }
            : {}),
          ...(arm !== "sell" ? { volume: i.volume ?? undefined } : {}),
        })),
      });
    }
    setBusy(true);
    let saved = 0;
    let failed = 0;
    try {
      for (const g of groups) {
        const res = await bulk.mutateAsync({ businessId: bizId, mode: g.mode, items: g.items });
        saved += res.saved;
        failed += res.failed;
      }
      if (saved > 0) toast({ title: m.scan.saved.replace("{n}", fa(saved)), description: m.scan.savedHint });
      if (failed > 0) toast({ title: m.scan.failedSome.replace("{n}", fa(failed)), variant: "destructive" });
      setQueue([]);
      lastCode.current = { code: "", at: 0 };
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

  const rowOf = (item: QueueItem) => {
    const p = item.product;
    return (
      <div key={p.id} className="animate-fade-up rounded-xl border p-3">
        <div className="flex items-center gap-2.5">
          <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-accent/70 text-sm font-black text-primary/80">
            {p.good.nameFa.slice(0, 1)}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-extrabold">{p.label}</p>
            <p className="truncate text-[11px] text-muted-foreground">{goodName(p.good, locale)}</p>
          </div>
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
              item.arm === "buy" ? "bg-sky-100 text-sky-700" : item.arm === "both" ? "bg-violet-100 text-violet-700" : "bg-emerald-100 text-emerald-700"
            }`}
          >
            {item.arm === "buy" ? m.scan.armBuy : item.arm === "both" ? m.scan.armBoth : m.scan.armSell}
          </span>
          {!isComplete(item) && <TriangleAlert className="size-4 shrink-0 text-amber-500" />}
          <button
            type="button"
            aria-label="حذف"
            className="grid size-7 shrink-0 place-items-center rounded-full text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive"
            onClick={() => removeItem(p.id)}
          >
            <X className="size-4" />
          </button>
        </div>
        <div className="mt-2.5 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {item.arm !== "buy" && (
            <div className="col-span-2 sm:col-span-1">
              <NumberInput
                value={item.price}
                onChange={(v) => patchItem(p.id, { price: v })}
                locale={numLocale}
                min={0}
                suffix={curName}
                placeholder={m.picker.price.replace("{unit}", goodName(p.good, locale))}
                aria-label={m.picker.price.replace("{unit}", goodName(p.good, locale))}
              />
            </div>
          )}
          {item.arm !== "buy" && (
            <NumberInput
              value={item.minOrder}
              onChange={(v) => patchItem(p.id, { minOrder: v })}
              locale={numLocale}
              min={0}
              placeholder={m.picker.minOrder}
              aria-label={m.picker.minOrder}
            />
          )}
          {item.arm !== "sell" && (
            <NumberInput
              value={item.volume}
              onChange={(v) => patchItem(p.id, { volume: v })}
              locale={numLocale}
              min={0}
              placeholder={m.picker.volume}
              aria-label={m.picker.volume}
            />
          )}
          {item.arm !== "buy" && (
            <NumberInput
              value={item.stock}
              onChange={(v) => patchItem(p.id, { stock: v })}
              locale={numLocale}
              min={0}
              placeholder={m.picker.stock}
              aria-label={m.picker.stock}
            />
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="rounded-2xl border bg-white shadow-sm">
      <div className="p-6">
        <div className="flex items-center gap-2">
          <ScanLine className="size-5 text-primary" />
          <h1 className="text-lg font-extrabold">{m.scan.title}</h1>
          <span className="hidden rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold text-primary sm:inline">
            {m.scan.tabHint}
          </span>
        </div>
        <p className="mt-2 text-xs leading-6 text-muted-foreground">{m.scan.intro}</p>

        {/* ───── دوربین / راهنمای دسکتاپ ───── */}
        <div className="relative mt-4 aspect-[4/3] overflow-hidden rounded-2xl border bg-stone-900 sm:aspect-[16/9]">
          <video ref={videoRef} muted playsInline className={`size-full object-cover ${cam === "on" ? "" : "opacity-0"}`} />
          {cam !== "on" && (
            <div className="absolute inset-0 grid place-items-center p-6 text-center">
              {cam === "starting" ? (
                <p className="text-xs text-stone-300">{m.scan.camStarting}</p>
              ) : (
                <div className="max-w-xs">
                  <CameraOff className="mx-auto size-6 text-stone-400" />
                  <p className="mt-2 text-xs leading-5 text-stone-300">{m.scan.desktopHint}</p>
                </div>
              )}
            </div>
          )}
          {cam === "on" && (
            <>
              {/* خط راهنمای اسکن */}
              <div className="pointer-events-none absolute inset-x-8 top-1/2 h-0.5 -translate-y-1/2 rounded-full bg-emerald-400/70" />
              <span className="absolute bottom-2 end-2 rounded-full bg-black/50 px-2 py-0.5 text-[10px] font-bold text-white">
                <Camera className="me-1 inline size-3" />
                {m.scan.camOn}
              </span>
            </>
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

        {/* ───── کاندیدهای چندگانه ───── */}
        {candidates && (
          <div className="mt-4 rounded-xl border p-3">
            <p className="text-xs font-bold">{m.scan.candidates}</p>
            <div className="mt-2 max-h-56 space-y-1 overflow-y-auto">
              {candidates.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    setCandidates(null);
                    setArmAsk(p);
                  }}
                  className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-start transition hover:bg-accent"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-bold">{p.label}</span>
                    <span className="block truncate text-[11px] text-muted-foreground">{goodName(p.good, locale)}</span>
                  </span>
                  <Check className="size-4 shrink-0 text-muted-foreground" />
                </button>
              ))}
            </div>
            <button type="button" onClick={() => setCandidates(null)} className="mt-2 text-[11px] font-bold text-muted-foreground hover:text-foreground">
              {m.scan.cancel}
            </button>
          </div>
        )}

        {/* ───── مدال نقش کالا — ساده، با پیش‌فرض ماندگار ───── */}
        {armAsk && (
          <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4 backdrop-blur-sm" onClick={() => setArmAsk(null)}>
            <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-extrabold">{armAsk.label}</p>
                  <p className="truncate text-[11px] text-muted-foreground">{goodName(armAsk.good, locale)}</p>
                </div>
                <button
                  type="button"
                  aria-label="بستن"
                  className="grid size-7 shrink-0 place-items-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground"
                  onClick={() => setArmAsk(null)}
                >
                  <X className="size-4" />
                </button>
              </div>
              <p className="mt-3 text-sm font-bold">{m.scan.armModalTitle}</p>
              <div className="mt-2 grid gap-1.5">
                {(["sell", "buy", "both"] as Arm[]).map((arm) => (
                  <button
                    key={arm}
                    type="button"
                    onClick={() => chooseArm(arm)}
                    className={`flex items-center justify-between rounded-xl border px-4 py-3 text-sm font-bold transition hover:border-primary hover:text-primary ${
                      prefRef.current.lastArm === arm ? "border-primary/50 bg-accent/40" : ""
                    }`}
                  >
                    {arm === "sell" ? m.scan.armSell : arm === "both" ? m.scan.armBoth : m.scan.armBuy}
                    {prefRef.current.lastArm === arm && <span className="text-[10px] text-primary">{m.scan.defaultChip}</span>}
                  </button>
                ))}
              </div>
              <label className="mt-3 flex cursor-pointer items-center gap-2 text-[11px] text-muted-foreground">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  className="size-3.5 accent-[var(--primary)]"
                />
                {m.scan.remember}
              </label>
            </div>
          </div>
        )}

        {/* ───── صف اسکن — کامل بالا، نیازمندِ تکمیل پایین ───── */}
        {queue.length > 0 && (
          <div className="mt-5 space-y-3">
            {complete.length > 0 && (
              <div>
                <p className="mb-2 flex items-center gap-1.5 text-xs font-extrabold text-emerald-700">
                  <Check className="size-3.5" />
                  {m.scan.readySection.replace("{n}", fa(complete.length))}
                </p>
                <div className="space-y-2">{complete.map(rowOf)}</div>
              </div>
            )}
            {pending.length > 0 && (
              <div>
                <p className="mb-2 flex items-center gap-1.5 text-xs font-extrabold text-amber-700">
                  <TriangleAlert className="size-3.5" />
                  {m.scan.needPriceSection.replace("{n}", fa(pending.length))}
                </p>
                <p className="mb-2 text-[11px] leading-5 text-muted-foreground">{m.scan.needPriceHint}</p>
                <div className="space-y-2">{pending.map(rowOf)}</div>
              </div>
            )}

            <div className="flex flex-col gap-2 sm:flex-row">
              <Button variant="outline" className="sm:flex-1" onClick={() => void submit()} disabled={busy || bulk.isPending || complete.length === 0}>
                {busy || bulk.isPending ? (
                  <span className="size-4 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
                ) : (
                  <Check className="size-4" />
                )}
                {m.scan.submit.replace("{n}", fa(complete.length))}
              </Button>
              <Button
                variant="ghost"
                className="sm:flex-1"
                onClick={() =>
                  onDone(
                    queue.some((i) => i.arm !== "buy")
                      ? "sell"
                      : "buy"
                  )
                }
                disabled={busy || bulk.isPending}
              >
                {m.scan.finish}
              </Button>
            </div>
            {pending.length > 0 && <p className="text-center text-[11px] text-muted-foreground">{m.scan.submitNeedsComplete}</p>}
          </div>
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
