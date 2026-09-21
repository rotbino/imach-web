"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Compass, ShoppingBag, Store, UserRoundCheck } from "lucide-react";
import { useAuthStore } from "@/lib/auth-store";
import { useActiveBusiness } from "@/lib/active-biz";
import { useHomeFeed } from "@/lib/queries";
import { AppFooter, AppHeader, MobileTabBar } from "@/app/components/chrome";
import { UnderlineTabs } from "@/app/components/underline-tabs";
import { ExploreBuyRow, ExploreSellCard, FeedSpinner } from "@/app/components/feed-cards";
import { Button } from "@/components/ui/button";

/*
 * هوم — تازه‌های کسب‌وکارهایی که دنبال می‌کنید؛ دو تب: فروش / خرید.
 * مهمان → دعوت عضویت؛ بازارِ باز در بازار (اکسپلور) است.
 */

export default function HomePage() {
  const { status } = useAuthStore();

  useEffect(() => {
    document.title = "هوم | iMach";
  }, []);

  if (status !== "authed") {
    return (
      <div className="flex min-h-screen flex-col">
        <AppHeader />
        <main className="grow">
          <div className="mx-auto max-w-xl px-4 py-16">
            <GuestHero />
          </div>
        </main>
        <AppFooter />
        <MobileTabBar />
      </div>
    );
  }

  return <HomeBody />;
}

function HomeBody() {
  const active = useActiveBusiness();

  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader />
      <main className="grow">
        {!active ? (
          <div className="mx-auto max-w-xl px-4 py-16">
            <div className="rounded-3xl border border-dashed bg-white/70 p-10 text-center">
              <p className="text-base font-extrabold">اول کسب‌وکارتان را بسازید</p>
              <p className="mx-auto mt-1 max-w-sm text-sm leading-7 text-muted-foreground">
                برای دنبال کردن تامین‌کننده‌ها و دیدن فیدشان، به یک کسب‌وکار نیاز دارید — فقط نام و شهر.
              </p>
              <Link href="/start">
                <Button className="mt-4">ساخت کسب‌وکار</Button>
              </Link>
            </div>
          </div>
        ) : (
          <HomeFeed bizId={active.id} />
        )}
      </main>
      <AppFooter />
      <MobileTabBar />
    </div>
  );
}

function HomeFeed({ bizId }: { bizId: string }) {
  const sellQ = useHomeFeed(bizId, "SELL");
  const buyQ = useHomeFeed(bizId, "BUY");

  return (
    <div className="mx-auto w-full max-w-7xl">
      <UnderlineTabs
        defaultValue="sell"
        items={[
          { value: "sell", label: "تامین‌کنندگان", icon: Store },
          { value: "buy", label: "درخواست‌های خرید عمده", icon: ShoppingBag },
        ]}
        panels={{
          sell: <SellHomeFeed q={sellQ} />,
          buy: <BuyHomeFeed q={buyQ} />,
        }}
      />
    </div>
  );
}

type FeedQ = ReturnType<typeof useHomeFeed>;

function SellHomeFeed({ q }: { q: FeedQ }) {
  const items = q.data ?? [];
  if (q.isLoading) return <FeedSpinner />;

  if (items.length === 0) {
    return (
      <EmptyFollowed text="از دنبال‌شونده‌هایتان فعلا کالایی برای فروش نیامده است." />
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 px-4 pt-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      {items.map((l) => (
        <ExploreSellCard key={l.id} item={l} />
      ))}
    </div>
  );
}

function BuyHomeFeed({ q }: { q: FeedQ }) {
  const items = q.data ?? [];
  if (q.isLoading) return <FeedSpinner />;

  if (items.length === 0) {
    return (
      <EmptyFollowed text="از دنبال‌شونده‌هایتان فعلا درخواست خریدی نیامده است." />
    );
  }

  return (
    <div className="grid gap-3 px-4 pt-4 lg:grid-cols-2">
      {items.map((l) => (
        <ExploreBuyRow key={l.id} item={l} />
      ))}
    </div>
  );
}

function EmptyFollowed({ text }: { text: string }) {
  return (
    <div className="m-4 rounded-3xl border border-dashed bg-white/70 p-10 text-center">
      <span className="mx-auto grid size-12 place-items-center">
        <UserRoundCheck className="size-6 text-primary/40" />
      </span>
      <p className="mx-auto mt-2 max-w-md text-sm leading-7 text-muted-foreground">{text}</p>
      <Link href="/explore">
        <Button variant="outline" className="mt-4 gap-1.5">
          <Compass className="size-4" />
          رفتن به بازار
        </Button>
      </Link>
    </div>
  );
}

// ─── مهمان — دعوت عضویت ───

function GuestHero() {
  return (
    <div className="rounded-3xl border border-primary/25 bg-white p-8 text-center shadow-sm">
      <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-primary/10 text-primary">
        <UserRoundCheck className="size-7" />
      </span>
      <p className="mt-4 text-lg font-extrabold">هوم جای دنبال‌شده‌های شماست</p>
      <p className="mx-auto mt-2 max-w-sm text-sm leading-7 text-muted-foreground">
        عضو iMach شوید، تامین‌کننده‌های خوب را دنبال کنید و تازه‌ترین کالاها و قیمت‌هایشان همین‌جا ببینید — رایگان.
      </p>
      <div className="mt-5 flex flex-col items-center gap-2">
        <Link href="/start" className="w-full sm:w-auto">
          <Button className="w-full rounded-xl px-8 shadow-lg shadow-primary/25 sm:w-auto">
            عضویت رایگان در iMach
          </Button>
        </Link>
        <Link href="/explore" className="text-xs font-bold text-primary hover:underline">
          یا اول بازار را ببینید
        </Link>
      </div>
    </div>
  );
}
