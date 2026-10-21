"use client";

import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { AuthGate } from "@/components/imach/auth-gate";
import { AppShell } from "@/components/imach/app-shell";
import { Icon, type IconName } from "@/components/ui/icon";
import { useMessages } from "@/i18n/messages/use-messages";
import { useLocale } from "@/i18n/locale-context";
import { useAuthStore } from "@/lib/auth-store";
import { listingsApi, marketApi } from "@/lib/api";
import { num } from "@/lib/format";
import { isPlaceholderBiz } from "@/lib/active-biz";

/**
 * `/sell` — اسکرین ۰۴: میز فروش (M2 · پروتوتایپ FD-16/33/34/41).
 *
 * · کاشی‌های «همهٔ لینکها بالا»: کاتالوگ من / مشتریان من / درخواست‌های قیمت
 *   (کاشی سفارش با ماژول orders در M5 زنده می‌شود)
 * · کارتابل زنده: ردیف صفر = مخفی (FD-33) + گام بعدی فعالیت (تا M7 شمارنده‌ای)
 * · خوشامد حذف (FD-34 حکم مالک) — به‌جایش «دسترسی سریع»
 */

export default function SellDeskPage() {
  return (
    <AuthGate>
      <SellDesk />
    </AuthGate>
  );
}

function SellDesk() {
  const router = useRouter();
  const m = useMessages();
  const D = m.desk;
  const { locale } = useLocale();
  const n = (v: number | string) => num(v, locale);
  const businesses = useAuthStore((s) => s.businesses);
  const biz = businesses[0];
  const bizId = biz?.id ?? "";

  // شمارنده‌های زنده — همان کوئری دفتر (DoD M2)
  const listingsQ = useQuery({
    queryKey: ["listings", "mine", bizId],
    queryFn: () => listingsApi.getMyListings(bizId),
    enabled: !!bizId,
  });
  const followersQ = useQuery({
    queryKey: ["market", "followers", bizId],
    queryFn: () => marketApi.getMyFollowers(bizId),
    enabled: !!bizId,
  });
  const inquiriesQ = useQuery({
    queryKey: ["market", "inquiries", bizId],
    queryFn: () => marketApi.getInquiries(bizId),
    enabled: !!bizId,
  });

  const listings = listingsQ.data ?? [];
  const activeListings = listings.filter((l) => l.isActive !== false);
  const unpriced = activeListings.filter((l) => l.priceMinor === null || l.priceMinor === undefined);
  const customers = followersQ.data?.rows ?? [];
  const newInquiries = (inquiriesQ.data?.items ?? []).filter((i) => i.status === "NEW");

  // گام بعدی فعالیت — داده‌محور (تا M7 که score وصل می‌شود)
  const nextStep =
    activeListings.length === 0
      ? { icon: "plus" as IconName, title: D.nextStepAdd, sub: D.nextStepAddSub, href: "/catalog/new" }
      : unpriced.length > 0
        ? { icon: "tag" as IconName, title: D.nextStepPrice, sub: D.nextStepPriceSub, href: "/catalog/bulk" }
        : { icon: "share" as IconName, title: D.nextStepShare, sub: D.nextStepShareSub, href: "/catalog" };

  const trayRows: { icon: IconName; iconCls: string; title: string; sub: string; href: string }[] = [];

  if (!biz || isPlaceholderBiz(biz)) {
    trayRows.push({
      icon: "rocket",
      iconCls: "bg-arm-soft text-arm-strong",
      title: D.nextStep,
      sub: D.nextStepAddSub,
      href: "/start",
    });
  }
  if (newCustomersPlaceholderGuard(customers)) {
    trayRows.push({
      icon: "user-plus",
      iconCls: "bg-amber-soft text-amber",
      title: D.newCustomer.replace("{n}", n(newCustomersCount(customers))),
      sub: D.newCustomerSub,
      href: "/customers",
    });
  }
  if (newInquiries.length > 0) {
    trayRows.push({
      icon: "inbox",
      iconCls: "bg-amber-soft text-amber",
      title: D.newRfq.replace("{n}", n(newInquiries.length)),
      sub: D.newRfqSub,
      href: "/sell/rfqs",
    });
  }

  const tiles = [
    { icon: "store" as IconName, title: D.myCatalog, stat: n(activeListings.length), unit: D.myCatalogUnit, href: "/catalog" },
    { icon: "users" as IconName, title: D.myCustomers, stat: n(customers.length), unit: D.myCustomersUnit, href: "/customers" },
    { icon: "inbox" as IconName, title: D.myRfqs, stat: n(newInquiries.length), unit: D.myRfqsUnit, href: "/sell/rfqs" },
  ];

  return (
    <AppShell arm="sell" wide>
      <div className="flex flex-col gap-5">
        <section className="flex flex-col gap-3">
          <h2 className="text-[15px] font-bold text-text">{D.quickTitle}</h2>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
            {tiles.map((t) => (
              <button
                key={t.title}
                type="button"
                onClick={() => router.push(t.href)}
                className="flex flex-col justify-between gap-4 rounded-2xl border border-line bg-surface p-4 text-start shadow-[0_1px_3px_rgba(31,29,26,.04)] transition-[border-color,box-shadow,transform] hover:border-line-2 hover:shadow-[0_10px_30px_rgba(31,29,26,.07)] active:translate-y-px lg:p-5 lg:pb-6"
              >
                <span className="flex items-center gap-2.5">
                  <span className="grid size-[38px] place-items-center rounded-[11px] bg-primary-soft text-primary-strong">
                    <Icon name={t.icon} size={20} />
                  </span>
                  <b className="text-[14px] font-bold text-text lg:text-[15px]">{t.title}</b>
                </span>
                <span className="flex items-baseline gap-1.5">
                  <b className="text-[24px] font-black leading-none text-text lg:text-[28px]">{t.stat}</b>
                  <span className="text-[12px] text-text-3">{t.unit}</span>
                </span>
              </button>
            ))}
          </div>
        </section>

        <section className="flex flex-col gap-2.5">
          <h2 className="text-[15px] font-bold text-text">{D.trayTitle}</h2>

          <button
            type="button"
            onClick={() => router.push(nextStep.href)}
            className="flex items-center gap-3.5 rounded-2xl border border-line bg-surface p-4 text-start transition-[border-color,box-shadow] hover:border-line-2 hover:shadow-[0_10px_30px_rgba(31,29,26,.06)] lg:px-5"
          >
            <span className="grid size-[42px] shrink-0 place-items-center rounded-[12px] bg-arm-soft text-arm-strong">
              <Icon name={nextStep.icon} size={21} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex flex-wrap items-center gap-2">
                <b className="text-[14px] font-bold text-text">{nextStep.title}</b>
                <span className="rounded-full bg-arm-soft px-2 py-0.5 text-[10.5px] font-bold text-arm-strong">
                  {D.nextStep}
                </span>
              </span>
              <span className="mt-1 block text-[12px] leading-5 text-text-3">{nextStep.sub}</span>
            </span>
            <Icon name="chev" size={18} className="shrink-0 text-text-4 rtl:-scale-x-100" />
          </button>

          {trayRows.map((r) => (
            <button
              key={r.title}
              type="button"
              onClick={() => router.push(r.href)}
              className="flex items-center gap-3.5 rounded-2xl border border-line bg-surface p-4 text-start transition-[border-color,box-shadow] hover:border-line-2 hover:shadow-[0_10px_30px_rgba(31,29,26,.06)] lg:px-5"
            >
              <span className={`grid size-[42px] shrink-0 place-items-center rounded-[12px] ${r.iconCls}`}>
                <Icon name={r.icon} size={21} />
              </span>
              <span className="min-w-0 flex-1">
                <b className="block truncate text-[14px] font-bold text-text">{r.title}</b>
                <span className="mt-0.5 block truncate text-[12px] leading-5 text-text-3">{r.sub}</span>
              </span>
              <Icon name="chev" size={18} className="shrink-0 text-text-4 rtl:-scale-x-100" />
            </button>
          ))}

          {trayRows.length === 0 && (
            <p className="rounded-2xl border border-dashed border-line-2 bg-surface px-4 py-5 text-center text-[12.5px] text-text-3">
              {D.trayEmpty}
            </p>
          )}
        </section>
      </div>
    </AppShell>
  );
}

/** مشتری جدید = از مسیر دعوت/کاتالوک آمده (viaRef) — تعریف زنده تا M6 */
function newCustomersCount(customers: { viaRef: boolean }[]): number {
  return customers.filter((c) => c.viaRef === true).length;
}
function newCustomersPlaceholderGuard(customers: { viaRef: boolean }[]): boolean {
  return newCustomersCount(customers) > 0;
}
