"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { LucideIcon } from "lucide-react";

export interface UnderlineTab {
  value: string;
  label: string;
  icon?: LucideIcon;
}

/**
 * تب واقعی — نوار تمام‌عرض چسبیده زیر هدر؛ تب فعال با زیرخط مشخص می‌شود.
 * جای سوییچرهای قرصی؛ مینیمال و خوانا.
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
      <TabsList className="h-12 w-full justify-stretch rounded-none border-b bg-transparent p-0">
        {items.map((t) => (
          <TabsTrigger
            key={t.value}
            value={t.value}
            className="flex-1 gap-1.5 rounded-none border-b-2 border-transparent bg-transparent px-2 pb-2.5 pt-2 text-sm font-bold shadow-none data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none"
          >
            {t.icon && <t.icon className="size-4" strokeWidth={1.75} />}
            {t.label}
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
