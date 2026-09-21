"use client";

import { BoardSection, FollowCard, MyItemsSection, ShareCard } from "@/app/components/sections";

/*
 * میز خرید — اتاق کار خرید (سند فصل ۴.۱):
 * نیازهای خرید من، تابلوهای دنبال‌شده (که از کاتالوگ به اینجا منتقل شدند)،
 * و لینک عمومی لیست خرید برای فرستادن به تامین‌کننده‌ها.
 */

export function BuyDesk({ bizId, slug, name }: { bizId: string; slug: string; name: string }) {
  return (
    <div className="mx-auto max-w-2xl space-y-5 px-4 py-6">
      <ShareCard
        kind="buy"
        slug={slug}
        bizName={name}
        onView={() => window.location.assign(`/buy/${slug}`)}
      />
      <MyItemsSection bizId={bizId} side="buy" />
      <BoardSection bizId={bizId} />
      <FollowCard kind="following" bizId={bizId} />
    </div>
  );
}
