"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { AuthGate } from "@/components/imach/auth-gate";
import { AppShell } from "@/components/imach/app-shell";
import { EmptyState } from "@/components/ui/feedback";
import { Icon } from "@/components/ui/icon";
import { scoreApi } from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";
import { timeAgo } from "@/lib/format";

/** `/referrals` — صفحهٔ دعوت‌شدگان (اسکرین ۰۶ · M7): آمار/هدف/لیست.
 * منبع: User.referredBy + پاداش کیف (REFERRAL_REWARD) از GET /score/referrals.
 * هدف = پلهٔ آخر دعوت (۵ نفر — هم‌راستا با sc6/sb6: «بیشترین امتیاز»). */
export default function ReferralsPage() {
  return (
    <AuthGate>
      <ReferralsContent />
    </AuthGate>
  );
}

function ReferralsContent() {
  const businesses = useAuthStore((s) => s.businesses);
  const biz = businesses[0];
  const refQ = useQuery({
    queryKey: ["referrals", biz?.id],
    queryFn: () => scoreApi.getReferrals(biz!.id),
    enabled: !!biz,
  });

  const d = refQ.data;
  const fa = (n: number) => n.toLocaleString("fa-IR");
  const rewardToman = Math.round((d?.rewardMinor ?? 50_000) / 10);
  const earnedToman = Math.round((d?.earnedMinor ?? 0) / 10);

  return (
    <AppShell arm="sell" title="دعوت‌شدگان و پاداش" back="/catalog">
      <div className="flex flex-col gap-4">
        {/* ── کال‌اوت: چرا دعوت؟ ── */}
        <div className="flex items-start gap-2.5 rounded-2xl border border-arm/30 bg-arm-soft/40 p-4">
          <Icon name="sparkles" size={17} className="mt-0.5 shrink-0 text-arm-strong" />
          <p className="text-[11.5px] leading-[1.9] text-text-2">
            دعوتِ هر کسی که با لینک تو عضو شود، <b>بیشترین امتیازِ</b> آیمچ را دارد و هر دعوتِ موفق{" "}
            <b>{fa(rewardToman)} تومان</b> پاداش کیف می‌گیرد — چه از لینک کاتالوکت (مشتری‌ات می‌شود) و چه از لینک لیست خریدت
            (تأمین‌کننده‌ات می‌شود).
          </p>
        </div>

        {/* ── آمار سه‌تایی ── */}
        <div className="grid grid-cols-3 gap-2">
          <StatCard icon="users" label="دعوت‌شده" value={fa(d?.count ?? 0)} />
          <StatCard icon="award" label="هدف دعوت" value={fa(d?.goal ?? 5)} />
          <StatCard icon="wallet" label="پاداخـش گرفته" value={`${fa(earnedToman)}`} sub="تومان" />
        </div>

        {/* ── نوار پیشرفت تا هدف ── */}
        <div className="rounded-2xl border border-line bg-surface p-4">
          <div className="mb-2 flex items-center justify-between text-[11.5px]">
            <span className="font-bold text-text-2">پیشرفت تا هدف دعوت</span>
            <span className="text-text-3">
              {fa(d?.count ?? 0)} از {fa(d?.goal ?? 5)}
            </span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-surface-2">
            <i
              className="block h-full rounded-full bg-arm transition-[width] duration-500"
              style={{ width: `${Math.min(100, ((d?.count ?? 0) / (d?.goal ?? 5)) * 100)}%` }}
            />
          </div>
        </div>

        {/* ── لیست دعوت‌شدگان ── */}
        {d && d.items.length === 0 && (
          <EmptyState
            icon={<Icon name="users" size={30} />}
            title="هنوز کسی را دعوت نکرده‌ای"
            subtitle="لینک کاتالوگ یا لیست خریدت را بفرست — اولین دعوت، بیشترین امتیاز را دارد"
          />
        )}
        {d && d.items.length > 0 && (
          <section className="flex flex-col gap-2">
            <h2 className="px-1 text-[15px] font-bold text-text">دعوت‌شدگان</h2>
            {d.items.map((u, i) => (
              <div key={`${u.phone}-${i}`} className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-3.5">
                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-arm-soft text-[13px] font-bold text-arm-strong">
                  {(u.name || "؟").trim().charAt(0)}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <b className="text-[13px] font-bold text-text">{u.name}</b>
                    {/* نشان بازو: از کدام لینک آمده */}
                    <span
                      className={
                        u.arm === "SELL"
                          ? "rounded-full bg-arm-soft px-1.5 py-0.5 text-[10px] font-bold text-arm-strong"
                          : "rounded-full bg-primary-soft px-1.5 py-0.5 text-[10px] font-bold text-primary-strong"
                      }
                    >
                      {u.arm === "SELL" ? "مشتری من" : "تأمین‌کننده من"}
                    </span>
                    {u.rewarded && (
                      <span className="rounded-full bg-green-soft px-1.5 py-0.5 text-[10px] font-bold text-green">
                        پاداش گرفت
                      </span>
                    )}
                  </div>
                  <span className="mt-0.5 block text-[11px] text-text-3">
                    <span dir="ltr">{u.phone}</span> · {timeAgo(u.joinedAt)}
                  </span>
                </div>
                {u.rewarded ? (
                  <span className="shrink-0 text-[11.5px] font-bold text-green">+{fa(rewardToman)} ت</span>
                ) : (
                  <span className="shrink-0 text-[11px] text-text-4">در انتظار</span>
                )}
              </div>
            ))}
          </section>
        )}

        {/* ── دعوت‌نامه: دو مسیر ── */}
        <section className="flex flex-col gap-2">
          <h2 className="px-1 text-[15px] font-bold text-text">بیشتر دعوت کن</h2>
          <Link
            href="/catalog"
            className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-3.5 transition-colors hover:border-line-2"
          >
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-arm-soft text-arm-strong">
              <Icon name="store" size={18} />
            </span>
            <span className="min-w-0 flex-1">
              <b className="block text-[13px] font-bold text-text">لینک کاتالوکت را بفرست</b>
              <span className="mt-0.5 block text-[11.5px] text-text-3">ذخیره‌کننده‌اش مشتری تو می‌شود</span>
            </span>
            <Icon name="chev" size={16} className="shrink-0 text-text-4 rtl:-scale-x-100" />
          </Link>
          <Link
            href="/buy-list"
            className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-3.5 transition-colors hover:border-line-2"
          >
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary-strong">
              <Icon name="basket" size={18} />
            </span>
            <span className="min-w-0 flex-1">
              <b className="block text-[13px] font-bold text-text">لینک لیست خریدت را بفرست</b>
              <span className="mt-0.5 block text-[11.5px] text-text-3">قیمت‌دهنده‌اش تأمین‌کننده تو می‌شود</span>
            </span>
            <Icon name="chev" size={16} className="shrink-0 text-text-4 rtl:-scale-x-100" />
          </Link>
        </section>
      </div>
    </AppShell>
  );
}

function StatCard({ icon, label, value, sub }: { icon: "users" | "award" | "wallet"; label: string; value: string; sub?: string }) {
  return (
    <div className="flex flex-col items-center gap-1 rounded-2xl border border-line bg-surface p-3 text-center">
      <span className="grid size-9 place-items-center rounded-full bg-surface-2 text-text-2">
        <Icon name={icon} size={16} />
      </span>
      <b className="text-[16px] font-black leading-none text-text">
        {value}
        {sub && <span className="mr-1 text-[9.5px] font-bold text-text-3">{sub}</span>}
      </b>
      <span className="text-[10.5px] text-text-3">{label}</span>
    </div>
  );
}
