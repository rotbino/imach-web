import type { LocaleDef } from "../config";
import { fa, type Messages } from "./fa";
import { ar } from "./ar";
import { en } from "./en";

/** Typed message dictionaries per locale. */
const MESSAGES: Record<string, Messages> = { fa, ar, en };

export function getMessages(locale: LocaleDef["code"]): Messages {
  return MESSAGES[locale] ?? fa;
}

export type { Messages };
