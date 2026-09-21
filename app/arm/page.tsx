"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { ShoppingBasket, Check, ChevronDown, Loader2, Plus, Store } from "lucide-react";
import { useAuthStore } from "@/lib/auth-store";
import { useActiveBizStore } from "@/lib/active-biz";
import { useMyBusinesses } from "@/lib/queries";
import { AppFooter, AppHeader, MobileTabBar } from "@/app/components/chrome";
import { BuyArmView, SellArmView } from "@/app/components/arm-views";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

/*
 * بازوی من — لینک یکتای نویگیشن برای هر دو بازو.
 * سوییچر خرید/فروش مثل اکسپلور بالای صفحه است؛ زیرش همان ویترینی است
 * که دنیا از این بازو می‌بیند (کاتالوگ فروش یا لیست خرید).
 * کارهای مدیریتی اینجا نیست — دکمه «مدیریت بازو…» داخل هر ویترین به
 * داشبورد سبک همان بازو می‌رود (/manage/sell یا /manage/buy).
 */

export default function MyArmPage() {
  const router = useRouter();
  const { status } = useAuthStore();

  useEffect(() => {
    document.title = "بازوی من | iMach";
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

  return <ArmBody />;
}

function ArmBody() {
  const router = useRouter();
  const businessesQ = useMyBusinesses();
  const mine = businessesQ.data ?? [];

  const activeId = useActiveBizStore((s) => s.activeId);
  const setActive = useActiveBizStore((s) => s.setActive);
  const active = mine.find((b) => b.id === activeId) ?? mine[0] ?? null;

  if (businessesQ.isLoading) {
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

  if (!active) {
    return (
      <div className="flex min-h-screen flex-col">
        <AppHeader />
        <main className="grow">
          <div className="mx-auto max-w-xl px-4 py-16">
            <div className="rounded-3xl border border-dashed bg-white/70 p-10 text-center">
              <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-primary/10 text-primary">
                <Plus className="size-7" />
              </span>
              <p className="mt-4 text-lg font-extrabold">اول کسب‌وکارتان را بسازید</p>
              <p className="mx-auto mt-1 max-w-sm text-sm leading-7 text-muted-foreground">
                «بازوی من» ویترین کسب‌وکار شماست — فقط نام و شهر می‌خواهد.
              </p>
              <Button className="mt-5" onClick={() => router.push("/start")}>
                ساخت کسب‌وکار
              </Button>
            </div>
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
        <div className="mx-auto max-w-4xl px-4 py-5">
          {/* سرصفحه: بازوی من + جابه‌جایی بین کسب‌وکارها (مثل اینستاگرام) */}
          <div className="mb-4 flex items-center justify-between gap-2">
            <h1 className="flex items-center gap-2 text-xl font-extrabold">
              <span className="grid size-9 place-items-center rounded-xl bg-primary/10 text-primary">
                <Store className="size-4.5" />
              </span>
              بازوی من
            </h1>

            {mine.length > 1 && (
              <DropdownMenu>
                <DropdownMenuTrigger
                  className="flex max-w-[50vw] items-center gap-1.5 rounded-xl border bg-white px-3 py-2 text-sm font-bold shadow-sm"
                  aria-label="تغییر کسب‌وکار"
                >
                  <span className="truncate">{active.name}</span>
                  <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-56">
                  <DropdownMenuLabel>کسب‌وکارهای من</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {mine.map((b) => (
                    <DropdownMenuItem key={b.id} onClick={() => setActive(b.id)} className="gap-2">
                      <span className="grid size-6 place-items-center rounded-md bg-primary/10 text-xs font-black text-primary">
                        {b.name.slice(0, 1)}
                      </span>
                      <span className="truncate">{b.name}</span>
                      {b.id === active.id && <Check className="ms-auto size-4 text-primary" />}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>

          {/* سوییچر بازو — قلب این صفحه */}
          <Tabs defaultValue="sell">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="sell" className="gap-1.5">
                <Store className="size-4" />
                بازوی فروش
              </TabsTrigger>
              <TabsTrigger value="buy" className="gap-1.5">
                <ShoppingBasket className="size-4" />
                بازوی خرید
              </TabsTrigger>
            </TabsList>

            {/* key={active.id}: با جابه‌جایی کسب‌وکار، ویترین تازه می‌شود */}
            <TabsContent value="sell" className="mt-5">
              <SellArmView key={`s-${active.id}`} slug={active.slug} />
            </TabsContent>
            <TabsContent value="buy" className="mt-5">
              <BuyArmView key={`b-${active.id}`} slug={active.slug} />
            </TabsContent>
          </Tabs>
        </div>
      </main>
      <AppFooter />
      <MobileTabBar />
    </div>
  );
}
