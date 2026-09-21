"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/auth-store";
import { useActiveBusiness } from "@/lib/active-biz";
import { AppFooter, AppHeader, MobileTabBar } from "@/app/components/chrome";
import { ListingForm } from "@/app/components/listing-form";
import { Loader2 } from "lucide-react";

/*
 * کالای جدید — مقصد آیتم وسط نویگیشن (+).
 * کالا به کسب‌وکارِ فعال اضافه می‌شود؛ اگر کسب‌وکاری نیست، مسیر ساخت نشان داده می‌شود.
 * بعد از ثبت، کاربر به «بازوی من» می‌رود تا کالایش را در ویترین ببیند.
 */
export default function NewListingPage() {
  return (
    <>
      <AppHeader />
      <main className="grow">
        <div className="mx-auto max-w-2xl px-4 py-8">
          <NewListingBody />
        </div>
      </main>
      <AppFooter />
      <MobileTabBar />
    </>
  );
}

function NewListingBody() {
  const router = useRouter();
  const { status } = useAuthStore();
  const active = useActiveBusiness();

  useEffect(() => {
    if (status === "guest") router.replace("/start");
  }, [status, router]);

  if (status !== "authed") {
    return (
      <div className="grid place-items-center py-32">
        <Loader2 className="size-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!active) {
    return (
      <div className="rounded-2xl border border-dashed bg-white/60 p-10 text-center">
        <p className="text-lg font-extrabold">اول کسب‌وکارتان را بسازید</p>
        <p className="mt-2 text-sm text-muted-foreground">
          برای ثبت کالا به یک کسب‌وکار نیاز دارید — فقط نام و شهر می‌خواهد.
        </p>
        <button
          onClick={() => router.push("/start")}
          className="mt-4 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground shadow-sm"
        >
          ساخت کسب‌وکار
        </button>
      </div>
    );
  }

  return (
    <ListingForm
      bizId={active.id}
      submitLabel="ثبت کالا"
      onSaved={() => router.push("/arm")}
    />
  );
}
