import type { LocaleDef } from "../config";
import { fa, type Messages } from "./fa";
import { en } from "./en";

/** Typed message dictionaries per locale (bilingual for now: fa + en). */
const MESSAGES: Record<string, Messages> = { fa, en };

export function getMessages(locale: LocaleDef["code"]): Messages {
  return MESSAGES[locale] ?? fa;
}

export type { Messages };
