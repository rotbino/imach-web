"use client";

import { Icon } from "@/components/ui/icon";
import { num } from "@/lib/format";
import { faDateShort } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useMoney } from "@/components/imach/prefs-context";
import type { OrderDto, OrderItemDto } from "@/lib/api";

/**
 * اجزای مشترک M5 — سفارش‌ها و اسناد (۰۹/۱۰/۲۸/۳۹/۴۰/۴۱).
 *
 * «یک روایت، دو سو» (FD-18): خط زمانی و زبان وضعیت عیناً همان است که
 * فروشنده در ۱۰ و خریدار در ۳۹ می‌بیند.
 *
 * قانون مالک M2 (فریز i18n): این فرم‌ها فارسی‌اند و متن‌ها همین‌جا
 * نوشته می‌شوند، نه در فایل زبان.
 */

/* ─────────────────── وضعیت‌ها ─────────────────── */

export const ORDER_ST: Record<
  string,
  { t: string; b: string; flow?: boolean }
> = {
  NEW: { t: "ثبت‌شده", b: "bg-primary-soft text-primary-strong", flow: true },
  ACCEPTED: { t: "پذیرفته", b: "bg-green-soft text-green", flow: true },
  SENT: { t: "ارسال‌شده", b: "bg-amber-soft text-amber", flow: true },
  DELIVERED: { t: "تحویل‌شده", b: "bg-surface-2 text-text-3", flow: true },
  REJECTED: { t: "رد‌شده", b: "bg-red-bg text-red" },
  CANCELLED: { t: "لغو‌شده", b: "bg-red-bg text-red" },
};

/** جریان اصلی خط زمانی — چهار ایستگاه مشترک دو طرف */
export const ORDER_FLOW: Array<OrderDto["status"]> = ["NEW", "ACCEPTED", "SENT", "DELIVERED"];
export const ORDER_FLOW_T: Record<string, string> = {
  NEW: "ثبت سفارش",
  ACCEPTED: "پذیرش فروشنده",
  SENT: "ارسال کالا",
  DELIVERED: "تأیید تحویل",
};
const BY_T: Record<string, string> = {
  buyer: "خریدار",
  seller: "فروشنده",
  system: "خودکار (مهلت ۷ روزه)",
};

export function OrderStatusBadge({ status }: { status: string }) {
  const m = ORDER_ST[status] ?? ORDER_ST.NEW!;
  return <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-bold", m.b)}>{m.t}</span>;
}

/** عنوان ردیف دفتر: «برنج هاشمی · ۱۰ + ۲ قلم» */
export function orderTitleTx(items: OrderItemDto[]): string {
  const f = items[0];
  if (!f) return "سفارش";
  const t = `${f.name} · ${num(f.qty, "fa")}`;
  return items.length > 1 ? `${t} + ${num(items.length - 1, "fa")} قلم` : t;
}

export const orderTotalMinor = (o: OrderDto): number =>
  o.items.reduce((s, it) => s + it.unitPriceMinor * it.qty, 0);

/* ─────────────────── خط زمانی (۱۰/۳۹) ─────────────────── */

export function OrderTimeline({ o }: { o: OrderDto }) {
  const cur = ORDER_FLOW.indexOf(o.status);
  const exc = o.status === "REJECTED" || o.status === "CANCELLED";
  const findEv = (st: string) => o.history.find((h) => h.st === st);
  return (
    <div className="flex flex-col gap-0">
      {ORDER_FLOW.map((st, i) => {
        const ev = findEv(st);
        const cls = i < cur || (o.status === "DELIVERED" && i === cur) ? "done" : i === cur && !exc ? "cur" : "";
        return (
          <div key={st} className="relative flex gap-3 ps-1 pb-4 last:pb-0">
            {/* خط اتصال */}
            {i < ORDER_FLOW.length - 1 && (
              <span
                aria-hidden
                className={cn(
                  "absolute start-[13px] top-6 bottom-0 w-[2px] rounded",
                  i < cur || (o.status === "DELIVERED" && i === cur) ? "bg-green/50" : "bg-line"
                )}
              />
            )}
            <span
              className={cn(
                "relative z-10 mt-0.5 grid size-[26px] shrink-0 place-items-center rounded-full border-2",
                cls === "done"
                  ? "border-green bg-green-soft text-green"
                  : cls === "cur"
                    ? "border-amber bg-amber-soft text-amber"
                    : "border-line bg-surface text-text-4"
              )}
            >
              {cls ? <Icon name="check" size={13} /> : <span className="size-1.5 rounded-full bg-current" />}
            </span>
            <div className="min-w-0 flex-1 pt-0.5">
              <div className="flex flex-wrap items-baseline gap-x-2">
                <b className={cn("text-[12.5px]", cls ? "font-bold text-text" : "font-bold text-text-4")}>
                  {ORDER_FLOW_T[st]}
                </b>
                {ev && (
                  <small className="text-[11px] tabular-nums text-text-3">
                    {faDateShort(ev.at)} · {BY_T[ev.by] ?? ev.by}
                  </small>
                )}
              </div>
              {!ev && <small className="text-[11px] text-text-4">—</small>}
            </div>
          </div>
        );
      })}
      {exc && (
        <div className="mt-2 flex items-start gap-2.5 rounded-2xl border border-amber/30 bg-amber-soft/40 p-3.5">
          <Icon name="info" size={16} className="mt-0.5 shrink-0 text-amber" />
          <p className="text-[12px] leading-5 text-text-2">
            <b>{ORDER_ST[o.status]?.t}:</b> این سفارش بسته شده است —
            {(() => {
              const ev = o.history.find((h) => h.st === o.status);
              return ev ? ` ${faDateShort(ev.at)} · ${BY_T[ev.by] ?? ev.by}` : "";
            })()}
          </p>
        </div>
      )}
    </div>
  );
}

/* ─────────────────── اقلام ─────────────────── */

/** ردیف قلم فقط-خواندنی — کارت اقلام ۱۰/۳۹ + جدول سند */
export function OrderItemRow({
  it,
  currency,
  children,
}: {
  it: OrderItemDto;
  currency: string;
  children?: React.ReactNode;
}) {
  const { parts } = useMoney();
  const p = parts(it.unitPriceMinor, currency);
  return (
    <div className="flex items-center gap-3 border-b border-line/60 py-3 last:border-0 last:pb-0">
      <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-surface-2 text-[17px] font-black text-text-4/70">
        {it.name.slice(0, 1)}
      </span>
      <div className="min-w-0 flex-1">
        <b className="block truncate text-[13px] font-bold text-text">{it.name}</b>
        {it.pack && <small className="block truncate text-[11px] text-text-3">{it.pack}</small>}
        <small className="mt-0.5 block text-[11px] tabular-nums text-text-3">
          {num(it.qty, "fa")} × {p.amount} {p.label}
        </small>
      </div>
      {children}
      <b className="shrink-0 text-[13px] font-black tabular-nums text-text">
        {parts(it.unitPriceMinor * it.qty, currency).amount}
      </b>
    </div>
  );
}

/** جمع کل — سطر پایانی کارت اقلام */
export function OrderTotalRow({ o, tone = "primary" }: { o: OrderDto; tone?: "primary" | "arm" | "plain" }) {
  const { parts } = useMoney();
  const p = parts(orderTotalMinor(o), o.currency);
  return (
    <div className="mt-2 flex items-center justify-between gap-3 rounded-xl bg-surface-2/70 px-3.5 py-2.5">
      <span className="text-[12px] font-bold text-text-3">جمع کل</span>
      <b
        className={cn(
          "text-[15px] font-black tabular-nums",
          tone === "primary" ? "text-primary-strong" : tone === "arm" ? "text-arm-strong" : "text-text"
        )}
      >
        {p.amount} <small className="text-[11px] font-bold text-text-3">{p.label}</small>
      </b>
    </div>
  );
}

/* ─────────────────── مهلت ۷روزه (تصمیم ۱/۹ FD-22) ─────────────────── */

/** جمله کهربایی «۷ روز پس از ارسال اگر تأیید نکنی، خودکار بسته می‌شود» */
export function DeliverDeadlineNote({ o }: { o: OrderDto }) {
  if (o.status !== "SENT" || o.daysLeft == null) return null;
  const last = o.daysLeft === 0;
  return (
    <div
      className={cn(
        "flex items-center gap-2.5 rounded-2xl border p-3.5",
        last ? "border-red/30 bg-red-bg/50" : "border-amber/30 bg-amber-soft/40"
      )}
    >
      <Icon name="clock" size={17} className={cn("shrink-0", last ? "text-red" : "text-amber")} />
      <p className="text-[12px] leading-5 text-text-2">
        {last
          ? "امروز آخرین مهلت تأیید تحویل است — نکنی، سفارش خودکار بسته می‌شود."
          : `${num(o.daysLeft, "fa")} روز پس از ارسال اگر تأیید نکنی، سفارش خودکار بسته می‌شود.`}
      </p>
    </div>
  );
}
