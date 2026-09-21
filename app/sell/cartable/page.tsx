"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useAuthStore } from "@/lib/auth-store";
import { setArmActive, useActiveBusiness } from "@/lib/active-biz";
import { AppFooter, AppHeader, MobileTabBar } from "@/app/components/chrome";
import { EmptyBox, InquiriesSection, StatsStrip } from "@/app/components/sections";
import { ExploreBuyRow, FeedSpinner } from "@/app/components/feed-cards";
import {
  useBusinessProfile,
  useBuyRequests,
  useIncomingInquiries,
  useMyBusinesses,
  useMyListings,
  useMyFollowers,
} from "@/lib/queries";

/*
 * کارتابل فروش — صندوق خبرهای بازوی فروش (سند فصل ۷.۱):
 * استعلام‌های ورودی، دنبال‌کننده‌های کاتالوگ، و تقاضای مرتبط با کالاهای من
 * که موتور تطبیق خودش سراغم می‌آورد. خبرهای بازوی خرید اینجا دیده نمی‌شود.
 */

export default function SellCartablePage() {
  const router = useRouter();
  const { status } = useAuthStore();

  useEffect(() => {
    document.title = "کارتابل فروش | iMach";
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

  return <SellCartableBody />;
}

function SellCartableBody() {
  const active = useActiveBusiness();
  const bizQ = useMyBusinesses();

  if (bizQ.isLoading) {
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

  if (!active) {
    return (
      <div className="flex min-h-screen flex-col">
        <AppHeader />
        <main className="grow">
          <div className="mx-auto max-w-xl px-4 py-16 text-center">
            <p className="text-lg font-extrabold">اول کسب‌وکارتان را بسازید</p>
            <p className="mt-2 text-sm text-muted-foreground">فقط نام و شهر — بقیه‌اش با ما.</p>
            <button
              onClick={() => (window.location.href = "/start")}
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
        <SellCartable bizId={active.id} slug={active.slug} city={active.city} />
      </main>
      <AppFooter />
      <MobileTabBar />
    </div>
  );
}

function SellCartable({ bizId, slug, city }: { bizId: string; slug: string; city: string }) {
  const listingsQ = useMyListings(bizId);
  const profileQ = useBusinessProfile(slug);
  const inquiriesQ = useIncomingInquiries(bizId);
  const followersQ = useMyFollowers(bizId);
  const demandQ = useBuyRequests(bizId);

  const listings = listingsQ.data ?? [];
  const sellCount = listings.filter((l) => (l.mode === "SELL" || l.mode === "BOTH") && l.priceMinor !== null).length;
  const unread = inquiriesQ.data?.unreadCount ?? 0;
  const followers = followersQ.data?.length ?? 0;

  const sellListings = listings
    .filter((l) => (l.mode === "SELL" || l.mode === "BOTH") && l.priceMinor !== null)
    .map((l) => ({ goodId: l.good.id, priceMinor: l.priceMinor, currency: l.currency }));

  const demand = demandQ.data ?? [];
  const bizName = profileQ.data?.name;

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      {/* آمار — کل وضعیت فروش یک‌جا */}
      <StatsStrip
        stats={[
          { label: "کالاهای فروشی", value: sellCount },
          { label: "دنبال‌کننده", value: followers },
          { label: "درخواست باز", value: unread, accent: true },
        ]}
      />

      <div className="mt-6 space-y-8">
        {/* استعلام‌های ورودی — کار خریدار روی کاتالوگ من */}
        <InquiriesSection bizId={bizId} myCity={city} sellListings={sellListings} />

        {/* پیگیری‌های کاتالوگ */}
        <FollowersHint followers={followers} slug={slug} bizName={bizName} />

        {/* تقاضای مرتبط — موتور تطبیق، تقاضا را به من می‌آورد (سند ۴.۴) */}
        <section>
          <h2 className="mb-3 text-base font-extrabold">تقاضای مرتبط با کالاهای من</h2>
          {demandQ.isLoading ? (
            <FeedSpinner />
          ) : demand.length === 0 ? (
            <EmptyBox text="فعلا درخواست خرید مرتبطی نیست. کاتالوگ کامل‌تر، تقاضای بیشتر می‌آورد." />
          ) : (
            <div className="grid gap-3 lg:grid-cols-2">
              {demand.slice(0, 12).map((l) => (
                <ExploreBuyRow key={l.id} item={l} />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function FollowersHint({ followers, slug, bizName }: { followers: number; slug: string; bizName?: string }) {
  if (followers > 0) {
    return (
      <EmptyBox
        text={`${bizName ?? "کاتالوگ شما"} را ${followers} خریدار پیگیری می‌کنند — هر تغییر قیمت، خبرشان می‌شود.`}
      />
    );
  }
  return (
    <EmptyBox
      text={
        <>
          هنوز کسی کاتالوگتان را پیگیری نمی‌کند — لینکتان را در گروه‌های صنف پخش کنید؛ هر بازدید یک فرصت پیگیری است.
        </>
      }
      action={
        <Link href={`/sell/${slug}`} className="text-xs font-bold text-primary hover:underline">
          دیدن کاتالوگ عمومی
        </Link>
      }
    />
  );
}
