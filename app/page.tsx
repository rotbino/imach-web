"use client";

import Link from "next/link";
import { fa } from "@/lib/format";
import { AppFooter, AppHeader } from "@/app/components/chrome";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  CheckCircle2,
  Factory,
  HandCoins,
  MapPin,
  Package,
  Phone,
  Scale,
  ShoppingBasket,
  Store,
  TrendingUp,
} from "lucide-react";

/*
 * صفحه اول — ارزش‌محور، نه فرایندمحور.
 * به کاربر نمی‌گوییم «چطور کار می‌کنیم»؛ می‌گوییم «چه چیزی دستش می‌آید»:
 * ارزان‌تر خریدن، بیشتر فروختن، مقایسه‌ی یک‌جای قیمت‌ها — با مثال و گرافیک ساده.
 * طبق قانون ساختار پروژه، کامپوننت‌های اختصاصی این صفحه همین‌جا در خود صفحه‌اند.
 */

const DEMO_CHIPS = ["خورشید مارکت", "طبیعت‌دانه پخش", "پخش گستر البرز", "شیرین‌عسل اردبیل"];

const VALUES: {
  title: string;
  desc: string;
  example: string;
  icon: React.ComponentType<{ className?: string }>;
  chip: string;
}[] = [
  {
    title: "ارزان‌تر بخر",
    desc: "قیمت را از خودِ کارخانه و عمده‌فروش بگیر، نه از واسطه‌ها.",
    example: "پیاز را از مزرعه بخر، نه از دلال",
    icon: HandCoins,
    chip: "bg-primary text-white",
  },
  {
    title: "بیشتر بفروش",
    desc: "کاتالوگ کالاهایت یک لینک می‌شود؛ همان را بفرست دست مغازه‌ها تا سفارش بگیری.",
    example: "لینکت می‌رود دست هزار مغازه",
    icon: TrendingUp,
    chip: "bg-primary/15 text-primary",
  },
  {
    title: "قیمت‌ها را یک‌جا مقایسه کن",
    desc: "پیشنهاد همه‌ی تامین‌کننده‌ها در یک تابلو جمع می‌شود؛ ارزان‌ترین را انتخاب کن.",
    example: "۵ قیمت برای یک نیاز",
    icon: Scale,
    chip: "bg-stone-800 text-white",
  },
];

const STORIES: {
  name: string;
  role: string;
  city: string;
  icon: React.ComponentType<{ className?: string }>;
  before: string;
  after: string;
}[] = [
  {
    name: "رضایی",
    role: "سوپرمارکت‌دار — می‌خرد",
    city: "تبریز",
    icon: ShoppingBasket,
    before: "برای ۲۰ گونی پیاز، ساعت‌ها با دلال‌ها تماس گرفت؛ هر کسی یک قیمت گفت.",
    after: "یک فرم پر کرد؛ ۵ تامین‌کننده قیمت داد؛ ارزان‌ترین را همان‌جا انتخاب کرد.",
  },
  {
    name: "موسوی",
    role: "ترشی و خیارشور — می‌فروشد",
    city: "اردبیل",
    icon: Store,
    before: "فروشش فقط به مشتری‌های شهر خودش محدود بود.",
    after: "لینک کاتالوگش را فرستاد دست مغازه‌ها؛ از تبریز و رشت سفارش گرفت.",
  },
];

const PRICE_ROWS: { name: string; price: number; best?: boolean }[] = [
  { name: "پخش گستر البرز", price: 420000, best: true },
  { name: "طبیعت‌دانه پخش", price: 435000 },
  { name: "شیرین‌عسل اردبیل", price: 445000 },
];

// ─── هیرو: وعده‌ی ارزش در یک نگاه ───
function Hero() {
  return (
    <section className="dot-grid border-b bg-gradient-to-b from-accent/40 to-transparent">
      <div className="mx-auto max-w-5xl px-4 py-12 text-center sm:py-16">
        <Badge variant="outline" className="mb-4 border-primary/30 bg-white text-primary">
          بازار عمده‌ی آنلاین — مخصوص مغازه‌دارها و تولیدکننده‌ها
        </Badge>
        <h1 className="mx-auto max-w-2xl text-3xl font-black leading-snug sm:text-4xl sm:leading-snug">
          <span className="text-primary">ارزان‌تر بخر.</span> بیشتر بفروش.
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-muted-foreground sm:text-base">
          iMach تو را مستقیم به تامین‌کننده‌ها و خریدارها می‌رساند؛
          بدون واسطه، بدون تماس‌های بی‌فایده.
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Link href="/start">
            <Button size="lg">
              رایگان شروع کن
              <ArrowLeft className="size-4 ltr:rotate-180" />
            </Button>
          </Link>
          <Link href="/buy/khorshid-market">
            <Button size="lg" variant="outline">
              یک نمونه‌ی واقعی ببین
            </Button>
          </Link>
        </div>

        {/* گرافیک فلت: تامین‌کننده ← بی‌واسطه ← کسب‌وکار تو */}
        <div className="mx-auto mt-10 flex max-w-xl items-center" aria-hidden>
          <div className="rounded-2xl border bg-white p-3 text-center shadow-sm">
            <span className="mx-auto grid size-11 place-items-center rounded-xl bg-accent text-primary">
              <Factory className="size-5" />
            </span>
            <p className="mt-2 text-xs font-bold">تامین‌کننده</p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">کارخانه و عمده‌فروش</p>
          </div>

          <div className="relative mx-2 grow sm:mx-3">
            <div className="border-t-2 border-dashed border-primary/40" />
            <span className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center gap-1.5 whitespace-nowrap rounded-full bg-primary px-3 py-1.5 text-[11px] font-bold text-white shadow-sm animate-soft-pulse">
              <Package className="size-3.5" />
              بدون واسطه
            </span>
          </div>

          <div className="rounded-2xl border border-primary/25 bg-white p-3 text-center shadow-sm">
            <span className="mx-auto grid size-11 place-items-center rounded-xl bg-primary text-white">
              <Store className="size-5" />
            </span>
            <p className="mt-2 text-xs font-bold">کسب‌وکار تو</p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">مغازه یا کارگاه</p>
          </div>
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-2 text-xs text-muted-foreground">
          {DEMO_CHIPS.map((name) => (
            <span key={name} className="rounded-full border bg-white px-3 py-1">
              {name}
            </span>
          ))}
          <span>و {fa(1218)} کسب‌وکار دیگر…</span>
        </div>
      </div>
    </section>
  );
}

// ─── سه ارزش اصلی ───
function Values() {
  return (
    <section className="mx-auto max-w-5xl px-4 py-10">
      <h2 className="text-center text-xl font-extrabold sm:text-2xl">با iMach چی گیرت می‌آید؟</h2>
      <p className="mt-2 text-center text-sm text-muted-foreground">سه چیز ساده:</p>
      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        {VALUES.map((v) => (
          <div key={v.title} className="rounded-2xl border bg-white p-5 shadow-sm">
            <span className={`grid size-11 place-items-center rounded-xl ${v.chip}`}>
              <v.icon className="size-5" />
            </span>
            <p className="mt-3 font-extrabold">{v.title}</p>
            <p className="mt-1.5 text-sm leading-6 text-muted-foreground">{v.desc}</p>
            <p className="mt-3 inline-block rounded-full border bg-background px-3 py-1 text-xs text-muted-foreground">
              <span className="font-bold text-primary">مثلاً: </span>
              {v.example}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

// ─── دو داستان کوتاه: قبل و بعد ───
function StoryCard({ story }: { story: (typeof STORIES)[number] }) {
  return (
    <div className="rounded-2xl border bg-white p-5 shadow-sm">
      <div className="flex items-center gap-3">
        <span className="grid size-11 place-items-center rounded-xl bg-primary/10 text-lg font-black text-primary">
          {story.name.slice(0, 1)}
        </span>
        <div>
          <p className="font-extrabold">{story.name}</p>
          <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="size-3.5" />
            {story.city} — {story.role}
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-2">
        <div className="flex items-start gap-3 rounded-xl bg-stone-100/80 p-3">
          <Phone className="mt-0.5 size-4 shrink-0 text-stone-400" />
          <p className="text-sm leading-6 text-stone-600">
            <span className="me-1.5 inline-block rounded-md bg-stone-200 px-2 py-0.5 text-[11px] font-bold text-stone-600">
              قبل
            </span>
            {story.before}
          </p>
        </div>
        <div className="flex items-start gap-3 rounded-xl bg-accent/60 p-3">
          <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
          <p className="text-sm leading-6 text-foreground">
            <span className="me-1.5 inline-block rounded-md bg-primary px-2 py-0.5 text-[11px] font-bold text-white">
              با iMach
            </span>
            {story.after}
          </p>
        </div>
      </div>
    </div>
  );
}

function Stories() {
  return (
    <section className="border-y bg-white">
      <div className="mx-auto max-w-5xl px-4 py-10">
        <h2 className="text-center text-xl font-extrabold sm:text-2xl">دو تا داستان کوتاه</h2>
        <p className="mt-2 text-center text-sm text-muted-foreground">از دل همین بازار، نه حرف‌های بزرگ:</p>
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {STORIES.map((s) => (
            <StoryCard key={s.name} story={s} />
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── نمونه‌ی گرافیکی تابلوی قیمت ───
function PriceBoard() {
  return (
    <section className="mx-auto max-w-5xl px-4 py-10">
      <h2 className="text-center text-xl font-extrabold sm:text-2xl">قیمت‌ها را یک‌جا ببین</h2>
      <p className="mt-2 text-center text-sm text-muted-foreground">
        برای هر نیازی که ثبت کنی، همین تابلو برایت ساخته می‌شود:
      </p>

      <div className="mx-auto mt-6 max-w-xl overflow-hidden rounded-2xl border bg-white shadow-sm">
        <div className="flex items-center justify-between gap-2 border-b bg-accent/50 px-4 py-3">
          <p className="text-sm font-extrabold">نیاز: پیاز — ۲۰ گونی</p>
          <p className="flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="size-3.5" />
            تبریز
          </p>
        </div>
        <div className="grid">
          {PRICE_ROWS.map((row, i) => (
            <div
              key={row.name}
              className={`flex items-center justify-between gap-2 px-4 py-3 ${
                i < PRICE_ROWS.length - 1 ? "border-b" : ""
              } ${row.best ? "bg-accent/40" : ""}`}
            >
              <div className="flex items-center gap-2">
                <Store className={`size-4 ${row.best ? "text-primary" : "text-muted-foreground"}`} />
                <p className={`text-sm ${row.best ? "font-extrabold" : "text-muted-foreground"}`}>
                  {row.name}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {row.best && (
                  <Badge className="bg-primary text-[11px] text-white">ارزان‌ترین</Badge>
                )}
                <p className={`text-sm ${row.best ? "font-extrabold text-primary" : "text-muted-foreground"}`}>
                  {fa(row.price)} تومان
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── دعوت پایانی ───
function StartCta() {
  return (
    <section className="mx-auto max-w-5xl px-4 pb-12">
      <div className="rounded-2xl border border-primary/25 bg-accent/50 p-6 text-center sm:p-8">
        <h2 className="text-lg font-extrabold sm:text-xl">همین حالا شروع کن</h2>
        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
          ثبت کالاها ۵ دقیقه وقت می‌گیرد؛ بعدش خریدار و تامین‌کننده خودشان می‌آیند.
        </p>
        <Link href="/start" className="mt-4 inline-block">
          <Button size="lg">
            <ShoppingBasket className="size-4" />
            ثبت رایگان کالاها
          </Button>
        </Link>
      </div>
    </section>
  );
}

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader />
      <main className="grow">
        <Hero />
        <Values />
        <Stories />
        <PriceBoard />
        <StartCta />
      </main>
      <AppFooter />
    </div>
  );
}
