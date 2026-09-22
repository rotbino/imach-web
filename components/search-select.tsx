"use client";

import * as React from "react";
import { Check, ChevronDown } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";

/*
 * SearchSelect — دراپ‌داون حرفه‌ای سرچ‌دار برای لیست‌های طولانی.
 *
 * قانون پروژه: هر لیستی که بلند است (کشور، زبان، شهر، کالا، برند، …)
 * با همین کامپوننت ساخته می‌شود — نه Select ساده.
 *
 * • جست‌وجوی زنده روی برچسب و keywords (مثلا کد کشور، نام انگلیسی)
 * • ناوبری کامل با کیبورد (↑ ↓ Enter Esc) از cmdk
 * • RTL-friendly — عرض پاپ‌اور = عرض تریگر
 * • hint دومинка برای هر سطر (مثلا واحد پول کنار کشور)
 */

export interface SearchSelectItem {
  value: string;
  /** برچسب اصلی سطر */
  label: string;
  /** متن کمکی دومینگه (کنار برچسب) */
  hint?: string;
  /** توکن‌های اضافی برای جست‌وجو */
  keywords?: string[];
  /** کلید یکتای رندر — وقتی value تکراری است (مثلا شهر هم‌نام در دو استان) */
  id?: string;
}

interface SearchSelectProps {
  items: SearchSelectItem[];
  value: string | null;
  onChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  ariaLabel?: string;
  className?: string;
  disabled?: boolean;
  align?: "start" | "center" | "end";
  /** رندر دلخواه تریگر — پیش‌فرض: label انتخاب‌شده (مثلا برای نمایش فقط «+98») */
  renderLabel?: (selected: SearchSelectItem | null) => React.ReactNode;
  /** سطر کاملِ انتخاب‌شده — برای داده‌های پشت‌صحنه (مثلا استان از روی سطر شهر) */
  onPick?: (item: SearchSelectItem) => void;
}

export function SearchSelect({
  items,
  value,
  onChange,
  onPick,
  placeholder,
  searchPlaceholder,
  emptyText,
  ariaLabel,
  className,
  disabled,
  align = "start",
  renderLabel,
}: SearchSelectProps) {
  const [open, setOpen] = React.useState(false);
  const selected = items.find((i) => i.value === value) ?? null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        type="button"
        disabled={disabled}
        aria-label={ariaLabel}
        aria-expanded={open}
        className={cn(
          "flex h-10 w-full items-center justify-between gap-1.5 rounded-xl border border-input bg-white px-3 text-sm transition-colors",
          "hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
          "disabled:cursor-not-allowed disabled:opacity-50",
          !selected && "text-muted-foreground",
          className
        )}
      >
        <span className="min-w-0 truncate">
          {renderLabel ? renderLabel(selected) : (selected?.label ?? placeholder)}
        </span>
        <ChevronDown className="size-4 shrink-0 opacity-50" aria-hidden />
      </PopoverTrigger>
      <PopoverContent
        align={align}
        // هم‌عرض تریگر — مثل Select های حرفه‌ای
        className="w-(--radix-popover-trigger-width) min-w-44 max-w-[calc(100vw-2rem)] p-0"
      >
        <Command>
          <CommandInput placeholder={searchPlaceholder} autoFocus />
          <CommandList>
            <CommandEmpty>{emptyText}</CommandEmpty>
            <CommandGroup>
              {items.map((item) => (
                <CommandItem
                  key={item.id ?? item.value}
                  // مقدار یکتا برای cmdk — برچسب + keywords تا جست‌وجو همه را بپوشاند
                  value={[item.label, ...(item.keywords ?? [])].join(" ")}
                  keywords={item.keywords}
                  onSelect={() => {
                    onPick?.(item);
                    onChange(item.value);
                    setOpen(false);
                  }}
                  className="gap-2"
                >
                  <span className="min-w-0 grow truncate">
                    {item.label}
                    {item.hint && <span className="text-muted-foreground"> · {item.hint}</span>}
                  </span>
                  {item.value === value && <Check className="size-4 shrink-0 text-primary" aria-hidden />}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
