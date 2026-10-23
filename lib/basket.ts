/**
 * سبد کاتالوک (M5 · FD-9/13/26) — persisted per-supplier در localStorage.
 *
 * · کلید: `imach.basket.<slug>` — سبد هر کاتالوک جدا زنده می‌ماند؛ مهمان سبد
 *   می‌چیند، حساب می‌سازد/وارد می‌شود، برمی‌گردد و همان سبد ثبت می‌شود
 *   (بازیابی ctx از localStorage — سند ۰۸ §M5).
 * · «سفارش دوباره» (۳۹): سید `imach.reorder.<slug>` — با باز شدن کاتالوک
 *   یک‌بار در سبد ادغام و پاک می‌شود.
 * · همگام‌سازی UI با رویداد سفارشی `imach-basket` (useSyncExternalStore).
 */

const BASKET_PREFIX = "imach.basket.";
const REORDER_PREFIX = "imach.reorder.";

export interface BasketRecord {
  /** listingId → qty */
  items: Record<string, number>;
  savedAt: string;
  supplierName: string;
}

const EVENT = "imach-basket";

function safe(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

function readRecord(slug: string): BasketRecord | null {
  const ls = safe();
  if (!ls) return null;
  try {
    const raw = ls.getItem(BASKET_PREFIX + slug);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as BasketRecord;
    if (!parsed || typeof parsed !== "object" || !parsed.items) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeRecord(slug: string, rec: BasketRecord): void {
  const ls = safe();
  if (!ls) return;
  try {
    ls.setItem(BASKET_PREFIX + slug, JSON.stringify(rec));
  } catch {
    /* قفل حافظه — سبد است نه اسناد ملی */
  }
  notify();
}

function notify(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(EVENT));
}

/** اشتراک تغییر سبد — برای useSyncExternalStore */
export function subscribeBasket(fn: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(EVENT, fn);
  window.addEventListener("storage", fn);
  return () => {
    window.removeEventListener(EVENT, fn);
    window.removeEventListener("storage", fn);
  };
}

/** عکسِ سبد فعلی — مرجع پایدار برای snapshotuseSyncExternalStore */
export function basketSnapshot(): Record<string, Record<string, number>> {
  const ls = safe();
  if (!ls) return {};
  const out: Record<string, Record<string, number>> = {};
  try {
    for (let i = 0; i < ls.length; i++) {
      const key = ls.key(i);
      if (key && key.startsWith(BASKET_PREFIX)) {
        const rec = JSON.parse(ls.getItem(key) ?? "null") as BasketRecord | null;
        if (rec?.items && Object.keys(rec.items).length > 0) {
          out[key.slice(BASKET_PREFIX.length)] = rec.items;
        }
      }
    }
  } catch {
    /* ignore */
  }
  return out;
}

export function readBasket(slug: string): Record<string, number> {
  return readRecord(slug)?.items ?? {};
}

/** تمام سبدهای پرشده (ردیف «سبد پر داری» روی میز خرید) */
export function allBaskets(): Array<{ slug: string; supplierName: string; count: number; savedAt: string }> {
  const ls = safe();
  if (!ls) return [];
  const out: Array<{ slug: string; supplierName: string; count: number; savedAt: string }> = [];
  try {
    for (let i = 0; i < ls.length; i++) {
      const key = ls.key(i);
      if (!key || !key.startsWith(BASKET_PREFIX)) continue;
      const rec = JSON.parse(ls.getItem(key) ?? "null") as BasketRecord | null;
      if (rec?.items && Object.keys(rec.items).length > 0) {
        out.push({
          slug: key.slice(BASKET_PREFIX.length),
          supplierName: rec.supplierName ?? "تأمین‌کننده",
          count: Object.keys(rec.items).length,
          savedAt: rec.savedAt ?? "",
        });
      }
    }
  } catch {
    /* ignore */
  }
  return out.sort((a, b) => (a.savedAt < b.savedAt ? 1 : -1));
}

export function addToBasket(slug: string, listingId: string, qty: number, supplierName: string): void {
  const rec = readRecord(slug) ?? { items: {}, savedAt: new Date().toISOString(), supplierName };
  rec.items[listingId] = (rec.items[listingId] ?? 0) + qty;
  rec.savedAt = new Date().toISOString();
  rec.supplierName = supplierName;
  writeRecord(slug, rec);
}

export function setBasketQty(slug: string, listingId: string, qty: number): void {
  const rec = readRecord(slug);
  if (!rec) return;
  if (qty <= 0) delete rec.items[listingId];
  else rec.items[listingId] = qty;
  rec.savedAt = new Date().toISOString();
  writeRecord(slug, rec);
}

export function removeFromBasket(slug: string, listingId: string): void {
  const rec = readRecord(slug);
  if (!rec) return;
  delete rec.items[listingId];
  rec.savedAt = new Date().toISOString();
  writeRecord(slug, rec);
}

export function clearBasket(slug: string): void {
  const ls = safe();
  if (!ls) return;
  ls.removeItem(BASKET_PREFIX + slug);
  notify();
}

/** «سفارش دوباره» (۳۹) — سید اقلام سفارش تحویل‌شده */
export function orderItemsSeed(slug: string, items: Array<{ listingId: string; qty: number }>): void {
  const ls = safe();
  if (!ls) return;
  try {
    ls.setItem(REORDER_PREFIX + slug, JSON.stringify(items));
  } catch {
    /* ignore */
  }
}

/** یک‌بار در باز شدن کاتالوک: سید «سفارش دوباره» را در سبد ادغام و پاک کن */
export function takeReorderSeed(slug: string, supplierName: string): number {
  const ls = safe();
  if (!ls) return 0;
  let seed: Array<{ listingId: string; qty: number }> = [];
  try {
    const raw = ls.getItem(REORDER_PREFIX + slug);
    if (raw) seed = JSON.parse(raw) as typeof seed;
  } catch {
    seed = [];
  }
  if (!seed.length) return 0;
  ls.removeItem(REORDER_PREFIX + slug);
  const rec = readRecord(slug) ?? { items: {}, savedAt: new Date().toISOString(), supplierName };
  for (const it of seed) rec.items[it.listingId] = (rec.items[it.listingId] ?? 0) + it.qty;
  rec.savedAt = new Date().toISOString();
  rec.supplierName = supplierName;
  writeRecord(slug, rec);
  return seed.length;
}
