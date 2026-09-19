"use client";

import Link from "next/link";
import { fa } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  ArrowLeftRight,
  BadgeCheck,
  Factory,
  Handshake,
  Link2,
  Radio,
  ShoppingBasket,
  Store,
  Users,
  Warehouse,
} from "lucide-react";

const CHAIN = [
  { label: "تولیدکننده", icon: Factory, desc: "مواد اولیه می‌خرد، محصول می‌سازد" },
  { label: "عمده‌فروش", icon: Warehouse, desc: "حجم بالا می‌خرد و پخش می‌کند" },
  { label: "خرده‌فروش", icon: Store, desc: "برای فروش به مصرف‌کننده می‌خرد" },
  { label: "مصرف‌کننده", icon: Users, desc: "قیمت و کیفیت را انتخاب می‌کند" },
];

const ROLE_CARDS: {
  title: string;
  example: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}[] = [
  { title: "می‌خرم و می‌فروشم", example: "خرده‌فروش، عمده‌فروش", icon: ArrowLeftRight, color: "bg-primary" },
  { title: "فقط می‌فروشم", example: "بازاریاب، تولیدکننده", icon: Handshake, color: "bg-amber-600" },
  { title: "فقط می‌خرم", example: "کارگاهی که مواد اولیه می‌خرد", icon: ShoppingBasket, color: "bg-stone-600" },
];

const STEPS = [
  {
    icon: ShoppingBasket,
    title: "کالاهایت را ثبت کن",
    desc: "از لیست انتخاب کن و برای هر کالا بگو می‌فروشی، می‌خری یا هر دو؛ بعد حجم و قیمت را وارد کن.",
  },
  {
    icon: Link2,
    title: "دو بازوی اختصاصی می‌گیری",
    desc: "بازوی فروش (کاتالوگت) و بازوی خرید (نیازهایت)، هرکدام با لینک اختصاصی و آماده اشتراک.",
  },
  {
    icon: Radio,
    title: "قیمت‌گیری را فعال کن",
    desc: "تامین‌کننده‌های مناسب حجم و شهر تو، نیازت را می‌بینند و پیشنهاد قیمت می‌فرستند.",
  },
  {
    icon: BadgeCheck,
    title: "فالو کن و مقایسه کن",
    desc: "تامین‌کننده‌های خوب را فالو کن تا قیمت‌هایشان همیشه در «تابلوی قیمت» جمع شود.",
  },
];

const DEMO_CHIPS = ["خورشید مارکت", "طبیعت‌دانه پخش", "پخش گستر البرز", "شیرین‌عسل اردبیل"];

export default function Landing() {
  return (
    <div>
      {/* ── هیرو ── */}
      <section className="dot-grid border-b bg-gradient-to-b from-accent/40 to-transparent">
        <div className="mx-auto max-w-5xl px-4 py-12 text-center sm:py-16">
          <Badge variant="outline" className="mb-4 border-primary/30 bg-white text-primary">
            بازار عمده آنلاین — با JWT و دیتابیس واقعی
          </Badge>
          <h1 className="mx-auto max-w-2xl text-2xl font-black leading-relaxed sm:text-4xl sm:leading-[1.6]">
            خریدار و تامین‌کننده‌ی درست را
            <span className="text-primary"> با یک فرم ساده </span>
            پیدا کن
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-muted-foreground sm:text-base">
            هر کسب‌وکار یک‌بار کالاهای خرید و فروشش را ثبت می‌کند؛ iMach از روی حجم،
            شهر و نوع فعالیت، دو بازوی اختصاصی با لینک مخصوص می‌سازد و دو طرف زنجیره را
            مستقیم به هم وصل می‌کند.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Link href="/start">
              <Button size="lg">
                ثبت کالاها و ساخت بازوها
                <ArrowLeft className="size-4" />
              </Button>
            </Link>
            <Link href="/buy/khorshid-market">
              <Button size="lg" variant="outline">
                نمونه آماده را ببین
              </Button>
            </Link>
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

      {/* ── زنجیره تامین ── */}
      <section className="mx-auto max-w-5xl px-4 py-10">
        <h2 className="text-center text-lg font-extrabold sm:text-xl">
          هر حلقه‌ی زنجیره، هم خریدار است هم فروشنده
        </h2>
        <p className="mt-2 text-center text-sm text-muted-foreground">
          iMach حلقه‌های کنارِ هم را به هم وصل می‌کند؛ همان سطوحی که واقعا با هم معامله می‌کنند.
        </p>
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {CHAIN.map((c, i) => (
            <div key={c.label} className="relative rounded-2xl border bg-white p-4 text-center shadow-sm">
              <span className="mx-auto grid size-11 place-items-center rounded-xl bg-primary/10 text-primary">
                <c.icon className="size-5" />
              </span>
              <p className="mt-2 text-sm font-bold">{c.label}</p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">{c.desc}</p>
              {i < CHAIN.length - 1 && (
                <ArrowLeft className="absolute -start-2.5 top-1/2 hidden size-4 -translate-y-1/2 text-primary/40 sm:block" />
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ── سه نقش ── */}
      <section className="border-y bg-white">
        <div className="mx-auto max-w-5xl px-4 py-10">
          <h2 className="text-center text-lg font-extrabold sm:text-xl">
            فقط سه حالت داریم — به همین سادگی
          </h2>
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            {ROLE_CARDS.map((r) => (
              <div key={r.title} className="rounded-2xl border p-5 shadow-sm">
                <span className={`grid size-11 place-items-center rounded-xl text-white ${r.color}`}>
                  <r.icon className="size-5" />
                </span>
                <p className="mt-3 font-bold">{r.title}</p>
                <p className="mt-1 text-xs text-muted-foreground">{r.example}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── چطور کار می‌کند ── */}
      <section className="mx-auto max-w-5xl px-4 py-10">
        <h2 className="text-center text-lg font-extrabold sm:text-xl">از فرم تا اتصال، چهار قدم</h2>
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {STEPS.map((s, i) => (
            <div key={s.title} className="flex gap-3 rounded-2xl border bg-white p-4 shadow-sm">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent text-primary">
                <s.icon className="size-5" />
              </span>
              <div>
                <p className="text-sm font-bold">
                  <span className="me-1 text-primary">{fa(i + 1)}.</span>
                  {s.title}
                </p>
                <p className="mt-1 text-xs leading-6 text-muted-foreground">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 rounded-2xl border border-primary/25 bg-accent/50 p-6 text-center">
          <p className="font-bold">آماده‌ای؟ کالاهایت را ثبت کن و لینک بازوهایت را همین امروز بگیر.</p>
          <Link href="/start" className="inline-block">
            <Button className="mt-4">
              شروع ثبت کالاها
              <ArrowLeft className="size-4" />
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
