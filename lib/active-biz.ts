"use client";

import { create } from "zustand";
import { useMyBusinesses } from "./queries";
import type { BusinessSummaryDto } from "./api";

/**
 * کسب‌وکار فعال — صاحب صفحه‌ها. مثل اینستاگرام: یک هویت جاری در طول نشست؛
 * با دراپ‌داون عوض می‌شود و بعد از رفرش به اولین کسب‌وکار برمی‌گردد.
 */

interface ActiveBizState {
  activeId: string | null;
  setActive: (id: string) => void;
}

export const useActiveBizStore = create<ActiveBizState>((set) => ({
  activeId: null,
  setActive: (id) => set({ activeId: id }),
}));

/** کسب‌وکار جاری کاربر — null یعنی هنوز کسب‌وکاری ندارد (یا در حال بارگذاری است) */
export function useActiveBusiness(): BusinessSummaryDto | null {
  const q = useMyBusinesses();
  const mine = q.data ?? [];
  const activeId = useActiveBizStore((s) => s.activeId);
  return mine.find((b) => b.id === activeId) ?? mine[0] ?? null;
}

// ─── محیط‌ها — آخرین محیطِ باز‌شده، پیش‌فرض ورود (سند فصل ۴.۵) ───

export type Env = "sell" | "buy" | "market";

const ENV_KEY = "imach.env";

export function lastEnv(): Env {
  if (typeof window === "undefined") return "sell";
  const v = window.localStorage.getItem(ENV_KEY);
  return v === "buy" || v === "market" || v === "sell" ? v : "sell";
}

export function setLastEnv(env: Env): void {
  if (typeof window !== "undefined") window.localStorage.setItem(ENV_KEY, env);
}

/** مقصد ورود کاربر واردشده = محیط فروش، یا آخرین محیطی که باز کرده بود */
export function myEnvHref(): string {
  const env = lastEnv();
  return env === "buy" ? "/buy" : env === "market" ? "/market" : "/sell";
}
