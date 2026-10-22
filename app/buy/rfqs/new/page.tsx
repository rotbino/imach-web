"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AuthGate } from "@/components/imach/auth-gate";
import { AppShell } from "@/components/imach/app-shell";
import { Icon } from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { Input, Field, Textarea } from "@/components/ui/input";
import { Sheet } from "@/components/ui/sheet";
import { Spinner } from "@/components/ui/feedback";
import { useToast } from "@/components/ui/toast";
import { useAuthStore } from "@/lib/auth-store";
import { goodsApi, marketApi, type BoardSupplierDto, type GoodDto, type SellerDto } from "@/lib/api";
import { goodName, num, unitLabel } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * `/buy/rfqs/new` — اسکرین ۲۵: استعلام قیمت (خریدار · M4 · FD-24).
 *
 * · استعلام ذاتاً چندقلمی است: قلم پیش‌فرض از لیست خرید/پارامتر good +
 *   «افزودن کالای دیگر» از شیت انتخاب (لیست خرید من + جستجوی کالاهای مرجع)
 * · مقدار هر قلم با استپر ± و حذف ✕
 * · گیرندگان = اجتماع دارندگان قلم‌ها (از تابلوی تأمین هر قلم — سمت سرور
 *   کش‌شده): چندقلمی = تیک قفلِ روشن + بج پوشش «k از n قلم» + مرتب پوشش
 *   نزولی؛ تک‌قلمی = انتخابی (پیش‌فرض: تأییدشده‌ها روشن)
 * · مهلت پاسخ ۱..۵ روز (پیش‌فرض ۳) + شرایط خاص (یادداشت)
 * · شمارش زندهٔ دکمه: «ارسال استعلام n قلمی به k تأمین‌کننده»
 *
 * قانون مالک M2: فرم فارسی، متن‌ها همین‌جا (فریز i18n).
 */

interface BasketItem {
  goodId: string;
  qty: number;
  good: { id: string; nameFa: string; nameEn: string | null; unit: string };
}

export default function BuyRfqNewPage() {
  return (
    <AuthGate>
      <BuyRfqNew />
    </AuthGate>
  );
}

function BuyRfqNew() {
  const router = useRouter();
  const qc = useQueryClient();
  const { show } = useToast();
  const params = useSearchParams();
  const businesses = useAuthStore((s) => s.businesses);
  const bizId = businesses[0]?.id ?? "";

  /* ── سبد استعلام ── */
  const [items, setItems] = useState<BasketItem[]>([]);
  const [touched, setTouched] = useState(false);
  const [days, setDays] = useState(3);
  const [note, setNote] = useState("");
  const [pickOpen, setPickOpen] = useState(false);
  const [sel, setSel] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState(false);

  /* لیست خرید من — قلم پیش‌فرض + شیت انتخاب */
  const watchedQ = useQuery({
    queryKey: ["market", "watched", bizId],
    queryFn: () => marketApi.getWatchedGoods(bizId),
    enabled: !!bizId,
  });
  const watched = useMemo(
    () => (watchedQ.data ?? []).filter((w) => !w.archivedAt && w.good),
    [watchedQ.data]
  );

  /* قلم پیش‌فرض: پارامتر good= یا اولین ردیف لیست خرید — فقط تا اولین لمس کاربر
   * پارامتر خارج از لیست خرید (مثلاً از تابلوی تأمین کالا) → با getSupplyBoard
   * حل می‌شود (good + مقدار BUY خودم اگر هست) */
  const paramGood = params.get("good");
  const paramBoardQ = useQuery({
    queryKey: ["market", "board", bizId, paramGood],
    queryFn: () => marketApi.getSupplyBoard(bizId, paramGood!),
    enabled: !!bizId && !!paramGood && !touched && items.length === 0,
    staleTime: 60_000,
  });
  useEffect(() => {
    if (touched || items.length > 0) return;
    const fromParam = params.get("good");
    if (fromParam) {
      const w = watched.find((x) => x.goodId === fromParam);
      if (w?.good) {
        setItems([{ goodId: w.goodId, qty: w.volume ?? 1, good: w.good }]);
        return;
      }
      const b = paramBoardQ.data;
      if (b?.good) {
        setItems([{ goodId: b.good.id, qty: b.volume ?? 1, good: b.good }]);
      }
      return; // param خواسته شده — به watched[0] برنمی‌گردیم؛ منتظر بورد می‌مانیم
    }
    if (watched[0]?.good) {
      setItems([{ goodId: watched[0].goodId, qty: watched[0].volume ?? 1, good: watched[0].good! }]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchedQ.data, paramBoardQ.data, params]);

  const multi = items.length > 1;

  /* ── گیرندگان: اجتماع دارندگان قلم‌ها از تابلوی تأمین ── */
  const boardsKey = items.map((i) => i.goodId).sort().join(",");
  const recipientsQ = useQuery({
    queryKey: ["market", "rfq-recips", bizId, boardsKey],
    queryFn: async () => {
      const boards = await Promise.all(
        items.map((it) => marketApi.getSupplyBoard(bizId, it.goodId))
      );
      // sellerId → { seller, goods: Map goodId → cheapest row }
      const map = new Map<string, { seller: SellerDto; cover: Map<string, BoardSupplierDto> }>();
      boards.forEach((b, bi) => {
        for (const row of b.rows ?? []) {
          let e = map.get(row.seller.id);
          if (!e) {
            e = { seller: row.seller, cover: new Map() };
            map.set(row.seller.id, e);
          }
          if (!e.cover.has(items[bi].goodId)) e.cover.set(items[bi].goodId, row);
        }
      });
      return [...map.values()].map((e) => ({
        sellerId: e.seller.id,
        seller: e.seller,
        cover: e.cover.size,
        minPrice: Math.min(
          ...[...e.cover.values()].map((r) => r.priceMinor).filter((p) => Number.isFinite(p))
        ),
      }));
    },
    enabled: !!bizId && items.length > 0,
    staleTime: 60_000,
  });

  const recipients = useMemo(() => {
    const list = recipientsQ.data ?? [];
    // مرتب‌سازی: پوشش نزولی، بعد ارزان‌ترین صعودی (قاعدهٔ سرور هم همین است)
    return [...list].sort((a, b) => b.cover - a.cover || a.minPrice - b.minPrice);
  }, [recipientsQ.data]);

  /* انتخاب‌ها: چندقلمی = قفلِ روشن · تک‌قلمی = پیش‌فرض تأییدشده‌ها روشن */
  useEffect(() => {
    if (multi) return; // قفل — همه روشن
    setSel((prev) => {
      const next = { ...prev };
      for (const r of recipients) {
        if (next[r.sellerId] === undefined) next[r.sellerId] = !!r.seller.isVerified;
      }
      return next;
    });
  }, [recipients, multi]);

  const isOn = (sellerId: string): boolean => (multi ? true : !!sel[sellerId]);
  const onCount = recipients.filter((r) => isOn(r.sellerId)).length;

  /* ── استپر/حذف قلم ── */
  const step = (idx: number, dir: 1 | -1) => {
    setTouched(true);
    setItems((arr) => arr.map((it, i) => (i === idx ? { ...it, qty: Math.max(1, it.qty + dir) } : it)));
  };
  const removeItem = (idx: number) => {
    setTouched(true);
    setItems((arr) => arr.filter((_, i) => i !== idx));
  };

  /* ── شیت افزودن قلم ── */
  const [pickQ, setPickQ] = useState("");
  const [pickQuery, setPickQuery] = useState("");
  useEffect(() => {
    const id = setTimeout(() => setPickQuery(pickQ.trim()), 250);
    return () => clearTimeout(id);
  }, [pickQ]);
  const goodsQ = useQuery({
    queryKey: ["goods", "rfqpick", pickQuery],
    queryFn: () => goodsApi.getGoods({ q: pickQuery || undefined, limit: 25 }),
    enabled: pickOpen,
    staleTime: 60_000,
  });
  const inBasket = (goodId: string) => items.some((it) => it.goodId === goodId);
  const addItem = (it: BasketItem) => {
    if (inBasket(it.goodId)) return;
    setTouched(true);
    setItems((arr) => [...arr, it]);
  };

  /* ── ارسال ── */
  const send = async () => {
    if (!items.length) {
      show({ text: "حداقل یک کالا به استعلام اضافه کن", kind: "error" });
      return;
    }
    if (onCount === 0) {
      show({ text: "حداقل یک تأمین‌کننده باید این کالاها را داشته باشد", kind: "error" });
      return;
    }
    setBusy(true);
    try {
      const r = await marketApi.requestQuote({
        businessId: bizId,
        items: items.map((it) => ({ goodId: it.goodId, qty: it.qty })),
        expiresDays: days,
        ...(note.trim() ? { note: note.trim() } : {}),
      });
      show({ text: `استعلام ${num(items.length, "fa")} قلمی برای ${num(r.created, "fa")} تأمین‌کننده ارسال شد`, kind: "success" });
      await qc.invalidateQueries({ queryKey: ["market", "myrfqs", bizId] });
      router.replace(`/buy/rfqs/${r.groupId}`);
    } catch (e) {
      show({ text: e instanceof Error ? e.message : "ارسال نشد — دوباره تلاش کن", kind: "error" });
    } finally {
      setBusy(false);
    }
  };

  const nameOf = (g: { nameFa: string; nameEn: string | null }) => goodName(g, "fa");

  return (
    <AppShell arm="buy" title="استعلام قیمت" back="/buy/rfqs" wide>
      <div className="flex flex-col gap-5">
        {/* ═══ کالاهای استعلام — چندقلمی (FD-24) ═══ */}
        <section className="flex flex-col gap-2.5">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-[13px] font-black text-text-2">کالاهای استعلام</h2>
            <span className="text-[11.5px] font-bold text-text-3">{num(items.length, "fa")} قلم</span>
          </div>

          {items.map((it, i) => (
            <div
              key={it.goodId}
              className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-3.5"
            >
              <span className="grid size-[52px] shrink-0 place-items-center rounded-xl bg-surface-2 text-[22px] font-black text-text-4/70">
                {nameOf(it.good).slice(0, 1)}
              </span>
              <div className="min-w-0 flex-1">
                <b className="block truncate text-[14px] font-bold text-text">{nameOf(it.good)}</b>
                <small className="text-[11px] text-text-3">
                  {it.good.unit ? unitLabel(it.good.unit, "fa") : "واحد"}
                </small>
              </div>
              {/* استپر مقدار */}
              <div className="flex shrink-0 items-center gap-1 rounded-full border border-line bg-surface p-1">
                <button
                  type="button"
                  aria-label="کمتر"
                  onClick={() => step(i, -1)}
                  className="grid size-8 place-items-center rounded-full text-text-2 transition-colors hover:bg-surface-2"
                >
                  <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round">
                    <path d="M5 12h14" />
                  </svg>
                </button>
                <span className="min-w-10 text-center text-[14px] font-black tabular-nums text-text">
                  {num(it.qty, "fa")}
                </span>
                <button
                  type="button"
                  aria-label="بیشتر"
                  onClick={() => step(i, 1)}
                  className="grid size-8 place-items-center rounded-full text-text-2 transition-colors hover:bg-surface-2"
                >
                  <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round">
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                </button>
              </div>
              <button
                type="button"
                aria-label={`حذف ${nameOf(it.good)}`}
                onClick={() => removeItem(i)}
                className="grid size-8 shrink-0 place-items-center rounded-full text-text-3 transition-colors hover:bg-red-bg hover:text-red"
              >
                <Icon name="x" size={16} />
              </button>
            </div>
          ))}

          <button
            type="button"
            onClick={() => setPickOpen(true)}
            className="flex items-center justify-center gap-2 rounded-2xl border-[1.5px] border-dashed border-line-2 bg-surface-2/40 p-3.5 text-[13px] font-bold text-text-2 transition-colors hover:border-primary hover:bg-primary-soft/50 hover:text-primary-strong"
          >
            <Icon name="plus" size={17} />
            {items.length ? "افزودن کالای دیگر" : "افزودن کالا"}
          </button>
        </section>

        {/* مهلت پاسخ — pills ۱..۵ پیش‌فرض ۳ (پروتوتایپ ۲۵) */}
        <Field label="مهلت پاسخ" hint="فروشنده تا این مدت فرصت دارد قیمتش را بفرستد">
          {(id) => (
            <div id={id} className="flex gap-2">
              {[1, 2, 3, 4, 5].map((d) => {
                const active = days === d;
                return (
                  <button
                    key={d}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setDays(d)}
                    className={cn(
                      "min-w-0 flex-1 rounded-xl border-[1.5px] px-1 py-2.5 text-[12px] font-bold transition-colors active:scale-[.97]",
                      active
                        ? "border-primary bg-primary-soft text-primary-strong"
                        : "border-line bg-surface text-text-2 hover:border-line-2"
                    )}
                  >
                    {num(d, "fa")} روز
                  </button>
                );
              })}
            </div>
          )}
        </Field>

        {/* شرایط خاص */}
        <Field label="شرایط خاص یا قیمت سفارشی" hint="اختیاری — شرایط پرداخت یا تخفیف حجم بالا">
          {() => (
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              placeholder="اگر شرایط پرداخت خاصی داری، یا برای حجم بالا تخفیف می‌خواهی، اینجا بنویس…"
            />
          )}
        </Field>

        {/* ═══ گیرندگان — اجتماع دارندگان قلم‌ها (FD-24) ═══ */}
        <section className="flex flex-col gap-2.5">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-[13px] font-black text-text-2">ارسال به چه کسانی؟</h2>
            <span className="text-[11.5px] font-bold text-text-3">
              {recipients.length
                ? multi
                  ? `هر که ${num(items.length, "fa")} کالایی که دارد`
                  : `${num(recipients.length, "fa")} تأمین‌کنندهٔ این کالا`
                : ""}
            </span>
          </div>

          {/* نوت قفل — فقط چندقلمی */}
          {multi && (
            <div className="flex items-start gap-2 rounded-xl bg-blue-soft/60 p-3 text-[11.5px] leading-5 text-text-2">
              <Icon name="info" size={15} className="mt-0.5 shrink-0 text-blue" />
              <span>
                استعلام چندقلمی به هر تأمین‌کننده‌ای می‌رسد که حداقل یکی از قلم‌ها را دارد — برای
                همین انتخاب‌ها قفل‌اند و پوششِ هر کدام نوشته شده است.
              </span>
            </div>
          )}

          {recipientsQ.isLoading && items.length > 0 && (
            <div className="grid place-items-center py-8">
              <Spinner />
            </div>
          )}

          {!recipientsQ.isLoading && items.length > 0 && recipients.length === 0 && (
            <div className="rounded-2xl border border-line bg-surface p-5 text-center">
              <b className="text-[13.5px] font-bold text-text">تأمین‌کننده‌ای با این کالاها نداری</b>
              <p className="mt-1 text-[11.5px] leading-5 text-text-3">
                کاتالوگ تأمین‌کننده‌ها را ذخیره کن تا در استعلام ببینند.
              </p>
            </div>
          )}

          <div className="flex flex-col gap-2">
            {recipients.map((r) => {
              const on = isOn(r.sellerId);
              const full = r.cover >= items.length;
              return (
                <button
                  key={r.sellerId}
                  type="button"
                  disabled={multi}
                  aria-pressed={on}
                  onClick={() => !multi && setSel((s) => ({ ...s, [r.sellerId]: !on }))}
                  className={cn(
                    "flex items-center gap-3 rounded-2xl border bg-surface p-3.5 text-start transition-colors",
                    multi ? "cursor-default border-line opacity-95" : "border-line hover:border-line-2"
                  )}
                >
                  <span className="grid size-11 shrink-0 place-items-center rounded-full bg-primary-soft text-[16px] font-black text-primary-strong">
                    {r.seller.name.slice(0, 1)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-1.5">
                      <b className="truncate text-[13.5px] font-bold text-text">{r.seller.name}</b>
                      {r.seller.isVerified && <Icon name="verified" size={13} className="text-blue" />}
                      {multi &&
                        (full ? (
                          <span className="rounded-full bg-green-soft px-2 py-0.5 text-[10px] font-bold text-green">
                            همهٔ {num(items.length, "fa")} قلم
                          </span>
                        ) : (
                          <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[10px] font-bold text-text-3">
                            {num(r.cover, "fa")} از {num(items.length, "fa")} قلم
                          </span>
                        ))}
                    </span>
                    <small className="mt-0.5 block truncate text-[11px] text-text-3">
                      {r.seller.city ?? "—"} · آخرین قیمت {num(Math.round(r.minPrice / 10), "fa")} تومان
                    </small>
                  </span>
                  {/* چک‌باکس — چندقلمی قفلِ روشن */}
                  <span
                    className={cn(
                      "grid size-6 shrink-0 place-items-center rounded-md border-[1.5px] transition-colors",
                      on ? "border-primary bg-primary text-white" : "border-line-2 bg-surface"
                    )}
                  >
                    {on && (
                      <svg viewBox="0 0 24 24" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round">
                        <path d="M4.5 12.5l5 5 10-11" />
                      </svg>
                    )}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="flex items-start gap-2 rounded-xl bg-surface-2/60 p-3 text-[11.5px] leading-5 text-text-3">
            <Icon name="info" size={15} className="mt-0.5 shrink-0" />
            <span>
              استعلام به‌خودی‌خود سفارش نیست؛ هر تأمین‌کننده برای قلم‌هایی که دارد قیمت می‌فرستد و تو
              یک‌جا مقایسه می‌کنی.
            </span>
          </div>
        </section>
      </div>

      {/* شمارش زندهٔ دکمهٔ ارسال (FD-14/24) */}
      <div className="sticky inset-x-0 bottom-0 z-20 -mx-4 border-t border-line bg-bg/95 p-4 backdrop-blur-sm mt-2">
        <div className="mx-auto max-w-3xl">
          <Button
            variant="arm"
            size="xl"
            block
            loading={busy}
            disabled={!items.length || onCount === 0}
            onClick={() => void send()}
          >
            {items.length
              ? `ارسال استعلام ${num(items.length, "fa")} قلمی به ${num(onCount, "fa")} تأمین‌کننده`
              : "اول کالای استعلام را انتخاب کن"}
          </Button>
        </div>
      </div>

      {/* ═══ شیت: افزودن کالا به استعلام (sheet-rfqpick) ═══ */}
      <Sheet open={pickOpen} onClose={() => setPickOpen(false)} title="افزودن کالا به استعلام">
        <div className="flex flex-col gap-3 p-4 pt-0">
          <p className="text-[11.5px] leading-5 text-text-3">
            قلم‌های استعلام از لیست خریدت انتخاب می‌شوند — قیمت چند کالا را یک‌جا بگیر.
          </p>
          <Input
            value={pickQ}
            onChange={(e) => setPickQ(e.target.value)}
            placeholder="جستجوی کالا…"
          />

          {!pickQuery && watched.length > 0 && (
            <div className="text-[11px] font-black text-text-4">در لیست خرید من</div>
          )}
          {!pickQuery &&
            watched.map((w) => {
              const inq = inBasket(w.goodId);
              return (
                <button
                  key={w.goodId}
                  type="button"
                  disabled={inq}
                  onClick={() =>
                    w.good &&
                    addItem({ goodId: w.goodId, qty: w.volume ?? 1, good: w.good! }) === undefined
                  }
                  className={cn(
                    "flex items-center gap-3 rounded-xl border p-3 text-start transition-colors",
                    inq ? "border-primary/40 bg-primary-soft/40" : "border-line hover:border-line-2"
                  )}
                >
                  <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-surface-2 text-[18px] font-black text-text-4/70">
                    {w.good ? nameOf(w.good).slice(0, 1) : "؟"}
                  </span>
                  <span className="min-w-0 flex-1">
                    <b className="block truncate text-[13px] font-bold text-text">
                      {w.good ? nameOf(w.good) : "—"}
                    </b>
                    <small className="text-[10.5px] text-text-3">
                      {w.volume != null ? `مقدار پیش‌فرض ${num(w.volume, "fa")}` : "بدون مقدار ثبت‌شده"}
                      {w.supplierCount > 0 && ` · ${num(w.supplierCount, "fa")} تأمین‌کننده`}
                    </small>
                  </span>
                  {inq ? (
                    <span className="rounded-full bg-green-soft px-2 py-0.5 text-[10px] font-bold text-green">
                      در استعلام
                    </span>
                  ) : (
                    <Icon name="plus" size={17} className="shrink-0 text-text-3" />
                  )}
                </button>
              );
            })}

          <div className="text-[11px] font-black text-text-4">
            {pickQuery ? "نتیجهٔ جستجو" : "همهٔ کالاهای مرجع"}
          </div>
          {goodsQ.isLoading && (
            <div className="grid place-items-center py-6">
              <Spinner />
            </div>
          )}
          {((goodsQ.data?.items ?? []) as GoodDto[]).map((g) => {
            const inq = inBasket(g.id);
            return (
              <button
                key={g.id}
                type="button"
                disabled={inq}
                onClick={() => addItem({ goodId: g.id, qty: 1, good: g })}
                className={cn(
                  "flex items-center gap-3 rounded-xl border p-3 text-start transition-colors",
                  inq ? "border-primary/40 bg-primary-soft/40" : "border-line hover:border-line-2"
                )}
              >
                <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-surface-2 text-[18px] font-black text-text-4/70">
                  {nameOf(g).slice(0, 1)}
                </span>
                <span className="min-w-0 flex-1">
                  <b className="block truncate text-[13px] font-bold text-text">{nameOf(g)}</b>
                  <small className="text-[10.5px] text-text-3">
                    {g.unit ? unitLabel(g.unit, "fa") : ""}
                  </small>
                </span>
                {inq ? (
                  <span className="rounded-full bg-green-soft px-2 py-0.5 text-[10px] font-bold text-green">
                    در استعلام
                  </span>
                ) : (
                  <Icon name="plus" size={17} className="shrink-0 text-text-3" />
                )}
              </button>
            );
          })}

          <Button variant="outline" block onClick={() => setPickOpen(false)}>
            <Icon name="check" size={16} />
            تأیید و بازگشت به استعلام
          </Button>
        </div>
      </Sheet>
    </AppShell>
  );
}
