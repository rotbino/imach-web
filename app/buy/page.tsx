"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useAuthStore } from "@/lib/auth-store";
import { useActiveBusiness, setLastEnv } from "@/lib/active-biz";
import { AppFooter, AppHeader, MobileTabBar } from "@/app/components/chrome";
import { UrlTabs } from "@/app/components/url-tabs";
import { BuyCartable } from "./cartable";
import { BuyDesk } from "./desk";

/*
 * محیط خرید (imach-buy) — دنیای «خریدهای من» (سند فصل ۴.۲):
 * کارتابل: خبرهای خرید (پیشنهادهای دریافتی، تامین‌کننده‌های پیشنهادی).
 * میز خرید: نیازهای خرید من، تابلوهای دنبال‌شده، لینک عمومی لیست خرید.
 * خریداران من در اینجا ردپایی ندارند.
 */
export default function BuyEnvPage() {
  const router = useRouter();
  const { status } = useAuthStore();

  useEffect(() => {
    document.title = "محیط خرید | iMach";
    setLastEnv("buy");
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

  return <BuyEnvBody />;
}

function BuyEnvBody() {
  const active = useActiveBusiness();

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
        <UrlTabs
          defaultValue="cartable"
          items={[
            { value: "cartable", label: "کارتابل" },
            { value: "desk", label: "میز خرید" },
          ]}
          panels={{
            cartable: <BuyCartable key={active.id} bizId={active.id} slug={active.slug} city={active.city} />,
            desk: <BuyDesk key={active.id} bizId={active.id} slug={active.slug} name={active.name} />,
          }}
        />
      </main>
      <AppFooter />
      <MobileTabBar />
    </div>
  );
}
