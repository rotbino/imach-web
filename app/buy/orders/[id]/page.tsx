"use client";

import { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AuthGate } from "@/components/imach/auth-gate";
import { AppShell } from "@/components/imach/app-shell";
import { Icon } from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import { Spinner } from "@/components/ui/feedback";
import { useToast } from "@/components/ui/toast";
import { useMoney } from "@/components/imach/prefs-context";
import { useStartChat } from "@/lib/queries";
import { useAuthStore } from "@/lib/auth-store";
import { ordersApi, type OrderDto } from "@/lib/api";
import { num, timeAgo } from "@/lib/format";
import { payTx, dlvTx } from "@/components/imach/rfq-shared";
import { orderItemsSeed } from "@/lib/basket";
import {
  DeliverDeadlineNote,
  OrderStatusBadge,
  OrderTimeline,
  OrderTotalRow,
  orderTitleTx,
  orderTotalMinor,
} from "@/components/imach/order-shared";
import { OrderDocsCard } from "@/components/imach/order-doc";

/**
 * `/buy/orders/[id]` — اسکرین ۳۹: جزئیات سفارش (خریدار · M5).
 *
 * · قرینهٔ ۱۰ با همان روایت (اقلام + خط زمانی + اسناد) — یک زبان دو سو.
 * · new/accepted → «لغو سفارش» (فقط تا قبل از ارسال) + گفتگو.
 * · sent → «تأیید تحویل» = بسته‌شدن کامل + جملهٔ مهلت ۷روزه.
 * · delivered → «سفارش دوباره»: اقلام به سبد کاتالوک همان تأمین‌کننده
 *   می‌روند (قیمت‌های تازه) — سید از lib/basket.
 *
 * قانون مالک M2: فرم فارسی، متن‌ها همین‌جا (فریز i18n).
 */

export default function BuyOrderViewPage() {
  return (
    <AuthGate>
      <BuyOrderView />
    </AuthGate>
  );
}

function BuyOrderView() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const { show } = useToast();
  const { parts } = useMoney();
  const startChat = useStartChat();
  const businesses = useAuthStore((s) => s.businesses);
  const bizId = businesses[0]?.id ?? "";

  const orderQ = useQuery({
    queryKey: ["orders", "detail", bizId, id],
    queryFn: () => ordersApi.getOrder(bizId, id),
    enabled: !!bizId && !!id,
  });
  const o = orderQ.data;

  const [busy, setBusy] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [deliverOpen, setDeliverOpen] = useState(false);

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ["orders"] });
  };

  const title = useMemo(() => (o ? orderTitleTx(o.items) : ""), [o]);

  if (orderQ.isLoading) {
    return (
      <AppShell arm="buy" title="جزئیات سفارش" back="/buy/orders">
        <div className="grid place-items-center py-16">
          <Spinner />
        </div>
      </AppShell>
    );
  }
  if (!o) {
    return (
      <AppShell arm="buy" title="جزئیات سفارش" back="/buy/orders">
        <div className="p-6 text-center text-[13px] text-text-3">سفارش پیدا نشد.</div>
      </AppShell>
    );
  }

  const p = parts(orderTotalMinor(o), o.currency);
  const canDocs = ["ACCEPTED", "SENT", "DELIVERED"].includes(o.status);
  const isCurrent = ["NEW", "ACCEPTED", "SENT"].includes(o.status);

  const cancel = async () => {
    setBusy(true);
    try {
      await ordersApi.cancelOrder(bizId, o.id);
      show({ text: "سفارش لغو شد — تأمین‌کننده خبردار شد", kind: "error" });
      setCancelOpen(false);
      invalidate();
    } catch (e) {
      show({ text: e instanceof Error ? e.message : "لغو نشد", kind: "error" });
    } finally {
      setBusy(false);
    }
  };

  const deliver = async () => {
    setBusy(true);
    try {
      await ordersApi.deliverOrder(bizId, o.id);
      show({ text: "سفارش بسته شد — با تشکر از خریدت", kind: "success" });
      setDeliverOpen(false);
      invalidate();
    } catch (e) {
      show({ text: e instanceof Error ? e.message : "ثبت نشد", kind: "error" });
    } finally {
      setBusy(false);
    }
  };

  const reorder = () => {
    if (!o.seller.slug) return;
    const seed = o.items.filter((it) => it.listingId).map((it) => ({ listingId: it.listingId!, qty: it.qty }));
    orderItemsSeed(o.seller.slug, seed);
    router.push(`/c/${o.seller.slug}`);
    show({ text: "به کاتالوک تأمین‌کننده برگشتی — اقلام همان سفارش در سبد است، قیمت‌ها تازه", kind: "info" });
  };

  const archive = async () => {
    setBusy(true);
    try {
      await ordersApi.archiveOrder(bizId, o.id);
      show({ text: "بایگانی شد", kind: "success" });
      invalidate();
    } catch (e) {
      show({ text: e instanceof Error ? e.message : "بایگانی نشد", kind: "error" });
    } finally {
      setBusy(false);
    }
  };

  const facts: Array<[string, React.ReactNode]> = [
    ["تأمین‌کننده", o.seller.name],
    ["شمار اقلام", `${num(o.items.length, "fa")} قلم`],
    ["جمع کل", <b key="t" className="tabular-nums text-arm-strong">{p.amount} {p.label}</b>],
  ];
  if (o.pay) facts.push(["شرایط پرداخت", payTx(o.pay)]);
  if (o.dlv) facts.push(["روش تحویل", dlvTx(o.dlv)]);
  if (o.docNo != null) facts.push(["شمارهٔ سند", num(o.docNo, "fa")]);

  return (
    <AppShell arm="buy" title="جزئیات سفارش" back="/buy/orders" wide>
      <div className="flex flex-col gap-4">
        {/* هدر وضعیت */}
        <div className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-4">
          <OrderStatusBadge status={o.status} />
          <div className="min-w-0 flex-1">
            <b className="block truncate text-[14px] font-bold text-text">{o.seller.name}</b>
            <small className="text-[11px] text-text-3">ثبت: {timeAgo(o.createdAt)}</small>
          </div>
          <div className="shrink-0 text-end">
            <b className="block text-[16px] font-black tabular-nums leading-none text-text">{p.amount}</b>
            <small className="text-[10.5px] text-text-3">{p.label}</small>
          </div>
        </div>

        {/* اقلام (فریز) */}
        <section className="flex flex-col gap-2">
          <h2 className="px-1 text-[13px] font-black text-text-2">اقلام سفارش</h2>
          <div className="rounded-2xl border border-line bg-surface px-4 py-2">
            {o.items.map((it, i) => {
              const ip = parts(it.unitPriceMinor, o.currency);
              return (
                <div key={i} className="flex items-center gap-3 border-b border-line/60 py-3 last:border-0 last:pb-2">
                  <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-surface-2 text-[17px] font-black text-text-4/70">
                    {it.name.slice(0, 1)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <b className="block truncate text-[13px] font-bold text-text">{it.name}</b>
                    {it.pack && <small className="block truncate text-[11px] text-text-3">{it.pack}</small>}
                  </div>
                  <small className="shrink-0 text-[11.5px] tabular-nums text-text-3">
                    {num(it.qty, "fa")} × {ip.amount}
                  </small>
                  <b className="shrink-0 text-[13px] font-black tabular-nums text-text">
                    {parts(it.unitPriceMinor * it.qty, o.currency).amount}
                  </b>
                </div>
              );
            })}
            <OrderTotalRow o={o} tone="arm" />
          </div>
        </section>

        {/* مشخصات */}
        <div className="rounded-2xl border border-line bg-surface px-4 py-1">
          {facts.map(([k, v], i) => (
            <div key={i} className="flex items-baseline justify-between gap-3 border-b border-line/60 py-2.5 last:border-0">
              <span className="shrink-0 text-[11.5px] text-text-3">{k}</span>
              <span className="min-w-0 text-end text-[12.5px] font-bold text-text-2">{v}</span>
            </div>
          ))}
        </div>

        {/* اسناد سفارش (FD-37) — فاکتور پس از پذیرش، برگه پس از ارسال */}
        {canDocs && <OrderDocsCard o={o} side="buy" />}

        {/* یادداشت‌ها */}
        {o.note && (
          <div className="flex items-start gap-2.5 rounded-2xl border border-blue/25 bg-blue-soft/50 p-3.5">
            <Icon name="msg" size={16} className="mt-0.5 shrink-0 text-blue" />
            <div>
              <b className="text-[12px] font-bold text-text-2">یادداشت تو برای فروشنده:</b>
              <p className="mt-0.5 text-[12px] leading-5 text-text-2">{o.note}</p>
            </div>
          </div>
        )}
        {o.sellerNote && (
          <div className="flex items-start gap-2.5 rounded-2xl border border-green/25 bg-green-soft/40 p-3.5">
            <Icon name="check" size={16} className="mt-0.5 shrink-0 text-green" />
            <div>
              <b className="text-[12px] font-bold text-text-2">یادداشت فروشنده:</b>
              <p className="mt-0.5 text-[12px] leading-5 text-text-2">{o.sellerNote}</p>
            </div>
          </div>
        )}

        {/* خط زمانی */}
        <section className="flex flex-col gap-2">
          <h2 className="px-1 text-[13px] font-black text-text-2">مسیر سفارش</h2>
          <div className="rounded-2xl border border-line bg-surface p-4">
            <OrderTimeline o={o} />
          </div>
        </section>

        {/* راهنمای وضعیت */}
        {o.status === "NEW" && (
          <div className="flex items-start gap-2.5 rounded-2xl border border-line bg-surface p-3.5">
            <Icon name="clock" size={16} className="mt-0.5 shrink-0 text-text-3" />
            <p className="text-[12px] leading-5 text-text-2">
              در انتظار پاسخ فروشنده — تا قبل از «ارسال» می‌توانی لغو کنی.
            </p>
          </div>
        )}
        {o.status === "SENT" && (
          <div className="flex items-start gap-2.5 rounded-2xl border border-line bg-surface p-3.5">
            <Icon name="truck" size={17} className="mt-0.5 shrink-0 text-arm-strong" />
            <p className="text-[12px] leading-5 text-text-2">
              کالا در راه است — بعد از گرفتن، «تأیید تحویل» را بزن تا سفارش بسته شود.
            </p>
          </div>
        )}
        <DeliverDeadlineNote o={o} />
        {o.status === "DELIVERED" && (
          <div className="flex flex-col gap-2.5 rounded-2xl border border-green/30 bg-green-soft/40 p-4">
            <div className="flex items-start gap-2.5">
              <Icon name="check" size={18} className="mt-0.5 shrink-0 text-green" />
              <p className="text-[12px] leading-5 text-text-2">
                این سفارش تحویل شد و بسته است — با «سفارش دوباره» همان اقلام را می‌توانی سفارش بدهی.
              </p>
            </div>
            {!o.archivedAt && (
              <Button variant="outline" block disabled={busy} onClick={() => void archive()}>
                <Icon name="archive" size={16} />
                بایگانی از فهرست
              </Button>
            )}
          </div>
        )}

        <div className="flex items-start gap-2.5 rounded-2xl border border-line bg-surface p-3.5">
          <Icon name="info" size={16} className="mt-0.5 shrink-0 text-blue" />
          <p className="text-[11.5px] leading-5 text-text-2">
            پرداخت و تحویل مستقیم با تأمین‌کننده هماهنگ می‌شود — آی‌مچ پولی جابه‌جا نمی‌کند.
          </p>
        </div>
      </div>

      {/* اکشن‌بار */}
      {isCurrent && (
        <div className="sticky inset-x-0 bottom-0 z-20 -mx-4 border-t border-line bg-bg/95 p-4 backdrop-blur-sm">
          <div className="mx-auto flex max-w-3xl gap-2.5">
            {["NEW", "ACCEPTED"].includes(o.status) && (
              <Button variant="outline" size="xl" className="flex-[.7]" onClick={() => setCancelOpen(true)}>
                <Icon name="trash" size={16} />
                لغو سفارش
              </Button>
            )}
            <Button
              variant="outline"
              size="xl"
              className="flex-1"
              onClick={() =>
                void startChat({
                  withBusinessId: o.seller.id,
                  context: { type: "ORDER", refId: String(id) },
                })
              }
            >
              <Icon name="msg" size={17} />
              گفتگو با تأمین‌کننده
            </Button>
            {o.status === "SENT" && (
              <Button variant="arm" size="xl" className="flex-[1.3]" onClick={() => setDeliverOpen(true)}>
                <Icon name="check" size={18} />
                تأیید تحویل
              </Button>
            )}
          </div>
        </div>
      )}
      {o.status === "DELIVERED" && (
        <div className="sticky inset-x-0 bottom-0 z-20 -mx-4 border-t border-line bg-bg/95 p-4 backdrop-blur-sm">
          <div className="mx-auto flex max-w-3xl">
            <Button variant="arm" size="xl" block onClick={reorder}>
              <Icon name="cart-add" size={18} />
              سفارش دوباره
            </Button>
          </div>
        </div>
      )}

      {/* تأیید لغو */}
      <Sheet open={cancelOpen} onClose={() => setCancelOpen(false)} title="لغو سفارش">
        <div className="flex flex-col gap-4 p-4 pt-0">
          <p className="text-[12.5px] leading-6 text-text-2">
            «{title}» لغو می‌شود و تأمین‌کننده خبردار می‌شود.
          </p>
          <div className="flex gap-2.5">
            <Button variant="outline" size="xl" className="flex-1" onClick={() => setCancelOpen(false)}>
              انصراف
            </Button>
            <Button variant="arm" size="xl" className="flex-1" loading={busy} onClick={() => void cancel()}>
              لغو سفارش
            </Button>
          </div>
        </div>
      </Sheet>

      {/* تأیید تحویل */}
      <Sheet open={deliverOpen} onClose={() => setDeliverOpen(false)} title="تأیید تحویل">
        <div className="flex flex-col gap-4 p-4 pt-0">
          <p className="text-[12.5px] leading-6 text-text-2">کالا را گرفتی؟ سفارش بسته می‌شود و به بایگانی می‌رود.</p>
          <div className="flex gap-2.5">
            <Button variant="outline" size="xl" className="flex-1" onClick={() => setDeliverOpen(false)}>
              انصراف
            </Button>
            <Button variant="arm" size="xl" className="flex-1" loading={busy} onClick={() => void deliver()}>
              بله، تحویل گرفتم
            </Button>
          </div>
        </div>
      </Sheet>
    </AppShell>
  );
}
