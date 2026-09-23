"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/auth-store";
import { setArmActive, useActiveBusiness } from "@/lib/active-biz";
import { AppFooter, AppHeader, MobileTabBar } from "@/app/components/chrome";
import { fa, activityTypeLabel, categoryName, fmtMoney, goodName, unitLabel } from "@/lib/format";
import { useMyBusinesses, useMyListings } from "@/lib/queries";
import type { GoodItemDto } from "@/lib/api";
import { ShareDialog } from "@/app/components/share";
import { ProductSettingsDialog } from "./product-settings";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  BadgeCheck,
  Briefcase,
  LayoutDashboard,
  Loader2,
  MapPin,
  Package,
  Plus,
  Share2,
  Settings2,
} from "lucide-react";

/*
 * کاتالوگ فروش من — ویترین (خواسته‌ی کاربر: «اولین چیزی که می‌بینی ویترین است»):
 * مدیریت و نمایش یکی‌اند — WYSIWYG، مثل اینستاگرام:
 * • همه‌چیزِ مدیریتی مستقیم روی خود ویترین است:
 *   کالای جدید · اشتراک‌گذاری لینک · چرخ‌دنده‌ی هر کالا (تنظیمات + حذف)
 * • داشبورد و تنظیمات هدر → «داشبورد» (/sell/panel) با دکمه بازگشت.
 */

export default function SellPage() {
  const router = useRouter();
  const { status } = useAuthStore();

  useEffect(() => {
    document.title = "کاتالوگ فروش من | iMach";
    setArmActive("sell");
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

  if (!active) {
    return (
      <div className="flex min-h-screen flex-col">
        <AppHeader />
        <main className="grow">
          <div className="mx-auto max-w-xl px-4 py-16 text-center">
            <p className="text-lg font-extrabold">اول کسب‌وکارتان را بسازید</p>
            <p className="mt-2 text-sm text-muted-foreground">فقط نام و شهر — بقیه‌اش با ما.</p>
            <button
              onClick={() => (window.location.href = "/start?mode=register")}
              className="mt-4 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground shadow-sm"
            >
              ساخت کسب‌وکار
            </button>
          </div>
        </main>
        <AppFooter />
        <MobileTabBar />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader />
      <main className="grow">
        <div className="mx-auto max-w-2xl px-4 py-6">
          <ShowcaseHeader
            bizId={active.id}
            slug={active.slug}
            name={active.name}
            city={active.city}
            activityType={active.activityType}
            isVerified={active.isVerified}
            currency={active.currency ?? "IRR"}
          />
        </div>
      </main>
      <AppFooter />
      <MobileTabBar />
    </div>
  );
}

// ─── ویترین — هدر کاتالوگ + آلبوم کالاها + ابزارهای مستقیم ───

function ShowcaseHeader({
  bizId,
  slug,
  name,
  city,
  activityType,
  isVerified,
  currency,
}: {
  bizId: string;
  slug: string;
  name: string;
  city: string;
  activityType: string | null;
  isVerified: boolean;
  currency: string;
}) {
  const router = useRouter();
  const listingsQ = useMyListings(bizId);
  const [settingsFor, setSettingsFor] = useState<GoodItemDto | null>(null);
  const [shareOpen, setShareOpen] = useState(false);

  const listings = (listingsQ.data ?? []).filter(
    (l) => (l.mode === "SELL" || l.mode === "BOTH") && l.priceMinor !== null
  );

  const toolBtn =
    "grid size-9 place-items-center rounded-xl text-muted-foreground transition hover:bg-accent hover:text-primary";

  return (
    <>
      {/* نوار ابزار تخت — کالای جدید یک‌سر، داشبورد و اشتراک‌گذاری آن‌سر */}
      <div className="mb-3 flex items-center justify-between rounded-2xl border bg-white p-1.5 shadow-sm">
        <Button size="sm" onClick={() => router.push("/new?tab=sell")} className="gap-1">
          <Plus className="size-4" />
          کالای جدید
        </Button>
        <div className="flex items-center">
          <button
            type="button"
            onClick={() => setShareOpen(true)}
            aria-label="اشتراک‌گذاری کاتالوگ"
            className={toolBtn}
          >
            <Share2 className="size-4.5" />
          </button>
          <button
            type="button"
            onClick={() => router.push("/sell/panel")}
            aria-label="داشبورد و تنظیمات"
            className={toolBtn}
          >
            <LayoutDashboard className="size-4.5" />
          </button>
        </div>
      </div>

      {/* هدر کاتالوگ — همان چیزی که مشتری می‌بیند */}
      <section className="rounded-3xl border bg-white p-5 text-center shadow-sm sm:p-7">
        <div className="flex flex-col items-center">
          <span className="grid size-20 place-items-center rounded-3xl bg-primary/10 text-4xl font-black text-primary shadow-inner">
            {name.slice(0, 1)}
          </span>
          <h1 className="mt-3 flex items-center gap-1.5 text-2xl font-black">
            {name}
            {isVerified && <BadgeCheck className="size-5 text-primary" aria-label="تاییدشده" />}
          </h1>
          <div className="mt-2 flex flex-wrap items-center justify-center gap-2 text-xs text-muted-foreground">
            {activityType && (
              <Badge variant="outline" className="border-primary/25 bg-accent text-primary">
                <Briefcase className="size-3" />
                {activityTypeLabel(activityType)}
              </Badge>
            )}
            <span className="flex items-center gap-1">
              <MapPin className="size-3.5" />
              {city}
            </span>
          </div>

          <div className="mt-4 flex items-center gap-8 text-center" aria-label="آمار کاتالوگ">
            <div>
              <p className="text-lg font-black">{fa(listings.length)}</p>
              <p className="text-[11px] text-muted-foreground">کالا</p>
            </div>
          </div>
        </div>
      </section>

      {/* آلبوم کالاها — هر کالا چرخ‌دنده‌ی تنظیمات خودش را دارد */}
      <section className="mt-6">
        <h2 className="mb-3 flex items-center gap-1.5 px-1 text-sm font-extrabold text-muted-foreground">
          <Package className="size-4 text-primary" />
          کالاهای فروشی
        </h2>

        {listings.length === 0 ? (
          <div className="rounded-3xl border border-dashed bg-white/70 p-10 text-center">
            <p className="text-sm text-muted-foreground">هنوز کالایی در کاتالوگتان نیست.</p>
            <Button className="mt-4" onClick={() => router.push("/new?tab=sell")}>
              <Plus className="size-4" />
              ثبت اولین کالا
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {listings.map((l) => (
              <article
                key={l.id}
                className="animate-fade-up overflow-hidden rounded-2xl border bg-white shadow-sm transition hover:shadow-md"
              >
                <div className="relative grid aspect-[4/3] place-items-center bg-gradient-to-br from-accent/70 via-accent/30 to-transparent">
                  <span className="text-5xl font-black text-primary/20" aria-hidden>
                    {goodName(l.good).slice(0, 1)}
                  </span>
                  {/* چرخ‌دنده — مستقیم روی خود کالا، مثل ویرایش همین‌جا */}
                  <button
                    type="button"
                    onClick={() => setSettingsFor(l)}
                    aria-label={`تنظیمات ${goodName(l.good)}`}
                    className="absolute end-2 top-2 grid size-8 place-items-center rounded-xl border bg-white/95 text-muted-foreground shadow-sm transition hover:text-primary"
                  >
                    <Settings2 className="size-4" />
                  </button>
                </div>
                <div className="p-3">
                  <p className="truncate font-extrabold" title={goodName(l.good)}>
                    {goodName(l.good)}
                    {l.brand && <span className="ms-1.5 text-[11px] font-medium text-muted-foreground">{l.brand.name}</span>}
                  </p>
                  {/* واریانت — همان کالای مرجع با مشخصات متفاوت («۵۰۰ گرمی · کارتن») */}
                  {l.variantLabel && (
                    <p className="mt-0.5 truncate text-[11px] font-bold text-primary/70">{l.variantLabel}</p>
                  )}
                  <p className="mt-0.5 text-[11px] text-muted-foreground">{categoryName(l.good.category)}</p>
                  <p className="mt-2 text-lg font-black text-primary">
                    {fmtMoney(l.priceMinor, l.currency)}
                  </p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    هر {unitLabel(l.good.unit)} · حداقل {fa(l.minOrder ?? 0)} {unitLabel(l.good.unit)}
                  </p>
                  <Badge variant="secondary" className="mt-2">
                    موجودی: {fa(l.stock ?? 0)}
                  </Badge>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {settingsFor && (
        <ProductSettingsDialog
          listing={settingsFor}
          bizId={bizId}
          currency={currency}
          open
          onOpenChange={(o) => !o && setSettingsFor(null)}
        />
      )}
      <ShareDialog kind="sell" slug={slug} bizName={name} open={shareOpen} onOpenChange={setShareOpen} />
    </>
  );
}
