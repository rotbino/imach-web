"use client";

import { Suspense, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Inbox, Loader2 } from "lucide-react";
import { useAuthStore } from "@/lib/auth-store";
import { setArmActive, useActiveBusiness } from "@/lib/active-biz";
import { AppFooter, AppHeader, MobileTabBar } from "@/app/components/chrome";
import { NoBusinessState } from "@/app/components/no-business";
import { EmptyBox, StatsStrip } from "@/app/components/sections";
import { BizSettingsCard } from "@/app/components/biz-edit";
import { useTabParam } from "@/app/components/url-tabs";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useIncomingInquiries, useMyBusinesses, useMyFollowers, useMyListings } from "@/lib/queries";

/*
 * داشبورد کاتالوگ — محیط مدیریت دو‌برگه‌ای:
 * • «داشبورد»: آمار + ورودی درخواست‌های قیمت (فاز ۴: پاسخ‌دهی به صفحه‌ی مستقل منتقل شد)
 * • «تنظیمات»: ویرایش هدر (نام، شهر، نوع فعالیت)
 * این صفحه در فاز ۱۰ (پاکسازی) حذف می‌شود — تا آن موقع پلِ گزارش‌هاست.
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

  if (!active) return <NoBusinessState variant="sell" />;

  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader />
      <main className="grow">
        <div className="mx-auto max-w-2xl px-4 py-6">
          <Suspense fallback={<PanelTabsFallback />}>
            <SellPanelTabs bizId={active.id} slug={active.slug} name={active.name} />
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

function SellPanelTabs({ bizId, slug, name }: { bizId: string; slug: string; name: string }) {
  // برگه‌ها با URL سینک‌اند: /sell/panel و /sell/panel?tab=settings
  const [tab, setTab] = useTabParam("dash", ["dash", "settings"]);

  return (
    <Tabs value={tab} onValueChange={setTab} className="mt-4">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="dash">داشبورد</TabsTrigger>
        <TabsTrigger value="settings">تنظیمات</TabsTrigger>
      </TabsList>

      {/* برگه‌ی داشبورد — آمار و ورودی‌ها */}
      <TabsContent value="dash" className="mt-5 space-y-8">
        <PanelStats bizId={bizId} />
        <RequestsLinkCard bizId={bizId} />
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

// ─── درخواست‌های قیمت — پاسخ‌دهی به صفحه‌ی مستقل منتقل شد (فاز ۴)؛ این‌جا فقط ورودی ───

function RequestsLinkCard({ bizId }: { bizId: string }) {
  const inquiriesQ = useIncomingInquiries(bizId);
  const mine = (inquiriesQ.data?.items ?? []).filter((q) => q.status !== "ARCHIVED");
  const unread = mine.filter((q) => !q.isRead).length;
  return (
    <Link
      href="/sell/requests"
      className="flex items-center gap-3 rounded-2xl border bg-white p-4 shadow-sm transition hover:border-primary/40 hover:shadow-md"
    >
      <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary/10">
        <Inbox className="size-5 text-primary" strokeWidth={1.75} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-bold">درخواست‌های قیمت</span>
        <span className="mt-0.5 block text-[11.5px] text-muted-foreground">
          {mine.length > 0
            ? `${mine.length} درخواست فعال — پاسخ‌دهی و فرصت‌های بازار`
            : "پاسخ‌دهی و فرصت‌های بازار این‌جاست"}
        </span>
      </span>
      {unread > 0 ? (
        <span className="grid h-5 min-w-[20px] shrink-0 place-items-center rounded-full bg-primary px-1 text-[10px] font-bold text-white">
          {unread > 9 ? "۹+" : unread}
        </span>
      ) : null}
    </Link>
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
