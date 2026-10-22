"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { AuthGate } from "@/components/imach/auth-gate";
import { AppShell } from "@/components/imach/app-shell";
import { Icon } from "@/components/ui/icon";
import { EmptyState, Spinner } from "@/components/ui/feedback";
import { useAuthStore } from "@/lib/auth-store";
import { marketApi, type InquiryDto } from "@/lib/api";
import { goodName, num } from "@/lib/format";
import { rfqTitleTx, itemTitleTx, ItemsCountBadge, leftTx, deadlineTone } from "@/components/imach/rfq-shared";

/**
 * `/sell/rfqs` — اسکرین ۱۱: درخواست‌های قیمت (فروشنده · M4).
 *
 * · سه بخش: در انتظار پاسخ (NEW) · پاسخ داده‌شده (ANSWERED) · بسته/منقضی
 *   (وضعیت lazy از ساعت سرور — CLOSED | STOPPED | EXPIRED).
 * · عنوان‌ها با پیشوند «درخواست قیمت …» + بج «n قلم» (حکم مالک FD-14/24).
 * · هر ردیف فقط اقلامِ خودِ فروشنده را می‌بیند (حریم سبد خریدار) + بج کل
 *   «n قلم» و مهلت روزشمار.
 * · لمس ردیف باز → فرم پیشنهاد همان استعلام (۱۲) — چندقلمی هم فرم خودش.
 * · کال‌اوت مهلت: «تا قبل از پایان مهلت قیمتت را بفرست؛ بعد از آن بسته می‌شود».
 *
 * قانون مالک M2: فرم فارسی، متن‌ها همین‌جا (فریز i18n).
 */

export default function SellRfqsPage() {
  return (
    <AuthGate>
      <SellRfqs />
    </AuthGate>
  );
}

function SellRfqs() {
  const router = useRouter();
  const businesses = useAuthStore((s) => s.businesses);
  const bizId = businesses[0]?.id ?? "";

  const inqQ = useQuery({
    queryKey: ["market", "inquiries", bizId],
    queryFn: () => marketApi.getInquiries(bizId),
    enabled: !!bizId,
  });

  const rows = useMemo(
    () => (inqQ.data?.items ?? []).filter((r) => r.status !== "ARCHIVED"),
    [inqQ.data]
  );

  const display = (r: InquiryDto): string => {
    if (r.displayStatus && ["CLOSED", "STOPPED", "EXPIRED"].includes(r.displayStatus)) {
      return r.displayStatus;
    }
    return r.status; // NEW | ANSWERED
  };

  const pending = rows.filter((r) => display(r) === "NEW");
  const answered = rows.filter((r) => display(r) === "ANSWERED");
  const closed = rows.filter((r) => ["CLOSED", "STOPPED", "EXPIRED"].includes(display(r)));

  const rowTitle = (r: InquiryDto): string => {
    const names = (r.items ?? []).map((it) => (it.good ? goodName(it.good, "fa") : "—"));
    return rfqTitleTx(
      (r.itemsTotal ?? 1) > 1 ? `${num(r.itemsTotal!, "fa")} قلمی` : names[0] ?? "کالا"
    );
  };

  return (
    <AppShell arm="sell" title="درخواست‌های قیمت" back="/sell">
      <div className="flex flex-col gap-4">
        {inqQ.isLoading ? (
          <div className="grid place-items-center py-16">
            <Spinner />
          </div>
        ) : (
          <>
            {/* کال‌اوت مهلت (پروتوتایپ ۱۱) */}
            {pending.length > 0 && (
              <div className="flex items-start gap-2.5 rounded-2xl border border-amber/30 bg-amber-soft/50 p-3.5">
                <Icon name="clock" size={17} className="mt-0.5 shrink-0 text-amber" />
                <p className="text-[11.5px] leading-5 text-text-2">
                  هر درخواست یک <b>مهلت</b> دارد. تا قبل از پایان مهلت قیمتت را بفرست؛ بعد از آن،
                  درخواست بسته می‌شود.
                </p>
              </div>
            )}

            {/* در انتظار پاسخ */}
            <section className="flex flex-col gap-2.5">
              <div className="flex items-center justify-between px-1">
                <h2 className="text-[13px] font-black text-text-2">در انتظار پاسخ</h2>
                <span className="text-[11.5px] font-bold text-text-3">
                  {num(pending.length, "fa")} مورد
                </span>
              </div>
              {pending.length === 0 && (
                <EmptyState
                  icon={<Icon name="inbox" size={30} />}
                  title="درخواستی در انتظار پاسخ نیست"
                  subtitle="وقتی خریداران از تو استعلام قیمت بگیرند، همین‌جا می‌آید."
                />
              )}
              {pending.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => router.push(`/sell/rfqs/${r.id}`)}
                  className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-3.5 text-start transition-[border-color,box-shadow] hover:border-line-2 hover:shadow-[0_10px_30px_rgba(31,29,26,.06)]"
                >
                  <span className="grid size-[52px] shrink-0 place-items-center rounded-xl bg-surface-2 text-[22px] font-black text-text-4/70">
                    {(r.items?.[0]?.good ? goodName(r.items[0].good, "fa") : "؟").slice(0, 1)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-1.5">
                      <b className="truncate text-[14px] font-bold text-text">{rowTitle(r)}</b>
                      <ItemsCountBadge n={r.itemsTotal ?? 1} />
                      {(r.myCover ?? 1) < (r.itemsTotal ?? 1) && (
                        <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[10px] font-bold text-text-3">
                          {num(r.myCover ?? 0, "fa")} از {num(r.itemsTotal ?? 0, "fa")} قلم نزد تو
                        </span>
                      )}
                    </span>
                    <span className="mt-1 flex flex-wrap items-center gap-x-2 text-[11.5px] text-text-3">
                      <span>{r.buyer?.name ?? "خریدار"}</span>
                      {r.daysLeft != null && (
                        <b className={deadlineTone(r.daysLeft)}>· {leftTx(r.daysLeft)}</b>
                      )}
                    </span>
                  </span>
                  <Icon name="chev" size={16} className="shrink-0 rotate-180 text-text-4" />
                </button>
              ))}
            </section>

            {/* پاسخ داده‌شده */}
            {answered.length > 0 && (
              <section className="mt-1 flex flex-col gap-2.5">
                <h2 className="px-1 text-[13px] font-black text-text-2">پاسخ داده‌شده</h2>
                {answered.map((r) => (
                  <div
                    key={r.id}
                    className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-3.5 opacity-75"
                  >
                    <span className="grid size-[52px] shrink-0 place-items-center rounded-xl bg-surface-2 text-[22px] font-black text-text-4/70">
                      {(r.items?.[0]?.good ? goodName(r.items[0].good, "fa") : "؟").slice(0, 1)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <b className="truncate text-[14px] font-bold text-text">{rowTitle(r)}</b>
                        <span className="rounded-full bg-green-soft px-2 py-0.5 text-[10px] font-bold text-green">
                          پاسخ داده‌شده
                        </span>
                      </div>
                      <small className="mt-0.5 block truncate text-[11.5px] text-text-3">
                        {r.buyer?.name ?? "خریدار"}
                      </small>
                    </div>
                  </div>
                ))}
              </section>
            )}

            {/* بسته/منقضی — دفتر بی‌ردیفِ مزاحم */}
            {closed.length > 0 && (
              <section className="mt-1 flex flex-col gap-2">
                <h2 className="px-1 text-[13px] font-black text-text-2">بسته شده</h2>
                {closed.map((r) => (
                  <div
                    key={r.id}
                    className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-3 opacity-60"
                  >
                    <span className="grid size-[46px] shrink-0 place-items-center rounded-xl bg-surface-2 text-[19px] font-black text-text-4/70">
                      {(r.items?.[0]?.good ? goodName(r.items[0].good, "fa") : "؟").slice(0, 1)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <b className="truncate text-[13px] font-bold text-text">{rowTitle(r)}</b>
                        <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[10px] font-bold text-text-3">
                          {display(r) === "EXPIRED" ? "مهلت تمام شد" : "بسته شد"}
                        </span>
                      </div>
                      <small className="mt-0.5 block truncate text-[11px] text-text-3">
                        {r.buyer?.name ?? "خریدار"}
                      </small>
                    </div>
                  </div>
                ))}
              </section>
            )}
          </>
        )}
      </div>
    </AppShell>
  );
}
