"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Icon } from "@/components/ui/icon";
import { Sheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { useLocale } from "@/i18n/locale-context";
import { useAuthStore } from "@/lib/auth-store";
import {
  businessesApi,
  chatApi,
  listingsApi,
  marketApi,
  supplyProposalsApi,
  type PublicBuyListDto,
} from "@/lib/api";
import { goodName, num, unitLabel } from "@/lib/format";
import { moneyPartsIn } from "@/lib/currency";
import { cn } from "@/lib/utils";

/**
 * نمای عمومی لیست خرید (اسکرین ۳۲ · M6 · FD-16/19/22/23/25/26):
 *
 * · دو لیست: «کالاهای در حال استعلام» (نوار افقی زنده از گروه‌های RFQ باز)
 *   + «کالاهای موردنیاز» (ردیف‌ها؛ مچ‌شده‌های کاتالوک خودم بالاتر + آیکون
 *   i-textlist بعد از عنوان — حکم مالک FD-25).
 * · نوار پایین: تماس · گفتگو · «پیشنهاد تامین» نارنجیِ کامل (تنها primary).
 * · شیت پیشنهاد سه‌حالته (FD-23): هر قلم قیمت+حداقل · مچ‌های «از کاتالوک
 *   تو» pre-fill قابل ویرایش · صفر قلم = «ارسال درخواست تامین‌کنندگی» ·
 *   نمای موفقیت دو-دکمه‌ای (مشاهده کاتالوک / بستن).
 * · گارد ۷روزه: پیشنهادِ بازِ من روی این خریدار = توضیح به‌جای فرم.
 * · شیت «افزودن کالاهای این لیست به لیست خرید من» (ضدتکرار + نمای موفقیت).
 * · «شرایط تامین» خریدار — شیت ساده از supplyTerms («·» جدا شده، ردیف تیک‌دار).
 *
 * قانون مالک M2: فرم فارسی، متن‌ها همین‌جا (فریز i18n).
 */

type ProposeItem = {
  goodId: string;
  name: string;
  pack: string | null;
  volume: number | null;
  frequency: string | null;
  selected: boolean;
  price: string;
  min: string;
  matched: { listingId: string; pack: string | null; priceMinor: number | null; minOrder: number | null; currency: string | null; exact: boolean } | null;
  inMyList: boolean;
};

export function BuyListGuestView({ slug, initial }: { slug: string; initial: PublicBuyListDto | null }) {
  const router = useRouter();
  const qc = useQueryClient();
  const { show } = useToast();
  const { locale } = useLocale();
  const status = useAuthStore((s) => s.status);
  const businesses = useAuthStore((s) => s.businesses);
  const biz = businesses[0];

  // دادهٔ تازهٔ بیننده‌دار — مهمان همان initial را می‌بیند (viewer=null)
  const listQ = useQuery({
    queryKey: ["buylist", slug],
    queryFn: () => businessesApi.getBuyList(slug),
    enabled: status !== "booting",
    // SSR مهمان (بدون توکن) فقط HTML اولیه است؛ داده‌اش همیشه «کهنه»
    // تلقی می‌شود تا بینندهٔ واردشده بلافاصله زمینهٔ خودش (viewer) را
    // بگیرد — ناوبری کلاینت‌ساید هم refetch می‌زند (باگ ۳۰ثانیهٔ staleTime).
    initialData: initial ?? undefined,
    initialDataUpdatedAt: initial ? 0 : undefined,
    staleTime: 30_000,
  });
  const data = listQ.data;

  const [proposeOpen, setProposeOpen] = useState(false);
  const [condOpen, setCondOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [contact, setContact] = useState<{ phone: string | null; name: string } | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState<{ itemCount: number; catalogAdded: number } | null>(null);
  const [items, setItems] = useState<ProposeItem[]>([]);
  const [addSel, setAddSel] = useState<Record<string, boolean>>({});
  const [addQ, setAddQ] = useState("");
  const [addDone, setAddDone] = useState<number | null>(null);

  const viewer = data?.viewer ?? null;
  const isOwner = viewer?.isOwner ?? false;
  const matchByGood = useMemo(() => {
    const m = new Map<string, NonNullable<ProposeItem["matched"]>>();
    for (const x of viewer?.matched ?? []) m.set(x.goodId, x);
    return m;
  }, [viewer]);
  const inMyListSet = useMemo(() => new Set(viewer?.inMyBuyList ?? []), [viewer]);

  /* کالاهای موردنیاز — مچ‌شده‌ها بالاتر (FD-25) */
  const needed = useMemo(() => {
    const rows = data?.needed ?? [];
    return [...rows].sort((a, b) => {
      const ma = matchByGood.has(a.goodId) ? 1 : 0;
      const mb = matchByGood.has(b.goodId) ? 1 : 0;
      return mb - ma;
    });
  }, [data, matchByGood]);

  const openPropose = (preGoodId?: string) => {
    if (!data) return;
    if (status !== "authed") {
      show({ text: "برای پیشنهاد تامین، اول حساب بساز یا وارد شو", kind: "info" });
      router.push("/login");
      return;
    }
    if (isOwner) {
      show({ text: "این لیست خرید خودت است — پیشنهاد به خودت نمی‌دهی", kind: "info" });
      return;
    }
    setSent(null);
    setNote("");
    setItems(
      (data.needed ?? []).map((n) => {
        const m = matchByGood.get(n.goodId) ?? null;
        return {
          goodId: n.goodId,
          name: goodName({ nameFa: n.name, nameEn: n.nameEn }, locale),
          pack: n.pack,
          volume: n.volume,
          frequency: n.frequency,
          selected: preGoodId === n.goodId,
          price: m?.priceMinor ? String(Math.round(m.priceMinor / 10)) : "",
          min: m?.minOrder ? String(m.minOrder) : "",
          matched: m,
          inMyList: inMyListSet.has(n.goodId),
        };
      })
    );
    setProposeOpen(true);
  };

  /* ارسال پیشنهاد — اعتبارسنجی همان شیت (ناقص = دکمه خاموش) */
  const picked = () => items.filter((i) => i.selected);
  const missing = () => picked().filter((i) => !parseNum(i.price) || !parseNum(i.min)).length;

  const send = async () => {
    if (!biz) return;
    const miss = missing();
    if (miss > 0) {
      show({ text: `قیمت و حداقل ${num(miss, locale)} کالا را وارد کن`, kind: "error" });
      return;
    }
    setBusy(true);
    try {
      const r = await supplyProposalsApi.send({
        businessId: biz.id,
        buyerSlug: slug,
        items: picked().map((i) => ({
          goodId: i.goodId,
          priceMinor: parseNum(i.price) * 10,
          minOrder: parseNum(i.min) || 1,
        })),
        note: note.trim() || undefined,
      });
      setSent({ itemCount: r.itemCount, catalogAdded: r.catalogAdded });
      void qc.invalidateQueries({ queryKey: ["buylist", slug] });
    } catch (e) {
      show({ text: e instanceof Error ? e.message : "پیشنهاد ارسال نشد", kind: "error" });
    } finally {
      setBusy(false);
    }
  };

  const dial = async () => {
    if (!data) return;
    if (!contact) {
      try {
        const r = await businessesApi.getContact(slug);
        setContact(r);
        if (r.phone) window.open(`sms:${r.phone}`, "_blank", "noopener");
        else show({ text: "شماره‌ای ثبت نشده", kind: "info" });
      } catch {
        show({ text: "برای دیدن شماره، عضو آی‌مچ شو", kind: "info" });
        router.push("/login");
      }
      return;
    }
    window.open(`sms:${contact.phone ?? ""}`, "_blank", "noopener");
  };

  const chat = async () => {
    if (status !== "authed" || !biz || !data) {
      show({ text: "برای گفتگو با این خریدار، اول وارد شو", kind: "info" });
      router.push("/login");
      return;
    }
    try {
      const r = await chatApi.startThread(biz.id, data.business.id);
      router.push(`/msgs?thread=${r.id}`);
    } catch {
      show({ text: "گفتگو باز نشد — دوباره تلاش کن", kind: "error" });
    }
  };

  /* افزودن کالاهای لیست او به لیست خرید من — watchGood (+ BUY listing با حجم/دوره) */
  const addPicked = async () => {
    if (!biz) return;
    const targets = (data?.needed ?? []).filter((n) => addSel[n.goodId] && !inMyListSet.has(n.goodId));
    if (!targets.length) return;
    setBusy(true);
    try {
      for (const t of targets) {
        await marketApi.watchGood(biz.id, t.goodId);
        if (t.volume) {
          /* حجم/دورهٔ خریدار همان‌جا منتقل می‌شود (الگوی buy-list/new — یک تپ) */
          await listingsApi
            .saveListing({
              businessId: biz.id,
              goodId: t.goodId,
              mode: "BUY",
              buy: { volume: t.volume, frequency: t.frequency ?? "OCCASIONAL" },
            })
            .catch(() => undefined);
        }
      }
      setAddDone(targets.length);
      setAddSel({});
      void qc.invalidateQueries({ queryKey: ["buylist", slug] });
      void qc.invalidateQueries({ queryKey: ["market", "watched", biz.id] });
    } catch (e) {
      show({ text: e instanceof Error ? e.message : "افزودن انجام نشد", kind: "error" });
    } finally {
      setBusy(false);
    }
  };

  if (!data) {
    return (
      <div className="grid place-items-center py-24">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-line-2 border-t-arm" />
      </div>
    );
  }

  const B = data.business;
  const canAddToList = !!viewer && !isOwner && needed.some((n) => !inMyListSet.has(n.goodId));
  const addFiltered = needed.filter((n) => !addQ.trim() || goodName({ nameFa: n.name, nameEn: n.nameEn }, locale).includes(addQ.trim()));
  const addSelCount = (data.needed ?? []).filter((n) => addSel[n.goodId] && !inMyListSet.has(n.goodId)).length;

  return (
    <div className="min-h-dvh bg-bg" data-arm="keep">
      {/* هدر */}
      <header className="sticky top-0 z-10 border-b border-line bg-surface/95 px-4 py-3 backdrop-blur lg:px-8">
        <div className="mx-auto flex max-w-[760px] items-center gap-3">
          <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-arm-soft text-[16px] font-black text-arm-strong">
            {B.name.slice(0, 1)}
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="flex items-center gap-1.5 truncate text-[16px] font-black text-text">
              {B.name}
              {B.isVerified && <Icon name="verified" size={14} className="text-primary" />}
            </h1>
            <p className="truncate text-[11.5px] text-text-3">
              {B.ownerName ? `${B.ownerName} · ` : ""}
              {B.trade ? `${B.trade} · ` : ""}
              {B.city} · خریدار عمده
            </p>
          </div>
          {status !== "authed" && (
            <button
              type="button"
              onClick={() => router.push("/login")}
              className="shrink-0 rounded-full border border-line bg-surface px-3.5 py-1.5 text-[11.5px] font-bold text-text-2"
            >
              ورود
            </button>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-[760px] px-4 pb-28 pt-4 lg:px-8">
        {/* آمار */}
        <div className="flex items-center rounded-2xl border border-line bg-surface px-4 py-3">
          {[
            { v: data.stats.goods, l: "کالا" },
            { v: data.stats.suppliers, l: "تأمین‌کننده" },
            { v: data.stats.views, l: "بازدید" },
          ].map((s, i) => (
            <div key={s.l} className={cn("flex-1 text-center", i === 1 && "border-x border-line")}>
              <b className="block text-[15px] font-black text-text">{num(s.v, locale)}</b>
              <span className="text-[10.5px] text-text-3">{s.l}</span>
            </div>
          ))}
        </div>

        {/* افزودن کالاهای این لیست به لیست خرید من (FD-23/25) */}
        {canAddToList && (
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
              <Icon name="plus" size={16} />
            </span>
            <b className="flex-1 text-[12.5px] font-bold text-text">افزودن کالاهای این لیست به لیست خرید من</b>
            <Icon name="chev" size={15} className="text-text-4 rtl:-scale-x-100" />
          </button>
        )}

        {/* کالاهای در حال استعلام (FD-22) */}
        {data.inquiring.length > 0 && (
          <section className="mt-5">
            <h2 className="mb-2 flex items-center gap-1.5 text-[13.5px] font-bold text-text">
              <Icon name="inbox" size={15} className="text-text-3" />
              کالاهای در حال استعلام
              <span className="rounded-full bg-amber-soft px-2 py-0.5 text-[10px] font-bold text-amber">
                {num(data.inquiring.length, locale)} قیمت‌گیری جاری
              </span>
            </h2>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {data.inquiring.map((g) => (
                <button
                  key={g.groupId}
                  type="button"
                  onClick={() => openPropose(g.itemNames[0] ? undefined : undefined)}
                  className="flex w-[168px] shrink-0 flex-col gap-1 rounded-2xl border border-line bg-surface p-3 text-start"
                >
                  <b className="line-clamp-1 text-[12.5px] text-text">{g.title}</b>
                  <span className="text-[11px] text-text-3">{num(g.offerCount, locale)} پیشنهاد رسیده</span>
                  <span className={cn("mt-auto self-start rounded-full px-2 py-0.5 text-[10px] font-bold", g.daysLeft === 0 ? "bg-red-bg text-red" : "bg-amber-soft text-amber")}>
                    {g.daysLeft === null ? "بدون مهلت" : g.daysLeft === 0 ? "آخرین روز" : `${num(g.daysLeft, locale)} روز`}
                  </span>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* کالاهای موردنیاز */}
        <section className="mt-5">
          <h2 className="mb-2 flex items-center gap-1.5 text-[13.5px] font-bold text-text">
            <Icon name="basket" size={15} className="text-text-3" />
            کالاهای موردنیاز
            <span className="text-[11px] font-bold text-text-4">{num(needed.length, locale)} کالا</span>
          </h2>
          {needed.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-line-2 bg-surface px-4 py-8 text-center text-[12.5px] text-text-3">
              این لیست خرید هنوز کالایی ندارد
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {needed.map((n) => {
                const m = matchByGood.get(n.goodId) ?? null;
                const name = goodName({ nameFa: n.name, nameEn: n.nameEn }, locale);
                return (
                  <div
                    key={n.goodId}
                    className={cn("flex items-center gap-3 rounded-2xl border bg-surface p-3.5", m ? "border-green/40" : "border-line")}
                  >
                    <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-surface-2 text-[16px] font-black text-text-4/70">
                      {name.slice(0, 1)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-1.5">
                        <b className="truncate text-[13.5px] font-bold text-text">{name}</b>
                        {m && (
                          <span title="در کاتالوک تو" aria-label="در کاتالوک تو" className="shrink-0 text-green">
                            <Icon name="textlist" size={13} />
                          </span>
                        )}
                      </p>
                      <p className="mt-0.5 truncate text-[11.5px] text-text-3">
                        {n.pack ? `${n.pack} · ` : ""}
                        {n.volume ? `${num(n.volume, locale)} ${unitLabel(n.unit, locale)} در ماه · ` : ""}
                        {freqT(n.frequency)}
                      </p>
                    </div>
                    {!isOwner && (
                      <Button variant="outline" size="sm" className="shrink-0" onClick={() => openPropose(n.goodId)}>
                        <Icon name="send" size={13} />
                        پیشنهاد
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <p className="mt-6 text-center text-[10.5px] leading-5 text-text-4">
          ساخته‌شده با <b className="text-arm-strong">آی‌مچ</b> — دفتر خرید و فروش عمدهٔ شما
        </p>
      </main>

      {/* نوار پایین (FD-22/26): تماس · گفتگو · پیشنهاد تامین نارنجیِ کامل */}
      {!isOwner && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 backdrop-blur-md lg:inset-x-4 lg:bottom-4 lg:mx-auto lg:max-w-[744px] lg:rounded-2xl lg:border lg:shadow-[0_10px_40px_rgba(31,29,26,.12)]">
          <div className="flex items-center gap-2 p-2.5">
            <button type="button" onClick={() => void dial()} className="flex flex-1 flex-col items-center gap-0.5 rounded-xl py-1.5 text-text-2">
              <Icon name="phone" size={18} />
              <span className="text-[10.5px] font-bold">تماس</span>
            </button>
            <button type="button" onClick={() => void chat()} className="flex flex-1 flex-col items-center gap-0.5 rounded-xl py-1.5 text-text-2">
              <Icon name="msg" size={18} />
              <span className="text-[10.5px] font-bold">گفتگو</span>
            </button>
            <Button variant="arm" size="lg" className="flex-[2]" onClick={() => openPropose()}>
              <Icon name="send" size={16} />
              پیشنهاد تامین
            </Button>
          </div>
        </div>
      )}

      {/* شیت پیشنهاد تامین (FD-23) */}
      <Sheet
        open={proposeOpen}
        onClose={() => setProposeOpen(false)}
        title={sent ? undefined : "پیشنهاد تامین"}
        maxHeightClass="max-h-[88dvh]"
      >
        <div className="flex flex-col gap-3 p-4 pt-0">
          {viewer?.myOpenProposal ? (
            /* گارد ۷روزه — پیشنهاد باز دارم */
            <div className="flex flex-col items-center gap-2 py-6 text-center">
              <span className="grid size-14 place-items-center rounded-full bg-amber-soft text-amber">
                <Icon name="clock" size={26} />
              </span>
              <b className="text-[14.5px] font-black text-text">پیشنهاد بازِ تو هنوز پیش این خریدار است</b>
              <p className="max-w-[300px] text-[12px] leading-5 text-text-3">
                نتیجه را صبر کن — خریدار پیشنهادت را بالای لیست خریدش می‌بیند و با تاییدش جزو تأمین‌کننده‌هایش می‌شوی.
              </p>
              <Button variant="outline" block onClick={() => setProposeOpen(false)}>
                باشه
              </Button>
            </div>
          ) : sent ? (
            /* نمای موفقیت (FD-26) */
            <div className="flex flex-col items-center gap-3 py-4 text-center">
              <span className="grid size-16 place-items-center rounded-full bg-green-soft text-green">
                <Icon name="check" size={30} />
              </span>
              <div>
                <b className="block text-[15px] font-black text-text">
                  {sent.itemCount ? "پیشنهاد ارسال شد" : "درخواست تامین‌کنندگی ارسال شد"}
                </b>
                <p className="mt-1 text-[12px] leading-5 text-text-3">
                  {sent.itemCount
                    ? sent.catalogAdded > 0
                      ? "این کالاها هم به کاتالوکت اضافه شد."
                      : "خریدار پیشنهادت را یک‌جا می‌بیند؛ با تاییدش جزو تأمین‌کننده‌هایش می‌شوی."
                    : "خریدار درخواستت را می‌بیند؛ با تاییدش جزو تأمین‌کننده‌هایش می‌شوی."}
                </p>
              </div>
              <Button variant="arm" block onClick={() => router.push("/catalog")}>
                <Icon name="textlist" size={16} />
                مشاهده کاتالوک
              </Button>
              <Button variant="ghost" block onClick={() => setProposeOpen(false)}>
                بستن
              </Button>
            </div>
          ) : (
            <>
              {/* لینک شرایط تامین در بدنه (FD-26) */}
              {data.supplyTerms && (
                <button
                  type="button"
                  onClick={() => {
                    setProposeOpen(false);
                    setCondOpen(true);
                  }}
                  className="flex items-center gap-2 self-start rounded-full bg-surface-2 px-3 py-1.5 text-[11.5px] font-bold text-text-2"
                >
                  <Icon name="info" size={13} />
                  شرایط تامین
                  <Icon name="chev" size={12} className="rtl:-scale-x-100" />
                </button>
              )}
              {items.map((it, idx) => (
                <div key={it.goodId} className={cn("rounded-2xl border transition-colors", it.selected ? "border-arm bg-arm-soft/25" : "border-line bg-surface")}>
                  <button
                    type="button"
                    onClick={() =>
                      setItems((arr) => arr.map((x, i) => (i === idx ? { ...x, selected: !x.selected } : x)))
                    }
                    className="flex w-full items-center gap-3 p-3 text-start"
                  >
                    <span
                      className={cn(
                        "grid size-6 shrink-0 place-items-center rounded-lg border transition-colors",
                        it.selected ? "border-arm bg-arm text-white" : "border-line-2 bg-bg text-transparent"
                      )}
                    >
                      <Icon name="check" size={14} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <b className="block truncate text-[13px] font-bold text-text">{it.name}</b>
                      <span className="block truncate text-[11px] text-text-3">
                        {it.pack ? `${it.pack} · ` : ""}
                        {it.volume ? `${num(it.volume, locale)} در ماه` : ""}
                      </span>
                      {it.matched && (
                        <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-green-soft px-2 py-0.5 text-[10px] font-bold text-green">
                          <Icon name="check" size={10} />
                          از کاتالوک تو{it.matched.pack ? ` · بستهٔ ${it.matched.pack}` : ""}
                        </span>
                      )}
                    </span>
                  </button>
                  {it.selected && (
                    <div className="grid grid-cols-2 gap-2 border-t border-line/60 p-3">
                      <label className="flex flex-col gap-1">
                        <span className="text-[10.5px] font-bold text-text-3">قیمت هر بسته (تومان)</span>
                        <input
                          inputMode="numeric"
                          value={it.price}
                          onChange={(e) => setItems((arr) => arr.map((x, i) => (i === idx ? { ...x, price: e.target.value } : x)))}
                          placeholder="مثلاً ۲٬۸۵۰٬۰۰۰"
                          className="h-10 rounded-xl border border-line bg-bg px-3 text-[12.5px] font-bold tabular-nums text-text focus:border-arm focus:outline-none"
                        />
                      </label>
                      <label className="flex flex-col gap-1">
                        <span className="text-[10.5px] font-bold text-text-3">حداقل سفارش</span>
                        <input
                          inputMode="numeric"
                          value={it.min}
                          onChange={(e) => setItems((arr) => arr.map((x, i) => (i === idx ? { ...x, min: e.target.value } : x)))}
                          placeholder="مثلاً ۵"
                          className="h-10 rounded-xl border border-line bg-bg px-3 text-[12.5px] font-bold tabular-nums text-text focus:border-arm focus:outline-none"
                        />
                      </label>
                    </div>
                  )}
                </div>
              ))}
              <div className="flex flex-col gap-1.5">
                <label className="text-[11.5px] font-bold text-text-2">
                  یادداشت برای خریدار <span className="font-normal text-text-4">— اختیاری</span>
                </label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={2}
                  maxLength={500}
                  placeholder="مثلاً: برنج امسالم — تحویل همان روز"
                  className="w-full resize-none rounded-xl border border-line bg-bg px-3 py-2.5 text-[12.5px] leading-6 text-text placeholder:text-text-4 focus:border-arm focus:outline-none"
                />
              </div>
              <Button variant="arm" size="xl" loading={busy} onClick={() => void send()}>
                <Icon name="send" size={16} />
                {picked().length === 0
                  ? "ارسال درخواست تامین‌کنندگی"
                  : missing() > 0
                    ? `قیمت و حداقل ${num(missing(), locale)} کالا را وارد کن`
                    : `ارسال پیشنهاد تامین — ${num(picked().length, locale)} قلم`}
              </Button>
            </>
          )}
        </div>
      </Sheet>

      {/* شیت شرایط تامین (FD-22) */}
      <Sheet open={condOpen} onClose={() => setCondOpen(false)} title="شرایط درخواست تامین">
        <div className="flex flex-col gap-3 p-4 pt-0">
          <p className="text-[12px] text-text-3">شرایط {B.name} برای تأمین‌کننده‌ها — قبل از پیشنهاد دادن بخوان.</p>
          {(data.supplyTerms ?? "")
            .split("·")
            .map((s) => s.trim())
            .filter(Boolean)
            .map((p) => (
              <div key={p} className="flex items-center gap-2.5 rounded-xl border border-line bg-surface px-3.5 py-2.5">
                <Icon name="check" size={14} className="shrink-0 text-green" />
                <span className="text-[12.5px] font-bold text-text">{p}</span>
              </div>
            ))}
          <Button variant="outline" block onClick={() => { setCondOpen(false); setProposeOpen(true); }}>
            <Icon name="send" size={15} />
            پیشنهاد تامین بده
          </Button>
        </div>
      </Sheet>

      {/* شیت افزودن به لیست خرید من (FD-22/23/25) */}
      <Sheet open={addOpen} onClose={() => setAddOpen(false)} title="افزودن به لیست خرید من">
        <div className="flex flex-col gap-3 p-4 pt-0">
          {addDone !== null ? (
            <div className="flex flex-col items-center gap-3 py-4 text-center">
              <span className="grid size-16 place-items-center rounded-full bg-green-soft text-green">
                <Icon name="check" size={30} />
              </span>
              <div>
                <b className="block text-[15px] font-black text-text">کالاها به لیست خریدت اضافه شد</b>
                <p className="mt-1 text-[12px] leading-5 text-text-3">
                  {num(addDone, locale)} کالا از لیست {B.name} — در میز خرید آیمچ آمادهٔ استعلام است.
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
                {addFiltered.map((n) => {
                  const inList = inMyListSet.has(n.goodId);
                  const name = goodName({ nameFa: n.name, nameEn: n.nameEn }, locale);
                  return (
                    <button
                      key={n.goodId}
                      type="button"
                      disabled={inList}
                      onClick={() => setAddSel((s) => ({ ...s, [n.goodId]: !s[n.goodId] }))}
                      className={cn(
                        "flex items-center gap-3 rounded-xl border px-3 py-2.5 text-start transition-colors",
                        inList ? "border-line bg-surface-2/50 opacity-60" : addSel[n.goodId] ? "border-arm bg-arm-soft/30" : "border-line bg-surface"
                      )}
                    >
                      <span
                        className={cn(
                          "grid size-5 shrink-0 place-items-center rounded-md border",
                          addSel[n.goodId] && !inList ? "border-arm bg-arm text-white" : "border-line-2 text-transparent"
                        )}
                      >
                        <Icon name="check" size={12} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <b className="block truncate text-[12.5px] text-text">{name}</b>
                        {n.pack && <span className="block truncate text-[10.5px] text-text-3">{n.pack}</span>}
                      </span>
                      {inList && <span className="shrink-0 rounded-full bg-green-soft px-2 py-0.5 text-[9.5px] font-bold text-green">در لیست هست</span>}
                    </button>
                  );
                })}
              </div>
              <Button variant="outline" size="xl" disabled={addSelCount === 0} loading={busy} onClick={() => void addPicked()}>
                <Icon name="plus" size={16} />
                {addSelCount > 0 ? `افزودن ${num(addSelCount, locale)} کالا به لیست خرید` : "افزودن به لیست خرید"}
              </Button>
            </>
          )}
        </div>
      </Sheet>
    </div>
  );
}

/* ─────────────── helpers ─────────────── */

function parseNum(v: string): number {
  const en = v.replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d))).replace(/[^0-9]/g, "");
  return parseInt(en || "0", 10) || 0;
}

function freqT(f: string | null): string {
  if (f === "WEEKLY") return "هفته‌ای یک‌بار";
  if (f === "MONTHLY") return "ماهانه";
  if (f === "OCCASIONAL") return "گاهی";
  return "";
}
