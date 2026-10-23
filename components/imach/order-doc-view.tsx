"use client";

import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Icon } from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/feedback";
import { useAuthStore } from "@/lib/auth-store";
import { ordersApi } from "@/lib/api";
import { OrderInvoicePaper, OrderSlipPaper } from "@/components/imach/order-doc";

/**
 * صفحهٔ سند سفارش (۴۰ فاکتور / ۴۱ برگهٔ ارسال · M5 · FD-37).
 *
 * · موبایل/دسکتاپ: صفحهٔ مستقل با کاغذ A4 وسچ — چاپ = window.print()
 *   با @media print که فقط .doc-paper را می‌برد.
 * · گاردهای سند: فاکتور پس از پذیرش (docNo صادر شده)؛ برگهٔ ارسال فقط
 *   پس از «ارسال شد» — همان منطق کارت اسناد ۱۰/۳۹.
 * · سند در هر دو سو با BACK به نمای سفارش همان طرف برمی‌گردد.
 */

export function OrderDocView({ side }: { side: "buy" | "sell" }) {
  const { id, kind } = useParams<{ id: string; kind: string }>();
  const router = useRouter();
  const businesses = useAuthStore((s) => s.businesses);
  const bizId = businesses[0]?.id ?? "";

  const orderQ = useQuery({
    queryKey: ["orders", "detail", bizId, id],
    queryFn: () => ordersApi.getOrder(bizId, id),
    enabled: !!bizId && !!id,
  });
  const o = orderQ.data;

  const backHref = side === "buy" ? `/buy/orders/${id}` : `/sell/orders/${id}`;
  const title = kind === "slip" ? "برگهٔ ارسال" : "فاکتور فروش";

  if (orderQ.isLoading) {
    return (
      <div className="grid min-h-dvh place-items-center bg-bg">
        <Spinner />
      </div>
    );
  }

  // سند معنا ندارد: فاکتور فقط با پذیرش (docNo) · برگه فقط با ارسال
  const allowed =
    !!o &&
    (kind === "slip"
      ? ["SENT", "DELIVERED"].includes(o.status)
      : ["ACCEPTED", "SENT", "DELIVERED"].includes(o.status));

  return (
    <div className="min-h-dvh bg-bg" data-doc-page>
      {/* هدر سند — با چاپ مخفی */}
      <div className="doc-no-print sticky top-0 z-10 border-b border-line bg-surface/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-[880px] items-center gap-3">
          <button
            type="button"
            onClick={() => router.push(backHref)}
            aria-label="بازگشت"
            className="grid size-9 place-items-center rounded-full text-text-2 transition-colors hover:bg-surface-2"
          >
            <Icon name="back" size={18} className="rtl:-scale-x-100" />
          </button>
          <h1 className="min-w-0 flex-1 truncate text-[15px] font-black text-text">{title}</h1>
          {allowed && (
            <Button variant="arm" size="md" onClick={() => window.print()}>
              <Icon name="print" size={15} />
              چاپ / PDF
            </Button>
          )}
        </div>
      </div>

      <div className="mx-auto flex max-w-[880px] flex-col gap-3 px-4 py-5">
        {allowed && o ? (
          <>
            {kind === "slip" ? <OrderSlipPaper o={o} /> : <OrderInvoicePaper o={o} />}
            <div className="doc-no-print flex items-start gap-2.5 rounded-2xl border border-line bg-surface p-3.5">
              <Icon name="info" size={16} className="mt-0.5 shrink-0 text-blue" />
              <p className="text-[11.5px] leading-5 text-text-2">
                {kind === "slip"
                  ? "این برگه را همراه بار بفرست — راننده هنگام تحویل کنار هر کالا تیک می‌زند و گیرنده پایینش را امضا می‌کند."
                  : "این فاکتور سفارش است — برای حسابداری و بایگانی از دکمهٔ چاپ، کاغذی یا PDF بگیر."}
              </p>
            </div>
          </>
        ) : (
          <div className="rounded-2xl border border-dashed border-line-2 bg-surface px-4 py-10 text-center text-[13px] text-text-3">
            {kind === "slip"
              ? "برگهٔ ارسال پس از «ارسال شد» آماده می‌شود."
              : "فاکتور پس از پذیرش فروشنده صادر می‌شود."}
          </div>
        )}
      </div>
    </div>
  );
}
