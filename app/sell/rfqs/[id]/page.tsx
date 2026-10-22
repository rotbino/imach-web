"use client";

import { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AuthGate } from "@/components/imach/auth-gate";
import { AppShell } from "@/components/imach/app-shell";
import { Icon } from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/input";
import { NumberInput } from "@/components/ui/number-input";
import { Spinner } from "@/components/ui/feedback";
import { useToast } from "@/components/ui/toast";
import { useMoney } from "@/components/imach/prefs-context";
import { useAuthStore } from "@/lib/auth-store";
import { marketApi } from "@/lib/api";
import { goodName, num, unitLabel, majorToMinor } from "@/lib/format";
import { toEnDigits } from "@/components/imach/buy-list-shared";
import { dlvTx, payTx, rfqTitleTx } from "@/components/imach/rfq-shared";
import { cn } from "@/lib/utils";

/**
 * `/sell/rfqs/[id]` — اسکرین ۱۲: ارسال پیشنهاد (فروشنده · M4 · FD-14/24).
 *
 * · زمینه از getQuoteContext: اقلام استعلام با قیمتِ کاتالوک خودم برای هر
 *   قلم («کاتالوک تو: X» placeholder + بج «در کاتالوک تو») — قابل ویرایش.
 *   قلم‌هایی که ندارم = null می‌مانند (پیشنهاد ناقص مجاز — حریم سبد).
 * · شرایط پرداخت (الگوی redesign-base · حکم مالک): پایه نقدی + سوییچ
 *   «فروش چکی هم داریم» ⇒ درصد چکی/نقدی هم‌گام + حداکثر روز چک.
 * · ارسال و تحویل: سوییچ «ارسال کالا هم داریم» ⇒ حمل با فروشنده/مشتری.
 * · خط جمع‌بندی زنده «خریدار این شرایط را می‌بیند: …» — همان متن کارت ۲۶
 *   و جزئیات ۲۷ (بازتاب، جلوی چشم فروشنده).
 * · ارسال ⇒ myOffer «n قلم · جمع X تومان» + برگشت به ۱۱.
 *
 * قانون مالک M2: فرم فارسی، متن‌ها همین‌جا (فریز i18n).
 */

export default function SellOfferPage() {
  return (
    <AuthGate>
      <SellOffer />
    </AuthGate>
  );
}

function SellOffer() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const { show } = useToast();
  const { parts } = useMoney();
  const businesses = useAuthStore((s) => s.businesses);
  const bizId = businesses[0]?.id ?? "";

  const ctxQ = useQuery({
    queryKey: ["market", "quotectx", id],
    queryFn: () => marketApi.getQuoteContext(bizId, id),
    enabled: !!bizId && !!id,
  });
  const ctx = ctxQ.data;

  /* ── قیمت هر قلم (فقط قلم‌های خودم فعال‌اند) ──
   * قرارداد کل کدبیس (فرم ۱۳): ورودی به «واحد اصلی» یعنی تومان؛ ذخیره minor (ریال)
   * → هر خواندن/نوشتن با majorToMinor/÷۱۰ می‌گذرد */
  const minorOf = (raw: string | undefined): number | null => {
    if (raw == null || !String(raw).trim()) return null;
    const v = Number(toEnDigits(String(raw)).replace(/[^\d]/g, ""));
    if (!Number.isFinite(v) || v <= 0) return null;
    return majorToMinor(v);
  };
  const [prices, setPrices] = useState<Record<number, string>>({});
  const items = ctx?.items ?? [];
  const myItems = items.filter((it) => it.mine);
  const otherItems = items.filter((it) => !it.mine);

  /* ── شرایط ── */
  const [chkOn, setChkOn] = useState(false);
  const [chkPct, setChkPct] = useState(50);
  const [chkDays, setChkDays] = useState(60);
  const [shipOn, setShipOn] = useState(false);
  const [shipBy, setShipBy] = useState<"seller" | "customer">("seller");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const pay = chkOn ? { chk: chkPct, days: chkDays } : { chk: 0, days: 0 };
  const dlv = shipOn ? { ship: true, by: shipBy } : { ship: false, by: "seller" as const };

  /* جمع زنده — Σ (minor×مقدار) روی قلم‌های قیمت‌خورده؛ نمایش تومان */
  const liveTotal = useMemo(() => {
    let sum = 0;
    let any = false;
    myItems.forEach((it) => {
      const minor = minorOf(prices[items.indexOf(it)]);
      if (minor != null) {
        sum += minor * it.qty;
        any = true;
      }
    });
    return any ? sum : null;
  }, [prices, items, myItems]);

  const pricedCount = useMemo(
    () => myItems.filter((it) => minorOf(prices[items.indexOf(it)]) != null).length,
    [prices, items, myItems]
  );

  const send = async () => {
    if (!ctx || !ctx.inquiryId) return;
    if (myItems.length > 0 && pricedCount === 0) {
      show({ text: "قیمت پیشنهادی را وارد کن", kind: "error" });
      return;
    }
    setBusy(true);
    try {
      // prices[] هم‌ترتیب با اقلام استعلام — قلم‌های نداشتی null (minor = ریال)
      const arr = items.map((it, i) => (it.mine ? minorOf(prices[i]) : null));
      await marketApi.sendOfferV2({
        inquiryId: ctx.inquiryId,
        prices: arr.some((x) => x != null) ? arr : undefined,
        ...(arr[0] != null ? { priceMinor: arr[0]! } : {}),
        pay: chkOn ? { chk: chkPct, days: chkDays } : { chk: 0, days: 30 },
        dlv,
        ...(note.trim() ? { note: note.trim() } : {}),
      });
      show({ text: `پیشنهاد برای ${ctx.buyer?.name ?? "خریدار"} ارسال شد`, kind: "success" });
      await qc.invalidateQueries({ queryKey: ["market", "inquiries", bizId] });
      await qc.invalidateQueries({ queryKey: ["market", "myrfqs", ctx.buyer?.id ?? ""] });
      router.replace("/sell/rfqs");
    } catch (e) {
      show({ text: e instanceof Error ? e.message : "ارسال نشد — دوباره تلاش کن", kind: "error" });
    } finally {
      setBusy(false);
    }
  };

  if (ctxQ.isLoading) {
    return (
      <AppShell arm="sell" title="ارسال پیشنهاد" back="/sell/rfqs">
        <div className="grid place-items-center py-16">
          <Spinner />
        </div>
      </AppShell>
    );
  }

  if (!ctx || ctx.kind !== "INQUIRY") {
    return (
      <AppShell arm="sell" title="ارسال پیشنهاد" back="/sell/rfqs">
        <div className="p-6 text-center text-[13px] text-text-3">استعلام پیدا نشد.</div>
      </AppShell>
    );
  }

  const closed = !!ctx.rfqClosed;
  const expired = ctx.deadlineAt ? new Date(ctx.deadlineAt).getTime() < Date.now() : false;
  const daysLeft = ctx.deadlineAt
    ? Math.max(0, Math.ceil((new Date(ctx.deadlineAt).getTime() - Date.now()) / 86_400_000))
    : null;
  const multi = (ctx.itemsTotal ?? 1) > 1;
  const title = rfqTitleTx(
    multi ? `${num(ctx.itemsTotal!, "fa")} قلمی` : ctx.good?.nameFa ?? "کالا"
  );

  if (closed || expired) {
    return (
      <AppShell arm="sell" title="ارسال پیشنهاد" back="/sell/rfqs">
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-line bg-surface p-8 text-center">
          <Icon name="clock" size={34} className="text-text-4" />
          <b className="text-[14.5px] font-bold text-text">
            {closed ? "این استعلام بسته شده" : "مهلت این درخواست گذشته است"}
          </b>
          <p className="text-[11.5px] leading-5 text-text-3">
            دیگر نمی‌توانی برایش پیشنهاد بفرستی. درخواست‌های تازه در «درخواست‌های قیمت» می‌آیند.
          </p>
          <Button variant="outline" onClick={() => router.replace("/sell/rfqs")}>
            بازگشت به درخواست‌ها
          </Button>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell arm="sell" title="ارسال پیشنهاد" back="/sell/rfqs" wide>
      <div className="flex flex-col gap-5">
        {/* ═══ کارت استعلام + قلم‌های آن ═══ */}
        <div className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-4">
          <span className="grid size-14 shrink-0 place-items-center rounded-xl bg-surface-2 text-[24px] font-black text-text-4/70">
            {(ctx.good?.nameFa ?? "؟").slice(0, 1)}
          </span>
          <div className="min-w-0 flex-1">
            <b className="block truncate text-[14.5px] font-bold text-text">{title}</b>
            <small className="mt-0.5 block text-[11px] text-text-3">
              {ctx.buyer?.name ?? "خریدار"}
              {ctx.deliveryCity ? ` · تحویل: ${ctx.deliveryCity}` : ""}
            </small>
            <span
              className={cn(
                "mt-1.5 inline-block rounded-full px-2 py-0.5 text-[10.5px] font-bold",
                daysLeft != null && daysLeft <= 1 ? "bg-red-bg text-red" : "bg-amber-soft text-amber"
              )}
            >
              {daysLeft === 0 ? "امروز آخرین روز" : `${num(daysLeft ?? 0, "fa")} روز مهلت`}
            </span>
          </div>
        </div>

        {/* فهرست قلم‌ها (چندقلمی) */}
        {multi && (
          <div className="rounded-2xl border border-line bg-surface px-4 py-1">
            {items.map((it) => {
              const name = it.good ? goodName(it.good, "fa") : "—";
              return (
                <div
                  key={it.goodId}
                  className="flex items-baseline justify-between gap-3 border-b border-line/60 py-2.5 last:border-0"
                >
                  <span className="min-w-0 truncate text-[12.5px] text-text-2">{name}</span>
                  <span className="shrink-0 text-[11.5px] font-bold text-text-3">
                    {num(it.qty, "fa")} {it.good?.unit ? unitLabel(it.good.unit, "fa") : ""}
                    {!it.mine && <span className="ms-1 text-text-4">· نداری</span>}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {/* توضیحات خریدار */}
        {ctx.note && (
          <div className="flex items-start gap-2.5 rounded-2xl border border-blue/25 bg-blue-soft/50 p-3.5">
            <Icon name="msg" size={16} className="mt-0.5 shrink-0 text-blue" />
            <div>
              <b className="text-[12px] font-bold text-text-2">توضیحات خریدار:</b>
              <p className="mt-0.5 text-[12px] leading-5 text-text-2">{ctx.note}</p>
            </div>
          </div>
        )}

        {/* ═══ قیمت‌ها — هر قلم فیلد خودش (FD-24) ═══ */}
        <section className="flex flex-col gap-3">
          <h2 className="px-1 text-[13px] font-black text-text-2">قیمت پیشنهادی</h2>
          {myItems.map((it) => {
            const i = items.indexOf(it);
            const name = it.good ? goodName(it.good, "fa") : "—";
            const raw = prices[i] ?? "";
            const minor = minorOf(raw);
            const ph =
              it.listing?.priceMinor != null
                ? `کاتالوک تو: ${num(Math.round(it.listing.priceMinor / 10), "fa")}`
                : "قیمت هر بسته — تومان";
            return (
              <Field
                key={it.goodId}
                label={`قیمت هر بسته — تومان${multi ? ` · ${name}` : ""}${
                  it.listing?.priceMinor != null ? " · در کاتالوک تو" : ""
                }`}
                hint={
                  minor != null
                    ? `برای ${num(it.qty, "fa")} بسته: ${num(Math.round((minor * it.qty) / 10), "fa")} تومان`
                    : "قیمت را به تومان وارد کن تا جمعش را ببینی"
                }
              >
                {() => (
                  <div className="flex items-center gap-2">
                    <Input
                      value={raw}
                      onChange={(e) => setPrices((p) => ({ ...p, [i]: e.target.value }))}
                      inputMode="numeric"
                      placeholder={ph}
                      className="flex-1"
                    />
                  </div>
                )}
              </Field>
            );
          })}
          {otherItems.length > 0 && (
            <p className="rounded-xl bg-surface-2/60 p-3 text-[11.5px] leading-5 text-text-3">
              {num(otherItems.length, "fa")} قلم دیگرِ استعلام در کاتالوک تو نیست — پیشنهادت برای
              بقیهٔ قلم‌ها «ناقص» ثبت می‌شود و خریدار همان‌جا می‌بیند.
            </p>
          )}
        </section>

        {/* ═══ شرایط پرداخت — نقدیِ پایه + سوییچ چک ═══ */}
        <section className="flex flex-col gap-3">
          <h2 className="px-1 text-[13px] font-black text-text-2">شرایط پرداخت و تحویل</h2>

          <Field label="شرایط پرداخت">
            {() => (
              <div className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-3.5">
                <div className="min-w-0 flex-1">
                  <b className="block text-[13px] font-bold text-text">فروش چکی هم داریم</b>
                  <small className="text-[11px] text-text-3">
                    {chkOn ? "روشن — درصد چکی/نقدی و روز چک را مشخص کن" : "خاموش — کل مبلغ نقدی گرفته می‌شود"}
                  </small>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={chkOn}
                  aria-label="فروش چکی هم داریم"
                  onClick={() => setChkOn((v) => !v)}
                  className={cn(
                    "relative h-7 w-12 shrink-0 rounded-full transition-colors",
                    chkOn ? "bg-primary" : "bg-line-2"
                  )}
                >
                  <span
                    className={cn(
                      "absolute top-1 size-5 rounded-full bg-white shadow-sm transition-all",
                      chkOn ? "start-6" : "start-1"
                    )}
                  />
                </button>
              </div>
            )}
          </Field>

          {chkOn && (
            <div className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-3.5">
              {/* درصد چکی/نقدی — دو ورودی هم‌گام (جمع همیشه ۱۰۰) */}
              <div className="grid grid-cols-2 gap-2.5">
                <div className="rounded-xl border border-primary/35 bg-primary-soft/40 p-3">
                  <b className="mb-1.5 block text-[11px] font-bold text-primary-strong">درصد پرداخت چکی</b>
                  <div className="flex items-center gap-1">
                    <input
                      value={num(chkPct, "fa")}
                      onChange={(e) => {
                        const v = Number(toEnDigits(e.target.value).replace(/[^\d]/g, ""));
                        setChkPct(Math.max(0, Math.min(99, Number.isFinite(v) ? v : 0)));
                      }}
                      inputMode="numeric"
                      aria-label="درصد پرداخت چکی"
                      className="w-full min-w-0 bg-transparent text-[15px] font-black tabular-nums text-text outline-none"
                    />
                    <small className="text-[11px] text-text-3">٪</small>
                  </div>
                </div>
                <div className="rounded-xl border border-line bg-surface-2/40 p-3">
                  <b className="mb-1.5 block text-[11px] font-bold text-text-2">درصد نقدی</b>
                  <div className="flex items-center gap-1">
                    <input
                      value={num(100 - chkPct, "fa")}
                      readOnly
                      aria-label="درصد نقدی"
                      className="w-full min-w-0 bg-transparent text-[15px] font-black tabular-nums text-text-3 outline-none"
                    />
                    <small className="text-[11px] text-text-3">٪</small>
                  </div>
                </div>
              </div>
              <Field label="حداکثر زمان قابل قبول چک" hint="چک‌های تا این مدت را می‌پذیری — معمولاً مضرب ۳۰ روز">
                {() => (
                  <div className="flex items-center gap-2 rounded-xl border border-line bg-surface-2/40 px-3">
                    <input
                      value={num(chkDays, "fa")}
                      onChange={(e) => {
                        const v = Number(toEnDigits(e.target.value).replace(/[^\d]/g, ""));
                        setChkDays(Math.max(1, Math.min(365, Number.isFinite(v) ? v : 30)));
                      }}
                      inputMode="numeric"
                      aria-label="حداکثر زمان چک به روز"
                      className="w-full min-w-0 bg-transparent py-2.5 text-[14px] font-black tabular-nums text-text outline-none"
                    />
                    <small className="shrink-0 text-[11px] text-text-3">روز</small>
                  </div>
                )}
              </Field>
            </div>
          )}

          {/* ارسال و تحویل */}
          <Field label="ارسال و تحویل">
            {() => (
              <div className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-3.5">
                <div className="min-w-0 flex-1">
                  <b className="block text-[13px] font-bold text-text">ارسال کالا هم داریم</b>
                  <small className="text-[11px] text-text-3">
                    {shipOn ? "روشن — هزینهٔ حمل با کیست؟" : "خاموش — تحویل حضوری در انبار تو"}
                  </small>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={shipOn}
                  aria-label="ارسال کالا هم داریم"
                  onClick={() => setShipOn((v) => !v)}
                  className={cn(
                    "relative h-7 w-12 shrink-0 rounded-full transition-colors",
                    shipOn ? "bg-primary" : "bg-line-2"
                  )}
                >
                  <span
                    className={cn(
                      "absolute top-1 size-5 rounded-full bg-white shadow-sm transition-all",
                      shipOn ? "start-6" : "start-1"
                    )}
                  />
                </button>
              </div>
            )}
          </Field>

          {shipOn && (
            <div className="grid grid-cols-2 gap-2.5">
              {(["seller", "customer"] as const).map((by) => {
                const active = shipBy === by;
                return (
                  <button
                    key={by}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setShipBy(by)}
                    className={cn(
                      "rounded-xl border-[1.5px] p-3 text-[12px] font-bold transition-colors active:scale-[.97]",
                      active
                        ? "border-primary bg-primary-soft text-primary-strong"
                        : "border-line bg-surface text-text-2 hover:border-line-2"
                    )}
                  >
                    هزینهٔ حمل با {by === "customer" ? "مشتری" : "فروشنده"}
                  </button>
                );
              })}
            </div>
          )}

          {/* جمع‌بندی زنده — پیش‌نمایش همان چیزی که خریدار در ۲۶/۲۷ می‌بیند */}
          <div className="flex items-center gap-2 rounded-xl bg-arm-soft/60 p-3 text-[12px] font-bold text-arm-strong">
            <Icon name="eye" size={15} className="shrink-0" />
            <span className="min-w-0 flex-1">
              خریدار این شرایط را می‌بیند: {payTx(pay)} · {dlvTx(dlv)}
              {liveTotal != null && ` · جمع ${num(Math.round(liveTotal / 10), "fa")} تومان`}
            </span>
          </div>
        </section>

        {/* توضیح برای خریدار */}
        <Field label="توضیح برای خریدار" hint="اختیاری">
          {() => (
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              placeholder="مثلاً: برنج امسال، ارسال رایگان بالای ۳۰ کیسه…"
            />
          )}
        </Field>
      </div>

      {/* ارسال */}
      <div className="sticky inset-x-0 bottom-0 z-20 -mx-4 border-t border-line bg-bg/95 p-4 backdrop-blur-sm mt-2">
        <div className="mx-auto max-w-3xl">
          <Button
            variant="arm"
            size="xl"
            block
            loading={busy}
            disabled={myItems.length === 0 || pricedCount === 0}
            onClick={() => void send()}
          >
            <Icon name="send" size={17} />
            {myItems.length > 1
              ? `ارسال پیشنهاد ${num(pricedCount, "fa")} قلمی`
              : "ارسال پیشنهاد"}
          </Button>
        </div>
      </div>
    </AppShell>
  );
}
