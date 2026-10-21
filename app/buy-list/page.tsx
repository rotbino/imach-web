"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AuthGate } from "@/components/imach/auth-gate";
import { AppShell } from "@/components/imach/app-shell";
import { Icon } from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/feedback";
import { useToast } from "@/components/ui/toast";
import { useLocale } from "@/i18n/locale-context";
import { useAuthStore } from "@/lib/auth-store";
import { marketApi } from "@/lib/api";
import { goodName, num } from "@/lib/format";
import {
  BarcodeScanSheet,
  BuyListRow,
  ShareBuyListSheet,
  SupplyTermsSheet,
} from "@/components/imach/buy-list-shared";

/**
 * `/buy-list` — اسکرین ۲۰: لیست خرید من (M3 · FD-42/43 + حکم مالک فیکس).
 *
 * · صفحهٔ فرعی (back=/home): بدون سایدبار — فلش بازگشت استاندارد ← در
 *   اپ‌بار + عنوان؛ ابزارها در نوار ابزار زیر اپ‌بار (همهٔ عرض‌ها)
 * · نوار محتوا: جستجوی زنده + آیکون اسکن (FD-43) + «افزودن نوع کالا»
 * · کارت‌های خلوت FD-42: عکس/حرف + نام + مقدار (+قیمت ارزان‌ترین)
 * · لمس کارت → تأمین‌کننده‌های همان نوع کالا (۲۰ب → /suppliers?good=)
 * · «پیشنهادهای تامین» بالای لیست ← M6 (جای‌نگه‌دار مخفی)
 *
 * قانون مالک M2: فرم فارسی، متن‌ها همین‌جا (فریز i18n).
 */

export default function BuyListPage() {
  return (
    <AuthGate>
      <BuyList />
    </AuthGate>
  );
}

function BuyList() {
  const router = useRouter();
  const qc = useQueryClient();
  const { show } = useToast();
  const { locale } = useLocale();
  const businesses = useAuthStore((s) => s.businesses);
  const biz = businesses[0];
  const bizId = biz?.id ?? "";

  const watchedQ = useQuery({
    queryKey: ["market", "watched", bizId],
    queryFn: () => marketApi.getWatchedGoods(bizId),
    enabled: !!bizId,
  });

  const [q, setQ] = useState("");
  const [shareOpen, setShareOpen] = useState(false);
  const [condOpen, setCondOpen] = useState(false);
  const [scanOpen, setScanOpen] = useState(false);

  const rows = useMemo(() => (watchedQ.data ?? []).filter((w) => !w.archivedAt), [watchedQ.data]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter((r) =>
      r.good ? goodName({ nameFa: r.good.nameFa, nameEn: r.good.nameEn }, locale).toLowerCase().includes(needle) : false
    );
  }, [rows, q, locale]);

  const nameOf = (r: (typeof rows)[number]) =>
    r.good ? goodName({ nameFa: r.good.nameFa, nameEn: r.good.nameEn }, locale) : "—";

  /* ── اکشن‌های ردیف ── */
  const toggleLowStock = async (goodId: string, name: string, to: boolean) => {
    try {
      await marketApi.setLowStock(bizId, goodId, to);
      await qc.invalidateQueries({ queryKey: ["market", "watched", bizId] });
      show({
        text: to ? `«${name}» به فهرست رو به اتمام رفت` : `نشان «${name}» برداشته شد`,
        kind: "success",
      });
    } catch {
      show({ text: "تغییر وضعیت نشد — دوباره تلاش کن", kind: "error" });
    }
  };

  const removeGood = async (goodId: string, name: string) => {
    try {
      await marketApi.unwatchGood(bizId, goodId);
      await qc.invalidateQueries({ queryKey: ["market", "watched", bizId] });
      show({ text: `«${name}» از لیست خرید حذف شد`, kind: "success" });
    } catch {
      show({ text: "حذف نشد — دوباره تلاش کن", kind: "error" });
    }
  };

  /* ── نوار ابزار (حکم مالک فیکس): ابزارهای سایدبار پیشین در نوار بالای
     محتوا — همهٔ عرض‌ها؛ برچسب کامل «در حال اتمام موجودی» (FD-43) ── */


  return (
    <AppShell
      arm="buy"
      title="لیست خرید من"
      wide
      back="/home"
      toolbar={
        <>
          <ToolBtn
            icon="eye"
            label="پیش‌نمایش"
            onClick={() =>
              show({ text: "نمای عمومی لیست خرید در فاز شبکهٔ خصوصی (M6) فعال می‌شود", kind: "info" })
            }
          />
          <ToolBtn icon="share" label="اشتراک‌گذاری" onClick={() => setShareOpen(true)} />
          <ToolBtn icon="textlist" label="شرایط تامین" onClick={() => setCondOpen(true)} />
          <ToolBtn icon="boxes" label="در حال اتمام موجودی" onClick={() => router.push("/buy-list/low-stock")} />
        </>
      }
    >
      <div className="flex flex-col gap-3">
        {/* ── نوار ابزار: جستجو + اسکن + افزودن (FD-42/43) ── */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Icon
              name="search"
              size={17}
              className="pointer-events-none absolute start-3.5 top-1/2 -translate-y-1/2 text-text-4"
            />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="جستجو در لیست خرید…"
              autoComplete="off"
              className="h-11 w-full rounded-xl border border-line bg-surface ps-10 pe-12 text-[14px] text-text placeholder:text-text-4 focus:border-arm focus:outline-none focus:ring-2 focus:ring-arm/20"
            />
            {/* اسکنر ته جستجو (FD-43 — «برای سرچ باکس خود لیست خرید هم بزار») */}
            <button
              type="button"
              onClick={() => setScanOpen(true)}
              aria-label="اسکن بارکد"
              title="اسکن بارکد — سریع‌تر از جستجو"
              className="absolute end-2 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-lg text-text-3 transition-colors hover:bg-surface-2 hover:text-arm-strong"
            >
              <Icon name="scan" size={16} />
            </button>
          </div>
          <Button variant="arm" size="lg" className="shrink-0" onClick={() => router.push("/buy-list/new")}>
            <Icon name="plus" size={17} />
            <span className="hidden sm:inline">افزودن نوع کالا</span>
            <span className="sm:hidden">افزودن</span>
          </Button>
        </div>

        {/* ── «پیشنهادهای تامین» ← M6 (جای‌نگهدار مخفی — FD-19) ── */}
        {/* <div id="bl-proposals" /> */}

        {/* ── شمارنده ── */}
        <p className="text-[12px] font-bold text-text-3">
          {num(filtered.length, locale)} نوع کالا
          {q.trim() && rows.length !== filtered.length ? ` (از ${num(rows.length, locale)})` : ""}
        </p>

        {/* ── ردیف‌ها ── */}
        {watchedQ.isLoading ? (
          <div className="flex flex-col gap-2.5">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-[76px] animate-pulse rounded-2xl bg-surface-2" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<Icon name="basket" size={30} />}
            title={rows.length === 0 ? "لیست خریدت خالی است" : "چیزی پیدا نشد"}
            subtitle={
              rows.length === 0
                ? "نوع کالاهایی که مرتب می‌خری را اضافه کن — قیمت‌شان را برایت دنبال می‌کنیم"
                : "عبارت دیگری امتحان کن یا نوع کالای جدیدی اضافه کن"
            }
            action={
              rows.length === 0 ? (
                <Button variant="arm" size="lg" onClick={() => router.push("/buy-list/new")}>
                  <Icon name="plus" size={17} />
                  افزودن نوع کالا
                </Button>
              ) : undefined
            }
          />
        ) : (
          <div className="flex flex-col gap-2.5 lg:gap-3">
            {filtered.map((r) => (
              <BuyListRow
                key={r.goodId}
                row={r}
                locale={locale}
                onOpen={() => router.push(`/suppliers?good=${r.goodId}`)}
                onLowStock={() => void toggleLowStock(r.goodId, nameOf(r), !r.lowStock)}
                onRemove={() => void removeGood(r.goodId, nameOf(r))}
              />
            ))}
          </div>
        )}

        {/* ── نوار آمار ── */}
        {rows.length > 0 && (
          <div className="mt-2 flex items-center justify-between rounded-2xl border border-line bg-surface px-5 py-3.5">
            <Stat label="نوع کالا" value={num(rows.length, locale)} />
            <span className="h-6 w-px bg-line" />
            <Stat label="رو به اتمام" value={num(rows.filter((r) => r.lowStock).length, locale)} />
            <span className="h-6 w-px bg-line" />
            <Stat label="با تابلوی قیمت" value={num(rows.filter((r) => r.supplierCount > 0).length, locale)} />
          </div>
        )}
      </div>

      {/* ── شیت‌ها ── */}
      <ShareBuyListSheet open={shareOpen} onClose={() => setShareOpen(false)} />
      <SupplyTermsSheet open={condOpen} onClose={() => setCondOpen(false)} bizId={bizId} initial={biz?.supplyTerms} />
      <BarcodeScanSheet
        open={scanOpen}
        onClose={() => setScanOpen(false)}
        mode="list"
        bizId={bizId}
        onAdded={(_gid, name) => {
          void qc.invalidateQueries({ queryKey: ["market", "watched", bizId] });
          show({ text: `«${name}» به لیست خرید اضافه شد`, kind: "success" });
        }}
      />
    </AppShell>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <span className="flex items-baseline gap-1.5">
      <b className="text-[17px] font-black text-text">{value}</b>
      <span className="text-[11.5px] text-text-3">{label}</span>
    </span>
  );
}

/** دکمهٔ نوار ابزار (حکم مالک فیکس) — قرصِ فشرده با آیکون؛ در همهٔ عرض‌ها */
function ToolBtn({
  icon,
  label,
  onClick,
}: {
  icon: Parameters<typeof Icon>[0]["name"];
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border border-line bg-surface px-3.5 text-[12.5px] font-bold text-text-2 transition-colors hover:border-arm/45 hover:bg-arm-soft hover:text-arm-strong active:scale-[.97]"
    >
      <Icon name={icon} size={15} />
      {label}
    </button>
  );
}
