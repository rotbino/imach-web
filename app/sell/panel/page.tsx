"use client";

import { Suspense, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useAuthStore } from "@/lib/auth-store";
import { setArmActive, useActiveBusiness } from "@/lib/active-biz";
import { AppFooter, AppHeader, MobileTabBar } from "@/app/components/chrome";
import { EmptyBox, InquiriesSection, StatsStrip } from "@/app/components/sections";
import { BizSettingsCard } from "@/app/components/biz-edit";
import { ExploreBuyRow, FeedSpinner } from "@/app/components/feed-cards";
import { useTabParam } from "@/app/components/url-tabs";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  useBuyRequests,
  useIncomingInquiries,
  useMyBusinesses,
  useMyListings,
  useMyFollowers,
} from "@/lib/queries";

/*
 * داشبورد کاتالوگ — محیط مدیریت دو‌برگه‌ای (خواسته‌ی کاربر):
 * ویترین دیگر بار مدیریتی ندارد؛ گزارش‌ها و تنظیمات این‌جاست:
 * • برگه‌ی «داشبورد»: آمار + استعلام‌های ورودی + تقاضای مرتبط
 * • برگه‌ی «تنظیمات»: ویرایش هدر (نام، شهر، نوع فعالیت)
 * • نویگیشن بالای صفحه خودش «کاتالوگ» را دارد — دکمه‌ی بازگشت دیگر لازم نیست.
 */

export default function SellPanelPage() {
  const router = useRouter();
  const { status } = useAuthStore();

  useEffect(() => {
    document.title = "داشبورد کاتالوگ | iMach";
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

  return <SellPanelBody />;
}

function SellPanelBody() {
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
          <Suspense fallback={<PanelTabsFallback />}>
            <SellPanelTabs bizId={active.id} slug={active.slug} name={active.name} city={active.city} />
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
      <Loader2 className="size-5 animate-spin text-primary" />
    </div>
  );
}

function SellPanelTabs({ bizId, slug, name, city }: { bizId: string; slug: string; name: string; city: string }) {
  // برگه‌ها با URL سینک‌اند: /sell/panel و /sell/panel?tab=settings
  const [tab, setTab] = useTabParam("dash", ["dash", "settings"]);
  const listingsQ = useMyListings(bizId);

  // استعلام‌ها برای «پیشنهاد خودکار قیمت» به کالاهای فروشی من نیاز دارند
  const sellListings = (listingsQ.data ?? [])
    .filter((l) => (l.mode === "SELL" || l.mode === "BOTH") && l.priceMinor !== null)
    .map((l) => ({ goodId: l.good.id, priceMinor: l.priceMinor, currency: l.currency }));

  return (
    <Tabs value={tab} onValueChange={setTab} className="mt-4">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="dash">داشبورد</TabsTrigger>
        <TabsTrigger value="settings">تنظیمات</TabsTrigger>
      </TabsList>

      {/* برگه‌ی داشبورد — آمار و گزارش‌ها */}
      <TabsContent value="dash" className="mt-5 space-y-8">
        <PanelStats bizId={bizId} />
        <InquiriesSection bizId={bizId} myCity={city} sellListings={sellListings} />
        <RelatedDemand bizId={bizId} />
        <PanelFooterHint slug={slug} name={name} />
      </TabsContent>

      {/* برگه‌ی تنظیمات — ویرایش هدر صفحه */}
      <TabsContent value="settings" className="mt-5">
        <PanelSettings bizId={bizId} />
      </TabsContent>
    </Tabs>
  );
}

// ─── آمار — کل وضعیت فروش یک‌جا ───

function PanelStats({ bizId }: { bizId: string }) {
  const listingsQ = useMyListings(bizId);
  const inquiriesQ = useIncomingInquiries(bizId);
  const followersQ = useMyFollowers(bizId);

  const sellCount = (listingsQ.data ?? []).filter(
    (l) => (l.mode === "SELL" || l.mode === "BOTH") && l.priceMinor !== null
  ).length;
  const unread = inquiriesQ.data?.unreadCount ?? 0;
  const followers = followersQ.data?.length ?? 0;

  return (
    <StatsStrip
      stats={[
        { label: "کالاهای فروشی", value: sellCount },
        { label: "دنبال‌کننده", value: followers },
        { label: "درخواست باز", value: unread, accent: true },
      ]}
    />
  );
}

// ─── تقاضای مرتبط — موتور تطبیق، تقاضا را به من می‌آورد ───

function RelatedDemand({ bizId }: { bizId: string }) {
  const demandQ = useBuyRequests(bizId);
  const demand = demandQ.data ?? [];

  return (
    <section>
      <h2 className="mb-3 text-base font-extrabold">تقاضای مرتبط با کالاهای من</h2>
      {demandQ.isLoading ? (
        <FeedSpinner />
      ) : demand.length === 0 ? (
        <EmptyBox text="فعلا درخواست خرید مرتبطی نیست. کاتالوگ کامل‌تر، تقاضای بیشتر می‌آورد." />
      ) : (
        <div className="space-y-3">
          {demand.slice(0, 12).map((l) => (
            <ExploreBuyRow key={l.id} item={l} />
          ))}
        </div>
      )}
    </section>
  );
}

function PanelFooterHint({ slug, name }: { slug: string; name: string }) {
  return (
    <EmptyBox
      text={`لینک کاتالوگ «${name}» را برای مشتری‌هایتان بفرستید؛ هر ثبت‌نام از لینک شما، مشتری شما می‌شود.`}
      action={
        <span className="flex items-center gap-4 text-xs font-bold">
          <Link href="/sell/customers" className="text-primary hover:underline">
            مشتریان من
          </Link>
          <Link href={`/sell/${slug}`} className="text-muted-foreground hover:text-primary hover:underline">
            دیدن کاتالوگ عمومی
          </Link>
        </span>
      }
    />
  );
}

// ─── برگه‌ی تنظیمات — ویرایش هدر (عنوان، شهر، نوع فعالیت) ───

function PanelSettings({ bizId }: { bizId: string }) {
  const bizQ = useMyBusinesses();
  const biz = (bizQ.data ?? []).find((b) => b.id === bizId);

  if (!biz) {
    return (
      <div className="grid place-items-center py-16">
        <Loader2 className="size-5 animate-spin text-primary" />
      </div>
    );
  }
  return <BizSettingsCard biz={biz} />;
}
