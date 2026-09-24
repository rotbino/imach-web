"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
    fa,
    fmtMoney,
    goodName,
    unitLabel,
} from "@/lib/format";
import { useAuthStore } from "@/lib/auth-store";
import { myArmHref } from "@/lib/active-biz";
import { useExploreFeed } from "@/lib/queries";
import {
    AppFooter,
    AppHeader,
    MobileTabBar,
} from "@/app/components/chrome";
import { Button } from "@/components/ui/button";
import {
    ArrowLeft,
    BadgeCheck,
    BatteryMedium,
    BellRing,
    Building2,
    Check,
    CheckCircle2,
    ChevronDown,
    Clock3,
    Copy,
    Link2,
    MapPin,
    MessageCircle,
    PencilLine,
    Plus,
    Quote,
    Search,
    Send,
    Share2,
    ShoppingBasket,
    Signal,
    Store,
    Timer,
    TrendingUp,
    Users,
    Wifi,
} from "lucide-react";

/* ─────────────────────────────────────────────────────────────
 * داده‌های ثابت
 * ───────────────────────────────────────────────────────────── */

const BASELINE = [
    {
        icon: Link2,
        title: "یک لینک، همیشه به‌روز",
        sub: "کاتالوگ فروشت را بساز و همان یک لینک را برای مشتری‌هایت بفرست.",
    },
    {
        icon: BellRing,
        title: "قیمت همیشه به‌روز",
        sub: "قیمت را یک‌بار تغییر بده؛ هرکس لینک را باز کند، آخرین قیمت را می‌بیند.",
    },
    {
        icon: BadgeCheck,
        title: "رایگان و بدون نصب",
        sub: "مشتری یا تأمین‌کننده برای دیدن صفحه‌ات نیازی به نصب برنامه ندارد.",
    },
] as const;

const STEPS = [
    {
        icon: PencilLine,
        number: "۱",
        title: "بساز",
        desc: "کاتالوگ فروش یا لیست خریدت را در چند دقیقه آماده کن.",
    },
    {
        icon: Send,
        number: "۲",
        title: "بفرست",
        desc: "لینکش را برای مشتری‌ها یا تأمین‌کننده‌هایی که می‌شناسی بفرست.",
    },
    {
        icon: Timer,
        number: "۳",
        title: "به‌روز نگه دار",
        desc: "قیمت یا نیازت که تغییر کرد، همان صفحه را به‌روزرسانی کن.",
    },
] as const;

const FAQS = [
    {
        q: "آی‌مچ دقیقاً چیست؟",
        a: "آی‌مچ یک بستر B2B برای اتصال نیاز خریداران به تأمین‌کننده‌های مناسب است. کاتالوگ فروش و لیست خرید، ساده‌ترین راه برای شروع کار با آی‌مچ هستند.",
    },
    {
        q: "کاتالوگ فروش چه فایده‌ای دارد؟",
        a: "محصولات و قیمت‌هایت را در یک صفحه‌ی همیشه‌به‌روز قرار می‌دهی و فقط لینک آن را برای مشتری‌هایت می‌فرستی. هر زمان قیمت یا محصولی تغییر کند، همان لینک به‌روز می‌شود.",
    },
    {
        q: "لیست خرید چه کاری انجام می‌دهد؟",
        a: "نیاز خریدت را ثبت می‌کنی و می‌توانی آن را برای تأمین‌کننده‌هایی که می‌شناسی بفرستی. اطلاعات نیاز خرید، نقطه شروع اتصال تو به تأمین‌کننده‌های مناسب است.",
    },
    {
        q: "آیا برای استفاده از آی‌مچ باید برنامه نصب کنم؟",
        a: "نه. کاتالوگ‌ها و صفحه‌های خرید از طریق لینک قابل مشاهده‌اند و برای مشتری یا تأمین‌کننده نیازی به نصب برنامه نیست.",
    },
    {
        q: "آیا آی‌مچ فقط یک ابزار ساخت کاتالوگ است؟",
        a: "نه. کاتالوگ و لیست خرید فقط نقطه شروع هستند. هدف آی‌مچ این است که نیاز خریدار هر کالا را با اطلاعات تأمین‌کنندگان مناسب همان کالا نزدیک کند.",
    },
] as const;

/* ─────────────────────────────────────────────────────────────
 * Testimonials — دید خریدار، فروشنده، بازاریاب، تولیدکننده
 * ───────────────────────────────────────────────────────────── */

const TESTIMONIALS = [
    {
        name: "حسن احمدی",
        role: "مدیر فروش · ایس مک",
        tone: "sell" as const,
        quote:
            "قبلاً برای هر مشتری قیمت‌ها را دستی می‌فرستادم. حالا یک لینک دارم که همیشه به‌روزه. مشتری‌هام می‌دونن هر وقت بازش کنن، آخرین قیمت رو می‌بینن.",
    },
    {
        name: "علی صبوری",
        role: "بازاریاب · پخش علوی",
        tone: "sell" as const,
        quote:
            "لینک کاتالوگم رو توی گروه‌های صنفی فرستادم. دو تا مشتری جدید فقط از همون‌جا اومدن. خودم هم باورم نمی‌شد این‌قدر سریع جواب بده.",
    },
    {
        name: "رضا صادقی",
        role: "مسئول خرید · کارگاه کابینت",
        tone: "buy" as const,
        quote:
            "لیست خریدم رو برای سه تا تأمین‌کننده فرستادم. قیمت‌ها رو کنار هم دیدم و بدون تماس تلفنی، بهترین رو انتخاب کردم. وقت زیادی صرفه‌جویی شد.",
    },
    {
        name: "زهرا کریمی",
        role: "مدیر تولید · لبنیات سپید",
        tone: "sell" as const,
        quote:
            "چون کاتالوگم لینک ثابت داره، دیگه هر بار قیمت عوض می‌کنم، لازم نیست به همه خبر بدم. مشتری‌ها خودشون آخرین قیمت رو می‌بینن.",
    },
    {
        name: "محمد نوری",
        role: "خریدار عمده · رستوران آراد",
        tone: "buy" as const,
        quote:
            "قبلاً برای پیدا کردن تأمین‌کننده پیاز، کلی وقت تلف می‌کردم. حالا لیست نیازم رو می‌فرستم و تأمین‌کننده‌ها خودشون پیشنهاد می‌دن.",
    },
] as const;

/* ─────────────────────────────────────────────────────────────
 * Brands — کسب‌وکارهایی که از آی‌مچ استفاده می‌کنن
 * ───────────────────────────────────────────────────────────── */

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

/* ─────────────────────────────────────────────────────────────
 * Shared
 * ───────────────────────────────────────────────────────────── */

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
                <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-primary/15 bg-accent/60 px-3 py-1.5 text-[11px] font-extrabold text-primary">
                    <span className="size-1.5 rounded-full bg-primary" />
                    {eyebrow}
                </div>
            )}

            <h2 className="text-2xl font-black tracking-tight sm:text-3xl">
                {title}
            </h2>

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
        <div className="relative mx-auto w-full max-w-[315px]">
            <div
                aria-hidden
                className="absolute -inset-5 rounded-[3rem] bg-gradient-to-b from-primary/15 via-primary/5 to-transparent blur-xl"
            />

            <div className="relative rounded-[2.25rem] border-[6px] border-stone-900 bg-stone-900 p-1 shadow-2xl shadow-stone-900/20">
                <div className="relative overflow-hidden rounded-[1.65rem] border border-stone-200 bg-background">
                    <div
                        aria-hidden
                        className="absolute left-1/2 top-0 z-20 h-5 w-24 -translate-x-1/2 rounded-b-2xl bg-stone-900"
                    />
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
            className="flex items-center justify-between border-b bg-white px-4 py-1.5 pt-2 text-[9px] font-bold text-muted-foreground"
        >
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
 * Catalog mock
 * ───────────────────────────────────────────────────────────── */

const CATALOG_ROWS = [
    { name: "روغن سرخ‌کردنی ۱۰ لیتری", price: 420000, when: "امروز · ۹:۴۰" },
    { name: "برنج طارم اعلا ۱۰ کیلویی", price: 980000, when: "امروز · ۹:۴۰" },
    { name: "پیاز — کیسه ۲۵ کیلویی", price: 310000, when: "دیروز" },
];

function CatalogScreen() {
    return (
        <PhoneFrame>
            <StatusBar />

            <div className="border-b bg-white px-3.5 pb-3 pt-4">
                <div className="flex items-center justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2.5">
                        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary text-white shadow-sm">
                            <Store className="size-4" />
                        </span>

                        <div className="min-w-0">
                            <p className="truncate text-xs font-extrabold">
                                سپید کالا · پخش عمده
                            </p>

                            <p className="mt-0.5 flex items-center gap-1 text-[9px] text-emerald-600">
                                <span className="size-1.5 animate-soft-pulse rounded-full bg-emerald-500" />
                                آخرین قیمت‌ها
                            </p>
                        </div>
                    </div>

                    <span className="flex shrink-0 items-center gap-1 rounded-full bg-primary px-2.5 py-1.5 text-[9px] font-bold text-white">
                        <Plus className="size-3" />
                        دنبال کردن
                    </span>
                </div>
            </div>

            <div className="border-b bg-white px-3.5 pb-3 pt-2.5">
                <div className="flex items-center gap-2 rounded-xl border bg-muted/40 px-3 py-2 text-[10px] text-muted-foreground">
                    <Search className="size-3.5" />
                    جست‌وجو در کاتالوگ…
                </div>
            </div>

            <div className="divide-y bg-white">
                {CATALOG_ROWS.map((row) => (
                    <div
                        key={row.name}
                        className="flex items-center justify-between gap-2 px-3.5 py-3"
                    >
                        <div className="min-w-0">
                            <p className="truncate text-xs font-bold">
                                {row.name}
                            </p>

                            <p className="mt-1 flex items-center gap-1 text-[9px] text-muted-foreground">
                                <Clock3 className="size-3" />
                                {row.when}
                            </p>
                        </div>

                        <p className="shrink-0 whitespace-nowrap text-xs font-black text-primary">
                            {fa(row.price)}{" "}
                            <span className="text-[8px] font-normal">
                                ریال
                            </span>
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
 * Buy mock
 * ───────────────────────────────────────────────────────────── */

const OFFER_ROWS = [
    { name: "عمده‌فروشی میوه سبلان", price: 4200000, best: true, when: "۱۰ دقیقه پیش" },
    { name: "طبیعت‌دانه پخش", price: 4350000, best: false, when: "۲۵ دقیقه پیش" },
    { name: "تره‌بار آرتام", price: 4450000, best: false, when: "۱ ساعت پیش" },
];

function BuyScreen() {
    return (
        <PhoneFrame>
            <StatusBar />

            <div className="border-b bg-white px-3.5 pb-3 pt-4">
                <div className="flex items-center justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2.5">
                        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-stone-900 text-white">
                            <ShoppingBasket className="size-4" />
                        </span>

                        <div className="min-w-0">
                            <p className="truncate text-xs font-extrabold">
                                لیست خرید رستوران آراد
                            </p>

                            <p className="mt-0.5 flex items-center gap-1 text-[9px] text-muted-foreground">
                                <MapPin className="size-3" />
                                تبریز · ۱ قلم نیاز
                            </p>
                        </div>
                    </div>

                    <span className="grid size-8 shrink-0 place-items-center rounded-full border text-muted-foreground">
                        <Share2 className="size-3.5" />
                    </span>
                </div>
            </div>

            <div className="border-b bg-muted/20 px-3.5 py-3">
                <div className="rounded-xl border bg-primary/10 px-3 py-2.5">
                    <div className="flex items-center justify-between gap-2">
                        <div>
                            <p className="text-[9px] text-muted-foreground">
                                نیاز خرید
                            </p>

                            <p className="mt-0.5 text-xs font-extrabold">
                                پیاز — ۱ تن
                            </p>
                        </div>

                        <span className="whitespace-nowrap rounded-full bg-white px-2.5 py-1 text-[9px] font-bold text-stone-700 shadow-sm">
                            ۳ پیشنهاد
                        </span>
                    </div>
                </div>
            </div>

            <div className="bg-white">
                <div className="flex items-center justify-between px-3.5 pb-1 pt-3">
                    <p className="text-[9px] font-bold text-muted-foreground">
                        پیشنهادهای تأمین
                    </p>

                    <span className="text-[8px] text-muted-foreground">
                        مقایسه در یک نگاه
                    </span>
                </div>

                <div className="divide-y">
                    {OFFER_ROWS.map((row) => (
                        <div
                            key={row.name}
                            className={`flex items-center justify-between gap-2 px-3.5 py-3 ${
                                row.best ? "bg-accent/45" : ""
                            }`}
                        >
                            <div className="min-w-0">
                                <p
                                    className={`truncate text-xs ${
                                        row.best
                                            ? "font-black"
                                            : "font-bold text-muted-foreground"
                                    }`}
                                >
                                    {row.name}
                                </p>

                                <p className="mt-0.5 text-[9px] text-muted-foreground">
                                    {row.when}
                                </p>
                            </div>

                            <div className="flex shrink-0 items-center gap-1.5">
                                {row.best && (
                                    <span className="rounded-full bg-primary px-2 py-0.5 text-[8px] font-bold text-white">
                                        قیمت بهتر
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
                                    <span className="text-[8px] font-normal">
                                        ریال
                                    </span>
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
            <div
                aria-hidden
                className="pointer-events-none absolute inset-x-0 top-0 h-[520px] bg-[radial-gradient(circle_at_50%_0%,hsl(var(--primary)/0.10),transparent_60%)]"
            />

            <div className="relative mx-auto max-w-6xl px-4 pb-14 pt-10 sm:px-6 sm:pb-20 sm:pt-16 lg:px-8">
                <div className="mx-auto max-w-3xl text-center">
                    <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-primary/15 bg-accent/60 px-3.5 py-1.5 text-[11px] font-extrabold text-primary">
                        <span className="size-1.5 rounded-full bg-primary" />
                        برای خرید و فروش عمده
                    </div>

                    <h1 className="text-[28px] font-black leading-[1.55] tracking-tight sm:text-4xl sm:leading-[1.45] lg:text-[42px]">
                        نیازت را بگو،
                        <br className="sm:hidden" />{" "}
                        <span className="text-primary">
                            تأمین‌کننده مناسبش را پیدا کن
                        </span>
                    </h1>

                    <p className="mx-auto mt-5 max-w-2xl text-sm leading-8 text-muted-foreground sm:text-base sm:leading-8">
                        آی‌مچ نیاز خریداران هر کالا را با اطلاعات تأمین‌کننده‌های
                        مناسب همان کالا نزدیک می‌کند؛ از قیمت و موجودی گرفته تا
                        شرایط و امکان تأمین.
                    </p>

                    <p className="mx-auto mt-3 max-w-xl text-xs leading-6 text-muted-foreground">
                        کاتالوگ فروش و لیست خرید، ساده‌ترین راه برای شروع این
                        ارتباط هستند.
                    </p>
                </div>

                <div className="mx-auto mt-9 max-w-4xl">
                    <div className="grid items-center gap-8 lg:grid-cols-[1fr_auto_1fr] lg:gap-6">
                        <div className="order-2 lg:order-1">
                            <div className="mb-4 text-center lg:text-right">
                                <span className="text-[11px] font-extrabold text-primary">
                                    اگر می‌فروشی
                                </span>

                                <h2 className="mt-1 text-lg font-black">
                                    کاتالوگ فروشت را بساز
                                </h2>

                                <p className="mt-1 text-xs leading-6 text-muted-foreground">
                                    محصولات و قیمت‌هایت را در یک لینک همیشه‌به‌روز
                                    به مشتری‌هایت نشان بده.
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
                                <div className="relative">
                                    <CatalogScreen />
                                </div>

                                {isSell && (
                                    <div className="absolute inset-x-5 bottom-4 flex justify-center">
                                        <span className="rounded-full bg-primary px-4 py-2 text-[10px] font-bold text-white shadow-lg">
                                            همین را بساز
                                        </span>
                                    </div>
                                )}
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
                                <span className="text-[11px] font-extrabold text-stone-700">
                                    اگر می‌خری
                                </span>

                                <h2 className="mt-1 text-lg font-black">
                                    نیاز خریدت را ثبت کن
                                </h2>

                                <p className="mt-1 text-xs leading-6 text-muted-foreground">
                                    کالای موردنیازت را بگو تا مسیر رسیدن به
                                    تأمین‌کننده مناسب شروع شود.
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
                                <div className="relative">
                                    <BuyScreen />
                                </div>

                                {!isSell && (
                                    <div className="absolute inset-x-5 bottom-4 flex justify-center">
                                        <span className="rounded-full bg-stone-900 px-4 py-2 text-[10px] font-bold text-white shadow-lg">
                                            همین را بساز
                                        </span>
                                    </div>
                                )}
                            </button>
                        </div>
                    </div>
                </div>

                <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
                    <Link href="/start?mode=register">
                        <Button
                            size="lg"
                            className="w-full rounded-xl px-7 shadow-lg shadow-primary/25 sm:w-auto"
                        >
                            ساخت کاتالوگ فروش
                            <ArrowLeft className="size-4 ltr:rotate-180" />
                        </Button>
                    </Link>

                    <Link href="/start?mode=register">
                        <Button
                            size="lg"
                            variant="outline"
                            className="w-full rounded-xl border-stone-300 px-7 sm:w-auto"
                        >
                            ثبت نیاز خرید
                            <ArrowLeft className="size-4 ltr:rotate-180" />
                        </Button>
                    </Link>
                </div>

                <div className="mx-auto mt-7 flex max-w-2xl flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[10px] font-bold text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                        <Check className="size-3.5 text-primary" />
                        رایگان برای شروع
                    </span>

                    <span className="flex items-center gap-1.5">
                        <Check className="size-3.5 text-primary" />
                        بدون نصب برای مشتری
                    </span>

                    <span className="flex items-center gap-1.5">
                        <Check className="size-3.5 text-primary" />
                        لینک همیشه به‌روز
                    </span>
                </div>
            </div>
        </section>
    );
}

/* ─────────────────────────────────────────────────────────────
 * Live activity — مارکی تمام‌عرض، آیتم‌های درشت
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
            <span
                className={`grid size-10 shrink-0 place-items-center rounded-xl ${
                    tone === "sell"
                        ? "bg-accent text-primary"
                        : "bg-stone-100 text-stone-700"
                }`}
            >
                <Icon className="size-5" />
            </span>

            <div className="min-w-0">
                <p className="truncate text-sm font-extrabold">{name}</p>

                <p className="mt-0.5 flex items-center gap-1.5 whitespace-nowrap text-xs text-muted-foreground">
                    {detail}
                    {city && (
                        <>
                            <span className="opacity-40">·</span>
                            <span className="flex items-center gap-0.5">
                                <MapPin className="size-3" />
                                {city}
                            </span>
                        </>
                    )}
                </p>
            </div>
        </div>
    );
}

function MarqueeRow({
                        items,
                        reverse = false,
                        duration = 60,
                    }: {
    items: React.ReactNode;
    reverse?: boolean;
    duration?: number;
}) {
    return (
        <div className="group relative overflow-hidden">
            <div
                className="marquee-track flex w-max gap-3 group-hover:[animation-play-state:paused]"
                style={{
                    animation: `marquee ${duration}s linear infinite`,
                    animationDirection: reverse ? "reverse" : "normal",
                }}
            >
                <div className="flex gap-3 pe-3">{items}</div>
                <div className="flex gap-3 pe-3" aria-hidden>
                    {items}
                </div>
            </div>

            <div className="pointer-events-none absolute inset-y-0 end-0 z-10 w-24 bg-gradient-to-r from-transparent to-white" />
            <div className="pointer-events-none absolute inset-y-0 start-0 z-10 w-24 bg-gradient-to-l from-transparent to-white" />
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
                <p className="text-sm font-extrabold text-muted-foreground">
                    همین حالا در آی‌مچ
                </p>
            </div>

            <div className="space-y-4">
                {hasSell && (
                    <MarqueeRow
                        duration={75}
                        items={sellRows.map((r) => (
                            <LiveCard
                                key={r.id}
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
                        duration={65}
                        items={buyRows.map((r) => (
                            <LiveCard
                                key={r.id}
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
 * Share Section — قلب هدف ما: تشویق به اشتراک‌گذاری
 * ───────────────────────────────────────────────────────────── */

const SHARE_BENEFITS = [
    {
        icon: Send,
        title: "برای هرکس بفرست، بدون نصب",
        sub: "مشتری یا تأمین‌کننده فقط لینک را باز می‌کند. نه ثبت‌نام، نه نصب، نه ورود.",
    },
    {
        icon: TrendingUp,
        title: "اطلاعات دقیق‌تر = اتصال دقیق‌تر",
        sub: "هرچه کاتالوگ‌ها و لیست‌های خرید بیشتری وارد شوند، آی‌مچ تأمین‌کننده‌های مرتبط‌تری پیدا می‌کند.",
    },
    {
        icon: Users,
        title: "شبکه‌ی خودت را وارد کن",
        sub: "مشتری‌ها، همکاران صنفی و تأمین‌کننده‌هایی که می‌شناسی؛ یک لینک کافی است.",
    },
] as const;

function ShareSection() {
    return (
        <section className="relative overflow-hidden border-b bg-gradient-to-b from-accent/25 via-white to-white">
            <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
                <SectionHead
                    eyebrow="هدف اصلی آی‌مچ"
                    title="لینک کاتالوگ یا لیست خریدت را بفرست"
                    sub="آی‌مچ وقتی کار می‌کند که اطلاعات واقعی خرید و فروش وارد شود. ساده‌ترین راه شروع، ساختن یک کاتالوگ یا لیست خرید و فرستادن لینک آن برای کسانی است که می‌شناسی."
                />

                <div className="mx-auto mt-10 grid max-w-5xl gap-4 md:grid-cols-3">
                    {SHARE_BENEFITS.map((item) => (
                        <div
                            key={item.title}
                            className="rounded-2xl border bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
                        >
                            <span className="grid size-11 place-items-center rounded-xl bg-accent text-primary">
                                <item.icon className="size-5" />
                            </span>

                            <h3 className="mt-4 text-sm font-extrabold">
                                {item.title}
                            </h3>

                            <p className="mt-2 text-xs leading-6 text-muted-foreground">
                                {item.sub}
                            </p>
                        </div>
                    ))}
                </div>

                {/* Mockup اشتراک‌گذاری */}
                <div className="mx-auto mt-10 max-w-3xl overflow-hidden rounded-3xl border bg-white shadow-lg">
                    <div className="flex items-center gap-2 border-b bg-muted/40 px-4 py-3">
                        <span className="size-2.5 rounded-full bg-red-400" />
                        <span className="size-2.5 rounded-full bg-amber-400" />
                        <span className="size-2.5 rounded-full bg-emerald-400" />

                        <span className="mx-auto flex items-center gap-1.5 rounded-md bg-white px-3 py-1 text-[10px] font-bold text-muted-foreground shadow-sm">
                            <Link2 className="size-3" />
                            imach.ir/s/sepidsupermarket
                        </span>
                    </div>

                    <div className="flex items-center justify-between gap-4 p-5">
                        <div className="flex items-center gap-3">
                            <span className="grid size-11 place-items-center rounded-xl bg-primary text-white">
                                <Store className="size-5" />
                            </span>

                            <div>
                                <p className="text-sm font-extrabold">
                                    سپید کالا · پخش عمده
                                </p>
                                <p className="mt-0.5 text-[11px] text-muted-foreground">
                                    ۲۴ قلم کالا · آخرین به‌روزرسانی: امروز
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <span className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[11px] font-bold text-muted-foreground">
                                <Copy className="size-3.5" />
                                کپی
                            </span>
                            <span className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-[11px] font-bold text-white">
                                <Share2 className="size-3.5" />
                                اشتراک‌گذاری
                            </span>
                        </div>
                    </div>
                </div>

                <div className="mt-8 flex justify-center">
                    <Link href="/start?mode=register">
                        <Button size="lg" className="rounded-xl px-7 shadow-lg shadow-primary/25">
                            کاتالوگ خودت را بساز
                            <ArrowLeft className="size-4 ltr:rotate-180" />
                        </Button>
                    </Link>
                </div>
            </div>
        </section>
    );
}

/* ─────────────────────────────────────────────────────────────
 * Testimonials
 * ───────────────────────────────────────────────────────────── */

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

    return (
        <div className="flex h-full flex-col rounded-2xl border bg-white p-5 shadow-sm">
            <Quote
                className={`size-5 shrink-0 ${
                    tone === "sell" ? "text-primary" : "text-stone-400"
                }`}
            />

            <p className="mt-3 grow text-xs leading-7 text-stone-700 sm:text-[13px]">
                {quote}
            </p>

            <div className="mt-4 flex items-center gap-3 border-t pt-4">
                <span
                    className={`grid size-10 shrink-0 place-items-center rounded-full text-sm font-black ${
                        tone === "sell"
                            ? "bg-accent text-primary"
                            : "bg-stone-100 text-stone-700"
                    }`}
                >
                    {initial}
                </span>

                <div className="min-w-0">
                    <p className="truncate text-xs font-extrabold">{name}</p>

                    <p className="truncate text-[10px] text-muted-foreground">
                        {role}
                    </p>
                </div>
            </div>
        </div>
    );
}

function Testimonials() {
    return (
        <section className="border-b bg-muted/20">
            <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
                <SectionHead
                    eyebrow="از زبان کاربران"
                    title="کسانی که این مسیر را رفته‌اند"
                    sub="فروشنده، خریدار، بازاریاب و تولیدکننده — همه از یک چیز می‌گویند: سادگی و نتیجه."
                />

                <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {TESTIMONIALS.map((t) => (
                        <TestimonialCard key={t.name} {...t} />
                    ))}
                </div>
            </div>
        </section>
    );
}

/* ─────────────────────────────────────────────────────────────
 * Brands — کسب‌وکارهایی که از آی‌مچ استفاده می‌کنن
 * ───────────────────────────────────────────────────────────── */

function Brands() {
    return (
        <section className="border-b bg-white py-12">
            <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
                <p className="text-center text-[11px] font-extrabold text-muted-foreground">
                    کسب‌وکارهایی که از آی‌مچ استفاده می‌کنند
                </p>

                <div className="mt-6 flex flex-wrap items-center justify-center gap-3 sm:gap-4">
                    {BRANDS.map((brand) => (
                        <div
                            key={brand}
                            className="flex items-center gap-2 rounded-full border bg-white px-4 py-2 shadow-sm transition-shadow hover:shadow-md"
                        >
                            <span className="grid size-6 place-items-center rounded-full bg-accent text-primary">
                                <Building2 className="size-3" />
                            </span>

                            <span className="whitespace-nowrap text-xs font-bold text-stone-700">
                                {brand}
                            </span>

                            <BadgeCheck className="size-3.5 shrink-0 text-primary" />
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}

/* ─────────────────────────────────────────────────────────────
 * Core value
 * ───────────────────────────────────────────────────────────── */

function CoreValue() {
    return (
        <section className="relative overflow-hidden bg-white">
            <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
                <SectionHead
                    eyebrow="شروع ساده، ارزش بیشتر"
                    title="کاتالوگ و لیست خرید، فقط شروع کارند"
                    sub="هر دو ابزار به یک نقطه می‌رسند: اطلاعات واقعی از کالا، قیمت، نیاز و تأمین. آی‌مچ از همین اطلاعات برای نزدیک‌کردن خریدار و تأمین‌کننده استفاده می‌کند."
                />

                <div className="relative mx-auto mt-12 max-w-5xl">
                    <div
                        aria-hidden
                        className="absolute left-1/2 top-1/2 hidden h-px w-[62%] -translate-x-1/2 bg-gradient-to-r from-primary/10 via-primary/50 to-primary/10 lg:block"
                    />

                    <div className="grid gap-5 lg:grid-cols-[1fr_180px_1fr] lg:items-center">
                        <div className="rounded-3xl border bg-white p-5 shadow-sm sm:p-6">
                            <div className="flex items-start gap-4">
                                <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-accent text-primary">
                                    <ShoppingBasket className="size-5" />
                                </span>

                                <div>
                                    <p className="text-[11px] font-extrabold text-muted-foreground">
                                        از طرف خریدار
                                    </p>

                                    <h3 className="mt-1 text-base font-black">
                                        نیاز واقعی خرید
                                    </h3>

                                    <p className="mt-2 text-xs leading-6 text-muted-foreground">
                                        چه کالایی، چه مقدار، کجا و برای چه زمانی
                                        نیاز داری؟
                                    </p>
                                </div>
                            </div>

                            <div className="mt-5 flex flex-wrap gap-2">
                                {["کالا", "حجم", "موقعیت", "زمان تأمین"].map(
                                    (item) => (
                                        <span
                                            key={item}
                                            className="rounded-full bg-muted px-3 py-1.5 text-[9px] font-bold text-muted-foreground"
                                        >
                                            {item}
                                        </span>
                                    )
                                )}
                            </div>
                        </div>

                        <div className="relative z-10 mx-auto flex size-32 flex-col items-center justify-center rounded-full border-8 border-white bg-primary text-center text-white shadow-2xl shadow-primary/25">
                            <Link2 className="size-7" />

                            <span className="mt-1 text-[10px] font-black">
                                آی‌مچ
                            </span>

                            <span className="mt-0.5 text-[8px] opacity-80">
                                اتصال دقیق
                            </span>
                        </div>

                        <div className="rounded-3xl border bg-white p-5 shadow-sm sm:p-6">
                            <div className="flex items-start gap-4">
                                <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-accent text-primary">
                                    <Store className="size-5" />
                                </span>

                                <div>
                                    <p className="text-[11px] font-extrabold text-muted-foreground">
                                        از طرف تأمین‌کننده
                                    </p>

                                    <h3 className="mt-1 text-base font-black">
                                        اطلاعات واقعی تأمین
                                    </h3>

                                    <p className="mt-2 text-xs leading-6 text-muted-foreground">
                                        چه کالایی داری، با چه قیمت و موجودی و
                                        چه شرایطی می‌توانی تأمین کنی؟
                                    </p>
                                </div>
                            </div>

                            <div className="mt-5 flex flex-wrap gap-2">
                                {["کالا", "قیمت", "موجودی", "شرایط تأمین"].map(
                                    (item) => (
                                        <span
                                            key={item}
                                            className="rounded-full bg-muted px-3 py-1.5 text-[9px] font-bold text-muted-foreground"
                                        >
                                            {item}
                                        </span>
                                    )
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="mx-auto mt-9 max-w-2xl rounded-2xl border border-primary/15 bg-accent/35 px-5 py-4 text-center">
                    <p className="text-sm font-extrabold leading-7">
                        نتیجه؟
                        <span className="text-primary">
                            {" "}
                            خریدار به تأمین‌کننده‌ای نزدیک می‌شود که واقعاً
                            همان کالا را دارد.
                        </span>
                    </p>

                    <p className="mt-1 text-[11px] leading-6 text-muted-foreground">
                        نه صرفاً یک لیست عمومی از فروشنده‌ها؛ بلکه تأمین‌کننده
                        مرتبط با نیاز واقعی خریدار.
                    </p>
                </div>
            </div>
        </section>
    );
}

/* ─────────────────────────────────────────────────────────────
 * Baseline
 * ───────────────────────────────────────────────────────────── */

function Baseline() {
    return (
        <section className="border-y bg-muted/20">
            <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-18 lg:px-8">
                <SectionHead
                    title="اگر فقط یک کاتالوگ می‌خواهی، همین حالا آماده است"
                    sub="برای شروع لازم نیست کاری پیچیده انجام بدهی؛ یک کاتالوگ یا لیست خرید بساز و لینک آن را به هرکس می‌خواهی بده."
                />

                <div className="mx-auto mt-9 grid max-w-4xl gap-3 md:grid-cols-3">
                    {BASELINE.map((item) => (
                        <div
                            key={item.title}
                            className="rounded-2xl border bg-white p-5 transition-shadow hover:shadow-md"
                        >
                            <span className="grid size-10 place-items-center rounded-xl bg-accent text-primary">
                                <item.icon className="size-4.5" />
                            </span>

                            <p className="mt-4 text-sm font-extrabold">
                                {item.title}
                            </p>

                            <p className="mt-1.5 text-xs leading-6 text-muted-foreground">
                                {item.sub}
                            </p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}

/* ─────────────────────────────────────────────────────────────
 * How it works
 * ───────────────────────────────────────────────────────────── */

function HowToStart() {
    return (
        <section className="bg-white">
            <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
                <SectionHead
                    eyebrow="شروع در چند دقیقه"
                    title="کار با آی‌مچ سخت نیست"
                    sub="از همان کاری شروع کن که همین امروز انجام می‌دهی."
                />

                <div className="relative mx-auto mt-10 grid max-w-5xl gap-4 md:grid-cols-3 md:gap-6">
                    <div
                        aria-hidden
                        className="absolute inset-x-24 top-9 hidden border-t-2 border-dashed border-primary/20 md:block"
                    />

                    {STEPS.map((step) => (
                        <div
                            key={step.number}
                            className="relative rounded-3xl border bg-white p-6 text-center shadow-sm"
                        >
                            <div className="relative mx-auto grid size-18 place-items-center rounded-2xl bg-accent text-primary">
                                <step.icon className="size-6" />

                                <span className="absolute -end-2 -top-2 grid size-7 place-items-center rounded-full border-2 border-white bg-primary text-[10px] font-black text-white shadow-sm">
                                    {step.number}
                                </span>
                            </div>

                            <h3 className="mt-4 text-base font-black">
                                {step.title}
                            </h3>

                            <p className="mt-2 text-xs leading-6 text-muted-foreground">
                                {step.desc}
                            </p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}

/* ─────────────────────────────────────────────────────────────
 * Network section
 * ───────────────────────────────────────────────────────────── */

function NetworkSection() {
    return (
        <section className="overflow-hidden border-y bg-stone-950 text-white">
            <div className="relative mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
                <div
                    aria-hidden
                    className="pointer-events-none absolute inset-0 opacity-30"
                    style={{
                        backgroundImage:
                            "radial-gradient(circle, rgba(255,255,255,.16) 1px, transparent 1px)",
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
                            <span className="text-primary">
                                {" "}
                                اتصال‌ها دقیق‌تر می‌شوند.
                            </span>
                        </h2>

                        <p className="mt-4 text-sm leading-8 text-stone-300">
                            کاتالوگ‌ها اطلاعات سمت فروش را وارد می‌کنند و
                            لیست‌های خرید، نیاز سمت خریدار را. آی‌مچ این دو
                            جریان را در سطح کالای دقیق کنار هم قرار می‌دهد.
                        </p>

                        <div className="mt-6 flex flex-wrap gap-2">
                            {["کالای دقیق", "قیمت", "موجودی", "موقعیت", "شرایط تأمین"].map(
                                (item) => (
                                    <span
                                        key={item}
                                        className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[10px] font-bold text-stone-300"
                                    >
                                        {item}
                                    </span>
                                )
                            )}
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
                                        <p className="text-[10px] text-stone-400">
                                            خریدار
                                        </p>

                                        <p className="text-sm font-black">
                                            پیاز · ۱ تن · تبریز
                                        </p>
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
                                    <div
                                        key={item.name}
                                        className={`rounded-2xl border p-4 ${
                                            index === 0
                                                ? "border-primary/40 bg-primary/10"
                                                : "border-white/10 bg-white/5"
                                        }`}
                                    >
                                        <div className="flex items-center gap-2">
                                            <span className="grid size-8 place-items-center rounded-lg bg-white/10">
                                                <Store className="size-3.5" />
                                            </span>

                                            <p className="text-[10px] font-extrabold">
                                                {item.name}
                                            </p>
                                        </div>

                                        <p className="mt-2 text-[9px] text-stone-400">
                                            {item.detail}
                                        </p>
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
        <div
            className={`overflow-hidden rounded-2xl border bg-white transition-shadow ${
                open ? "shadow-sm" : ""
            }`}
        >
            <button
                type="button"
                onClick={onToggle}
                aria-expanded={open}
                className="flex w-full items-center justify-between gap-4 px-5 py-4 text-right"
            >
                <span className="text-sm font-bold">{q}</span>

                <ChevronDown
                    className={`size-4 shrink-0 text-muted-foreground transition-transform duration-300 ${
                        open ? "rotate-180" : ""
                    }`}
                />
            </button>

            {open && (
                <p className="animate-[fade-up_0.25s_ease_both] px-5 pb-5 text-xs leading-7 text-muted-foreground sm:text-sm">
                    {a}
                </p>
            )}
        </div>
    );
}

function Faq() {
    const [open, setOpen] = useState<number | null>(0);

    return (
        <section className="border-b bg-muted/20">
            <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6 sm:py-20">
                <SectionHead
                    title="سؤال‌هایی که احتمالاً داری"
                    sub="اگر هنوز برایت روشن نیست آی‌مچ دقیقاً چه کاری انجام می‌دهد، از اینجا شروع کن."
                />

                <div className="mt-8 grid gap-2.5">
                    {FAQS.map((faq, index) => (
                        <FaqItem
                            key={faq.q}
                            {...faq}
                            open={open === index}
                            onToggle={() =>
                                setOpen(open === index ? null : index)
                            }
                        />
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
                <div
                    aria-hidden
                    className="pointer-events-none absolute -end-20 -top-20 size-64 rounded-full bg-primary/10 blur-3xl"
                />

                <div
                    aria-hidden
                    className="pointer-events-none absolute -start-20 -bottom-24 size-64 rounded-full bg-primary/10 blur-3xl"
                />

                <div className="relative">
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/15 bg-white px-3.5 py-1.5 text-[10px] font-bold text-primary shadow-sm">
                        شروع رایگان
                    </span>

                    <h2 className="mx-auto mt-4 max-w-2xl text-2xl font-black leading-[1.6] sm:text-3xl">
                        از یک کاتالوگ یا لیست خرید شروع کن
                    </h2>

                    <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-muted-foreground">
                        یک لینک بساز، نیازت را ثبت کن و اجازه بده اطلاعات واقعی
                        خرید و فروش، مسیر رسیدن به تأمین‌کننده مناسب را کوتاه‌تر
                        کند.
                    </p>

                    <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
                        <Link href="/start?mode=register">
                            <Button
                                size="lg"
                                className="w-full rounded-xl px-8 shadow-lg shadow-primary/25 sm:w-auto"
                            >
                                ساخت کاتالوگ فروش
                                <ArrowLeft className="size-4 ltr:rotate-180" />
                            </Button>
                        </Link>

                        <Link href="/start?mode=register">
                            <Button
                                size="lg"
                                variant="outline"
                                className="w-full rounded-xl bg-white px-8 sm:w-auto"
                            >
                                ثبت نیاز خرید
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
                <LiveActivity />
                <CoreValue />
                <ShareSection />
                <Testimonials />
                <Brands />
                <Baseline />
                <HowToStart />
                <NetworkSection />
                <Faq />
                <FinalCta />
            </main>

            <AppFooter />
            <MobileTabBar />
        </div>
    );
}