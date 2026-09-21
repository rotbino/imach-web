"use client";

import { useCallback, useEffect, useState } from "react";
import type { HashRoute, Inquiry, Offer } from "./types";

// ─── روتر ساده مبتنی بر هش ───
export function parseHash(hash: string): HashRoute {
  const h = hash.replace(/^#\/?/, "");
  const parts = h.split("/").filter(Boolean);
  if (parts.length === 0) return { view: "landing" };
  if (parts[0] === "add") return { view: "add" };
  if (parts[0] === "welcome" && parts[1]) return { view: "welcome", slug: parts[1] };
  if (parts[0] === "sell" && parts[1]) return { view: "sell", slug: parts[1] };
  if (parts[0] === "buy" && parts[1]) return { view: "buy", slug: parts[1] };
  return { view: "landing" };
}

export function useHashRoute() {
  const [route, setRoute] = useState<HashRoute | null>(null);

  useEffect(() => {
    const update = () => setRoute(parseHash(window.location.hash));
    update();
    window.addEventListener("hashchange", update);
    return () => window.removeEventListener("hashchange", update);
  }, []);

  const navigate = useCallback((to: string) => {
    window.location.hash = to;
  }, []);

  return { route, navigate };
}

// ─── ذخیره وضعیت قیمت‌گیری‌ها: slug -> { goodId: { offers, active } } ───
export interface InquiryState {
  active: boolean;
  offers: Offer[];
}

const inqKey = (slug: string) => `peyvand.inquiries.${slug}`;

export function loadInquiries(slug: string): Record<string, InquiryState> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(inqKey(slug)) ?? "{}");
  } catch {
    return {};
  }
}

export function saveInquiryState(
  slug: string,
  goodId: string,
  state: InquiryState
): void {
  if (typeof window === "undefined") return;
  const all = loadInquiries(slug);
  all[goodId] = state;
  localStorage.setItem(inqKey(slug), JSON.stringify(all));
}

// ─── فالوها: slug -> supplierSlug[] ───
const followKey = (slug: string) => `peyvand.follows.${slug}`;

export function loadFollows(slug: string): string[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(followKey(slug)) ?? "[]");
  } catch {
    return [];
  }
}

export function saveFollows(slug: string, follows: string[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(followKey(slug), JSON.stringify(follows));
}

// ─── پیشنهادهای ارسالی فروشنده: slug -> { buyerSlug+goodId: {price, time} } ───
export interface SentOffer {
  price: number;
  time: string;
}

const offersKey = (slug: string) => `peyvand.sentOffers.${slug}`;

export function loadSentOffers(slug: string): Record<string, SentOffer> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(offersKey(slug)) ?? "{}");
  } catch {
    return {};
  }
}

export function saveSentOffer(slug: string, key: string, offer: SentOffer): void {
  if (typeof window === "undefined") return;
  const all = loadSentOffers(slug);
  all[key] = offer;
  localStorage.setItem(offersKey(slug), JSON.stringify(all));
}

// ─── درخواست‌های قیمت جدید (شبیه‌سازی بازدیدکننده): slug -> Inquiry[] ───
const extraInqKey = (slug: string) => `peyvand.extraInquiries.${slug}`;

export function loadExtraInquiries(slug: string): Inquiry[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(extraInqKey(slug)) ?? "[]");
  } catch {
    return [];
  }
}

export function addExtraInquiry(slug: string, inquiry: Inquiry): void {
  if (typeof window === "undefined") return;
  const all = loadExtraInquiries(slug);
  all.unshift(inquiry);
  localStorage.setItem(extraInqKey(slug), JSON.stringify(all));
}

// ─── به‌روزرسانی قیمت تامین‌کننده‌های فالو‌شده: slug -> { "sup:good": {price, prev} } ───
export interface PriceOverride {
  price: number;
  prev: number;
}

const overridesKey = (slug: string) => `peyvand.priceOverrides.${slug}`;

export function loadPriceOverrides(slug: string): Record<string, PriceOverride> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(overridesKey(slug)) ?? "{}");
  } catch {
    return {};
  }
}

export function savePriceOverrides(
  slug: string,
  overrides: Record<string, PriceOverride>
): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(overridesKey(slug), JSON.stringify(overrides));
}

// ─── آخرین پروفایل ساخته‌شده (برای دسترسی سریع هدر) ───
const LAST_PROFILE_KEY = "peyvand.lastProfile";

export function loadLastProfile(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(LAST_PROFILE_KEY);
  } catch {
    return null;
  }
}

export function saveLastProfile(slug: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LAST_PROFILE_KEY, slug);
  } catch {
    /* noop */
  }
}
