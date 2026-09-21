"use client";

import { Suspense, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/auth-store";
import { useActiveBusiness } from "@/lib/active-biz";
import { AppFooter, AppHeader, MobileTabBar } from "@/app/components/chrome";
import { ListingForm, type ListingKind } from "@/app/components/listing-form";
import { useTabParam } from "@/app/components/url-tabs";
import { Loader2 } from "lucide-react";

/*
 * کالای جدید — مقصد آیتم وسط نویگیشن (+).
 * تب فروش/خرید با URL سینک است (/new?tab=sell|buy) — لینک مستقیم به ثبتِ همان محیط.
 * کالا به کسب‌وکارِ فعال اضافه می‌شود؛ بعد از ثبت، کاربر به کاتالوگ یا میز خرید می‌رود.
 */
export default function NewListingPage() {
  return (
    <>
      <AppHeader />
      <main className="grow">
        <div className="mx-auto max-w-2xl px-4 py-8">
          <Suspense
            fallback={
              <div className="grid place-items-center py-32">
                <Loader2 className="size-6 animate-spin text-primary" />
              </div>
            }
          >
            <NewListingBody />
          </Suspense>
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
  const [kind, setKind] = useTabParam("sell", ["sell", "buy"]);

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
      currency={active.currency}
      kind={kind as ListingKind}
      onKindChange={setKind}
      onSaved={(k) => router.push(k === "sell" ? "/sell?tab=catalog" : "/buy?tab=desk")}
    />
  );
}
