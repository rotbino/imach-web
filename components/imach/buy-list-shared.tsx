"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/ui/icon";
import { ShareOpt as ShareOptShared, shareTo, buyListInviteText } from "@/components/imach/share-parts";
import { Sheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { businessesApi, marketApi, productsApi, type WatchedRowDto } from "@/lib/api";
import { goodName, num, unitLabel } from "@/lib/format";
import { useLocale } from "@/i18n/locale-context";
import { useAuthStore } from "@/lib/auth-store";
import { useMoney } from "@/components/imach/prefs-context";
import { cn } from "@/lib/utils";
import type { SupplyProposalDto } from "@/lib/api";
import { moneyPartsIn } from "@/lib/currency";

/**
 * اجزای مشترک M3 — لیست خرید و دفتر تأمین (اسکرین‌های ۲۰/۲۰ج/۲۱/۲۲/۲۳).
 *
 * قانون مالک M2 (فریز i18n): این فرم‌ها فارسی‌اند و متن‌ها همین‌جا
 * نوشته می‌شوند، نه در فایل زبان — چندزبانه‌سازی پس از ثبات طراحی.
 *
 * · BuyListRow — کارت خلوت FD-42: عکس/حرف + نام + مقدار (+ بج اتمام موجودی)
 * · ShareBuyListSheet — اشتراک لیست خرید (کپی لینک + پیام‌رسان‌ها)
 * · SupplyTermsSheet — ویرایش «شرایط درخواست تامین» (sheet-buycond)
 * · BarcodeScanSheet — اسکنر زمینه‌دار FD-43 (sheet-blscan): رفتارش را
 *   زمینهٔ فراخوان تعیین می‌کند — لیست خرید یا اتمام موجودی.
 */

const FA_DIGITS = "۰۱۲۳۴۵۶۷۸۹";
const AR_DIGITS = "٠١٢٣٤٥٦٧٨٩";
export const toEnDigits = (v: string): string =>
  v.replace(/[۰-۹]/g, (d) => String(FA_DIGITS.indexOf(d))).replace(/[٠-٩]/g, (d) => String(AR_DIGITS.indexOf(d)));

/** فرمت دورهٔ نیاز خرید — فرم ۲۱ (FD-25) */
export function frequencyLabel(f: string | null, locale: string): string {
  if (locale === "en") {
    if (f === "WEEKLY") return "weekly";
    if (f === "BIWEEKLY") return "biweekly";
    if (f === "MONTHLY") return "monthly";
    return "occasional";
  }
  if (f === "WEEKLY") return "خرید هفتگی";
  if (f === "BIWEEKLY") return "خرید دوهفتگی";
  if (f === "MONTHLY") return "خرید ماهانه";
  return "موقتی";
}

/* ─────────────────────── کارت لیست خرید (FD-42) ─────────────────────── */

export function BuyListRow({
  row,
  locale,
  onOpen,
  onLowStock,
  onRemove,
}: {
  row: WatchedRowDto;
  locale: string;
  onOpen: () => void;
  onLowStock?: () => void;
  onRemove?: () => void;
}) {
  const { parts } = useMoney();
  const name = row.good ? goodName({ nameFa: row.good.nameFa, nameEn: row.good.nameEn }, locale) : "—";
  const unit = row.good?.unit ? unitLabel(row.good.unit, locale) : "";
  const price = row.cheapest ? parts(row.cheapest.priceMinor, row.cheapest.currency) : null;

  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-2xl border bg-surface p-3.5 text-start transition-[border-color,box-shadow]",
        row.lowStock ? "border-amber/45 bg-amber-soft/40" : "border-line",
        "hover:border-line-2 hover:shadow-[0_10px_30px_rgba(31,29,26,.06)]"
      )}
    >
      {/* کارت اصلی — لمس → تأمین‌کنندگان همان کالا (۲۰ب) */}
      <button type="button" onClick={onOpen} className="flex min-w-0 flex-1 items-center gap-3 text-start">
        <span className="grid size-[52px] shrink-0 place-items-center overflow-hidden rounded-xl bg-surface-2 text-[22px] font-black text-text-4/70">
          {name.slice(0, 1)}
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-1.5">
            <b className="truncate text-[14.5px] font-bold text-text">{name}</b>
            {row.lowStock && (
              <span className="rounded-full bg-amber-soft px-2 py-0.5 text-[10px] font-bold text-amber">رو به اتمام</span>
            )}
          </span>
          <span className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[11.5px] text-text-3">
            {row.volume !== null && row.volume !== undefined && (
              <span>
                {num(row.volume, locale)} {unit}
              </span>
            )}
            {row.frequency && <span>· {frequencyLabel(row.frequency, locale)}</span>}
            {row.supplierCount > 0 && (
              <span>
                · {num(row.supplierCount, locale)} تأمین‌کننده
              </span>
            )}
          </span>
          {price && (
            <span className="mt-1 flex items-baseline gap-1">
              <b className="text-[13.5px] font-black text-arm-strong">{price.amount}</b>
              <span className="text-[10.5px] font-bold text-text-3">{price.label}</span>
              {row.cheapest?.seller && <span className="text-[10.5px] text-text-4">· {row.cheapest.seller.name}</span>}
            </span>
          )}
        </span>
      </button>

      {/* اکشن‌های ردیف — اتمام موجودی ( toggle ) + حذف آرام */}
      <div className="flex shrink-0 flex-col gap-1">
        {onLowStock && (
          <button
            type="button"
            onClick={onLowStock}
            title={row.lowStock ? "برداشتن نشان رو به اتمام" : "علامت‌گذاری رو به اتمام"}
            aria-label={row.lowStock ? "برداشتن نشان رو به اتمام" : "علامت‌گذاری رو به اتمام"}
            className={cn(
              "grid size-9 place-items-center rounded-full transition-colors",
              row.lowStock
                ? "bg-amber text-white hover:bg-amber/90"
                : "text-text-3 hover:bg-amber-soft hover:text-amber"
            )}
          >
            <Icon name="boxes" size={17} />
          </button>
        )}
        {onRemove && (
          <button
            type="button"
            onClick={onRemove}
            title="حذف از لیست خرید"
            aria-label="حذف از لیست خرید"
            className="grid size-9 place-items-center rounded-full text-text-3 transition-colors hover:bg-red-bg hover:text-red"
          >
            <Icon name="x" size={16} />
          </button>
        )}
      </div>
    </div>
  );
}

/* ─────────────────── شیت اشتراک‌گذاری لیست خرید ─────────────────── */

export function ShareBuyListSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { locale } = useLocale();
  const businesses = useAuthStore((s) => s.businesses);
  const biz = businesses[0];
  const [done, setDone] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // M7 — لینک دعوت با ?ref=buy:{slug}: ثبت‌نامِ گیرنده = «تأمین‌کننده من»
  const link = biz ? `${typeof window !== "undefined" ? window.location.origin : ""}/buy/${biz.slug}?ref=buy:${biz.slug}` : "";
  const text =
    locale === "en"
      ? `My iMach shopping list — suppliers can send me supply offers:\n${link}`
      : buyListInviteText(link);

  const copy = async (v: string) => {
    try {
      await navigator.clipboard.writeText(v);
      setDone(true);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setDone(false), 2200);
    } catch {
      /* clipboard مسدود — کاربر دستی انتخاب می‌کند */
    }
  };



  return (
    <Sheet open={open} onClose={onClose} title="اشتراک‌گذاری لیست خرید">
      <div className="flex flex-col gap-4 p-5">
        <p className="text-[12.5px] leading-6 text-text-3">
          لینک لیست خریدت را برای تأمین‌کننده‌ها بفرست. هر کس پیشنهاد تامین بدهد، به‌عنوان تأمین‌کنندهٔ جدید در فهرستت
          می‌آید و با تاییدت جزو تأمین‌کننده‌هایت می‌شود.
        </p>

        {/* لینک + کپی */}
        <div className="flex gap-2">
          <input
            readOnly
            dir="ltr"
            value={link}
            className="h-11 flex-1 rounded-xl border border-line bg-surface px-3 text-[12.5px] text-text-2 focus:border-arm focus:outline-none"
          />
          <Button variant="arm" size="lg" className="shrink-0" onClick={() => void copy(link)}>
            <Icon name={done ? "check" : "link"} size={16} />
          </Button>
        </div>
        {done && <p className="text-[12px] font-bold text-green">کپی شد — لینک آمادهٔ ارسال است</p>}

        {/* پیام‌رسان‌ها — سهماه Remote (FD-26) */}
        <div className="grid grid-cols-3 gap-2">
          <ShareOpt label="واتس‌اپ" bg="#25D366" icon="whatsapp" onClick={() => shareTo("whatsapp", link, text)} />
          <ShareOpt label="تلگرام" bg="#229ED9" icon="telegram" onClick={() => shareTo("telegram", link, text)} />
          <ShareOpt label="پیامک" bg="#F97316" icon="msg" onClick={() => shareTo("sms", link, text)} />
        </div>
      </div>
    </Sheet>
  );
}

/** M7 — ShareOpt به components/imach/share-parts رفت (زبان مشترک ۰۶/۲۰) */
const ShareOpt = ShareOptShared;

/* ─────────────── شیت شرایط درخواست تامین (sheet-buycond) ─────────────── */

export function SupplyTermsSheet({
  open,
  onClose,
  bizId,
  initial,
}: {
  open: boolean;
  onClose: () => void;
  bizId: string;
  initial: string | null | undefined;
}) {
  const { show } = useToast();
  const [text, setText] = useState(initial ?? "");
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (open) {
      setText(initial ?? "");
      setDirty(false);
    }
  }, [open, initial]);

  const save = async () => {
    if (!bizId) return;
    setBusy(true);
    try {
      await businessesApi.setSupplyTerms(bizId, text.trim() ? text.trim() : null);
      show({ text: "شرایط تامین ذخیره شد", kind: "success" });
      onClose();
    } catch {
      show({ text: "ذخیره نشد — دوباره تلاش کن", kind: "error" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet open={open} onClose={onClose} title="شرایط درخواست تامین">
      <div className="flex flex-col gap-5 p-5">
        <p className="text-[12.5px] leading-6 text-text-3">
          هر که از لینک لیستت پیشنهاد می‌دهد، اول این‌ها را می‌خواند — پس مستقیم و کوتاه بنویس. خالی بگذاری، لینک
          «شرایط» در صفحهٔ لیستت دیده نمی‌شود.
        </p>
        <Field label="شرایط تو برای تأمین‌کننده‌ها">
          {(id) => (
            <Textarea
              id={id}
              rows={5}
              value={text}
              onChange={(e) => {
                setText(e.target.value);
                setDirty(true);
              }}
              placeholder="مثلاً: تأمین‌کننده‌های رشت و حومه · اولین سفارش آزمایشی است · فاکتور رسمی الزامی"
            />
          )}
        </Field>
        <p className="flex items-start gap-2 text-[11.5px] leading-5 text-text-3">
          <Icon name="info" size={15} className="mt-0.5 shrink-0" />
          <span>موارد را با «·» جدا کن — برای بیننده ردیف‌به‌ردیف و خوانا نمایش داده می‌شود.</span>
        </p>
        <Button variant="arm" size="lg" loading={busy} onClick={() => void save()} disabled={busy && !dirty}>
          <Icon name="check" size={16} /> ذخیرهٔ شرایط
        </Button>
      </div>
    </Sheet>
  );
}

/* ───────────── اسکنر بارکد زمینه‌دار (sheet-blscan — FD-43) ───────────── */

/**
 * زمینهٔ فراخوان رفتار شیت را تعیین می‌کند (حکم مالک FD-43):
 *  • mode="list" — اسکن = افزودن به لیست خرید
 *  • mode="lowstock" — اسکن = افزودن به لیست خرید + نشان رو به اتمام
 *    («کالایی که هنوز در لیست خریدت نیست، همان لحظه به هر دو فهرست اضافه می‌شود»)
 */
export function BarcodeScanSheet({
  open,
  onClose,
  mode,
  bizId,
  onAdded,
}: {
  open: boolean;
  onClose: () => void;
  mode: "list" | "lowstock";
  bizId: string;
  onAdded: (goodId: string, name: string) => void;
}) {
  const { show } = useToast();
  const [code, setCode] = useState("");
  const [miss, setMiss] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setCode("");
      setMiss(null);
    }
  }, [open]);

  const match = async () => {
    const v = toEnDigits(code).replace(/\D/g, "");
    if (v.length < 6) {
      show({ text: "بارکد را کامل وارد کن", kind: "error" });
      return;
    }
    setBusy(true);
    setMiss(null);
    try {
      // بارکد → محصولات مرجع → goodId همان محصول
      // (businessId الزامیِ endpoint — بدون آن 400 BUSINESS_ID_REQUIRED
      // و اسکنر همیشه «پیدا نشد» می‌شد)
      const page = await productsApi.getProducts({ barcode: v, limit: 5, businessId: bizId || undefined });
      const hit = page.items[0];
      if (hit) {
        await marketApi.watchGood(bizId, hit.goodId);
        if (mode === "lowstock") await marketApi.setLowStock(bizId, hit.goodId, true);
        onAdded(hit.goodId, hit.label);
        onClose();
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
        {mode === "lowstock"
          ? "بارکد نوع کالای رو به اتمام را بگیر — اگر در لیست خریدت نباشد، همان لحظه به هر دو فهرست اضافه می‌شود."
          : "بارکد نوع کالا را بگیر — با نوع کالاهای مرجع آیمچ تطبیق داده می‌شود و مستقیم به لیست خریدت می‌آید."}
      </p>

      {/* قاب اسکن */}
      <div className="grid place-items-center gap-2 rounded-2xl border border-line-2 bg-text/90 py-7">
        <Icon name="scan" size={40} className="text-white/85" />
        <span className="text-[11px] font-bold text-white/70">بارکد را داخل کادر نگه دارید</span>
      </div>

      <div className="mt-4 flex flex-col gap-5 py-1">
        <Field label="بارکد را دستی وارد کن" hint="اگر اسکنر نداری">
          {(id) => (
            <div className="flex gap-2">
              <Input
                id={id}
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
            <span>از جستجو دنبالش بگرد و دستی انتخابش کن — بارکدهای ناشناس بعداً با اسکن واقعی کامل می‌شوند.</span>
          </div>
        )}
      </div>
    </Sheet>
  );
}


/* ═══════════════ M6 — کارت‌های «پیشنهادهای تامین» بالای لیست خرید (۲۰) ═══════════════
 * سه شکل (FD-22/23): چندقلمی (ردیف قیمت×حداقل) · تک‌قلمی · فقط‌درخواست (bare).
 * تایید = «تأمین‌کننده‌هایم + کاتالوکش ذخیره» (دو رابطهٔ Follow — سرور).
 */
export function SupplyProposals({
  rows,
  loading,
  locale,
  onAccept,
  onDismiss,
  onChat,
}: {
  rows: SupplyProposalDto[];
  loading: boolean;
  locale: string;
  onAccept: (id: string, name: string) => void | Promise<void>;
  onDismiss: (id: string, name: string) => void | Promise<void>;
  /** M8 — گفتگو دربارهٔ همین پیشنهاد (زمینه: SUPPLY_PROPOSAL) */
  onChat?: (p: SupplyProposalDto) => void;
}) {
  const [busyId, setBusyId] = useState<string | null>(null);
  if (loading && rows.length === 0) return null;
  if (rows.length === 0) return null;

  return (
    <section className="flex flex-col gap-2.5">
      <h2 className="flex items-center gap-1.5 text-[13.5px] font-bold text-text">
        <Icon name="sparkles" size={15} className="text-amber" />
        پیشنهادهای تامین
        <span className="rounded-full bg-amber-soft px-2 py-0.5 text-[10px] font-bold text-amber">
          {num(rows.length, locale)} پیشنهاد — بالای لیست، جلوی چشم
        </span>
      </h2>
      {rows.map((p) => {
        const busy = busyId === p.id;
        return (
          <div key={p.id} className="flex flex-col gap-2.5 rounded-2xl border border-amber/40 bg-surface p-4">
            <div className="flex items-center gap-2.5">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-amber-soft text-[15px] font-black text-amber">
                {p.supplier.name.slice(0, 1)}
              </span>
              <div className="min-w-0 flex-1">
                <b className="block truncate text-[13.5px] font-bold text-text">{p.supplier.name}</b>
                <span className="block truncate text-[11px] text-text-3">
                  {p.supplier.city}
                  {p.supplier.trade ? ` · ${p.supplier.trade}` : ""}
                </span>
              </div>
              <span className="shrink-0 rounded-full bg-amber-soft px-2 py-0.5 text-[10px] font-bold text-amber">پیشنهاد تامین</span>
            </div>

            {p.items.length > 0 ? (
              <div className="flex flex-col gap-1.5 rounded-xl bg-surface-2/60 p-2.5">
                {p.items.map((it) => (
                  <div key={it.goodId} className="flex items-center justify-between gap-2 text-[12px]">
                    <span className="min-w-0 flex-1 truncate font-bold text-text">
                      {it.name}
                      {it.pack ? <small className="font-normal text-text-3"> · {it.pack}</small> : null}
                    </span>
                    <span className="shrink-0 text-text-3">حداقل {num(it.minOrder, locale)}</span>
                    <span className="shrink-0 font-black tabular-nums text-text">
                      {moneyPartsIn(it.priceMinor, "IRR", "IRR", undefined, locale).amount}
                      <small className="font-normal text-text-3"> تومان</small>
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="rounded-xl bg-surface-2/60 px-3.5 py-2.5 text-[11.5px] leading-5 text-text-3">
                فقط درخواست تامین‌کنندگی — قلم و قیمتی نفرستاده؛ با تایید، تأمین‌کننده‌ات می‌شود و کاتالوکش را می‌بینی.
              </p>
            )}

            {p.note && (
              <p className="rounded-xl border border-line px-3.5 py-2 text-[11.5px] leading-5 text-text-2">{p.note}</p>
            )}

            <div className="flex items-center gap-2">
              <Button variant="arm" size="sm" className="flex-1" loading={busy} onClick={() => { setBusyId(p.id); void onAccept(p.id, p.supplier.name); }}>
                <Icon name="check" size={14} />
                تایید و افزودن به تأمین‌کنندگانم
              </Button>
              {onChat && (
                <Button variant="soft" size="sm" onClick={() => onChat(p)}>
                  <Icon name="msg" size={14} />
                  گفتگو
                </Button>
              )}
              <Button variant="outline" size="sm" className="flex-1 !text-red !border-red/30" loading={busy} onClick={() => { setBusyId(p.id); void onDismiss(p.id, p.supplier.name); }}>
                <Icon name="x" size={14} />
                حذف
              </Button>
            </div>
          </div>
        );
      })}
    </section>
  );
}
