"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AuthGate } from "@/components/imach/auth-gate";
import { AppShell } from "@/components/imach/app-shell";
import { Icon } from "@/components/ui/icon";
import { Sheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { EmptyState, Spinner } from "@/components/ui/feedback";
import { useToast } from "@/components/ui/toast";
import { useMoney } from "@/components/imach/prefs-context";
import { useAuthStore } from "@/lib/auth-store";
import { ordersApi, type OrderDto } from "@/lib/api";
import { num, timeAgo } from "@/lib/format";
import { OrderStatusBadge, orderTitleTx, orderTotalMinor } from "@/components/imach/order-shared";

/**
 * `/buy/orders` — اسکرین ۲۸: سفارش‌های من (خریدار · M5).
 *
 * · دو بخش: جاری (ثبت/پذیرفته/ارسال) + بایگانی (تحویل/رد/لغو) — شمارندهٔ
 *   زیرعنوان زنده است. سفارش‌های سبد کاتالوگ همین‌جا می‌آیند.
 * · منوی چرخهٔ ردیف جاری: لغو سفارش (تا قبل از ارسال) · گفتگو · بایگانی
 *   (فقط پایان‌یافته‌ها).
 * · «وضعیت هر سفارش همین‌جا به‌روز می‌شود؛ پرداخت و تحویل مستقیماً با
 *   تأمین‌کننده هماهنگ می‌شود» (hint پروتوتایپ).
 *
 * قانون مالک M2: فرم فارسی، متن‌ها همین‌جا (فریز i18n).
 */

export default function BuyOrdersPage() {
  return (
    <AuthGate>
      <BuyOrders />
    </AuthGate>
  );
}

function BuyOrders() {
  const router = useRouter();
  const qc = useQueryClient();
  const { show } = useToast();
  const { parts } = useMoney();
  const businesses = useAuthStore((s) => s.businesses);
  const bizId = businesses[0]?.id ?? "";

  const ordersQ = useQuery({
    queryKey: ["orders", "buy", bizId],
    queryFn: () => ordersApi.getOrders(bizId, "buy"),
    enabled: !!bizId,
  });

  const [menuFor, setMenuFor] = useState<OrderDto | null>(null);
  const [busy, setBusy] = useState(false);

  const orders = useMemo(() => ordersQ.data?.orders ?? [], [ordersQ.data]);
  const cur = orders.filter((o) => ["NEW", "ACCEPTED", "SENT"].includes(o.status));
  const arch = orders.filter((o) => ["DELIVERED", "REJECTED", "CANCELLED"].includes(o.status));

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ["orders"] });
  };

  const cancel = async (o: OrderDto) => {
    setBusy(true);
    try {
      await ordersApi.cancelOrder(bizId, o.id);
      show({ text: "سفارش لغو شد — تأمین‌کننده خبردار شد", kind: "error" });
      invalidate();
      setMenuFor(null);
    } catch (e) {
      show({ text: e instanceof Error ? e.message : "لغو نشد", kind: "error" });
    } finally {
      setBusy(false);
    }
  };

  const archive = async (o: OrderDto) => {
    setBusy(true);
    try {
      await ordersApi.archiveOrder(bizId, o.id);
      show({ text: "بایگانی شد", kind: "success" });
      invalidate();
      setMenuFor(null);
    } catch (e) {
      show({ text: e instanceof Error ? e.message : "بایگانی نشد", kind: "error" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <AppShell arm="buy" title="سفارش‌های من" back="/home">
      <div className="flex flex-col gap-4">
        {ordersQ.isLoading ? (
          <div className="grid place-items-center py-16">
            <Spinner />
          </div>
        ) : orders.length === 0 ? (
          <EmptyState
            icon={<Icon name="basket" size={30} />}
            title="هنوز سفارشی نداری"
            subtitle="از کاتالوگ تأمین‌کننده‌هایت سفارش بده — همه‌شان همین‌جا پیگیری می‌شود."
          />
        ) : (
          <>
            <p className="px-1 text-[12px] font-bold text-text-3">
              {cur.length ? `${num(cur.length, "fa")} سفارش جاری` : "سفارش جاری نداری"}
            </p>
            <RowSection title="جاری" rows={cur} first />
            {arch.length > 0 && <RowSection title="بایگانی" rows={arch} />}
            <div className="mt-1 flex items-start gap-2.5 rounded-2xl border border-line bg-surface p-3.5">
              <Icon name="info" size={16} className="mt-0.5 shrink-0 text-blue" />
              <p className="text-[11.5px] leading-5 text-text-2">
                وضعیت هر سفارش همین‌جا به‌روز می‌شود؛ پرداخت و تحویل مستقیماً با تأمین‌کننده هماهنگ می‌شود.
              </p>
            </div>
          </>
        )}
      </div>

      {/* منوی گزینه‌های سفارش (شیت — قانون موبایل) */}
      <Sheet open={!!menuFor} onClose={() => setMenuFor(null)} title="گزینه‌های سفارش">
        {menuFor && (
          <div className="flex flex-col gap-2 p-4 pt-0">
            <p className="mb-1 text-[12px] leading-5 text-text-3">{orderTitleTx(menuFor.items)}</p>
            {["NEW", "ACCEPTED"].includes(menuFor.status) && (
              <Button variant="outline" block disabled={busy} onClick={() => void cancel(menuFor)}>
                <Icon name="trash" size={16} className="text-red" />
                لغو سفارش
              </Button>
            )}
            <button
              type="button"
              onClick={() => {
                setMenuFor(null);
                router.push("/msgs");
              }}
              className="flex items-center gap-3 rounded-xl border border-line bg-surface p-3.5 text-start transition-colors hover:border-line-2"
            >
              <span className="grid size-10 place-items-center rounded-full bg-primary-soft text-primary-strong">
                <Icon name="msg" size={18} />
              </span>
              <span className="min-w-0 flex-1">
                <b className="block text-[13.5px] font-bold text-text">گفتگو با تأمین‌کننده</b>
                <small className="text-[11px] text-text-3">هماهنگی ارسال و پرداخت</small>
              </span>
            </button>
            {["DELIVERED", "REJECTED", "CANCELLED"].includes(menuFor.status) && !menuFor.archivedAt && (
              <button
                type="button"
                disabled={busy}
                onClick={() => void archive(menuFor)}
                className="flex items-center gap-3 rounded-xl border border-line bg-surface p-3.5 text-start transition-colors hover:border-line-2 disabled:opacity-50"
              >
                <span className="grid size-10 place-items-center rounded-full bg-surface-2 text-text-3">
                  <Icon name="archive" size={19} />
                </span>
                <span className="min-w-0 flex-1">
                  <b className="block text-[13.5px] font-bold text-text">بایگانی</b>
                  <small className="text-[11px] text-text-3">از فهرست می‌افتد؛ تاریخچه می‌ماند</small>
                </span>
              </button>
            )}
          </div>
        )}
      </Sheet>
    </AppShell>
  );

  function RowSection({ title, rows, first }: { title: string; rows: OrderDto[]; first?: boolean }) {
    if (rows.length === 0) return null;
    return (
      <section className={first ? "flex flex-col gap-2.5" : "mt-1 flex flex-col gap-2.5"}>
        <h2 className="px-1 text-[13px] font-black text-text-2">{title}</h2>
        {rows.map((o) => {
          const p = parts(orderTotalMinor(o), o.currency);
          const canMenu =
            (["NEW", "ACCEPTED"].includes(o.status) ||
              (["DELIVERED", "REJECTED", "CANCELLED"].includes(o.status) && !o.archivedAt));
          return (
            <div
              key={o.id}
              className={`flex items-center gap-3 rounded-2xl border border-line bg-surface p-3.5 transition-[border-color,box-shadow] hover:border-line-2 hover:shadow-[0_10px_30px_rgba(31,29,26,.06)] ${o.archivedAt ? "opacity-90" : ""}`}
            >
              <button
                type="button"
                onClick={() => router.push(`/buy/orders/${o.id}`)}
                className="flex min-w-0 flex-1 items-center gap-3 text-start"
              >
                <span className="grid size-[52px] shrink-0 place-items-center rounded-xl bg-surface-2 text-[22px] font-black text-text-4/70">
                  {(o.items[0]?.name ?? "؟").slice(0, 1)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-1.5">
                    <b className="truncate text-[14.5px] font-bold text-text">{orderTitleTx(o.items)}</b>
                    <OrderStatusBadge status={o.status} />
                  </span>
                  <span className="mt-1 flex flex-wrap items-center gap-2 text-[11.5px] text-text-3">
                    <span className="font-bold">{o.seller.name}</span>
                    <span aria-hidden>·</span>
                    <span>{timeAgo(o.createdAt)}</span>
                    <span aria-hidden>·</span>
                    <span className="tabular-nums">
                      {p.amount} {p.label}
                    </span>
                  </span>
                </span>
              </button>
              {canMenu ? (
                <button
                  type="button"
                  aria-label="گزینه‌های سفارش"
                  onClick={() => setMenuFor(o)}
                  className="grid size-9 shrink-0 place-items-center rounded-full text-text-3 transition-colors hover:bg-surface-2 hover:text-text-2"
                >
                  <Icon name="dots" size={18} />
                </button>
              ) : (
                <Icon name="chev" size={16} className="shrink-0 text-text-4 rtl:-scale-x-100" />
              )}
            </div>
          );
        })}
      </section>
    );
  }
}
