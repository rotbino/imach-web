"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Icon } from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import { useToast } from "@/components/ui/toast";
import { useLocale } from "@/i18n/locale-context";
import { useAuthStore } from "@/lib/auth-store";
import { businessesApi, chatApi, marketApi, listingsApi, type BusinessContextDto } from "@/lib/api";
import { num } from "@/lib/format";
import { CURRENCIES } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * زمینهٔ بینندهٔ کاتالوگ عمومی (اسکرین ۳۱ · M6 · FD-10/13/23/25):
 *
 * · «ذخیره این کاتالوک» (مهمان/عضو) ⇒ followSupplier = شدن مشتری؛
 *   ثبت‌نام از دلِ نیاز (FD-10) — نه فرمان مستقیم.
 * · کارت مشتری برای ذخیره‌کرده‌ها (FD-13): هویت + نوع مشتری + پیوند به سبد.
 * · «در لیست خرید شما» (FD-23/25): محصولات این کاتالوک که در لیست خرید
 *   بیننده هست — بخش بالایی جدا؛ فقط مشتریِ ذخیره‌کرده.
 * · نوار «افزودن کالاها به لیست خرید من» + شیت ردیفی با جستجو.
 * · گیت قیمت (FD-13): اگر SSR قیمت‌ها را حذف کرده و بیننده واجد است،
 *   قیمت‌ها از getBusinessContext زنده برمی‌گردند؛ واجد نیست = CTA.
 * · نوار پایین: تماس · گفتگو (سبد خرید M5 جداگانه نشسته است).
 *
 * قانون مالک M2: فرم فارسی، متن‌ها همین‌جا (فریز i18n).
 */

export interface GuestListingRef {
  id: string;
  name: string;
  goodId: string;
}

export function CatalogGuestContext({
  slug,
  businessId,
  businessName,
  listings,
}: {
  slug: string;
  businessId: string;
  businessName: string;
  listings: GuestListingRef[];
}) {
  const router = useRouter();
  const qc = useQueryClient();
  const { show } = useToast();
  const { locale } = useLocale();
  const status = useAuthStore((s) => s.status);
  const businesses = useAuthStore((s) => s.businesses);
  const biz = businesses[0];
  const isOwn = status === "authed" && businesses.some((b) => b.slug === slug);

  const ctxQ = useQuery({
    queryKey: ["bizctx", slug],
    queryFn: () => businessesApi.getBusinessContext(slug),
    enabled: status === "authed" && !isOwn,
    staleTime: 30_000,
  });
  const ctx: BusinessContextDto | undefined = ctxQ.data;

  const [busy, setBusy] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [addSel, setAddSel] = useState<Record<string, boolean>>({});
  const [addQ, setAddQ] = useState("");
  const [addDone, setAddDone] = useState<number | null>(null);
  const [contact, setContact] = useState<{ phone: string | null; name: string } | null>(null);

  const inYourList = useMemo(() => {
    const ids = new Set((ctx?.inYourBuyList ?? []).map((m) => m.goodId));
    return listings.filter((l) => ids.has(l.goodId));
  }, [ctx, listings]);

  const saveCatalog = async () => {
    if (status !== "authed" || !biz) {
      show({ text: "برای ذخیرهٔ کاتالوک، اول حساب بساز یا وارد شو — همین‌جا برمی‌گردی", kind: "info" });
      router.push("/login");
      return;
    }
    setBusy(true);
    try {
      await marketApi.followSupplier(biz.id, businessId, { source: "SHARED" });
      show({ text: `کاتالوک ${businessName} ذخیره شد — از این پس مشتری او هستی و قیمت‌هایش را می‌بینی`, kind: "success" });
      void qc.invalidateQueries({ queryKey: ["bizctx", slug] });
      void qc.invalidateQueries({ queryKey: ["market", "followers", businessId] });
    } catch (e) {
      show({ text: e instanceof Error ? e.message : "ذخیره نشد", kind: "error" });
    } finally {
      setBusy(false);
    }
  };

  const dial = async () => {
    if (!contact) {
      try {
        const r = await businessesApi.getContact(slug);
        setContact(r);
        if (r.phone) window.open(`sms:${r.phone}`, "_blank", "noopener");
        else show({ text: "شماره‌ای ثبت نشده", kind: "info" });
      } catch {
        show({ text: "برای دیدن شمارهٔ تماس، عضو آی‌مچ شو", kind: "info" });
        router.push("/login");
      }
      return;
    }
    window.open(`sms:${contact.phone ?? ""}`, "_blank", "noopener");
  };

  const chat = async () => {
    if (status !== "authed" || !biz) {
      show({ text: "برای گفتگو با این فروشنده، اول وارد شو", kind: "info" });
      router.push("/login");
      return;
    }
    try {
      const r = await chatApi.startThread(biz.id, businessId);
      router.push(`/msgs?thread=${r.id}`);
    } catch {
      show({ text: "گفتگو باز نشد — دوباره تلاش کن", kind: "error" });
    }
  };

  const addPicked = async () => {
    if (!biz) return;
    const targets = listings.filter((l) => addSel[l.id]);
    if (!targets.length) return;
    setBusy(true);
    try {
      for (const t of targets) {
        await marketApi.watchGood(biz.id, t.goodId);
      }
      setAddDone(targets.length);
      setAddSel({});
    } catch (e) {
      show({ text: e instanceof Error ? e.message : "افزودن انجام نشد", kind: "error" });
    } finally {
      setBusy(false);
    }
  };

  if (isOwn) return null; // پیش‌نمایش فروشنده — ابزار مشتری ندارد

  const isCustomer = ctx?.isCustomer ?? false;
  const addFiltered = listings.filter((l) => !addQ.trim() || l.name.includes(addQ.trim()));
  const addSelCount = listings.filter((l) => addSel[l.id]).length;

  return (
    <>
      {/* ── دکمهٔ ذخیره (مهمان/عضوِ ذخیره‌نکرده) — کارت مشتری جایگزینش می‌شود ── */}
      {!isCustomer && (
        <button
          type="button"
          onClick={() => void saveCatalog()}
          disabled={busy}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-arm px-4 py-3.5 text-[13.5px] font-bold text-white transition-opacity hover:opacity-95 disabled:opacity-60"
        >
          <Icon name="bookmark" size={17} />
          {busy ? "در حال ذخیره…" : "ذخیره این کاتالوک"}
        </button>
      )}

      {/* ── کارت مشتری (FD-13): هویت + نوع + پیوند سبد ── */}
      {isCustomer && biz && (
        <button
          type="button"
          onClick={() => router.push(`/c/${slug}#basket`)}
          className="mt-3 flex w-full items-center gap-3 rounded-2xl border border-line bg-surface p-3.5 text-start transition-colors hover:border-line-2"
        >
          <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-arm-soft text-[16px] font-black text-arm-strong">
            {biz.name.slice(0, 1)}
          </span>
          <span className="min-w-0 flex-1">
            <b className="block truncate text-[13px] font-bold text-text">سبد خرید {biz.name}</b>
            <span className="block text-[11px] text-text-3">
              نوع مشتری: {custTypeT(ctx?.custType)} · با این فروشنده خرید می‌کنی
            </span>
          </span>
          <Icon name="chev" size={16} className="shrink-0 text-text-4 rtl:-scale-x-100" />
        </button>
      )}

      {/* ── «در لیست خرید شما» (FD-23/25) — فقط مشتری ── */}
      {isCustomer && inYourList.length > 0 && (
        <section className="mt-5">
          <h2 className="mb-2 flex items-center gap-1.5 text-[13.5px] font-bold text-text">
            <Icon name="basket" size={15} className="text-text-3" />
            در لیست خرید شما
            <span className="text-[11px] font-bold text-text-4">{num(inYourList.length, locale)} کالا</span>
          </h2>
          <div className="grid gap-2 [grid-template-columns:repeat(auto-fill,minmax(158px,1fr))]">
            {inYourList.map((l) => (
              <div key={l.id} className="rounded-2xl border border-green/40 bg-surface p-3">
                <b className="line-clamp-2 text-[12.5px] font-bold text-text">{l.name}</b>
                <p className="mt-1 text-[10.5px] font-bold text-green">در لیست خریدت هست</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── نوار افزودن به لیست خرید من (FD-25) — فقط مشتری ── */}
      {isCustomer && listings.length > 0 && (
        <button
          type="button"
          onClick={() => {
            setAddDone(null);
            setAddQ("");
            setAddSel({});
            setAddOpen(true);
          }}
          className="mt-3 flex w-full items-center gap-3 rounded-2xl border border-line bg-surface-2/60 px-4 py-3 text-start transition-colors hover:border-line-2"
        >
          <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-arm-soft text-arm-strong">
            <Icon name="basket" size={16} />
          </span>
          <b className="flex-1 text-[12.5px] font-bold text-text">افزودن کالاها به لیست خرید من</b>
          <Icon name="chev" size={15} className="text-text-4 rtl:-scale-x-100" />
        </button>
      )}

      {/* ── نوار پایین: تماس · گفتگو (سبد M5 جدا نشسته) ── */}
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-surface/95 backdrop-blur-md lg:inset-x-4 lg:bottom-4 lg:mx-auto lg:max-w-[1112px] lg:rounded-2xl lg:border lg:shadow-[0_10px_40px_rgba(31,29,26,.12)]">
        <div className="flex items-center gap-2 p-2.5">
          <button type="button" onClick={() => void dial()} className="flex flex-1 flex-col items-center gap-0.5 rounded-xl py-1.5 text-text-2">
            <Icon name="phone" size={18} />
            <span className="text-[10.5px] font-bold">تماس</span>
          </button>
          <button type="button" onClick={() => void chat()} className="flex flex-1 flex-col items-center gap-0.5 rounded-xl py-1.5 text-text-2">
            <Icon name="msg" size={18} />
            <span className="text-[10.5px] font-bold">گفتگو</span>
          </button>
        </div>
      </div>

      {/* شیت افزودن کالاها به لیست خرید */}
      <Sheet open={addOpen} onClose={() => setAddOpen(false)} title="افزودن کالاها به لیست خرید من">
        <div className="flex flex-col gap-3 p-4 pt-0">
          {addDone !== null ? (
            <div className="flex flex-col items-center gap-3 py-4 text-center">
              <span className="grid size-16 place-items-center rounded-full bg-green-soft text-green">
                <Icon name="check" size={30} />
              </span>
              <div>
                <b className="block text-[15px] font-black text-text">کالاها به لیست خریدت اضافه شد</b>
                <p className="mt-1 text-[12px] leading-5 text-text-3">
                  {num(addDone, locale)} کالا از کاتالوک {businessName} — در میز خرید آمادهٔ استعلام است.
                </p>
              </div>
              <Button variant="arm" block onClick={() => router.push("/buy-list")}>
                <Icon name="basket" size={16} />
                مشاهده لیست خرید در پنل آیمچ
              </Button>
              <Button variant="ghost" block onClick={() => setAddOpen(false)}>
                بستن
              </Button>
            </div>
          ) : (
            <>
              <div className="relative">
                <Icon name="search" size={15} className="pointer-events-none absolute start-3.5 top-1/2 -translate-y-1/2 text-text-4" />
                <input
                  value={addQ}
                  onChange={(e) => setAddQ(e.target.value)}
                  placeholder="جستجوی کالا…"
                  className="h-10 w-full rounded-xl border border-line bg-surface ps-9 pe-3 text-[13px] text-text placeholder:text-text-4 focus:border-arm focus:outline-none"
                />
              </div>
              <div className="flex max-h-[46dvh] flex-col gap-1.5 overflow-y-auto">
                {addFiltered.map((l) => (
                  <button
                    key={l.id}
                    type="button"
                    onClick={() => setAddSel((s) => ({ ...s, [l.id]: !s[l.id] }))}
                    className={cn(
                      "flex items-center gap-3 rounded-xl border px-3 py-2.5 text-start transition-colors",
                      addSel[l.id] ? "border-arm bg-arm-soft/30" : "border-line bg-surface"
                    )}
                  >
                    <span
                      className={cn(
                        "grid size-5 shrink-0 place-items-center rounded-md border",
                        addSel[l.id] ? "border-arm bg-arm text-white" : "border-line-2 text-transparent"
                      )}
                    >
                      <Icon name="check" size={12} />
                    </span>
                    <b className="min-w-0 flex-1 truncate text-[12.5px] text-text">{l.name}</b>
                  </button>
                ))}
              </div>
              <Button variant="outline" size="xl" disabled={addSelCount === 0} loading={busy} onClick={() => void addPicked()}>
                <Icon name="plus" size={16} />
                {addSelCount > 0 ? `افزودن ${num(addSelCount, locale)} کالا به لیست خرید` : "افزودن به لیست خرید"}
              </Button>
            </>
          )}
        </div>
      </Sheet>
    </>
  );
}

function custTypeT(t: string | null | undefined): string {
  if (t === "PARTNER") return "همکار";
  if (t === "CONTRACT") return "قراردادی";
  return "معمولی";
}


/* ─────────────── خانهٔ قیمت بیننده‌دار (FD-13 گیت قیمت) ───────────────
 * SSR مهمانِ کاتالوکِ گیت‌شده قیمت ندارد (سرور حذفش کرده). این خانهٔ کوچک:
 *   · کاتالوک باز → همان قیمت SSR (بدون جاوااسکریپت هم دیده می‌شود)
 *   · گیت‌شده + بینندهٔ واجد (مشتری/صنف/مالک) → قیمت از getBusinessContext
 *   · گیت‌شده + ناواجد → CTA «مشاهده قیمت» (مسیر حساب از دلِ نیاز — FD-10)
 */
export function CatalogPriceCell({
  slug,
  listingId,
  ssrPriceMinor,
  ssrCurrency,
  expired,
}: {
  slug: string;
  listingId: string;
  ssrPriceMinor: number | null;
  ssrCurrency: string | null;
  expired: boolean;
}) {
  const router = useRouter();
  const { locale } = useLocale();
  const status = useAuthStore((s) => s.status);
  const businesses = useAuthStore((s) => s.businesses);
  const isOwn = status === "authed" && businesses.some((b) => b.slug === slug);

  const ctxQ = useQuery({
    queryKey: ["bizctx", slug],
    queryFn: () => businessesApi.getBusinessContext(slug),
    enabled: status === "authed" && !isOwn && ssrPriceMinor === null,
    staleTime: 30_000,
  });
  const ctx = ctxQ.data;
  const live = ctx?.prices.find((p) => p.listingId === listingId);

  if (ssrPriceMinor !== null) {
    const cur = CURRENCIES[ssrCurrency ?? "IRR"] ?? { exp: 0, fa: ssrCurrency ?? "", en: "", ar: "" };
    const label = locale === "en" ? cur.en : locale === "ar" ? cur.ar || cur.en : cur.fa;
    return (
      <p className="mt-1">
        <b className={cn("text-[15px] font-black", expired ? "text-text-3" : "text-text")}>
          {num(ssrPriceMinor / 10 ** cur.exp, locale)} {label}
        </b>
      </p>
    );
  }

  if (live && live.priceMinor !== null) {
    const cur = CURRENCIES[live.currency ?? ssrCurrency ?? "IRR"] ?? { exp: 0, fa: live.currency ?? "", en: "", ar: "" };
    const label = locale === "en" ? cur.en : locale === "ar" ? cur.ar || cur.en : cur.fa;
    return (
      <p className="mt-1">
        <b className="text-[15px] font-black text-text">{num(live.priceMinor / 10 ** cur.exp, locale)} {label}</b>
      </p>
    );
  }

  return (
    <button
      type="button"
      onClick={() => {
        if (status === "authed") router.push(`/c/${slug}`);
        else router.push("/login");
      }}
      className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-amber-soft px-3.5 py-1.5 text-[11.5px] font-bold text-amber"
    >
      <Icon name="eye" size={13} />
      مشاهده قیمت
    </button>
  );
}
