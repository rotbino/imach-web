"use client";

/**
 * فاز ۸ مهاجرت — Context ارز نمایش + هوک پول.
 *
 * AppShell مقدار اولیه را از SSR (کوکی imach_currency از layout سرور) می‌گیرد
 * و prefs کراس-دستگاهی را sync می‌کند (همان الگوی تم فاز ۶). همهٔ صفحات
 * (app) از useMoney می‌خوانند: fmt(minor, fromCurrency) → رشتهٔ نمایشی در
 * ارز انتخابی (با نرخ ادمین) یا ارز بومی وقتی نرخ/تفاوت نیست.
 */

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { useCurrencyConfig } from "@/lib/queries";
import { useSetPrefs } from "@/lib/queries";
import { useLocale } from "@/i18n/locale-context";
import { useAuthStore } from "@/lib/auth-store";
import { fmtMoneyIn, moneyPartsIn, writeCurrencyCookie, BASE_CURRENCY } from "@/lib/imach/currency";
import { useRouter } from "next/navigation";

interface CurrencyContextValue {
  /** ارز نمایش فعال (IRR = پیش‌فرض مرجع) */
  display: string;
  /** نرخ‌های ادمین (وقتی پیکربندی آمد) */
  rates: Record<string, number> | undefined;
  /** سوییچ ادمین: درگاه پرداخت روشن است؟ */
  paymentsEnabled: boolean;
  /** فرمت مبالغ در ارز نمایش */
  fmt: (minor: number | null | undefined, from?: string | null) => string;
  /** فرمت دو-تکه: { amount, label } — برای ساختار .pl پروتوتایپ */
  parts: (minor: number | null | undefined, from?: string | null) => { amount: string; label: string };
  /** تغییر ارز نمایش — کوکی + prefs (کراس-دستگاهی) + refresh رندر */
  setDisplay: (currency: string | null) => void;
}

const CurrencyContext = createContext<CurrencyContextValue | null>(null);

export function CurrencyProvider({
  initialCurrency,
  children,
}: {
  initialCurrency?: string | null;
  children: ReactNode;
}) {
  const { locale } = useLocale();
  const router = useRouter();
  const cfg = useCurrencyConfig();
  const setPrefs = useSetPrefs();
  const hasToken = useAuthStore((s) => !!s.accessToken);

  const display = initialCurrency || BASE_CURRENCY;
  const rates = cfg.data?.rates;

  const value = useMemo<CurrencyContextValue>(() => {
    const fmt = (minor: number | null | undefined, from?: string | null) =>
      fmtMoneyIn(minor, from ?? BASE_CURRENCY, display, rates, locale);
    const parts = (minor: number | null | undefined, from?: string | null) =>
      moneyPartsIn(minor, from ?? BASE_CURRENCY, display, rates, locale);
    return {
      display,
      rates,
      paymentsEnabled: cfg.data?.paymentsEnabled ?? true,
      fmt,
      parts,
      setDisplay: (currency: string | null) => {
        writeCurrencyCookie(currency);
        if (hasToken) {
          // null هم sync می‌شود — «پیش‌فرض» روی همهٔ دستگاه‌ها اعمال شود
          setPrefs.mutate({ currency });
        }
        router.refresh();
      },
    };
  }, [display, rates, cfg.data?.paymentsEnabled, locale, hasToken, setPrefs, router]);

  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>;
}

/** فرمت پول در ارز نمایش کاربر — فقط داخل (app) */
export function useMoney(): CurrencyContextValue {
  const ctx = useContext(CurrencyContext);
  if (!ctx) {
    // fallback امن (مثلاً استفاده خارج از شل) — نمایش بومی بدون تبدیل
    return {
      display: BASE_CURRENCY,
      rates: undefined,
      paymentsEnabled: true,
      fmt: (minor) => fmtMoneyIn(minor, BASE_CURRENCY, BASE_CURRENCY, undefined, undefined),
      parts: (minor) => moneyPartsIn(minor, BASE_CURRENCY, BASE_CURRENCY, undefined, undefined),
      setDisplay: () => undefined,
    };
  }
  return ctx;
}
