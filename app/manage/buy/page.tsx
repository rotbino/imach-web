"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useAuthStore } from "@/lib/auth-store";
import { useActiveBusiness } from "@/lib/active-biz";
import { useBusinessProfile, useFollows, useMyListings, useOffers } from "@/lib/queries";
import { AppFooter, AppHeader, MobileTabBar } from "@/app/components/chrome";
import {
  ActivityCard,
  BoardSection,
  FollowCard,
  ManageHeader,
  MyItemsSection,
  OffersSection,
  ShareCard,
  StatsStrip,
} from "../sections";

/*
 * مدیریت بازوی خرید — داشبورد سبک.
 * پیشنهادهای تطبیق به اکسپلور رفتند؛ اینجا فقط کار است:
 * پیشنهادهای دریافتی، تابلوی قیمت دنبال‌شده‌ها، نیازهای خرید، لینک و آمار.
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

  return <ManageBuyBody />;
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

          <div className="space-y-5">
            {/* آمار — داشبورد */}
            <StatsStrip
              stats={[
                { label: "نیازهای خرید", value: buyCount },
                { label: "دنبال‌شونده", value: following },
                { label: "پیشنهاد تازه", value: freshOffers, accent: true },
              ]}
            />

            <OffersSection bizId={bizId} myCity={city} />
            <BoardSection bizId={bizId} />
            <MyItemsSection bizId={bizId} side="buy" />
            <ShareCard kind="buy" slug={slug} bizName={name} onView={() => window.location.assign(`/buy/${slug}`)} />
            <FollowCard kind="following" slug={slug} />
            <ActivityCard biz={biz} />
          </div>
        </div>
      </main>
      <AppFooter />
      <MobileTabBar />
    </div>
  );
}
