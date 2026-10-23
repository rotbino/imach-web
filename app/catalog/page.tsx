"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AuthGate } from "@/components/imach/auth-gate";
import { AppShell } from "@/components/imach/app-shell";
import { Icon } from "@/components/ui/icon";
import { Sheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/feedback";
import { useMessages } from "@/i18n/messages/use-messages";
import { useLocale } from "@/i18n/locale-context";
import { useAuthStore } from "@/lib/auth-store";
import { businessesApi, listingsApi, unitsApi } from "@/lib/api";
import Link from "next/link";
import { ShareOpt, shareTo, catalogInviteText } from "@/components/imach/share-parts";
import { goodName, num, unitLabel } from "@/lib/format";
import { resolveConsumerUnit, packShort } from "@/lib/units";
import { useMoney } from "@/components/imach/prefs-context";
import { cn } from "@/lib/utils";
import type { GoodItemDto } from "@/lib/api";

/**
 * `/catalog` — اسکرین ۰۵: کاتالوگ من (M2 · FD-35/39/42 + حکم مالک فیکس +
 * فیکس‌بچ M3: مدیریت دسته‌ها از خود کاتالوگ).
 *
 * · صفحهٔ فرعی (back=/sell): بدون سایدبار — فلش بازگشت استاندارد ← در
 *   اپ‌بار + عنوان؛ ابزارها در نوار ابزار زیر اپ‌بار (همهٔ عرض‌ها) تا
 *   «صفحهٔ فرعی شبیه صفحات اصلی نشود و کاربر گیج نشود» (حکم مالک).
 * · نوار ابزار: تغییر قیمت‌ها · پیش‌نمایش · اشتراک · تنظیمات (FD-39/42)
 * · جستجوی زنده + «محصول جدید» (مهم‌ترین دکمه — تم‌پس‌زمینه) در محتوا
 * · دسته‌ها (دستور مالک فیکس‌بچ M3): به‌جای چیپ «بدون دسته»، آیکون
 *   مدیریت → شیت ساخت/حذف/تیکِ «دستسه‌بندی‌ها را نشان نده»؛ تغییرات
 *   همان لحظه ذخیره می‌شوند (setCatalogCategories + editBusiness)
 * · گرید auto-fill ۲۵۲: عکس/حرف · نام (title شخصی > نام مرجع) · بسته · قیمت
 * · نوار آمار: نوع کالا / ذخیره‌کننده / دعوت — زنده از دیتا
 */

export default function CatalogPage() {
  return (
    <AuthGate>
      <Catalog />
    </AuthGate>
  );
}

function Catalog() {
  const router = useRouter();
  const qc = useQueryClient();
  const m = useMessages();
  const C = m.catalog;
  const { locale } = useLocale();
  const { parts } = useMoney();
  const businesses = useAuthStore((s) => s.businesses);
  const updateBusinesses = useAuthStore((s) => s.updateBusinesses);
  const biz = businesses[0];
  const bizId = biz?.id ?? "";

  const listingsQ = useQuery({
    queryKey: ["listings", "mine", bizId, "all"],
    queryFn: () => listingsApi.getMyListings(bizId, { includeInactive: true }),
    enabled: !!bizId,
  });

  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string | "all">("all");
  const [shareOpen, setShareOpen] = useState(false);
  // فیکس‌بچ M3 — شیت مدیریت دسته‌ها از خود کاتالوک (دستور مالک)
  const [catsOpen, setCatsOpen] = useState(false);

  const all = listingsQ.data ?? [];
  const active = useMemo(() => all.filter((l) => l.isActive !== false), [all]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return active.filter((l) => {
      if (cat !== "all" && l.catalogCategoryId !== cat) return false;
      if (!needle) return true;
      const hay = [
        l.title,
        l.variantLabel,
        l.good?.nameFa,
        l.good?.nameEn,
        l.brand?.name,
        l.note,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(needle);
    });
  }, [active, q, cat]);

  const cats = (biz?.customCategories ?? []) as { id: string; name: string }[];

  // M7 — لینک دعوت با ?ref: ثبت‌نامِ گیرنده = «مشتری من» (referredBy + viaRef)
  const shareLinks = useMemo(() => {
    const base = typeof window !== "undefined" ? window.location.origin : "";
    return biz ? `${base}/c/${biz.slug}?ref=${biz.slug}` : "";
  }, [biz]);

  // شمارندهٔ نوار آمار — ذخیره‌کننده از getFollowers بعداً؛ فعلاً کالا/دسته زنده

  return (
    <AppShell
      arm="sell"
      title={C.title}
      wide
      back="/sell"
      toolbar={
        <>
          <ToolBtn icon="percent" label={C.bulkEdit} onClick={() => router.push("/catalog/bulk")} />
          <ToolBtn
            icon="eye"
            label={C.preview}
            onClick={() => router.push(biz ? `/c/${biz.slug}` : "/sell")}
          />
          <ToolBtn icon="share" label={C.share} onClick={() => setShareOpen(true)} />
          <ToolBtn icon="gear" label={C.settings} onClick={() => router.push("/catalog/settings")} />
        </>
      }
    >
      {/* حکم مالک (۱۰۲۶-۲): «رنگ بگراند محتوای کاتالوک یه مقدار متفاوتر از
          رنگ زمینه — شبیه کارت» — کل محتوای کاتالوک روی یک کاغذ واحد با
          قاب و سایهٔ نرم؛ عناصر داخلی با قاب خودشان از کاغذ جدا می‌شوند */}
      <div className="rounded-[20px] border border-line bg-surface p-4 shadow-[0_2px_10px_rgba(31,29,26,.04)] lg:p-5">
      <div className="flex flex-col gap-3">
        {/* ── نوار ابزار: جستجو + محصول جدید (FD-35) ── */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Icon
              name="search"
              size={17}
              className="pointer-events-none absolute start-3.5 top-1/2 -translate-y-1/2 text-text-4"
            />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={C.searchPh}
              autoComplete="off"
              className="h-11 w-full rounded-xl border border-line bg-bg ps-10 pe-3 text-[14px] text-text placeholder:text-text-4 focus:border-arm focus:outline-none focus:ring-2 focus:ring-arm/20"
            />
          </div>
          <Button variant="arm" size="lg" className="shrink-0" onClick={() => router.push("/catalog/new")}>
            <Icon name="plus" size={17} />
            <span className="hidden sm:inline">{C.addProduct}</span>
            <span className="sm:hidden">{C.addProduct}</span>
          </Button>
        </div>

        {/* ── چیپ‌های دستهٔ شخصی + آیکون مدیریت (دستور مالک فیکس‌بچ M3:
            آیکونی که مدال مدیریت دسته‌بندی را باز می‌کند؛ چیپ «بدون دسته» حذف شد) ── */}
        {(cats.length > 0 || active.length > 0) && (
          <div className="scrollbar-none flex items-center gap-1.5 overflow-x-auto pb-0.5">
            {/* تیک عدم نمایش (فیکس‌بچ M3): فروشنده‌ای که دسته نمی‌خواهد ردیف را
                مخفی می‌کند — آیکون مدیریت می‌ماند تا هر وقت خواست برگرداند */}
            {!biz?.catalogCategoriesHidden && (
              <>
                <CatChip active={cat === "all"} onClick={() => setCat("all")}>
                  {C.catAll}
                </CatChip>
                {cats.map((c) => (
                  <CatChip key={c.id} active={cat === c.id} onClick={() => setCat(c.id)}>
                    {c.name}
                  </CatChip>
                ))}
              </>
            )}
            <button
              type="button"
              onClick={() => setCatsOpen(true)}
              aria-label="مدیریت دسته‌بندی‌ها"
              title="مدیریت دسته‌بندی‌ها"
              className="grid size-8 shrink-0 place-items-center rounded-full border border-line bg-surface text-text-3 transition-colors hover:border-arm/45 hover:bg-arm-soft hover:text-arm-strong active:scale-95"
            >
              <Icon name="gear" size={15} />
            </button>
          </div>
        )}

        {/* ── شمارنده ── */}
        <p className="text-[12px] font-bold text-text-3">
          {num(filtered.length, locale)} {C.countUnit}
        </p>

        {/* ── گرید کالاها ── */}
        {listingsQ.isLoading ? (
          <div className="grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(158px,1fr))] lg:[grid-template-columns:repeat(auto-fill,minmax(252px,1fr))]">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-56 animate-pulse rounded-2xl bg-surface-2" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<Icon name="store" size={30} />}
            title={active.length === 0 ? C.emptyTitle : C.searchPh}
            subtitle={active.length === 0 ? C.emptySub : undefined}
            action={
              active.length === 0 ? (
                <Button variant="arm" size="lg" onClick={() => router.push("/catalog/new")}>
                  <Icon name="plus" size={17} />
                  {C.addProduct}
                </Button>
              ) : undefined
            }
          />
        ) : (
          <div className="grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(158px,1fr))] lg:gap-4 lg:[grid-template-columns:repeat(auto-fill,minmax(252px,1fr))]">
            {filtered.map((l) => (
              <CatalogCard key={l.id} l={l} locale={locale} parts={parts} onOpen={() => router.push(`/item/${l.id}`)} />
            ))}
          </div>
        )}

        {/* ── نوار آمار (زنده) ── */}
        <div className="mt-2 flex items-center justify-between rounded-2xl border border-line bg-bg px-5 py-3.5">
          <Stat label={C.statsGoods} value={num(active.length, locale)} />
          <span className="h-6 w-px bg-line" />
          <Stat label={C.statsSavers} value={num(0, locale)} />
          <span className="h-6 w-px bg-line" />
          <Stat label={C.statsInvites} value={num(0, locale)} />
        </div>
      </div>
      </div>

      {/* ── شیت مدیریت دسته‌ها (دستور مالک فیکس‌بچ M3) ── */}
      <CategoriesSheet
        open={catsOpen}
        onClose={() => setCatsOpen(false)}
        bizId={bizId}
        cats={cats}
        hidden={!!biz?.catalogCategoriesHidden}
        onChanged={async (nextCats, nextHidden) => {
          // کش کالا (حذف دسته → آگهی‌هایش بی‌دسته) + کش کسب‌وکار (چیپ‌ها/پرچم)
          void qc.invalidateQueries({ queryKey: ["listings"] });
          try {
            updateBusinesses(await businessesApi.getMyBusinesses());
          } catch {
            /* best-effort */
          }
          if (nextHidden) setCat("all");
          if (!nextCats.some((c) => c.id === cat)) setCat("all");
        }}
      />

      {/* ── شیت اشتراک‌گذاری (M7 — اسکرین ۰۶ بازطراحی: مخاطبین/پیام‌رسان/کپی + دعوت‌شدگان) ── */}
      <CatalogShareSheet
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        link={shareLinks}
        bizName={biz?.name ?? ""}
        copied={C.shareCopied}
      />
    </AppShell>
  );
}

/** دکمهٔ نوار ابزار (حکم مالک فیکس) — قرصِ فشرده با آیکون؛ همان
 *  ابزارهای سایدبارِ پیشین، حالا در نوار بالای محتوا؛ در همهٔ عرض‌ها. */
function ToolBtn({
  icon,
  label,
  onClick,
}: {
  icon: Parameters<typeof Icon>[0]["name"];
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border border-line bg-surface px-3.5 text-[12.5px] font-bold text-text-2 transition-colors hover:border-arm/45 hover:bg-arm-soft hover:text-arm-strong active:scale-[.97]"
    >
      <Icon name={icon} size={15} />
      {label}
    </button>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <span className="flex items-baseline gap-1.5">
      <b className="text-[17px] font-black text-text">{value}</b>
      <span className="text-[11.5px] text-text-3">{label}</span>
    </span>
  );
}

function CatChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "shrink-0 rounded-full border px-3.5 py-1.5 text-[12.5px] font-bold transition-colors",
        active
          ? "border-arm bg-arm-soft text-arm-strong"
          : "border-line bg-surface text-text-2 hover:border-line-2"
      )}
    >
      {children}
    </button>
  );
}

/** کارت کالا — عکس/حرف + نام + بسته + قیمت + موجودی */
function CatalogCard({
  l,
  locale,
  parts,
  onOpen,
}: {
  l: GoodItemDto;
  locale: string;
  parts: (minor: number | null | undefined, from?: string | null) => { amount: string; label: string };
  onOpen: () => void;
}) {
  const m = useMessages();
  const C = m.catalog;
  const name = l.title || goodName({ nameFa: l.good.nameFa, nameEn: l.good.nameEn }, locale);
  const img = l.gallery?.[0]?.thumbUrl ?? l.gallery?.[0]?.url ?? l.product?.imageUrl ?? null;
  const price = parts(l.priceMinor, l.currency);
  /* مدل واحد ۱۰۲۶ — پسوند موجودی: بستهٔ کوتاه، وگرنه واحد مصرف‌کننده
   * (دادهٔ قدیمی SACK → کیلو، نه «کیسه») */
  const unitsQ = useQuery({
    queryKey: ["units", "all"],
    queryFn: () => unitsApi.list(),
    staleTime: 24 * 3600_000,
  });
  const consumerUnit = unitLabel(resolveConsumerUnit(l.good?.unit, unitsQ.data), locale);
  const packLabel = l.packaging?.[0]?.label ?? null;
  const stockUnit = packLabel ? packShort(packLabel) ?? consumerUnit : consumerUnit;
  /* بستهٔ انتخابی («کیسهٔ ۵۰ کیلویی») کنار واریانت؛ ردیف‌های قدیمیِ بی‌برچسب
   * همان خط تعداد قدیمی را می‌بینند */
  const sub = [l.variantLabel, packLabel].filter(Boolean).join(" · ");

  return (
    <button
      type="button"
      onClick={onOpen}
      className="group flex flex-col overflow-hidden rounded-2xl border border-line bg-surface text-start shadow-[0_1px_3px_rgba(31,29,26,.04)] transition-[border-color,box-shadow,transform] hover:border-line-2 hover:shadow-[0_10px_30px_rgba(31,29,26,.08)] active:translate-y-px"
    >
      {/* عکس — نسبت ثابت؛ بی‌عکس = حرف اول */}
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-surface-2">
        {img ? (
          // eslint-disable-next-line @next/next/no-img-element -- عکس گالری/مرجع با object-cover ساده
          <img src={img} alt={name} className="size-full object-cover transition-transform group-hover:scale-[1.03]" loading="lazy" />
        ) : (
          <div className="grid size-full place-items-center text-[34px] font-black text-text-4/70">
            {name.slice(0, 1)}
          </div>
        )}
        {l.priceMinor === null && (
          <span className="absolute start-2 top-2 rounded-full bg-amber-soft px-2 py-0.5 text-[10px] font-bold text-amber">
            {C.noPrice}
          </span>
        )}
        {l.priceExpired && (
          <span className="absolute start-2 top-2 rounded-full bg-amber px-2 py-0.5 text-[10px] font-bold text-white">
            {C.expired}
          </span>
        )}
      </div>

      <div className="flex flex-col gap-1 p-3 lg:p-3.5">
        <p className="line-clamp-1 text-[13.5px] font-bold text-text lg:text-[14.5px]">{name}</p>
        {sub && <p className="line-clamp-1 text-[11.5px] text-text-3 lg:text-[12px]">{sub}</p>}
        <div className="mt-1 flex items-baseline justify-between gap-1">
          {l.priceMinor !== null ? (
            <span className="flex items-baseline gap-1">
              <b className="text-[14.5px] font-black text-text lg:text-[16px]">{price.amount}</b>
              <span className="text-[10.5px] font-bold text-text-3">{price.label}</span>
            </span>
          ) : (
            <span className="text-[11.5px] font-bold text-amber">{C.noPrice}</span>
          )}
          {l.stock !== null && l.stock !== undefined && (
            <span className="text-[10.5px] text-text-3">
              {num(l.stock, locale)} {stockUnit}
            </span>
          )}
        </div>
        {/* ردیف‌های قدیمیِ بی‌برچسب بسته — همان خط تعداد؛ برچسب‌دارها بالا آمده‌اند */}
        {!packLabel && l.baseQty && l.baseQty > 1 && (
          <p className="text-[10.5px] text-text-4">
            {num(l.baseQty, locale)} {consumerUnit} × بسته
          </p>
        )}
      </div>
    </button>
  );
}

/** شیت مدیریت دسته‌های ویترین (دستور مالک فیکس‌بچ M3): «با زدن اون مدال
 *  مدیریت دسته‌بندی رو باز کنه. کاربر بتونه دسته مورد نظرش رو ایجاد یا مدیریت
 *  کنه. اگر به دسته‌بندی نیاز نداره تیک عدم نمایش دسته‌بندی رو بزنه».
 *  ذخیرهٔ زنده: هر ساخت/حذف/تیک همان لحظه سرور می‌رود — نه دکمهٔ ذخیرهٔ انتها. */
function CategoriesSheet({
  open,
  onClose,
  bizId,
  cats,
  hidden,
  onChanged,
}: {
  open: boolean;
  onClose: () => void;
  bizId: string;
  cats: { id: string; name: string }[];
  hidden: boolean;
  onChanged: (cats: { id: string; name: string }[], hidden: boolean) => void;
}) {
  const [list, setList] = useState(cats);
  const [hide, setHide] = useState(hidden);
  const [newCat, setNewCat] = useState("");
  const [busy, setBusy] = useState(false);

  // باز شدن دوباره → از وضعیت سرور تازه شروع کن
  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setList(cats);
      setHide(hidden);
      setNewCat("");
    }
  }

  const persist = async (nextCats: { id: string; name: string }[], nextHidden: boolean) => {
    setBusy(true);
    try {
      await businessesApi.setCatalogCategories(bizId, nextCats);
      if (nextHidden !== hide) {
        await businessesApi.editBusiness(bizId, { catalogCategoriesHidden: nextHidden });
      }
      setList(nextCats);
      setHide(nextHidden);
      onChanged(nextCats, nextHidden);
    } catch {
      /* خطا را caller از طریق کش می‌بیند؛ حالت محلی برمی‌گردد */
      setList(cats);
      setHide(hidden);
    } finally {
      setBusy(false);
    }
  };

  const addCat = () => {
    const v = newCat.trim();
    if (v.length < 2 || list.some((c) => c.name === v)) return;
    void persist([...list, { id: `c${Date.now().toString(36)}`, name: v }], hide);
    setNewCat("");
  };

  const removeCat = (id: string) => void persist(list.filter((c) => c.id !== id), hide);

  return (
    <Sheet open={open} onClose={onClose} title="مدیریت دسته‌بندی‌ها">
      <div className="flex flex-col gap-4 py-1">
        <p className="text-[12.5px] leading-5 text-text-3">
          دسته‌ها چیپ‌های بالای کاتالوگ‌اند — مثل «هاشمی / طارم / فجر». هر تغییر همان لحظه ذخیره می‌شود.
        </p>

        {/* فهرست دسته‌ها */}
        {list.length > 0 ? (
          <div className="flex flex-col gap-1.5">
            {list.map((c) => (
              <div
                key={c.id}
                className="flex h-11 items-center gap-2 rounded-xl border border-line bg-surface px-3.5"
              >
                <Icon name="folder" size={16} className="shrink-0 text-text-3" />
                <b className="min-w-0 flex-1 truncate text-[13.5px] font-bold text-text">{c.name}</b>
                <button
                  type="button"
                  onClick={() => removeCat(c.id)}
                  disabled={busy}
                  aria-label={`حذف ${c.name}`}
                  className="grid size-8 shrink-0 place-items-center rounded-full text-text-4 transition-colors hover:bg-red/10 hover:text-red disabled:opacity-40"
                >
                  <Icon name="trash" size={15} />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="rounded-xl border border-dashed border-line-2 bg-surface px-4 py-5 text-center text-[12.5px] leading-6 text-text-3">
            هنوز دسته‌ای نساخته‌ای — اگر کاتالوکت کوچک است بدون دسته هم خوب است.
          </p>
        )}

        {/* ساخت دستهٔ جدید */}
        <div className="flex gap-2">
          <input
            value={newCat}
            onChange={(e) => setNewCat(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addCat()}
            placeholder="دستهٔ جدید… مثلاً: نوشیدنی"
            maxLength={30}
            aria-label="نام دستهٔ جدید"
            className="h-11 min-w-0 flex-1 rounded-xl border border-line bg-surface px-3.5 text-[14px] text-text placeholder:text-text-4 focus:border-arm focus:outline-none focus:ring-2 focus:ring-arm/20"
          />
          <Button className="shrink-0" onClick={addCat} disabled={busy || newCat.trim().length < 2}>
            <Icon name="plus" size={15} /> افزودن
          </Button>
        </div>

        {/* تیک عدم نمایش (دستور مالک): دسته‌ها می‌مانند، فقط چیپ‌ها مخفی می‌شوند */}
        <button
          type="button"
          role="switch"
          aria-checked={hide}
          onClick={() => void persist(list, !hide)}
          disabled={busy}
          className="flex items-center gap-3 rounded-xl border border-line bg-surface px-3.5 py-3 text-start transition-colors hover:border-line-2 disabled:opacity-60"
        >
          <span
            className={cn(
              "relative h-7 w-12 shrink-0 rounded-full transition-colors",
              hide ? "bg-primary" : "bg-line-2"
            )}
          >
            <span
              className={cn(
                "absolute top-1 size-5 rounded-full bg-white shadow-sm transition-all",
                hide ? "start-6" : "start-1"
              )}
            />
          </span>
          <span className="min-w-0 flex-1">
            <b className="block text-[13.5px] font-bold text-text">دسته‌بندی‌ها را نشان نده</b>
            <span className="mt-0.5 block text-[11.5px] leading-5 text-text-3">
              چیپ دسته‌ها از بالای کاتالوک برداشته می‌شود — کالاها سر جایشان می‌مانند
            </span>
          </span>
        </button>
      </div>
    </Sheet>
  );
}

/** شیت اشتراک‌گذاری کاتالوک — M7 (اسکرین ۰۶): مخاطبین/پیام‌رسان‌ها/کپی
 *  + متن دعوت سه‌نشان + ورودی «دعوت‌شدگان و پاداش». QR فقط در تنظیمات چاپی
 *  می‌آید (سند ۰۸ §M7) — این‌جا عمداً نیست.
 *  کال‌اوت طرح: «هر کس لینک را بگیرد و کاتالوگ را ذخیره کند، مشتری شما می‌شود…» */
function CatalogShareSheet({
  open,
  onClose,
  link,
  bizName,
  copied,
}: {
  open: boolean;
  onClose: () => void;
  link: string;
  bizName: string;
  copied: string;
}) {
  const [done, setDone] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setDone(true);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setDone(false), 2200);
    } catch {
      /* clipboard مسدود — کاربر دستی انتخاب می‌کند */
    }
  };

  const invite = catalogInviteText(bizName || "کاتالوک", link);

  return (
    <Sheet open={open} onClose={onClose} title="اشتراک کاتالوگ">
      <div className="flex flex-col gap-4 p-5">
        {/* کال‌اوت: چرا اشتراک؟ (طرح اسکرین ۰۶) */}
        <div className="flex items-start gap-2.5 rounded-2xl border border-arm/30 bg-arm-soft/40 p-3.5">
          <Icon name="sparkles" size={16} className="mt-0.5 shrink-0 text-arm-strong" />
          <p className="text-[11.5px] leading-[1.9] text-text-2">
            هر کس لینک را بگیرد و کاتالوک را ذخیره کند، <b>مشتری شما می‌شود</b> و هر تغییر قیمت را همان لحظه می‌بیند.
          </p>
        </div>

        {/* مخاطبین — حالت pick دعوت گروهی (M6) */}
        <Link
          href="/contacts?pick=1"
          className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-3.5 transition-colors hover:border-line-2"
        >
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-surface-2 text-text-2">
            <Icon name="users" size={18} />
          </span>
          <span className="min-w-0 flex-1">
            <b className="block text-[13px] font-bold text-text">اشتراک با مخاطبین</b>
            <span className="mt-0.5 block text-[11.5px] text-text-3">از دفترچه‌ات انتخاب کن و دعوت بفرست</span>
          </span>
          <Icon name="chev" size={16} className="shrink-0 text-text-4 rtl:-scale-x-100" />
        </Link>

        {/* پیام‌رسان‌ها — سهماه (FD-26) با متن سه‌نشان */}
        <div className="grid grid-cols-3 gap-2">
          <ShareOpt label="واتس‌اپ" bg="#25D366" icon="whatsapp" onClick={() => shareTo("whatsapp", link, invite)} />
          <ShareOpt label="تلگرام" bg="#229ED9" icon="telegram" onClick={() => shareTo("telegram", link, invite)} />
          <ShareOpt label="پیامک" bg="#F97316" icon="msg" onClick={() => shareTo("sms", link, invite)} />
        </div>

        {/* لینک + کپی */}
        <div className="flex gap-2">
          <input
            readOnly
            dir="ltr"
            value={link}
            className="h-11 flex-1 rounded-xl border border-line bg-surface px-3 text-[12px] text-text-2 focus:border-arm focus:outline-none"
          />
          <Button variant="arm" size="lg" onClick={() => void copy()}>
            <Icon name={done ? "check" : "link"} size={16} />
          </Button>
        </div>
        {done && <p className="text-[12px] font-bold text-green">{copied}</p>}

        {/* دعوت‌شدگان و پاداش — صفحهٔ ۰۶ (آمار/هدف/لیست) */}
        <Link
          href="/referrals"
          className="flex items-center gap-3 rounded-2xl border border-dashed border-line-2 bg-surface-2/50 p-3.5 transition-colors hover:border-line-2"
        >
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-arm-soft text-arm-strong">
            <Icon name="award" size={18} />
          </span>
          <span className="min-w-0 flex-1">
            <b className="block text-[13px] font-bold text-text">دعوت‌شدگان و پاداش</b>
            <span className="mt-0.5 block text-[11.5px] text-text-3">
              هر دعوت که عضو شود ۵٬۰۰۰ تومان پاداش کیف می‌گیری + امتیاز جذب
            </span>
          </span>
          <Icon name="chev" size={16} className="shrink-0 text-text-4 rtl:-scale-x-100" />
        </Link>
      </div>
    </Sheet>
  );
}
