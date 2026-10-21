"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { AuthGate } from "@/components/imach/auth-gate";
import { AppShell } from "@/components/imach/app-shell";
import { Icon } from "@/components/ui/icon";
import { Sheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/feedback";
import { useMessages } from "@/i18n/messages/use-messages";
import { useLocale } from "@/i18n/locale-context";
import { useAuthStore } from "@/lib/auth-store";
import { listingsApi } from "@/lib/api";
import { goodName, num, unitLabel } from "@/lib/format";
import { useMoney } from "@/components/imach/prefs-context";
import { cn } from "@/lib/utils";
import type { GoodItemDto } from "@/lib/api";

/**
 * `/catalog` — اسکرین ۰۵: کاتالوگ من (M2 · FD-35/39/42 + حکم مالک فیکس).
 *
 * · صفحهٔ فرعی (back=/sell): بدون سایدبار — فلش بازگشت استاندارد ← در
 *   اپ‌بار + عنوان؛ ابزارها در نوار ابزار زیر اپ‌بار (همهٔ عرض‌ها) تا
 *   «صفحهٔ فرعی شبیه صفحات اصلی نشود و کاربر گیج نشود» (حکم مالک).
 * · نوار ابزار: تغییر قیمت‌ها · پیش‌نمایش · اشتراک · تنظیمات (FD-39/42)
 * · جستجوی زنده + «محصول جدید» (مهم‌ترین دکمه — تم‌پس‌زمینه) در محتوا
 * · چیپ‌های دستهٔ شخصی (customCategories از کسب‌وکار) + همه + بی‌دسته
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
  const m = useMessages();
  const C = m.catalog;
  const { locale } = useLocale();
  const { parts } = useMoney();
  const businesses = useAuthStore((s) => s.businesses);
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

  const all = listingsQ.data ?? [];
  const active = useMemo(() => all.filter((l) => l.isActive !== false), [all]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return active.filter((l) => {
      if (cat !== "all") {
        if (cat === "__none" ? l.catalogCategoryId : l.catalogCategoryId !== cat) return false;
      }
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

  const shareLinks = useMemo(() => {
    const base = typeof window !== "undefined" ? window.location.origin : "";
    return biz ? `${base}/c/${biz.slug}` : "";
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
              className="h-11 w-full rounded-xl border border-line bg-surface ps-10 pe-3 text-[14px] text-text placeholder:text-text-4 focus:border-arm focus:outline-none focus:ring-2 focus:ring-arm/20"
            />
          </div>
          <Button variant="arm" size="lg" className="shrink-0" onClick={() => router.push("/catalog/new")}>
            <Icon name="plus" size={17} />
            <span className="hidden sm:inline">{C.addProduct}</span>
            <span className="sm:hidden">{C.addProduct}</span>
          </Button>
        </div>

        {/* ── چیپ‌های دستهٔ شخصی ── */}
        {(cats.length > 0 || active.length > 0) && (
          <div className="scrollbar-none flex gap-1.5 overflow-x-auto pb-0.5">
            <CatChip active={cat === "all"} onClick={() => setCat("all")}>
              {C.catAll}
            </CatChip>
            {cats.map((c) => (
              <CatChip key={c.id} active={cat === c.id} onClick={() => setCat(c.id)}>
                {c.name}
              </CatChip>
            ))}
            <CatChip active={cat === "__none"} onClick={() => setCat("__none")}>
              {C.uncategorized}
            </CatChip>
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
        <div className="mt-2 flex items-center justify-between rounded-2xl border border-line bg-surface px-5 py-3.5">
          <Stat label={C.statsGoods} value={num(active.length, locale)} />
          <span className="h-6 w-px bg-line" />
          <Stat label={C.statsSavers} value={num(0, locale)} />
          <span className="h-6 w-px bg-line" />
          <Stat label={C.statsInvites} value={num(0, locale)} />
        </div>
      </div>

      {/* ── شیت اشتراک‌گذاری ── */}
      <ShareSheet open={shareOpen} onClose={() => setShareOpen(false)} link={shareLinks} title={C.shareTitle} hint={C.shareHint} copied={C.shareCopied} />
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
  const unit = l.good?.unit ? unitLabel(l.good.unit, locale) : "";

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
        {l.variantLabel && (
          <p className="line-clamp-1 text-[11.5px] text-text-3 lg:text-[12px]">{l.variantLabel}</p>
        )}
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
              {num(l.stock, locale)} {unit}
            </span>
          )}
        </div>
        {l.baseQty && l.baseQty > 1 && (
          <p className="text-[10.5px] text-text-4">
            {num(l.baseQty, locale)} {unit} × بسته
          </p>
        )}
      </div>
    </button>
  );
}

/** شیت اشتراک‌گذاری کاتالوگ — کپی لینک عمومی */
function ShareSheet({
  open,
  onClose,
  link,
  title,
  hint,
  copied,
}: {
  open: boolean;
  onClose: () => void;
  link: string;
  title: string;
  hint: string;
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

  return (
    <Sheet open={open} onClose={onClose} title={title}>
      <div className="flex flex-col gap-3 p-5">
        <p className="text-[12.5px] leading-6 text-text-3">{hint}</p>
        <div className="flex gap-2">
          <input
            readOnly
            dir="ltr"
            value={link}
            className="h-11 flex-1 rounded-xl border border-line bg-surface px-3 text-[12.5px] text-text-2 focus:border-arm focus:outline-none"
          />
          <Button variant="arm" size="lg" onClick={() => void copy()}>
            <Icon name={done ? "check" : "link"} size={16} />
          </Button>
        </div>
        {done && <p className="text-[12px] font-bold text-green">{copied}</p>}
      </div>
    </Sheet>
  );
}
