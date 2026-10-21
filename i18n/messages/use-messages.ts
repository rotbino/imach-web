"use client";

import { useLocale } from "../locale-context";
import { getMessages, type Messages } from "./index";

/** Typed dictionary for the active locale (e.g. messages.auth.titleLogin). */
export function useMessages(): Messages {
  const { locale } = useLocale();
  return getMessages(locale);
}
