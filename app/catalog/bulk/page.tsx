"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AuthGate } from "@/components/imach/auth-gate";
import { AppShell } from "@/components/imach/app-shell";
import { Icon } from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/input";
import { NumberInput } from "@/components/ui/number-input";
import { Spinner } from "@/components/ui/feedback";
import { useToast } from "@/components/ui/toast";
import { useAuthStore } from "@/lib/auth-store";
import { listingsApi, businessesApi, type GoodItemDto } from "@/lib/api";
import { num, currencyLabel, majorToMinor, minorToMajor } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * `/catalog/bulk` — اسکرین ۳۳: تغییر قیمت‌ها (M2 · بازطراحی FD-9).
 *
 * دو نیت (قوت طرح قبلی):
 *   · «آپدیت سریع با همین قیمت‌ها» → فقط تمدید اعتبار (bulkPriceStock
 *     بدون قیمت/درصد = تمدید pricedAt) + روزهای اعتبار
 *   · «تغییر قیمت‌ها» → درصد⇄مبلغِ مرجع دوگانه (قانون همیشگی FD-9:
 *     هر کدام را عوض کنی، اونیکی همان لحظه حساب می‌شود) + ویرایش
 *     دستی ردیف‌ها با استپر ± و نشان «ویرایش شد»
 *
 * قانون مالک M2: فرم فارسی، متن‌ها همین‌جا؛ اعداد با NumberInput.
 * ورودی قیمت در واحد اصلی ارز بومی؛ ذخیره کوچک‌ترین واحد.
 */

export default function BulkPage() {
  return (
    <AuthGate>
      <Bulk />
    </AuthGate>
  );
}

function Bulk() {
  const router = useRouter();
  const qc = useQueryClient();
  const { show } = useToast();
  const businesses = useAuthStore((s) => s.businesses);
  const biz = businesses[0];
  const bizId = biz?.id ?? "";
  const cur = biz?.currency ?? "IRR";
  const moneyLabel = currencyLabel(cur);

  const listingsQ = useQuery({
    queryKey: ["listings", "mine", bizId],
    queryFn: () => listingsApi.getMyListings(bizId),
    enabled: !!bizId,
  });

  const all = listingsQ.data ?? [];
  const rows = useMemo(
    () =>
      all
        .filter((l) => l.mode !== "BUY" && l.priceMinor !== null && l.isActive !== false)
        .map((l) => ({ l, base: minorToMajor(l.priceMinor, cur) ?? 0 })),
    [all, cur]
  );

  /* ── وضعیت ── */
  const [intent, setIntent] = useState<"renew" | "change" | null>(null);
  const [validity, setValidity] = useState<number>(3);
  const [pct, setPct] = useState<string>("0");
  const [refAmount, setRefAmount] = useState<number | null>(null);
  const [manual, setManual] = useState<Record<string, number>>({});
  const [busy, setBusy] = useState(false);

  /** مرجع دوگانه — پرقیمت‌ترین ردیف (نمایش «X بشود») */
  const ref = useMemo(() => (rows.length ? rows.reduce((a, b) => (b.base > a.base ? b : a)) : null), [rows]);

  const pctNum = Number(pct) || 0;
  const refBase = ref?.base ?? 0;

  /** درصد → مبلغ مرجع (هم‌گام FD-9) */
  const applyPct = (v: string) => {
    const clean = v.replace(/[^\d.-]/g, "").slice(0, 6);
    setPct(clean);
    const n = Number(clean) || 0;
    if (refBase > 0) setRefAmount(Math.round(refBase * (1 + n / 100)));
  };

  /** مبلغ مرجع → درصد (هم‌گام FD-9) */
  const applyRefAmount = (v: number | null) => {
    setRefAmount(v);
    if (v !== null && refBase > 0) {
      const p = ((v / refBase) - 1) * 100;
      setPct(p.toFixed(1).replace(/\.0$/, ""));
    }
  };

  /** قیمتِ نهایی یک ردیف: دستی > درصد > فعلی */
  const priceOf = (r: { l: GoodItemDto; base: number }): number => {
    if (manual[r.l.id] !== undefined) return manual[r.l.id];
    if (pctNum !== 0) return Math.round(r.base * (1 + pctNum / 100));
    return r.base;
  };
  const changedCount = rows.filter((r) => priceOf(r) !== r.base).length;

  /** استپر ± ردیف — ۱٪ مبنای خود ردیف، گردشده به ۱۰۰ */
  const stepOf = (base: number) => {
    const step = Math.round((base * 0.01) / 100) * 100;
    return step > 0 ? step : 1;
  }
  const bump = (id: string, base: number, dir: 1 | -1) => {
    const cur0 = manual[id] !== undefined ? manual[id] : Math.round(base * (1 + pctNum / 100));
    setManual((m) => ({ ...m, [id]: Math.max(0, cur0 + dir * stepOf(base)) }));
  };

  const save = async () => {
    if (!intent || rows.length === 0) return;
    setBusy(true);
    try {
      if (intent === "renew") {
        // تمدید سریع: بدون قیمت/درصد → سرور فقط pricedAt را تازه می‌کند
        await listingsApi.bulkPriceStock({
          businessId: bizId,
          items: rows.map((r) => ({ listingId: r.l.id })),
        });
      } else {
        const items = rows.map((r) => {
          if (manual[r.l.id] !== undefined) {
            return { listingId: r.l.id, priceMinor: majorToMinor(manual[r.l.id], cur) };
          }
          if (pctNum !== 0) return { listingId: r.l.id, pct: pctNum };
          return { listingId: r.l.id };
        });
        await listingsApi.bulkPriceStock({ businessId: bizId, items });
      }
      // روزهای اعتبار — تنظیم کاتالوک (۱..۵)
      await businessesApi.setCatalogSettings(bizId, { priceValidityDays: validity });
      void qc.invalidateQueries({ queryKey: ["listings"] });
      show({
        text:
          intent === "renew"
            ? `قیمت‌ها تا ${num(validity, "fa")} روز دیگر اعتبار گرفتند`
            : `${num(changedCount, "fa")} قیمت ذخیره شد و اعتبار تازه شد`,
        kind: "success",
      });
      router.push("/catalog");
    } catch (e) {
      show({ text: e instanceof Error ? e.message : "ذخیره نشد — دوباره تلاش کن", kind: "error" });
    } finally {
      setBusy(false);
    }
  };

  if (listingsQ.isLoading) {
    return (
      <AppShell arm="sell" title="تغییر قیمت‌ها" wide>
        <div className="grid place-items-center py-16">
          <Spinner />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell arm="sell" title="تغییر قیمت‌ها" wide>
      <div className="mx-auto flex w-full max-w-[760px] flex-col gap-5">
        {/* ═══ انتخاب نیت ═══ */}
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          <IntentBtn
            active={intent === "renew"}
            icon="check"
            title="آپدیت سریع با همین قیمت‌ها"
            sub="قیمت‌ها درست‌اند — فقط تمدید اعتبار"
            onClick={() => setIntent("renew")}
          />
          <IntentBtn
            active={intent === "change"}
            icon="edit"
            title="تغییر قیمت‌ها"
            sub="درصدی یا عددی — روی همه یا تک‌تک"
            onClick={() => setIntent("change")}
          />
        </div>

        {rows.length === 0 && (
          <p className="rounded-2xl border border-dashed border-line-2 bg-surface px-4 py-8 text-center text-[13px] leading-6 text-text-3">
            هنوز کالای قیمت‌خورده‌ای در کاتالوگ نیست — اول از «افزودن کالا» شروع کن.
          </p>
        )}

        {intent && rows.length > 0 && (
          <>
            {/* ═══ اعتبار قیمت (برای هر دو نیت) ═══ */}
            <Field label="یادآوری آپدیت قیمت" hint={`بعد از این روزها قیمت‌ها «منقضی» نشان داده می‌شوند و یادآوری می‌گیری — ${num(rows.length, "fa")} کالا`}>
              {() => (
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((d) => (
                    <button
                      key={d}
                      type="button"
                      aria-pressed={validity === d}
                      onClick={() => setValidity(d)}
                      className={cn(
                        "min-w-0 flex-1 rounded-xl border-[1.5px] py-2.5 text-[12.5px] font-bold transition-colors",
                        validity === d
                          ? "border-primary bg-primary-soft text-primary-strong"
                          : "border-line bg-surface text-text-2 hover:border-line-2"
                      )}
                    >
                      {num(d, "fa")} روز
                    </button>
                  ))}
                </div>
              )}
            </Field>

            {intent === "change" && (
              <>
                {/* ═══ تغییر گروهی — درصد ⇄ مبلغ مرجع (FD-9) ═══ */}
                <div className="flex flex-col gap-4 rounded-2xl border border-line bg-surface p-4 lg:p-5">
                  <b className="text-[14px] text-text">تغییر همهٔ قیمت‌ها</b>

                  <div className="flex items-center gap-3">
                    <span className="w-[110px] shrink-0 text-[12.5px] font-bold text-text-3">درصد تغییر</span>
                    <div className="flex min-w-0 flex-1 items-center gap-2">
                      <button
                        type="button"
                        aria-label="کاهش درصد"
                        onClick={() => applyPct(String((Number(pct) || 0) - 1))}
                        className="grid size-10 shrink-0 place-items-center rounded-lg border border-line bg-surface text-[16px] font-bold text-text-2 transition-colors hover:border-line-3"
                      >
                        −
                      </button>
                      <div className="min-w-0 flex-1">
                        <input
                          value={pct}
                          onChange={(e) => applyPct(e.target.value)}
                          inputMode="decimal"
                          aria-label="درصد تغییر"
                          className="h-10 w-full rounded-lg border border-line bg-surface px-3 text-center text-[15px] font-bold text-text focus:border-arm focus:outline-none focus:ring-2 focus:ring-arm/20"
                        />
                      </div>
                      <span className="shrink-0 text-[13px] font-bold text-text-3">٪</span>
                      <button
                        type="button"
                        aria-label="افزایش درصد"
                        onClick={() => applyPct(String((Number(pct) || 0) + 1))}
                        className="grid size-10 shrink-0 place-items-center rounded-lg border border-line bg-surface text-[16px] font-bold text-text-2 transition-colors hover:border-line-3"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {ref && (
                    <div className="flex items-center gap-3">
                      <span className="w-[110px] shrink-0 truncate text-[12.5px] font-bold text-text-3">
                        «{ref.l.title || ref.l.good?.nameFa || "مرجع"}» بشود
                      </span>
                      <div className="min-w-0 flex-1">
                        <NumberInput
                          value={refAmount}
                          onChange={applyRefAmount}
                          min={0}
                          suffix={moneyLabel}
                          aria-label="قیمت جدید محصول مرجع"
                        />
                      </div>
                    </div>
                  )}

                  <p className="text-[11.5px] leading-6 text-text-3">
                    یکی را عوض کن، اونیکی هم خودش عوض می‌شود — درصد روی همهٔ قیمت‌ها از مبنای خودِ هر ردیف اعمال می‌شود.
                  </p>
                </div>

                {/* ═══ گرید دستی (قوت طرح قبلی) ═══ */}
                <div className="flex flex-col gap-2.5">
                  {rows.map((r) => {
                    const final = priceOf(r);
                    const changed = final !== r.base;
                    const unit = r.l.good?.unit;
                    return (
                      <div
                        key={r.l.id}
                        className={cn(
                          "flex items-center gap-3 rounded-xl border bg-surface px-3.5 py-3 transition-colors",
                          changed ? "border-primary/45" : "border-line"
                        )}
                      >
                        <span className="min-w-0 flex-1">
                          <b className="block truncate text-[13.5px] font-bold text-text">
                            {r.l.title || r.l.good?.nameFa || "—"}
                          </b>
                          <span className="block truncate text-[11px] text-text-3">
                            {r.l.baseQty && r.l.baseQty > 1 ? `${num(r.l.baseQty, "fa")} ${unit ?? ""} · ` : ""}
                            {changed ? (
                              <span className="font-bold text-primary-strong">
                                از {num(r.base, "fa")} به {num(final, "fa")} {moneyLabel} — ویرایش شد
                              </span>
                            ) : (
                              <>قیمت فعلی: {num(r.base, "fa")} {moneyLabel}</>
                            )}
                          </span>
                        </span>
                        <div className="flex shrink-0 items-center gap-1.5">
                          <button
                            type="button"
                            aria-label="کاهش"
                            onClick={() => bump(r.l.id, r.base, -1)}
                            className="grid size-9 place-items-center rounded-lg border border-line bg-surface text-[15px] font-bold text-text-2 transition-colors hover:border-line-3"
                          >
                            −
                          </button>
                          <div className="w-[120px]">
                            <NumberInput
                              value={final}
                              onChange={(v) => setManual((m) => ({ ...m, [r.l.id]: v ?? 0 }))}
                              min={0}
                              aria-label={`قیمت ${r.l.title ?? r.l.good?.nameFa ?? ""}`}
                            />
                          </div>
                          <button
                            type="button"
                            aria-label="افزایش"
                            onClick={() => bump(r.l.id, r.base, 1)}
                            className="grid size-9 place-items-center rounded-lg border border-line bg-surface text-[15px] font-bold text-text-2 transition-colors hover:border-line-3"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    );
                  })}

                  <p className="rounded-xl bg-surface-2 px-3.5 py-2.5 text-[11px] leading-6 text-text-3">
                    درصد روی همهٔ محصولات اعمال می‌شود؛ دکمه‌های ± و قیمتِ هر ردیف فقط همان ردیف را تغییر می‌دهند.
                  </p>
                </div>
              </>
            )}

            {/* ═══ نوار ثبت ═══ */}
            <div className="flex gap-2.5">
              <Button variant="outline" size="xl" className="flex-[0.65]" onClick={() => router.push("/catalog")}>
                انصراف
              </Button>
              <Button
                variant="arm"
                size="xl"
                className="flex-[1.35]"
                loading={busy}
                disabled={intent === "change" && changedCount === 0}
                onClick={() => void save()}
              >
                <Icon name="check" size={17} />
                {intent === "renew"
                  ? "تمدید اعتبار قیمت‌ها"
                  : `ذخیره ${changedCount > 0 ? num(changedCount, "fa") + " " : ""}تغییر`}
              </Button>
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}

function IntentBtn({
  active,
  icon,
  title,
  sub,
  onClick,
}: {
  active: boolean;
  icon: React.ComponentProps<typeof Icon>["name"];
  title: string;
  sub: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "flex items-center gap-3 rounded-2xl border-[1.5px] p-4 text-start transition-colors",
        active
          ? "border-primary bg-primary-soft/60"
          : "border-line bg-surface hover:border-line-3"
      )}
    >
      <span
        className={cn(
          "grid size-10 shrink-0 place-items-center rounded-xl",
          active ? "bg-primary text-white" : "bg-surface-2 text-text-2"
        )}
      >
        <Icon name={icon} size={19} />
      </span>
      <span className="min-w-0">
        <b className="block text-[13.5px] font-bold text-text">{title}</b>
        <span className="block text-[11px] leading-5 text-text-3">{sub}</span>
      </span>
    </button>
  );
}
