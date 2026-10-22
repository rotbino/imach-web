"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AuthGate } from "@/components/imach/auth-gate";
import { AppShell } from "@/components/imach/app-shell";
import { Icon } from "@/components/ui/icon";
import { Sheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { NumberInput } from "@/components/ui/number-input";
import { EmptyState, Spinner } from "@/components/ui/feedback";
import { useToast } from "@/components/ui/toast";
import { useLocale } from "@/i18n/locale-context";
import { useAuthStore } from "@/lib/auth-store";
import { goodsApi, listingsApi, marketApi, type GoodDto } from "@/lib/api";
import { goodName, num, unitLabel } from "@/lib/format";
import { toEnDigits } from "@/components/imach/buy-list-shared";
import { cn } from "@/lib/utils";

/**
 * `/buy-list/new` — اسکرین ۲۱: افزودن به لیست خرید (M3 · FD-25/34).
 *
 *  · goodpick: جستجوی زندهٔ کالاهای مرجع + «کالای جدید» (PROVISIONAL —
 *    ساخت کاربری؛ همان قرارداد createGood)
 *  · «پرتکرار در صنف شما»: کالاهای دنبال‌شدهٔ صنف من از getSupplyBoard
 *    راه نمی‌خورد؛ الگوی پروتوتایپ = پیشنه‌دها اول فهرست — این‌جا
 *    کالاهای موجود در لیست (بج «افزوده شده») + پربازدهای مرجع
 *  · فیلد مقدار با واحد در لیبل («هر بسته — ۵۰ کیلوگرم» FD-25)
 *  · دوره (کمبو هفتگی/دوهفتگی/ماهانه/موقتی — FD-25) → frequency
 *  · ثبت = watchGood + saveListing(BUY) با حجم/دوره — یک تپ
 *
 * قانون مالک M2: فرم فارسی، متن‌ها همین‌جا (فریز i18n).
 * فاصلهٔ استاندارد فرم: gap-5 بین فیلدها (حکم مالک M2).
 */

const FREQS = [
  { v: "WEEKLY", fa: "هفتگی" },
  { v: "BIWEEKLY", fa: "دوهفتگی" },
  { v: "MONTHLY", fa: "ماهانه" },
  { v: "OCCASIONAL", fa: "موقتی" },
] as const;

export default function BuyListAddPage() {
  return (
    <AuthGate>
      <AddToBuyList />
    </AuthGate>
  );
}

function AddToBuyList() {
  const router = useRouter();
  const qc = useQueryClient();
  const { show } = useToast();
  const { locale } = useLocale();
  const businesses = useAuthStore((s) => s.businesses);
  const biz = businesses[0];
  const bizId = biz?.id ?? "";

  /* ── انتخاب ── */
  const [good, setGood] = useState<GoodDto | null>(null);
  const [newGoodOpen, setNewGoodOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  /* ── فرم نیاز خرید (FD-25) ── */
  const [volume, setVolume] = useState<number | null>(null);
  const [freq, setFreq] = useState<(typeof FREQS)[number]["v"]>("WEEKLY");

  /* ── جستجوی زنده (debounce سبک) ── */
  const [qInput, setQInput] = useState("");
  const [q, setQ] = useState("");
  useEffect(() => {
    const id = setTimeout(() => setQ(qInput.trim()), 250);
    return () => clearTimeout(id);
  }, [qInput]);

  const goodsQ = useQuery({
    queryKey: ["goods", "buyadd", q],
    queryFn: () => goodsApi.getGoods({ q: q || undefined, limit: 20 }),
    staleTime: 60_000,
  });

  /* ردیف‌های لیست خریدِ فعلی — بج «افزوده شده» (الگوی ۲۱) */
  const watchedQ = useQuery({
    queryKey: ["market", "watched", bizId],
    queryFn: () => marketApi.getWatchedGoods(bizId),
    enabled: !!bizId,
  });
  const mineIds = useMemo(
    () => new Set((watchedQ.data ?? []).filter((w) => !w.archivedAt).map((w) => w.goodId)),
    [watchedQ.data]
  );

  const unit = good ? unitLabel(good.unit, locale) : "";
  const nameOf = (g: { nameFa: string; nameEn: string | null }) => goodName(g, locale);

  /* ── ثبت نیاز خرید: watch + BUY listing با حجم/دوره ── */
  const save = async () => {
    if (!good) return;
    if (volume !== null && volume <= 0) {
      show({ text: "مقدار را درست وارد کن", kind: "error" });
      return;
    }
    setBusy(true);
    try {
      await marketApi.watchGood(bizId, good.id);
      // حجم نداریم → بدون spec خرید؛ فقط دنبال‌کردن قیمت («فرم‌ها به‌تدریج» —
      // BUY rows MAY omit volume). حجم/دوره روی ردیف BUY listing می‌نشیند.
      if (volume !== null && volume > 0) {
        await listingsApi.saveListing({
          businessId: bizId,
          goodId: good.id,
          mode: "BUY",
          buy: { volume, frequency: freq },
        });
      }
      await qc.invalidateQueries({ queryKey: ["market", "watched", bizId] });
      show({ text: `«${nameOf(good)}» به لیست خرید اضافه شد`, kind: "success" });
      router.push("/buy-list");
    } catch {
      show({ text: "افزوده نشد — دوباره تلاش کن", kind: "error" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <AppShell
      arm="buy"
      title="افزودن به لیست خرید"
      wide
      back="/buy-list"
    >
      <div className="flex flex-col gap-5">
        {/* ── انتخاب کالا (goodpick) ── */}
        {good ? (
          <PickedGood
            name={nameOf(good)}
            unit={unit}
            category={good.category ? good.category.nameFa : undefined}
            onChange={() => setGood(null)}
          />
        ) : (
          <>
            <div className="relative">
              <Icon
                name="search"
                size={17}
                className="pointer-events-none absolute start-3.5 top-1/2 -translate-y-1/2 text-text-4"
              />
              <input
                value={qInput}
                onChange={(e) => setQInput(e.target.value)}
                placeholder="جستجوی نوع کالا…"
                autoComplete="off"
                aria-label="جستجوی نوع کالا"
                className="h-12 w-full rounded-xl border border-line bg-surface ps-11 pe-3 text-[15px] text-text placeholder:text-text-4 focus:border-arm focus:outline-none focus:ring-2 focus:ring-arm/20"
              />
            </div>

            {/* ── نتایج جستجو / پیشنه‌دها ── */}
            {goodsQ.isLoading ? (
              <div className="grid place-items-center py-10">
                <Spinner className="size-7 text-arm" />
              </div>
            ) : (goodsQ.data?.items ?? []).length === 0 ? (
              <EmptyState
                icon={<Icon name="search" size={26} />}
                title="چیزی پیدا نشد"
                subtitle="با حرف دیگری جستجو کن یا نوع کالای جدید بساز"
              />
            ) : (
              <div className="flex flex-col gap-2">
                {!q && <p className="px-1 text-[12px] font-bold text-text-3">نوع کالاهای پرتکرار</p>}
                {(goodsQ.data?.items ?? []).map((g) => (
                  <GoodRow
                    key={g.id}
                    name={nameOf(g)}
                    unit={unitLabel(g.unit, locale)}
                    added={mineIds.has(g.id)}
                    onPick={() => setGood(g)}
                  />
                ))}
              </div>
            )}

            {/* فیکس باگ مالک (فیکس‌بچ M3 — هم‌قاعدهٔ فرم ثبت کالا): لینک ثبت
                نوع کالای جدید فقط وقتی دیده می‌شود که کاربر سرچ کرده و لیست
                خالی آمده — «اگر نوع کالا وجود ندارد اصلاً نباید این لینک دیده
                شود». قبلاً CTA همیشه زیر نتایج بود. */}
            {goodsQ.isSuccess && q && (goodsQ.data?.items ?? []).length === 0 && (
              <button
                type="button"
                onClick={() => setNewGoodOpen(true)}
                className="flex items-center gap-3 rounded-2xl border border-primary/35 bg-primary-soft/40 px-4 py-3 text-start transition-colors hover:border-primary/70"
              >
                <span className="grid size-9 shrink-0 place-items-center rounded-[10px] bg-primary text-white">
                  <Icon name="plus" size={18} />
                </span>
                <span className="min-w-0 flex-1">
                  <b className="block text-[13.5px] font-bold text-primary-strong">
                    «{q}» را به‌عنوان نوع کالای جدید ثبت کن
                  </b>
                  <span className="block text-[11.5px] text-text-3">
                    قلم کالا — بدون برند و ویژگی؛ مثل گندم، پفک، تیرآهن
                  </span>
                </span>
              </button>
            )}
          </>
        )}

        {/* ── نیاز خرید: مقدار + دوره (FD-25) ── */}
        {good && (
          <div className="flex flex-col gap-5 rounded-2xl border border-line bg-surface p-5">
            <Field
              label={unit ? `مقدار موردنیاز (${unit})` : "مقدار موردنیاز"}
              hint="خالی بگذاری، فقط دنبال‌کردن قیمت ثبت می‌شود"
            >
              {(id) => (
                <NumberInput
                  id={id}
                  value={volume}
                  onChange={setVolume}
                  placeholder={unit ? `مثلاً ۲ ${unit} در هفته` : "مثلاً ۲"}
                  min={0}
                />
              )}
            </Field>

            <Field label="دورهٔ خرید">
              {() => (
                <div className="grid grid-cols-4 gap-2">
                  {FREQS.map((f) => (
                    <button
                      key={f.v}
                      type="button"
                      onClick={() => setFreq(f.v)}
                      className={cn(
                        "min-h-[44px] rounded-xl border px-1 text-[12.5px] font-bold transition-colors",
                        freq === f.v
                          ? "border-arm bg-arm-soft text-arm-strong"
                          : "border-line bg-surface text-text-2 hover:border-line-2"
                      )}
                    >
                      {f.fa}
                    </button>
                  ))}
                </div>
              )}
            </Field>
          </div>
        )}

        {/* ── ثبت ── */}
        {good && (
          <div className="flex gap-2">
            <Button variant="outline" size="lg" className="flex-1" onClick={() => setGood(null)}>
              تغییر نوع کالا
            </Button>
            <Button variant="arm" size="lg" className="flex-[2]" loading={busy} onClick={() => void save()}>
              <Icon name="check" size={17} /> افزودن به لیست خرید
            </Button>
          </div>
        )}
      </div>

      {/* ── شیت کالای جدید (PROVISIONAL) ── */}
      <NewGoodSheet
        open={newGoodOpen}
        onClose={() => setNewGoodOpen(false)}
        onCreated={(g) => {
          setGood(g);
          show({ text: `«${nameOf(g)}» ساخته شد — برای همه قابل استفاده است`, kind: "success" });
        }}
      />
    </AppShell>
  );
}

/* ─────────────── کارت کالای انتخاب‌شده (الگوی picked-card) ─────────────── */

function PickedGood({
  name,
  unit,
  category,
  onChange,
}: {
  name: string;
  unit: string;
  category?: string;
  onChange: () => void;
}) {
  return (
    <div className="flex items-center gap-3.5 rounded-2xl border border-arm/50 bg-arm-soft/30 p-4">
      <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-arm-soft text-[22px] font-black text-arm-strong">
        {name.slice(0, 1)}
      </span>
      <span className="min-w-0 flex-1">
        <b className="block truncate text-[15px] font-bold text-text">{name}</b>
        <span className="block truncate text-[12px] text-text-3">
          {unit}
          {category ? ` · ${category}` : ""}
        </span>
      </span>
      <button
        type="button"
        onClick={onChange}
        className="grid size-9 shrink-0 place-items-center rounded-full text-text-3 transition-colors hover:bg-surface-2 hover:text-text"
        aria-label="تغییر نوع کالا"
      >
        <Icon name="x" size={16} />
      </button>
    </div>
  );
}

/** ردیف کالای مرجع — الگوی ۲۱ (بج سبز «افزوده شده» برای کالاهای لیست من) */
function GoodRow({
  name,
  unit,
  added,
  onPick,
}: {
  name: string;
  unit: string;
  added: boolean;
  onPick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onPick}
      className={cn(
        "flex min-h-[64px] items-center gap-3 rounded-2xl border bg-surface px-4 text-start transition-[border-color,box-shadow]",
        added ? "border-green/30 bg-green-bg/60" : "border-line hover:border-line-2 hover:shadow-[0_10px_30px_rgba(31,29,26,.06)]"
      )}
    >
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-surface-2 text-[18px] font-black text-text-4/70">
        {name.slice(0, 1)}
      </span>
      <span className="min-w-0 flex-1">
        <b className="block truncate text-[14px] font-bold text-text">{name}</b>
        <span className="block truncate text-[11.5px] text-text-3">{unit}</span>
      </span>
      {added ? (
        <span className="flex shrink-0 items-center gap-1 rounded-full bg-green-soft px-2.5 py-1 text-[11px] font-bold text-green">
          <Icon name="check" size={13} /> در لیست شما هست
        </span>
      ) : (
        <span className="grid size-8 shrink-0 place-items-center rounded-full bg-arm-soft text-arm-strong">
          <Icon name="plus" size={15} />
        </span>
      )}
    </button>
  );
}

/* ═══════════ شیت کالای جدید — PROVISIONAL کاربری ═══════════ */

function NewGoodSheet({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (g: GoodDto) => void;
}) {
  const { locale } = useLocale();
  const { show } = useToast();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) setName("");
  }, [open]);

  const create = async () => {
    const n = toEnDigits(name).trim();
    if (!n) {
      show({ text: "نام نوع کالا را بنویس", kind: "error" });
      return;
    }
    // حکم مالک فیکس: نوع کالا قلم کالا است، نه محصول — سقف ۱۵ کاراکتر
    if (n.length > 15) {
      show({ text: "نام نوع کالا حداکثر ۱۵ کاراکتر است — برند و ویژگی جای دیگر", kind: "error" });
      return;
    }
    setBusy(true);
    try {
      const g = await goodsApi.createGood({ name: n });
      onCreated(g);
      onClose();
    } catch {
      show({ text: "ساخته نشد — دوباره تلاش کن", kind: "error" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet open={open} onClose={onClose} title="نوع کالای جدید">
      <div className="flex flex-col gap-5 p-5">
        {/* توضیح خیلی کوتاه (حکم مالک): قلم کالا، نه محصول — تا محصولات
            به‌اشتباه جای نوع کالا ثبت نشوند */}
        <p className="text-[12.5px] leading-6 text-text-3">
          نوع کالا یعنی قلم کالا — مثل گندم، پفک، برنج هاشمی، تیرآهن؛ بدون برند و ویژگی.
          محصول مشخص را بعداً زیر همین نوع پیدا و اضافه می‌کنی.
        </p>
        <Field label="نام نوع کالا" hint="حداکثر ۱۵ کاراکتر — مثلاً: پفک، تیرآهن" required>
          {(id) => (
            <Input
              id={id}
              value={name}
              onChange={(e) => setName(e.target.value.slice(0, 15))}
              placeholder={locale === "en" ? "e.g. Puff snack" : "مثلاً: پفک"}
              maxLength={15}
              onKeyDown={(e) => e.key === "Enter" && void create()}
            />
          )}
        </Field>
        <Button variant="arm" size="lg" loading={busy} onClick={() => void create()}>
          <Icon name="plus" size={16} /> ثبت نوع کالا
        </Button>
      </div>
    </Sheet>
  );
}
