"use client";

import Link from "next/link";
import { fa } from "@/lib/format";
import { AppFooter, AppHeader } from "@/app/components/chrome";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  EyeOff,
  Factory,
  MapPin,
  Package,
  ShoppingBasket,
  Store,
} from "lucide-react";

/*
 * صفحه اول — روایت «ابزار رایگان»، نه «شبکه».
 * ما هنوز شبکه‌ای نداریم؛ شبکه از همین‌جا شکل می‌گیرد که هر کسب‌وکار
 * کاتالوگ فروش یا لیست خرید هوشمندش را بسازد و برای مشتری‌ها و
 * تامین‌کننده‌های خودش بفرستد. پس وعده‌ی ما ارزشِ ابزار است:
 * فالو شدن کاتالوگ، قیمت به‌روز، کنترل نمایش قیمت، پیشنهادهای یک‌جا.
 * هیچ عدد و ادعای شبکه‌ای اینجا نمایش داده نمی‌شود.
 * طبق قانون ساختار پروژه، کامپوننت‌های اختصاصی این صفحه همین‌جا در خود صفحه‌اند.
 */

const VALUES: {
  title: string;
  desc: string;
  example: string;
  icon: React.ComponentType<{ className?: string }>;
  chip: string;
}[] = [
  {
    title: "کاتالوگ فروش هوشمند",
    desc: "کالاهایت را یک‌بار ثبت کن؛ مشتری‌هایت کاتالوگت را فالو می‌کنند و همیشه آخرین قیمت‌ها را می‌بینند.",
    example: "قیمت امروز، بدون هیچ تماسی، دست همه‌ی مشتری‌هایت",
    icon: Store,
    chip: "bg-primary text-white",
  },
  {
    title: "لیست خرید هوشمند",
    desc: "چه چیزی و چه حجمی می‌خری، یک‌بار بنویس و بفرست برای تامین‌کننده‌هایی که می‌شناسی؛ پیشنهاد بگیر.",
    example: "۵ پیشنهاد برای یک نیاز، بدون تماس‌های بی‌فایده",
    icon: ShoppingBasket,
    chip: "bg-stone-800 text-white",
  },
  {
    title: "هر قیمت، فقط برای کسی که می‌خواهی",
    desc: "قیمت هر کالا را برای هر مشتری جدا کنترل کن؛ کسی سر از قیمت دیگری درنمی‌آورد.",
    example: "قیمت عمده برای مشتری قدیمی، قیمت دیگر برای بقیه",
    icon: EyeOff,
    chip: "bg-primary/15 text-primary",
  },
];

// نمونه‌های داخل شماتیک — صرفاً برای نمایش شکل کار ابزار
const CATALOG_ROWS = [
  { name: "روغن سرخ‌کردنی ۱۰ لیتری", price: 420000, when: "امروز" },
  { name: "برنج طارم ۱۰ کیلویی", price: 980000, when: "امروز" },
  { name: "پیاز — کیسه ۲۵ کیلویی", price: 310000, when: "دیروز" },
];

const OFFER_ROWS = [
  { name: "پخش گستر البرز", price: 420000, best: true },
  { name: "طبیعت‌دانه پخش", price: 435000, best: false },
  { name: "شیرین‌عسل اردبیل", price: 445000, best: false },
];

// ─── هیرو: ابزار رایگان، ارزش در یک نگاه ───
function Hero() {
  return (
    <section className="dot-grid border-b bg-gradient-to-b from-accent/40 to-transparent">
      <div className="mx-auto max-w-5xl px-4 py-12 text-center sm:py-16">
        <Badge variant="outline" className="mb-4 border-primary/30 bg-white text-primary">
          ابزار رایگان: کاتالوگ فروش و لیست خرید هوشمند
        </Badge>
        <h1 className="mx-auto max-w-2xl text-3xl font-black leading-snug sm:text-4xl sm:leading-snug">
          <span className="text-primary">ارزان‌تر بخر.</span> بیشتر بفروش.
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-muted-foreground sm:text-base">
          کاتالوگ فروشت را بساز و لینکش را بفرست دست مشتری‌هایت؛
          لیست خریدت را بفرست دست تامین‌کننده‌هایت. همه‌چیز رایگان، همه‌چیز با یک لینک.
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Link href="/start">
            <Button size="lg">
              رایگان بسازش
              <ArrowLeft className="size-4 ltr:rotate-180" />
            </Button>
          </Link>
          <a href="#arms">
            <Button size="lg" variant="outline">
              این شکلی کار می‌کند
            </Button>
          </a>
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

// ─── شماتیک دو بازو: وسوسه‌ی «این ابزار واقعا به دردم می‌خورد» ───
function ArmSchematic() {
  return (
    <section id="arms" className="scroll-mt-16 border-y bg-white">
      <div className="mx-auto max-w-5xl px-4 py-10">
        <h2 className="text-center text-xl font-extrabold sm:text-2xl">این شکلی کار می‌کند</h2>
        <p className="mt-2 text-center text-sm text-muted-foreground">
          پیش‌نمایش دو بازوی iMach — ساختنشان رایگان است:
        </p>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {/* ── بازوی فروش: کاتالوگ هوشمند ── */}
          <div className="rounded-2xl border border-primary/25 bg-gradient-to-b from-accent/30 to-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <span className="grid size-10 place-items-center rounded-xl bg-primary text-white">
                  <Store className="size-5" />
                </span>
                <div>
                  <p className="text-sm font-extrabold">کسب‌وکار تو</p>
                  <p className="text-[11px] text-muted-foreground">کاتالوگ فروش هوشمند</p>
                </div>
              </div>
              <Badge variant="outline" className="border-primary/30 bg-white text-primary">
                بازوی فروش
              </Badge>
            </div>

            {/* مini کاتالوگ */}
            <div className="mt-4 overflow-hidden rounded-xl border bg-white">
              {CATALOG_ROWS.map((row, i) => (
                <div
                  key={row.name}
                  className={`flex items-center justify-between gap-2 px-3.5 py-2.5 ${
                    i < CATALOG_ROWS.length - 1 ? "border-b" : ""
                  }`}
                >
                  <p className="text-xs text-foreground">{row.name}</p>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                      <Clock className="size-3" />
                      {row.when}
                    </span>
                    <p className="text-xs font-extrabold text-primary">{fa(row.price)} تومان</p>
                  </div>
                </div>
              ))}
            </div>

            <p className="mt-3 flex items-center gap-1.5 rounded-lg bg-accent/60 px-3 py-2 text-[11px] leading-5 text-accent-foreground">
              <CheckCircle2 className="size-3.5 shrink-0 text-primary" />
              مشتری‌ها لینک را باز می‌کنند، کاتالوگت را فالو می‌کنند و قیمت جدید را فوری می‌بینند.
            </p>

            <ul className="mt-3 grid gap-1.5 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
                لینکش را در واتساپ و تلگرام بفرست — سایت و اپ لازم نیست
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
                هر قیمت را فقط به کسانی نشان بده که می‌خواهی
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
                قیمت‌ها را هر وقت خواستی به‌روز کن؛ همه همیشه آخرین نسخه را می‌بینند
              </li>
            </ul>
          </div>

          {/* ── بازوی خرید: لیست خرید هوشمند ── */}
          <div className="rounded-2xl border bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <span className="grid size-10 place-items-center rounded-xl bg-stone-800 text-white">
                  <ShoppingBasket className="size-5" />
                </span>
                <div>
                  <p className="text-sm font-extrabold">نیاز تو: پیاز — ۲۰ گونی</p>
                  <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
                    <MapPin className="size-3" />
                    تبریز
                  </p>
                </div>
              </div>
              <Badge variant="outline" className="bg-white text-stone-600">
                بازوی خرید
              </Badge>
            </div>

            {/* mini پیشنهادها */}
            <div className="mt-4 overflow-hidden rounded-xl border bg-white">
              {OFFER_ROWS.map((row, i) => (
                <div
                  key={row.name}
                  className={`flex items-center justify-between gap-2 px-3.5 py-2.5 ${
                    i < OFFER_ROWS.length - 1 ? "border-b" : ""
                  } ${row.best ? "bg-accent/50" : ""}`}
                >
                  <p className={`text-xs ${row.best ? "font-extrabold" : "text-muted-foreground"}`}>
                    {row.name}
                  </p>
                  <div className="flex shrink-0 items-center gap-2">
                    {row.best && <Badge className="bg-primary text-[10px] text-white">ارزان‌ترین</Badge>}
                    <p className={`text-xs ${row.best ? "font-extrabold text-primary" : "text-muted-foreground"}`}>
                      {fa(row.price)} تومان
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <p className="mt-3 flex items-center gap-1.5 rounded-lg bg-muted px-3 py-2 text-[11px] leading-5 text-muted-foreground">
              <CheckCircle2 className="size-3.5 shrink-0 text-stone-500" />
              لیست را می‌فرستی، پیشنهادها همین‌طور کنار هم جمع می‌شود.
            </p>

            <ul className="mt-3 grid gap-1.5 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-stone-500" />
                بفرستش برای تامین‌کننده‌هایی که می‌شناسی و بهشان اعتماد داری
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-stone-500" />
                ارزان‌ترین را سرِ بزنگاه، یک‌جا مقایسه کن
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-stone-500" />
                هر نیاز جدید، فقط یک لیست تازه — بدون تماس‌های بی‌فایده
              </li>
            </ul>
          </div>
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
        <h2 className="text-lg font-extrabold sm:text-xl">همین حالا بسازش</h2>
        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
          کاتالوگ فروش و لیست خرید، رایگان و ۵ دقیقه‌ای؛
          هر وقت خواستی قیمت‌ها را به‌روز کن.
        </p>
        <Link href="/start" className="mt-4 inline-block">
          <Button size="lg">
            <ShoppingBasket className="size-4" />
            شروع کن — رایگان
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
        <ArmSchematic />
        <StartCta />
      </main>
      <AppFooter />
    </div>
  );
}
