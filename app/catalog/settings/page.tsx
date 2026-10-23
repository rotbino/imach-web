"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AuthGate } from "@/components/imach/auth-gate";
import { AppShell } from "@/components/imach/app-shell";
import { Icon } from "@/components/ui/icon";
import { Sheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/input";
import { SearchSelect } from "@/components/search-select";
import { Spinner } from "@/components/ui/feedback";
import { useToast } from "@/components/ui/toast";
import { useAuthStore } from "@/lib/auth-store";
import { businessesApi, type TradeDto, type CatalogCategoryDto } from "@/lib/api";
import { iranCityItems } from "@/lib/iran-geo";
import { num } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * `/catalog/settings` — اسکرین ۳۶: ویرایش کاتالوگ (M2 · زیرمجموعهٔ سند ۰۸).
 *
 * · پیش‌نمایش زندهٔ سربرگ کاتالوگ (نام/شهر/صنف/توضیح)
 * · نام + شهر (ایران: فهرست جست‌وجودار) + توضیح کوتاه → editBusiness
 * · دسته‌های شخصی ویترین → catalogCategories (replace یکجا)
 * · M2-G7: دید قیمت بر اساس صنف (شیت چندانتخابی از رجیستری Trade)
 *   + اعتبار قیمت ۱–۵ روز / «هرگز منقضی نشود» → catalogSettings
 *
 * قانون مالک M2: فرم فارسی، متن‌ها همین‌جا. عکس/نقشه/فاکتور → M8+.
 */

export default function CatalogSettingsPage() {
  return (
    <AuthGate>
      <Settings />
    </AuthGate>
  );
}

function Settings() {
  const router = useRouter();
  const qc = useQueryClient();
  const { show } = useToast();
  const businesses = useAuthStore((s) => s.businesses);
  const updateBusinesses = useAuthStore((s) => s.updateBusinesses);
  const biz = businesses[0];
  const bizId = biz?.id ?? "";
  const isIran = (biz?.country ?? "IR") === "IR";

  /* ── فیلدها ── */
  const [name, setName] = useState(biz?.name ?? "");
  const [city, setCity] = useState(biz?.city ?? "");
  const [bio, setBio] = useState(biz?.bio ?? "");
  // M5 (FD-37) — اسناد فروش: شمارهٔ مالیاتی + یادداشت ثابت فاکتور
  const [taxId, setTaxId] = useState(biz?.invoiceTaxId ?? "");
  const [invoiceNote, setInvoiceNote] = useState(biz?.invoiceNote ?? "");
  const [cats, setCats] = useState<CatalogCategoryDto[]>((biz?.customCategories ?? []) as CatalogCategoryDto[]);
  const [newCat, setNewCat] = useState("");
  const [visibility, setVisibility] = useState<string[]>(
    (biz?.priceVisibilityTrades ?? null) as string[] | null ?? []
  );
  const [pricesHidden, setPricesHidden] = useState((biz?.priceVisibilityTrades ?? null) !== null);
  const [validity, setValidity] = useState<number | "never">(
    (biz?.priceValidityDays ?? null) as number | null ?? 3
  );
  const [busy, setBusy] = useState(false);

  /* شیت‌ها */
  const [tradeSheet, setTradeSheet] = useState(false);

  const tradesQ = useQuery({
    queryKey: ["trades"],
    queryFn: () => businessesApi.getTrades(),
    staleTime: 5 * 60_000,
  });
  const trades: TradeDto[] = tradesQ.data ?? [];

  const addCat = () => {
    const v = newCat.trim();
    if (v.length < 2 || cats.some((c) => c.name === v)) {
      if (v.length >= 2) show({ text: "این دسته از قبل هست", kind: "error" });
      return;
    }
    setCats((cs) => [...cs, { id: `c${Date.now().toString(36)}`, name: v }]);
    setNewCat("");
  };
  const removeCat = (id: string) => setCats((cs) => cs.filter((c) => c.id !== id));

  const save = async () => {
    if (name.trim().length < 2) {
      show({ text: "نام کاتالوک را وارد کن", kind: "error" });
      return;
    }
    if (city.trim().length < 2) {
      show({ text: "شهر را وارد کن", kind: "error" });
      return;
    }
    setBusy(true);
    try {
      // ۱) شناسنامهٔ ویترین + اسناد فروش (M5)
      await businessesApi.editBusiness(bizId, {
        name: name.trim(),
        city: city.trim(),
        bio: bio.trim() || null,
        invoiceTaxId: taxId.trim() || null,
        invoiceNote: invoiceNote.trim() || null,
      });
      // ۲) دسته‌های شخصی — replace یکجا
      await businessesApi.setCatalogCategories(bizId, cats);
      // ۳) تنظیمات M2-G7 — دید قیمت + اعتبار
      await businessesApi.setCatalogSettings(bizId, {
        priceVisibilityTrades: pricesHidden ? visibility : null,
        priceValidityDays: validity === "never" ? null : validity,
      });
      // کش کسب‌وکار تازه شود (نام/دسته‌ها همان لحظه در شل و کاتالوک)
      try {
        updateBusinesses(await businessesApi.getMyBusinesses());
      } catch {
        /* best-effort */
      }
      void qc.invalidateQueries({ queryKey: ["listings"] });
      show({ text: "تنظیمات کاتالوک ذخیره شد", kind: "success" });
      router.push("/catalog");
    } catch (e) {
      show({ text: e instanceof Error ? e.message : "ذخیره نشد — دوباره تلاش کن", kind: "error" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <AppShell arm="sell" title="ویرایش کاتالوگ" wide back="/catalog">
      <div className="mx-auto flex w-full max-w-[760px] flex-col gap-5">
        {/* ═══ پیش‌نمایش زنده ═══ */}
        <div className="flex items-center gap-3.5 rounded-2xl border border-line bg-surface p-4">
          <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-primary-soft text-[22px] font-black text-primary-strong">
            {(name || "ک").slice(0, 1)}
          </span>
          <span className="min-w-0 flex-1">
            <b className="block truncate text-[15px] font-black text-text">{name || "نام کاتالوگ"}</b>
            <span className="mt-0.5 block truncate text-[11.5px] text-text-3">
              {city || "شهر"}
              {biz?.trade ? ` · ${biz.trade}` : ""}
            </span>
            {bio.trim() && <span className="mt-1 block truncate text-[11px] text-text-4">{bio.trim()}</span>}
          </span>
          <span className="shrink-0 rounded-full bg-surface-2 px-2.5 py-1 text-[10px] font-bold text-text-3">
            پیش‌نمایش
          </span>
        </div>

        {/* ═══ شناسنامه ═══ */}
        <Field label="نام کاتالوگ" hint="این نام بالای کاتالوک و روی لینک اشتراک‌شده دیده می‌شود">
          {(id) => (
            <Input id={id} value={name} onChange={(e) => setName(e.target.value)} maxLength={60} placeholder="مثلاً: پخش برنج پارس" />
          )}
        </Field>

        <Field label="شهر">
          {(id) =>
            isIran ? (
              <SearchSelect items={iranCityItems} value={city || null} onPick={(it) => setCity(it.value)} placeholder="انتخاب شهر" />
            ) : (
              <Input id={id} value={city} onChange={(e) => setCity(e.target.value)} maxLength={60} placeholder="مثلاً: Istanbul" />
            )
          }
        </Field>

        <Field label="توضیح کوتاه" hint="زیر نام کاتالوگ دیده می‌شود — در یک خط بگو چه می‌فروشی">
          {(id) => (
            <Textarea
              id={id}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={2}
              maxLength={140}
              placeholder="مثلاً: فروش عمده برنج هاشمی و طارم — مستقیم از شالی‌زار گیلان"
            />
          )}
        </Field>

        {/* ═══ دسته‌های شخصی ویترین ═══ */}
        <Field label="دسته‌های ویترین" hint="چیپ‌های بالای کاتالوک — مثلاً: هاشمی، طارم، فجر">
          {() => (
            <div className="flex flex-col gap-2.5">
              {cats.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {cats.map((c) => (
                    <span
                      key={c.id}
                      className="inline-flex h-8 items-center gap-1.5 rounded-full border border-line bg-surface px-3 text-[11.5px] font-bold text-text-2"
                    >
                      {c.name}
                      <button
                        type="button"
                        onClick={() => removeCat(c.id)}
                        aria-label={`حذف ${c.name}`}
                        className="grid size-4 place-items-center rounded-full text-text-4 transition-colors hover:bg-red/10 hover:text-red"
                      >
                        <Icon name="x" size={10} />
                      </button>
                    </span>
                  ))}
                </div>
              )}
              <div className="flex gap-2">
                <div className="min-w-0 flex-1">
                  <Input
                    value={newCat}
                    onChange={(e) => setNewCat(e.target.value)}
                    placeholder="دستهٔ جدید…"
                    maxLength={30}
                    onKeyDown={(e) => e.key === "Enter" && addCat()}
                  />
                </div>
                <Button className="shrink-0" onClick={addCat}>
                  <Icon name="plus" size={15} /> افزودن
                </Button>
              </div>
            </div>
          )}
        </Field>

        {/* ═══ M2-G7 — دید قیمت بر اساس صنف ═══ */}
        <div className="flex items-center gap-3.5 rounded-2xl border border-line bg-surface p-4">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-surface-2 text-text-2">
            <Icon name="eye" size={19} />
          </span>
          <span className="min-w-0 flex-1">
            <b className="block text-[13.5px] font-bold text-text">قیمت‌ها فقط برای مشتریان</b>
            <span className="mt-0.5 block text-[11.5px] leading-5 text-text-3">
              {pricesHidden
                ? visibility.length > 0
                  ? `فقط صنف‌های: ${visibility.join("، ")} قیمت می‌بینند`
                  : "حداقل یک صنف انتخاب کن — یا سوییچ را خاموش کن"
                : "خاموش — قیمت‌ها برای همهٔ بازدیدکنندگان دیده می‌شود"}
            </span>
          </span>
          {/* سوییچ (الگوی setrow پروتوتایپ) */}
          <button
            type="button"
            role="switch"
            aria-checked={pricesHidden}
            aria-label="مشاهده قیمت‌ها فقط برای مشتریان"
            onClick={() => setPricesHidden((v) => !v)}
            className={cn(
              "relative h-7 w-12 shrink-0 rounded-full transition-colors",
              pricesHidden ? "bg-primary" : "bg-line-2"
            )}
          >
            <span
              className={cn(
                "absolute top-1 size-5 rounded-full bg-white shadow-sm transition-all",
                pricesHidden ? "start-6" : "start-1"
              )}
            />
          </button>
        </div>

        {pricesHidden && (
          <Field label="کدام صنف‌ها قیمت ببینند؟" hint="صنف خریدارِ ثبت‌نام‌شده — با رجیستری اصناف تطبیق می‌شود">
            {() => (
              <button
                type="button"
                onClick={() => setTradeSheet(true)}
                className="flex h-12 w-full items-center justify-between gap-2 rounded-lg border border-line-2 bg-surface px-3.5 text-[14px] transition-colors hover:border-line-3"
              >
                <span className={cn("truncate", visibility.length === 0 && "text-text-4")}>
                  {visibility.length > 0 ? `${num(visibility.length, "fa")} صنف انتخاب شده` : "انتخاب صنف‌ها…"}
                </span>
                <Icon name="chevd" size={14} className="shrink-0 text-text-3" />
              </button>
            )}
          </Field>
        )}

        {/* ═══ اعتبار قیمت ═══ */}
        <Field label="یادآوری آپدیت قیمت" hint="بعد از این روزها قیمت‌ها «منقضی» نشان داده می‌شوند و یادآوری می‌گیری">
          {() => (
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5, "never"].map((d) => {
                const active = validity === d;
                return (
                  <button
                    key={String(d)}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setValidity(d as number | "never")}
                    className={cn(
                      "min-w-0 flex-1 rounded-xl border-[1.5px] px-1 py-2.5 text-[12px] font-bold transition-colors",
                      active
                        ? "border-primary bg-primary-soft text-primary-strong"
                        : "border-line bg-surface text-text-2 hover:border-line-2"
                    )}
                  >
                    {d === "never" ? "هرگز" : `${num(d, "fa")} روز`}
                  </button>
                );
              })}
            </div>
          )}
        </Field>

        {/* ═══ اسناد فروش (M5 · FD-37) ═══ */}
        <section className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-4">
          <div className="flex items-center gap-2">
            <Icon name="file-invoice" size={16} className="text-primary-strong" />
            <b className="text-[13.5px] font-bold text-text">فاکتور و اسناد فروش</b>
          </div>
          <Field label="شمارهٔ مالیاتی" hint="روی فاکتورهای چاپی‌ات زیر نام کسب‌وکار می‌نشیند — خالی = چاپ نمی‌شود">
            {(id) => (
              <Input
                id={id}
                value={taxId}
                onChange={(e) => setTaxId(e.target.value)}
                inputMode="numeric"
                placeholder="مثلاً ۱۲۳۴۵۶۷۸۹۰۱"
                maxLength={40}
              />
            )}
          </Field>
          <Field label="یادداشت ثابت فاکتور" hint="پانوشت همهٔ فاکتورها — مثل شرایط برگشت کالا">
            {(id) => (
              <Input
                id={id}
                value={invoiceNote}
                onChange={(e) => setInvoiceNote(e.target.value)}
                placeholder="مثلاً: کالای فروخته‌شده برگشت ندارد"
                maxLength={200}
              />
            )}
          </Field>
        </section>

        <Button variant="arm" size="xl" block loading={busy} onClick={() => void save()}>
          <Icon name="check" size={17} /> ذخیره تغییرات
        </Button>
      </div>

      {/* ═══ شیت چندانتخابی صنف‌ها ═══ */}
      <Sheet open={tradeSheet} onClose={() => setTradeSheet(false)} title="صنف‌هایی که قیمت می‌بینند" maxHeightClass="max-h-[80dvh]">
        <p className="pb-2 text-[12.5px] leading-5 text-text-3">
          صنفِ خریدارانِ ثبت‌نام‌شده را انتخاب کن — فقط همین صنف‌ها قیمت‌های کاتالوک تو را می‌بینند.
        </p>
        {tradesQ.isLoading ? (
          <div className="grid place-items-center py-8">
            <Spinner />
          </div>
        ) : (
          <div role="listbox" aria-label="صنف‌ها" className="flex flex-col">
            {trades.slice(0, 80).map((t) => {
              const on = visibility.includes(t.name);
              return (
                <button
                  key={t.id}
                  type="button"
                  role="option"
                  aria-selected={on}
                  onClick={() =>
                    setVisibility((v) => (on ? v.filter((x) => x !== t.name) : [...v, t.name]))
                  }
                  className={cn(
                    "flex items-center justify-between gap-2 rounded-lg px-2 py-3 text-start transition-colors",
                    on ? "bg-arm-soft" : "hover:bg-surface-2"
                  )}
                >
                  <span className="min-w-0 flex-1 truncate text-[14px] font-bold text-text">{t.name}</span>
                  <span
                    className={cn(
                      "grid size-6 shrink-0 place-items-center rounded-[7px] border-[1.5px] transition-colors",
                      on ? "border-primary bg-primary text-white" : "border-line-2 bg-surface text-transparent"
                    )}
                  >
                    <Icon name="check" size={13} />
                  </span>
                </button>
              );
            })}
            {trades.length === 0 && (
              <p className="py-6 text-center text-[12.5px] leading-6 text-text-3">
                رجیستری اصناف هنوز خالی است — بعد از اولین ثبت‌نام‌ها پر می‌شود.
              </p>
            )}
          </div>
        )}
        <div className="mt-3 flex gap-2">
          <Button variant="outline" size="lg" onClick={() => setVisibility([])}>
            پاک‌کردن انتخاب‌ها
          </Button>
          <Button variant="arm" size="lg" className="flex-1" onClick={() => setTradeSheet(false)}>
            تأیید {visibility.length > 0 ? `(${num(visibility.length, "fa")} صنف)` : ""}
          </Button>
        </div>
      </Sheet>
    </AppShell>
  );
}
