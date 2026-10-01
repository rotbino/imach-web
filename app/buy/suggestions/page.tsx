"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Sparkles } from "lucide-react";
import { useAuthStore } from "@/lib/auth-store";
import { setArmActive } from "@/lib/active-biz";
import { AppFooter, AppHeader, MobileTabBar, SectionTitle } from "@/app/components/chrome";

/*
 * پیشنهدها — دستیار خرید (design-reference/screens/11)
 * فاز ۱: اسکلت صفحه با حالت خالیِ صادقانه؛ منبع داده (getSuggestions)
 * در فاز پیشنهادها ساخته می‌شود — هیچ داده‌ی جعلی نمایش نمی‌دهیم.
 */

export default function SuggestionsPage() {
  const router = useRouter();
  const { status } = useAuthStore();

  useEffect(() => {
    document.title = "پیشنهدها | iMach";
    setArmActive("buy");
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

  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader />
      <main className="grow">
        <div className="mx-auto max-w-2xl px-4 py-4 pb-24 sm:pb-8">
          <SectionTitle
            icon={<Sparkles className="size-[18px] text-stone-800" strokeWidth={1.75} />}
            title="پیشنهدهای iMach"
          />
          <p className="-mt-1 mb-3 text-[11.5px] leading-7 text-muted-foreground">
            بر اساس کالاهای لیست خرید و تابلوهای تأمین شما
          </p>

          <div className="rounded-2xl border-[1.5px] border-dashed border-stone-300 bg-[#fdfcf9] px-4 py-6 text-center text-[12.5px] leading-9 text-muted-foreground">
            فعلاً پیشنهادی برایت نداریم.
            <br />
            وقتی کالایی به لیست خریدت اضافه کنی یا تابلوی تأمین بسازی،
            iMach قیمت‌های بهتر و تأمین‌کننده‌های تازه را همین‌جا پیشنهاد می‌دهد.
          </div>
        </div>
      </main>
      <AppFooter />
      <MobileTabBar />
    </div>
  );
}
