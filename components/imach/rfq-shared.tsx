"use client";

import { Icon } from "@/components/ui/icon";
import { num } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { RfqGroupDto, RfqOfferDto, RfqItemDto } from "@/lib/api";

/**
 * اجزای مشترک M4 — حلقهٔ استعلام چندقلمی (۲۴/۲۵/۲۶/۲۷/۱۱/۱۲).
 *
 * «یک زبان، دو سو» (حکم مالک FD-14/24): متن شرایط پرداخت/تحویل عیناً
 * همان است که فروشنده در فرم ۱۲ می‌سازد و خریدار در ۲۶/۲۷ می‌بیند.
 *
 * قانون مالک M2 (فریز i18n): این فرم‌ها فارسی‌اند و متن‌ها همین‌جا
 * نوشته می‌شوند، نه در فایل زبان.
 */

/* ─────────────────── متن شرایط (pay/dlv ساختاریافته) ─────────────────── */

/** «۶۰٪ نقدی + ۴۰٪ چک (تا ۶۰ روز)» · null/نقدی ⇒ «نقدی» (بازتاب فرم ۱۲) */
export function payTx(pay: { chk: number; days: number } | null | undefined): string {
  const chk = pay?.chk ?? 0;
  if (!chk) return "نقدی";
  return `${num(100 - chk, "fa")}٪ نقدی + ${num(chk, "fa")}٪ چک (تا ${num(pay?.days ?? 30, "fa")} روز)`;
}

/** «ارسال — حمل با فروشنده» · ship=false ⇒ «تحویل حضوری» */
export function dlvTx(dlv: { ship: boolean; by: "seller" | "customer" } | null | undefined): string {
  if (!dlv?.ship) return "تحویل حضوری";
  return `ارسال — حمل با ${dlv.by === "customer" ? "مشتری" : "فروشنده"}`;
}

/* ─────────────────── عناوین استعلام (حکم مالک FD-14) ─────────────────── */

/** «درخواست قیمت برنج هاشمی» — پیشوندِ گویا روی همهٔ ردیف‌ها (۱۱/۱۲/۲۴/۲۶) */
export const rfqTitleTx = (name: string): string => `درخواست قیمت ${name}`;

/** عنوان گروه: تک‌قلمی «نام · مقدار» · چندقلمی «n قلمی» (قالب rfqsOut) */
export function itemTitleTx(items: RfqItemDto[]): string {
  if (items.length <= 1) {
    const it = items[0];
    return it?.good ? `${it.good.nameFa} · ${num(it.qty, "fa")}` : "استعلام";
  }
  return `${num(items.length, "fa")} قلمی`;
}

/** خلاصهٔ قلم‌ها برای زیرعنوان: «برنج، روغن» */
export const itemPackTx = (items: RfqItemDto[]): string =>
  items.map((it) => it.good?.nameFa ?? "—").join("، ");

/** «n روز مانده» · ۰ = «امروز آخرین روز» (بج مهلت) */
export function leftTx(daysLeft: number | null | undefined): string {
  if (daysLeft == null) return "";
  return daysLeft === 0 ? "امروز آخرین روز" : `${num(daysLeft, "fa")} روز مانده`;
}

/** رنگ بج مهلت بر اساس روزهای مانده */
export const deadlineTone = (daysLeft: number | null | undefined) =>
  daysLeft != null && daysLeft <= 1 ? "text-red" : "text-amber";

/* ─────────────────── محاسبات چندقلمی (سمت کلاینت صرفاً نمایشی) ─────────────────── */

/** پوشش پیشنهاد — از سرور می‌آید؛ این فقط fallback */
export const offerCover = (o: RfqOfferDto, n: number): number =>
  typeof o.cover === "number" ? o.cover : n ? Math.max(1, o.prices?.filter((p) => p != null).length ?? 1) : 0;

/** مرتب‌سازی ۲۶ (حکم مالک FD-24): «اول پوشش کامل، بعد جمع کل» —
 *  تک‌قلمی همان مرتب‌سازی قدیمی بر قیمت قلم */
export function sortOffers(offers: RfqOfferDto[], itemCount: number): RfqOfferDto[] {
  return [...offers].sort((a, b) => {
    if (itemCount > 1) {
      const d = offerCover(b, itemCount) - offerCover(a, itemCount);
      if (d) return d;
      return a.totalMinor - b.totalMinor;
    }
    return a.priceMinor - b.priceMinor;
  });
}

/** «کمترین جمع» فقط بین کامل‌ها (مقایسهٔ سیب با سیب) — تک‌قلمی: کمترین قیمت */
export function bestOfferOf(offers: RfqOfferDto[], itemCount: number): RfqOfferDto | null {
  if (!offers.length) return null;
  if (itemCount > 1) {
    const full = offers.filter((o) => offerCover(o, itemCount) >= itemCount);
    if (!full.length) return null;
    return full.reduce((m, o) => (o.totalMinor < m.totalMinor ? o : m), full[0]);
  }
  return offers.reduce((m, o) => (o.priceMinor < m.priceMinor ? o : m), offers[0]);
}

/* ─────────────────── بج‌ها ─────────────────── */

/** بج پوشش «k از n قلم» — سبز اگر کامل */
export function CoverageBadge({ k, n }: { k: number; n: number }) {
  const full = k >= n;
  return (
    <span
      className={cn(
        "rounded-full px-2 py-0.5 text-[10px] font-bold",
        full ? "bg-green-soft text-green" : "bg-surface-2 text-text-3"
      )}
    >
      {full ? `همهٔ ${num(n, "fa")} قلم` : `${num(k, "fa")} از ${num(n, "fa")} قلم`}
    </span>
  );
}

/** بج «n قلم» روی ردیف‌های ۱۱/۲۴ */
export function ItemsCountBadge({ n }: { n: number }) {
  if (n <= 1) return null;
  return (
    <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[10px] font-bold text-text-3">
      {num(n, "fa")} قلم
    </span>
  );
}

/** بج وضعیت گروه (۲۴): باز/بسته/متوقف/منقضی/سرد */
export function GroupStatusBadge({ g }: { g: RfqGroupDto }) {
  const map: Record<string, { cls: string; label: string }> = {
    OPEN: { cls: "bg-green-soft text-green", label: "باز" },
    STOPPED: { cls: "bg-surface-2 text-text-3", label: "بسته شد" },
    CLOSED: { cls: "bg-primary-soft text-primary-strong", label: "پذیرفته شد" },
    EXPIRED: { cls: "bg-surface-2 text-text-3", label: "مهلت تمام شد" },
    COLD: { cls: "bg-blue-soft text-blue", label: "پیشنهاد سرد" },
  };
  const s = map[g.status] ?? map.OPEN;
  return (
    <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-bold", s.cls)}>{s.label}</span>
  );
}

/** نوار شرایط روی کارت پیشنهاد (۲۶) و جزئیات (۲۷) — بازتاب عین فرم ۱۲ */
export function OfferTermsRow({ o, className }: { o: RfqOfferDto; className?: string }) {
  return (
    <div className={cn("grid grid-cols-2 gap-2", className)}>
      <div className="rounded-xl bg-surface-2/70 px-3 py-2">
        <small className="block text-[10px] font-bold text-text-4">پرداخت</small>
        <b className="text-[11.5px] font-bold text-text-2">{payTx(o.pay)}</b>
      </div>
      <div className="rounded-xl bg-surface-2/70 px-3 py-2">
        <small className="block text-[10px] font-bold text-text-4">تحویل</small>
        <b className="text-[11.5px] font-bold text-text-2">{dlvTx(o.dlv)}</b>
      </div>
    </div>
  );
}

/** بج مهلت روی کارت استعلام/پیشنهاد */
export function DeadlineBadge({ daysLeft, className }: { daysLeft: number | null; className?: string }) {
  if (daysLeft == null) return null;
  const last = daysLeft === 0;
  return (
    <span
      className={cn(
        "rounded-full px-2 py-0.5 text-[10.5px] font-bold",
        last ? "bg-red-bg text-red" : "bg-amber-soft text-amber",
        className
      )}
    >
      <Icon name="clock" size={11} className="me-0.5 inline-block align-[-1px]" />
      {leftTx(daysLeft)}
    </span>
  );
}
