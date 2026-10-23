"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AuthGate } from "@/components/imach/auth-gate";
import { AppShell } from "@/components/imach/app-shell";
import { Icon } from "@/components/ui/icon";
import { Sheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { EmptyState, Spinner } from "@/components/ui/feedback";
import { useToast } from "@/components/ui/toast";
import { useLocale } from "@/i18n/locale-context";
import { useAuthStore } from "@/lib/auth-store";
import { marketApi, pricingApi, type CustomerRowDto } from "@/lib/api";
import { num } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * `/customers` — اسکرین ۰۸: دفتر مشتریان من (M6 · FD-44/45).
 *
 * · مشتری = کسی که کاتالوک تو را ذخیره کرده — فرم ثبت دستی وجود ندارد.
 * · مشتریان جدید (تاییدنشده) بالا با برچسب «جدید» + دکمه‌های تایید/حذف
 *   روی کارت — تا تکلیف روشن شود می‌ماند (FD-44/45).
 * · جستجو + فیلتر صنف/شهر (شیت‌های از پایین) + نوع مشتری (گذری/همکار/قراردادی).
 * · لمس کارت → جزئیات مشتری `/customers/[id]` (نه چت مستقیم).
 * · دعوت مشتری جدید = مخاطبین در حالت pick (الگوی پروتوتایپ ۰۷).
 *
 * قانون مالک M2: فرم فارسی، متن‌ها همین‌جا (فریز i18n).
 */

const CUST_T: Record<string, string> = { PASSING: "گذری", PARTNER: "همکار", CONTRACT: "قراردادی" };
const CUST_ALL = ["PASSING", "PARTNER", "CONTRACT"] as const;

export default function CustomersPage() {
  return (
    <AuthGate>
      <CustomersLedger />
    </AuthGate>
  );
}

function CustomersLedger() {
  const router = useRouter();
  const qc = useQueryClient();
  const { show } = useToast();
  const { locale } = useLocale();
  const businesses = useAuthStore((s) => s.businesses);
  const bizId = businesses[0]?.id ?? "";

  const [q, setQ] = useState("");
  const [tradeFilter, setTradeFilter] = useState<string | null>(null);
  const [cityFilter, setCityFilter] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const [sheet, setSheet] = useState<"trade" | "city" | "type" | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const followersQ = useQuery({
    queryKey: ["market", "followers", bizId],
    queryFn: () => marketApi.getMyFollowers(bizId),
    enabled: !!bizId,
  });

  const rowsAll = followersQ.data?.rows ?? [];
  const newCount = rowsAll.filter((c) => c.isNew).length;

  const trades = useMemo(
    () => [...new Set(rowsAll.map((c) => c.trade).filter((t): t is string => !!t))].sort((a, b) => a.localeCompare(b, "fa")),
    [rowsAll]
  );
  const cities = useMemo(
    () => [...new Set(rowsAll.map((c) => c.city).filter(Boolean))].sort((a, b) => a.localeCompare(b, "fa")),
    [rowsAll]
  );

  const filtered = useMemo(() => {
    const needle = q.trim();
    return rowsAll.filter((c) => {
      if (needle && !c.name.includes(needle) && !c.city.includes(needle) && !(c.trade ?? "").includes(needle)) return false;
      if (tradeFilter && c.trade !== tradeFilter) return false;
      if (cityFilter && c.city !== cityFilter) return false;
      if (typeFilter && (c.custType ?? "PASSING") !== typeFilter) return false;
      return true;
    });
  }, [rowsAll, q, tradeFilter, cityFilter, typeFilter]);

  const refresh = () => void qc.invalidateQueries({ queryKey: ["market", "followers", bizId] });

  const ack = async (c: CustomerRowDto) => {
    setBusyId(c.id);
    try {
      await marketApi.ackFollower(bizId, c.id);
      show({ text: `«${c.name}» تایید شد — از این پس در دفتر مشتریان می‌نشیند`, kind: "success" });
      refresh();
    } catch (e) {
      show({ text: e instanceof Error ? e.message : "تایید نشد", kind: "error" });
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (c: CustomerRowDto) => {
    setBusyId(c.id);
    try {
      await marketApi.removeFollower(bizId, c.id);
      show({ text: `«${c.name}» از دفتر مشتریان حذف شد — هر وقت خواست دوباره ذخیره کند برمی‌گردد`, kind: "info" });
      refresh();
    } catch (e) {
      show({ text: e instanceof Error ? e.message : "حذف نشد", kind: "error" });
    } finally {
      setBusyId(null);
    }
  };

  const anyFilter = tradeFilter || cityFilter || typeFilter;
  const chip = (label: string, active: boolean, onClick: () => void, icon: string) => (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11.5px] font-bold transition-colors",
        active ? "border-arm bg-arm-soft text-arm-strong" : "border-line bg-surface text-text-2"
      )}
    >
      <Icon name={icon as "store"} size={13} />
      {label}
      <Icon name="chevd" size={11} />
    </button>
  );

  return (
    <AppShell
      arm="sell"
      title={`مشتریان من${rowsAll.length ? ` · ${num(rowsAll.length, locale)}` : ""}`}
      back="/sell"
      wide
      toolbar={
        <Button variant="soft" size="sm" onClick={() => router.push("/contacts?pick=1")}>
          <Icon name="user-plus" size={14} />
          دعوت مشتری جدید
        </Button>
      }
    >
      <div className="flex flex-col gap-3">
        {/* جستجو */}
        <div className="relative">
          <Icon name="search" size={17} className="pointer-events-none absolute start-3.5 top-1/2 -translate-y-1/2 text-text-4" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="جستجوی مشتری، کسب‌وکار، شهر…"
            autoComplete="off"
            className="h-11 w-full rounded-xl border border-line bg-surface ps-10 pe-4 text-[14px] text-text placeholder:text-text-4 focus:border-arm focus:outline-none focus:ring-2 focus:ring-arm/20"
          />
        </div>

        {/* فیلترها */}
        <div className="flex items-center gap-2 overflow-x-auto pb-0.5">
          {chip(tradeFilter ?? "صنف", !!tradeFilter, () => setSheet("trade"), "store")}
          {chip(cityFilter ?? "شهر", !!cityFilter, () => setSheet("city"), "pin")}
          {chip(typeFilter ? CUST_T[typeFilter] : "نوع مشتری", !!typeFilter, () => setSheet("type"), "tag")}
          {anyFilter && (
            <button
              type="button"
              onClick={() => {
                setTradeFilter(null);
                setCityFilter(null);
                setTypeFilter(null);
              }}
              className="shrink-0 rounded-full border border-line bg-surface px-3 py-1.5 text-[11.5px] font-bold text-red"
            >
              حذف فیلترها
            </button>
          )}
        </div>

        {/* شمار */}
        <p className="text-[12px] font-bold text-text-3">
          {newCount > 0 ? (
            <span className="text-amber">
              {num(newCount, locale)} مشتری جدید در انتظار تایید · مجموع {num(rowsAll.length, locale)} مشتری
            </span>
          ) : (
            `${num(filtered.length, locale)} مشتری`
          )}
        </p>

        {/* لیست */}
        {followersQ.isLoading ? (
          <div className="grid place-items-center py-16">
            <Spinner />
          </div>
        ) : rowsAll.length === 0 ? (
          <EmptyState
            icon={<Icon name="users" size={30} />}
            title="هنوز مشتری نداری"
            subtitle="لینک کاتالوکت را بفرست — به محض ذخیرهٔ کاتالوک، این‌جا می‌آیند."
            action={
              <Button variant="arm" size="lg" onClick={() => router.push("/contacts?pick=1")}>
                <Icon name="user-plus" size={16} />
                دعوت مشتری جدید
              </Button>
            }
          />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<Icon name="search" size={30} />}
            title="با این فیلترها مشتری‌ای پیدا نشد"
            subtitle="فیلترها را ساده‌تر کن یا لینک کاتالوک را برای مشتریان قدیمی‌ات بفرست."
          />
        ) : (
          <div className="flex flex-col gap-2">
            {filtered.map((c) => (
              <CustomerCard key={c.id} c={c} locale={locale} busy={busyId === c.id} onAck={() => void ack(c)} onRemove={() => void remove(c)} onOpen={() => router.push(`/customers/${c.id}`)} />
            ))}
          </div>
        )}

        <p className="mt-2 flex items-start gap-2 rounded-2xl border border-line bg-surface px-4 py-3 text-[11.5px] leading-5 text-text-3">
          <Icon name="sparkles" size={14} className="mt-0.5 shrink-0 text-amber" />
          لینک کاتالوکت رو به مشتریانت بفرست. به محض ذخیرهٔ کاتالوک، در لیست مشتریان می‌آید.
        </p>
      </div>

      {/* شیت فیلتر صنف */}
      <Sheet open={sheet === "trade"} onClose={() => setSheet(null)} title="فیلتر صنف">
        <div className="flex flex-col gap-1.5 p-4 pt-0">
          <p className="pb-1 text-[12px] text-text-3">فقط مشتریان یک صنف را ببین.</p>
          {trades.length === 0 ? (
            <p className="py-4 text-center text-[12.5px] text-text-3">صنفِ ثبت‌شده‌ای برای مشتریان نیست</p>
          ) : (
            trades.map((t) => (
              <FilterRow key={t} label={t} active={tradeFilter === t} onClick={() => { setTradeFilter(tradeFilter === t ? null : t); setSheet(null); }} />
            ))
          )}
        </div>
      </Sheet>

      {/* شیت فیلتر شهر */}
      <Sheet open={sheet === "city"} onClose={() => setSheet(null)} title="فیلتر شهر">
        <div className="flex flex-col gap-1.5 p-4 pt-0">
          <p className="pb-1 text-[12px] text-text-3">مشتریان یک شهر را ببین.</p>
          {cities.map((t) => (
            <FilterRow key={t} label={t} active={cityFilter === t} onClick={() => { setCityFilter(cityFilter === t ? null : t); setSheet(null); }} />
          ))}
        </div>
      </Sheet>

      {/* شیت فیلتر نوع مشتری */}
      <Sheet open={sheet === "type"} onClose={() => setSheet(null)} title="نوع مشتری">
        <div className="flex flex-col gap-1.5 p-4 pt-0">
          <p className="pb-1 text-[12px] text-text-3">نوع مشتری را خودت از منوی کارت تعیین می‌کنی — قیمت نهایی خریدار همین‌جا می‌آید.</p>
          {CUST_ALL.map((t) => (
            <FilterRow key={t} label={CUST_T[t]} active={typeFilter === t} onClick={() => { setTypeFilter(typeFilter === t ? null : t); setSheet(null); }} />
          ))}
        </div>
      </Sheet>
    </AppShell>
  );
}

function FilterRow({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center justify-between rounded-xl border px-4 py-3 text-start text-[13px] font-bold transition-colors",
        active ? "border-arm bg-arm-soft text-arm-strong" : "border-line bg-surface text-text"
      )}
    >
      {label}
      {active && <Icon name="check" size={15} />}
    </button>
  );
}

/* ─────────────── کارت مشتری ─────────────── */

function CustomerCard({
  c,
  locale,
  busy,
  onAck,
  onRemove,
  onOpen,
}: {
  c: CustomerRowDto;
  locale: string;
  busy: boolean;
  onAck: () => void;
  onRemove: () => void;
  onOpen: () => void;
}) {
  const [typeOpen, setTypeOpen] = useState(false);
  const qc = useQueryClient();
  const { show } = useToast();
  const businesses = useAuthStore((s) => s.businesses);
  const bizId = businesses[0]?.id ?? "";

  const setType = async (t: "PASSING" | "PARTNER" | "CONTRACT") => {
    try {
      await pricingApi.setCustType({ businessId: bizId, buyerId: c.id, type: t });
      show({ text: `«${c.name}» → ${CUST_T[t]}`, kind: "success" });
      setTypeOpen(false);
      void qc.invalidateQueries({ queryKey: ["market", "followers", bizId] });
    } catch (e) {
      show({ text: e instanceof Error ? e.message : "تغییر نوع نشد", kind: "error" });
    }
  };

  const lastReq = c.latestRequest;

  return (
    <div className={cn("rounded-2xl border bg-surface p-4 transition-colors", c.isNew ? "border-amber/50" : "border-line")}>
      <button type="button" onClick={onOpen} className="flex w-full items-center gap-3 text-start">
        <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-arm-soft text-[18px] font-black text-arm-strong">
          {c.name.slice(0, 1)}
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-1.5">
            <b className="truncate text-[14px] font-bold text-text">{c.name}</b>
            {c.isVerified && <Icon name="verified" size={14} className="shrink-0 text-primary" />}
            {c.isNew && (
              <span className="shrink-0 rounded-full bg-amber px-2 py-0.5 text-[10px] font-bold text-white">جدید</span>
            )}
            <span className="shrink-0 rounded-full bg-surface-2 px-2 py-0.5 text-[10px] font-bold text-text-3">
              {CUST_T[c.custType ?? "PASSING"]}
            </span>
          </span>
          <span className="mt-0.5 block truncate text-[11.5px] text-text-3">
            {c.trade ? `${c.trade} · ` : ""}
            {c.city}
            {lastReq ? ` · نیاز: ${lastReq.good.nameFa}` : ""}
          </span>
          <span className="mt-0.5 block truncate text-[11px] text-text-4">
            از {new Date(c.followedAt).toLocaleDateString("fa-IR")} · {num(c.orderCount ?? 0, locale)} سفارش ·{" "}
            {num(c.inquiryCount ?? 0, locale)} استعلام
          </span>
        </span>
        <Icon name="chev" size={18} className="shrink-0 text-text-4 rtl:-scale-x-100" />
      </button>

      {/* مشتری جدید: تایید/حذف — روی کارت (FD-44/45) */}
      {c.isNew && (
        <div className="mt-3 flex items-center gap-2">
          <Button variant="arm" size="sm" className="flex-1" loading={busy} onClick={onAck}>
            <Icon name="check" size={14} />
            تایید
          </Button>
          <Button variant="outline" size="sm" className="flex-1 !text-red !border-red/30" loading={busy} onClick={onRemove}>
            <Icon name="x" size={14} />
            حذف
          </Button>
        </div>
      )}
    </div>
  );
}
