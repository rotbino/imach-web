"use client";

/**
 * M2 — کوئری‌های مرکزی اپ جدید (شروع مینیمال؛ فاز‌های بعدی رشد می‌کنند).
 * staleTime هر کوئری با کش سرور هم‌راستا تنظیم شده (settings ۵m).
 * M8 — چت: نخستین polling های اپ (الگوی legacy: لیست ۲۰s · گفتگو ۵s).
 */

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { settingsApi, chatApi } from "./api";
import { useAuthStore } from "./auth-store";

/** پیکربندی عمومی (نرخ‌های ارز + سوییچ پرداخت) — عمومی، بدون احراز */
export function useCurrencyConfig() {
  return useQuery({
    queryKey: ["settings", "config"],
    queryFn: () => settingsApi.getConfig(),
    staleTime: 5 * 60_000,
    gcTime: 30 * 60_000,
  });
}

/** فهرست گفتگوها (۲۹) — بج تب چت + نشان آنلاین طرف؛ poll ۲۰s (M8) */
export function useThreads(enabled = true) {
  return useQuery({
    queryKey: ["chat", "threads"],
    queryFn: () => chatApi.getThreads(),
    enabled,
    refetchInterval: 20_000,
    staleTime: 15_000,
  });
}

/** یک گفتگو (۳۰) — ۱۰۰ پیام آخر + زمینهٔ «دربارهٔ:»؛ poll ۵s (M8).
 *  باز کردن = خواندن — هر رفرش بج نخوانده را هم تازه می‌کند. */
export function useThread(threadId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: ["chat", "thread", threadId],
    queryFn: () => chatApi.getThread(threadId as string),
    enabled: enabled && !!threadId,
    refetchInterval: 5_000,
    staleTime: 3_000,
  });
}

/** شروع گفتگو + پرش به آن — الگوی مشترک همهٔ نقاط اتصال (M8).
 *  با contextType/contextRefId گفتگوی زمینه‌دار همان سند ساخته می‌شود
 *  (FD-22 تصمیم ۸: سفارش/پیشنهاد/پیشنهاد تامین/آگهی). */
export function useStartChat() {
  const router = useRouter();
  const businesses = useAuthStore((s) => s.businesses);
  return useCallback(
    async (opts: { withBusinessId: string; context?: { type: string; refId: string } }) => {
      const biz = businesses[0];
      if (!biz) return;
      const r = await chatApi.startThread(biz.id, opts.withBusinessId, opts.context);
      router.push(`/msgs/${r.id}`);
      return r;
    },
    [businesses, router]
  );
}
