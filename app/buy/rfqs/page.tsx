"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AuthGate } from "@/components/imach/auth-gate";
import { AppShell } from "@/components/imach/app-shell";
import { Icon } from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import { EmptyState, Spinner } from "@/components/ui/feedback";
import { useToast } from "@/components/ui/toast";
import { useAuthStore } from "@/lib/auth-store";
import { marketApi, type RfqGroupDto } from "@/lib/api";
import { num } from "@/lib/format";
import {
  DeadlineBadge,
  GroupStatusBadge,
  ItemsCountBadge,
  itemTitleTx,
  rfqTitleTx,
} from "@/components/imach/rfq-shared";

/**
 * `/buy/rfqs` — اسکرین ۲۴: استعلام‌های من (خریدار · M4).
 *
 * · دو بخش: باز (OPEN) / پایان‌یافته (پذیرفته/بسته/منقضی + سردِ باز)
 * · عنوان‌ها با پیشوند «درخواست قیمت …» (حکم مالک FD-14)
 * · بج «n قلم» روی ردیف‌های چندقلمی + بج مهلت روزشمار از ساعت سرور
 * · لمس ردیف باز → مقایسهٔ پیشنهادهای همان استعلام (۲۶)
 * · چرخهٔ N9: منوی ردیف — تکرار درخواست (کلون با گیرندگان تازه) · بایگانی
 *
 * قانون مالک M2: فرم فارسی، متن‌ها همین‌جا (فریز i18n).
 */

export default function BuyRfqsPage() {
  return (
    <AuthGate>
      <BuyRfqs />
    </AuthGate>
  );
}

function BuyRfqs() {
  const router = useRouter();
  const qc = useQueryClient();
  const { show } = useToast();
  const businesses = useAuthStore((s) => s.businesses);
  const bizId = businesses[0]?.id ?? "";

  const rfqsQ = useQuery({
    queryKey: ["market", "myrfqs", bizId],
    queryFn: () => marketApi.getMyRfqs(bizId),
    enabled: !!bizId,
  });

  const [menuFor, setMenuFor] = useState<RfqGroupDto | null>(null);
  const [busy, setBusy] = useState(false);

  const groups = rfqsQ.data?.groups ?? [];
  const open = groups.filter((g) => g.status === "OPEN" || g.status === "COLD");
  const done = groups.filter((g) => !["OPEN", "COLD"].includes(g.status));

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ["market", "myrfqs", bizId] });
  };

  const repeat = async (g: RfqGroupDto) => {
    setBusy(true);
    try {
      const r = await marketApi.repeatRfq(bizId, g.id);
      show({ text: `استعلام تکرار شد — ${num(r.created, "fa")} تأمین‌کننده خبردار شدند`, kind: "success" });
      invalidate();
      setMenuFor(null);
      router.push(`/buy/rfqs/${r.groupId}`);
    } catch (e) {
      show({ text: e instanceof Error ? e.message : "تکرار نشد", kind: "error" });
    } finally {
      setBusy(false);
    }
  };

  const archive = async (g: RfqGroupDto) => {
    setBusy(true);
    try {
      await marketApi.archiveRfq(bizId, g.id);
      show({ text: "بایگانی شد", kind: "success" });
      invalidate();
      setMenuFor(null);
    } catch (e) {
      show({ text: e instanceof Error ? e.message : "بایگانی نشد", kind: "error" });
    } finally {
      setBusy(false);
    }
  };

  const firstLetter = (g: RfqGroupDto): string => {
    const name = g.items[0]?.good?.nameFa ?? g.items[0]?.good?.nameEn ?? "؟";
    return name.slice(0, 1);
  };

  return (
    <AppShell arm="buy" title="استعلام‌های من" back="/home">
      <div className="flex flex-col gap-4">
        <Button variant="arm" size="xl" block onClick={() => router.push("/buy/rfqs/new")}>
          <Icon name="plus" size={18} />
          استعلام جدید
        </Button>

        {rfqsQ.isLoading ? (
          <div className="grid place-items-center py-16">
            <Spinner />
          </div>
        ) : (
          <>
            <section className="flex flex-col gap-2.5">
              <h2 className="px-1 text-[13px] font-black text-text-2">باز</h2>
              {open.length === 0 && (
                <EmptyState
                  icon={<Icon name="inbox" size={30} />}
                  title="هنوز استعلامی نداده‌ای"
                  subtitle="با «استعلام جدید» حجم و شرایطت را بگو تا چند تأمین‌کننده با هم قیمت بدهند."
                />
              )}
              {open.map((g) => (
                <div
                  key={g.id}
                  className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-3.5 transition-[border-color,box-shadow] hover:border-line-2 hover:shadow-[0_10px_30px_rgba(31,29,26,.06)]"
                >
                  <button
                    type="button"
                    onClick={() => router.push(`/buy/rfqs/${g.id}`)}
                    className="flex min-w-0 flex-1 items-center gap-3 text-start"
                  >
                    <span className="grid size-[52px] shrink-0 place-items-center rounded-xl bg-surface-2 text-[22px] font-black text-text-4/70">
                      {firstLetter(g)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-1.5">
                        <b className="truncate text-[14.5px] font-bold text-text">
                          {rfqTitleTx(itemTitleTx(g.items))}
                        </b>
                        <ItemsCountBadge n={g.items.length} />
                        <GroupStatusBadge g={g} />
                      </span>
                      <span className="mt-1 flex flex-wrap items-center gap-2 text-[11.5px] text-text-3">
                        {g.offerCount === 0 ? (
                          <span className="font-bold">در انتظار اولین پیشنهاد</span>
                        ) : (
                          <>
                            <span>{num(g.offerCount, "fa")} پیشنهاد</span>
                            {g.minPriceMinor != null && (
                              <span>· از {num(Math.round(g.minPriceMinor / 10), "fa")} تومان</span>
                            )}
                          </>
                        )}
                        <DeadlineBadge daysLeft={g.daysLeft} />
                      </span>
                    </span>
                  </button>
                  <button
                    type="button"
                    aria-label="عملیات استعلام"
                    onClick={() => setMenuFor(g)}
                    className="grid size-9 shrink-0 place-items-center rounded-full text-text-3 transition-colors hover:bg-surface-2 hover:text-text-2"
                  >
                    <Icon name="dots" size={18} />
                  </button>
                </div>
              ))}
            </section>

            {done.length > 0 && (
              <section className="mt-1 flex flex-col gap-2.5">
                <h2 className="px-1 text-[13px] font-black text-text-2">پایان‌یافته</h2>
                {done.map((g) => (
                  <div
                    key={g.id}
                    className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-3.5 opacity-90"
                  >
                    <button
                      type="button"
                      onClick={() => router.push(`/buy/rfqs/${g.id}`)}
                      className="flex min-w-0 flex-1 items-center gap-3 text-start"
                    >
                      <span className="grid size-[52px] shrink-0 place-items-center rounded-xl bg-surface-2 text-[22px] font-black text-text-4/70">
                        {firstLetter(g)}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center gap-1.5">
                          <b className="truncate text-[14px] font-bold text-text">
                            {rfqTitleTx(itemTitleTx(g.items))}
                          </b>
                          <ItemsCountBadge n={g.items.length} />
                          <GroupStatusBadge g={g} />
                        </span>
                        <span className="mt-0.5 block truncate text-[11.5px] text-text-3">
                          {g.resultText ?? "بسته شد"}
                        </span>
                      </span>
                    </button>
                    <button
                      type="button"
                      aria-label="عملیات استعلام"
                      onClick={() => setMenuFor(g)}
                      className="grid size-9 shrink-0 place-items-center rounded-full text-text-3 transition-colors hover:bg-surface-2 hover:text-text-2"
                    >
                      <Icon name="dots" size={18} />
                    </button>
                  </div>
                ))}
              </section>
            )}
          </>
        )}
      </div>

      {/* منوی چرخهٔ N9 — تکرار/بایگانی */}
      <Sheet open={!!menuFor} onClose={() => setMenuFor(null)} title="عملیات استعلام">
        {menuFor && (
          <div className="flex flex-col gap-2 p-4 pt-0">
            <p className="mb-1 text-[12px] leading-5 text-text-3">
              {rfqTitleTx(itemTitleTx(menuFor.items))}
            </p>
            <button
              type="button"
              disabled={busy}
              onClick={() => void repeat(menuFor)}
              className="flex items-center gap-3 rounded-xl border border-line bg-surface p-3.5 text-start transition-colors hover:border-line-2 disabled:opacity-50"
            >
              <span className="grid size-10 place-items-center rounded-full bg-arm-soft text-arm-strong">
                <Icon name="history" size={19} />
              </span>
              <span className="min-w-0 flex-1">
                <b className="block text-[13.5px] font-bold text-text">تکرار درخواست</b>
                <small className="text-[11px] text-text-3">
                  همین سبد، گیرندگان تازه — دارندگان فعلی این کالاها
                </small>
              </span>
            </button>
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
          </div>
        )}
      </Sheet>
    </AppShell>
  );
}
