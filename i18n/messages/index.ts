import type { LocaleDef } from "../config";
import { fa, type Messages } from "./fa";
import { en } from "./en";
import { ar } from "./ar";

/** Typed message dictionaries per locale (fa + en + ar since migration phase 1). */
const MESSAGES: Record<string, Messages> = { fa, en, ar };

export function getMessages(locale: LocaleDef["code"]): Messages {
  return MESSAGES[locale] ?? fa;
}

export type { Messages };
