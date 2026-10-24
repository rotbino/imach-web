"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AuthGate } from "@/components/imach/auth-gate";
import { AppShell } from "@/components/imach/app-shell";
import { Sheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { useToast } from "@/components/ui/toast";
import { useAuthStore } from "@/lib/auth-store";
import { repApi, type RepOrderDto, type RepShareVia, type RepStatsDto } from "@/lib/api";
import { fa } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * `/rep` — اسکرین ۳۸: داشبورد نمایندهٔ فروش (M9 · FD-17 · فضای سوم).
 * «هر کسب‌وکار یک میز دارد؛ داشبورد = مدیریت یکپارچهٔ فروش چند میز».
 * • بدون تب‌بار (فضای سوم — hideTabs) · رنگ فیروزه‌ای (accent) در همهٔ اجزا؛
 *   ورود از پروفایل و لندینگ — کارکرد اصلی دو میز دست‌نخورده.
 * • ۴ کاشی همان‌زبان میزها (FD-16): فروش ماه / پورسانت ماه (+ در انتظار
 *   تسویه زنده از DELIVEREDها) / کسب‌وکار / سفارش ماه
 * • کارت کسب‌وکارهای زیر نمایندگی (کسب‌وکارهای کاربر — چند-کسب‌وکاری
 *   FD-17) + شیت لینک‌ها: میز فروش / کاتالوگ / سفارش‌های همان کسب‌وکار
 * • گزارش واحد سفارش‌ها با چیپ فیلتر کسب‌وکار (حکم مالک)
 * • شیت سفارش: چرخهٔ بازاریاب سنتی — ثبت → ارسال لیست (واتس‌اپ/پیامک/
 *   کپی — بیرون از سیستم) → تحویل → تسویهٔ پورسانت
 */
const STATUS_FACE: Record<RepOrderDto["status"], { label: string; cls: string }> = {
  NEW: { label: "ثبت‌شده", cls: "bg-surface-2 text-text-2" },
  SENT: { label: "ارسال‌شده", cls: "bg-primary-soft text-primary-strong" },
  DELIVERED: { label: "در انتظار تسویه", cls: "bg-amber-bg text-amber" },
  SETTLED: { label: "تسویه‌شده", cls: "bg-green-soft text-green" },
};

const VIA_LABEL: Record<RepShareVia, string> = {
  WHATSAPP: "واتس‌اپ",
  SMS: "پیامک",
  CLIPBOARD: "کلیپ‌بورد",
};

export default function SalesRepPage() {
  return (
    <AuthGate>
      <RepContent />
    </AuthGate>
  );
}

function RepContent() {
  const router = useRouter();
  const qc = useQueryClient();
  const businesses = useAuthStore((s) => s.businesses);
  const biz = businesses[0];

  const [bizSheet, setBizSheet] = useState<RepStatsDto["businesses"][number] | null>(null);
  const [orderSheet, setOrderSheet] = useState<RepOrderDto | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  /** فیلتر گزارش واحد — «همه» یا businessId (حکم مالک: «با کسب‌وکار فیلتر میشه») */
  const [filter, setFilter] = useState<string | "all">("all");

  const statsQ = useQuery({ queryKey: ["rep", "stats"], queryFn: () => repApi.stats() });
  const ordersQ = useQuery({ queryKey: ["rep", "orders"], queryFn: () => repApi.list() });

  const stats = statsQ.data;
  const orders = ordersQ.data ?? [];
  const filtered = useMemo(
    () => (filter === "all" ? orders : orders.filter((o) => o.businessId === filter)),
    [orders, filter]
  );

  const refresh = async () => {
    await qc.invalidateQueries({ queryKey: ["rep"] });
  };

  return (
    <AppShell arm="keep" hideTabs title="داشبورد نمایندهٔ فروش" back="/profile" wide>
      <div className="flex flex-col gap-4" data-rep-space>
        {/* ── دارایی اصلی: گروه مشتریان (rep-hero) ── */}
        <section className="flex items-center gap-4 rounded-2xl border border-accent/25 bg-accent-soft/50 p-5">
          <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-accent-soft text-accent-strong">
            <Icon name="users" size={22} />
          </span>
          <div className="min-w-0">
            <b className="block text-[14.5px] font-black text-text">گروه مشتریان من</b>
            <span className="mt-1 block truncate text-[11px] leading-[1.8] text-text-3">
              {biz?.trade ? `صنف تمرکز: ${biz.trade} · ` : ""}
              {fa(stats?.tiles.businesses ?? 0)} کسب‌وکار زیر نمایندگی — کالاهای مکملِ چند تأمین‌کننده را به همین گروه می‌فروشم
            </span>
          </div>
        </section>

        {/* ── ۴ کاشی همان‌زبان میزها (FD-16) — عدد از دیتا محاسبه می‌شود ── */}
        <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
          <Tile icon="chart" title="فروش این ماه" value={fa(Math.round((stats?.tiles.salesMonthMinor ?? 0) / 10))} unit="تومان" />
          <Tile
            icon="percent"
            title="پورسانت این ماه"
            value={fa(Math.round((stats?.tiles.commissionMonthMinor ?? 0) / 10))}
            unit="تومان"
            sub={
              stats?.tiles.pendingSettleMinor
                ? `${fa(Math.round(stats.tiles.pendingSettleMinor / 10))} تومان در انتظار تسویه`
                : undefined
            }
          />
          <Tile icon="briefcase" title="کسب‌وکار" value={fa(stats?.tiles.businesses ?? 0)} unit="زیر نمایندگی" />
          <Tile icon="receipt" title="سفارش این ماه" value={fa(stats?.tiles.ordersMonth ?? 0)} unit="سفارش" />
        </div>

        {/* ── کسب‌وکارهای زیر نمایندگی ── */}
        <section className="flex flex-col gap-2.5">
          <b className="px-1 text-[13px] font-bold text-text">کسب‌وکارهای زیر نمایندگی</b>
          <div className="grid gap-2.5 lg:grid-cols-2">
            {(stats?.businesses ?? []).map((b) => (
              <button
                key={b.id}
                type="button"
                data-rep-biz
                onClick={() => setBizSheet(b)}
                className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-4 text-start transition-colors hover:border-accent/40"
              >
                <span className="grid size-11 shrink-0 place-items-center rounded-full bg-accent-soft text-[14px] font-black text-accent-strong">
                  {b.name.slice(0, 1)}
                </span>
                <span className="min-w-0 flex-1">
                  <b className="block truncate text-[13px] font-bold text-text">{b.name}</b>
                  <span className="mt-0.5 block truncate text-[10.5px] text-text-3">
                    {b.trade ?? "—"} · {b.city ?? "—"}
                  </span>
                  <span className="mt-1 block text-[10px] text-text-4">
                    {fa(b.stats.ordersMonth)} سفارش ماه · {fa(Math.round(b.stats.salesMonth / 10 / 10000) / 100)} میلیون فروش
                    {b.stats.pct ? ` · پورسانت ${fa(b.stats.pct)}٪` : ""}
                  </span>
                </span>
                <Icon name="chev" size={15} className="shrink-0 text-text-4 rtl:-scale-x-100" />
              </button>
            ))}
            {(stats?.businesses ?? []).length === 0 && (
              <div className="rounded-2xl border border-dashed border-line-2 bg-surface px-4 py-8 text-center lg:col-span-2">
                <b className="block text-[12.5px] font-bold text-text-2">هنوز کسب‌وکاری زیر نمایندگی نداری</b>
                <span className="mt-1 block text-[11px] leading-[1.9] text-text-4">
                  سفارش اولت را ثبت کن — داشبورد با همان کسب‌وکار زنده می‌شود
                </span>
              </div>
            )}
          </div>
        </section>

        {/* ── گزارش واحد سفارش‌ها + فیلتر کسب‌وکار ── */}
        <section className="flex flex-col gap-2.5">
          <div className="flex items-center justify-between px-1">
            <b className="text-[13px] font-bold text-text">سفارش‌های کسب‌وکارها</b>
            <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[10px] font-bold text-text-3">
              {fa(filtered.length)}
            </span>
          </div>

          {/* چیپ فیلتر کسب‌وکار (همه + هر کسب‌وکار) */}
          {(stats?.businesses ?? []).length > 0 && (
            <div className="scrollbar-none flex items-center gap-1.5 overflow-x-auto pb-0.5">
              <FilterChip active={filter === "all"} onClick={() => setFilter("all")}>
                همه
              </FilterChip>
              {(stats?.businesses ?? []).map((b) => (
                <FilterChip key={b.id} active={filter === b.id} onClick={() => setFilter(b.id)}>
                  {b.name}
                </FilterChip>
              ))}
            </div>
          )}

          <div className="flex flex-col gap-2.5">
            {filtered.length === 0 && (
              <div className="rounded-2xl border border-dashed border-line-2 bg-surface px-4 py-8 text-center">
                <Icon name="receipt" size={24} className="mx-auto text-text-4" />
                <b className="mt-2 block text-[12.5px] font-bold text-text-2">سفارشی در این فیلتر نیست</b>
                <span className="mt-1 block text-[11px] text-text-4">سفارش تازه بگیر — ثبتش همین‌جا می‌نشیند</span>
              </div>
            )}
            {filtered.map((o) => {
              const face = STATUS_FACE[o.status];
              return (
                <button
                  key={o.id}
                  type="button"
                  data-rep-order={o.status}
                  onClick={() => setOrderSheet(o)}
                  className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-4 text-start transition-colors hover:border-line-2"
                >
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent-soft text-accent-strong">
                    <Icon name="receipt" size={17} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                      <b className="truncate text-[12.5px] font-bold text-text">{o.customerName}</b>
                      <span className={cn("rounded-full px-1.5 py-0.5 text-[9.5px] font-bold", face.cls)}>{face.label}</span>
                    </div>
                    <span className="mt-0.5 block truncate text-[10.5px] text-text-3">
                      {o.items[0]?.name ?? "—"}
                      {o.itemCount > 1 ? ` +${fa(o.itemCount - 1)} قلم` : ""} · {o.business.name}
                    </span>
                  </span>
                  <span className="flex shrink-0 flex-col items-end">
                    <b className="text-[12.5px] font-black tabular-nums text-text">
                      {fa(Math.round(o.totalMinor / 10))}
                    </b>
                    <span className="text-[9.5px] text-text-4">
                      پورسانت {fa(Math.round(o.commissionMinor / 10))}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>

          {/* ثبت سفارش تازه (دکمهٔ اصلی صفحه) */}
          <Button variant="arm" size="lg" className="mt-1 w-full" onClick={() => setCreateOpen(true)}>
            <Icon name="plus" size={17} />
            ثبت سفارش تازه
          </Button>

          <p className="flex items-start gap-2 rounded-2xl border border-line bg-surface-2 px-4 py-3 text-[10.5px] leading-[1.95] text-text-3">
            <Icon name="info" size={14} className="mt-0.5 shrink-0 text-accent-strong" />
            پورسانت‌ها با هر کسب‌وکار توافق می‌شود؛ سفارش را تو می‌گیری، لیستش را برای تأمین‌کننده می‌فرستی و پس از
            تحویل، پورسانتت را همان‌جا می‌گیری.
          </p>
        </section>
      </div>

      {/* ── شیت کسب‌وکار زیر نمایندگی (لینک‌های خواستهٔ مالک) ── */}
      {bizSheet && (
        <Sheet open onClose={() => setBizSheet(null)} title={bizSheet.name}>
          <p className="mb-3 text-[11px] text-text-3">
            {bizSheet.trade ?? "—"} · {bizSheet.city ?? "—"} · {fa(bizSheet.catalogCount)} کالا در کاتالوگ
          </p>
          <div className="mb-3 grid grid-cols-3 gap-2">
            {[
              { v: bizSheet.stats.pct ? `${fa(bizSheet.stats.pct)}٪` : "—", l: "پورسانت توافقی" },
              { v: fa(Math.round(bizSheet.stats.commissionMonth / 10)), l: "پورسانت این ماه" },
              { v: fa(bizSheet.stats.ordersMonth), l: "سفارش این ماه" },
            ].map((t) => (
              <div key={t.l} className="flex flex-col items-center gap-1 rounded-xl border border-line bg-bg px-2 py-3">
                <b className="text-[15px] font-black leading-none text-text">{t.v}</b>
                <span className="text-center text-[9.5px] leading-[1.5] text-text-3">{t.l}</span>
              </div>
            ))}
          </div>
          <div className="flex flex-col gap-2">
            {[
              {
                icon: "store" as const,
                title: "میز فروش این کسب‌وکار",
                sub: "کارتابل سفارش‌ها و مشتریانِ همین کسب‌وکار",
                href: "/sell",
                cls: "bg-primary-soft text-primary-strong",
              },
              {
                icon: "tag" as const,
                title: "کاتالوگ و محصولات",
                sub: "مدیریت محصولات و قیمت‌های همین کسب‌وکار",
                href: "/catalog",
                cls: "bg-primary-soft text-primary-strong",
              },
              {
                icon: "receipt" as const,
                title: "سفارش‌های این کسب‌وکار",
                sub: "فیلتر گزارش سفارش‌ها روی همین کسب‌وکار",
                href: "",
                cls: "bg-accent-soft text-accent-strong",
              },
            ].map((r) => (
              <button
                key={r.title}
                type="button"
                onClick={() => {
                  setBizSheet(null);
                  if (r.href) router.push(r.href);
                  else {
                    setFilter(bizSheet.id);
                    window.scrollTo({ top: 0 });
                  }
                }}
                className="flex items-center gap-3 rounded-xl border border-line bg-surface p-3 text-start transition-colors hover:border-line-2"
              >
                <span className={cn("grid size-10 shrink-0 place-items-center rounded-xl", r.cls)}>
                  <Icon name={r.icon} size={18} />
                </span>
                <span className="min-w-0 flex-1">
                  <b className="block text-[12.5px] font-bold text-text">{r.title}</b>
                  <span className="mt-0.5 block text-[10.5px] text-text-3">{r.sub}</span>
                </span>
                <Icon name="chev" size={14} className="shrink-0 text-text-4 rtl:-scale-x-100" />
              </button>
            ))}
          </div>
          <p className="mt-3 text-[10px] leading-[1.8] text-text-4">
            دسترسی‌ها بر اساس نقش تو در این کسب‌وکار است — نمایندهٔ فروش / بازاریاب / ویزیتور.
          </p>
        </Sheet>
      )}

      {/* ── شیت سفارش: چرخهٔ بازاریاب سنتی — شیت با هر گام زنده می‌ماند ── */}
      {orderSheet && (
        <RepOrderSheet
          order={orderSheet}
          onClose={() => setOrderSheet(null)}
          onChanged={() => void refresh()}
        />
      )}

      {/* ── شیت ثبت سفارش تازه ── */}
      {createOpen && (
        <CreateRepOrderSheet
          businesses={stats?.businesses ?? []}
          onClose={() => setCreateOpen(false)}
          onCreated={async () => {
            setCreateOpen(false);
            await refresh();
          }}
        />
      )}
    </AppShell>
  );
}

/* ═══ کاشی آمار — همان زبان میزها (FD-16)، رنگ فیروزه‌ای ═══ */
function Tile({
  icon,
  title,
  value,
  unit,
  sub,
}: {
  icon: Parameters<typeof Icon>[0]["name"];
  title: string;
  value: string;
  unit: string;
  sub?: string;
}) {
  return (
    <div data-rep-tile className="flex flex-col gap-2 rounded-2xl border border-line bg-surface p-4">
      <div className="flex items-center gap-2">
        <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-accent-soft text-accent-strong">
          <Icon name={icon} size={15} />
        </span>
        <b className="truncate text-[11px] font-bold text-text-2">{title}</b>
      </div>
      <div className="flex items-baseline gap-1">
        <b className="text-[21px] font-black leading-none tabular-nums text-text">{value}</b>
        <span className="text-[9.5px] text-text-4">{unit}</span>
      </div>
      {sub && <span className="text-[9.5px] font-bold text-amber">{sub}</span>}
    </div>
  );
}

function FilterChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      data-filter-chip={active ? "on" : "off"}
      onClick={onClick}
      className={cn(
        "shrink-0 rounded-full px-3 py-1.5 text-[11px] font-bold transition-colors",
        active ? "bg-accent-soft text-accent-strong" : "bg-surface-2 text-text-3 hover:text-text-2"
      )}
    >
      {children}
    </button>
  );
}

/* ═══ شیت سفارش — فقط گامِ بعدی نشان داده می‌شود (روایت FD-17);
   چرخه در همین شیت پیش می‌رود: هر پیشبرد، وضعیتِ زندهٔ شیت را به‌روز
   می‌کند و فهرست پشت‌صحنه تازه می‌شود — شیت نمی‌پرد (الگوی ro-act) ═══ */
function RepOrderSheet({
  order,
  onClose,
  onChanged,
}: {
  order: RepOrderDto;
  onClose: () => void;
  onChanged: () => void;
}) {
  const { show } = useToast();
  const [busy, setBusy] = useState(false);
  const [sharedText, setSharedText] = useState<string | null>(null);
  /** وضعیت زندهٔ سفارش — با هر پیشبرد همان‌جا به‌روز می‌شود */
  const [live, setLive] = useState<RepOrderDto>(order);

  const advance = async (fn: () => Promise<RepOrderDto>, okText: string) => {
    if (busy) return;
    setBusy(true);
    try {
      const updated = await fn();
      setLive(updated);
      show({ text: okText, kind: "success" });
      onChanged(); // فهرست و کاشی‌ها پشت‌صحنه تازه می‌شوند — شیت باز می‌ماند
    } catch (e) {
      show({ text: e instanceof Error ? e.message : "انجام نشد", kind: "error" });
    } finally {
      setBusy(false);
    }
  };

  const share = (via: RepShareVia) => {
    void advance(async () => {
      const r = await repApi.share(live.businessId, live.id, via);
      setSharedText(r.text);
      if (via === "WHATSAPP") window.open(`https://wa.me/?text=${encodeURIComponent(r.text)}`, "_blank");
      else if (via === "SMS") window.open(`sms:?body=${encodeURIComponent(r.text)}`, "_self");
      else void navigator.clipboard?.writeText(r.text).catch(() => {});
      return r.order;
    }, via === "CLIPBOARD" ? "لیست سفارش کپی شد" : `لیست سفارش با ${VIA_LABEL[via]} فرستاده شد`);
  };

  const face = STATUS_FACE[live.status];

  return (
    <Sheet open onClose={onClose} title={`سفارش ${order.customerName}`}>
      <div className="flex flex-col gap-4">
        {/* قلم‌های سفارش */}
        <div className="flex flex-col gap-2 rounded-2xl border border-line bg-surface p-3.5">
          {live.items.map((it, i) => (
            <div key={i} className="flex items-center gap-3">
              <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-accent-soft text-[10px] font-black text-accent-strong">
                {fa(i + 1)}
              </span>
              <div className="min-w-0 flex-1">
                <b className="block truncate text-[12px] font-bold text-text">{it.name}</b>
                <span className="mt-0.5 block truncate text-[10px] text-text-4">
                  {it.pack ? `${it.pack} · ` : ""}× {fa(it.qty)} — {fa(Math.round((it.qty * it.unitPriceMinor) / 10))} تومان
                </span>
              </div>
            </div>
          ))}
          <div className="mt-1 flex items-center justify-between border-t border-line pt-2.5 text-[11.5px]">
            <span className="text-text-3">مبلغ سفارش</span>
            <b className="tabular-nums text-text">{fa(Math.round(live.totalMinor / 10))} تومان</b>
          </div>
        </div>

        {/* پورسانت و وضعیت */}
        <div className="flex items-center justify-between rounded-xl border border-line bg-surface-2 px-3.5 py-2.5">
          <span className="flex items-center gap-1.5 text-[11.5px] text-text-2">
            <Icon name="percent" size={14} className="text-accent-strong" />
            پورسانت {fa(live.commissionPct)}٪ = {fa(Math.round(live.commissionMinor / 10))} تومان
          </span>
          <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-bold", face.cls)}>{face.label}</span>
        </div>

        {/* گام بعدی — فقط همان گام (ro-act پروتوتایپ) */}
        {live.status === "NEW" && (
          <div data-rep-step="new" className="flex flex-col gap-2">
            <p className="text-[11px] leading-[1.9] text-text-3">
              لیست این سفارش را برای تأمین‌کننده بفرست — بیرون از آی‌مچ، مثل بازاریاب:
            </p>
            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  { via: "WHATSAPP" as RepShareVia, icon: "whatsapp" as const, label: "واتس‌اپ", cls: "bg-[#25D366] text-white" },
                  { via: "SMS" as RepShareVia, icon: "msg" as const, label: "پیامک", cls: "bg-primary text-white" },
                  { via: "CLIPBOARD" as RepShareVia, icon: "copy" as const, label: "کپی لیست", cls: "bg-surface-2 text-text-2" },
                ]
              ).map((o) => (
                <button
                  key={o.via}
                  type="button"
                  data-ro-send={o.via}
                  disabled={busy}
                  onClick={() => share(o.via)}
                  className="flex flex-col items-center gap-1.5 rounded-xl border border-line bg-surface py-3 transition-colors hover:border-line-2 active:scale-[.98] disabled:opacity-50"
                >
                  <span className={cn("grid size-10 place-items-center rounded-full", o.cls)}>
                    <Icon name={o.icon} size={18} />
                  </span>
                  <span className="text-[11px] font-bold text-text-2">{o.label}</span>
                </button>
              ))}
            </div>
            {sharedText && (
              <div className="rounded-xl border border-line bg-surface-2 p-3 text-[10.5px] leading-[1.9] text-text-3" dir="rtl">
                {sharedText}
              </div>
            )}
          </div>
        )}

        {live.status === "SENT" && (
          <div data-rep-step="sent" className="flex flex-col gap-2">
            <p className="text-[11px] leading-[1.9] text-text-3">
              لیست برای تأمین‌کننده فرستاده شد{live.sharedVia ? ` (${VIA_LABEL[live.sharedVia]})` : ""} — تا کالا تحویل
              مشتری شود، پورسانت در انتظار است.
            </p>
            <Button variant="arm" size="lg" disabled={busy} onClick={() => void advance(() => repApi.deliver(live.businessId, live.id), "تحویل ثبت شد — پورسانت در انتظار تسویه")}>
              <Icon name="check" size={16} />
              تحویل شد
            </Button>
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                void navigator.clipboard
                  ?.writeText(
                    live.items.map((it) => `• ${it.name}${it.pack ? ` (${it.pack})` : ""} × ${fa(it.qty)}`).join("\n")
                  )
                  .catch(() => {});
                show({ text: "لیست سفارش دوباره کپی شد", kind: "success" });
              }}
              className="mx-auto text-[11px] font-bold text-accent-strong underline underline-offset-4"
            >
              ارسال دوبارهٔ لیست سفارش (کپی)
            </button>
          </div>
        )}

        {live.status === "DELIVERED" && (
          <div data-rep-step="delivered" className="flex flex-col gap-2">
            <p className="text-[11px] leading-[1.9] text-text-3">
              کالا تحویل مشتری شد — پورسانت این سفارش ({fa(Math.round(live.commissionMinor / 10))} تومان) را از
              تأمین‌کننده بگیر و تسویه کن.
            </p>
            <Button variant="arm" size="lg" disabled={busy} onClick={() => void advance(() => repApi.settle(live.businessId, live.id), "تسویه شد — در درآمد ماهت حساب شد")}>
              <Icon name="wallet" size={16} />
              پورسانت دریافت شد — تسویه
            </Button>
          </div>
        )}

        {live.status === "SETTLED" && (
          <div data-rep-step="settled" className="flex flex-col items-center gap-2 rounded-2xl border border-green/30 bg-green-soft/40 px-4 py-6">
            <span className="grid size-12 place-items-center rounded-full bg-green text-white">
              <Icon name="check" size={22} />
            </span>
            <b className="text-[13.5px] font-black text-text">تسویه شد</b>
            <span className="text-center text-[11px] leading-[1.9] text-text-3">
              پورسانت این سفارش ({fa(Math.round(live.commissionMinor / 10))} تومان) دریافت شد و در درآمد ماهت حساب شد.
            </span>
          </div>
        )}
      </div>
    </Sheet>
  );
}

/* ═══ شیت ثبت سفارش تازه — قلم‌های آزاد + پورسانت توافقی ═══ */
function CreateRepOrderSheet({
  businesses,
  onClose,
  onCreated,
}: {
  businesses: RepStatsDto["businesses"];
  onClose: () => void;
  onCreated: () => void;
}) {
  const { show } = useToast();
  const [businessId, setBusinessId] = useState(businesses[0]?.id ?? "");
  const [customerName, setCustomerName] = useState("");
  const [pct, setPct] = useState("۳");
  const [items, setItems] = useState<{ name: string; pack: string; qty: string; price: string }[]>([
    { name: "", pack: "", qty: "", price: "" },
  ]);
  const [busy, setBusy] = useState(false);

  const pctNum = parseNum(pct);
  const valid =
    !!businessId &&
    customerName.trim().length > 0 &&
    pctNum >= 1 &&
    pctNum <= 100 &&
    items.some((it) => it.name.trim() && parseNum(it.qty) > 0 && parseNum(it.price) >= 0);

  const totalToman = items.reduce(
    (sum, it) => sum + parseNum(it.qty) * parseNum(it.price),
    0
  );

  const create = async () => {
    if (!valid || busy) return;
    setBusy(true);
    try {
      await repApi.create(
        businessId,
        customerName.trim(),
        items
          .filter((it) => it.name.trim() && parseNum(it.qty) > 0)
          .map((it) => ({
            name: it.name.trim(),
            pack: it.pack.trim() || null,
            qty: parseNum(it.qty),
            unitPriceMinor: parseNum(it.price) * 10, // تومان → ریال
          })),
        pctNum
      );
      show({ text: "سفارش نمایندگی ثبت شد", kind: "success" });
      onCreated();
    } catch (e) {
      show({ text: e instanceof Error ? e.message : "ثبت نشد", kind: "error" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet open onClose={onClose} title="ثبت سفارش نمایندگی">
      <div className="flex flex-col gap-4">
        {/* انتخاب میز (کدام کسب‌وکار) */}
        {businesses.length > 1 && (
          <div className="flex flex-col gap-2">
            <b className="text-[12px] font-bold text-text-2">میزِ کدام کسب‌وکار؟</b>
            <div className="scrollbar-none flex gap-1.5 overflow-x-auto pb-0.5">
              {businesses.map((b) => (
                <FilterChip key={b.id} active={businessId === b.id} onClick={() => setBusinessId(b.id)}>
                  {b.name}
                </FilterChip>
              ))}
            </div>
          </div>
        )}

        {/* مشتری */}
        <label className="flex flex-col gap-1.5">
          <b className="text-[12px] font-bold text-text-2">نام مشتری</b>
          <input
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            placeholder="مثلاً رستوران مهر"
            className="h-11 rounded-xl border border-line bg-bg px-3.5 text-[13.5px] text-text placeholder:text-text-4 focus:border-accent/50 focus:outline-none focus:ring-2 focus:ring-accent/15"
          />
        </label>

        {/* قلم‌های آزاد */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <b className="text-[12px] font-bold text-text-2">قلم‌های سفارش</b>
            <button
              type="button"
              onClick={() => setItems((arr) => [...arr, { name: "", pack: "", qty: "", price: "" }])}
              className="flex items-center gap-1 rounded-full bg-accent-soft px-2.5 py-1 text-[10.5px] font-bold text-accent-strong"
            >
              <Icon name="plus" size={12} />
              قلم تازه
            </button>
          </div>
          {items.map((it, i) => (
            <div key={i} className="flex flex-col gap-1.5 rounded-xl border border-line bg-bg p-3">
              <div className="flex gap-1.5">
                <input
                  value={it.name}
                  onChange={(e) => setItems((arr) => arr.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))}
                  placeholder="نام کالا (مثلاً روغن سرخ‌کردنی)"
                  className="h-10 flex-1 rounded-lg border border-line bg-surface px-3 text-[12.5px] text-text placeholder:text-text-4 focus:border-accent/50 focus:outline-none"
                />
                <input
                  value={it.pack}
                  onChange={(e) => setItems((arr) => arr.map((x, j) => (j === i ? { ...x, pack: e.target.value } : x)))}
                  placeholder="بسته (اختیاری)"
                  className="h-10 w-[38%] rounded-lg border border-line bg-surface px-3 text-[12.5px] text-text placeholder:text-text-4 focus:border-accent/50 focus:outline-none"
                />
              </div>
              <div className="flex gap-1.5">
                <input
                  value={it.qty}
                  onChange={(e) => setItems((arr) => arr.map((x, j) => (j === i ? { ...x, qty: e.target.value } : x)))}
                  inputMode="numeric"
                  placeholder="تعداد"
                  aria-label={`تعداد قلم ${fa(i + 1)}`}
                  className="h-10 w-[30%] rounded-lg border border-line bg-surface px-3 text-[12.5px] font-bold text-text placeholder:font-normal placeholder:text-text-4 focus:border-accent/50 focus:outline-none"
                />
                <input
                  value={it.price}
                  onChange={(e) => setItems((arr) => arr.map((x, j) => (j === i ? { ...x, price: e.target.value } : x)))}
                  inputMode="numeric"
                  placeholder="قیمت واحد (تومان)"
                  aria-label={`قیمت واحد قلم ${fa(i + 1)}`}
                  className="h-10 flex-1 rounded-lg border border-line bg-surface px-3 text-[12.5px] font-bold text-text placeholder:font-normal placeholder:text-text-4 focus:border-accent/50 focus:outline-none"
                />
                {items.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setItems((arr) => arr.filter((_, j) => j !== i))}
                    aria-label="حذف قلم"
                    className="grid size-10 shrink-0 place-items-center rounded-lg text-text-3 hover:bg-red-bg hover:text-red"
                  >
                    <Icon name="trash" size={15} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* پورسانت توافقی */}
        <div className="flex items-center gap-3 rounded-xl border border-line bg-bg p-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-accent-soft text-accent-strong">
            <Icon name="percent" size={15} />
          </span>
          <label className="min-w-0 flex-1">
            <b className="block text-[11.5px] font-bold text-text-2">پورسانت توافقی (٪)</b>
            <input
              value={pct}
              onChange={(e) => setPct(e.target.value)}
              inputMode="numeric"
              aria-label="پورسانت توافقی درصد"
              className="mt-1 h-9 w-[72px] rounded-lg border border-line bg-surface px-2.5 text-[13px] font-bold text-text focus:border-accent/50 focus:outline-none"
            />
          </label>
          {totalToman > 0 && (
            <span className="shrink-0 text-end text-[10.5px] leading-[1.7] text-text-3">
              جمع سفارش
              <b className="block text-[13px] font-black tabular-nums text-text">{fa(totalToman)} تومان</b>
              <span className="text-accent-strong">پورسانت ≈ {fa(Math.round((totalToman * pctNum) / 100))} تومان</span>
            </span>
          )}
        </div>

        <Button variant="arm" size="lg" className="w-full" disabled={!valid || busy} onClick={() => void create()}>
          <Icon name="receipt" size={16} />
          {busy ? "در حال ثبت…" : "ثبت سفارش"}
        </Button>
      </div>
    </Sheet>
  );
}

/* ورودی عددی تایپی: ارقام فارسی/لاتین و جداکننده‌ها را می‌فهمد (FD-26) */
function parseNum(v: string): number {
  const en = v.replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d))).replace(/[^0-9]/g, "");
  return parseInt(en || "0", 10) || 0;
}
