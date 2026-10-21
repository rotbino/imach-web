"use client";

import { useEffect, useMemo, useState } from "react";
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
import { goodsApi, marketApi, type GoodDto } from "@/lib/api";
import { goodName, num, unitLabel } from "@/lib/format";
import { BarcodeScanSheet, toEnDigits } from "@/components/imach/buy-list-shared";
import { cn } from "@/lib/utils";

/**
 * `/buy-list/low-stock` — اسکرین ۲۰ج: «در حال اتمام موجودی» (M3 · FD-43).
 *
 * حکم مالک FD-43: «یه باکس در حال اتمام موجودی بزاریم که کاربر بتونه
 * اجناسی از لیست خرید که در حال اتمام موجودی هست رو اضافه کنه… این دکمه
 * در واقع یه مدال باز می‌کنه که کاربر سریع می‌تونه سرچ بزنه» —
 *  · لیست زندهٔ lowStock (خالی = EmptyState)
 *  · «یه کادر توضیح واضح زیر لیست» (کال‌آوت راهنما)
 *  · دکمهٔ افزودن → مدال sheet-lowstock-add: جستجوی زنده — اول
 *    «از لیست خریدت» (تازه با + / افزوده با بج سبز)، بعد «از همهٔ
 *    کالاها» («اگر در لیست خرید نبود… همزمان به لیست خرید هم اضافه بشه»)
 *  · آیکون اسکن ته سرچ → شیت زمینه‌دار (mode=lowstock)
 *  · حذف آیتم: × آرام انتهای ردیف — سادگی همیشگی
 */

export default function LowStockPage() {
  return (
    <AuthGate>
      <LowStock />
    </AuthGate>
  );
}

function LowStock() {
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

  const [addOpen, setAddOpen] = useState(false);
  const [scanOpen, setScanOpen] = useState(false);

  const rows = useMemo(
    () => (watchedQ.data ?? []).filter((w) => !w.archivedAt && w.lowStock),
    [watchedQ.data]
  );
  const listRows = useMemo(() => (watchedQ.data ?? []).filter((w) => !w.archivedAt), [watchedQ.data]);

  const nameOf = (r: (typeof rows)[number]) =>
    r.good ? goodName({ nameFa: r.good.nameFa, nameEn: r.good.nameEn }, locale) : "—";

  const unflag = async (goodId: string, name: string) => {
    try {
      await marketApi.setLowStock(bizId, goodId, false);
      await qc.invalidateQueries({ queryKey: ["market", "watched", bizId] });
      show({ text: `«${name}» از فهرست رو به اتمام کنار رفت`, kind: "success" });
    } catch {
      show({ text: "برداشتن نشان نشد — دوباره تلاش کن", kind: "error" });
    }
  };

  return (
    <AppShell arm="buy" title="در حال اتمام موجودی" wide back="/buy-list">
      <div className="flex flex-col gap-3">
        <h2 className="text-[15px] font-bold text-text">رو به اتمام</h2>

        {/* ── لیست کالاهای رو به اتمام ── */}
        {watchedQ.isLoading ? (
          <div className="grid place-items-center py-16">
            <Spinner className="size-7 text-arm" />
          </div>
        ) : rows.length === 0 ? (
          <EmptyState
            icon={<Icon name="boxes" size={30} />}
            title="هیچ نوع کالایی رو به اتمام نیست"
            subtitle="نوع کالاهایی که موجودی‌شان کم می‌آید را اینجا نشانه‌گذاری کن تا در سفارش بعدی جا نمانند"
            action={
              <Button variant="arm" size="lg" onClick={() => setAddOpen(true)}>
                <Icon name="plus" size={17} />
                افزودن نوع کالا
              </Button>
            }
          />
        ) : (
          <div className="flex flex-col gap-2.5">
            {rows.map((r) => (
              <div
                key={r.goodId}
                className="flex items-center gap-3 rounded-2xl border border-amber/45 bg-amber-soft/40 p-3.5"
              >
                <button
                  type="button"
                  onClick={() => router.push(`/suppliers?good=${r.goodId}`)}
                  className="flex min-w-0 flex-1 items-center gap-3 text-start"
                >
                  <span className="grid size-[52px] shrink-0 place-items-center rounded-xl bg-amber-soft text-[22px] font-black text-amber">
                    {nameOf(r).slice(0, 1)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <b className="block truncate text-[14.5px] font-bold text-text">{nameOf(r)}</b>
                    <span className="mt-0.5 block text-[11.5px] text-text-3">
                      {r.volume !== null && r.volume !== undefined && r.good?.unit
                        ? `${num(r.volume, locale)} ${unitLabel(r.good.unit, locale)} · `
                        : ""}
                      {num(r.supplierCount, locale)} تأمین‌کننده
                    </span>
                  </span>
                </button>
                {/* حذف آیتم — × آرام (FD-43: «سادگی همیشگی») */}
                <button
                  type="button"
                  onClick={() => void unflag(r.goodId, nameOf(r))}
                  title="برداشتن نشان رو به اتمام"
                  aria-label="برداشتن نشان رو به اتمام"
                  className="grid size-9 shrink-0 place-items-center rounded-full text-text-3 transition-colors hover:bg-red-bg hover:text-red"
                >
                  <Icon name="x" size={16} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* ── «یه کادر توضیح واضح زیر لیستش» (حکم مالک FD-43) ── */}
        <div className="mt-2 flex items-start gap-2.5 rounded-2xl border border-line-2 bg-surface px-4 py-3.5 text-[12.5px] leading-6 text-text-2">
          <Icon name="info" size={17} className="mt-0.5 shrink-0 text-arm-strong" />
          <span>
            این فهرست یادآور نوع کالاهایی است که موجودی‌شان رو به پایان است. با دکمهٔ زیر، نوع کالای موردنظر را از لیست خریدت
            انتخاب کن یا بارکدش را اسکن کن؛ نوع کالایی که هنوز در لیست خریدت نیست، همان لحظه به هر دو فهرست اضافه می‌شود
            تا در سفارش بعدی‌ات جا نماند.
          </span>
        </div>

        <Button variant="arm" size="lg" onClick={() => setAddOpen(true)} className="mt-1">
          <Icon name="plus" size={17} /> افزودن نوع کالا
        </Button>
      </div>

      {/* ── مدال افزودن سریع (sheet-lowstock-add) ── */}
      <LowStockAddSheet
        open={addOpen}
        onClose={() => setAddOpen(false)}
        bizId={bizId}
        listRows={listRows}
        onDone={(name) => {
          void qc.invalidateQueries({ queryKey: ["market", "watched", bizId] });
          show({ text: `«${name}» به فهرست رو به اتمام اضافه شد`, kind: "success" });
        }}
        onScan={() => {
          setAddOpen(false);
          setScanOpen(true);
        }}
      />

      {/* اسکنر زمینه‌دار — دو رفتار (اتمام موجودی = افزودن به هر دو فهرست) */}
      <BarcodeScanSheet
        open={scanOpen}
        onClose={() => setScanOpen(false)}
        mode="lowstock"
        bizId={bizId}
        onAdded={(_gid, name) => {
          void qc.invalidateQueries({ queryKey: ["market", "watched", bizId] });
          show({ text: `«${name}» به هر دو فهرست اضافه شد`, kind: "success" });
        }}
      />
    </AppShell>
  );
}

/* ═══════════ مدال افزودن به اتمام موجودی — جستجوی زندهٔ دوبخشی ═══════════ */

function LowStockAddSheet({
  open,
  onClose,
  bizId,
  listRows,
  onDone,
  onScan,
}: {
  open: boolean;
  onClose: () => void;
  bizId: string;
  listRows: { goodId: string; lowStock: boolean; good: { nameFa: string; nameEn: string | null; unit: string } | null }[];
  onDone: (name: string) => void;
  onScan: () => void;
}) {
  const { locale } = useLocale();
  const [q, setQ] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    if (open) setQ("");
  }, [open]);

  /* جستجوی «از همهٔ کالاها» — فقط وقتی حرفی تایپ شده */
  const needle = q.trim().toLowerCase();
  const allQ = useQuery({
    queryKey: ["goods", "lsadd", needle],
    queryFn: () => goodsApi.getGoods({ q: needle || undefined, limit: 12 }),
    enabled: open && needle.length > 0,
    staleTime: 60_000,
  });

  const nameOf = (g: { nameFa: string; nameEn: string | null }) => goodName(g, locale);

  /* «از لیست خریدت» — کالاهای فهرستِ هنوز-نشان‌نشده، با جستجو */
  const mine = listRows
    .filter((r) => !r.lowStock)
    .filter((r) =>
      r.good ? (needle ? nameOf(r.good).toLowerCase().includes(needle) : true) : false
    );

  /* «از همهٔ کالاها» — خارج از لیست خریدِ من */
  const mineIds = new Set(listRows.map((r) => r.goodId));
  const others = (allQ.data?.items ?? []).filter((g) => !mineIds.has(g.id));

  const addMine = async (goodId: string, name: string) => {
    setBusyId(goodId);
    try {
      await marketApi.setLowStock(bizId, goodId, true);
      onDone(name);
    } catch {
      /* toast در صفحهٔ مادر */
    } finally {
      setBusyId(null);
    }
  };

  const addOther = async (g: GoodDto) => {
    const name = nameOf(g);
    setBusyId(g.id);
    try {
      // «با انتخابش همزمان به لیست خرید هم اضافه بشه» (حکم مالک FD-43)
      await marketApi.watchGood(bizId, g.id);
      await marketApi.setLowStock(bizId, g.id, true);
      onDone(name);
    } catch {
      /* toast در صفحهٔ مادر */
    } finally {
      setBusyId(null);
    }
  };

  return (
    <Sheet open={open} onClose={onClose} title="افزودن به اتمام موجودی">
      <p className="pb-1 text-[12.5px] leading-6 text-text-3">
        نوع کالایی که رو به پایان است را انتخاب کن — از لیست خریدت یا، اگر آنجا نبود، از فهرست همهٔ نوع کالاها. با اسکن بارکد هم
        می‌شود.
      </p>

      {/* جستجو + اسکن */}
      <div className="relative my-2">
        <Icon
          name="search"
          size={17}
          className="pointer-events-none absolute start-3.5 top-1/2 -translate-y-1/2 text-text-4"
        />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="جستجو — مثلاً روغن، ماکارونی…"
          autoComplete="off"
          className="h-11 w-full rounded-xl border border-line bg-surface ps-10 pe-12 text-[14px] text-text placeholder:text-text-4 focus:border-arm focus:outline-none focus:ring-2 focus:ring-arm/20"
        />
        <button
          type="button"
          onClick={onScan}
          aria-label="اسکن بارکد"
          title="اسکن بارکد — سریع‌تر از جستجو"
          className="absolute end-2 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-lg text-text-3 transition-colors hover:bg-surface-2 hover:text-arm-strong"
        >
          <Icon name="scan" size={16} />
        </button>
      </div>

      {/* ═ بخش ۱ — از لیست خریدت ═ */}
      {(mine.length > 0 || !needle) && (
        <div className="flex flex-col gap-1.5">
          <p className="px-1 pt-2 text-[12px] font-bold text-text-3">
            از لیست خریدت {mine.length > 0 && needle ? `(${num(mine.length, locale)})` : ""}
          </p>
          {mine.length === 0 ? (
            <p className="px-1 py-2 text-[12px] text-text-4">
              {needle ? "نوع کالای نشان‌نشده‌ای با این نام در لیست خریدت نیست" : "همهٔ نوع کالاهای لیست خریدت اینجا نشانه‌گذاری شده‌اند"}
            </p>
          ) : (
            mine.slice(0, 8).map((r) => {
              const name = r.good ? nameOf(r.good) : "—";
              return (
                <AddRow
                  key={r.goodId}
                  name={name}
                  sub={r.good?.unit ? unitLabel(r.good.unit, locale) : undefined}
                  busy={busyId === r.goodId}
                  onAdd={() => void addMine(r.goodId, name)}
                />
              );
            })
          )}
        </div>
      )}

      {/* ═ بخش ۲ — از همهٔ کالاها (فقط با جستجو) ═ */}
      {needle.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <p className="px-1 pt-3 text-[12px] font-bold text-text-3">
            همهٔ نوع کالاها {others.length > 0 ? `(${num(others.length, locale)})` : ""}
          </p>
          {allQ.isLoading ? (
            <div className="grid place-items-center py-5">
              <Spinner className="size-6 text-arm" />
            </div>
          ) : others.length === 0 ? (
            <p className="px-1 py-2 text-[12px] text-text-4">چیز دیگری پیدا نشد — با حرف دیگری جستجو کن</p>
          ) : (
            others.map((g) => {
              const name = nameOf(g);
              return (
                <AddRow
                  key={g.id}
                  name={name}
                  sub={unitLabel(g.unit, locale)}
                  busy={busyId === g.id}
                  fresh /* انتخاب = همزمان به لیست خرید هم اضافه می‌شود */
                  onAdd={() => void addOther(g)}
                />
              );
            })
          )}
        </div>
      )}
    </Sheet>
  );
}

/** ردیف افزودن — الگوی «تازه با + و افزوده با بج سبز» (۲۱) */
function AddRow({
  name,
  sub,
  fresh,
  busy,
  onAdd,
}: {
  name: string;
  sub?: string;
  fresh?: boolean;
  busy: boolean;
  onAdd: () => void;
}) {
  const [added, setAdded] = useState(false);
  return (
    <button
      type="button"
      disabled={busy || added}
      onClick={() => {
        setAdded(true);
        onAdd();
      }}
      className={cn(
        "flex min-h-[56px] items-center gap-3 rounded-xl border px-3.5 text-start transition-colors",
        added
          ? "border-green/30 bg-green-bg"
          : "border-line bg-surface hover:border-arm hover:bg-arm-soft/40"
      )}
    >
      <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-surface-2 text-[16px] font-black text-text-4/70">
        {name.slice(0, 1)}
      </span>
      <span className="min-w-0 flex-1">
        <b className="block truncate text-[13.5px] font-bold text-text">{name}</b>
        {sub && <span className="block truncate text-[11px] text-text-3">{fresh ? `به لیست خرید هم اضافه می‌شود · ${sub}` : sub}</span>}
      </span>
      {added ? (
        <span className="flex shrink-0 items-center gap-1 rounded-full bg-green-soft px-2.5 py-1 text-[11px] font-bold text-green">
          <Icon name="check" size={13} /> افزوده شد
        </span>
      ) : busy ? (
        <Spinner className="size-5 shrink-0 text-arm" />
      ) : (
        <span className="grid size-8 shrink-0 place-items-center rounded-full bg-arm-soft text-arm-strong">
          <Icon name="plus" size={15} />
        </span>
      )}
    </button>
  );
}

/* toEnDigits صریح برای سازگاری import در آینده */
void toEnDigits;
