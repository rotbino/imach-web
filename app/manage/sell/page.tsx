"use client";

import { Suspense, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Bell, Loader2, Package, Settings2, Share2 } from "lucide-react";
import { useAuthStore } from "@/lib/auth-store";
import { useActiveBusiness } from "@/lib/active-biz";
import { useBusinessProfile, useIncomingInquiries, useMyListings } from "@/lib/queries";
import { AppFooter, AppHeader, MobileTabBar } from "@/app/components/chrome";
import { useTabParam } from "@/app/components/url-tabs";
import { Tabs, TabsContent, TabsList } from "@/components/ui/tabs";
import {
  ActivityCard,
  FollowCard,
  InquiriesSection,
  ManageHeader,
  ManageTabTrigger,
  MyItemsSection,
  ShareCard,
  StatsStrip,
} from "../sections";

/*
 * مدیریت بازوی فروش — هر موضوع مدیریتی در یک تب:
 * درخواست‌ها · کالاها · اشتراک · تنظیم. نوار آمار بالا، کل وضعیت را یک‌جا می‌دهد.
 */
export default function ManageSellPage() {
  const router = useRouter();
  const { status } = useAuthStore();

  useEffect(() => {
    document.title = "مدیریت بازوی فروش | iMach";
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

  return (
    <Suspense fallback={<ManageSpinner />}>
      <ManageSellBody />
    </Suspense>
  );
}

function ManageSpinner() {
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

function ManageSellBody() {
  const router = useRouter();
  const active = useActiveBusiness();

  if (!active) {
    return (
      <div className="flex min-h-screen flex-col">
        <AppHeader />
        <main className="grow">
          <div className="mx-auto max-w-xl px-4 py-16 text-center">
            <p className="text-lg font-extrabold">اول کسب‌وکارتان را بسازید</p>
            <button
              onClick={() => router.push("/start")}
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

  return <ManageSellDash key={active.id} biz={active} />;
}

function ManageSellDash({ biz }: { biz: NonNullable<ReturnType<typeof useActiveBusiness>> }) {
  const { id: bizId, slug, name, city } = biz;
  const [tab, setTab] = useTabParam("inquiries", ["inquiries", "items", "share", "settings"]);

  const listingsQ = useMyListings(bizId);
  const profileQ = useBusinessProfile(slug);
  const inquiriesQ = useIncomingInquiries(bizId);

  const listings = listingsQ.data ?? [];
  const sellCount = listings.filter((l) => (l.mode === "SELL" || l.mode === "BOTH") && l.price !== null).length;
  const unread = inquiriesQ.data?.unreadCount ?? 0;
  const followers = profileQ.data?._count.followers ?? 0;

  const sellListings = listings
    .filter((l) => (l.mode === "SELL" || l.mode === "BOTH") && l.price !== null)
    .map((l) => ({ goodId: l.good.id, price: l.price }));

  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader />
      <main className="grow">
        <div className="mx-auto max-w-2xl px-4 py-6">
          <ManageHeader kind="sell" biz={biz} />

          {/* آمار — کل وضعیت یک‌جا */}
          <div className="mt-5">
            <StatsStrip
              stats={[
                { label: "کالاهای فروشی", value: sellCount },
                { label: "دنبال‌کننده", value: followers },
                { label: "درخواست باز", value: unread, accent: true },
              ]}
            />
          </div>

          {/* هر موضوع مدیریتی در یک تب — با آدرس اختصاصی (?tab=…) */}
          <Tabs value={tab} onValueChange={setTab} className="mt-5">
            <TabsList className="grid h-auto w-full grid-cols-4">
              <ManageTabTrigger value="inquiries" icon={Bell} label="درخواست‌ها" count={unread} />
              <ManageTabTrigger value="items" icon={Package} label="کالاها" />
              <ManageTabTrigger value="share" icon={Share2} label="اشتراک" />
              <ManageTabTrigger value="settings" icon={Settings2} label="تنظیم" />
            </TabsList>

            <TabsContent value="inquiries" className="mt-5">
              <InquiriesSection bizId={bizId} myCity={city} sellListings={sellListings} />
            </TabsContent>

            <TabsContent value="items" className="mt-5">
              <MyItemsSection bizId={bizId} side="sell" />
            </TabsContent>

            <TabsContent value="share" className="mt-5">
              <div className="space-y-5">
                <ShareCard kind="sell" slug={slug} bizName={name} onView={() => window.location.assign(`/sell/${slug}`)} />
                <FollowCard kind="followers" slug={slug} />
              </div>
            </TabsContent>

            <TabsContent value="settings" className="mt-5">
              <ActivityCard biz={biz} />
            </TabsContent>
          </Tabs>
        </div>
      </main>
      <AppFooter />
      <MobileTabBar />
    </div>
  );
}
