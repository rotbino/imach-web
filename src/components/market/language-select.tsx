"use client";

import { Check, ChevronDown, Globe } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useLocale } from "@/i18n/locale-context";
import { availableLocales } from "@/i18n/config";

/**
 * Language switcher — the visible handle of the i18n base.
 * Only available locales are listed (فارسی for now); adding a language
 * in i18n/config.ts makes it appear here with zero extra wiring.
 */
export function LanguageSelect({ align = "end" }: { align?: "start" | "end" | "center" }) {
  const { locale, setLocale } = useLocale();
  const items = availableLocales();
  if (items.length === 0) return null;

  const current = items.find((l) => l.code === locale) ?? items[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="انتخاب زبان"
        className="inline-flex h-9 items-center gap-1.5 rounded-lg border bg-white px-2.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Globe className="size-4 text-primary" aria-hidden />
        <span>{current.label}</span>
        <ChevronDown className="size-3.5 opacity-60" aria-hidden />
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align} className="min-w-36">
        <DropdownMenuLabel className="text-[11px] font-normal text-muted-foreground">
          زبان / Language
        </DropdownMenuLabel>
        {items.map((l) => (
          <DropdownMenuItem
            key={l.code}
            onClick={() => setLocale(l.code as never)}
            className="justify-between gap-3"
          >
            <span className={l.code === current.code ? "font-bold text-foreground" : ""}>
              {l.label}
            </span>
            {l.code === current.code && <Check className="size-4 text-primary" aria-hidden />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
