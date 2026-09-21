"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Compass, ShoppingBag, Store, UserRoundCheck } from "lucide-react";
import { useAuthStore } from "@/lib/auth-store";
import { useActiveBusiness } from "@/lib/active-biz";
import { useHomeFeed } from "@/lib/queries";
import { AppFooter, AppHeader, MobileTabBar } from "@/app/components/chrome";
import { ExploreBuyRow, ExploreSellCard, FeedSpinner } from "@/app/components/feed-cards";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";

/*
 * هوم — مثل اینستاگرام: اینجا تازه‌های کسب‌وکارهایی که دنبال می‌کنید می‌آید.
 * دو تب (فروش/خرید) چون هم پیشنهاد فروش داریم و هم درخواست خرید.
 * دنبال کردن جای فالو: دنبال کردن یعنی «تامین‌کننده‌های منتخب من» —
 * قیمت‌هایشان در تابلوی قیمت مدیریت بازوی خرید جمع می‌شود.
 * مهمان → دعوت عضویت؛ بازارِ باز در اکسپلور است.
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
        <div className="mx-auto max-w-4xl px-4 py-6">
          <header className="mb-4">
            <h1 className="flex items-center gap-2 text-xl font-extrabold">
              <span className="grid size-9 place-items-center rounded-xl bg-primary/10 text-primary">
                <UserRoundCheck className="size-4.5" />
              </span>
              هوم
            </h1>
            <p className="mt-1.5 text-xs text-muted-foreground">
              تازه‌ترین کالاهای فروش و نیازهای خرید کسب‌وکارهایی که دنبال می‌کنید
            </p>
          </header>

          {!active ? (
            <div className="rounded-3xl border border-dashed bg-white/70 p-10 text-center">
              <p className="text-base font-extrabold">اول کسب‌وکارتان را بسازید</p>
              <p className="mx-auto mt-1 max-w-sm text-sm leading-7 text-muted-foreground">
                برای دنبال کردن تامین‌کننده‌ها و دیدن فیدشان، به یک کسب‌وکار نیاز دارید — فقط نام و شهر.
              </p>
              <Link href="/start">
                <Button className="mt-4">ساخت کسب‌وکار</Button>
              </Link>
            </div>
          ) : (
            <HomeFeed bizId={active.id} />
          )}
        </div>
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
    <Tabs defaultValue="sell">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="sell" className="gap-1.5">
          <Store className="size-4" />
          پیشنهادهای فروش
        </TabsTrigger>
        <TabsTrigger value="buy" className="gap-1.5">
          <ShoppingBag className="size-4" />
          درخواست‌های خرید
        </TabsTrigger>
      </TabsList>

      <TabsContent value="sell" className="mt-4">
        <SellHomeFeed q={sellQ} />
      </TabsContent>
      <TabsContent value="buy" className="mt-4">
        <BuyHomeFeed q={buyQ} />
      </TabsContent>
    </Tabs>
  );
}

type FeedQ = ReturnType<typeof useHomeFeed>;

function SellHomeFeed({ q }: { q: FeedQ }) {
  const items = q.data ?? [];
  if (q.isLoading) return <FeedSpinner />;

  if (items.length === 0) {
    return (
      <EmptyFollowed
        text="از کسب‌وکارهایی که دنبال می‌کنید فعلا کالایی برای فروش نگذاشته‌اند — یا هنوز کسی را دنبال نکرده‌اید."
        hint="در اکسپلور، تامین‌کننده‌های مناسب کالاهای شما پیشنهاد می‌شوند."
      />
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
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
      <EmptyFollowed
        text="از کسب‌وکارهایی که دنبال می‌کنید فعلا درخواست خریدی ثبت نشده است."
        hint="کالاهایی که دنبال می‌کنید هر نیاز تازه‌ای بگذارند، همین‌جا می‌بینید."
      />
    );
  }

  return (
    <div className="space-y-3">
      {items.map((l) => (
        <ExploreBuyRow key={l.id} item={l} />
      ))}
    </div>
  );
}

function EmptyFollowed({ text, hint }: { text: string; hint?: string }) {
  return (
    <div className="rounded-3xl border border-dashed bg-white/70 p-10 text-center">
      <span className="mx-auto grid size-12 place-items-center">
        <UserRoundCheck className="size-6 text-primary/40" />
      </span>
      <p className="mx-auto mt-2 max-w-md text-sm leading-7 text-muted-foreground">{text}</p>
      {hint && <p className="mx-auto mt-1 max-w-md text-xs leading-6 text-muted-foreground/80">{hint}</p>}
      <Link href="/explore">
        <Button variant="outline" className="mt-4 gap-1.5">
          <Compass className="size-4" />
          رفتن به اکسپلور
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
