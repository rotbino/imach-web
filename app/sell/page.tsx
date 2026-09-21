"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useAuthStore } from "@/lib/auth-store";
import { useActiveBusiness, setLastEnv } from "@/lib/active-biz";
import { AppFooter, AppHeader, MobileTabBar } from "@/app/components/chrome";
import { UrlTabs } from "@/app/components/url-tabs";
import { SellCartable } from "./cartable";
import { SellCatalog } from "./catalog";

/*
 * محیط فروش (imach-sell) — دنیای «تابلوی قیمت من» (سند فصل ۴.۱):
 * کارتابل: خبرهای فروش (استعلام‌ها، پیگیری‌ها، تقاضای مرتبط).
 * کاتالوگ: کالاها و قیمت‌های من + لینک عمومی.
 * هیچ نشانی از محیط خرید در اینجا نیست.
 */
export default function SellEnvPage() {
  const router = useRouter();
  const { status } = useAuthStore();

  useEffect(() => {
    document.title = "محیط فروش | iMach";
    setLastEnv("sell");
    if (status === "guest") router.replace("/start");
  }, [status, router]);

  if (status !== "authed") {
    return (
      <div className="flex min-h-screen flex-col">
        <AppHeader />
        <main className="grow">
          <div className="grid place-items-center py-32">
            <Loader2 className="size-6 animate-spin text-primary" />
          </div>
        </main>
        <AppFooter />
        <MobileTabBar />
      </div>
    );
  }

  return <SellEnvBody />;
}

function SellEnvBody() {
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
              className="mt-4 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground shadow-sm"
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
            { value: "catalog", label: "کاتالوگ" },
          ]}
          panels={{
            cartable: <SellCartable key={active.id} bizId={active.id} slug={active.slug} city={active.city} />,
            catalog: <SellCatalog key={active.id} bizId={active.id} slug={active.slug} name={active.name} />,
          }}
        />
      </main>
      <AppFooter />
      <MobileTabBar />
    </div>
  );
}
