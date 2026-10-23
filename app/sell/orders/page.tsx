"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { AuthGate } from "@/components/imach/auth-gate";
import { AppShell } from "@/components/imach/app-shell";
import { Icon } from "@/components/ui/icon";
import { EmptyState, Spinner } from "@/components/ui/feedback";
import { useMoney } from "@/components/imach/prefs-context";
import { useAuthStore } from "@/lib/auth-store";
import { ordersApi, type OrderDto } from "@/lib/api";
import { num, timeAgo } from "@/lib/format";
import { OrderStatusBadge, orderTitleTx, orderTotalMinor } from "@/components/imach/order-shared";

/**
 * `/sell/orders` — اسکرین ۰۹: سفارش‌های دریافتی (فروشنده · M5).
 *
 * · سه بخش: نیازمند پاسخ (NEW) · در جریان (ACCEPTED/SENT) · بایگانی
 *   (تحویل/رد/لغو) — شمارندهٔ زیرعنوان زنده است.
 * · هر ردیف → نمای سفارش (۱۰) با همان سفارش.
 * · فیلتر مشتری از دفتر مشتری (۰۸) در M6 وصل می‌شود.
 *
 * قانون مالک M2: فرم فارسی، متن‌ها همین‌جا (فریز i18n).
 */

export default function SellOrdersPage() {
  return (
    <AuthGate>
      <SellOrders />
    </AuthGate>
  );
}

function SellOrders() {
  const router = useRouter();
  const { parts } = useMoney();
  const businesses = useAuthStore((s) => s.businesses);
  const bizId = businesses[0]?.id ?? "";

  const ordersQ = useQuery({
    queryKey: ["orders", "sell", bizId],
    queryFn: () => ordersApi.getOrders(bizId, "sell"),
    enabled: !!bizId,
  });

  const orders = useMemo(() => ordersQ.data?.orders ?? [], [ordersQ.data]);
  const nw = orders.filter((o) => o.status === "NEW");
  const mid = orders.filter((o) => ["ACCEPTED", "SENT"].includes(o.status));
  const arch = orders.filter((o) => ["DELIVERED", "REJECTED", "CANCELLED"].includes(o.status));

  return (
    <AppShell arm="sell" title="سفارش‌های رسیده" back="/sell">
      {ordersQ.isLoading ? (
        <div className="grid place-items-center py-16">
          <Spinner />
        </div>
      ) : orders.length === 0 ? (
        <EmptyState
          icon={<Icon name="receipt" size={30} />}
          title="هنوز سفارشی نرسیده"
          subtitle="وقتی خریداران از کاتالوگ تو سفارش ثبت کنند، همین‌جا می‌آید — با شمارهٔ مشتری، قلم‌ها و مبلغ."
        />
      ) : (
        <div className="flex flex-col gap-4">
          <p className="px-1 text-[12px] font-bold text-text-3">
            {nw.length ? `${num(nw.length, "fa")} سفارش جدید` : "سفارش جدیدی نیست"}
          </p>
          <RowSection title="نیازمند پاسخ" rows={nw} first />
          <RowSection title="در جریان" rows={mid} />
          {arch.length > 0 && <RowSection title="بایگانی" rows={arch} />}
        </div>
      )}
    </AppShell>
  );

  function RowSection({
    title,
    rows,
    first,
  }: {
    title: string;
    rows: OrderDto[];
    first?: boolean;
  }) {
    if (rows.length === 0) return null;
    return (
      <section className={first ? "flex flex-col gap-2.5" : "mt-1 flex flex-col gap-2.5"}>
        <h2 className="px-1 text-[13px] font-black text-text-2">{title}</h2>
        {rows.map((o) => {
          const p = parts(orderTotalMinor(o), o.currency);
          return (
            <button
              key={o.id}
              type="button"
              onClick={() => router.push(`/sell/orders/${o.id}`)}
              className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-3.5 text-start transition-[border-color,box-shadow] hover:border-line-2 hover:shadow-[0_10px_30px_rgba(31,29,26,.06)]"
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
                  <span className="font-bold">{o.buyer.name}</span>
                  <span aria-hidden>·</span>
                  <span>{timeAgo(o.createdAt)}</span>
                  <span aria-hidden>·</span>
                  <span className="tabular-nums">
                    {p.amount} {p.label}
                  </span>
                </span>
              </span>
              <Icon name="chev" size={16} className="shrink-0 text-text-4 rtl:-scale-x-100" />
            </button>
          );
        })}
      </section>
    );
  }
}
