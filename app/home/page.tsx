"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { AuthGate } from "@/components/imach/auth-gate";
import { AppShell } from "@/components/imach/app-shell";
import { Icon, type IconName } from "@/components/ui/icon";
import { useMessages } from "@/i18n/messages/use-messages";
import { useLocale } from "@/i18n/locale-context";
import { useAuthStore } from "@/lib/auth-store";
import { marketApi, ordersApi, scoreApi } from "@/lib/api";
import { num } from "@/lib/format";
import { isPlaceholderBiz } from "@/lib/active-biz";
import { allBaskets } from "@/lib/basket";

/**
 * `/home` — اسکرین ۱۹: میز خرید (M2 · FD-41 + M5 سفارش‌های زنده).
 *
 * · چهار کاشی (پروتوتایپ 19) — شمار سفارش از M5 زنده است.
 * · کارتابل زنده: پیشنهادهای تازه (۷۲ساعت) + رو به اتمام (M3) + گام بعدی
 * · M5: ردیف «سبد پر داری در کاتالوک…» — بازیابی ctx مهمان بعد از ورود +
 *   ردیف «n سفارش جاری» وقتی سفارش باز هست (الگوی deskOrdersSync).
 */

export default function BuyDeskPage() {
  return (
    <AuthGate>
      <BuyDesk />
    </AuthGate>
  );
}

function BuyDesk() {
  const router = useRouter();
  const m = useMessages();
  const D = m.desk;
  const { locale } = useLocale();
  const n = (v: number | string) => num(v, locale);
  const businesses = useAuthStore((s) => s.businesses);
  const biz = businesses[0];
  const bizId = biz?.id ?? "";

  const watchedQ = useQuery({
    queryKey: ["market", "watched", bizId],
    queryFn: () => marketApi.getWatchedGoods(bizId),
    enabled: !!bizId,
  });
  const followsQ = useQuery({
    queryKey: ["market", "follows", bizId],
    queryFn: () => marketApi.getFollows(bizId),
    enabled: !!bizId,
  });
  const rfqsQ = useQuery({
    queryKey: ["market", "myrfqs", bizId],
    queryFn: () => marketApi.getMyRfqs(bizId),
    enabled: !!bizId,
  });
  // M5 — شمار زندهٔ سفارش‌های جاری خریدار (کاشی + ردیف کارتابل)
  const ordersQ = useQuery({
    queryKey: ["orders", "buy", bizId],
    queryFn: () => ordersApi.getOrders(bizId, "buy"),
    enabled: !!bizId,
  });

  const watched = (watchedQ.data ?? []).filter((w) => !w.archivedAt);
  const suppliers = followsQ.data ?? [];
  const recentOffers = rfqsQ.data?.recentOfferCount ?? 0;
  const currentOrders = ordersQ.data?.currentCount ?? 0;
  // M3 — شمار «در حال اتمام موجودی» برای ردیف کارتابل میز خرید (۲۰ج)؛
  // صفر = ردیف مخفی (قاعدهٔ کارتابل زنده).
  const lowStockCount = watched.filter((w) => w.lowStock).length;
  // M5 — سبدهای پرشده (بازیابی ctx مهمان بعد از ورود) — بعد از hydration
  // خوانده می‌شود (localStorage سمت سرور نیست؛ mismatch نمی‌سازد)
  const [baskets, setBaskets] = useState<Array<{ slug: string; supplierName: string; count: number }>>([]);
  useEffect(() => {
    setBaskets(allBaskets());
  }, []);

  // گام بعدی فعالیت — M7: زنده از /score (عدد محاسبه‌شده — درس FD-4)؛
  // تا وقتی امتیاز نیامده/گامی نداشت، همان آبشار داده‌محور M2 می‌ماند.
  const scoreQ = useQuery({
    queryKey: ["score", bizId],
    queryFn: () => scoreApi.getScore(bizId!),
    enabled: !!bizId,
  });
  const deskNext = scoreQ.data?.buy.deskNext ?? null;
  const nextStep = deskNext
    ? {
        icon: "rocket" as IconName,
        title: deskNext.t,
        sub: `${deskNext.remaining.toLocaleString("fa-IR")} امتیاز تا شتابدهی`,
        href: deskNext.go,
      }
    : watched.length === 0
      ? {
          icon: "cart-add" as IconName,
          title: D.nextStepBuyList,
          sub: D.nextStepBuyListSub,
          href: "/buy-list",
        }
      : {
          icon: "share" as IconName,
          title: D.nextStepShare,
          sub: D.nextStepShareSub,
          href: "/buy-list",
        };

  const trayRows: { icon: IconName; iconCls: string; title: string; sub: string; href: string }[] = [];

  if (!biz || isPlaceholderBiz(biz)) {
    trayRows.push({
      icon: "rocket",
      iconCls: "bg-arm-soft text-arm-strong",
      title: D.nextStep,
      sub: D.nextStepBuyListSub,
      href: "/start",
    });
  }
  if (recentOffers > 0) {
    trayRows.push({
      icon: "inbox",
      iconCls: "bg-amber-soft text-amber",
      title: D.newOffer.replace("{n}", n(recentOffers)),
      sub: D.newOfferSub,
      href: "/buy/rfqs",
    });
  }
  // M3 (۲۰ج) — ردیف «در حال اتمام موجودی» با شمار زنده؛ صفر = مخفی
  if (lowStockCount > 0) {
    trayRows.push({
      icon: "boxes",
      iconCls: "bg-amber-soft text-amber",
      title: `${n(lowStockCount)} نوع کالا رو به اتمام`,
      sub: "موجودی‌شان دارد تمام می‌شود — برای سفارش بعدی",
      href: "/buy-list/low-stock",
    });
  }
  // M5 — سفارش جاری داری (الگوی deskOrdersSync پروتوتایپ)
  if (currentOrders > 0) {
    trayRows.push({
      icon: "truck",
      iconCls: "bg-arm-soft text-arm-strong",
      title: `${n(currentOrders)} سفارش جاری`,
      sub: "در انتظار پذیرش/ارسال/تحویل — پیگیری در دفتر سفارش‌ها",
      href: "/buy/orders",
    });
  }
  // M5 — سبد پرشده در کاتالوکی (بازیابی ctx مهمان)
  if (baskets.length > 0) {
    trayRows.push({
      icon: "basket",
      iconCls: "bg-green-soft text-green",
      title: `سبد پر داری در کاتالوک ${baskets[0]!.supplierName}`,
      sub: `${n(baskets[0]!.count)} قلم منتظر ثبت سفارش`,
      href: `/c/${baskets[0]!.slug}`,
    });
  }

  // چهار کاشی (دستور مالک — الگوی پروتوتایپ 19)؛ سفارش از M5 زنده
  const tiles: { icon: IconName; title: string; stat: string; href: string }[] = [
    { icon: "basket", title: D.buyList, stat: n(watched.length), href: "/buy-list" },
    { icon: "truck", title: D.mySuppliers, stat: n(suppliers.length), href: "/suppliers" },
    { icon: "receipt", title: D.myOrdersBuy, stat: n(currentOrders), href: "/buy/orders" },
    { icon: "inbox", title: D.myOffers, stat: n(recentOffers), href: "/buy/rfqs" },
  ];

  return (
    <AppShell arm="buy">
      <div className="flex flex-col gap-5">
        <section className="flex flex-col gap-3">
          <h2 className="text-[15px] font-bold text-text">{D.quickTitle}</h2>
          {/* کاشی‌های شبه‌مربع (دستور مالک): موبایل ۲×۲، دسکتاپ ۴تایی؛
              آیکون لخت + فقط عدد هوچک — هماهنگ با وزن عنوان */}
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {tiles.map((t) => (
              <button
                key={t.title}
                type="button"
                onClick={() => router.push(t.href)}
                className="group flex min-h-[132px] flex-col justify-between gap-3 rounded-2xl border border-line bg-surface p-4 text-start shadow-[0_1px_3px_rgba(31,29,26,.04)] transition-[border-color,box-shadow,transform] hover:border-line-2 hover:shadow-[0_10px_30px_rgba(31,29,26,.07)] active:translate-y-px lg:min-h-[168px] lg:p-5"
              >
                <span className="flex items-center gap-2">
                  <Icon
                    name={t.icon}
                    size={22}
                    className="shrink-0 text-text-3 transition-colors group-hover:text-arm-strong"
                  />
                  <b className="truncate text-[13px] font-bold text-text lg:text-[14px]">{t.title}</b>
                </span>
                <b className="text-[26px] font-black leading-none tracking-tight text-text lg:text-[30px]">
                  {t.stat}
                </b>
              </button>
            ))}
          </div>
        </section>

        <section className="flex flex-col gap-2.5">
          <h2 className="text-[15px] font-bold text-text">{D.trayTitle}</h2>

          {/* کارت‌های اقدام — عرض کمتر + پدینگ عمودی بیشتر (دستور مالک) */}
          <button
            type="button"
            onClick={() => router.push(nextStep.href)}
            className="flex items-center gap-3.5 rounded-2xl border border-line bg-surface p-4 text-start transition-[border-color,box-shadow] hover:border-line-2 hover:shadow-[0_10px_30px_rgba(31,29,26,.06)] lg:px-5 lg:py-5"
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
              className="flex items-center gap-3.5 rounded-2xl border border-line bg-surface p-4 text-start transition-[border-color,box-shadow] hover:border-line-2 hover:shadow-[0_10px_30px_rgba(31,29,26,.06)] lg:px-5 lg:py-5"
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
