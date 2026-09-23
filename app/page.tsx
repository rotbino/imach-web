"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { fa } from "@/lib/format";
import { useAuthStore } from "@/lib/auth-store";
import { myArmHref } from "@/lib/active-biz";
import { AppFooter, AppHeader, MobileTabBar } from "@/app/components/chrome";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    ArrowLeft,
    BadgeCheck,
    BatteryMedium,
    BellRing,
    CheckCircle2,
    ChevronDown,
    Clock,
    EyeOff,
    Factory,
    Link2,
    Lock,
    MapPin,
    Package,
    PencilLine,
    Plus,
    Search,
    Send,
    Share2,
    ShoppingBasket,
    Signal,
    Store,
    Timer,
    Wifi,
    X,
} from "lucide-react";

/*
 * صفحه اول iMatch
 *
 * ساختار:
 *  ۱) معرفی iMatch + پیش‌نمایش کاتالوگ فروش / دستیار خرید
 *  ۲) نمایش نمونه‌های واقعی‌نما از کاتالوگ‌ها و لیست‌های خرید
 *  ۳) حریم قیمت
 *  ۴) سه قدم شروع
 *  ۵) پرسش‌های متداول
 *  ۶) CTA پایانی + نوار چسبان موبایل
 */

/* ─── داده‌های نمونه‌ی ماکت‌ها ─── */

const CATALOG_ROWS = [
    {
        name: "روغن سرخ‌کردنی ۱۰ لیتری",
        price: 420000,
        when: "امروز · ۹:۴۰",
        special: true,
    },
    {
        name: "برنج طارم اعلا ۱۰ کیلویی",
        price: 980000,
        when: "امروز · ۹:۴۰",
        special: false,
    },
    {
        name: "پیاز — کیسه ۲۵ کیلویی",
        price: 310000,
        when: "دیروز",
        special: false,
    },
    {
        name: "رب گوجه‌فرنگی ۸۰۰ گرمی",
        price: null,
        when: "امروز",
        special: false,
    },
];

const OFFER_ROWS = [
    {
        name: "عمده فروشی میوه سبلان",
        price: 4200000,
        best: true,
        when: "۱۰ دقیقه پیش",
    },
    {
        name: "طبیعت‌دانه پخش",
        price: 4350000,
        best: false,
        when: "۲۵ دقیقه پیش",
    },
    {
        name: "تره بار آرتام",
        price: 4450000,
        best: false,
        when: "۱ ساعت پیش",
    },
];

const LATEST_CATALOGS = [
    { name: "سپید کالا", city: "اصفهان", items: 48 },
    { name: "برنج طارم آرا", city: "تهران", items: 31 },
    { name: "پخش شیرین‌عسل", city: "اردبیل", items: 19 },
    { name: "چرم مشهد", city: "مشهد", items: 27 },
    { name: "یدک‌پارس", city: "کرمان", items: 42 },
    { name: "مهرآباد توزیع", city: "تهران", items: 35 },
    { name: "گلستان نان", city: "گرگان", items: 23 },
];

const LATEST_LISTS = [
    { name: "پیاز — ۲۰ گونی", city: "تبریز", offers: 3 },
    { name: "روغن ۱۰ لیتری — ۵۰ عدد", city: "مشهد", offers: 5 },
    { name: "برنج طارم — ۳۰۰ کیلو", city: "رشت", offers: 2 },
    { name: "رب گوجه — ۲۰۰ کارتن", city: "شیراز", offers: 4 },
    { name: "شکر بسته‌بندی — ۱ تن", city: "قم", offers: 6 },
    { name: "مرغ منجمد — ۵۰۰ کیلو", city: "اصفهان", offers: 3 },
    { name: "شیر خشک — ۸۰ کارتن", city: "کرج", offers: 2 },
];

/* ─── بخش‌های عمومی ─── */

const TRUST = [
    {
        icon: BadgeCheck,
        title: "رایگان شروع کن",
        sub: "بدون کارمزد و قرارداد",
    },
    {
        icon: Timer,
        title: "سریع راه می‌افتد",
        sub: "در چند دقیقه آماده استفاده",
    },
    {
        icon: Link2,
        title: "همه‌چیز با یک لینک",
        sub: "بدون نیاز به سایت و اپ",
    },
    {
        icon: EyeOff,
        title: "قیمت دست خودت است",
        sub: "نمایش قیمت را خودت کنترل کن",
    },
];

type Bullet = {
    strong: string;
    rest: string;
};

const ARMS = {
    sale: {
        chip: "کاتالوگ فروش",
        chipCls: "border-primary/30 bg-accent text-primary",
        checkCls: "text-primary",
        title: "کاتالوگ فروشت را همیشه جلوی چشم مشتری‌هایت نگه دار",
        lead: "قیمت‌ها را یک‌جا منتشر کن و هر وقت خواستی به‌روز کن.",
        cta: "ساخت کاتالوگ فروش",
        bullets: [
            {
                strong: "مشتری‌ها همیشه آخرین قیمت را می‌بینند:",
                rest: "هر بار قیمت را تغییر بدهی، کاتالوگ هم به‌روز می‌شود.",
            },
            {
                strong: "یک لینک برای همه‌چیز:",
                rest: "به‌جای فرستادن عکس، فایل و لیست قیمت، فقط لینک کاتالوگت را بفرست.",
            },
            {
                strong: "محصولاتت همیشه جلوی چشم مشتری است:",
                rest: "مشتری هر وقت نیاز داشت، کاتالوگت را باز می‌کند و محصولات و قیمت‌ها را می‌بیند.",
            },
            {
                strong: "ارتباط مستقیم با مشتری:",
                rest: "مشتری هر وقت خواست می‌تواند از داخل کاتالوگ با خودت تماس بگیرد.",
            },
        ] as Bullet[],
    },

    buy: {
        chip: "دستیار خرید ",
        chipCls: "border-stone-300 bg-stone-100 text-stone-700",
        checkCls: "text-stone-500",
        title: "دستیار خرید خودت را بساز",
        lead: "نیازت را ثبت کن، قیمت بگیر و تأمین‌کننده‌هایت را دنبال کن.",
        cta: "ساخت دستیار خرید",
        bullets: [
            {
                strong: "نیازت را دقیق ثبت کن:",
                rest: "کالا، مقدار و هر توضیحی که برای خرید لازم است را یک‌جا بنویس.",
            },
            {
                strong: "از تأمین‌کننده‌ها قیمت بگیر:",
                rest: "لیست خریدت را برای تأمین‌کننده‌هایی که می‌شناسی بفرست و پیشنهادشان را دریافت کن.",
            },
            {
                strong: "قیمت تأمین‌کننده‌ها را دنبال کن:",
                rest: "کاتالوگ تأمین‌کننده‌هایت را ذخیره کن و قیمت‌های روزشان را ببین.",
            },
            {
                strong: "همه‌چیز خریدت یک‌جا باشد:",
                rest: "نیازهای خرید و ارتباطت با تأمین‌کننده‌ها را در همان دستیار خرید مدیریت کن.",
            },
        ] as Bullet[],
    },
};

const VIEWERS = [
    {
        label: "مشتری عادی",
        price: 420000,
        note: "قیمت عادی را می‌بیند",
        hidden: false,
        special: false,
    },
    {
        label: "مشتری ویژه",
        price: 395000,
        note: "قیمت عمده — فقط خودش",
        hidden: false,
        special: true,
    },
    {
        label: "بقیه",
        price: null,
        note: "این قیمت را نمی‌بینند",
        hidden: true,
        special: false,
    },
];

const STEPS = [
    {
        icon: PencilLine,
        title: "بساز",
        desc: "کاتالوگ فروش یا لیست خریدت را بساز و اطلاعاتش را وارد کن.",
    },
    {
        icon: Send,
        title: "بفرست",
        desc: "لینک کاتالوگ را برای مشتری‌ها یا لیست خرید را برای تأمین‌کننده‌ها بفرست.",
    },
    {
        icon: BellRing,
        title: "ادامه بده",
        desc: "قیمت‌ها را به‌روز کن، پیشنهادها را ببین و ارتباطت را با مشتری‌ها و تأمین‌کننده‌ها ادامه بده.",
    },
];

const FAQS = [
    {
        q: "آی‌مچ واقعاً رایگان است؟",
        a: "بله. ساخت کاتالوگ فروش و دستیار خرید، ثبت کالا و به‌روزرسانی قیمت رایگان است.",
    },
    {
        q: "مشتری‌هایم باید اپی نصب کنند؟",
        a: "نه. مشتری فقط لینک کاتالوگت را باز می‌کند و محصولات و قیمت‌ها را می‌بیند.",
    },
    {
        q: "آیا همه قیمت‌های من را می‌بینند؟",
        a: "نه. خودت تعیین می‌کنی هر قیمت برای چه کسی نمایش داده شود. حتی می‌توانی قیمت بعضی کالاها را پنهان کنی.",
    },
    {
        q: "اگر قیمت‌ها را تغییر بدهم چه می‌شود؟",
        a: "کاتالوگت همان لحظه به‌روز می‌شود و کسانی که کاتالوگت را دنبال می‌کنند، آخرین قیمت‌ها را می‌بینند.",
    },
    {
        q: "چه کسی لیست خرید من را می‌بیند؟",
        a: "خودت انتخاب می‌کنی. می‌توانی لیست خریدت را فقط برای تأمین‌کننده‌هایی که می‌شناسی و با آن‌ها کار می‌کنی بفرستی.",
    },
];

/* ─── اجزای مشترک ─── */

function SectionHead({
                         eyebrow,
                         title,
                         sub,
                     }: {
    eyebrow?: string;
    title: string;
    sub?: string;
}) {
    return (
        <div className="mx-auto max-w-2xl text-center">
            {eyebrow && (
                <span className="mb-3 inline-block rounded-full border border-primary/25 bg-accent/60 px-3.5 py-1.5 text-[11px] font-bold text-primary">
          {eyebrow}
        </span>
            )}

            <h2 className="text-2xl font-black sm:text-3xl">{title}</h2>

            {sub && (
                <p className="mt-3 text-sm leading-7 text-muted-foreground sm:text-base">
                    {sub}
                </p>
            )}
        </div>
    );
}

function PhoneFrame({ children }: { children: React.ReactNode }) {
    return (
        <div className="relative mx-auto w-full max-w-[320px]">
            <div
                aria-hidden
                className="absolute -inset-3 rounded-[2.5rem] bg-gradient-to-b from-primary/10 to-transparent"
            />

            <div className="relative rounded-[2rem] border-2 border-stone-200 bg-white p-1.5 shadow-xl shadow-stone-200/60">
                <div className="overflow-hidden rounded-[1.6rem] border bg-background">
                    {children}
                </div>
            </div>
        </div>
    );
}

function StatusBar() {
    return (
        <div
            aria-hidden
            className="flex items-center justify-between border-b bg-white px-4 py-1.5 text-[10px] font-bold text-muted-foreground"
        >
            <span>۹:۴۱</span>

            <span className="h-3 w-12 rounded-full bg-stone-100" />

            <span className="flex items-center gap-1">
        <Signal className="size-3" />
        <Wifi className="size-3" />
        <BatteryMedium className="size-3.5" />
      </span>
        </div>
    );
}

/* ─── ماکت کاتالوگ ─── */

function CatalogScreen() {
    return (
        <PhoneFrame>
            <StatusBar />

            <div className="flex items-center justify-between gap-2 border-b bg-white px-3.5 py-3">
                <div className="flex min-w-0 items-center gap-2.5">
          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary text-white">
            <Store className="size-4" />
          </span>

                    <div className="min-w-0">
                        <p className="truncate text-xs font-extrabold">
                            سپید کالا · پخش عمده
                        </p>

                        <p className="flex items-center gap-1 text-[10px] text-emerald-600">
                            <span className="size-1.5 animate-soft-pulse rounded-full bg-emerald-500" />
                            آخرین قیمت‌ها
                        </p>
                    </div>
                </div>

                <span className="flex shrink-0 items-center gap-1 rounded-full bg-primary px-2.5 py-1.5 text-[10px] font-bold text-white">
          <Plus className="size-3" />
          دنبال کردن کاتالوگ
        </span>
            </div>

            <div className="border-b bg-white px-3.5 pb-3 pt-2.5">
                <div className="flex items-center gap-2 rounded-xl border bg-muted/40 px-3 py-2 text-[11px] text-muted-foreground">
                    <Search className="size-3.5" />
                    جست‌وجو در کاتالوگ…
                </div>

                <div className="mt-2.5 flex gap-1.5">
                    {["همه", "روغن", "لبنیات", "غلات"].map((c, i) => (
                        <span
                            key={c}
                            className={`whitespace-nowrap rounded-full px-2.5 py-1 text-[10px] font-bold ${
                                i === 0
                                    ? "bg-primary/10 text-primary"
                                    : "border text-muted-foreground"
                            }`}
                        >
              {c}
            </span>
                    ))}
                </div>
            </div>

            <div className="divide-y bg-white">
                {CATALOG_ROWS.map((row) => (
                    <div
                        key={row.name}
                        className="flex items-center justify-between gap-2 px-3.5 py-3"
                    >
                        <div className="min-w-0">
                            <p className="truncate text-xs font-bold text-foreground">
                                {row.name}
                            </p>

                            <p className="mt-0.5 flex items-center gap-1 text-[10px] text-muted-foreground">
                                <Clock className="size-3" />
                                به‌روزرسانی: {row.when}
                            </p>
                        </div>

                        <div className="shrink-0 text-left">
                            {row.price === null ? (
                                <p className="flex items-center gap-1 text-[10px] font-bold text-muted-foreground">
                                    <Lock className="size-3" />
                                    قیمت مخفی
                                </p>
                            ) : (
                                <>
                                    <p className="whitespace-nowrap text-xs font-black text-primary">
                                        {fa(row.price)}{" "}
                                        <span className="text-[9px] font-normal">ریال</span>
                                    </p>

                                    {row.special && (
                                        <span className="mt-0.5 inline-block rounded-full bg-accent px-1.5 py-0.5 text-[9px] font-bold text-accent-foreground">
                      قیمت ویژه شما
                    </span>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            <div className="flex items-center justify-between border-t bg-white px-3.5 py-2.5">
                <p className="flex items-center gap-1 text-[10px] font-bold text-emerald-600">
                    <CheckCircle2 className="size-3.5" />
                    قیمت‌ها به‌روز هستند
                </p>

                <span className="flex items-center gap-1 text-[10px] font-bold text-primary">
          <Share2 className="size-3.5" />
          ارسال لینک
        </span>
            </div>
        </PhoneFrame>
    );
}

/* ─── ماکت بازوی خرید ─── */

function BuyScreen() {
    return (
        <PhoneFrame>
            <StatusBar />

            <div className="flex items-center justify-between gap-2 border-b bg-white px-3.5 py-3">
                <div className="flex items-center gap-2.5">
          <span className="grid size-9 place-items-center rounded-xl bg-stone-800 text-white">
            <ShoppingBasket className="size-4" />
          </span>

                    <div>
                        <p className="text-xs font-extrabold">لیست خرید رستوران آراد</p>

                        <p className="flex items-center gap-1 text-[10px] text-muted-foreground">
                            <MapPin className="size-3" />
                            تبریز · ۱ قلم نیاز
                        </p>
                    </div>
                </div>

                <span className="grid size-8 place-items-center rounded-full border text-muted-foreground">
          <Share2 className="size-3.5" />
        </span>
            </div>

            <div className="border-b bg-muted/200 px-3.5 py-3">
                <div className="flex items-center justify-between gap-2 rounded-xl border bg-primary/20 px-3 py-2.5 shadow-sm">
                    <div>
                        <p className="text-[10px] text-muted-foreground">اعلام نیاز</p>
                        <p className="text-xs font-extrabold">پیاز — 1 تن</p>
                    </div>

                    <span className="whitespace-nowrap rounded-full bg-stone-100 px-2.5 py-1 text-[10px] font-bold text-stone-700">
                    ۳ پیشنهاد رسید
                  </span>
                </div>
            </div>

            <div className="border-b bg-muted/30 px-3.5 py-3">
                <div className="flex items-center justify-between gap-2 rounded-xl border bg-white px-3 py-2.5 shadow-sm">
                    <div>
                        <p className="text-[10px] text-muted-foreground">اعلام نیاز</p>
                        <p className="text-xs font-extrabold">برنج طارم درجه 1 — 100 کیسه</p>
                    </div>

                    <span className="whitespace-nowrap rounded-full bg-stone-100 px-2.5 py-1 text-[10px] font-bold text-stone-700">
                    10 پیشنهاد رسید
                  </span>
                </div>
            </div>


            <div className="bg-white">
                <p className="px-3.5 pb-1 pt-3 text-[10px] font-bold text-muted-foreground">
                    پیشنهادها — مقایسه در یک نگاه
                </p>

                <div className="divide-y">
                    {OFFER_ROWS.map((row) => (
                        <div
                            key={row.name}
                            className={`flex items-center justify-between gap-2 px-3.5 py-3 ${
                                row.best ? "bg-accent/50" : ""
                            }`}
                        >
                            <div>
                                <p
                                    className={`text-xs ${
                                        row.best
                                            ? "font-black"
                                            : "font-bold text-muted-foreground"
                                    }`}
                                >
                                    {row.name}
                                </p>

                                <p className="mt-0.5 text-[10px] text-muted-foreground">
                                    {row.when}
                                </p>
                            </div>

                            <div className="flex shrink-0 items-center gap-1.5">
                                {row.best && (
                                    <span className="rounded-full bg-primary px-2 py-0.5 text-[9px] font-bold text-white">
                    پیشنهاد مناسب
                  </span>
                                )}

                                <p
                                    className={`whitespace-nowrap text-xs ${
                                        row.best
                                            ? "font-black text-primary"
                                            : "font-bold text-muted-foreground"
                                    }`}
                                >
                                    {fa(row.price)}{" "}
                                    <span className="text-[9px] font-normal">ریال</span>
                                </p>
                            </div>
                        </div>
                    ))}

                    <div className="flex items-center justify-between gap-2 px-3.5 py-3">
                        <p className="text-xs text-muted-foreground">بازار تبریز</p>

                        <p className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                            <span className="size-1.5 animate-soft-pulse rounded-full bg-amber-400" />
                            در حال دریافت پیشنهاد…
                        </p>
                    </div>
                </div>

                <div className="p-3.5 pt-2">
                    <div className="flex items-center justify-center gap-1.5 rounded-xl border border-dashed py-2.5 text-[11px] font-bold text-muted-foreground">
                        <Plus className="size-3.5" />
                        ارسال برای تأمین‌کننده دیگر
                    </div>
                </div>
            </div>
        </PhoneFrame>
    );
}

/* ─── قرص‌های نوار متحرک ─── */

function CatalogPill({
                         name,
                         city,
                         items,
                     }: (typeof LATEST_CATALOGS)[number]) {
    return (
        <span className="flex shrink-0 items-center gap-2 rounded-full border bg-white px-3 py-1.5 shadow-sm">
      <span className="grid size-6 shrink-0 place-items-center rounded-full bg-accent text-primary">
        <Store className="size-3" />
      </span>

      <span className="whitespace-nowrap text-[11px] font-extrabold">
        {name}
      </span>

      <span className="whitespace-nowrap text-[10px] text-muted-foreground">
        {fa(items)} کالا · {city}
      </span>
    </span>
    );
}

function ListPill({
                      name,
                      city,
                      offers,
                  }: (typeof LATEST_LISTS)[number]) {
    return (
        <span className="flex shrink-0 items-center gap-2 rounded-full border bg-white px-3 py-1.5 shadow-sm">
      <span className="grid size-6 shrink-0 place-items-center rounded-full bg-stone-100 text-stone-600">
        <ShoppingBasket className="size-3" />
      </span>

      <span className="whitespace-nowrap text-[11px] font-extrabold">
        {name}
      </span>

      <span className="whitespace-nowrap text-[10px] text-muted-foreground">
        {fa(offers)} پیشنهاد · {city}
      </span>
    </span>
    );
}

/* ─── نوار آرام ─── */

function MarqueeRow({
                        label,
                        icon: Icon,
                        items,
                        reverse = false,
                        duration = 70,
                    }: {
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    items: React.ReactNode;
    reverse?: boolean;
    duration?: number;
}) {
    return (
        <div className="group relative overflow-hidden">
            <div
                className="marquee-track flex w-max group-hover:[animation-play-state:paused]"
                style={{
                    animation: `marquee ${duration}s linear infinite`,
                    animationDirection: reverse ? "reverse" : "normal",
                }}
            >
                <div className="flex gap-2.5 pe-2.5">{items}</div>

                <div className="flex gap-2.5 pe-2.5" aria-hidden>
                    {items}
                </div>
            </div>

            <div className="pointer-events-none absolute inset-y-0 start-0 z-10 flex items-center bg-gradient-to-l from-white via-white/95 to-transparent pe-12 ps-4">
        <span className="flex items-center gap-1.5 whitespace-nowrap rounded-full border bg-white px-3 py-1.5 text-[10px] font-bold text-muted-foreground shadow-sm">
          <Icon className="size-3" />
            {label}
        </span>
            </div>

            <div className="pointer-events-none absolute inset-y-0 end-0 z-10 w-14 bg-gradient-to-r from-white via-white/70 to-transparent" />
        </div>
    );
}

/* ─── ۱) آی‌مچ چیست؟ ─── */

function ProductTour() {
    const [tab, setTab] = useState<"sale" | "buy">("sale");
    const arm = ARMS[tab];
    const isSale = tab === "sale";

    return (
        <section id="tour" className="border-b bg-white">
            <div className="mx-auto max-w-5xl px-4 pb-10 pt-10 sm:pt-14">
                <div className="mx-auto max-w-2xl text-center">
                    <Badge
                        variant="outline"
                        className="gap-2 border-primary/30 bg-white px-3.5 py-1.5 text-xs text-primary shadow-sm"
                    >
                        <span className="size-1.5 animate-soft-pulse rounded-full bg-primary" />
                        آی‌مچ · پلتفرم شبکه‌سازی خرید و فروش عمده
                    </Badge>



                    <h1 className="mt-4 text-xl font-black leading-[2.2] sm:text-2xl sm:leading-[2]">
                        <div className="text-primary">برای فروش عمده کاتالوگ قیمت بساز </div>
                        <div className="text-green-600">برای خرید عمده لیست خرید بساز </div>
                    </h1>
                    <h1 className="mt-5 pb-4 pt-3 md:pt-6 text-xl  font-black leading-[1.5] tracking-tight text-stone-950 dark:text-white sm:text-xl md:text-[1.5rem] md:leading-[1.35]">
                        ما لایه های مختلف بازار عمده از خرده فروش تا صادر کننده را می کاویم تا  هر تامین کننده را به خریدارن هدف  وصل کنیم
                    </h1>

                </div>

                <div className="mt-5 flex flex-wrap items-center justify-center gap-1.5 text-xs font-bold sm:flex-nowrap">
                    {["بساز", "به اشتراک بزار", "شبکه‌سازی کن"].map(
                        (item, index) => (
                            <div key={item} className="flex items-center">
                                <div
                                    className={`rounded-lg border px-3.5 py-2 shadow-sm ${
                                        index === 0
                                            ? "border-primary/30 bg-primary/5 text-primary"
                                            : "border-border bg-white text-foreground"
                                    }`}
                                >
                                    {item}
                                </div>

                                {index < 2 && (
                                    <span className="mx-1 text-muted-foreground/50">←</span>
                                )}
                            </div>
                        )
                    )}
                </div>

                <div className="mt-8 flex justify-center">
                    <div className="inline-flex rounded-full border bg-background p-1 shadow-sm">
                        <button
                            onClick={() => setTab("sale")}
                            aria-pressed={isSale}
                            className={`rounded-full px-5 py-2 text-xs font-bold transition ${
                                isSale
                                    ? "bg-primary text-white shadow"
                                    : "text-muted-foreground hover:text-foreground"
                            }`}
                        >
                            کاتالوگ قیمت
                        </button>

                        <button
                            onClick={() => setTab("buy")}
                            aria-pressed={!isSale}
                            className={`rounded-full px-5 py-2 text-xs font-bold transition ${
                                !isSale
                                    ? "bg-stone-800 text-white shadow"
                                    : "text-muted-foreground hover:text-foreground"
                            }`}
                        >
                            دستیار خرید
                        </button>
                    </div>
                </div>

                <div
                    key={tab}
                    className="mt-9 grid animate-[fade-up_0.4s_ease_both] items-center gap-10 lg:grid-cols-2 lg:gap-12"
                >
                    <div aria-hidden="true">
                        {isSale ? <CatalogScreen /> : <BuyScreen />}
                    </div>

                    <div className="text-center lg:text-right">
                        <Badge
                            variant="outline"
                            className={`px-3 py-1 text-[11px] ${arm.chipCls}`}
                        >
                            {arm.chip}
                        </Badge>

                        <h2 className="mt-3 text-xl font-black">{arm.title}</h2>

                        <p className="mt-1 text-sm font-bold text-primary">
                            {arm.lead}
                        </p>

                        <ul className="mt-5 grid gap-3 text-right">
                            {arm.bullets.map((b) => (
                                <li
                                    key={b.strong}
                                    className="flex items-start gap-2.5 text-sm leading-6 text-muted-foreground"
                                >
                                    <CheckCircle2
                                        className={`mt-0.5 size-4 shrink-0 ${arm.checkCls}`}
                                    />

                                    <span>
                    <b className="text-foreground">{b.strong}</b>{" "}
                                        {b.rest}
                  </span>
                                </li>
                            ))}
                        </ul>

                        <Link href="/start" className="mt-6 inline-block">
                            <Button
                                className={`rounded-xl px-6 ${
                                    isSale
                                        ? ""
                                        : "bg-stone-800 hover:bg-stone-900"
                                }`}
                            >
                                {arm.cta}
                                <ArrowLeft className="size-4 ltr:rotate-180" />
                            </Button>
                        </Link>
                    </div>
                </div>

                <div className="mt-12 border-t pt-6">
                    <p className="mb-4 text-center text-[11px] font-bold text-muted-foreground">
                       جدیدترین کاتالوگها و لیست های ساخته شده
                    </p>

                    <div className="space-y-3">
                        <MarqueeRow
                            label="آخرین کاتالوگ‌ها"
                            icon={Store}
                            duration={70}
                            items={LATEST_CATALOGS.map((c) => (
                                <CatalogPill key={c.name} {...c} />
                            ))}
                        />

                        <MarqueeRow
                            label="آخرین لیست‌های خرید"
                            icon={ShoppingBasket}
                            duration={55}
                            reverse
                            items={LATEST_LISTS.map((l) => (
                                <ListPill key={l.name} {...l} />
                            ))}
                        />
                    </div>
                </div>
            </div>
        </section>
    );
}

/* ─── ۲) نوار اعتماد ─── */

function TrustStrip() {
    return (
        <section className="border-b bg-white">
            <div className="mx-auto grid max-w-5xl grid-cols-2 gap-3 px-4 py-6 sm:grid-cols-4">
                {TRUST.map((t) => (
                    <div
                        key={t.title}
                        className="flex items-center gap-2.5 rounded-xl border p-3"
                    >
            <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-accent text-primary">
              <t.icon className="size-4" />
            </span>

                        <div className="min-w-0">
                            <p className="truncate text-xs font-extrabold">
                                {t.title}
                            </p>

                            <p className="truncate text-[10px] text-muted-foreground">
                                {t.sub}
                            </p>
                        </div>
                    </div>
                ))}
            </div>
        </section>
    );
}

/* ─── ۳) حریم قیمت ─── */

function ViewerCard({
                        label,
                        note,
                        price,
                        hidden,
                        special,
                    }: {
    label: string;
    note: string;
    price: number | null;
    hidden: boolean;
    special: boolean;
}) {
    return (
        <div
            className={`rounded-xl border p-3.5 ${
                special
                    ? "border-primary/30 bg-accent/50"
                    : "bg-background"
            }`}
        >
            <p className="text-[11px] font-bold text-muted-foreground">
                {label}
            </p>

            {hidden ? (
                <p className="mt-1.5 flex items-center gap-1.5 text-sm font-black text-muted-foreground">
                    <Lock className="size-3.5" />
                    قیمت مخفی
                </p>
            ) : (
                <p
                    className={`mt-1.5 text-base font-black ${
                        special ? "text-primary" : "text-foreground"
                    }`}
                >
                    {fa(price!)}{" "}
                    <span className="text-[10px] font-normal text-muted-foreground">
            ریال
          </span>
                </p>
            )}

            <p className="mt-1 text-[10px] leading-4 text-muted-foreground">
                {note}
            </p>
        </div>
    );
}

function PricePrivacy() {
    return (
        <section className="border-b">
            <div className="mx-auto max-w-5xl px-4 py-12 sm:py-16">
                <SectionHead
                    eyebrow="حریم قیمت"
                    title="قیمت را برای هر گروه مشتری اختصاصی کن"
                    sub="در آی مچ می تونی به هر گروه مشتری قیمت خاص نشون بدی و یا قیمت رو پنهان کنی."
                />

                <div className="mx-auto mt-8 max-w-3xl rounded-2xl border bg-white p-5 shadow-sm sm:p-6">
                    <div className="flex items-center gap-3 border-b pb-4">
            <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-accent text-primary">
              <Package className="size-5" />
            </span>

                        <div>
                            <p className="text-sm font-extrabold">
                                روغن سرخ‌کردنی ۱۰ لیتری
                            </p>

                            <p className="text-[11px] text-muted-foreground">
                                یک کالا — سه قیمت متفاوت
                            </p>
                        </div>

                        <Badge
                            variant="outline"
                            className="ms-auto hidden border-primary/30 bg-white text-primary sm:inline-flex"
                        >
                            تنظیم قیمت‌ها
                        </Badge>
                    </div>

                    <div className="grid gap-3 pt-4 sm:grid-cols-3">
                        {VIEWERS.map((v) => (
                            <ViewerCard key={v.label} {...v} />
                        ))}
                    </div>

                    <p className="mt-4 rounded-xl bg-muted/60 px-3.5 py-2.5 text-[11px] leading-5 text-muted-foreground">
            <span className="font-bold text-foreground">
              مثلاً:
            </span>{" "}
                        قیمت عمده را فقط برای مشتری قدیمی نمایش بده و برای بقیه پنهان کن.
                    </p>
                </div>
            </div>
        </section>
    );
}

/* ─── ۴) سه قدم شروع ─── */

function HowToStart() {
    return (
        <section className="mx-auto max-w-5xl px-4 py-12 sm:py-16">
            <SectionHead
                eyebrow="شروع"
                title="شروعش ساده است"
                sub="سه قدم تا کاتالوگ یا دستیار خرید آماده."
            />

            <div className="relative mt-9 grid gap-4 sm:grid-cols-3 sm:gap-6">
                <div
                    aria-hidden
                    className="absolute inset-x-20 top-8 hidden border-t-2 border-dashed border-primary/25 sm:block"
                />

                {STEPS.map((s, i) => (
                    <div
                        key={s.title}
                        className="relative rounded-2xl border bg-white p-5 text-center shadow-sm"
                    >
            <span className="relative mx-auto grid size-16 place-items-center rounded-2xl bg-accent text-primary">
              <s.icon className="size-6" />

              <span className="absolute -end-2 -top-2 grid size-6 place-items-center rounded-full border-2 border-background bg-primary text-[11px] font-black text-white">
                {fa(i + 1)}
              </span>
            </span>

                        <p className="mt-3.5 font-extrabold">{s.title}</p>

                        <p className="mt-1.5 text-sm leading-6 text-muted-foreground">
                            {s.desc}
                        </p>
                    </div>
                ))}
            </div>

            <p className="mx-auto mt-7 max-w-xl text-center text-sm leading-7 text-muted-foreground">
                و کم‌کم، مشتری‌ها و تأمین‌کننده‌هایی که با آن‌ها کار می‌کنی
                هم به شبکه‌ی تجاری خودت در آی‌مچ اضافه می‌شوند.
            </p>
        </section>
    );
}

/* ─── ۵) پرسش‌های متداول ─── */

function FaqItem({
                     q,
                     a,
                     open,
                     onToggle,
                 }: {
    q: string;
    a: string;
    open: boolean;
    onToggle: () => void;
}) {
    return (
        <div className="rounded-2xl border bg-white">
            <button
                onClick={onToggle}
                aria-expanded={open}
                className="flex w-full items-center justify-between gap-3 px-5 py-4 text-right"
            >
                <span className="text-sm font-bold">{q}</span>

                <ChevronDown
                    className={`size-4 shrink-0 text-muted-foreground transition-transform duration-300 ${
                        open ? "rotate-180" : ""
                    }`}
                />
            </button>

            {open && (
                <p className="animate-[fade-up_0.3s_ease_both] px-5 pb-4 text-sm leading-7 text-muted-foreground">
                    {a}
                </p>
            )}
        </div>
    );
}

function Faq() {
    const [open, setOpen] = useState<number | null>(0);

    return (
        <section className="border-y bg-muted/30">
            <div className="mx-auto max-w-3xl px-4 py-12 sm:py-16">
                <SectionHead
                    eyebrow="شاید بپرسی"
                    title="سؤال‌هایی که احتمالاً داری"
                />

                <div className="mt-7 grid gap-2.5">
                    {FAQS.map((f, i) => (
                        <FaqItem
                            key={i}
                            {...f}
                            open={open === i}
                            onToggle={() =>
                                setOpen(open === i ? null : i)
                            }
                        />
                    ))}
                </div>
            </div>
        </section>
    );
}

/* ─── ۶) CTA پایانی ─── */

function FinalCta() {
    return (
        <section className="mx-auto max-w-5xl px-4 pb-16 pt-12 sm:pt-16">
            <div className="dot-grid relative overflow-hidden rounded-3xl border border-primary/25 bg-gradient-to-b from-accent/60 to-white p-8 text-center sm:p-12">
        <span className="inline-block rounded-full border border-primary/20 bg-white px-3.5 py-1.5 text-[11px] font-bold text-primary shadow-sm">
          رایگان شروع کن
        </span>

                <h2 className="mt-4 text-2xl font-black sm:text-3xl">
                    کاتالوگ یا دستیار خریدت را بساز
                </h2>

                <p className="mx-auto mt-3 max-w-md text-sm leading-7 text-muted-foreground">
                    کاتالوگ فروشت یا دستیار خریدت را در چند دقیقه بساز،
                    لینک را بفرست و استفاده از آی‌مچ را شروع کن.
                </p>

                <Link href="/start" className="mt-6 inline-block">
                    <Button
                        size="lg"
                        className="rounded-xl px-8 shadow-lg shadow-primary/25"
                    >
                        شروع کن — رایگان
                        <ArrowLeft className="size-4 ltr:rotate-180" />
                    </Button>
                </Link>

                <p className="mt-4 text-[11px] text-muted-foreground">
                    مشتری‌ها و تأمین‌کننده‌هایی که با آن‌ها کار می‌کنی،
                    به مرور به شبکه‌ی تجاری تو در آی‌مچ اضافه می‌شوند.
                </p>
            </div>
        </section>
    );
}


export default function Home() {
    const router = useRouter();
    const status = useAuthStore((s) => s.status);

    // کاربر واردشده خانه‌اش «صفحه‌ی خودش» است — صفحه اصلی فقط مال مهمان‌هاست.
    useEffect(() => {
        if (status === "authed") router.replace(myArmHref());
    }, [status, router]);

    return (
        <div className="flex min-h-screen flex-col">
            <style>{`
        @keyframes fade-up {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes marquee {
          from {
            transform: translateX(-50%);
          }
          to {
            transform: translateX(0);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .marquee-track {
            animation: none !important;
          }
        }
      `}</style>

            <AppHeader />

            <main className="grow">
                <ProductTour />
                <TrustStrip />
                <PricePrivacy />
                <HowToStart />
                <Faq />
                <FinalCta />
            </main>

            <AppFooter />
            <MobileTabBar />
        </div>
    );
}