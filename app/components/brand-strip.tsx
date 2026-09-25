"use client";

import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";
import type { BrandChipDto } from "@/lib/api";

/**
 * نوار برند افقی — چیپ‌های برند با شمارش محصول‌های هر برند، قابل کلیک برای
 * فیلتر کردن لیست به همان برند. برندِ انتخاب‌شده با آیکون check نمایش داده
 * می‌شود؛ کلیک دوباره آن فیلتر را برمی‌دارد.
 *
 * منبع برندها از خودِ لیست بازگشتی استخراج می‌شود (در بک‌اند)، نه از جدول
 * برند کلی — تا فقط برندهای مرتبط با scope فعلی نشان داده شوند.
 */
export function BrandStrip({
  brands,
  activeBrandId,
  onPick,
  emptyHint,
}: {
  brands: BrandChipDto[];
  activeBrandId: string | null;
  onPick: (brandId: string | null) => void;
  emptyHint?: string;
}) {
  if (brands.length === 0) return null;
  return (
    <div className="relative">
      <ScrollArea className="w-full whitespace-nowrap rounded-lg">
        <div className="flex w-max gap-1.5 p-1">
          {/* «همه» — پاک کردن فیلتر برند */}
          <button
            type="button"
            onClick={() => onPick(null)}
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-[11px] font-bold transition",
              activeBrandId === null
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-accent text-muted-foreground hover:bg-accent/70 hover:text-foreground"
            )}
          >
            همه
          </button>
          {brands.map((b) => {
            const on = b.id === activeBrandId;
            return (
              <button
                key={b.id}
                type="button"
                onClick={() => onPick(on ? null : b.id)}
                className={cn(
                  "inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-[11px] font-bold transition",
                  on
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-accent text-muted-foreground hover:bg-accent/70 hover:text-foreground"
                )}
                aria-pressed={on}
              >
                {on && <Check className="size-3" />}
                <span className="truncate max-w-[100px]">{b.name}</span>
                <span
                  className={cn(
                    "rounded-full px-1.5 py-0 text-[9px]",
                    on ? "bg-primary-foreground/20" : "bg-muted"
                  )}
                >
                  {b.count}
                </span>
              </button>
            );
          })}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
      {emptyHint && brands.length === 0 && (
        <p className="mt-1 text-[11px] text-muted-foreground">{emptyHint}</p>
      )}
    </div>
  );
}

/**
 * نوار دسته‌بندی افقی — چیپ‌های دسته با شمارش، قابل کلیک برای فیلتر.
 * همان ظاهر BrandStrip، فقط برای دسته‌ها.
 */
export function CategoryStrip({
  categories,
  activeCategoryId,
  onPick,
  locale = "fa",
}: {
  categories: { id: string; nameFa: string; nameEn: string; count: number }[];
  activeCategoryId: string | null;
  onPick: (categoryId: string | null) => void;
  locale?: "fa" | "en";
}) {
  if (categories.length === 0) return null;
  return (
    <ScrollArea className="w-full whitespace-nowrap rounded-lg">
      <div className="flex w-max gap-1.5 p-1">
        <button
          type="button"
          onClick={() => onPick(null)}
          className={cn(
            "inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-[11px] font-bold transition",
            activeCategoryId === null
              ? "bg-foreground text-background shadow-sm"
              : "bg-muted text-muted-foreground hover:bg-muted/70 hover:text-foreground"
          )}
        >
          همه دسته‌ها
        </button>
        {categories.map((c) => {
          const on = c.id === activeCategoryId;
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => onPick(on ? null : c.id)}
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-[11px] font-bold transition",
                on
                  ? "bg-foreground text-background shadow-sm"
                  : "bg-muted text-muted-foreground hover:bg-muted/70 hover:text-foreground"
              )}
              aria-pressed={on}
            >
              {on && <Check className="size-3" />}
              <span className="truncate max-w-[120px]">
                {locale === "en" ? c.nameEn : c.nameFa}
              </span>
              <span className="rounded-full bg-background/40 px-1.5 py-0 text-[9px]">
                {c.count}
              </span>
            </button>
          );
        })}
      </div>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  );
}
