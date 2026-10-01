"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2, MapPin, Info, Inbox } from "lucide-react";
import { ChevronLeft } from "lucide-react";
import { useAuthStore } from "@/lib/auth-store";
import { setArmActive, useActiveBusiness } from "@/lib/active-biz";
import { AppFooter, AppHeader, MobileTabBar, SectionTitle } from "@/app/components/chrome";
import { fa, goodName, proximity, proximityLabel, timeAgo, unitLabel } from "@/lib/format";
import { useIncomingInquiries, useMarkInquiryRead } from "@/lib/queries";
import type { InquiryDto } from "@/lib/api";

/*
 * درخواست‌های قیمت — دستیار فروش (design-reference/screens/05)
 * فاز ۱: اسکلت صفحه + داده‌ی واقعی از getInquiries (همان API داشبورد).
 * پاسخ‌دهی فعلاً از داشبورد فروش انجام می‌شود؛ با لمس هر ردیف به
 * همان‌جا می‌رویم (پل انتقال تا فاز پاسخ‌دهی همین‌جا فعال شود).
 */

// پالت آواتار — رنگ پایدار از روی نام خریدار
const AVATAR_COLORS = ["#7c3aed", "#0e7490", "#c2703a", "#16a34a", "#db2777", "#4f46e5"];
function avatarColor(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

function statusBadge(q: InquiryDto) {
  if (q.status === "ANSWERED") {
    return <span className="rounded-full bg-[#e9f7ee] px-2.5 py-[2.5px] text-[10.5px] font-bold text-[#16a34a]">پاسخ داده‌شده</span>;
  }
  if (q.status === "ARCHIVED") {
    return <span className="rounded-full bg-muted px-2.5 py-[2.5px] text-[10.5px] font-bold text-muted-foreground">آرشیو</span>;
  }
  return <span className="rounded-full bg-[#e8f1fd] px-2.5 py-[2.5px] text-[10.5px] font-bold text-[#1d5fb8]">جدید</span>;
}

function InquiryRow({ q, myCity, onOpen }: { q: InquiryDto; myCity: string; onOpen: () => void }) {
  const isNew = !q.isRead;
  const answered = q.status === "ANSWERED";
  return (
    <button
      onClick={onOpen}
      className={`flex w-full items-center gap-2.5 rounded-xl border px-3 py-2.5 text-start transition hover:shadow-sm ${
        isNew
          ? "border-[#f9c48f] bg-[#fffdf9]"
          : "border-stone-200 bg-white"
      } ${answered ? "opacity-75" : ""}`}
    >
      <span
        className="grid size-[30px] shrink-0 place-items-center rounded-full text-xs font-bold text-white"
        style={{ background: avatarColor(q.buyer.name) }}
      >
        {q.buyer.name.trim().charAt(0)}
      </span>
      <span className="min-w-0 grow">
        <span className="flex flex-wrap items-center gap-1.5 text-[13.5px] font-bold">
          {q.buyer.name}
          {statusBadge(q)}
        </span>
        <span className="mt-1 flex flex-wrap items-center gap-2 text-[11.5px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <MapPin className="size-[11px]" strokeWidth={1.75} />
            {q.buyer.city} · {proximityLabel(proximity(q.buyer.city, myCity))}
          </span>
          <span>{timeAgo(q.createdAt)}</span>
        </span>
        <span
          className={`mt-1.5 block rounded-[9px] px-2.5 py-1.5 text-[12.5px] leading-5 ${
            answered ? "bg-muted text-stone-500" : "bg-accent text-[#9a3d06]"
          }`}
        >
          <b>{goodName(q.listing.good)} · {fa(q.volume)} {unitLabel(q.listing.good.unit)}</b>
          {q.note ? <> — «{q.note}»</> : null}
        </span>
      </span>
      <ChevronLeft className="size-4 shrink-0 text-stone-300" strokeWidth={1.75} />
    </button>
  );
}

export default function RequestsPage() {
  const router = useRouter();
  const { status } = useAuthStore();
  const biz = useActiveBusiness();
  const inquiriesQ = useIncomingInquiries(biz?.id);
  const markRead = useMarkInquiryRead();

  useEffect(() => {
    document.title = "درخواست‌های قیمت | iMach";
    setArmActive("sell");
    if (status === "guest") router.replace("/start");
  }, [status, router]);

  if (status !== "authed") {
    return (
      <div className="flex min-h-screen flex-col">
        <AppHeader />
        <main className="grow grid place-items-center py-32">
          <Loader2 className="size-6 animate-spin text-primary" />
        </main>
        <AppFooter />
        <MobileTabBar />
      </div>
    );
  }

  const inquiries = inquiriesQ.data?.items ?? [];
  const myCity = biz?.city ?? "";

  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader />
      <main className="grow">
        <div className="mx-auto max-w-2xl px-4 py-4 pb-24 sm:pb-8">
          <SectionTitle
            icon={<Inbox className="size-[18px] text-primary" strokeWidth={1.75} />}
            title="درخواست‌های قیمت"
            action={
              inquiries.length > 0 ? (
                <span className="text-xs text-muted-foreground">
                  {fa(inquiries.length)} درخواست
                </span>
              ) : undefined
            }
          />

          {/* پل انتقال: پاسخ‌دهی تا فاز بعد در داشبورد فروش است */}
          <div className="mb-3 flex gap-2.5 rounded-xl border border-[#f2dfba] bg-[#fdf3e3] px-3.5 py-2.5 text-xs leading-7 text-[#8a5a10]">
            <Info className="mt-1 size-[17px] shrink-0 text-[#d97706]" strokeWidth={1.75} />
            <p>
              مشتری‌هایی که از کاتالوکت قیمت می‌خواهند این‌جا می‌آیند.
              با لمس هر درخواست، پاسخ‌دهی در داشبورد فروش انجام می‌شود.
            </p>
          </div>

          {inquiriesQ.isLoading ? (
            <div className="grid place-items-center py-16">
              <Loader2 className="size-6 animate-spin text-primary" />
            </div>
          ) : inquiries.length === 0 ? (
            <div className="rounded-2xl border-[1.5px] border-dashed border-stone-300 bg-[#fdfcf9] px-4 py-6 text-center text-[12.5px] leading-9 text-muted-foreground">
              هنوز درخواست قیمتی نرسیده.
              <br />
              هر وقت مشتری‌ای از کاتالوگت قیمت بخواهد، همین‌جا با شهر و نیازش می‌بینیش.
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {inquiries.map((q) => (
                <InquiryRow
                  key={q.id}
                  q={q}
                  myCity={myCity}
                  onOpen={() => {
                    if (!q.isRead) markRead.mutate(q.id);
                    router.push("/sell/panel");
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </main>
      <AppFooter />
      <MobileTabBar />
    </div>
  );
}
