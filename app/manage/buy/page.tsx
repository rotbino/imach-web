"use client";

import { Suspense, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Package, Settings2, Share2, Signal, Table2 } from "lucide-react";
import { useAuthStore } from "@/lib/auth-store";
import { useActiveBusiness } from "@/lib/active-biz";
import { useBusinessProfile, useFollows, useMyListings, useOffers } from "@/lib/queries";
import { AppFooter, AppHeader, MobileTabBar } from "@/app/components/chrome";
import { useTabParam } from "@/app/components/url-tabs";
import { Tabs, TabsContent, TabsList } from "@/components/ui/tabs";
import {
  ActivityCard,
  BoardSection,
  FollowCard,
  ManageHeader,
  ManageTabTrigger,
  MyItemsSection,
  OffersSection,
  ShareCard,
  StatsStrip,
} from "../sections";

/*
 * مدیریت بازوی خرید — هر موضوع مدیریتی در یک تب:
 * پیشنهادها · تابلو · کالاها · اشتراک · تنظیم. نوار آمار بالا، کل وضعیت را یک‌جا می‌دهد.
 */
export default function ManageBuyPage() {
  const router = useRouter();
  const { status } = useAuthStore();

  useEffect(() => {
    document.title = "مدیریت بازوی خرید | iMach";
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
      <ManageBuyBody />
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

function ManageBuyBody() {
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

  return <ManageBuyDash key={active.id} biz={active} />;
}

function ManageBuyDash({ biz }: { biz: NonNullable<ReturnType<typeof useActiveBusiness>> }) {
  const { id: bizId, slug, name, city } = biz;
  const [tab, setTab] = useTabParam("offers", ["offers", "board", "items", "share", "settings"]);

  const listingsQ = useMyListings(bizId);
  const profileQ = useBusinessProfile(slug);
  const followsQ = useFollows(bizId);
  const offersQ = useOffers(bizId);

  const listings = listingsQ.data ?? [];
  const buyCount = listings.filter((l) => (l.mode === "BUY" || l.mode === "BOTH") && l.volume !== null).length;
  const following = profileQ.data?._count.following ?? followsQ.data?.length ?? 0;
  const freshOffers = offersQ.data?.items.length ?? 0;

  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader />
      <main className="grow">
        <div className="mx-auto max-w-2xl px-4 py-6">
          <ManageHeader kind="buy" biz={biz} />

          {/* آمار — کل وضعیت یک‌جا */}
          <div className="mt-5">
            <StatsStrip
              stats={[
                { label: "نیازهای خرید", value: buyCount },
                { label: "دنبال‌شونده", value: following },
                { label: "پیشنهاد تازه", value: freshOffers, accent: true },
              ]}
            />
          </div>

          {/* هر موضوع مدیریتی در یک تب — با آدرس اختصاصی (?tab=…) */}
          <Tabs value={tab} onValueChange={setTab} className="mt-5">
            <TabsList className="grid h-auto w-full grid-cols-5">
              <ManageTabTrigger value="offers" icon={Signal} label="پیشنهادها" count={freshOffers} />
              <ManageTabTrigger value="board" icon={Table2} label="تابلو" />
              <ManageTabTrigger value="items" icon={Package} label="کالاها" />
              <ManageTabTrigger value="share" icon={Share2} label="اشتراک" />
              <ManageTabTrigger value="settings" icon={Settings2} label="تنظیم" />
            </TabsList>

            <TabsContent value="offers" className="mt-5">
              <OffersSection bizId={bizId} myCity={city} />
            </TabsContent>

            <TabsContent value="board" className="mt-5">
              <BoardSection bizId={bizId} />
            </TabsContent>

            <TabsContent value="items" className="mt-5">
              <MyItemsSection bizId={bizId} side="buy" />
            </TabsContent>

            <TabsContent value="share" className="mt-5">
              <div className="space-y-5">
                <ShareCard kind="buy" slug={slug} bizName={name} onView={() => window.location.assign(`/buy/${slug}`)} />
                <FollowCard kind="following" slug={slug} />
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
