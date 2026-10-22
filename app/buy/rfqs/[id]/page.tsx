"use client";

import { useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AuthGate } from "@/components/imach/auth-gate";
import { AppShell } from "@/components/imach/app-shell";
import { Icon } from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { EmptyState, Spinner } from "@/components/ui/feedback";
import { useToast } from "@/components/ui/toast";
import { useMoney } from "@/components/imach/prefs-context";
import { useAuthStore } from "@/lib/auth-store";
import { marketApi } from "@/lib/api";
import { goodName, num, unitLabel } from "@/lib/format";
import {
  CoverageBadge,
  DeadlineBadge,
  OfferTermsRow,
  bestOfferOf,
  itemTitleTx,
  rfqTitleTx,
  sortOffers,
} from "@/components/imach/rfq-shared";
import { cn } from "@/lib/utils";

/**
 * `/buy/rfqs/[id]` — اسکرین ۲۶: پیشنهادهای یک استعلام (مقایسه · M4).
 *
 * · مرتب‌سازی FD-24 (حکم مالک): «اول پوشش کامل، بعد جمع کل»؛ تک‌قلمی همان
 *   مرتب‌سازی قدیمی بر قیمت. «کمترین جمع» فقط بین کامل‌ها (سیب با سیب).
 * · کارت چندقلمی: بج پوشش + ردیف قیمت هر قلم («این قلم را ندارد») + جمع کل
 *   در جای قیمت («جمع k قلم») + نوار شرایط (بازتاب عین فرم ۱۲).
 * · «بستن این استعلام» — پایان کار خریدار بدون انتخاب (stopRfq).
 * · گروه بسته: نتیجه + پیشنهادها برای رکورد می‌مانند.
 *
 * قانون مالک M2: فرم فارسی، متن‌ها همین‌جا (فریز i18n).
 */

export default function RfqOffersPage() {
  return (
    <AuthGate>
      <RfqOffers />
    </AuthGate>
  );
}

function RfqOffers() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const { show } = useToast();
  const { parts } = useMoney();
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

  const items = g?.items ?? [];
  const multi = items.length > 1;
  const offers = useMemo(
    () => (g ? sortOffers(g.offers, g.items.length) : []),
    [g]
  );
  const best = useMemo(() => (g ? bestOfferOf(g.offers, g.items.length) : null), [g]);

  const stop = async () => {
    if (!g) return;
    try {
      await marketApi.stopRfq(bizId, g.id);
      show({ text: "استعلام بسته شد", kind: "success" });
      await qc.invalidateQueries({ queryKey: ["market", "myrfqs", bizId] });
    } catch (e) {
      show({ text: e instanceof Error ? e.message : "بسته نشد", kind: "error" });
    }
  };

  const title = g ? rfqTitleTx(itemTitleTx(items)) : "پیشنهادها";

  return (
    <AppShell arm="buy" title="پیشنهادها" back="/buy/rfqs" wide>
      {rfqsQ.isLoading ? (
        <div className="grid place-items-center py-16">
          <Spinner />
        </div>
      ) : !g ? (
        <EmptyState
          icon={<Icon name="inbox" size={30} />}
          title="استعلام پیدا نشد"
          subtitle="ممکن است بایگانی شده باشد."
        />
      ) : (
        <div className="flex flex-col gap-4">
          {/* زیرعنوان گروه */}
          <div className="flex flex-wrap items-center gap-2 px-1">
            <b className="text-[14px] font-bold text-text">{title}</b>
            {multi && (
              <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[10px] font-bold text-text-3">
                {num(items.length, "fa")} قلم
              </span>
            )}
            <span className="text-[11.5px] text-text-3">· {num(g.offerCount, "fa")} پیشنهاد</span>
            {["OPEN", "COLD"].includes(g.status) && <DeadlineBadge daysLeft={g.daysLeft} />}
          </div>

          {/* گروه بسته — نتیجه */}
          {g.status !== "OPEN" && g.status !== "COLD" && (
            <EmptyState
              icon={<Icon name="inbox" size={30} />}
              title={
                g.status === "CLOSED"
                  ? "این استعلام پذیرفته شد"
                  : g.status === "EXPIRED"
                    ? "مهلت این استعلام تمام شد"
                    : "این استعلام بسته شده"
              }
              subtitle={`${g.resultText ?? "بسته شد"} — پیشنهادها برای رکورد همین‌جا می‌مانند.`}
            />
          )}

          {/* هنوز پیشنهادی نرسیده */}
          {["OPEN", "COLD"].includes(g.status) && offers.length === 0 && (
            <EmptyState
              icon={<Icon name="clock" size={30} />}
              title="هنوز پیشنهادی نرسیده"
              subtitle={`به ${num(g.recipients.length, "fa")} تأمین‌کننده گفته شد؛ تا پایان مهلت پاسخ می‌آید.`}
            />
          )}

          {/* کارت‌های پیشنهاد */}
          <div className="flex flex-col gap-3">
            {offers.map((o) => {
              const isBest = o.id === best?.id;
              const price = multi ? o.totalMinor : o.priceMinor;
              const p = parts(price, o.currency);
              return (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => router.push(`/buy/rfqs/${g.id}/o/${o.id}`)}
                  className={cn(
                    "flex flex-col gap-3 rounded-2xl border bg-surface p-4 text-start transition-[border-color,box-shadow] hover:shadow-[0_10px_30px_rgba(31,29,26,.06)]",
                    isBest ? "border-primary/50 ring-1 ring-primary/25" : "border-line hover:border-line-2"
                  )}
                >
                  {/* سر کارت: فروشنده + قیمت */}
                  <div className="flex items-start gap-3">
                    <span className="grid size-12 shrink-0 place-items-center rounded-full bg-primary-soft text-[18px] font-black text-primary-strong">
                      {o.seller.name.slice(0, 1)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <b className="truncate text-[13.5px] font-bold text-text">{o.seller.name}</b>
                        {o.seller.isVerified && <Icon name="verified" size={13} className="text-blue" />}
                        {multi && <CoverageBadge k={o.cover} n={items.length} />}
                        {isBest && (
                          <span className="rounded-full bg-green-soft px-2 py-0.5 text-[10px] font-bold text-green">
                            {multi ? "کمترین جمع" : "کمترین قیمت"}
                          </span>
                        )}
                      </div>
                      <small className="mt-0.5 block text-[11px] text-text-3">
                        {o.seller.city ?? "—"}
                      </small>
                    </div>
                    <div className="shrink-0 text-end">
                      <div className="text-[16.5px] font-black tabular-nums leading-tight text-text">
                        {p.amount}
                      </div>
                      <div className="text-[10px] font-bold text-text-3">
                        {multi ? `جمع ${num(o.cover, "fa")} قلم` : "هر واحد"} · {p.label}
                      </div>
                    </div>
                  </div>

                  {/* ردیف قیمت هر قلم — چندقلمی (FD-24) */}
                  {multi && (
                    <div className="flex flex-col gap-1.5 rounded-xl bg-surface-2/50 p-3">
                      {items.map((it, i) => {
                        const price_i = o.prices?.[i] ?? null;
                        const pi = price_i != null ? parts(price_i, o.currency) : null;
                        return (
                          <div key={it.goodId} className="flex items-baseline justify-between gap-2 text-[12px]">
                            <span className="min-w-0 truncate text-text-2">
                              {it.good ? goodName(it.good, "fa") : "—"}
                              <span className="text-text-4">
                                {" "}
                                · {num(it.qty, "fa")} {it.good?.unit ? unitLabel(it.good.unit, "fa") : ""}
                              </span>
                            </span>
                            {pi ? (
                              <span className="shrink-0 font-bold tabular-nums text-text">{pi.amount}</span>
                            ) : (
                              <span className="shrink-0 text-[11px] font-bold text-text-4">این قلم را ندارد</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* نوار شرایط — بازتاب عین فرم ۱۲ */}
                  <OfferTermsRow o={o} />
                </button>
              );
            })}
          </div>

          {/* بستن استعلام — فقط باز (حکم مالک: «استعلام باز را ببندد و تمام») */}
          {g.status === "OPEN" && offers.length > 0 && (
            <button
              type="button"
              onClick={() => void stop()}
              className="mt-1 rounded-xl border border-line bg-surface p-3.5 text-center text-[12.5px] font-bold text-text-3 transition-colors hover:border-red/40 hover:text-red"
            >
              بستن این استعلام
            </button>
          )}
        </div>
      )}
    </AppShell>
  );
}
