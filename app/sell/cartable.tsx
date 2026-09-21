"use client";

import Link from "next/link";
import {
  useBusinessProfile,
  useBuyRequests,
  useIncomingInquiries,
  useMyListings,
  useMyFollowers,
} from "@/lib/queries";
import { EmptyBox, InquiriesSection, StatsStrip } from "@/app/components/sections";
import { ExploreBuyRow, FeedSpinner } from "@/app/components/feed-cards";

/*
 * کارتابل فروش — صندوق خبرهای فروش (سند فصل ۷.۱):
 * استعلام‌های ورودی، دنبال‌کننده‌های کاتالوگ، و تقاضای مرتبط با کالاهای من
 * که موتور تطبیق خودش سراغم می‌آورد. خبرهای محیط خرید اینجا دیده نمی‌شود.
 */

export function SellCartable({ bizId, slug, city }: { bizId: string; slug: string; city: string }) {
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
        <FollowersHint bizId={bizId} followers={followers} slug={slug} bizName={bizName} />

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

function FollowersHint({ bizId, followers, slug, bizName }: { bizId: string; followers: number; slug: string; bizName?: string }) {
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
