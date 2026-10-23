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
import { marketApi, ordersApi } from "@/lib/api";
import { goodName, num, unitLabel } from "@/lib/format";
import { itemTitleTx, payTx, dlvTx, rfqTitleTx } from "@/components/imach/rfq-shared";

/**
 * `/buy/rfqs/[id]/o/[offerId]` — اسکرین ۲۷: جزئیات پیشنهاد (M4).
 *
 * · کارت فروشنده + قیمت: تک‌قلمی «قیمت هر بسته»؛ چندقلمی «جمع k قلم از n
 *   قلم استعلام» + ردیف «قیمت × مقدار = جمع قلم» برای هر قلم + جمع کل.
 * · مشخصات: درخواست/اقلام/شرایط پرداخت/روش تحویل/مهلت — همان زبان فرم ۱۲.
 * · راه‌های ارتباط: پیام در آی‌مچ · تماس · کاتالوک فروشنده (مستقیم — FD-16).
 * · «پذیرش پیشنهاد» = پایان استعلام (حکم مالک FD-14): تأیید ⇒ استعلام بسته
 *   + نتیجه + اعلان فروشنده. سپس کال‌اوت «ثبت سفارش با همین شرایط» — M5:
 *   POST /orders با قیمت فریز و قلم‌های قیمت‌خورده (تصمیم ۲ FD-22).
 *
 * قانون مالک M2: فرم فارسی، متن‌ها همین‌جا (فریز i18n).
 */

export default function OfferViewPage() {
  return (
    <AuthGate>
      <OfferView />
    </AuthGate>
  );
}

function OfferView() {
  const { id, offerId } = useParams<{ id: string; offerId: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const { show } = useToast();
  const { parts } = useMoney();
  const startChat = useStartChat();
  const businesses = useAuthStore((s) => s.businesses);
  const bizId = businesses[0]?.id ?? "";

  const rfqsQ = useQuery({
    queryKey: ["market", "myrfqs", bizId],
    queryFn: () => marketApi.getMyRfqs(bizId),
    enabled: !!bizId,
  });

  const g = useMemo(
    () => (rfqsQ.data?.groups ?? []).find((x) => x.id === id) ?? null,
    [rfqsQ.data, id]
  );
  const o = useMemo(
    () => (g?.offers ?? []).find((x) => x.id === offerId) ?? null,
    [g, offerId]
  );

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [accepted, setAccepted] = useState<{ resultText: string } | null>(null);
  const [ordering, setOrdering] = useState(false);

  const items = g?.items ?? [];
  const multi = items.length > 1;
  const isOpen = g ? ["OPEN", "COLD"].includes(g.status) : false;
  // پذیرش همین فروشنده؟ (گروه بسته + نتیجه شامل نام او + همین پیشنهاد)
  const acceptedThis =
    !!g && g.status === "CLOSED" && !!g.resultText && !!o && g.resultText.includes(o.seller.name);

  const accept = async () => {
    if (!o) return;
    setBusy(true);
    try {
      const r = await marketApi.acceptOffer(bizId, o.id);
      setAccepted({ resultText: r.resultText });
      setConfirmOpen(false);
      show({ text: "پیشنهاد پذیرفته شد — استعلام بسته شد", kind: "success" });
      await qc.invalidateQueries({ queryKey: ["market", "myrfqs", bizId] });
    } catch (e) {
      show({ text: e instanceof Error ? e.message : "پذیرش ثبت نشد", kind: "error" });
    } finally {
      setBusy(false);
    }
  };

  const orderSoon = async () => {
    if (!o || ordering) return;
    setOrdering(true);
    try {
      const ord = await ordersApi.createFromOffer(bizId, o.id);
      show({ text: "سفارش با شرایط پیشنهاد ثبت شد — فروشنده در دفتر سفارش‌هایش می‌بیند", kind: "success" });
      router.push(`/buy/orders/${ord.id}`);
    } catch (e) {
      show({ text: e instanceof Error ? e.message : "سفارش ثبت نشد", kind: "error" });
    } finally {
      setOrdering(false);
    }
  };

  if (rfqsQ.isLoading) {
    return (
      <AppShell arm="buy" title="جزئیات پیشنهاد" back={`/buy/rfqs/${id}`}>
        <div className="grid place-items-center py-16">
          <Spinner />
        </div>
      </AppShell>
    );
  }

  if (!g || !o) {
    return (
      <AppShell arm="buy" title="جزئیات پیشنهاد" back={`/buy/rfqs/${id}`}>
        <div className="p-6 text-center text-[13px] text-text-3">پیشنهاد پیدا نشد.</div>
      </AppShell>
    );
  }

  const priceTotal = multi ? o.totalMinor : o.priceMinor * (items[0]?.qty ?? 0);
  const p = parts(priceTotal, o.currency);
  const pSingle = parts(o.priceMinor, o.currency);

  const facts: Array<[string, React.ReactNode]> = [
    ["درخواست", rfqTitleTx(itemTitleTx(items))],
    ...items.map((it, i): [string, React.ReactNode] => {
      const price_i = o.prices?.[i] ?? null;
      const pi = price_i != null ? parts(price_i, o.currency) : null;
      return [
        `${it.good ? goodName(it.good, "fa") : "—"} · ${num(it.qty, "fa")} ${it.good?.unit ? unitLabel(it.good.unit, "fa") : ""}`,
        pi ? (
          <span className="tabular-nums">
            {pi.amount} × {num(it.qty, "fa")} = <b className="text-text">{parts(price_i! * it.qty, o.currency).amount}</b>
          </span>
        ) : (
          <span className="text-text-4">این قلم را ندارد</span>
        ),
      ];
    }),
    ["جمع کل", <b key="t" className="tabular-nums text-primary-strong">{p.amount} {p.label}</b>],
    ["شرایط پرداخت", payTx(o.pay)],
    ["روش تحویل", dlvTx(o.dlv)],
  ];
  if (isOpen && g.daysLeft != null) {
    facts.push(["مهلت استعلام", g.daysLeft === 0 ? "امروز آخرین روز" : `${num(g.daysLeft, "fa")} روز مانده`]);
  }

  return (
    <AppShell arm="buy" title="جزئیات پیشنهاد" back={`/buy/rfqs/${id}`} wide>
      <div className="flex flex-col gap-4">
        {/* کارت فروشنده */}
        <div className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-4">
          <span className="grid size-14 shrink-0 place-items-center rounded-full bg-primary-soft text-[20px] font-black text-primary-strong">
            {o.seller.name.slice(0, 1)}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <b className="truncate text-[15px] font-bold text-text">{o.seller.name}</b>
              {o.seller.isVerified && (
                <span className="rounded-full bg-blue-soft px-2 py-0.5 text-[10px] font-bold text-blue">تأییدشده</span>
              )}
            </div>
            <small className="mt-0.5 block text-[11px] text-text-3">
              {o.seller.city ?? "—"} · تأمین‌کننده
            </small>
          </div>
        </div>

        {/* قیمت */}
        <div className="rounded-2xl border border-line bg-surface p-4 text-center">
          <div className="text-[11.5px] text-text-3">
            {multi ? `جمع ${num(o.cover, "fa")} قلم از ${num(items.length, "fa")} قلم استعلام` : "قیمت هر واحد"}
          </div>
          <div className="mt-1 text-[26px] font-black tabular-nums leading-none text-text">
            {multi ? p.amount : pSingle.amount}
            <small className="ms-1 text-[12px] font-bold text-text-3">{multi ? p.label : pSingle.label}</small>
          </div>
          {!multi && items[0]?.qty != null && items[0].qty > 1 && (
            <div className="mt-1.5 text-[11px] text-text-3">
              برای {num(items[0]!.qty, "fa")} عدد: {parts(o.priceMinor * items[0]!.qty, o.currency).amount}
            </div>
          )}
        </div>

        {/* مشخصات */}
        <div className="rounded-2xl border border-line bg-surface px-4 py-1">
          {facts.map(([k, v], i) => (
            <div
              key={i}
              className="flex items-baseline justify-between gap-3 border-b border-line/60 py-2.5 last:border-0"
            >
              <span className="shrink-0 text-[11.5px] text-text-3">{k}</span>
              <span className="min-w-0 text-end text-[12.5px] font-bold text-text-2">{v}</span>
            </div>
          ))}
        </div>

        {/* یادداشت فروشنده */}
        {o.note && (
          <div className="flex items-start gap-2.5 rounded-2xl border border-blue/25 bg-blue-soft/50 p-3.5">
            <Icon name="msg" size={16} className="mt-0.5 shrink-0 text-blue" />
            <div>
              <b className="text-[12px] font-bold text-text-2">یادداشت فروشنده:</b>
              <p className="mt-0.5 text-[12px] leading-5 text-text-2">{o.note}</p>
            </div>
          </div>
        )}

        {/* راه‌های ارتباط */}
        <section className="flex flex-col gap-2">
          <h2 className="px-1 text-[13px] font-black text-text-2">راه‌های ارتباط</h2>
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={() =>
                void startChat({
                  withBusinessId: o.seller.id,
                  context: { type: "OFFER", refId: String(offerId) },
                })
              }
              className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-3.5 text-start transition-colors hover:border-line-2"
            >
              <span className="grid size-10 place-items-center rounded-full bg-primary-soft text-primary-strong">
                <Icon name="msg" size={18} />
              </span>
              <span className="min-w-0 flex-1">
                <b className="block text-[13px] font-bold text-text">پیام در آی‌مچ</b>
                <small className="text-[11px] text-text-3">سریع‌ترین راه — پاسخ فروشنده در همان گفتگو</small>
              </span>
              <Icon name="chev" size={16} className="shrink-0 rotate-180 text-text-4" />
            </button>
            {o.seller.phone && (
              <a
                href={`tel:${o.seller.phone}`}
                dir="ltr"
                className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-3.5 text-start transition-colors hover:border-line-2"
              >
                <span className="grid size-10 place-items-center rounded-full bg-green-soft text-green">
                  <Icon name="phone" size={17} />
                </span>
                <span className="min-w-0 flex-1">
                  <b className="block text-[13px] font-bold text-text">تماس تلفنی</b>
                  <small className="text-[11px] tabular-nums text-text-3">{o.seller.phone}</small>
                </span>
              </a>
            )}
            {o.seller.slug && (
              <button
                type="button"
                onClick={() => router.push(`/c/${o.seller.slug}`)}
                className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-3.5 text-start transition-colors hover:border-line-2"
              >
                <span className="grid size-10 place-items-center rounded-full bg-surface-2 text-text-2">
                  <Icon name="store" size={18} />
                </span>
                <span className="min-w-0 flex-1">
                  <b className="block text-[13px] font-bold text-text">کاتالوگ فروشنده</b>
                  <small className="text-[11px] text-text-3">محصولات دیگر را ببین</small>
                </span>
                <Icon name="chev" size={16} className="shrink-0 rotate-180 text-text-4" />
              </button>
            )}
          </div>
        </section>

        {/* ═══ پیوند پیشنهاد ← سفارش (FD-22 · تصمیم ۲/۹) — پس از پذیرش ═══ */}
        {(accepted || acceptedThis) && (
          <div className="flex flex-col gap-2.5 rounded-2xl border border-green/30 bg-green-soft/40 p-4">
            <div className="flex items-start gap-2.5">
              <Icon name="check" size={18} className="mt-0.5 shrink-0 text-green" />
              <p className="text-[12px] leading-5 text-text-2">
                <b>این پیشنهاد را پذیرفتی.</b> حالا با همین قیمت و شرایط، سفارش ثبت کن — فروشنده در
                دفتر سفارش‌هایش می‌بیند و می‌پذیرد.
              </p>
            </div>
            <Button variant="arm" block loading={ordering} onClick={() => void orderSoon()}>
              <Icon name="receipt" size={17} />
              ثبت سفارش با همین شرایط
            </Button>
          </div>
        )}
      </div>

      {/* اکشن‌بار — پیام + پذیرش (فقط استعلام باز) */}
      {isOpen && !accepted && !acceptedThis && (
        <div className="sticky inset-x-0 bottom-0 z-20 -mx-4 border-t border-line bg-bg/95 p-4 backdrop-blur-sm">
          <div className="mx-auto flex max-w-3xl gap-2.5">
            <Button
              variant="outline"
              size="xl"
              className="flex-[.7]"
              onClick={() =>
                void startChat({
                  withBusinessId: o.seller.id,
                  context: { type: "OFFER", refId: String(offerId) },
                })
              }
            >
              <Icon name="msg" size={17} />
              پیام
            </Button>
            <Button variant="arm" size="xl" className="flex-[1.3]" onClick={() => setConfirmOpen(true)}>
              <Icon name="check" size={18} />
              پذیرش پیشنهاد
            </Button>
          </div>
        </div>
      )}

      {/* تأیید پذیرش */}
      <Sheet open={confirmOpen} onClose={() => setConfirmOpen(false)} title="پذیرش پیشنهاد">
        <div className="flex flex-col gap-4 p-4 pt-0">
          <p className="text-[12.5px] leading-6 text-text-2">
            این پیشنهاد را می‌پذیری؟ فروشنده خبردار می‌شود و برای هماهنگی با تو تماس می‌گیرد. استعلام
            هم بسته می‌شود.
          </p>
          <div className="flex gap-2.5">
            <Button variant="outline" size="xl" className="flex-1" onClick={() => setConfirmOpen(false)}>
              انصراف
            </Button>
            <Button variant="arm" size="xl" className="flex-1" loading={busy} onClick={() => void accept()}>
              بله، می‌پذیرم
            </Button>
          </div>
        </div>
      </Sheet>
    </AppShell>
  );
}
