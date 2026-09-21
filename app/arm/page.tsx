"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { ShoppingBasket, Check, ChevronDown, Loader2, Plus, Store } from "lucide-react";
import { useAuthStore } from "@/lib/auth-store";
import { useActiveBizStore } from "@/lib/active-biz";
import { useMyBusinesses } from "@/lib/queries";
import { AppFooter, AppHeader, MobileTabBar } from "@/app/components/chrome";
import { BuyArmView, SellArmView } from "@/app/components/arm-views";
import { UrlTabs } from "@/app/components/url-tabs";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/*
 * بازوی من — لینک یکتای نویگیشن برای هر دو بازو.
 * سوییچر خرید/فروش تبِ واقعی است؛ هر تب مثل یک صفحه مستقل:
 * نوار ابزار مالک + همان ویترینی که دنیا از این بازو می‌بیند.
 * کارهای مدیریتی اینجا نیست — آیکون چرخ‌دنده نوار ابزار به
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
          {/* جابه‌جایی بین کسب‌وکارها — فقط وقتی بیش از یکی است */}
          {mine.length > 1 && (
            <div className="mb-4 flex justify-end">
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
            </div>
          )}

          {/* سوییچر بازو — تب واقعی با آدرس اختصاصی (/arm?tab=sell|buy) */}
          {/* key={active.id}: با جابه‌جایی کسب‌وکار، ویترین تازه می‌شود */}
          <UrlTabs
            defaultValue="sell"
            items={[
              { value: "sell", label: "بازوی فروش", icon: Store },
              { value: "buy", label: "بازوی خرید", icon: ShoppingBasket },
            ]}
            panels={{
              sell: <SellArmView key={`s-${active.id}`} slug={active.slug} />,
              buy: <BuyArmView key={`b-${active.id}`} slug={active.slug} />,
            }}
          />
        </div>
      </main>
      <AppFooter />
      <MobileTabBar />
    </div>
  );
}
