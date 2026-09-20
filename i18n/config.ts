/**
 * i18n — the single source of truth for languages & text direction.
 *
 * • Persian (fa, RTL) is the default.
 * • For now the product is bilingual — fa + en — and multilingualism
 *   is only required on the auth (login/register) page; other pages
 *   follow when their dictionaries are added.
 * • The default language comes from the visitor: cookie →
 *   Accept-Language (e.g. fa-IR → fa) → Persian.
 *
 * UI texts live in i18n/messages/*; the root layout is the ONLY place
 * that writes <html lang/dir>; everything else inherits via logical
 * CSS properties and the Radix DirectionProvider.
 */

export interface LocaleDef {
  /** ISO code — also used as <html lang> and cookie value. */
  code: string;
  /** Native label shown in the language switcher. */
  label: string;
  /** Writing direction of the whole document. */
  dir: "rtl" | "ltr";
  /** Visible in the language switcher? */
  available: boolean;
}

export const LOCALES: readonly LocaleDef[] = [
  { code: "fa", label: "فارسی", dir: "rtl", available: true },
  { code: "en", label: "English", dir: "ltr", available: true },
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

/**
 * First-match locale from an Accept-Language header
 * (e.g. "fa-IR,fa;q=0.9,en;q=0.8" → fa). Mirrors the API resolver.
 */
export function detectLocaleFromAcceptLanguage(header: string | undefined | null): LocaleDef["code"] {
  if (!header) return DEFAULT_LOCALE;
  const tags = header
    .split(",")
    .map((part) => {
      const trimmed = part.trim();
      const rawTag = trimmed.split(";")[0]?.trim() ?? "";
      const qParam = trimmed.split(";")[1]?.trim() ?? "";
      const q = /^q=([\d.]+)$/.exec(qParam)?.[1];
      return { tag: rawTag.toLowerCase(), quality: q ? Number.parseFloat(q) || 0 : 1 };
    })
    .sort((a, b) => b.quality - a.quality);

  for (const { tag } of tags) {
    const base = tag.split("-")[0] ?? "";
    if (isLocale(base)) return base;
  }
  return DEFAULT_LOCALE;
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
