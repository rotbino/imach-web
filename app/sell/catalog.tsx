"use client";

import { useMyListings } from "@/lib/queries";
import { MyItemsSection, ShareCard } from "@/app/components/sections";

/*
 * کاتالوگ — ویترین عمومی من (سند فصل ۴.۱):
 * کالاها و قیمت‌های من + کارت لینک عمومی برای پخش در گروه‌های صنف.
 * تابلوی قیمت دنبال‌شده‌ها اینجا نیست — ابزار خرید است و در میز خرید زندگی می‌کند.
 */

export function SellCatalog({ bizId, slug, name }: { bizId: string; slug: string; name: string }) {
  return (
    <div className="mx-auto max-w-2xl space-y-5 px-4 py-6">
      <ShareCard
        kind="sell"
        slug={slug}
        bizName={name}
        onView={() => window.location.assign(`/sell/${slug}`)}
      />
      <MyItemsSection bizId={bizId} side="sell" />
    </div>
  );
}
