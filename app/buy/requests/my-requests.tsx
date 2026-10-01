"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/auth-store";
import { setArmActive, useActiveBusiness } from "@/lib/active-biz";
import { fa, fmtMoney, frequencyLabel, goodName, timeAgo, unitLabel } from "@/lib/format";
import { useMyInquiries } from "@/lib/queries";
import { ArrowLeft, BadgeCheck, ChevronLeft, ClipboardList, Loader2, MapPin } from "lucide-react";

/*
 * «درخواست‌های من» — سمت خریدار (فاز ۵ · لینک هدر لیست خرید، طرح ۰۸ / تصمیم د۵)
 * جریان متمرکز مثل جزئیات درخواست فروش (فاز ۴): ساب‌هدر بازگشت، بدون هدر/تب‌بار.
 * ردیف = استعلام فرستاده‌شده + آخرین پیشنهاد دریافتی (getMyInquiries).
 * زدن ردیف → صفحه‌ی کالای همان فروشنده (تماس/مذاکره همان‌جا).
 */

// پالت آواتار — همان سیستم ۶رنگی فاز ۴
const AVATAR_COLORS = ["#7c3aed", "#0e7490", "#c2703a", "#16a34a", "#db2777", "#4f46e5"];
function avatarColor(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

export function MyRequests() {
  const router = useRouter();
  const { status } = useAuthStore();
  const active = useActiveBusiness();

  useEffect(() => {
    document.title = "درخواست‌های من | iMach";
    setArmActive("buy");
  }, []);

  useEffect(() => {
    if (status === "guest") router.replace("/start");
  }, [status, router]);

  const inqQ = useMyInquiries(active?.id ?? null);
  const rows = (inqQ.data?.rows ?? []).filter((r) => r.status !== "ARCHIVED");
  const answered = inqQ.data?.answeredCount ?? 0;

  if (status !== "authed" || !active || inqQ.isLoading) {
    return (
      <div className="grid min-h-[100dvh] place-items-center bg-background">
        <Loader2 className="size-6 animate-spin text-stone-700" />
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-background">
      {/* ═══ ساب‌هدر: بازگشت به لیست خرید + عنوان + بج پاسخ‌ها ═══ */}
      <header className="sticky top-0 z-20 flex h-[54px] items-center gap-2.5 border-b bg-white/92 px-3 backdrop-blur">
        <button
          type="button"
          aria-label="بازگشت به لیست خرید"
          onClick={() => router.push("/buy")}
          className="grid size-8.5 shrink-0 place-items-center rounded-[10px] text-stone-500 transition hover:bg-accent hover:text-foreground"
        >
          <ArrowLeft className="size-5 rtl:rotate-180" />
        </button>
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-bold leading-tight">درخواست‌های من</p>
          <p className="truncate text-[10.5px] font-normal leading-tight text-muted-foreground">
            {rows.length > 0 ? `${fa(rows.length)} درخواست · ${fa(answered)} پاسخ دریافتی` : "استعلام‌های قیمتی که فرستاده‌اید"}
          </p>
        </div>
      </header>

      <main className="mx-auto w-full max-w-2xl px-4 py-4 sm:px-6">
        {rows.length === 0 ? (
          <div className="rounded-2xl border border-dashed bg-white/70 p-10 text-center">
            <ClipboardList className="mx-auto size-8 text-stone-300" strokeWidth={1.75} />
            <p className="mt-2 text-sm font-bold">هنوز درخواست قیمتی نفرستاده‌اید</p>
            <p className="mt-1 text-xs leading-6 text-muted-foreground">
              در لیست خرید، تابلوی هر کالا را باز کنید و از فروشنده‌ها استعلام بگیرید؛ پاسخ‌ها همین‌جا می‌نشیند.
            </p>
            <Link
              href="/buy"
              className="mt-4 inline-flex items-center gap-1.5 rounded-[10px] bg-stone-800 px-4 py-2 text-[12.5px] font-bold text-white transition hover:bg-stone-900"
            >
              <ChevronLeft className="size-4 rtl:rotate-0" />
              بازگشت به لیست خرید
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {rows.map((r) => {
              const answeredRow = r.status === "ANSWERED";
              const href = `/sell/${r.seller.slug}/${r.listing.id}`;
              return (
                <Link
                  key={r.id}
                  href={href}
                  className={`flex w-full items-center gap-[11px] rounded-[12px] border px-3 py-2.5 text-start transition hover:shadow-sm ${
                    r.offer ? "border-[#b6dfc5] bg-[#f4fcf6]" : "border-stone-200 bg-white"
                  }`}
                >
                  <span
                    className="grid size-[30px] shrink-0 place-items-center rounded-full text-xs font-bold text-white"
                    style={{ background: avatarColor(r.seller.name) }}
                  >
                    {r.seller.name.trim().charAt(0)}
                  </span>
                  <span className="min-w-0 grow">
                    <span className="flex flex-wrap items-center gap-1.5 text-[13.5px] font-bold">
                      {r.seller.name}
                      {r.seller.isVerified && <BadgeCheck className="size-3.5 shrink-0 text-[#1d5fb8]" aria-label="تاییدشده" />}
                      {answeredRow ? (
                        <span className="rounded-full bg-[#e9f7ee] px-[9px] py-[2.5px] text-[10.5px] font-bold text-[#16a34a]">پاسخ داده‌شده</span>
                      ) : (
                        <span className="rounded-full bg-[#e8f1fd] px-[9px] py-[2.5px] text-[10.5px] font-bold text-[#1d5fb8]">در انتظار پاسخ</span>
                      )}
                    </span>
                    <span className="mt-1 flex flex-wrap items-center gap-2 text-[11.5px] text-muted-foreground">
                      <span className="flex items-center gap-[3px]">
                        <MapPin className="size-[11px]" strokeWidth={1.75} />
                        {r.seller.city}
                      </span>
                      <span className="text-[10px]">{timeAgo(r.createdAt)}</span>
                    </span>
                    <span className="mt-[7px] block rounded-[9px] bg-stone-100 px-2.5 py-[7px] text-[12.5px] leading-5 text-stone-700">
                      <b>
                        {goodName(r.listing.good)} · {fa(r.volume)} {unitLabel(r.listing.good.unit)}
                      </b>
                      {r.frequency ? ` — ${frequencyLabel(r.frequency)}` : ""}
                    </span>
                    {r.offer && (
                      <span className="mt-1.5 block rounded-[9px] bg-[#e9f7ee] px-2.5 py-[7px] text-[12.5px] leading-5 text-[#166534]">
                        پاسخ: <b className="font-bold">{fmtMoney(r.offer.priceMinor, r.offer.currency)}</b>
                        {r.offer.note ? ` — ${r.offer.note}` : ""}
                        <span className="mt-0.5 block text-[10px] font-normal text-green-700/70">
                          {timeAgo(r.offer.createdAt)}
                        </span>
                      </span>
                    )}
                  </span>
                  <ChevronLeft className="size-4 shrink-0 text-stone-300" strokeWidth={1.75} />
                </Link>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
