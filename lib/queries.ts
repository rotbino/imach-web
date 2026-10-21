"use client";

/**
 * M2 — کوئری‌های مرکزی اپ جدید (شروع مینیمال؛ فاز‌های بعدی رشد می‌کنند).
 * staleTime هر کوئری با کش سرور هم‌راستا تنظیم شده (settings ۵m).
 */

import { useQuery } from "@tanstack/react-query";
import { settingsApi } from "./api";

/** پیکربندی عمومی (نرخ‌های ارز + سوییچ پرداخت) — عمومی، بدون احراز */
export function useCurrencyConfig() {
  return useQuery({
    queryKey: ["settings", "config"],
    queryFn: () => settingsApi.getConfig(),
    staleTime: 5 * 60_000,
    gcTime: 30 * 60_000,
  });
}
