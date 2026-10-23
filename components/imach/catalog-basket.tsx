"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { Icon } from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import { useToast } from "@/components/ui/toast";
import { moneyPartsIn } from "@/lib/currency";
import { num } from "@/lib/format";
import { useAuthStore } from "@/lib/auth-store";
import { ordersApi } from "@/lib/api";
import {
  addToBasket,
  clearBasket,
  readBasket,
  removeFromBasket,
  setBasketQty,
  subscribeBasket,
  takeReorderSeed,
} from "@/lib/basket";

/**
 * سبد کاتالوک عمومی (M5 · اسکرین ۳۱ + FD-9/13/26):
 *
 * · AddToCartButton — دکمهٔ + روی کارت‌های کاتالوگ (فقط ردیف‌های قیمت‌دار؛
 *   کاتالوک خودِ فروشنده = بدون سبد).
 * · CatalogBasket — نوار شناور شمار سبد + شیت سبد: استپر ± و ورود عدد
 *   تایپی (FD-26 — گیت حداقل سفارش) · ثبت سفارش ⇒ POST /orders · مهمان =
 *   گیت حساب (سبد در localStorage زنده می‌ماند؛ بعد از ورود همان‌جا ثبت).
 * · «سفارش دوباره» (۳۹): سید با باز شدن کاتالوگ یک‌بار ادغام می‌شود.
 *
 * قانون مالک M2: فرم فارسی، متن‌ها همین‌جا (فریز i18n).
 */

export interface BasketListing {
  id: string;
  name: string;
  pack: string;
  priceMinor: number | null;
  currency: string | null;
  minOrder: number | null;
}

/** عکس سبد — با رویداد localStorage همگام (SSR-safe).
 *  useSyncExternalStore مرجع پایدار می‌خواهد → snapshot رشته‌ای است (مقایسه
 *  مقداری) و فقط در تغییرِ واقعی دوباره ساخته می‌شود. */
function useCart(slug: string): Record<string, number> {
  const raw = useSyncExternalStore(
    subscribeBasket,
    () => JSON.stringify(readBasket(slug)),
    () => "{}"
  );
  return useMemo(() => JSON.parse(raw) as Record<string, number>, [raw]);
}

/* ─────────────────── دکمهٔ + روی کارت ─────────────────── */

export function AddToCartButton({
  slug,
  supplierName,
  listingId,
  minOrder,
  currency,
  priceMinor,
}: {
  slug: string;
  supplierName: string;
  listingId: string;
  minOrder: number;
  currency: string;
  priceMinor: number;
}) {
  const cart = useCart(slug);
  const { show } = useToast();
  const inCart = cart[listingId];
  const min = minOrder || 1;

  const add = () => {
    addToBasket(slug, listingId, min, supplierName);
    show({ text: `به سبد اضافه شد — حداقل ${num(min, "fa")}`, kind: "success" });
  };

  if (inCart) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-green-soft px-3 py-1.5 text-[11.5px] font-bold text-green">
        <Icon name="check" size={13} />
        {num(inCart, "fa")} در سبد
      </span>
    );
  }
  return (
    <button
      type="button"
      onClick={add}
      aria-label="افزودن به سبد خرید"
      className="inline-flex items-center gap-1.5 rounded-full bg-arm px-3.5 py-1.5 text-[11.5px] font-bold text-white transition-opacity hover:opacity-90"
    >
      <Icon name="plus" size={13} />
      {moneyPartsIn(priceMinor, currency, currency, undefined, "fa").amount}
    </button>
  );
}

/* ─────────────────── نوار + شیت سبد + ثبت ─────────────────── */

export function CatalogBasket({
  slug,
  supplierId,
  supplierName,
  listings,
}: {
  slug: string;
  supplierId: string;
  supplierName: string;
  listings: BasketListing[];
}) {
  const router = useRouter();
  const qc = useQueryClient();
  const { show } = useToast();
  const status = useAuthStore((s) => s.status);
  const businesses = useAuthStore((s) => s.businesses);
  const isOwn = status === "authed" && businesses.some((b) => b.slug === slug);

  const cart = useCart(slug);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ id: string; count: number } | null>(null);
  const seedTaken = useRef(false);

  // «سفارش دوباره» — سید یک‌بار در باز شدن کاتالوک ادغام می‌شود
  useEffect(() => {
    if (seedTaken.current) return;
    seedTaken.current = true;
    const added = takeReorderSeed(slug, supplierName);
    if (added > 0) {
      show({ text: `${num(added, "fa")} قلم سفارش قبلی به سبد اضافه شد — قیمت‌ها تازه`, kind: "info" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- یک‌بار در mount
  }, [slug]);

  const byId = useMemo(() => new Map(listings.map((l) => [l.id, l])), [listings]);
  const rows = useMemo(
    () =>
      Object.entries(cart)
        .map(([id, qty]) => ({ l: byId.get(id), qty }))
        .filter((r): r is { l: BasketListing; qty: number } => !!r.l),
    [cart, byId]
  );
  const count = rows.length;
  const total = rows.reduce((s, r) => s + (r.l.priceMinor ?? 0) * r.qty, 0);
  const currency = rows[0]?.l.currency ?? "IRR";

  const totalTx = moneyPartsIn(total, currency, currency, undefined, "fa");

  if (isOwn) return null; // کاتالوک خودت — سبد خرید ندارد

  const submit = async () => {
    if (status !== "authed" || !businesses[0]) {
      // گیت حساب مهمان (FD-13) — سبد در localStorage زنده می‌ماند
      show({ text: "برای ارسال سفارش، اول حساب بساز یا وارد شو — سبدت همین‌جا می‌ماند", kind: "info" });
      router.push("/login");
      return;
    }
    setBusy(true);
    try {
      const o = await ordersApi.createFromBasket({
        businessId: businesses[0].id,
        supplierId,
        items: rows.map((r) => ({ listingId: r.l.id, qty: r.qty })),
      });
      clearBasket(slug);
      setDone({ id: o.id, count: rows.length });
      void qc.invalidateQueries({ queryKey: ["orders"] });
    } catch (e) {
      show({ text: e instanceof Error ? e.message : "سفارش ثبت نشد", kind: "error" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      {/* نوار شناور سبد — فقط وقتی سبد پر است */}
      {count > 0 && !open && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 p-3 backdrop-blur-md lg:inset-x-4 lg:bottom-4 lg:mx-auto lg:max-w-[1112px] lg:rounded-2xl lg:border lg:shadow-[0_10px_40px_rgba(31,29,26,.12)]">
          <button
            type="button"
            onClick={() => {
              setDone(null);
              setOpen(true);
            }}
            className="flex w-full items-center gap-3 text-start"
          >
            <span className="relative grid size-11 shrink-0 place-items-center rounded-xl bg-arm-soft text-arm-strong">
              <Icon name="basket" size={20} />
              <span className="absolute -top-1 -end-1 grid size-5 place-items-center rounded-full bg-arm text-[10px] font-black text-white">
                {num(count, "fa")}
              </span>
            </span>
            <span className="min-w-0 flex-1">
              <b className="block text-[13.5px] font-bold text-text">
                سبد خرید — {num(count, "fa")} قلم
              </b>
              <small className="text-[11.5px] tabular-nums text-text-3">
                جمع: {totalTx.amount} {totalTx.label}
              </small>
            </span>
            <span className="flex shrink-0 items-center gap-1.5 rounded-xl bg-arm px-4 py-2.5 text-[12.5px] font-bold text-white">
              ثبت سفارش
              <Icon name="chev" size={14} className="rtl:-scale-x-100" />
            </span>
          </button>
        </div>
      )}

      {/* شیت سبد — منو از پایین (قانون همیشگی موبایل) */}
      <Sheet open={open} onClose={() => setOpen(false)} title="سبد خرید">
        <div className="flex flex-col gap-3 p-4 pt-0">
          {done ? (
            /* نمای موفقیت (FD-13) — دو دکمه‌ای */
            <div className="flex flex-col items-center gap-3 py-4 text-center">
              <span className="grid size-16 place-items-center rounded-full bg-green-soft text-green">
                <Icon name="check" size={30} />
              </span>
              <div>
                <b className="block text-[15px] font-black text-text">
                  سفارش {num(done.count, "fa")} قلم ثبت شد
                </b>
                <p className="mt-1 text-[12px] leading-5 text-text-3">
                  تأمین‌کننده خبردار شد — وضعیتش را در دفتر سفارش‌هایت پیگیری کن.
                </p>
              </div>
              <Button variant="arm" block onClick={() => router.push(`/buy/orders/${done.id}`)}>
                <Icon name="receipt" size={16} />
                پیگیری سفارش
              </Button>
              <Button variant="outline" block onClick={() => setOpen(false)}>
                ادامهٔ خرید
              </Button>
            </div>
          ) : rows.length === 0 ? (
            <div className="py-6 text-center">
              <p className="text-[13px] font-bold text-text">سبدت خالی است</p>
              <p className="mt-1 text-[11.5px] text-text-3">روی دکمهٔ + هر کالا، آن را به سبد بیاور.</p>
            </div>
          ) : (
            <>
              {rows.map(({ l, qty }) => (
                <CartRow key={l.id} slug={slug} listing={l} qty={qty} />
              ))}
              <div className="mt-1 flex items-center justify-between gap-3 rounded-xl bg-surface-2/70 px-3.5 py-2.5">
                <span className="text-[12px] font-bold text-text-3">جمع سبد</span>
                <b className="text-[15px] font-black tabular-nums text-text">
                  {totalTx.amount} <small className="text-[11px] font-bold text-text-3">{totalTx.label}</small>
                </b>
              </div>
              <Button variant="arm" block size="xl" loading={busy} onClick={() => void submit()}>
                <Icon name="check" size={17} />
                ثبت سفارش
              </Button>
              <p className="text-center text-[10.5px] leading-4 text-text-4">
                پرداخت و تحویل مستقیم با تأمین‌کننده هماهنگ می‌شود — آی‌مچ پولی جابه‌جا نمی‌کند.
              </p>
            </>
          )}
        </div>
      </Sheet>
    </>
  );
}

/* ─────────────────── ردیف سبد — استپر + عدد تایپی (FD-26) ─────────────────── */

function CartRow({ slug, listing: l, qty }: { slug: string; listing: BasketListing; qty: number }) {
  const { show } = useToast();
  const min = l.minOrder || 1;
  const price = moneyPartsIn(l.priceMinor ?? 0, l.currency ?? "IRR", l.currency ?? "IRR", undefined, "fa");

  const setQty = (n: number) => {
    if (!n || n < min) {
      show({ text: !n ? "تعداد را عدد وارد کن" : `حداقل سفارش همین مقدار است (${num(min, "fa")})`, kind: "error" });
      return;
    }
    setBasketQty(slug, l.id, n);
  };

  return (
    <div className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-3">
      <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-surface-2 text-[18px] font-black text-text-4/70">
        {l.name.slice(0, 1)}
      </span>
      <div className="min-w-0 flex-1">
        <b className="block truncate text-[13px] font-bold text-text">{l.name}</b>
        <small className="block truncate text-[11px] text-text-3">
          {l.pack ? `${l.pack} · ` : ""}
          <span className="tabular-nums">{price.amount} {price.label}</span>
        </small>
        {/* FD-26 — ورود عدد تایپی + استپر؛ اعتبارسنجی در خروج از فیلد */}
        <div className="mt-1.5 flex items-center gap-1.5">
          <button
            type="button"
            aria-label="کمتر"
            onClick={() => qty > min && setBasketQty(slug, l.id, qty - 1)}
            className="grid size-7 place-items-center rounded-lg border border-line bg-bg text-text-2 disabled:opacity-40"
            disabled={qty <= min}
          >
            <Icon name="x" size={13} className="rotate-45" />
          </button>
          <input
            type="tel"
            inputMode="numeric"
            defaultValue={String(qty)}
            key={`${l.id}-${qty}`}
            onBlur={(e) => {
              const n = parseInt(e.target.value.replace(/[^0-9]/g, ""), 10);
              if (!Number.isFinite(n) || n !== qty) setQty(Number.isFinite(n) ? n : 0);
            }}
            className="w-16 rounded-lg border border-line bg-bg px-2 py-1 text-center text-[12.5px] font-bold tabular-nums text-text outline-none focus:border-arm"
            aria-label={`تعداد ${l.name}`}
          />
          <button
            type="button"
            aria-label="بیشتر"
            onClick={() => setBasketQty(slug, l.id, qty + 1)}
            className="grid size-7 place-items-center rounded-lg border border-line bg-bg text-text-2"
          >
            <Icon name="plus" size={13} />
          </button>
          <button
            type="button"
            aria-label="حذف از سبد"
            onClick={() => removeFromBasket(slug, l.id)}
            className="ms-auto grid size-7 place-items-center rounded-lg text-text-4 transition-colors hover:bg-red-bg hover:text-red"
          >
            <Icon name="trash" size={14} />
          </button>
        </div>
      </div>
      <b className="shrink-0 text-[13px] font-black tabular-nums text-text">
        {moneyPartsIn((l.priceMinor ?? 0) * qty, l.currency ?? "IRR", l.currency ?? "IRR", undefined, "fa").amount}
      </b>
    </div>
  );
}
