"use client";

import { Suspense, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, Package } from "lucide-react";
import { useAuthStore } from "@/lib/auth-store";
import { setArmActive, useActiveBusiness } from "@/lib/active-biz";
import { AppFooter, AppHeader, MobileTabBar } from "@/app/components/chrome";
import { SetPasswordButton } from "@/app/components/set-password-button";
import { BoardSection, EmptyBox, FollowCard, OffersSection, StatsStrip } from "@/app/components/sections";
import { BizSettingsCard } from "@/app/components/biz-edit";
import { useTabParam } from "@/app/components/url-tabs";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import type { SupplierSuggestionDto } from "@/lib/api";
import { fmtMoney } from "@/lib/format";
import {
  useFollows,
  useFollowToggle,
  useMyBusinesses,
  useMyListings,
  useOffers,
  useSupplierSuggestions,
} from "@/lib/queries";

/*
 * داشبورد دستیار خرید — محیط مدیریت دو‌برگه‌ای (خواسته‌ی کاربر):
 * • برگه‌ی «داشبورد»: آمار + پیشنهادهای دریافتی + تامین‌کننده‌های پیشنهادی + تابلوهای دنبال‌شده
 * • برگه‌ی «تنظیمات»: ویرایش هدر (نام، شهر، نوع فعالیت)
 * • نویگیشن بالای صفحه خودش «دستیار خرید» را دارد — دکمه‌ی بازگشت دیگر لازم نیست.
 */

export default function BuyPanelPage() {
  const router = useRouter();
  const { status } = useAuthStore();

  useEffect(() => {
    document.title = "داشبورد خرید | iMach";
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

  return <BuyPanelBody />;
}

function BuyPanelBody() {
  const active = useActiveBusiness();
  const bizQ = useMyBusinesses();

  if (bizQ.isLoading) {
    return (
      <div className="grid place-items-center py-32">
        <Loader2 className="size-6 animate-spin text-stone-700" />
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
              className="mt-4 rounded-xl bg-stone-800 px-5 py-2.5 text-sm font-bold text-white shadow-sm"
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
          <Suspense fallback={<PanelTabsFallback />}>
            <BuyPanelTabs bizId={active.id} city={active.city} />
          </Suspense>
        </div>
      </main>
      <AppFooter />
      <MobileTabBar />
    </div>
  );
}

function PanelTabsFallback() {
  return (
    <div className="grid place-items-center py-24">
      <Loader2 className="size-5 animate-spin text-stone-700" />
    </div>
  );
}

function BuyPanelTabs({ bizId, city }: { bizId: string; city: string }) {
  // برگه‌ها با URL سینک‌اند: /buy/panel و /buy/panel?tab=settings
  const [tab, setTab] = useTabParam("dash", ["dash", "settings"]);

  return (
    <Tabs value={tab} onValueChange={setTab} className="mt-4">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="dash">داشبورد</TabsTrigger>
        <TabsTrigger value="settings">تنظیمات</TabsTrigger>
      </TabsList>

      {/* برگه‌ی داشبورد — خبرها و گزارش‌های خرید */}
      <TabsContent value="dash" className="mt-5 space-y-8">
        {/* باکس چشمک‌زن قرمز ملایم «ثبت رمز عبور» — فقط برای کاربران ثبت‌نام سریع */}
        <SetPasswordPrompt />
        <PanelStats bizId={bizId} />
        <SuggestedSuppliers bizId={bizId} />
        <OffersSection bizId={bizId} myCity={city} />
        <BoardSection bizId={bizId} />
        <FollowCard kind="following" bizId={bizId} />
      </TabsContent>

      {/* برگه‌ی تنظیمات — ویرایش هدر صفحه */}
      <TabsContent value="settings" className="mt-5">
        <PanelSettings bizId={bizId} />
      </TabsContent>
    </Tabs>
  );
}

// ─── آمار — کل وضعیت خرید یک‌جا ───

function SetPasswordPrompt() {
  const user = useAuthStore((s) => s.user);
  if (!user || user.passwordSet !== false) return null;
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-red-200 bg-red-50/50 px-4 py-3 animate-pulse">
      <div>
        <p className="text-sm font-bold text-red-700">رمز عبور هنوز ثبت نشده</p>
        <p className="mt-0.5 text-[11px] leading-5 text-red-600/80">
          برای ورود از دستگاه‌های دیگر، یک رمز عبور انتخاب کن.
        </p>
      </div>
      <SetPasswordButton variant="panel" />
    </div>
  );
}

function PanelStats({ bizId }: { bizId: string }) {
  const listingsQ = useMyListings(bizId);
  const offersQ = useOffers(bizId);
  const followsQ = useFollows(bizId);

  // همه‌ی نیازهای خرید — آیتم‌های بدونِ مقدار هم نیازند (لیست خرید کم‌کم تشکیل می‌شود)
  const buyCount = (listingsQ.data ?? []).filter(
    (l) => l.mode === "BUY" || l.mode === "BOTH"
  ).length;
  const freshOffers = offersQ.data?.items.length ?? 0;
  const following = followsQ.data?.length ?? 0;

  return (
    <StatsStrip
      stats={[
        { label: "نیازهای خرید", value: buyCount },
        { label: "دنبال‌شونده", value: following },
        { label: "پیشنهاد تازه", value: freshOffers, accent: true },
      ]}
    />
  );
}

// ─── تامین‌کننده‌های پیشنهادی — موتور دنبال کردن سمت خرید ───

function SuggestedSuppliers({ bizId }: { bizId: string }) {
  const { toast } = useToast();
  const suggestionsQ = useSupplierSuggestions(bizId);
  const followsQ = useFollows(bizId);
  const followToggle = useFollowToggle();

  const items = suggestionsQ.data ?? [];
  const followedIds = useMemo(() => new Set((followsQ.data ?? []).map((f) => f.supplierId)), [followsQ.data]);

  const toggleFollow = (s: SupplierSuggestionDto) => {
    const wasFollowed = followedIds.has(s.supplierId);
    followToggle.mutate(
      { businessId: bizId, supplierId: s.supplierId, follow: !wasFollowed },
      {
        onSuccess: () =>
          toast({
            title: wasFollowed ? `${s.supplierName} دنبال نمی‌شود` : `${s.supplierName} دنبال شد`,
            description: wasFollowed ? undefined : "قیمت‌هایش در «تابلوهای دنبال‌شده» جمع می‌شود.",
          }),
      }
    );
  };

  if (suggestionsQ.isLoading) return null;
  if (items.length === 0) return null;

  return (
    <section>
      <p className="mb-3 flex items-center gap-1.5 text-base font-extrabold">
        <Package className="size-4.5 text-primary" />
        تامین‌کننده‌های پیشنهادی برای نیازهای شما
      </p>
      <div className="space-y-3">
        {items.map((s) => (
          <SupplierRow
            key={s.listingId}
            s={s}
            followed={followedIds.has(s.supplierId)}
            onFollow={() => toggleFollow(s)}
            busy={followToggle.isPending}
          />
        ))}
      </div>
    </section>
  );
}

function SupplierRow({
  s,
  followed,
  onFollow,
  busy,
}: {
  s: SupplierSuggestionDto;
  followed: boolean;
  onFollow: () => void;
  busy: boolean;
}) {
  return (
    <div className="animate-fade-up flex flex-wrap items-center justify-between gap-2 rounded-2xl border bg-white p-4 shadow-sm">
      <Link href={`/sell/${s.supplierSlug}`} className="flex min-w-0 items-center gap-2.5">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-base font-black text-primary">
          {s.supplierName.slice(0, 1)}
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-bold">{s.supplierName}</p>
          <p className="truncate text-[11px] text-muted-foreground">
            {s.supplierCity} · {s.goodName}
          </p>
        </div>
      </Link>
      <div className="flex items-center gap-3">
        <div className="text-end">
          <p className="text-sm font-black text-primary">{fmtMoney(s.priceMinor, s.currency)}</p>
          <p className="text-[11px] text-muted-foreground">
            هر {s.unit} · حداقل {s.minOrder}
          </p>
        </div>
        <Button size="sm" variant={followed ? "secondary" : "outline"} onClick={onFollow} disabled={busy}>
          {followed ? "دنبال می‌شود" : "دنبال کردن"}
        </Button>
      </div>
    </div>
  );
}

// ─── برگه‌ی تنظیمات — ویرایش هدر (عنوان، شهر، نوع فعالیت) ───

function PanelSettings({ bizId }: { bizId: string }) {
  const bizQ = useMyBusinesses();
  const biz = (bizQ.data ?? []).find((b) => b.id === bizId);

  if (!biz) {
    return (
      <div className="grid place-items-center py-16">
        <Loader2 className="size-5 animate-spin text-stone-700" />
      </div>
    );
  }
  return <BizSettingsCard biz={biz} />;
}
