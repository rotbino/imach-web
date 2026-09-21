"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useAuthStore } from "@/lib/auth-store";
import { setArmActive, useActiveBusiness } from "@/lib/active-biz";
import { AppFooter, AppHeader, MobileTabBar } from "@/app/components/chrome";
import { BoardSection, FollowCard, MyItemsSection, ShareCard } from "@/app/components/sections";
import { useMyBusinesses } from "@/lib/queries";

/*
 * دستیار خرید — صفحه‌ی بازوی خرید (خواسته‌ی کاربر):
 * اتاق کار خریدار؛ همه‌چیز بهینه‌ی خرید:
 * نیازهای خرید من، تابلوهای دنبال‌شده، تامین‌کننده‌های دنبال‌شده
 * و لینک عمومی لیست خرید برای فرستادن به تامین‌کننده‌ها.
 */

export default function BuyPage() {
  const router = useRouter();
  const { status } = useAuthStore();

  useEffect(() => {
    document.title = "دستیار خرید | iMach";
    setArmActive("buy");
    if (status === "guest") router.replace("/start");
  }, [status, router]);

  if (status !== "authed") {
    return (
      <div className="flex min-h-screen flex-col">
        <AppHeader />
        <main className="grow">
          <div className="grid place-items-center py-32">
            <Loader2 className="size-6 animate-spin text-stone-700" />
          </div>
        </main>
        <AppFooter />
        <MobileTabBar />
      </div>
    );
  }

  return <BuyBody />;
}

function BuyBody() {
  const active = useActiveBusiness();
  const bizQ = useMyBusinesses();

  if (bizQ.isLoading) {
    return (
      <div className="grid place-items-center py-32">
        <Loader2 className="size-6 animate-spin text-stone-700" />
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

  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader />
      <main className="grow">
        <div className="mx-auto max-w-2xl space-y-5 px-4 py-6">
          <ShareCard
            kind="buy"
            slug={active.slug}
            bizName={active.name}
            onView={() => window.location.assign(`/buy/${active.slug}`)}
          />
          <MyItemsSection bizId={active.id} side="buy" />
          <BoardSection bizId={active.id} />
          <FollowCard kind="following" bizId={active.id} />
        </div>
      </main>
      <AppFooter />
      <MobileTabBar />
    </div>
  );
}
