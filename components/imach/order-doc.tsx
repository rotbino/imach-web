"use client";

import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/icon";
import { moneyPartsIn } from "@/lib/currency";
import { faDate, num } from "@/lib/format";
import { payTx, dlvTx } from "@/components/imach/rfq-shared";
import { orderTotalMinor } from "@/components/imach/order-shared";
import type { OrderDto } from "@/lib/api";

/**
 * اسناد سفارش M5 (FD-37) — فاکتور فروش (۴۰) + برگهٔ ارسال (۴۱).
 *
 * · کارت «اسناد سفارش» در ۱۰/۳۹ — رندر وضعیت‌محور: فاکتور پس از پذیرش،
 *   برگهٔ ارسال فقط پس از «ارسال شد»؛ new/rejected/cancelled = هیچ.
 * · قالب A4 چاپی از اقلام snapshot — شمارهٔ سند ترتیمی واقعی (DB) + تاریخ
 *   جلالی سرور؛ مبالغ به ارزِ خودِ سفارش (بدون تبدیل ارز نمایشی — سند
 *   حقوقی است).
 * · چاپ = window.print() با @media print که فقط .doc-paper را می‌برد.
 *
 * قانون مالک M2: فرم فارسی، متن‌ها همین‌جا (فریز i18n).
 */

/** کارت «اسناد سفارش» — بعد از اقلام و مشخصات در ۱۰/۳۹ */
export function OrderDocsCard({ o, side }: { o: OrderDto; side: "buy" | "sell" }) {
  if (["NEW", "REJECTED", "CANCELLED"].includes(o.status)) return null;
  const archived = o.status === "DELIVERED";
  const sentOn = ["SENT", "DELIVERED"].includes(o.status);
  const who = side === "buy" ? "فروشنده" : "مشتری";
  const base = `/sell/orders/${o.id}`;
  return (
    <section className="flex flex-col gap-2 rounded-2xl border border-line bg-surface p-4">
      <div className="flex items-center justify-between gap-2">
        <b className="flex items-center gap-2 text-[13px] font-bold text-text">
          <Icon name="file-invoice" size={16} className="text-primary-strong" />
          اسناد سفارش
        </b>
        {archived && (
          <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[10px] font-bold text-text-3">آرشیو</span>
        )}
      </div>
      <p className="text-[11.5px] leading-5 text-text-3">
        فاکتور و برگهٔ ارسال این سفارش — {who} هم همین‌ها را می‌بیند.
      </p>
      <div className="mt-1 grid grid-cols-1 gap-2 sm:grid-cols-2">
        <DocButton href={`${base}/doc/invoice`} label="دریافت فاکتور" />
        {sentOn ? (
          <DocButton href={`${base}/doc/slip`} label="دریافت برگهٔ ارسال" />
        ) : (
          <button
            type="button"
            disabled
            title="پس از «ارسال شد» فعال می‌شود"
            className="flex items-center justify-center gap-2 rounded-xl border border-line bg-surface-2/60 px-3 py-2.5 text-[12px] font-bold text-text-4"
          >
            <Icon name="download" size={15} />
            دریافت برگهٔ ارسال
          </button>
        )}
      </div>
      {!sentOn && (
        <p className="text-[11px] leading-5 text-text-4">برگهٔ ارسال همراه بار می‌رود — بعد از «ارسال شد» آماده می‌شود.</p>
      )}
    </section>
  );
}

function DocButton({ href, label }: { href: string; label: string }) {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={() => router.push(href)}
      className="flex items-center justify-center gap-2 rounded-xl border border-line bg-surface px-3 py-2.5 text-[12px] font-bold text-text-2 transition-colors hover:border-line-2 hover:text-text"
    >
      <Icon name="download" size={15} />
      {label}
    </button>
  );
}

/* ═══════════ کاغذ A4 — مبالغ به ارز خودِ سفارش (سند حقوقی) ═══════════ */

const money = (minor: number, currency: string) => moneyPartsIn(minor, currency, currency, undefined, "fa");

/** سربرگ مشترک ۴۰/۴۱ — فروشنده صادرکننده است (دو طرف همان را می‌بینند) */
function DocHead({ o, title }: { o: OrderDto; title: string }) {
  const s = o.seller;
  return (
    <div className="flex items-start justify-between gap-6 border-b-2 border-text/80 pb-4">
      <div className="flex items-start gap-3">
        <span className="grid size-12 shrink-0 place-items-center rounded-lg border-2 border-text/70 text-[22px] font-black text-text">
          {(s.name ?? "؟").slice(0, 1)}
        </span>
        <div className="min-w-0">
          <b className="block text-[16px] font-black text-text">{s.name}</b>
          <small className="block text-[11px] text-text-2">
            {s.address ? `${s.address} · ` : `${s.city} · `}
            {s.trade ?? ""}
          </small>
          <small className="block text-[11px] text-text-2">تلفن: {s.phone ?? "—"}</small>
          {s.invoiceTaxId && <small className="block text-[11px] text-text-2">شمارهٔ مالیاتی: {s.invoiceTaxId}</small>}
        </div>
      </div>
      <div className="shrink-0 text-end">
        <b className="block text-[17px] font-black text-text">{title}</b>
        <small className="block text-[11.5px] font-bold text-text-2">
          شماره: {o.docNo != null ? num(o.docNo, "fa") : "—"}
        </small>
        <small className="block text-[11.5px] font-bold text-text-2">تاریخ: {faDate(o.createdAt)}</small>
      </div>
    </div>
  );
}

function DocFoot() {
  return (
    <div className="mt-auto border-t border-text/30 pt-3 text-center">
      <p className="text-[10.5px] text-text-3">ساخته‌شده با آی‌مچ — دفتر خرید و فروش عمدهٔ شما</p>
    </div>
  );
}

/** ۴۰ — فاکتور فروش: جدول اقلام + جمع + شرایط + یادداشت ثابت */
export function OrderInvoicePaper({ o }: { o: OrderDto }) {
  const buyer = o.buyer;
  const total = money(orderTotalMinor(o), o.currency);
  return (
    <div className="doc-paper flex flex-col">
      <DocHead o={o} title="فاکتور فروش" />
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 py-3 text-[12.5px] text-text-2">
        <span className="text-text-3">خریدار:</span>
        <b className="text-text">
          {buyer.name}
          {buyer.city ? ` · ${buyer.city}` : ""}
        </b>
        {buyer.phone && (
          <>
            <span className="text-text-3">· تلفن:</span>
            <span dir="ltr" className="tabular-nums">{buyer.phone}</span>
          </>
        )}
      </div>
      <table className="doc-table">
        <thead>
          <tr>
            <th className="w-8">ردیف</th>
            <th className="text-start">نام کالا</th>
            <th className="w-24">بسته</th>
            <th className="w-16">تعداد</th>
            <th className="w-28">قیمت واحد ({total.label})</th>
            <th className="w-28">جمع ({total.label})</th>
          </tr>
        </thead>
        <tbody>
          {o.items.map((it, i) => (
            <tr key={i}>
              <td className="text-center tabular-nums">{num(i + 1, "fa")}</td>
              <td>{it.name}</td>
              <td className="text-center">{it.pack || "—"}</td>
              <td className="text-center tabular-nums">{num(it.qty, "fa")}</td>
              <td className="tabular-nums">{money(it.unitPriceMinor, o.currency).amount}</td>
              <td className="tabular-nums font-bold">{money(it.unitPriceMinor * it.qty, o.currency).amount}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-3 flex items-center justify-between gap-3 rounded-lg bg-text/[.04] px-4 py-2.5">
        <span className="text-[12px] font-bold text-text-2">جمع کل</span>
        <b className="text-[15px] font-black tabular-nums text-text">
          {total.amount} {total.label}
        </b>
      </div>
      <div className="mt-3 flex flex-col gap-1 text-[12px] leading-6 text-text-2">
        <p>
          <span className="text-text-3">شرایط پرداخت: </span>
          {o.pay ? payTx(o.pay) : o.note || "طبق توافق دو طرف در زمان سفارش"}
        </p>
        <p>
          <span className="text-text-3">روش تحویل: </span>
          {o.dlv ? dlvTx(o.dlv) : "طبق توافق دو طرف"}
        </p>
        {o.seller.invoiceNote && (
          <p>
            <span className="text-text-3">یادداشت: </span>
            {o.seller.invoiceNote}
          </p>
        )}
      </div>
      <DocFoot />
    </div>
  );
}

/** ۴۱ — برگهٔ ارسال: اقلام بار با چک‌باکس تحویل + خط امضای گیرنده */
export function OrderSlipPaper({ o }: { o: OrderDto }) {
  const buyer = o.buyer;
  return (
    <div className="doc-paper flex flex-col">
      <DocHead o={o} title="برگهٔ ارسال" />
      <div className="flex flex-col gap-1 py-3 text-[12.5px] text-text-2">
        <p>
          <span className="text-text-3">فرستنده: </span>
          <b className="text-text">{o.seller.name}{o.seller.city ? ` · ${o.seller.city}` : ""}</b>
        </p>
        <p>
          <span className="text-text-3">گیرنده: </span>
          <b className="text-text">{buyer.name}{buyer.city ? ` · ${buyer.city}` : ""}</b>
        </p>
        {buyer.phone && (
          <p>
            <span className="text-text-3">تلفن گیرنده: </span>
            <span dir="ltr" className="tabular-nums">{buyer.phone}</span>
          </p>
        )}
      </div>
      <p className="mb-2 text-[12px] font-bold text-text-2">اقلام بار — هنگام تحویل کنار هر کالا تیک بزن:</p>
      <div className="doc-slip-list">
        {o.items.map((it, i) => (
          <div key={i} className="doc-slip-item">
            <span className="doc-slip-chk" aria-hidden />
            <span className="min-w-0 flex-1">
              {it.name}
              {it.pack ? ` · ${it.pack}` : ""}
            </span>
            <b className="tabular-nums">{num(it.qty, "fa")}</b>
          </div>
        ))}
      </div>
      <div className="mt-6 grid grid-cols-2 gap-8">
        <div className="flex flex-col items-center gap-1.5">
          <span className="h-10 w-full border-b border-dashed border-text/50" />
          <small className="text-[11px] text-text-3">تاریخ تحویل</small>
        </div>
        <div className="flex flex-col items-center gap-1.5">
          <span className="h-10 w-full border-b border-dashed border-text/50" />
          <small className="text-[11px] text-text-3">امضای گیرنده</small>
        </div>
      </div>
      <DocFoot />
    </div>
  );
}
