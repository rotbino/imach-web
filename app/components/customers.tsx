"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { fa, frequencyLabel, goodName, timeAgo, unitLabel } from "@/lib/format";
import { useMyFollowers, useRemoveFollower } from "@/lib/queries";
import type { CustomerRowDto } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { BadgeCheck, Link2, Loader2, MapPin, Share2, ShoppingCart, Users, X } from "lucide-react";
import { ShareContent } from "@/app/components/share";

/*
 * ذخیره‌کنندگان کاتالوگ (طرح ۸ — U60/U61):
 * • «دنبال‌کنندهٔ کاتالوگ» برای همیشه کنار است — خریدار کاتالوگ را ذخیره
 *   می‌کند و این‌جا ذخیره‌کننده می‌نشیند.
 * • برچسب منبعِ رسیدن روی هر ردیف: با لینک (نارنجی) / تابلو (فیروزه‌ای) /
 *   پرومو (کهربایی) + خط خلاصهٔ عددی بالای فهرست.
 * • مشتری = همان ذخیره‌کننده؛ ردیفِ درخواست‌دار بالا می‌آید.
 */

/** برچسب منبعِ رسیدن — زبان رنگ طرح ۸ (U60) */
export function SourceBadge({ source }: { source: string | undefined }) {
  const s = source ?? "ORGANIC";
  if (s === "SHARED")
    return (
      <Badge
        variant="outline"
        className="border-transparent bg-[#ffeeda] px-1.5 text-[10px] font-bold text-[#9a3d06]"
      >
        با لینک
      </Badge>
    );
  if (s === "PROMO")
    return (
      <Badge
        variant="outline"
        className="border-transparent bg-[#fdf0da] px-1.5 text-[10px] font-bold text-[#b45309]"
      >
        پرومو
      </Badge>
    );
  return (
    <Badge
      variant="outline"
      className="border-transparent bg-[#e2f4f1] px-1.5 text-[10px] font-bold text-[#0d5d54]"
    >
      تابلو
    </Badge>
  );
}

/** سرِ فهرست + ابزار رشد (لینک کاتالوگ با کد رفرال) + ردیف‌های ذخیره‌کننده */
export function CustomersSection({
  bizId,
  slug,
  name,
  showHeader = true,
  compact = false,
}: {
  bizId: string;
  slug: string;
  name: string;
  /** صفحه‌ی مستقل تیتر و شمارنده دارد؛ آکاردئون پروفایل نه */
  showHeader?: boolean;
  /** آکاردئون پروفایل — ابزار رشد جدا نشان داده می‌شود، اینجا فقط ردیف‌ها */
  compact?: boolean;
}) {
  const customersQ = useMyFollowers(bizId);
  const customers = customersQ.data?.rows ?? [];
  const withRequest = customers.filter((c) => c.latestRequest).length;
  const summary = customersQ.data?.summary;

  return (
    <>
      {showHeader && (
        <div className="mb-4 flex items-center justify-between px-1">
          <h1 className="flex items-center gap-2 text-lg font-black">
            <span className="grid size-9 place-items-center rounded-xl bg-primary/10 text-primary">
              <Users className="size-4.5" />
            </span>
            ذخیره‌کنندگان کاتالوگ
          </h1>
          {!customersQ.isLoading && (
            <p className="text-xs text-muted-foreground">
              {fa(customers.length)} ذخیره‌کننده
              {withRequest > 0 && <span className="text-primary"> · {fa(withRequest)} درخواست فعال</span>}
            </p>
          )}
        </div>
      )}

      {/* طرح ۸ (U60) — خط خلاصهٔ منبع: «۶ از لینک · ۴ از تابلو · ۲ از پرومو» */}
      {summary && summary.total > 0 && (summary.shared > 0 || summary.promo > 0) && (
        <p className="mb-3 flex flex-wrap items-center gap-x-2 gap-y-1 rounded-xl border bg-white px-3 py-2 text-[11.5px] text-muted-foreground">
          <span className="font-bold text-foreground">از کجا آمدند؟</span>
          {summary.shared > 0 && (
            <span className="inline-flex items-center gap-1">
              <span className="inline-block size-2 rounded-full bg-[#f97316]" />
              {fa(summary.shared)} از لینک
            </span>
          )}
          {summary.organic > 0 && (
            <span className="inline-flex items-center gap-1">
              <span className="inline-block size-2 rounded-full bg-[#14b8a6]" />
              {fa(summary.organic)} از تابلو
            </span>
          )}
          {summary.promo > 0 && (
            <span className="inline-flex items-center gap-1">
              <span className="inline-block size-2 rounded-full bg-[#b45309]" />
              {fa(summary.promo)} از پرومو
            </span>
          )}
        </p>
      )}

      {!compact && (
        <section className="rounded-2xl border bg-white p-4 shadow-sm">
          <p className="mb-3 flex items-center gap-1.5 text-sm font-extrabold">
            <Share2 className="size-4 text-primary" />
            لینک کاتالوگ «{name}»
          </p>
          <ShareContent kind="sell" slug={slug} bizName={name} />
          <p className="mt-3 flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <Link2 className="size-3" />
            هر ذخیرهٔ تازه از این لینک: +۵٬۰۰۰ تومان پاداش دعوت برای شما.
          </p>
        </section>
      )}

      <section className={compact ? "" : "mt-6"}>
        {customersQ.isLoading ? (
          <div className="grid place-items-center py-10">
            <Loader2 className="size-5 animate-spin text-primary" />
          </div>
        ) : customers.length === 0 ? (
          <div className="rounded-2xl border border-dashed bg-white/70 p-6 text-center">
            <p className="text-sm font-bold">هنوز کسی کاتالوگ شما را ذخیره نکرده.</p>
            <p className="mx-auto mt-2 max-w-sm text-xs leading-6 text-muted-foreground">
              لینک کاتالوگ را برای مشتری‌های فعلی‌تان بفرستید؛ هر ذخیرهٔ تازه این‌جا سبز می‌شود و +۵٬۰۰۰ تومان پاداش دارد.
            </p>
          </div>
        ) : (
          <div className={compact ? "space-y-2.5" : "space-y-2.5"}>
            {customers.map((c) => (
              <CustomerRow key={c.id} c={c} bizId={bizId} />
            ))}
          </div>
        )}
      </section>
    </>
  );
}

export function CustomerRow({ c, bizId }: { c: CustomerRowDto; bizId: string }) {
  const router = useRouter();
  const removeFollower = useRemoveFollower();
  const [confirming, setConfirming] = useState(false);

  const remove = () => {
    if (!confirming) {
      setConfirming(true);
      return;
    }
    removeFollower.mutate({ businessId: bizId, followerBusinessId: c.id });
  };

  return (
    <div className="animate-fade-up rounded-2xl border bg-white p-3.5 shadow-sm">
      <div className="flex items-center gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-base font-black text-primary">
          {c.name.slice(0, 1)}
        </span>
        <div className="min-w-0 grow">
          <p className="flex items-center gap-1 truncate text-sm font-bold">
            {c.name}
            {c.isVerified && <BadgeCheck className="size-4 shrink-0 text-primary" aria-label="تاییدشده" />}
            {/* طرح ۸ — برچسب منبع به‌جای «با لینک» قدیمی */}
            <SourceBadge source={c.source} />
          </p>
          <p className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground">
            <MapPin className="size-3" />
            {c.city} · ذخیره از {timeAgo(c.followedAt)}
          </p>
        </div>
        <button
          type="button"
          onClick={remove}
          disabled={removeFollower.isPending}
          aria-label={`حذف ${c.name} از مشتریان`}
          className={`grid size-8 shrink-0 place-items-center rounded-xl border transition ${
            confirming
              ? "border-red-200 bg-red-50 text-red-600"
              : "text-muted-foreground hover:bg-accent hover:text-foreground"
          }`}
        >
          {removeFollower.isPending ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : confirming ? (
            <span className="text-[10px] font-black">حذف؟</span>
          ) : (
            <X className="size-3.5" />
          )}
        </button>
      </div>

      {/* آخرین درخواست خرید فعال — بالا آمدن مشتریِ درخواست‌دار (خواسته‌ی کاربر) */}
      {c.latestRequest && (
        <button
          type="button"
          onClick={() => router.push(`/buy/${c.slug}`)}
          className="mt-2.5 flex w-full items-center gap-2 rounded-xl border border-primary/25 bg-accent/60 px-3 py-2 text-start transition hover:border-primary/50"
        >
          <ShoppingCart className="size-3.5 shrink-0 text-primary" />
          <span className="min-w-0 grow truncate text-xs font-bold text-foreground">
            {goodName(c.latestRequest.good)}
            <span className="ms-1.5 font-medium text-muted-foreground">
              {fa(c.latestRequest.volume)} {unitLabel(c.latestRequest.good.unit)}
              {c.latestRequest.frequency && ` · ${frequencyLabel(c.latestRequest.frequency)}`}
            </span>
          </span>
          <span className="shrink-0 text-[10px] text-muted-foreground">
            {timeAgo(c.latestRequest.updatedAt)}
          </span>
        </button>
      )}
    </div>
  );
}
