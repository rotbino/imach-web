"use client";

/**
 * M2 — Context ارز نمایش + هوک پول (حکم مالک: پیش‌فرض کشور، انتخاب آزاد).
 *
 * رزولوشن ارز نمایش (اولویت از بالا به پایین):
 *   ۱. انتخاب صریح کاربر — کوکی imach_currency روی این دستگاه
 *      (+ User.prefs.currency کراس-دستگاهی وقتی لاگین است)
 *   ۲. پیش‌فرض کشورِ کسب‌وکار فعال — ایران → IRR (نمایش تومان)،
 *      ترکیه → TRY، امارات → AED … (حکم ۳: «پیش‌فرضها در لیست کشور
 *      ذخیره هستن ولی می‌تونن عوض بشن»)
 *   ۳. ارز مرجع IRR
 *
 * setDisplay(null) = بازگشت به پیش‌فرض کشور («پیش‌فرض نمایش»).
 *
 * همهٔ صفحات داخل شل از useMoney می‌خوانند: fmt(minor, fromCurrency) →
 * رشتهٔ نمایشی در ارز انتخابی (با نرخ ادمین) یا ارز بومی وقتی نرخ نیست.
 */

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useCurrencyConfig } from "@/lib/queries";
import { useLocale } from "@/i18n/locale-context";
import { useAuthStore } from "@/lib/auth-store";
import { prefsApi } from "@/lib/api";
import {
  fmtMoneyIn,
  moneyPartsIn,
  writeCurrencyCookie,
  readCurrencyCookie,
  currencyOfCountryCode,
  BASE_CURRENCY,
  type Rates,
} from "@/lib/currency";

interface DisplayPrefsValue {
  /** ارز نمایش فعال (IRR = پیش‌فرض مرجع) */
  display: string;
  /** انتخاب صریح کاربر روی این دستگاه (null = پیش‌فرض کشور) */
  explicit: string | null;
  /** نرخ‌های ادمین (وقتی پیکربندی آمد) */
  rates: Rates | undefined;
  /** سوییچ ادمین: درگاه پرداخت روشن است؟ */
  paymentsEnabled: boolean;
  /** فرمت مبالغ در ارز نمایش */
  fmt: (minor: number | null | undefined, from?: string | null) => string;
  /** فرمت دو-تکه: { amount, label } — برای ساختار قیمت کارت‌ها */
  parts: (minor: number | null | undefined, from?: string | null) => { amount: string; label: string };
  /** تغییر ارز نمایش — کوکی + prefs سرور (کراس-دستگاهی) + refresh رندر.
   *  null = برگشتن به پیش‌فرض کشور. */
  setDisplay: (currency: string | null) => void;
}

const DisplayPrefsContext = createContext<DisplayPrefsValue | null>(null);

export function DisplayPrefsProvider({
  initialCurrency,
  children,
}: {
  /** از کوکی سرور (layout) می‌آید — با رزولوشن کلاینت هم‌گرا می‌شود */
  initialCurrency?: string | null;
  children: ReactNode;
}) {
  const { locale } = useLocale();
  const router = useRouter();
  const qc = useQueryClient();
  const cfg = useCurrencyConfig();
  const hasToken = useAuthStore((s) => !!s.accessToken);
  const businesses = useAuthStore((s) => s.businesses);

  // انتخاب صریحِ روی دستگاه — بعد از boot با کوکی هم‌گرا می‌شود
  const [explicit, setExplicit] = useState<string | null>(initialCurrency ?? null);

  useEffect(() => {
    const fromCookie = readCurrencyCookie();
    if (fromCookie !== explicit) setExplicit(fromCookie);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- فقط mount اولیه
  }, []);

  // پیش‌فرض کشورِ کسب‌وکار فعال (حکم ۳) — بدون انتخاب صریح اعمال می‌شود
  const countryDefault = useMemo(() => {
    const biz = businesses[0];
    return currencyOfCountryCode(biz?.country);
  }, [businesses]);

  const display = explicit ?? countryDefault ?? BASE_CURRENCY;
  const rates = cfg.data?.rates;

  const value = useMemo<DisplayPrefsValue>(() => {
    const fmt = (minor: number | null | undefined, from?: string | null) =>
      fmtMoneyIn(minor, from ?? BASE_CURRENCY, display, rates, locale);
    const parts = (minor: number | null | undefined, from?: string | null) =>
      moneyPartsIn(minor, from ?? BASE_CURRENCY, display, rates, locale);
    return {
      display,
      explicit,
      rates,
      paymentsEnabled: cfg.data?.paymentsEnabled ?? true,
      fmt,
      parts,
      setDisplay: (currency: string | null) => {
        writeCurrencyCookie(currency);
        setExplicit(currency);
        if (hasToken) {
          // null هم sync می‌شود — «پیش‌فرض کشور» روی همهٔ دستگاه‌ها اعمال شود
          void prefsApi
            .setPrefs({ currency })
            .then(() => qc.invalidateQueries({ queryKey: ["auth", "me"] }))
            .catch(() => {
              /* prefs سمت سرور best-effort است — کوکی محلی همیشه می‌ماند */
            });
        }
        router.refresh();
      },
    };
  }, [display, explicit, rates, cfg.data?.paymentsEnabled, locale, hasToken, router, qc]);

  return <DisplayPrefsContext.Provider value={value}>{children}</DisplayPrefsContext.Provider>;
}

/** فرمت پول در ارز نمایش کاربر — فقط داخل اپ لاگین‌شده */
export function useMoney(): DisplayPrefsValue {
  const ctx = useContext(DisplayPrefsContext);
  if (!ctx) {
    // fallback امن (استفاده خارج از شل) — نمایش بومی بدون تبدیل
    return {
      display: BASE_CURRENCY,
      explicit: null,
      rates: undefined,
      paymentsEnabled: true,
      fmt: (minor) => fmtMoneyIn(minor, BASE_CURRENCY, BASE_CURRENCY, undefined, undefined),
      parts: (minor) => moneyPartsIn(minor, BASE_CURRENCY, BASE_CURRENCY, undefined, undefined),
      setDisplay: () => undefined,
    };
  }
  return ctx;
}
