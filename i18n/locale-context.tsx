"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  DEFAULT_LOCALE,
  LOCALE_COOKIE,
  getDir,
  isRtl,
  type LocaleDef,
} from "./config";

/**
 * Locale runtime — mirrors the server-side choice made in the root
 * layout (the ONLY place <html lang/dir> is written) and lets the UI
 * switch it at runtime:
 *   1. persist the choice in a cookie (server picks it up on refresh),
 *   2. flip <html lang/dir> immediately — layout direction updates
 *      without a reload because the whole app uses logical CSS
 *      properties (ms-/me-/ps-/pe-/start-/end-),
 *   3. refresh server components so data follows the new locale.
 */

interface LocaleContextValue {
  locale: LocaleDef["code"];
  dir: LocaleDef["dir"];
  isRtl: boolean;
  setLocale: (code: LocaleDef["code"]) => void;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

function persistLocale(code: LocaleDef["code"]) {
  document.cookie = `${LOCALE_COOKIE}=${code};path=/;max-age=31536000;samesite=lax`;
}

export function LocaleProvider({
  initialLocale = DEFAULT_LOCALE,
  children,
}: {
  initialLocale?: LocaleDef["code"];
  children: React.ReactNode;
}) {
  const [locale, setLocaleState] = useState(initialLocale);
  const router = useRouter();

  // همگام‌سازی dir در <html> با locale — در first mount و هر بار locale عوض می‌شود.
  // این تضمین می‌کند که وقتی کاربر کشور را به ایران تغییر می‌دهد و setLocale("fa")
  // صدا زده می‌شود، dir هم فوراً به rtl تغییر کند.
  useEffect(() => {
    if (typeof document === "undefined") return;
    const el = document.documentElement;
    el.lang = locale;
    el.dir = getDir(locale);
  }, [locale]);

  const setLocale = useCallback(
    (code: LocaleDef["code"]) => {
      persistLocale(code);
      setLocaleState(code);
      // server components re-render with the new cookie value
      router.refresh();
    },
    [router]
  );

  const value = useMemo<LocaleContextValue>(
    () => ({ locale, dir: getDir(locale), isRtl: isRtl(locale), setLocale }),
    [locale, setLocale]
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale(): LocaleContextValue {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error("useLocale must be used inside <LocaleProvider>");
  return ctx;
}
