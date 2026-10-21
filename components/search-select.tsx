"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { Icon } from "@/components/ui/icon";

/**
 * SearchSelect — دراپ‌داون جست‌وجودار (سالواح‌شده از کد قدیمی، بازنویسی M0).
 * آیتم‌ها: { value, label, hint?, searchValue?, id? } — الگوی شهرهای iran-geo.
 */
export interface SearchSelectItem {
  value: string;
  label: string;
  /** زیرمتن ردیف — مثلاً استان برای شهرهای هم‌نام */
  hint?: string;
  /** متن جایگزین جست‌وجو (پیش‌فرض label) */
  searchValue?: string;
  /** شناسهٔ یکتا — پیش‌فرض value */
  id?: string;
}

export interface SearchSelectProps {
  items: SearchSelectItem[];
  value: string | null;
  onPick: (item: SearchSelectItem) => void;
  placeholder?: string;
  emptyText?: string;
  className?: string;
}

export function SearchSelect({
  items,
  value,
  onPick,
  placeholder = "جست‌وجو…",
  emptyText = "چیزی پیدا نشد",
  className,
}: SearchSelectProps) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);

  const selected = useMemo(() => items.find((i) => i.value === value) ?? null, [items, value]);

  const filtered = useMemo(() => {
    const needle = q.trim();
    if (!needle) return items.slice(0, 50);
    return items
      .filter((i) => (i.searchValue ?? i.label).includes(needle))
      .slice(0, 50);
  }, [items, q]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => {
          setOpen((o) => !o);
          setQ("");
        }}
        className={cn(
          "flex h-12 w-full items-center justify-between gap-2 rounded-lg border bg-surface px-3.5 text-[15px]",
          "border-line text-text transition-colors",
          open && "border-arm ring-2 ring-arm/20"
        )}
      >
        <span className={cn("truncate", !selected && "text-text-4")}>
          {selected?.label ?? placeholder}
        </span>
        <Icon name="chevd" size={18} className="shrink-0 text-text-3" />
      </button>

      {open && (
        <div className="absolute inset-x-0 top-full z-40 mt-1.5 overflow-hidden rounded-lg border border-line bg-surface shadow-card">
          <div className="flex items-center gap-2 border-b border-line px-3.5">
            <Icon name="search" size={16} className="shrink-0 text-text-4" />
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={placeholder}
              className="h-11 w-full bg-transparent text-[14px] text-text outline-none placeholder:text-text-4"
            />
          </div>
          <ul className="max-h-64 overflow-y-auto overscroll-contain">
            {filtered.length === 0 ? (
              <li className="px-4 py-6 text-center text-[12.5px] text-text-3">{emptyText}</li>
            ) : (
              filtered.map((item) => (
                <li key={item.id ?? item.value}>
                  <button
                    type="button"
                    onClick={() => {
                      onPick(item);
                      setOpen(false);
                    }}
                    className={cn(
                      "flex w-full items-baseline justify-between gap-2 px-4 py-2.5 text-start transition-colors hover:bg-surface-2",
                      item.value === value && "bg-arm-soft/60"
                    )}
                  >
                    <span className="text-[14px] font-bold text-text">{item.label}</span>
                    {item.hint && <span className="text-[11px] text-text-3">{item.hint}</span>}
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
