"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Icon } from "@/components/ui/icon";
import { Sheet } from "@/components/ui/sheet";
import { Spinner, EmptyState } from "@/components/ui/feedback";
import { useAuthStore } from "@/lib/auth-store";
import { listingEventsApi, type ListingEventDto } from "@/lib/api";
import { num, timeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * شیت «تاریخچهٔ رویدادها» کالا (M10 · N5 · ۰۳-الگو · فاز ۲۲).
 *
 * · خط زمانی تعامل با یک آگهی: افزودن به لیست خرید · استعلام · گفتگو ·
 *   بازدیدِ تبلیغی (VIEW خودش شمارنده است — ردیف نمی‌گیرد؛ سند ۰۳ §۴.۴).
 * · فیلتر بازهٔ ۷/۳۰ روز + همه؛ شمارنده‌ها همیشه از ابتدای ثبت.
 * · جمله‌سازی با snapshot نام («فلانی …»)؛ سیستمی = بدون نام.
 *
 * قانون مالک M2: فرم فارسی، متن‌ها همین‌جا (فریز i18n).
 */

const TYPE_META: Record<ListingEventDto["type"], { icon: Parameters<typeof Icon>[0]["name"]; label: string; cls: string }> = {
  WATCH_ADD: { icon: "basket", label: "افزودن به لیست خرید", cls: "bg-stone-tint text-stone" },
  COMPARE_ADD: { icon: "chart", label: "افزودن به مقایسه", cls: "bg-surface-2 text-text-3" },
  INQUIRY: { icon: "send", label: "استعلام قیمت", cls: "bg-arm-soft text-arm-strong" },
  CHAT: { icon: "msg", label: "گفتگو", cls: "bg-primary-soft text-primary-strong" },
  CAMPAIGN_VIEW: { icon: "eye", label: "بازدیدِ تبلیغ", cls: "bg-accent-soft text-accent-strong" },
};

export function ListingEventsSheet({
  listingId,
  open,
  onClose,
}: {
  listingId: string;
  open: boolean;
  onClose: () => void;
}) {
  const businesses = useAuthStore((s) => s.businesses);
  const bizId = businesses[0]?.id ?? "";
  const [days, setDays] = useState<7 | 30 | null>(null);

  const q = useQuery({
    queryKey: ["listing-events", listingId, days],
    queryFn: () => listingEventsApi.list(listingId, days ?? undefined),
    enabled: open && !!bizId,
  });

  const data = q.data;

  return (
    <Sheet open={open} onClose={onClose} title="تاریخچهٔ رویدادها" maxHeightClass="max-h-[88dvh]">
      <div className="flex flex-col gap-3.5 py-1">
        {/* شمارنده‌ها — از ابتدای ثبت (پروتوتایپ ۰۲) */}
        {data && (
          <div className="flex items-center gap-2 overflow-x-auto pb-0.5">
            {[
              { v: data.viewCountTotal, l: "بازدید کل" },
              { v: data.viewCount30, l: "بازدید ماه" },
              { v: data.counts.WATCH_ADD ?? 0, l: "لیست خرید" },
              { v: data.counts.INQUIRY ?? 0, l: "استعلام" },
              { v: data.counts.CHAT ?? 0, l: "گفتگو" },
              { v: data.counts.CAMPAIGN_VIEW ?? 0, l: "بازدید تبلیغ" },
            ].map((s) => (
              <div
                key={s.l}
                className="flex min-w-[86px] flex-1 flex-col items-center rounded-xl bg-surface-2/60 px-2 py-2"
              >
                <b className="text-[15px] font-black text-text">{num(s.v, "fa")}</b>
                <span className="text-[9.5px] font-bold text-text-3">{s.l}</span>
              </div>
            ))}
          </div>
        )}

        <p className="text-[10.5px] leading-5 text-text-4">
          شمارنده‌ها از ابتدای ثبت این کالا جمع شده‌اند — ریز کامل رویدادها همین‌جاست.
        </p>

        {/* فیلتر بازه */}
        <div className="flex gap-1.5">
          {(
            [
              { v: null, t: "همه" },
              { v: 30 as const, t: "۳۰ روز" },
              { v: 7 as const, t: "۷ روز" },
            ] as const
          ).map((o) => (
            <button
              key={o.t}
              type="button"
              onClick={() => setDays(o.v)}
              aria-pressed={days === o.v}
              className={cn(
                "flex-1 rounded-xl border px-3 py-2 text-[11.5px] font-bold transition-colors",
                days === o.v
                  ? "border-arm bg-arm-soft/40 text-arm-strong"
                  : "border-line bg-surface text-text-2"
              )}
            >
              {o.t}
            </button>
          ))}
        </div>

        {q.isLoading ? (
          <div className="grid place-items-center py-10">
            <Spinner />
          </div>
        ) : (data?.items ?? []).length === 0 ? (
          <EmptyState
            icon={<Icon name="history" size={28} />}
            title="هنوز رویدادی ثبت نشده"
            subtitle="تا کسی این کالا را دنبال کند، درباره‌اش استعلام بدهد یا با تو درباره‌اش گفتگو کند، همین‌جا می‌آید."
          />
        ) : (
          <div className="flex flex-col">
            {(data?.items ?? []).map((e) => {
              const meta = TYPE_META[e.type] ?? TYPE_META.INQUIRY;
              const who = e.actorName?.trim();
              return (
                <div
                  key={e.id}
                  className="flex items-center gap-3 border-b border-dashed border-line py-2.5 last:border-0"
                >
                  <span className={cn("grid size-8 shrink-0 place-items-center rounded-lg", meta.cls)}>
                    <Icon name={meta.icon} size={15} />
                  </span>
                  <p className="min-w-0 flex-1 text-[12px] leading-5 text-text-2">
                    {who ? (
                      <>
                        <b className="text-text">{who}</b> — {meta.label}
                      </>
                    ) : (
                      <>{meta.label}</>
                    )}
                  </p>
                  <span className="shrink-0 text-[10px] text-text-4">{timeAgo(e.createdAt)}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Sheet>
  );
}

/** ردیف دعمی برای کارت آمار کالا (نمای مالک) */
export function EventsHistoryButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mt-1 flex w-full items-center justify-center gap-1.5 rounded-xl bg-surface-2 px-3 py-2 text-[11.5px] font-bold text-text-2 transition-colors hover:bg-primary-soft"
    >
      <Icon name="history" size={14} />
      تاریخچهٔ رویدادها
    </button>
  );
}
