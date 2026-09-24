"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { fa, fmtMoney, goodName, unitLabel } from "@/lib/format";
import { useAuthStore } from "@/lib/auth-store";
import { myArmHref } from "@/lib/active-biz";
import { useExploreFeed } from "@/lib/queries";
import { AppFooter, AppHeader, MobileTabBar } from "@/app/components/chrome";
import { Button } from "@/components/ui/button";
import {
    ArrowLeft,
    BadgeCheck,
    BatteryMedium,
    Building2,
    Check,
    CheckCircle2,
    ChevronDown,
    Clock3,
    Copy,
    Link2,
    MapPin,
    Pause,
    PencilLine,
    Play,
    Plus,
    Search,
    Send,
    Share2,
    ShoppingBasket,
    Signal,
    Store,
    TrendingUp,
    Users,
    Wifi,
} from "lucide-react";

/* ─────────────────────────────────────────────────────────────
 * داده‌های ثابت
 * ───────────────────────────────────────────────────────────── */

const STEPS = [
    { icon: PencilLine, number: "۱", title: "بساز", desc: "کاتالوگ فروش یا لیست خریدت رو در چند دقیقه آماده کن." },
    { icon: Send, number: "۲", title: "لینکش رو بفرست", desc: "لینکش را برای مشتری‌ها یا تأمین‌کننده‌هایی که می‌شناسی بفرست." },
    { icon: TrendingUp, number: "۳", title: "رشد کن", desc: "هر لینک، یک مسیر جدید به خریدار یا تأمین‌کننده‌ی مناسب است." },
] as const;

const FAQS = [
    { q: "آی‌مچ دقیقاً چیست؟", a: "آی‌مچ یک بستر B2B برای اتصال نیاز خریداران به تأمین‌کننده‌های مناسب است. کاتالوگ فروش و لیست خرید، ساده‌ترین راه برای شروع کار با آی‌مچ هستند." },
    { q: "کاتالوگ فروش چه فایده‌ای دارد؟", a: "محصولات و قیمت‌هایت را در یک صفحه‌ی همیشه‌به‌روز قرار می‌دهی و فقط لینک آن را برای مشتری‌هایت می‌فرستی. هر زمان قیمت یا محصولی تغییر کند، همان لینک به‌روز می‌شود." },
    { q: "لیست خرید چه کاری انجام می‌دهد؟", a: "نیاز خریدت رو ثبت می‌کنی و می‌توانی آن را برای تأمین‌کننده‌هایی که می‌شناسی بفرستی. اطلاعات نیاز خرید، نقطه شروع اتصال تو به تأمین‌کننده‌های مناسب است." },
    { q: "آیا برای استفاده از آی‌مچ باید برنامه نصب کنم؟", a: "نه. کاتالوگ‌ها و صفحه‌های خرید از طریق لینک قابل مشاهده‌اند و برای مشتری یا تأمین‌کننده نیازی به نصب برنامه نیست." },
    { q: "آیا آی‌مچ فقط یک ابزار ساخت کاتالوگ است؟", a: "نه. کاتالوگ و لیست خرید فقط نقطه شروع هستند. هدف آی‌مچ این است که نیاز خریدار هر کالا را با اطلاعات تأمین‌کنندگان مناسب همان کالا نزدیک کند." },
] as const;


const TESTIMONIALS = [
    {
        name: "حسن احمدی",
        role: "مدیر فروش · شرکت بازرگانی ایس‌مک",
        tone: "sell" as const,
        quote:
            "لینک کاتالوگ محصولاتم رو برای مشتری‌هام می‌فرستم. هر وقت قیمت‌ها تغییر کنه، فقط کاتالوگ رو به‌روز می‌کنم و مشتری‌ها همون لینک رو باز می‌کنن و قیمت جدید رو می‌بینن.",
    },
    {
        name: "محمد نوری",
        role: "مدیر رستوران · رستوران آراد",
        tone: "buy" as const,
        quote:
            "برای خرید مواد اولیه رستوران، لیست خرید هفتگی‌مون رو ساختم و لینک اون رو برای تأمین‌کننده‌هایی که می‌شناختم فرستادم. بعدش چند تأمین‌کننده دیگه هم پیشنهاد دادن که قبلاً نمی‌شناختم.",
    },
    {
        name: "علی صبوری",
        role: "بازاریاب · پخش علوی",
        tone: "sell" as const,
        quote:
            "لینک کاتالوگ پخش رو توی گروه‌های صنفی و واتساپ برای مشتری‌ها فرستادم. چند فروشگاه جدید از همون لینک باهام آشنا شدن و برای همکاری پیام دادن.",
    },
    {
        name: "سارا کریمی",
        role: "مدیر سالن زیبایی · سالن آناهیتا",
        tone: "buy" as const,
        quote:
            "برای خرید عمده رنگ مو و لوازم مصرفی سالن، لیست نیازم رو ساختم و لینک اون رو برای چند تأمین‌کننده فرستادم. چند تأمین‌کننده جدید هم از طریق آی‌مچ بهم پیشنهاد دادن.",
    },
    {
        name: "رضا اکبری",
        role: "مدیر سوپرمارکت · سوپرمارکت همدان",
        tone: "buy" as const,
        quote:
            "لیست خرید هفتگی سوپرمارکتم رو ساختم و برای پخش‌هایی که باهاشون کار می‌کنم فرستادم. از همون لینک قیمت چند قلم جدید هم برام پیشنهاد شد و تأمین‌کننده‌های دیگه رو هم پیدا کردم.",
    },
    {
        name: "امیرحسین مرادی",
        role: "مدیر خرید · کارخانه قطعه‌سازی",
        tone: "buy" as const,
        quote:
            "دنبال یک چرخ‌دنده صنعتی خاص بودم و لینک لیست خریدم رو فرستادم. باورم نمی‌شد دقیقاً تأمین‌کننده‌هایی که اون قطعه رو داشتن پیدا کردم؛ بعضی‌هاشون رو اصلاً نمی‌شناختم.",
    },
    {
        name: "رضا صادقی",
        role: "مسئول خرید · کارگاه کابینت",
        tone: "buy" as const,
        quote:
            "برای خرید MDF و یراق‌آلات، لیست خریدم رو ساختم و لینک اون رو برای چند فروشنده فرستادم. پیشنهادها که رسید، قیمت و شرایطشون رو کنار هم دیدم و انتخاب کردم.",
    },
    {
        name: "مهدی کریمی",
        role: "مدیر فروش · تولیدی پوشاک",
        tone: "sell" as const,
        quote:
            "کاتالوگ محصولات و قیمت همکاری رو ساختم و لینک اون رو برای مشتری‌های عمده می‌فرستم. چند مشتری جدید هم از طریق همین لینک محصولاتم رو دیدن و برای سفارش پیام دادن.",
    },
    {
        name: "زهرا کریمی",
        role: "مدیر فروش · کارخانه لبنیات سپید",
        tone: "sell" as const,
        quote:
            "کاتالوگ محصولاتمون رو برای فروشگاه‌ها و پخش‌ها می‌فرستم. وقتی قیمت‌ها عوض می‌شه، لازم نیست دوباره لینک جدید بفرستم؛ همون لینک همیشه به‌روزه.",
    },
    {
        name: "سعید مرادی",
        role: "مدیر پخش · مواد غذایی پارس",
        tone: "sell" as const,
        quote:
            "لینک کاتالوگ رو برای سوپرمارکت‌ها و مشتری‌های پخش فرستادم. دیگه برای هر استعلام قیمت لازم نیست فایل بفرستم؛ مشتری خودش کاتالوگ رو می‌بینه و برای سفارش پیام می‌ده.",
    },
    {
        name: "حمید رضایی",
        role: "صاحب کارگاه · خدمات صنعتی",
        tone: "buy" as const,
        quote:
            "برای خرید قطعات و مواد مصرفی کارگاه، لیست نیازم رو ساختم و لینک اون رو برای چند تأمین‌کننده فرستادم. بعد از انتشار لیست، پیشنهادهایی گرفتم که خودم به‌تنهایی احتمالاً پیداشون نمی‌کردم.",
    },
    {
        name: "رضا کریمی",
        role: "مدیر تولید · تولیدی لوازم پلاستیکی",
        tone: "sell" as const,
        quote:
            "کاتالوگ محصولاتم رو ساختم و لینک اون رو برای فروشگاه‌ها و پخش‌هایی که می‌شناختم فرستادم. جالب این بود که بعداً خریدارهایی که قبلاً نمی‌شناختم هم از طریق آی‌مچ سراغ محصولاتم اومدن.",
    },
] as const;



const BRANDS = [
    "ایس مک",
    "پخش علوی",
    "لبنیات سپید",
    "کارگاه کابینت آراد",
    "پخش میوه سبلان",
    "طبیعت‌دانه",
    "تره‌بار آرتام",
    "پخش سوپرمارکتی آسمان",
] as const;

const SHARE_BENEFITS = [
    { icon: Send, title: "برای هرکس بفرست، بدون نصب", sub: "مشتری یا تأمین‌کننده فقط لینک را باز می‌کند. نه ثبت‌نام، نه نصب، نه ورود." },
    { icon: TrendingUp, title: "اطلاعات دقیق‌تر = اتصال دقیق‌تر", sub: "هرچه کاتالوگ‌ها و لیست‌های خرید بیشتری وارد شوند، آی‌مچ تأمین‌کننده‌های مرتبط‌تری پیدا می‌کند." },
    { icon: Users, title: "شبکه‌ی خودت را وارد کن", sub: "مشتری‌ها، همکاران صنفی و تأمین‌کننده‌هایی که می‌شناسی؛ یک لینک کافی است." },
] as const;

/* ─────────────────────────────────────────────────────────────
 * Shared
 * ───────────────────────────────────────────────────────────── */

function SectionHead({ eyebrow, title, sub }: { eyebrow?: string; title: string; sub?: string }) {
    return (
        <div className="mx-auto max-w-2xl text-center">
            {eyebrow && (
                <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-primary/15 bg-accent/60 px-3 py-1.5 text-[11px] font-extrabold text-primary">
                    <span className="size-1.5 rounded-full bg-primary" />
                    {eyebrow}
                </div>
            )}
            <h2 className="text-2xl font-black tracking-tight sm:text-3xl">{title}</h2>
            {sub && <p className="mt-3 text-sm leading-7 text-muted-foreground sm:text-base">{sub}</p>}
        </div>
    );
}

function PhoneFrame({ children }: { children: React.ReactNode }) {
    return (
        <div className="relative mx-auto w-full max-w-[300px]">
            <div aria-hidden className="absolute -inset-5 rounded-[3rem] bg-gradient-to-b from-primary/15 via-primary/5 to-transparent blur-xl" />
            <div className="relative rounded-[2.25rem] border-[6px] border-stone-900 bg-stone-900 p-1 shadow-2xl shadow-stone-900/20">
                <div className="relative overflow-hidden rounded-[1.65rem] border border-stone-200 bg-background">
                    <div aria-hidden className="absolute left-1/2 top-0 z-20 h-5 w-24 -translate-x-1/2 rounded-b-2xl bg-stone-900" />
                    {children}
                </div>
            </div>
        </div>
    );
}

function StatusBar() {
    return (
        <div aria-hidden className="flex items-center justify-between border-b bg-white px-4 py-1.5 pt-2 text-[9px] font-bold text-muted-foreground">
            <span>۹:۴۱</span>
            <span className="h-2.5 w-10 rounded-full bg-stone-100" />
            <span className="flex items-center gap-1">
                <Signal className="size-3" />
                <Wifi className="size-3" />
                <BatteryMedium className="size-3.5" />
            </span>
        </div>
    );
}

/* ─────────────────────────────────────────────────────────────
 * Catalog mock — ۴ ردیف
 * ───────────────────────────────────────────────────────────── */

const CATALOG_ROWS = [
    { name: "روغن سرخ‌کردنی ۱۰ لیتری", price: 420000, when: "امروز · ۹:۴۰" },
    { name: "برنج طارم اعلا ۱۰ کیلویی", price: 980000, when: "امروز · ۹:۴۰" },
    { name: "پیاز — کیسه ۲۵ کیلویی", price: 310000, when: "دیروز" },
    { name: "رب گوجه ۵ کیلویی", price: 220000, when: "دیروز" },
    { name: "روغن نباتی 17 ک", price: 2520000, when: "دیروز" },
];

function CatalogScreen() {
    return (
        <PhoneFrame>
            <StatusBar />
            <div className="border-b bg-white px-3.5 pb-2.5 pt-3">
                <div className="flex items-center gap-2 rounded-xl border bg-muted/40 px-3 py-2 text-[10px] text-muted-foreground">
                    <Search className="size-3.5" />
                    جست‌وجو در کاتالوگ…
                </div>
            </div>
            <div className="divide-y bg-white">
                {CATALOG_ROWS.map((row) => (
                    <div key={row.name} className="flex items-center justify-between gap-2 px-3.5 py-3">
                        <div className="min-w-0">
                            <p className="truncate text-xs font-bold">{row.name}</p>
                            <p className="mt-1 flex items-center gap-1 text-[9px] text-muted-foreground">
                                <Clock3 className="size-3" />
                                {row.when}
                            </p>
                        </div>
                        <p className="shrink-0 whitespace-nowrap text-xs font-black text-primary">
                            {fa(row.price)} <span className="text-[8px] font-normal">ریال</span>
                        </p>
                    </div>
                ))}
            </div>
            <div className="flex items-center justify-between border-t bg-white px-3.5 py-2.5">
                <p className="flex items-center gap-1 text-[9px] font-bold text-emerald-600">
                    <CheckCircle2 className="size-3.5" />
                    قیمت‌ها به‌روز هستند
                </p>
                <span className="flex items-center gap-1 text-[9px] font-bold text-primary">
                    <Share2 className="size-3.5" />
                    ارسال لینک
                </span>
            </div>
        </PhoneFrame>
    );
}

/* ─────────────────────────────────────────────────────────────
 * Buy mock — ۴ ردیف (هم‌ارتفاع با Catalog)
 * ───────────────────────────────────────────────────────────── */

const OFFER_ROWS = [
    { name: "عمده‌فروشی میوه سبلان", price: 4200000, best: true, when: "۱۰ دقیقه پیش" },
    { name: "طبیعت‌دانه پخش", price: 4350000, best: false, when: "۲۵ دقیقه پیش" },
    { name: "تره‌بار آرتام", price: 4450000, best: false, when: "۱ ساعت پیش" },
    { name: "کشاورزی بهاران", price: 4500000, best: false, when: "۲ ساعت پیش" },
];

function BuyScreen() {
    return (
        <PhoneFrame>
            <StatusBar />
            <div className="border-b bg-muted/20 px-3.5 py-2.5">
                <div className="rounded-xl border bg-primary/10 px-3 py-2.5">
                    <div className="flex items-center justify-between gap-2">
                        <div>
                            <p className="text-[9px] text-muted-foreground">نیاز خرید</p>
                            <p className="mt-0.5 text-xs font-extrabold">پیاز — ۱ تن</p>
                        </div>
                        <span className="whitespace-nowrap rounded-full bg-white px-2.5 py-1 text-[9px] font-bold text-stone-700 shadow-sm">
                            ۴ پیشنهاد
                        </span>
                    </div>
                </div>
            </div>
            <div className="bg-white">
                <div className="flex items-center justify-between px-3.5 pb-1 pt-3">
                    <p className="text-[9px] font-bold text-muted-foreground">پیشنهادهای تأمین</p>
                    <span className="text-[8px] text-muted-foreground">مقایسه در یک نگاه</span>
                </div>
                <div className="divide-y">
                    {OFFER_ROWS.map((row) => (
                        <div key={row.name} className={`flex items-center justify-between gap-2 px-3.5 py-3 ${row.best ? "bg-accent/45" : ""}`}>
                            <div className="min-w-0">
                                <p className={`truncate text-xs ${row.best ? "font-black" : "font-bold text-muted-foreground"}`}>{row.name}</p>
                                <p className="mt-0.5 text-[9px] text-muted-foreground">{row.when}</p>
                            </div>
                            <div className="flex shrink-0 items-center gap-1.5">
                                {row.best && (
                                    <span className="rounded-full bg-primary px-2 py-0.5 text-[8px] font-bold text-white">قیمت بهتر</span>
                                )}
                                <p className={`whitespace-nowrap text-xs ${row.best ? "font-black text-primary" : "font-bold text-muted-foreground"}`}>
                                    {fa(row.price)} <span className="text-[8px] font-normal">ریال</span>
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
                <div className="p-3.5 pt-2">
                    <div className="flex items-center justify-center gap-1.5 rounded-xl border border-dashed py-2.5 text-[10px] font-bold text-muted-foreground">
                        <Plus className="size-3.5" />
                        ارسال برای تأمین‌کننده دیگر
                    </div>
                </div>
            </div>
        </PhoneFrame>
    );
}

/* ─────────────────────────────────────────────────────────────
 * Hero
 * ───────────────────────────────────────────────────────────── */

function Hero() {
    const [tab, setTab] = useState<"sell" | "buy">("sell");
    const isSell = tab === "sell";

    return (
        <section className="relative overflow-hidden border-b bg-white">
            <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[520px] bg-[radial-gradient(circle_at_50%_0%,hsl(var(--primary)/0.10),transparent_60%)]" />

            <div className="relative mx-auto max-w-6xl px-4 pb-14 pt-10 sm:px-6 sm:pb-20 sm:pt-16 lg:px-8">
                {/* پیام سه‌کلمه‌ای */}
                {/*<div className="mx-auto mb-8 flex max-w-2xl items-center justify-center gap-2 sm:gap-3">
                    <span className="flex items-center gap-1.5 rounded-full border border-primary/20 bg-white px-3 py-1.5 text-[11px] font-extrabold text-primary shadow-sm sm:px-4 sm:text-xs">
                        <PencilLine className="size-3.5" />
                        بساز
                    </span>
                    <ArrowLeft className="size-3.5 shrink-0 text-muted-foreground ltr:rotate-180" />
                    <span className="flex items-center gap-1.5 rounded-full border border-primary/20 bg-white px-3 py-1.5 text-[11px] font-extrabold text-primary shadow-sm sm:px-4 sm:text-xs">
                        <Share2 className="size-3.5" />
                        لینکش رو بفرست
                    </span>
                    <ArrowLeft className="size-3.5 shrink-0 text-muted-foreground ltr:rotate-180" />
                    <span className="flex items-center gap-1.5 rounded-full bg-primary px-3 py-1.5 text-[11px] font-extrabold text-white shadow-sm sm:px-4 sm:text-xs">
                        <TrendingUp className="size-3.5" />
                        رشد کن
                    </span>
                </div>*/}

                <div className="mx-auto max-w-3xl text-center">
                    <h1 className="text-[18px] font-black leading-[1.7] tracking-tight sm:text-2xl sm:leading-[1.6] lg:text-[26px]">
                        لیست خرید بساز،
                        <br className="sm:hidden" />{" "}
                        <span className="text-primary">لینکش رو بفرست برای تامین کنندگانت</span>
                    </h1>

                    <h1 className="mt-3 text-[18px] font-black leading-[1.7] tracking-tight sm:text-2xl sm:leading-[1.6] lg:text-[26px]">
                        کاتالوگ قیمت بساز،
                        <br className="sm:hidden" />{" "}
                        <span className="text-emerald-600">لینکش رو بفرست برای مشتریانت</span>
                    </h1>


                    <p className="mx-auto text-justify mt-5 max-w-2xl text-sm leading-8 text-muted-foreground sm:text-base sm:leading-8">
                        هرچی کاتالوگ یا لیست خریدت رو بیشتر به اشتراک بذاری، هم دنبال‌کننده‌ی بیشتری می‌گیری، هم{" "}
                        <span className="bg-gradient-to-r from-primary via-amber-500 to-emerald-600 bg-clip-text font-extrabold text-transparent">
        هوش مصنوعی آی‌مچ
    </span>{" "}
                        بهتر می‌فهمه محصولاتت رو به خریداران بیشتر و مرتبط تر نشون بده و  تامین کنندهای به صرفه رو بر اساس کالا، حجم و موقعیت جغرافیایی بهت معرفی می‌کنه.
                    </p>


                </div>

                <div className="mx-auto mt-9 max-w-4xl">
                    <div className="grid items-center gap-8 lg:grid-cols-[1fr_auto_1fr] lg:gap-6">
                        <div className="order-2 lg:order-1">
                            <div className="mb-4 text-center lg:text-right">
                                <span className="text-[11px] font-extrabold text-primary">اگر عمده می‌فروشی</span>
                                <h2 className="mt-1 text-lg font-black">کاتالوگ فروشت رو بساز</h2>
                                <p className="mt-1 text-xs leading-6 text-muted-foreground">
                                    محصولات و قیمت‌هایت را در یک لینک همیشه‌به‌روز به مشتری‌هایت نشان بده.
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={() => setTab("sell")}
                                className={`group relative w-full overflow-hidden rounded-3xl border p-3 text-right transition-all sm:p-4 ${
                                    isSell
                                        ? "border-primary/40 bg-accent/35 shadow-xl shadow-primary/10"
                                        : "border-stone-200 bg-white hover:border-primary/20 hover:shadow-lg"
                                }`}
                            >
                                <div className="relative"><CatalogScreen /></div>

                            </button>
                        </div>

                        <div className="order-1 flex justify-center lg:order-2">
                            <div className="relative hidden h-28 w-28 place-items-center lg:grid">
                                <div className="absolute inset-0 rounded-full bg-accent/70" />
                                <div className="relative grid size-16 place-items-center rounded-full bg-primary text-white shadow-xl shadow-primary/25">
                                    <Link2 className="size-7" />
                                </div>
                                <span className="absolute -bottom-2 whitespace-nowrap rounded-full border bg-white px-3 py-1 text-[9px] font-bold text-muted-foreground shadow-sm">
                                    آی‌مچ
                                </span>
                            </div>
                            <div className="grid size-12 place-items-center rounded-full bg-accent text-primary lg:hidden">
                                <ArrowLeft className="size-5 ltr:rotate-180" />
                            </div>
                        </div>

                        <div className="order-3">
                            <div className="mb-4 text-center lg:text-right">
                                <span className="text-[11px] font-extrabold text-stone-700">اگر عمده می‌خری</span>
                                <h2 className="mt-1 text-lg font-black">نیاز خریدت رو ثبت کن</h2>
                                <p className="mt-1 text-xs leading-6 text-muted-foreground">
                                    کالای موردنیازت را بگو تا مسیر رسیدن به تأمین‌کننده مناسب شروع شود.
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={() => setTab("buy")}
                                className={`group relative w-full overflow-hidden rounded-3xl border p-3 text-right transition-all sm:p-4 ${
                                    !isSell
                                        ? "border-stone-400 bg-stone-50 shadow-xl shadow-stone-900/10"
                                        : "border-stone-200 bg-white hover:border-stone-300 hover:shadow-lg"
                                }`}
                            >
                                <div className="relative"><BuyScreen /></div>
                                {!isSell && (
                                    <div className="absolute inset-x-5 bottom-4 flex justify-center">
                                        <span className="rounded-full bg-stone-900 px-4 py-2 text-[10px] font-bold text-white shadow-lg">همین رو بساز</span>
                                    </div>
                                )}
                            </button>
                        </div>
                    </div>
                </div>

                <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
                    <Link href="/start?mode=register">
                        <Button size="lg" className="w-full rounded-xl px-7 shadow-lg shadow-primary/25 sm:w-auto">
                           توی یک دقیقه بساز
                            <ArrowLeft className="size-4 ltr:rotate-180" />
                        </Button>
                    </Link>

                </div>

                <div className="mx-auto mt-7 flex max-w-2xl flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[10px] font-bold text-muted-foreground">
                    <span className="flex items-center gap-1.5"><Check className="size-3.5 text-primary" />رایگان برای شروع</span>
                    <span className="flex items-center gap-1.5"><Check className="size-3.5 text-primary" />بدون نصب برای مشتری</span>
                    <span className="flex items-center gap-1.5"><Check className="size-3.5 text-primary" />لینک همیشه به‌روز</span>
                </div>
            </div>
        </section>
    );
}

/* ─────────────────────────────────────────────────────────────
 * Marquee — دایره‌ی بی‌نهایت با سه کپی
 * ───────────────────────────────────────────────────────────── */

function MarqueeRow({
                        items,
                        reverse = false,
                        duration = 60,
                        paused = false,
                        fadeBg = "white",
                    }: {
    items: React.ReactNode;
    reverse?: boolean;
    duration?: number;
    paused?: boolean;
    fadeBg?: "white" | "muted";
}) {
    const fadeClass = fadeBg === "white" ? "to-white" : "to-muted/30";

    // دو کپی دقیقاً یکسان. gap روی خود آیتم‌ها اعمال می‌شه، نه روی کپی‌ها.
    // پس فاصله‌ی بین دو کپی هم اندازه‌ی فاصله‌ی داخلی آیتم‌هاست.
    return (
        <div className="group relative overflow-hidden">
            <div
                className="marquee-track flex w-max"
                style={{
                    animation: `marquee ${duration}s linear infinite`,
                    animationDirection: reverse ? "reverse" : "normal",
                    animationPlayState: paused ? "paused" : "running",
                }}
            >
                <div className="flex shrink-0">{items}</div>
                <div className="flex shrink-0" aria-hidden>{items}</div>
            </div>
            <div className={`pointer-events-none absolute inset-y-0 end-0 z-10 w-20 bg-gradient-to-r from-transparent ${fadeClass}`} />
            <div className={`pointer-events-none absolute inset-y-0 start-0 z-10 w-20 bg-gradient-to-l from-transparent ${fadeClass}`} />
        </div>
    );
}
/* ─────────────────────────────────────────────────────────────
 * Live activity
 * ───────────────────────────────────────────────────────────── */

function LiveCard({
                      icon: Icon,
                      tone,
                      name,
                      detail,
                      city,
                  }: {
    icon: typeof Store;
    tone: "sell" | "buy";
    name: string;
    detail: string;
    city?: string;
}) {
    return (
        <div className="flex shrink-0 items-center gap-3 rounded-2xl border bg-white px-4 py-3 shadow-sm">
            <span className={`grid size-10 shrink-0 place-items-center rounded-xl ${tone === "sell" ? "bg-accent text-primary" : "bg-stone-100 text-stone-700"}`}>
                <Icon className="size-5" />
            </span>
            <div className="min-w-0">
                <p className="truncate text-sm font-extrabold">{name}</p>
                <p className="mt-0.5 flex items-center gap-1.5 whitespace-nowrap text-xs text-muted-foreground">
                    {detail}
                    {city && (
                        <>
                            <span className="opacity-40">·</span>
                            <span className="flex items-center gap-0.5"><MapPin className="size-3" />{city}</span>
                        </>
                    )}
                </p>
            </div>
        </div>
    );
}

const MIN_ROWS_TO_SHOW = 4;

function LiveActivity() {
    const sell = useExploreFeed("SELL");
    const buy = useExploreFeed("BUY");

    const sellRows = (sell.data ?? []).filter((r) => r.priceMinor != null).slice(0, 12);
    const buyRows = (buy.data ?? []).filter((r) => r.volume != null).slice(0, 12);

    const hasSell = sellRows.length >= MIN_ROWS_TO_SHOW;
    const hasBuy = buyRows.length >= MIN_ROWS_TO_SHOW;

    if (!hasSell && !hasBuy) return null;

    return (
        <section className="overflow-hidden border-b bg-white py-8">
            <div className="mb-5 flex items-center justify-center gap-2">
                <span className="size-2 animate-soft-pulse rounded-full bg-emerald-500" />
                <p className="text-sm font-extrabold text-muted-foreground">همین حالا در آی‌مچ</p>
            </div>

            <div className="space-y-4">
                {hasSell && (
                    <MarqueeRow
                        duration={120}
                        fadeBg="white"
                        items={sellRows.map((r) => (
                            <LiveCard
                                key={`sell-${r.id}`}
                                icon={Store}
                                tone="sell"
                                name={r.business.name}
                                detail={`${goodName(r.good)} · ${fmtMoney(r.priceMinor, r.currency)}`}
                                city={r.business.city}
                            />
                        ))}
                    />
                )}

                {hasBuy && (
                    <MarqueeRow
                        reverse
                        duration={110}
                        fadeBg="white"
                        items={buyRows.map((r) => (
                            <LiveCard
                                key={`buy-${r.id}`}
                                icon={ShoppingBasket}
                                tone="buy"
                                name={r.business.name}
                                detail={`${goodName(r.good)} — ${fa(r.volume as number)} ${unitLabel(r.good.unit)}`}
                                city={r.business.city}
                            />
                        ))}
                    />
                )}
            </div>
        </section>
    );
}


/* ─────────────────────────────────────────────────────────────
 * Testimonials — اسکرول افقی، بدون حرکت خودکار
 * ───────────────────────────────────────────────────────────── */

function hashHue(str: string): number {
    let h = 0;
    for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) % 360;
    return h;
}
function Testimonials() {
    return (
        <section className="border-b bg-muted/30 py-12">
            <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
                <div className="max-w-2xl">
                    <h2 className="mt-2 font-black tracking-tight sm:text-2xl">
                        آی‌مچ برای هر کسب‌وکاری که خرید یا فروش عمده دارد
                    </h2>

                    <p className="mt-2 text-sm leading-7 text-muted-foreground sm:text-base">
                        از رستوران و سالن زیبایی تا سوپرمارکت، بازاریاب، کارگاه و کارخانه؛
                        بعضی‌ها کاتالوگ محصولاتشان را برای مشتری‌ها می‌فرستند،
                        بعضی‌ها لیست خریدشان را برای تأمین‌کننده‌ها، هوش مصنوعی آی مچ بعد از چند اشتراک گذاری درست شما را افراد مناسب متصل می کند.
                    </p>
                </div>
            </div>

            <div
                className="mt-7 flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-px-4 px-4 pb-3 sm:scroll-px-6 lg:scroll-px-8"
                style={{ scrollbarWidth: "thin" }}
            >
                {TESTIMONIALS.map((t) => (
                    <TestimonialCard key={t.name} {...t} />
                ))}
            </div>
        </section>
    );
}

function TestimonialCard({
                             name,
                             role,
                             quote,
                             tone,
                         }: {
    name: string;
    role: string;
    quote: string;
    tone: "sell" | "buy";
}) {
    const initial = name.trim().charAt(0);
    const hue = hashHue(name);

    const avatarBg = `hsl(${hue} 55% 92%)`;
    const avatarFg = `hsl(${hue} 55% 30%)`;

    const [job, business] = role.split(" · ");

    return (
        <article className="flex w-[290px] shrink-0 snap-start flex-col rounded-2xl border bg-white p-4 shadow-sm sm:w-[330px]">
            {/* User */}
            <div className="flex items-center gap-3">
                <span
                    aria-hidden
                    className="grid size-10 shrink-0 place-items-center rounded-full text-sm font-black"
                    style={{
                        backgroundColor: avatarBg,
                        color: avatarFg,
                    }}
                >
                    {initial}
                </span>

                <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-extrabold text-foreground">
                        {name}
                    </p>

                    <div className="mt-0.5 flex min-w-0 items-center gap-1 text-[10px]">
                        <span className="truncate font-medium text-muted-foreground">
                            {job}
                        </span>

                        {business && (
                            <>
                                <span className="shrink-0 text-muted-foreground/50">
                                    ·
                                </span>

                                <span className="truncate font-black text-primary">
                                    {business}
                                </span>
                            </>
                        )}
                    </div>
                </div>

                <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-[9px] font-bold ${
                        tone === "sell"
                            ? "bg-accent text-primary"
                            : "bg-stone-100 text-stone-700"
                    }`}
                >
                    {tone === "sell" ? "فروشنده" : "خریدار"}
                </span>
            </div>

            {/* Quote */}
            <p className="mt-4 grow text-[11px] leading-6 text-stone-700">
                «{quote}»
            </p>
        </article>
    );
}


/* ─────────────────────────────────────────────────────────────
 * ShareSection
 * ───────────────────────────────────────────────────────────── */

function ShareSection() {
    return (
        <section className="relative overflow-hidden border-b bg-gradient-to-b from-accent/30 via-white to-white">
            <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
                <SectionHead
                    eyebrow="مهم‌ترین کار تو در آی‌مچ"
                    title="لینک کاتالوگ یا لیست خریدت رو بفرست"
                    sub="آی‌مچ وقتی کار می‌کند که اطلاعات واقعی خرید و فروش وارد شود. ساده‌ترین راه شروع، ساختن یک کاتالوگ یا لیست خرید و فرستادن لینک آن برای کسانی است که می‌شناسی."
                />

                <div className="mx-auto mt-10 grid max-w-5xl gap-4 md:grid-cols-3">
                    {SHARE_BENEFITS.map((item) => (
                        <div key={item.title} className="rounded-2xl border bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
                            <span className="grid size-11 place-items-center rounded-xl bg-accent text-primary">
                                <item.icon className="size-5" />
                            </span>
                            <h3 className="mt-4 text-sm font-extrabold">{item.title}</h3>
                            <p className="mt-2 text-xs leading-6 text-muted-foreground">{item.sub}</p>
                        </div>
                    ))}
                </div>


                <div className="mt-8 flex justify-center">
                    <Link href="/start?mode=register">
                        <Button size="lg" className="rounded-xl px-7 shadow-lg shadow-primary/25">
                            کاتالوگ خودت رو بساز
                            <ArrowLeft className="size-4 ltr:rotate-180" />
                        </Button>
                    </Link>
                </div>
            </div>
        </section>
    );
}

/* ─────────────────────────────────────────────────────────────
 * Brands
 * ───────────────────────────────────────────────────────────── */

function Brands() {
    return (
        <section className="border-b bg-muted/20 py-10">
            <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
                <p className="text-center text-[11px] font-extrabold text-muted-foreground">
                    برندهایی که از آی‌مچ استفاده می‌کنند
                </p>
                <div className="mt-5 flex flex-wrap items-center justify-center gap-2.5 sm:gap-3">
                    {BRANDS.map((brand) => (
                        <div key={brand} className="flex items-center gap-2 rounded-full border bg-white px-3.5 py-1.5 shadow-sm">
                            <span className="grid size-5 place-items-center rounded-full bg-accent text-primary">
                                <Building2 className="size-2.5" />
                            </span>
                            <span className="whitespace-nowrap text-xs font-bold text-stone-700">{brand}</span>
                            <BadgeCheck className="size-3.5 shrink-0 text-primary" />
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}

/* ─────────────────────────────────────────────────────────────
 * CoreValue
 * ───────────────────────────────────────────────────────────── */

function CoreValue() {
    return (
        <section className="relative overflow-hidden bg-white">
            <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20 lg:px-8">


                <div className="relative mx-auto mt-12 max-w-5xl">
                    <div aria-hidden className="absolute left-1/2 top-1/2 hidden h-px w-[62%] -translate-x-1/2 bg-gradient-to-r from-primary/10 via-primary/50 to-primary/10 lg:block" />
                    <div className="grid gap-5 lg:grid-cols-[1fr_180px_1fr] lg:items-center">
                        <div className="rounded-3xl border bg-white p-5 shadow-sm sm:p-6">
                            <div className="flex items-start gap-4">
                                <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-accent text-primary">
                                    <ShoppingBasket className="size-5" />
                                </span>
                                <div>
                                    <p className="text-[11px] font-extrabold text-muted-foreground">از طرف خریدار</p>
                                    <h3 className="mt-1 text-base font-black">نیاز واقعی خرید</h3>
                                    <p className="mt-2 text-xs leading-6 text-muted-foreground">
                                        چه کالایی، چه مقدار، کجا و برای چه زمانی نیاز داری؟
                                    </p>
                                </div>
                            </div>
                            <div className="mt-5 flex flex-wrap gap-2">
                                {["کالا", "حجم", "موقعیت", "زمان تأمین"].map((item) => (
                                    <span key={item} className="rounded-full bg-muted px-3 py-1.5 text-[9px] font-bold text-muted-foreground">{item}</span>
                                ))}
                            </div>
                        </div>

                        <div className="relative z-10 mx-auto flex size-32 flex-col items-center justify-center rounded-full border-8 border-white bg-primary text-center text-white shadow-2xl shadow-primary/25">
                            <Link2 className="size-7" />
                            <span className="mt-1 text-[10px] font-black">آی‌مچ</span>
                            <span className="mt-0.5 text-[8px] opacity-80">اتصال دقیق</span>
                        </div>

                        <div className="rounded-3xl border bg-white p-5 shadow-sm sm:p-6">
                            <div className="flex items-start gap-4">
                                <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-accent text-primary">
                                    <Store className="size-5" />
                                </span>
                                <div>
                                    <p className="text-[11px] font-extrabold text-muted-foreground">از طرف تأمین‌کننده</p>
                                    <h3 className="mt-1 text-base font-black">اطلاعات واقعی تأمین</h3>
                                    <p className="mt-2 text-xs leading-6 text-muted-foreground">
                                        چه کالایی داری، با چه قیمت و موجودی و چه شرایطی می‌توانی تأمین کنی؟
                                    </p>
                                </div>
                            </div>
                            <div className="mt-5 flex flex-wrap gap-2">
                                {["کالا", "قیمت", "موجودی", "شرایط تأمین"].map((item) => (
                                    <span key={item} className="rounded-full bg-muted px-3 py-1.5 text-[9px] font-bold text-muted-foreground">{item}</span>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="mx-auto mt-9 max-w-2xl rounded-2xl border border-primary/15 bg-accent/35 px-5 py-4 text-center">
                    <p className="text-sm font-extrabold leading-7">
                        نتیجه؟<span className="text-primary"> خریدار به تأمین‌کننده‌ای نزدیک می‌شود که واقعاً همان کالا را دارد.</span>
                    </p>
                    <p className="mt-1 text-[11px] leading-6 text-muted-foreground">
                        نه صرفاً یک لیست عمومی از فروشنده‌ها؛ بلکه تأمین‌کننده مرتبط با نیاز واقعی خریدار.
                    </p>
                </div>
            </div>
        </section>
    );
}

/* ─────────────────────────────────────────────────────────────
 * NetworkSection
 * ───────────────────────────────────────────────────────────── */

function NetworkSection() {
    return (
        <section className="overflow-hidden border-b bg-stone-950 text-white">
            <div className="relative mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
                <div
                    aria-hidden
                    className="pointer-events-none absolute inset-0 opacity-30"
                    style={{
                        backgroundImage: "radial-gradient(circle, rgba(255,255,255,.16) 1px, transparent 1px)",
                        backgroundSize: "22px 22px",
                    }}
                />

                <div className="relative grid items-center gap-10 lg:grid-cols-[1fr_1.1fr] lg:gap-16">
                    <div>
                        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[10px] font-bold text-primary-foreground">
                            <Users className="size-3.5" />
                            شبکه‌ی واقعی خرید و فروش
                        </div>
                        <h2 className="text-2xl font-black leading-[1.6] sm:text-3xl">
                            هرچه نیاز و تأمین واقعی بیشتری وارد شود،
                            <span className="text-primary"> اتصال‌ها دقیق‌تر می‌شوند.</span>
                        </h2>
                        <p className="mt-4 text-sm leading-8 text-stone-300">
                            کاتالوگ‌ها اطلاعات سمت فروش را وارد می‌کنند و لیست‌های خرید، نیاز سمت خریدار را. آی‌مچ این دو جریان را در سطح کالای دقیق کنار هم قرار می‌دهد.
                        </p>
                        <div className="mt-6 flex flex-wrap gap-2">
                            {["کالای دقیق", "قیمت", "موجودی", "موقعیت", "شرایط تأمین"].map((item) => (
                                <span key={item} className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[10px] font-bold text-stone-300">{item}</span>
                            ))}
                        </div>
                    </div>

                    <div className="relative mx-auto w-full max-w-xl">
                        <div className="grid gap-3">
                            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
                                <div className="flex items-center gap-3">
                                    <span className="grid size-10 place-items-center rounded-xl bg-primary/15 text-primary">
                                        <ShoppingBasket className="size-4" />
                                    </span>
                                    <div>
                                        <p className="text-[10px] text-stone-400">خریدار</p>
                                        <p className="text-sm font-black">پیاز · ۱ تن · تبریز</p>
                                    </div>
                                </div>
                            </div>

                            <div className="mx-auto flex size-11 items-center justify-center rounded-full bg-primary text-white shadow-lg shadow-primary/20">
                                <ArrowLeft className="size-5 ltr:rotate-180" />
                            </div>

                            <div className="grid gap-3 sm:grid-cols-3">
                                {[
                                    { name: "تأمین‌کننده اول", detail: "قیمت + موجودی" },
                                    { name: "تأمین‌کننده دوم", detail: "قیمت + شرایط" },
                                    { name: "تأمین‌کننده سوم", detail: "موجودی + ارسال" },
                                ].map((item, index) => (
                                    <div key={item.name} className={`rounded-2xl border p-4 ${index === 0 ? "border-primary/40 bg-primary/10" : "border-white/10 bg-white/5"}`}>
                                        <div className="flex items-center gap-2">
                                            <span className="grid size-8 place-items-center rounded-lg bg-white/10">
                                                <Store className="size-3.5" />
                                            </span>
                                            <p className="text-[10px] font-extrabold">{item.name}</p>
                                        </div>
                                        <p className="mt-2 text-[9px] text-stone-400">{item.detail}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}

/* ─────────────────────────────────────────────────────────────
 * FAQ
 * ───────────────────────────────────────────────────────────── */

function FaqItem({ q, a, open, onToggle }: { q: string; a: string; open: boolean; onToggle: () => void }) {
    return (
        <div className={`overflow-hidden rounded-2xl border bg-white transition-shadow ${open ? "shadow-sm" : ""}`}>
            <button type="button" onClick={onToggle} aria-expanded={open} className="flex w-full items-center justify-between gap-4 px-5 py-4 text-right">
                <span className="text-sm font-bold">{q}</span>
                <ChevronDown className={`size-4 shrink-0 text-muted-foreground transition-transform duration-300 ${open ? "rotate-180" : ""}`} />
            </button>
            {open && (
                <p className="animate-[fade-up_0.25s_ease_both] px-5 pb-5 text-xs leading-7 text-muted-foreground sm:text-sm">{a}</p>
            )}
        </div>
    );
}

function Faq() {
    const [open, setOpen] = useState<number | null>(0);
    return (
        <section className="border-b bg-white">
            <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6 sm:py-20">
                <SectionHead
                    title="سؤال‌هایی که احتمالاً داری"
                    sub="اگر هنوز برایت روشن نیست آی‌مچ دقیقاً چه کاری انجام می‌دهد، از اینجا شروع کن."
                />
                <div className="mt-8 grid gap-2.5">
                    {FAQS.map((faq, index) => (
                        <FaqItem key={faq.q} {...faq} open={open === index} onToggle={() => setOpen(open === index ? null : index)} />
                    ))}
                </div>
            </div>
        </section>
    );
}

/* ─────────────────────────────────────────────────────────────
 * Final CTA
 * ───────────────────────────────────────────────────────────── */

function FinalCta() {
    return (
        <section className="mx-auto max-w-6xl px-4 pb-16 pt-14 sm:px-6 sm:pb-20 sm:pt-20 lg:px-8">
            <div className="relative overflow-hidden rounded-[2rem] border border-primary/20 bg-gradient-to-br from-accent via-white to-accent/30 p-7 text-center shadow-sm sm:rounded-[2.5rem] sm:p-12">
                <div aria-hidden className="pointer-events-none absolute -end-20 -top-20 size-64 rounded-full bg-primary/10 blur-3xl" />
                <div aria-hidden className="pointer-events-none absolute -start-20 -bottom-24 size-64 rounded-full bg-primary/10 blur-3xl" />

                <div className="relative">
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/15 bg-white px-3.5 py-1.5 text-[10px] font-bold text-primary shadow-sm">
                        شروع رایگان
                    </span>
                    <h2 className="mx-auto mt-4 max-w-2xl text-2xl font-black leading-[1.6] sm:text-3xl">
                       آسان و رایگان
                    </h2>
                    <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-muted-foreground">
                       بساز و به اشتراک بزار تا کارهای تکراری خرید و فروش عمده کمتر بشه.
                    </p>
                    <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
                        <Link href="/start?mode=register">
                            <Button size="lg" className="w-full rounded-xl px-8 shadow-lg shadow-primary/25 sm:w-auto">
                                همین الان بساز
                                <ArrowLeft className="size-4 ltr:rotate-180" />
                            </Button>
                        </Link>
                    </div>
                </div>
            </div>
        </section>
    );
}

/* ─────────────────────────────────────────────────────────────
 * Page
 * ───────────────────────────────────────────────────────────── */

export default function Home() {
    const router = useRouter();
    const status = useAuthStore((s) => s.status);

    useEffect(() => {
        if (status === "authed") {
            router.replace(myArmHref());
        }
    }, [status, router]);

    return (
        <div className="flex min-h-screen flex-col bg-white">
            <style>{`
@keyframes fade-up {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
}

/* سه کپی → translateX(-33.333%) یعنی یک‌سوم کل عرض = یک کپی کامل.
   حلقه هرگز خالی نمی‌شود چون همیشه دو کپی دیگر در انتظارند. */
@keyframes marquee {
    from { transform: translateX(0); }
    to { transform: translateX(-50%); }
}

@media (prefers-reduced-motion: reduce) {
.marquee-track { animation: none !important; }
}
`}</style>

            <AppHeader />

            <main className="grow">
                <Hero />
                <Testimonials />
                <LiveActivity />
                <ShareSection />
                <Brands />
                <CoreValue />
                <NetworkSection />
                <Faq />
                <FinalCta />
            </main>

            <AppFooter />
            <MobileTabBar />
        </div>
    );
}