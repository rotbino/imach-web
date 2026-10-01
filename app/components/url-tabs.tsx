"use client";

import { useCallback } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

/*
 * هوک تبِ سینک با URL — هر تب یک آدرس اختصاصی دارد:
 * • ?tab=… با router.replace عوض می‌شود؛ رفرش تب را نگه می‌دارد و لینک هر تب قابل‌اشتراک است.
 * • تبِ پیش‌فرض پارامتری ندارد (URL تمیز می‌ماند)؛ پارامتر نامعتبر به پیش‌فرض برمی‌گردد.
 * (کامپوننت آماده‌ی UrlTabs در پاکسازی فاز ۱۰ حذف شد — مارکاپ تب حالا مال خود صفحات است.)
 */

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
