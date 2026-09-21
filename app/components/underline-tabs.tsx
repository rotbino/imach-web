"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { LucideIcon } from "lucide-react";

export interface UnderlineTab {
  value: string;
  label: string;
  icon?: LucideIcon;
}

/**
 * تب واقعی — نوار تب چسبیده زیر هدر.
 * تب فعال: زیرخط نارنجی + ته‌رنگ ملایم با گوشه‌های گرد بالا (حس تب پوشه‌ای).
 * موبایل: تب‌ها تمام‌عرض تقسیم می‌شوند؛ دسکتاپ: هر تب به‌اندازه محتوایش می‌نشیند.
 */
export function UnderlineTabs({
  items,
  defaultValue,
  panels,
}: {
  items: UnderlineTab[];
  defaultValue: string;
  panels: Record<string, React.ReactNode>;
}) {
  return (
    <Tabs defaultValue={defaultValue}>
      <TabsList className="h-11 w-full justify-stretch rounded-none border-b bg-transparent p-0">
        {items.map((t) => (
          <TabsTrigger
            key={t.value}
            value={t.value}
            className="min-w-0 flex-1 gap-1.5 rounded-t-lg border-b-2 border-transparent bg-transparent px-2 pb-2 pt-1.5 text-[13px] font-bold text-muted-foreground shadow-none transition-colors hover:bg-accent/30 hover:text-foreground data-[state=active]:border-primary data-[state=active]:bg-accent/40 data-[state=active]:text-primary data-[state=active]:shadow-none sm:flex-none sm:px-6"
          >
            {t.icon && <t.icon className="size-4 shrink-0" strokeWidth={1.75} />}
            <span className="truncate">{t.label}</span>
          </TabsTrigger>
        ))}
      </TabsList>
      {items.map((t) => (
        <TabsContent key={t.value} value={t.value} className="mt-0">
          {panels[t.value]}
        </TabsContent>
      ))}
    </Tabs>
  );
}
