"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/auth-store";
import { setArmActive, useActiveBusiness } from "@/lib/active-biz";
import { AppFooter, AppHeader, MobileTabBar } from "@/app/components/chrome";
import { NoBusinessState } from "@/app/components/no-business";
import { WelcomeModal } from "@/app/components/welcome-modal";
import { ApiError, type GoodItemDto } from "@/lib/api";
import { fa, activityTypeLabel, categoryName, frequencyLabel, goodName, unitLabel } from "@/lib/format";
import { useMyBusinesses, useMyListings, useQuoteRequest } from "@/lib/queries";
import { ShareDialog } from "@/app/components/share";
import { CatalogHeaderPrompt } from "@/app/components/catalog-header-prompt";
import { SetPasswordButton } from "@/app/components/set-password-button";
import { OwnerLineEditable } from "@/app/components/owner-edit";
import { BuyItemSettingsDialog } from "./item-settings";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  BadgeCheck,
  Briefcase,
  ClipboardList,
  LayoutDashboard,
  Loader2,
  Plus,
  Radio,
  Share2,
  Settings2,
  TriangleAlert,
} from "lucide-react";

/*
 * دستیار خرید — ویترین لیست خرید (خواسته‌ی کاربر: «اول ویترین، بعد ابزار»):
 * • اتاق کار خریدار = لیست خریدی که با تامین‌کننده‌ها به اشتراک می‌گذارید؛
 *   خرید جدید · اشتراک‌گذاری · قیمت‌گیری · چرخ‌دنده‌ی هر آیتم — همه مستقیم این‌جا.
 * • داشبورد و تنظیمات هدر → «داشبورد» (/buy/panel) با دکمه بازگشت.
 */

export default function BuyPage() {
  const router = useRouter();
  const { status } = useAuthStore();

  useEffect(() => {
    document.title = "دستیار خرید | iMach";
    setArmActive("buy");
    if (status === "guest") router.replace("/start");
  }, [status, router]);

  if (status !== "authed") {
    return (
      <div className="flex min-h-screen flex-col">
        <AppHeader />
        <main className="grow">
          <div className="grid place-items-center py-32">
            <Loader2 className="size-6 animate-spin text-stone-700" />
          </div>
        </main>
        <AppFooter />
        <MobileTabBar />
      </div>
    );
  }

  return <BuyBody />;
}

function BuyBody() {
  const active = useActiveBusiness();
  const bizQ = useMyBusinesses();

  if (bizQ.isLoading) {
    return (
      <div className="grid place-items-center py-32">
        <Loader2 className="size-6 animate-spin text-stone-700" />
      </div>
    );
  }

  if (!active) return <NoBusinessState variant="buy" />;

  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader />
      <WelcomeModal />
      <main className="grow">
        <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6">
          <ShowcaseHeader
            bizId={active.id}
            slug={active.slug}
            name={active.name}
            city={active.city}
            trade={active.trade ?? null}
            activityType={active.activityType}
            isVerified={active.isVerified}
            currency={active.currency ?? "IRR"}
            biz={active}
          />
        </div>
      </main>
      <AppFooter />
      <MobileTabBar />
    </div>
  );
}

// ─── ویترین لیست خرید — هدر + آیتم‌ها + ابزارهای مستقیم ───

function ShowcaseHeader({
  bizId,
  slug,
  name,
  city,
  trade,
  activityType,
  isVerified,
  currency,
  biz,
}: {
  bizId: string;
  slug: string;
  name: string;
  city: string;
  trade: string | null;
  activityType: string | null;
  isVerified: boolean;
  currency: string;
  biz: import("@/lib/api").BusinessSummaryDto;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const user = useAuthStore((s) => s.user);
  const listingsQ = useMyListings(bizId);
  const quoteRequest = useQuoteRequest();

  const [settingsFor, setSettingsFor] = useState<GoodItemDto | null>(null);
  const [shareOpen, setShareOpen] = useState(false);

  // دو طبقه در خرید هم (خواسته‌ی کاربر: «برای خرید هم همینطور») — کامل بالا،
  // بی‌حجم پایین در سینی «نیاز به تکمیل مقدار» با نشان هشدار
  const listings = (listingsQ.data ?? []).filter(
    (l) => (l.mode === "BUY" || l.mode === "BOTH") && l.volume !== null
  );
  const incomplete = (listingsQ.data ?? []).filter(
    (l) => (l.mode === "BUY" || l.mode === "BOTH") && l.volume === null
  );

  const activateQuote = (l: GoodItemDto) => {
    quoteRequest.mutate(
      { listingId: l.id },
      {
        onSuccess: (res) =>
          toast({ title: "قیمت‌گیری انجام شد", description: `${fa(res.created)} تامین‌کننده برای «${goodName(l.good)}» پیشنهاد دادند.` }),
        onError: (e) =>
          toast({ title: "قیمت‌گیری ناموفق بود", description: e instanceof ApiError ? e.message : "دوباره تلاش کنید", variant: "destructive" }),
      }
    );
  };

  const toolBtn =
    "grid size-9 place-items-center rounded-xl text-muted-foreground transition hover:bg-accent hover:text-foreground";

  // آیا نام کسب‌وکار placeholder است؟ «کاتالوگ شما» یا بدون صنف/شهر
  const isPlaceholder = name === "کاتالوگ شما" || !trade || city === "—";

  return (
    <>
      {/* نوار ابزار تخت — خرید جدید + دکمه چشمک‌زن ثبت پسورد + داشبورد و اشتراک‌گذاری */}
      <div className="mb-3 flex items-center justify-between gap-2 rounded-2xl border bg-white p-1.5 shadow-sm">
        <div className="flex items-center gap-1.5">
          <Button
            size="sm"
            onClick={() => router.push("/new?tab=buy")}
            className="gap-1 bg-stone-800 hover:bg-stone-900"
          >
            <Plus className="size-4" />
            خرید جدید
          </Button>
          <SetPasswordButton variant="header" />
        </div>
        <div className="flex items-center">
          <button
            type="button"
            onClick={() => setShareOpen(true)}
            aria-label="اشتراک‌گذاری لیست خرید"
            className={toolBtn}
          >
            <Share2 className="size-4.5" />
          </button>
          <button
            type="button"
            onClick={() => router.push("/buy/panel")}
            aria-label="داشبورد و تنظیمات"
            className={toolBtn}
          >
            <LayoutDashboard className="size-4.5" />
          </button>
        </div>
      </div>

      {/* هدر لیست خرید — اگر placeholder، «عنوان دستیار خرید را وارد کنید» نشان بده */}
      <section className="rounded-3xl border bg-white p-5 text-center shadow-sm sm:p-7">
        <div className="flex flex-col items-center">
          <span className="grid size-20 place-items-center rounded-3xl bg-stone-800/10 text-4xl font-black text-stone-700 shadow-inner">
            {name === "کاتالوگ شما" ? "?" : name.slice(0, 1)}
          </span>
          {isPlaceholder ? (
            <CatalogHeaderPrompt biz={biz} variant="buy" />
          ) : (
            <h1 className="mt-3 flex items-center gap-1.5 text-2xl font-black">
              {name}
              {isVerified && <BadgeCheck className="size-5 text-stone-600" aria-label="تاییدشده" />}
            </h1>
          )}
          <div className="mt-2 flex flex-wrap items-center justify-center gap-2 text-xs text-muted-foreground">
            {activityType && (
              <Badge variant="outline" className="border-stone-300 bg-stone-50 text-stone-700">
                <Briefcase className="size-3" />
                {activityTypeLabel(activityType)}
              </Badge>
            )}
            <CatalogHeaderPrompt biz={biz} variant="buy" />
          </div>
          {/* نام مالک زیر عنوان — با مداد برای ویرایش نام و عکس */}
          {user && (
            <OwnerLineEditable
              owner={{
                id: user.id,
                name: user.name,
                firstName: user.firstName,
                lastName: user.lastName,
              }}
              isOwner={true}
            />
          )}

          <div className="mt-4 flex items-center gap-8 text-center" aria-label="آمار لیست خرید">
            <div>
              <p className="text-lg font-black">{fa(listings.length)}</p>
              <p className="text-[11px] text-muted-foreground">کالا</p>
            </div>
          </div>
        </div>
      </section>

      {/* آیتم‌های نیاز خرید — قیمت‌گیری و چرخ‌دنده مستقیم روی هر آیتم */}
      <section className="mt-6">
        <h2 className="mb-3 flex items-center gap-1.5 px-1 text-sm font-extrabold text-muted-foreground">
          <ClipboardList className="size-4 text-stone-700" />
          لیست خرید عمده من
        </h2>

        {listings.length === 0 ? (
          <div className="rounded-3xl border border-dashed bg-white/70 p-10 text-center">
            <p className="text-sm text-muted-foreground">هنوز نیاز خریدی ثبت نکرده‌اید.</p>
            <Button className="mt-4 bg-stone-800 hover:bg-stone-900" onClick={() => router.push("/new?tab=buy")}>
              <Plus className="size-4" />
              ثبت اولین نیاز خرید
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {listings.map((l) => {
              // اولین عکس گالری — هم‌راستا با ویترین عمومی خرید (هر جا کارت کالا هست، عکس هم هست)
              const photo = l.gallery?.[0];
              return (
              <article
                key={l.id}
                className="animate-fade-up flex items-center gap-3 rounded-2xl border bg-white p-4 shadow-sm"
              >
                {photo ? (
                  /* تامبنیل ابر آروان — unoptimized تا next/image سرِ هاست‌کانفیگ کرش نکند */
                  <Image
                    src={photo.thumbUrl ?? photo.url}
                    alt={goodName(l.good)}
                    width={44}
                    height={44}
                    unoptimized
                    className="size-11 shrink-0 rounded-xl object-cover"
                  />
                ) : (
                  <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-stone-100 text-lg font-black text-stone-600">
                    {goodName(l.good).slice(0, 1)}
                  </span>
                )}
                <div className="min-w-0 grow">
                  <p className="truncate font-extrabold" title={goodName(l.good)}>
                    {goodName(l.good)}
                    {l.brand && <span className="ms-1.5 text-[11px] font-medium text-muted-foreground">{l.brand.name}</span>}
                  </p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">{categoryName(l.good.category)}</p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                    <Badge variant="outline" className="border-stone-300 bg-stone-50 text-stone-700">
                      {fa(l.volume ?? 0)} {unitLabel(l.good.unit)}
                    </Badge>
                    <Badge variant="outline" className="border-stone-300 bg-stone-50 text-stone-700">
                      {frequencyLabel(l.frequency ?? "MONTHLY")}
                    </Badge>
                  </div>
                </div>
                <div className="flex shrink-0 items-center">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => activateQuote(l)}
                    disabled={quoteRequest.isPending}
                    aria-label={`قیمت‌گیری ${goodName(l.good)}`}
                    className="gap-1 text-stone-700"
                  >
                    <Radio className="size-4" />
                    قیمت‌گیری
                  </Button>
                  <button
                    type="button"
                    onClick={() => setSettingsFor(l)}
                    aria-label={`تنظیمات ${goodName(l.good)}`}
                    className="grid size-8 place-items-center rounded-xl text-muted-foreground transition hover:bg-accent hover:text-foreground"
                  >
                    <Settings2 className="size-4" />
                  </button>
                </div>
              </article>
              );
            })}
          </div>
        )}
      </section>

      {/* سینی «نیاز به تکمیل مقدار» — آیتم‌های اسکن/تیک‌شده که هنوز حجم ندارند */}
      {incomplete.length > 0 && (
        <section className="mt-6">
          <h2 className="mb-2 flex items-center gap-1.5 px-1 text-sm font-extrabold text-amber-700">
            <TriangleAlert className="size-4" />
            نیاز به تکمیل مقدار
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px]">{fa(incomplete.length)}</span>
          </h2>
          <p className="mb-3 px-1 text-[11px] leading-5 text-muted-foreground">
            مقدار خرید این‌ها را بدهید تا در قیمت‌گیری و لیست اصلی بالا بیایند.
          </p>
          <div className="space-y-2">
            {incomplete.map((l) => {
              const photo = l.gallery?.[0];
              return (
                <button
                  key={l.id}
                  type="button"
                  onClick={() => setSettingsFor(l)}
                  className="flex w-full items-center gap-3 rounded-xl border bg-white p-3 text-start shadow-sm transition hover:border-amber-400/60 hover:bg-amber-50/40"
                >
                  {photo ? (
                    <Image src={photo.thumbUrl ?? photo.url} alt="" width={44} height={44} unoptimized className="size-11 shrink-0 rounded-xl object-cover" />
                  ) : (
                    <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-stone-100 text-lg font-black text-stone-500">
                      {goodName(l.good).slice(0, 1)}
                    </span>
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-extrabold">{goodName(l.good)}</span>
                    <span className="block truncate text-[11px] text-muted-foreground">بدون مقدار — تکمیل کنید</span>
                  </span>
                  <TriangleAlert className="size-4 shrink-0 text-amber-500" />
                </button>
              );
            })}
          </div>
        </section>
      )}

      {settingsFor && (
        <BuyItemSettingsDialog
          listing={settingsFor}
          bizId={bizId}
          currency={currency}
          open
          onOpenChange={(o) => !o && setSettingsFor(null)}
        />
      )}
      <ShareDialog kind="buy" slug={slug} bizName={name} open={shareOpen} onOpenChange={setShareOpen} />
    </>
  );
}
