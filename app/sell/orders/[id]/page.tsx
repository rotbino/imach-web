"use client";

import { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AuthGate } from "@/components/imach/auth-gate";
import { AppShell } from "@/components/imach/app-shell";
import { Icon } from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/input";
import { Spinner } from "@/components/ui/feedback";
import { useToast } from "@/components/ui/toast";
import { useMoney } from "@/components/imach/prefs-context";
import { useAuthStore } from "@/lib/auth-store";
import { ordersApi, type OrderDto } from "@/lib/api";
import { num, timeAgo } from "@/lib/format";
import { payTx, dlvTx } from "@/components/imach/rfq-shared";
import {
  DeliverDeadlineNote,
  OrderStatusBadge,
  OrderTimeline,
  OrderTotalRow,
  orderTotalMinor,
} from "@/components/imach/order-shared";
import { OrderDocsCard } from "@/components/imach/order-doc";

/**
 * `/sell/orders/[id]` — اسکرین ۱۰: جزئیات سفارش (فروشنده · M5).
 *
 * · هدر وضعیت + اقلام + مشخصات + اسناد + خط زمانی — همان روایت ۳۹.
 * · NEW: فرم پذیرش — مقدار/قیمت هر قلم قابل‌اصلاح (README §۵.۵) + یادداشت
 *   برای مشتری؛ یا رد.
 * · ACCEPTED: «ارسال شد» (مهلت ۷روزه از همین لحظه) + گفتگو با مشتری.
 * · SENT: در انتظار تأیید تحویل مشتری — جملهٔ کهربایی مهلت.
 *
 * قانون مالک M2: فرم فارسی، متن‌ها همین‌جا (فریز i18n).
 */

export default function SellOrderViewPage() {
  return (
    <AuthGate>
      <SellOrderView />
    </AuthGate>
  );
}

function SellOrderView() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const { show } = useToast();
  const { parts } = useMoney();
  const businesses = useAuthStore((s) => s.businesses);
  const bizId = businesses[0]?.id ?? "";

  const orderQ = useQuery({
    queryKey: ["orders", "detail", bizId, id],
    queryFn: () => ordersApi.getOrder(bizId, id),
    enabled: !!bizId && !!id,
  });
  const o = orderQ.data;

  const [busy, setBusy] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [sendOpen, setSendOpen] = useState(false);
  // فرم پذیرش — مقدار/قیمت قابل‌اصلاح (فقط NEW)؛ ورودی تومان (قرارداد majorToMinor)
  const [edits, setEdits] = useState<{ qty: string; price: string }[] | null>(null);
  const [note, setNote] = useState("");

  const liveItems = useMemo(() => {
    if (!o) return [];
    if (!edits) return o.items;
    return o.items.map((it, i) => {
      const e = edits[i];
      const qty = parseInt(e?.qty ?? "", 10);
      const price = parseInt(e?.price ?? "", 10);
      return {
        ...it,
        qty: Number.isFinite(qty) && qty > 0 ? qty : it.qty,
        unitPriceMinor: Number.isFinite(price) && e?.price ? price * 10 : it.unitPriceMinor,
      };
    });
  }, [o, edits]);

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ["orders"] });
  };

  if (orderQ.isLoading) {
    return (
      <AppShell arm="sell" title="جزئیات سفارش" back="/sell/orders">
        <div className="grid place-items-center py-16">
          <Spinner />
        </div>
      </AppShell>
    );
  }
  if (!o) {
    return (
      <AppShell arm="sell" title="جزئیات سفارش" back="/sell/orders">
        <div className="p-6 text-center text-[13px] text-text-3">سفارش پیدا نشد.</div>
      </AppShell>
    );
  }

  const p = parts(orderTotalMinor(o), o.currency);
  const isNew = o.status === "NEW";
  const canDocs = ["ACCEPTED", "SENT", "DELIVERED"].includes(o.status);

  const beginAccept = () => {
    setEdits(o.items.map((it) => ({ qty: String(it.qty), price: String(Math.round(it.unitPriceMinor / 10)) })));
    setNote("");
    setTimeout(() => document.getElementById("ord-accept-form")?.scrollIntoView({ behavior: "smooth", block: "center" }), 80);
  };

  const accept = async () => {
    if (!edits) return;
    setBusy(true);
    try {
      const r = await ordersApi.acceptOrder(bizId, o.id, {
        edits: o.items.map((_it, i) => {
          const qty = parseInt(edits[i]!.qty, 10);
          const price = parseInt(edits[i]!.price, 10);
          return {
            ...(Number.isFinite(qty) && qty > 0 ? { qty } : {}),
            ...(Number.isFinite(price) && price >= 0 ? { unitPriceMinor: price * 10 } : {}),
          };
        }),
        note: note.trim() || undefined,
      });
      show({
        text: `سفارش پذیرفته شد — فاکتور شمارهٔ ${num(r.docNo ?? 0, "fa")} صادر شد؛ مشتری خبردار شد`,
        kind: "success",
      });
      setEdits(null);
      invalidate();
    } catch (e) {
      show({ text: e instanceof Error ? e.message : "پذیرش ثبت نشد", kind: "error" });
    } finally {
      setBusy(false);
    }
  };

  const reject = async () => {
    setBusy(true);
    try {
      await ordersApi.rejectOrder(bizId, o.id);
      show({ text: "سفارش رد شد", kind: "error" });
      setRejectOpen(false);
      invalidate();
    } catch (e) {
      show({ text: e instanceof Error ? e.message : "رد نشد", kind: "error" });
    } finally {
      setBusy(false);
    }
  };

  const send = async () => {
    setBusy(true);
    try {
      await ordersApi.sendOrder(bizId, o.id);
      show({ text: "وضعیت: ارسال‌شده — در انتظار تأیید تحویل مشتری", kind: "success" });
      setSendOpen(false);
      invalidate();
    } catch (e) {
      show({ text: e instanceof Error ? e.message : "ثبت نشد", kind: "error" });
    } finally {
      setBusy(false);
    }
  };

  const facts: Array<[string, React.ReactNode]> = [
    ["مشتری", o.buyer.name],
    ["شمار اقلام", `${num(o.items.length, "fa")} قلم`],
    ["جمع کل", <b key="t" className="tabular-nums text-primary-strong">{p.amount} {p.label}</b>],
  ];
  if (o.pay) facts.push(["شرایط پرداخت", payTx(o.pay)]);
  if (o.dlv) facts.push(["روش تحویل", dlvTx(o.dlv)]);

  return (
    <AppShell arm="sell" title="جزئیات سفارش" back="/sell/orders" wide>
      <div className="flex flex-col gap-4">
        {/* هدر وضعیت */}
        <div className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-4">
          <OrderStatusBadge status={o.status} />
          <div className="min-w-0 flex-1">
            <b className="block truncate text-[14px] font-bold text-text">{o.buyer.name}</b>
            <small className="text-[11px] text-text-3">ثبت: {timeAgo(o.createdAt)}</small>
          </div>
          <div className="shrink-0 text-end">
            <b className="block text-[16px] font-black tabular-nums leading-none text-text">{p.amount}</b>
            <small className="text-[10.5px] text-text-3">{p.label}</small>
          </div>
        </div>

        {/* اقلام — NEW: قابل‌اصلاح (فرم پذیرش) · پس از آن فریز */}
        <section className="flex flex-col gap-2">
          <h2 className="px-1 text-[13px] font-black text-text-2">{isNew ? "اقلام سفارش" : "اقلام توافق‌شده"}</h2>
          <div className="rounded-2xl border border-line bg-surface px-4 py-2">
            {liveItems.map((it, i) => {
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
                  {edits ? (
                    <div className="flex shrink-0 flex-col gap-1.5 sm:flex-row">
                      <label className="flex items-center gap-1 rounded-xl border border-line bg-bg px-2 py-1.5">
                        <input
                          type="tel"
                          inputMode="numeric"
                          value={edits[i]?.qty ?? ""}
                          onChange={(e) => setEdits((prev) => prev!.map((x, j) => (j === i ? { ...x, qty: e.target.value.replace(/[^0-9]/g, "") } : x)))}
                          className="w-14 bg-transparent text-[12.5px] font-bold tabular-nums text-text outline-none"
                          aria-label="مقدار"
                        />
                        <small className="text-[10px] text-text-4">عدد</small>
                      </label>
                      <label className="flex items-center gap-1 rounded-xl border border-line bg-bg px-2 py-1.5">
                        <input
                          type="tel"
                          inputMode="numeric"
                          value={edits[i]?.price ?? ""}
                          onChange={(e) => setEdits((prev) => prev!.map((x, j) => (j === i ? { ...x, price: e.target.value.replace(/[^0-9]/g, "") } : x)))}
                          className="w-20 bg-transparent text-[12.5px] font-bold tabular-nums text-text outline-none"
                          aria-label="قیمت واحد تومان"
                        />
                        <small className="text-[10px] text-text-4">ت/واحد</small>
                      </label>
                    </div>
                  ) : (
                    <>
                      <small className="shrink-0 text-[11.5px] tabular-nums text-text-3">
                        {num(it.qty, "fa")} × {ip.amount}
                      </small>
                      <b className="shrink-0 text-[13px] font-black tabular-nums text-text">
                        {parts(it.unitPriceMinor * it.qty, o.currency).amount}
                      </b>
                    </>
                  )}
                </div>
              );
            })}
            {edits ? (
              <div className="mt-2 flex items-center justify-between gap-3 rounded-xl bg-surface-2/70 px-3.5 py-2.5">
                <span className="text-[12px] font-bold text-text-3">جمع با اصلاحات</span>
                <b className="text-[15px] font-black tabular-nums text-primary-strong">
                  {parts(liveItems.reduce((s, f) => s + f.unitPriceMinor * f.qty, 0), o.currency).amount}{" "}
                  <small className="text-[11px] font-bold text-text-3">{parts(0, o.currency).label}</small>
                </b>
              </div>
            ) : (
              <OrderTotalRow o={o} />
            )}
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

        {/* اسناد سفارش (FD-37) */}
        {canDocs && <OrderDocsCard o={o} side="sell" />}

        {/* یادداشت مشتری */}
        {o.note && (
          <div className="flex items-start gap-2.5 rounded-2xl border border-blue/25 bg-blue-soft/50 p-3.5">
            <Icon name="msg" size={16} className="mt-0.5 shrink-0 text-blue" />
            <div>
              <b className="text-[12px] font-bold text-text-2">توضیحات مشتری:</b>
              <p className="mt-0.5 text-[12px] leading-5 text-text-2">{o.note}</p>
            </div>
          </div>
        )}

        {/* یادداشت خودِ فروشنده (پس از پذیرش) */}
        {o.sellerNote && (
          <div className="flex items-start gap-2.5 rounded-2xl border border-green/25 bg-green-soft/40 p-3.5">
            <Icon name="check" size={16} className="mt-0.5 shrink-0 text-green" />
            <div>
              <b className="text-[12px] font-bold text-text-2">یادداشت تو برای مشتری:</b>
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

        {/* فرم پذیرش (NEW) */}
        {isNew && !edits && (
          <div id="ord-accept-form" className="flex flex-col gap-3 rounded-2xl border border-primary/25 bg-primary-soft/30 p-4">
            <h2 className="text-[13px] font-black text-text">پذیرش سفارش</h2>
            <p className="text-[12px] leading-5 text-text-2">
              مقدار و قیمت هر قلم را در صورت توافق متفاوت، همان بالا اصلاح کن — مشتری شرایط نهایی را می‌بیند.
            </p>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="یادداشت برای مشتری — مثلاً: ارسال فردا صبح، راننده آقای محمدی"
              rows={2}
            />
            <div className="flex gap-2.5">
              <Button variant="outline" size="xl" className="flex-[.7]" onClick={() => setRejectOpen(true)}>
                <Icon name="trash" size={16} />
                رد
              </Button>
              <Button variant="primary" size="xl" className="flex-[1.3]" onClick={beginAccept}>
                <Icon name="check" size={17} />
                پذیرش سفارش
              </Button>
            </div>
          </div>
        )}

        {/* تأیید نهایی اصلاحات */}
        {isNew && edits && (
          <div className="flex flex-col gap-3 rounded-2xl border border-primary/25 bg-primary-soft/30 p-4">
            <p className="text-[12px] leading-5 text-text-2">
              اعداد اصلاح‌شده را بالا ببین و تأیید کن — این مقادیر فریز می‌شوند و فاکتور با همین‌ها صادر می‌شود.
            </p>
            <div className="flex gap-2.5">
              <Button variant="outline" size="xl" className="flex-1" onClick={() => setEdits(null)}>
                بازگشت
              </Button>
              <Button variant="primary" size="xl" className="flex-1" loading={busy} onClick={() => void accept()}>
                <Icon name="check" size={17} />
                تأیید و پذیرش
              </Button>
            </div>
          </div>
        )}

        {o.status === "ACCEPTED" && (
          <div className="flex items-start gap-2.5 rounded-2xl border border-line bg-surface p-3.5">
            <Icon name="truck" size={17} className="mt-0.5 shrink-0 text-primary-strong" />
            <p className="text-[12px] leading-5 text-text-2">
              کالا را که فرستادی، «ارسال شد» را بزن — مشتری بعد از تحویل، سفارش را می‌بندد.
            </p>
          </div>
        )}

        <DeliverDeadlineNote o={o} />
      </div>

      {/* اکشن‌بار — NEW: رد/گفتگو/پذیرش · ACCEPTED: ارسال شد */}
      {(isNew || o.status === "ACCEPTED") && (
        <div className="sticky inset-x-0 bottom-0 z-20 -mx-4 border-t border-line bg-bg/95 p-4 backdrop-blur-sm">
          <div className="mx-auto flex max-w-3xl gap-2.5">
            {isNew ? (
              <>
                <Button variant="outline" size="xl" className="flex-[.65]" onClick={() => setRejectOpen(true)}>
                  <Icon name="trash" size={16} />
                  رد
                </Button>
                <Button variant="outline" size="xl" className="flex-[.8]" onClick={() => router.push("/msgs")}>
                  <Icon name="msg" size={17} />
                  گفتگو
                </Button>
                <Button variant="primary" size="xl" className="flex-[1.35]" onClick={beginAccept}>
                  <Icon name="check" size={18} />
                  پذیرش سفارش
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" size="xl" className="flex-1" onClick={() => router.push("/msgs")}>
                  <Icon name="msg" size={17} />
                  گفتگو با مشتری
                </Button>
                <Button variant="primary" size="xl" className="flex-[1.35]" onClick={() => setSendOpen(true)}>
                  <Icon name="truck" size={18} />
                  ارسال شد
                </Button>
              </>
            )}
          </div>
        </div>
      )}

      {/* تأیید رد */}
      <Sheet open={rejectOpen} onClose={() => setRejectOpen(false)} title="رد سفارش">
        <div className="flex flex-col gap-4 p-4 pt-0">
          <p className="text-[12.5px] leading-6 text-text-2">
            مطمئنی نمی‌خواهی این سفارش را بپذیری؟ به مشتری اطلاع داده می‌شود.
          </p>
          <div className="flex gap-2.5">
            <Button variant="outline" size="xl" className="flex-1" onClick={() => setRejectOpen(false)}>
              انصراف
            </Button>
            <Button variant="primary" size="xl" className="flex-1" loading={busy} onClick={() => void reject()}>
              رد سفارش
            </Button>
          </div>
        </div>
      </Sheet>

      {/* تأیید ارسال */}
      <Sheet open={sendOpen} onClose={() => setSendOpen(false)} title="ارسال کالا">
        <div className="flex flex-col gap-4 p-4 pt-0">
          <p className="text-[12.5px] leading-6 text-text-2">
            کالا را برای مشتری فرستادی؟ وضعیت «ارسال‌شده» می‌شود و مشتری بعد از تحویل، سفارش را می‌بندد.
          </p>
          <div className="flex gap-2.5">
            <Button variant="outline" size="xl" className="flex-1" onClick={() => setSendOpen(false)}>
              انصراف
            </Button>
            <Button variant="primary" size="xl" className="flex-1" loading={busy} onClick={() => void send()}>
              بله، ارسال شد
            </Button>
          </div>
        </div>
      </Sheet>
    </AppShell>
  );
}
