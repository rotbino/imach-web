"use client";

import { Suspense, useCallback } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { LucideIcon } from "lucide-react";

/*
 * تبِ سینک با URL — هر تب یک آدرس اختصاصی دارد:
 * • ?tab=… با router.replace عوض می‌شود؛ رفرش تب را نگه می‌دارد و لینک هر تب قابل‌اشتراک است.
 * • تبِ پیش‌فرض پارامتری ندارد (URL تمیز می‌ماند)؛ پارامتر نامعتبر به پیش‌فرض برمی‌گردد.
 * • UrlTabs همان ظاهر تب زیرخط‌دار است؛ نوار تب با max-w-7xl وسط‌چین می‌ماند
 *   تا حتی وقتی محتوای پنل تمام‌عرض است (مثل نوارهای پیشنهاد بازار)، تب‌ها با ستون محتوا هم‌تراز باشند.
 */

export interface UrlTab {
  value: string;
  label: string;
  icon?: LucideIcon;
}

/** هوک تبِ URL — برای صفحاتی که مارکاپ تب سفارشی دارند (مثلا داشبورد مدیریت). */
export function useTabParam(
  defaultValue: string,
  values: string[]
): [string, (v: string) => void] {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const raw = searchParams.get("tab") ?? defaultValue;
  const value = values.includes(raw) ? raw : defaultValue;

  const setTab = useCallback(
    (v: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (v === defaultValue) params.delete("tab");
      else params.set("tab", v);
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [searchParams, router, pathname, defaultValue]
  );

  return [value, setTab];
}

/** تب‌های آماده با آدرس اختصاصی — بازار و فرم کالای جدید. */
export function UrlTabs({
  items,
  defaultValue,
  panels,
}: {
  items: UrlTab[];
  defaultValue: string;
  panels: Record<string, React.ReactNode>;
}) {
  return (
    <Suspense fallback={null}>
      <UrlTabsInner items={items} defaultValue={defaultValue} panels={panels} />
    </Suspense>
  );
}

function UrlTabsInner({
  items,
  defaultValue,
  panels,
}: {
  items: UrlTab[];
  defaultValue: string;
  panels: Record<string, React.ReactNode>;
}) {
  const [value, setTab] = useTabParam(
    defaultValue,
    items.map((t) => t.value)
  );

  return (
    <Tabs value={value} onValueChange={setTab}>
      <TabsList className="mx-auto h-11 w-full max-w-7xl justify-stretch rounded-none border-b bg-transparent p-0">
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
