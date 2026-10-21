import { cookies, headers } from "next/headers";
import {
  DEFAULT_LOCALE,
  LOCALE_COOKIE,
  detectLocaleFromAcceptLanguage,
  getLocale,
} from "../config";
import { getMessages } from "./index";
import type { Messages } from "./fa";

/**
 * Server-side messages — همان منطق ریشهٔ layout:
 * cookie (انتخاب صریح بازدیدکننده) → Accept-Language → فارسی.
 */
export async function getServerMessages(): Promise<{ locale: string; messages: Messages }> {
  const cookieStore = await cookies();
  const headerStore = await headers();
  const locale = getLocale(
    cookieStore.get(LOCALE_COOKIE)?.value ??
      detectLocaleFromAcceptLanguage(headerStore.get("accept-language")) ??
      DEFAULT_LOCALE
  );
  return { locale, messages: getMessages(locale) };
}
