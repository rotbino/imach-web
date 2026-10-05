"use client";

import { useEffect } from "react";

/**
 * فاز ۹ — بازکردن خودکار شیت/مدال از پارامتر آدرس `?sheet=<name>`.
 * صفحهٔ دمو (/demo) با همین پارامتر به صفحهٔ میزبان ناوبری می‌کند تا کاربر
 * هر شیت را سریع ببیند و ایرادش را گزارش کند.
 *
 * window.location.search مستقیم (فقط کلاینت) خوانده می‌شود — نه useSearchParams —
 * تا رندر استاتیک مسیرها تحت تأثیر قرار نگیرد و Suspense لازم نشود.
 *
 * @param name    نام پارامتر (مثال: "share" برای ?sheet=share)
 * @param open    بازکنندهٔ پایدار (setter یا useCallback)
 */
export function useSheetParam(name: string, open: () => void) {
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("sheet") === name) open();
  }, [name, open]);
}

/** خواندن خام پارامتر sheet — برای منطق شرطی (مثال: contacts) */
export function sheetParam(): string | null {
  if (typeof window === "undefined") return null;
  return new URLSearchParams(window.location.search).get("sheet");
}
