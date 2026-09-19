/**
 * i18n base — the single source of truth for languages & text direction.
 *
 * Persian is the only available locale today. When the app goes
 * multilingual, add an entry here (flip `available: true`) and provide
 * translation dictionaries — the direction, layout and Radix UI
 * components will follow automatically.
 *
 * NOTE (on purpose): UI texts still live inside the components.
 * Translation files will be introduced in the dedicated i18n milestone.
 */

export interface LocaleDef {
  /** ISO code — also used as <html lang> and cookie value. */
  code: string;
  /** Native label shown in the language switcher. */
  label: string;
  /** Writing direction of the whole document. */
  dir: "rtl" | "ltr";
  /** Visible in the language switcher? (fa only, for now) */
  available: boolean;
}

export const LOCALES: readonly LocaleDef[] = [
  { code: "fa", label: "فارسی", dir: "rtl", available: true },
  { code: "en", label: "English", dir: "ltr", available: false },
] as const;

export const DEFAULT_LOCALE = "fa";

/** Cookie that persists the visitor's language choice. */
export const LOCALE_COOKIE = "imach_locale";

export function isLocale(value: string | undefined | null): value is LocaleDef["code"] {
  return LOCALES.some((l) => l.code === value);
}

/** Resolve a stored value to a safe locale (falls back to the default). */
export function getLocale(value: string | undefined | null): LocaleDef["code"] {
  return isLocale(value) ? value : DEFAULT_LOCALE;
}

export function getLocaleDef(code: string): LocaleDef {
  return LOCALES.find((l) => l.code === code) ?? LOCALES[0];
}

export function getDir(code: string): LocaleDef["dir"] {
  return getLocaleDef(code).dir;
}

export function isRtl(code: string): boolean {
  return getDir(code) === "rtl";
}

/** Locales currently offered in the language switcher. */
export function availableLocales(): LocaleDef[] {
  return LOCALES.filter((l) => l.available);
}

/** Read the locale cookie in the browser (client components). */
export function readLocaleCookie(): string {
  if (typeof document === "undefined") return DEFAULT_LOCALE;
  const hit = document.cookie
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${LOCALE_COOKIE}=`));
  return getLocale(hit?.slice(LOCALE_COOKIE.length + 1));
}
