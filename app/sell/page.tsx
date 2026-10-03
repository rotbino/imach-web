"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/auth-store";
import { setArmActive, useActiveBusiness } from "@/lib/active-biz";
import { AppFooter, AppHeader, MobileTabBar } from "@/app/components/chrome";
import { fa, activityTypeLabel, categoryName, fmtMoney, goodName, unitLabel } from "@/lib/format";
import { useMyBusinesses, useMyFollowers, useMyListings, useSetListingActive } from "@/lib/queries";
import type { BusinessSummaryDto, GoodItemDto } from "@/lib/api";
import { ShareDialog } from "@/app/components/share";
import { CatalogHeaderPrompt } from "@/app/components/catalog-header-prompt";
import { SetPasswordButton } from "@/app/components/set-password-button";
import { NoBusinessState } from "@/app/components/no-business";
import { ProductSettingsDialog } from "./product-settings";
import { CategoryManagerDialog } from "./category-manager";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  BadgeCheck,
  Eye,
  Loader2,
  Megaphone,
  PackageOpen,
  Plus,
  Search,
  Settings2,
  Share2,
  TriangleAlert,
  Wallet,
  ChevronLeft,
} from "lucide-react";

/*
 * کاتالوگ من — فاز ۲ (طرح ۰۱ + d1):
 * • هدر تختِ ویترین (آواتار + نام + صنف·شهر + اشتراک) به‌جای کارت بزرگ
 * • نوار آمار: کالا / بازدید ماه (شکاف ۳) / دنبال‌کننده
 * • جست‌وجو + افزودن کالا + چیپ نوع کالا
 * • کارت‌های عمومی + شاخص‌های کوچک مالک (👁 بازدید ۳۰ روز + وضعیت موجودی)
 * • ردیف غیرفعال با «فعال‌سازی» (setActive) و سینی «نیاز به تکمیل قیمت»
 * • دسکتاپ: همان کارت‌ها به‌صورت ردیف‌های افقی (بهبود d1 — نه جدول، نه گرید)
 * مدیریت و نمایش یکی‌اند — WYSIWYG مثل اینستاگرام؛ کارت = ورودی صفحه‌ی کالا.
 */

export default function SellPage() {
  const router = useRouter();
  const { status } = useAuthStore();

  useEffect(() => {
    document.title = "کاتالوگ من | iMach";
    setArmActive("sell");
  }, []);

  useEffect(() => {
    if (status === "guest") router.replace("/start");
  }, [status, router]);

  if (status !== "authed") {
    return (
      <div className="flex min-h-screen flex-col">
        <AppHeader />
        <main className="grow">
          <div className="grid place-items-center py-32">
            <Loader2 className="size-6 animate-spin text-primary" />
          </div>
        </main>
        <AppFooter />
        <MobileTabBar />
      </div>
    );
  }

  return <SellBody />;
}

function SellBody() {
  const active = useActiveBusiness();
  const bizQ = useMyBusinesses();

  if (bizQ.isLoading) {
    return (
      <div className="grid place-items-center py-32">
        <Loader2 className="size-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!active) return <NoBusinessState variant="sell" />;

  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader />
      <main className="grow">
        <div className="mx-auto max-w-4xl px-4 py-5 sm:px-6 sm:py-7">
          <MyCatalog biz={active} />
        </div>
      </main>
      <AppFooter />
      <MobileTabBar />
    </div>
  );
}

// ─── وضعیت موجودی — همان زبان بج‌های طرح ───
function stockBadge(l: GoodItemDto): { label: string; cls: string } {
  const stock = l.stock ?? 0;
  const mo = l.minOrder ?? 0;
  if (stock <= 0) return { label: "ناموجود", cls: "bg-stone-100 text-stone-500" };
  if (mo > 0 && stock <= mo * 3) return { label: "موجودی کم", cls: "bg-amber-100/80 text-amber-700" };
  return { label: "موجود", cls: "bg-green-100/70 text-green-700" };
}

function MyCatalog({ biz }: { biz: BusinessSummaryDto }) {
  const router = useRouter();
  const bizId = biz.id;
  const slug = biz.slug;
  const listingsQ = useMyListings(bizId, { includeInactive: true });
  const followersQ = useMyFollowers(bizId);

  const [settingsFor, setSettingsFor] = useState<GoodItemDto | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [catsOpen, setCatsOpen] = useState(false);
  const [q, setQ] = useState("");
  // فاز ۳ — فیلتر چیپ‌ها بر روی دسته‌ی شخصی کاتالوگ (از Business.customCategories)
  const [catFilter, setCatFilter] = useState<string | null>(null);

  const isPlaceholder = biz.name === "کاتالوگ شما" || !biz.trade || biz.city === "—";

  // سه طبقه: فعالِ قیمت‌دار (ویترین) / فعالِ بی‌قیمت (سینی تکمیل) / غیرفعال
  const rows = listingsQ.data ?? [];
  const activeSell = rows.filter(
    (l) => (l.mode === "SELL" || l.mode === "BOTH") && l.isActive !== false && l.priceMinor !== null
  );
  const incomplete = rows.filter(
    (l) => (l.mode === "SELL" || l.mode === "BOTH") && l.isActive !== false && l.priceMinor === null
  );
  const inactive = rows.filter((l) => (l.mode === "SELL" || l.mode === "BOTH") && l.isActive === false);

  // ── فاز ۳ — دسته‌های شخصی کاتالوگ + شمار آگهی‌های هر دسته ──
  const cats = biz.customCategories ?? [];
  const catCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const l of activeSell) {
      if (l.catalogCategoryId) counts.set(l.catalogCategoryId, (counts.get(l.catalogCategoryId) ?? 0) + 1);
    }
    return counts;
  }, [activeSell]);

  // جست‌وجوی محلی + فیلتر دسته‌ی شخصی (چیپ‌های ویترین — از دیتابیس، هاردکد نیست)

  const filtered = activeSell.filter((l) => {
    if (catFilter && l.catalogCategoryId !== catFilter) return false;
    if (!q.trim()) return true;
    const needle = q.trim().toLowerCase();
    return [goodName(l.good), l.brand?.name, l.variantLabel, categoryName(l.good.category)]
      .filter(Boolean)
      .some((s) => (s as string).toLowerCase().includes(needle));
  });

  const viewsMonth = activeSell.reduce((s, l) => s + (l.viewCount30 ?? 0), 0);
  const savers = followersQ.data?.rows.length ?? 0;

  if (listingsQ.isLoading) {
    return (
      <div className="grid place-items-center py-24">
        <Loader2 className="size-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
      {/* ═══ هدر ویترین — تخت: آواتار + نام + صنف·شهر + اشتراک ═══ */}
      <header className="flex items-center gap-3 pb-1">
        <span className="grid size-[54px] shrink-0 place-items-center rounded-full bg-gradient-to-br from-[#c2703a] to-primary text-xl font-bold text-white shadow-inner">
          {biz.name === "کاتالوگ شما" ? "?" : biz.name.slice(0, 1)}
        </span>
        <div className="min-w-0 flex-1">
          {isPlaceholder ? (
            <CatalogHeaderPrompt biz={biz} />
          ) : (
            <h1 className="flex items-center gap-1.5 truncate text-[16.5px] font-bold">
              {biz.name}
              {biz.isVerified && <BadgeCheck className="size-4 shrink-0 text-[#1d5fb8]" aria-label="تاییدشده" />}
            </h1>
          )}
          <p className="mt-1 truncate text-[11.5px] text-muted-foreground">
            {[biz.trade || activityTypeLabel(biz.activityType ?? ""), biz.city !== "—" ? biz.city : null]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShareOpen(true)}
          aria-label="اشتراک کاتالوگ"
          className="grid size-9 shrink-0 place-items-center rounded-xl border bg-white text-stone-500 transition hover:bg-accent hover:text-primary"
        >
          <Share2 className="size-4.5" />
        </button>
        {/* طرح ۸ — کیف پول: فقط در لحظهٔ مصرف (قانون تشنگی)؛ این‌جا چون خریدارِ دیده‌شده است */}
        <button
          type="button"
          onClick={() => router.push("/sell/wallet")}
          aria-label="کیف پول"
          title="کیف پول — کمپین‌های صف اول"
          className="grid size-9 shrink-0 place-items-center rounded-xl border bg-white text-[#b45309] transition hover:border-[#b45309]/40 hover:bg-[#fffaf0]"
        >
          <Wallet className="size-4.5" />
        </button>
      </header>

      {/* ═══ طرح ۸ (U05) — کارت «صف اول»: ورود یک‌ضربه‌ای به کمپین‌ها ═══ */}
      <button
        type="button"
        onClick={() => router.push("/sell/promos")}
        className="mt-3 flex w-full items-center gap-2.5 rounded-2xl border border-[#e8cf9f] bg-[#fffaf0] px-3.5 py-2.5 text-start transition hover:border-[#b45309]/50"
      >
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[#fdf0da] text-[#b45309]">
          <Megaphone className="size-4" />
        </span>
        <span className="min-w-0 grow">
          <span className="block text-[12.5px] font-bold text-[#b45309]">صف اول — دیده‌شوی خریدارها</span>
          <span className="mt-0.5 block text-[10.5px] leading-4 text-muted-foreground">
            ۱٬۰۰۰ تومان هر نمایش هدفمند + ۵٬۰۰۰ تومان هر دنبال‌کردن — فقط کسانی که هنوز ذخیره‌تان نکرده‌اند.
          </span>
        </span>
        <ChevronLeft className="size-4 shrink-0 text-stone-300" />
      </button>

      {/* ═══ نوار آمار — کالا / بازدید ماه / ذخیره‌کننده (طرح ۸) ═══ */}
      <button
        type="button"
        onClick={() => router.push("/sell/customers")}
        className="mt-3 grid w-full grid-cols-3 gap-2 rounded-2xl border bg-white p-1 text-center transition hover:border-primary/40"
        aria-label="ذخیره‌کنندگان کاتالوگ"
      >
        <div className="rounded-xl px-1.5 py-2">
          <p className="text-[16px] font-bold">{fa(activeSell.length)}</p>
          <p className="mt-0.5 text-[10px] text-muted-foreground">کالا</p>
        </div>
        <div className="rounded-xl px-1.5 py-2">
          <p className="text-[16px] font-bold">{fa(viewsMonth)}</p>
          <p className="mt-0.5 text-[10px] text-muted-foreground">بازدید ماه</p>
        </div>
        <div className="rounded-xl bg-accent/60 px-1.5 py-2">
          <p className="text-[16px] font-bold text-primary">{fa(savers)}</p>
          <p className="mt-0.5 text-[10px] text-muted-foreground">ذخیره‌کننده</p>
        </div>
      </button>

      {/* ═══ جست‌وجو + افزودن کالا ═══ */}
      <div className="mt-3 flex items-center gap-2">
        <label className="flex h-11 flex-1 items-center gap-2.5 rounded-xl border border-stone-300 bg-white px-3.5">
          <Search className="size-4.5 shrink-0 text-muted-foreground" />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="جست‌وجو در کاتالوگ…"
            className="h-full w-full bg-transparent text-[13px] outline-none placeholder:text-stone-400"
          />
        </label>
        <Button className="h-11 gap-1 px-4" onClick={() => router.push("/new?tab=sell")}>
          <Plus className="size-4" />
          افزودن کالا
        </Button>
      </div>

      {/* دکمه چشمک‌زن ثبت رمز — فقط کاربرانِ ثبت‌نام سریع */}
      <SetPasswordButton variant="header" />

      {/* ═══ چیپ دسته‌های شخصی کاتالوگ — از دیتابیس (فاز ۳ — طرح ۰۱) ═══ */}
      {(cats.length > 0 || catFilter !== null) && (
        <div className="mt-2.5 flex items-center gap-1.5 overflow-x-auto pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <button
            type="button"
            onClick={() => setCatFilter(null)}
            className={`shrink-0 rounded-full border px-3.5 py-1.5 text-[12.5px] transition ${
              catFilter === null
                ? "border-transparent bg-accent font-bold text-primary"
                : "border-stone-300 bg-white text-stone-500 hover:bg-accent/50"
            }`}
          >
            همه
          </button>
          {cats.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setCatFilter(catFilter === c.id ? null : c.id)}
              aria-pressed={catFilter === c.id}
              className={`shrink-0 rounded-full border px-3.5 py-1.5 text-[12.5px] transition ${
                catFilter === c.id
                  ? "border-transparent bg-accent font-bold text-primary"
                  : "border-stone-300 bg-white text-stone-500 hover:bg-accent/50"
              }`}
            >
              {c.name}
            </button>
          ))}
          {/* مدیریت دسته‌ها — ایجاد/ویرایش/حذف (خواسته‌ی کاربر) */}
          <button
            type="button"
            onClick={() => setCatsOpen(true)}
            aria-label="مدیریت دسته‌های کاتالوگ"
            className="grid size-[30px] shrink-0 place-items-center rounded-full border border-dashed border-stone-300 text-stone-400 transition hover:border-primary hover:text-primary"
          >
            <Settings2 className="size-3.5" />
          </button>
        </div>
      )}

      {/* وقتی هیچ دسته‌ای نیست — راهنمای آرام ساخت اولین دسته */}
      {cats.length === 0 && activeSell.length > 1 && (
        <button
          type="button"
          onClick={() => setCatsOpen(true)}
          className="mt-2 flex w-full items-center gap-2 rounded-xl border border-dashed bg-white/60 px-3 py-2.5 text-start text-[11.5px] text-muted-foreground transition hover:border-primary/50 hover:text-primary"
        >
          <Settings2 className="size-3.5 shrink-0" />
          کاتالوگ را دسته‌بندی کنید — مثل «هاشمی / طارم / فله»؛ مشتری سریع‌تر پیدا می‌کند.
        </button>
      )}

      {/* ═══ کارت‌های کالا — موبایل: گرید ۲ستونه / دسکتاپ: ردیف‌های افقی ═══ */}
      <section className="mt-4">
        {activeSell.length === 0 ? (
          <div className="rounded-2xl border border-dashed bg-white/70 p-10 text-center">
            <PackageOpen className="mx-auto size-8 text-stone-300" />
            <p className="mt-2 text-sm font-bold">هنوز کالایی در کاتالوگتان نیست</p>
            <p className="mt-1 text-xs leading-6 text-muted-foreground">
              اولین کالا را ثبت کنید تا ویترین شما برای مشتری‌ها ساخته شود.
            </p>
            <Button className="mt-4" onClick={() => router.push("/new?tab=sell")}>
              <Plus className="size-4" />
              ثبت اولین کالا
            </Button>
          </div>
        ) : filtered.length === 0 ? (
          <p className="rounded-2xl border border-dashed bg-white/70 p-8 text-center text-sm text-muted-foreground">
            چیزی مطابق جست‌وجو پیدا نشد.
          </p>
        ) : (
          <div className="grid grid-cols-2 items-stretch gap-2.5 sm:flex sm:flex-col sm:gap-2">
            {filtered.map((l) => (
              <CatalogCard key={l.id} listing={l} slug={slug} onSettings={() => setSettingsFor(l)} />
            ))}
          </div>
        )}
      </section>

      {/* ═══ ردیف کالای غیرفعال — «فعال‌سازی» یک‌ضربه‌ای ═══ */}
      {inactive.length > 0 && (
        <section className="mt-3.5 space-y-1.5">
          {inactive.map((l) => (
            <div
              key={l.id}
              className="flex items-center gap-2 rounded-xl border bg-white/60 px-3 py-2.5 text-[11.5px] text-muted-foreground"
            >
              <span className="rounded-full bg-stone-100 px-2.5 py-1 text-[10.5px] font-bold text-stone-500">
                غیرفعال
              </span>
              <span className="min-w-0 flex-1 truncate">
                {goodName(l.good)}
                {l.variantLabel ? ` — ${l.variantLabel}` : ""}
              </span>
              <ActivateButton listingId={l.id} />
            </div>
          ))}
        </section>
      )}

      {/* ═══ سینی «نیاز به تکمیل قیمت» — اسکن/کپی‌شده‌های بی‌قیمت ═══ */}
      {incomplete.length > 0 && (
        <section className="mt-6">
          <h2 className="mb-2 flex items-center gap-1.5 px-1 text-sm font-extrabold text-amber-700">
            <TriangleAlert className="size-4" />
            نیاز به تکمیل قیمت
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px]">{fa(incomplete.length)}</span>
          </h2>
          <p className="mb-3 px-1 text-[11px] leading-5 text-muted-foreground">
            این‌ها تا قیمت نگیرند در ویترین عمومی دیده نمی‌شوند — با یک ضربه قیمت و حداقل سفارش را بدهید.
          </p>
          <div className="grid gap-2">
            {incomplete.map((l) => (
              <button
                key={l.id}
                type="button"
                onClick={() => setSettingsFor(l)}
                className="flex w-full items-center gap-3 rounded-xl border bg-white p-2.5 text-start shadow-sm transition hover:border-amber-400/60 hover:bg-amber-50/40"
              >
                <span className="grid size-11 shrink-0 place-items-center overflow-hidden rounded-lg bg-accent/70 text-lg font-black text-primary/60">
                  {(l.gallery?.[0]?.thumbUrl ?? l.product?.imageUrl) ? (
                    <Image
                      src={(l.gallery?.[0]?.thumbUrl ?? l.product!.imageUrl)!}
                      alt=""
                      width={44}
                      height={44}
                      unoptimized
                      className="size-full object-cover"
                    />
                  ) : (
                    goodName(l.good).slice(0, 1)
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-extrabold">{goodName(l.good)}</span>
                  <span className="block truncate text-[11px] text-muted-foreground">
                    {l.variantLabel ? `${l.variantLabel} · ` : ""}بدون قیمت — تکمیل کنید
                  </span>
                </span>
                <TriangleAlert className="size-4 shrink-0 text-amber-500" />
              </button>
            ))}
          </div>
        </section>
      )}

      {settingsFor && (
        <ProductSettingsDialog
          listing={settingsFor}
          bizId={bizId}
          currency={biz.currency ?? "IRR"}
          customCategories={cats}
          open
          onOpenChange={(o) => !o && setSettingsFor(null)}
        />
      )}
      <CategoryManagerDialog
        key={catsOpen ? "cats-open" : "cats-closed"}
        bizId={bizId}
        categories={cats}
        open={catsOpen}
        onOpenChange={setCatsOpen}
      />
      <ShareDialog kind="sell" slug={slug} bizName={biz.name} open={shareOpen} onOpenChange={setShareOpen} />
    </>
  );
}

// ─── فعال‌سازی یک‌ضربه‌ای از ردیف غیرفعال ───
function ActivateButton({ listingId }: { listingId: string }) {
  const { toast } = useToast();
  const activate = useSetListingActive();
  return (
    <button
      type="button"
      disabled={activate.isPending}
      onClick={() => {
        activate.mutate(
          { id: listingId, active: true },
          {
            onSuccess: () => toast({ title: "فعال شد", description: "به ویترین برگشت." }),
            onError: (e) => toast({ title: e.message || "ناموفق بود", variant: "destructive" }),
          }
        );
      }}
      className="shrink-0 font-bold text-green-600 transition hover:underline disabled:opacity-50"
    >
      {activate.isPending ? "…" : "فعال‌سازی"}
    </button>
  );
}

// ─── کارت کالا — موبایل: عمودی / دسکتاپ: ردیف افقی (بهبود d1) ───
function CatalogCard({
  listing: l,
  slug,
  onSettings,
}: {
  listing: GoodItemDto;
  slug: string;
  onSettings: () => void;
}) {
  const photo = l.gallery?.[0] ?? (l.product?.imageUrl ? { url: l.product.imageUrl, thumbUrl: l.product.imageUrl } : null);
  const name = goodName(l.good);
  const unit = unitLabel(l.good.unit);
  const badge = stockBadge(l);
  const href = `/sell/${slug}/${l.id}`;

  return (
    <article className="group relative overflow-hidden rounded-2xl border bg-white shadow-sm transition hover:shadow-md sm:flex sm:items-center sm:gap-3 sm:rounded-xl sm:px-3 sm:py-2.5">
      <Link href={href} className="block sm:contents">
        {/* تصویر / کاشی واریانت */}
        <span className="relative block aspect-[4/3] w-full overflow-hidden bg-gradient-to-br from-[#f3f1ea] to-[#e9e5db] sm:grid sm:size-14 sm:shrink-0 sm:place-items-center sm:rounded-lg sm:aspect-auto">
          {photo ? (
            <Image
              src={photo.thumbUrl ?? photo.url}
              alt={name}
              width={112}
              height={84}
              unoptimized
              className="h-full w-full object-cover sm:size-14 sm:rounded-lg"
            />
          ) : (
            <span className="absolute inset-0 grid place-items-center p-2 text-center text-[11px] font-bold text-stone-400 sm:static sm:line-clamp-3">
              {l.variantLabel ?? unit}
            </span>
          )}
        </span>

        {/* اطلاعات — موبایل: ستون / دسکتاپ: ردیف با فاصله */}
        <span className="block p-2.5 sm:flex sm:min-w-0 sm:flex-1 sm:items-center sm:gap-4 sm:p-0">
          <span className="block min-w-0 sm:flex-1">
            <span className="block truncate text-[12.5px] font-bold leading-5" title={name}>
              {name}
              {l.brand && <span className="ms-1 text-[10px] font-medium text-muted-foreground">{l.brand.name}</span>}
            </span>
            <span className="mt-0.5 block truncate text-[10px] text-muted-foreground">
              {/* طرح ۰۱ — کالای بی‌برند زیرنویسِ «فله» می‌گیرد («کیسه ۵۰ کیلویی · فله») */}
              {l.variantLabel
                ? `${l.variantLabel}${l.brand ? "" : " · فله"}`
                : categoryName(l.good.category)}
            </span>
          </span>

          <span className="mt-1.5 block sm:mt-0 sm:text-end">
            <span className="block text-[13px] font-bold sm:text-[15px]">
              {fmtMoney(l.priceMinor, l.currency)}
            </span>
            <span className="mt-0.5 block text-[9.5px] font-normal text-muted-foreground">
              هر {unit} · حداقل {fa(l.minOrder ?? 0)}
            </span>
          </span>

          {/* شاخص‌های کوچک مالک — بازدید ۳۰ روز + وضعیت موجودی */}
          <span className="mt-1.5 flex items-center gap-2.5 text-[10.5px] text-muted-foreground sm:mt-0 sm:shrink-0 sm:flex-col sm:items-end sm:gap-1">
            <span className="inline-flex items-center gap-1">
              <Eye className="size-3.5" />
              {fa(l.viewCount30 ?? 0)}
            </span>
            <span className={`rounded-full px-2.5 py-0.5 text-[10.5px] font-bold ${badge.cls}`}>
              {badge.label}
            </span>
          </span>
        </span>
      </Link>

      {/* چرخ‌دنده تنظیمات کالا */}
      <button
        type="button"
        onClick={onSettings}
        aria-label={`تنظیمات ${name}`}
        className="absolute end-1.5 top-1.5 grid size-7 place-items-center rounded-lg border-0 bg-white/95 text-stone-500 shadow-sm transition hover:text-primary sm:static sm:size-8 sm:shrink-0 sm:rounded-lg"
      >
        <Settings2 className="size-3.5 sm:size-4" />
      </button>
    </article>
  );
}
