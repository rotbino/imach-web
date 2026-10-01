"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/auth-store";
import { myArmHref } from "@/lib/active-biz";
import { AppHeader } from "@/app/components/chrome";
import { Button } from "@/components/ui/button";
import {
    Barcode,
    Bell,
    ChevronDown,
    ChevronLeft,
    Check,
    Inbox,
    LayoutGrid,
    Share2,
    Sparkles,
    Store,
    ShoppingBasket,
    Users,
} from "lucide-react";

/* ─────────────────────────────────────────────────────────────
 * لندینگ عمومی — فاز ۹ (طرح ۱۵): بازیافت محتوای واقعیِ لندینگ
 * فعلی (FAQ/نظرات) + کروسلِ اسکرین‌شات‌های واقعیِ اپ از دموی
 * زنده (public/screenshots — فاز ۹ از دیتای واقعی گرفته شده).
 * کاربرِ واردشده → ریدایرکت به بازوی خودش (رفتار موجود).
 * فید اکسپلور حذف شد (Market هنوز رونمایی نشده — implementation-details).
 * ───────────────────────────────────────────────────────────── */

const STEPS = [
    { number: "۱", title: "ثبت‌نام کن", desc: "فقط شماره موبایل و چند سؤال ساده درباره کسب‌وکارت" },
    { number: "۲", title: "کارت را بساز", desc: "کاتالوگ فروش یا لیست خرید — با عکس، قیمت و موجودی" },
    { number: "۳", title: "بگذار ای‌مچ کار کند", desc: "درخواست قیمت بگیر، تابلوی تأمین و پیشنهادها را ببین" },
] as const;

const FAQS = [
    { q: "آی‌مچ دقیقاً چیست؟", a: "بستری برای اتصال نیاز خریداران به تأمین‌کننده‌های مناسب — کاتالوگ فروش و لیست خرید، ساده‌ترین راه برای شروع کار با آی‌مچ هستند." },
    { q: "کاتالوگ فروش چه فایده‌ای دارد؟", a: "محصولات و قیمت‌هایت را در یک صفحه‌ی همیشه‌به‌روز قرار می‌دهی و فقط لینک آن را برای مشتری‌هایت می‌فرستی. هر زمان قیمت یا محصولی تغییر کند، همان لینک به‌روز می‌شود." },
    { q: "لیست خرید چه کاری انجام می‌دهد؟", a: "نیاز خریدت را ثبت می‌کنی و می‌توانی آن را برای تأمین‌کننده‌هایی که می‌شناسی بفرستی. اطلاعات نیاز خرید، نقطه شروع اتصال تو به تأمین‌کننده‌های مناسب است." },
    { q: "برای استفاده باید برنامه نصب کنم؟", a: "نه. کاتالوگ‌ها و صفحه‌های خرید از طریق لینک قابل مشاهده‌اند و برای مشتری یا تأمین‌کننده نیازی به نصب برنامه نیست." },
    { q: "آی‌مچ فقط یک ابزار ساخت کاتالوگ است؟", a: "نه. کاتالوگ و لیست خرید فقط نقطه شروع هستند. هدف آی‌مچ این است که نیاز خریدار هر کالا را با اطلاعات تأمین‌کنندگان مناسب همان کالا نزدیک کند." },
] as const;

const TESTIMONIALS = [
    {
        name: "رضا کریمی",
        role: "مدیر تولید · تولیدی لوازم پلاستیکی",
        tone: "sell" as const,
        quote: "کاتالوگ محصولاتم رو ساختم و لینکش رو فرستادم. جالب این بود که خریدارهایی که قبلاً نمی‌شناختم هم از طریق ای‌مچ سراغم اومدن.",
    },
    {
        name: "محمد نوری",
        role: "مدیر رستوران · رستوران آراد",
        tone: "buy" as const,
        quote: "لیست خرید هفتگی‌مون رو ساختم و لینکش رو برای تأمین‌کننده‌هایی که می‌شناختم فرستادم. بعدش چند تأمین‌کننده دیگه هم پیشنهاد دادن که قبلاً نمی‌شناختم.",
    },
    {
        name: "زهرا کریمی",
        role: "مدیر فروش · کارخانه لبنیات سپید",
        tone: "sell" as const,
        quote: "کاتالوگ محصولاتمون رو برای فروشگاه‌ها و پخش‌ها می‌فرستم. وقتی قیمت‌ها عوض می‌شه، لازم نیست دوباره لینک جدید بفرستم؛ همون لینک همیشه به‌روزه.",
    },
] as const;

const SHOTS = [
    { src: "/screenshots/01-sell-catalog.png", cap: "کاتالوگ من", arm: "sell" },
    { src: "/screenshots/08-buy-list.png", cap: "لیست خرید", arm: "buy" },
    { src: "/screenshots/09-supply-board.png", cap: "تابلوی تأمین", arm: "buy" },
    { src: "/screenshots/05-sell-requests.png", cap: "درخواست‌های قیمت", arm: "sell" },
    { src: "/screenshots/11-suggestions.png", cap: "پیشنهادها", arm: "buy" },
    { src: "/screenshots/13-catalog-public.png", cap: "کاتالوگ عمومی", arm: "sell" },
] as const;

const FEATURES = [
    { icon: Sparkles, title: "موتور تطبیق iMatch", desc: "نیازت را با کالاها و فروشنده‌ها جور می‌کند" },
    { icon: LayoutGrid, title: "تابلوی تأمین", desc: "قیمت چند تأمین‌کننده را کنار هم ببین" },
    { icon: Bell, title: "اعلان تغییر قیمت", desc: "کالای دنبال‌شده‌ات ارزان شد؟ خبرت می‌کنیم" },
    { icon: Inbox, title: "درخواست قیمت", desc: "یک سؤال بپرس، چند جواب بگیر" },
    { icon: Barcode, title: "اسکن بارکد", desc: "کالا را اسکن کن، سریع ثبت کن" },
    { icon: Share2, title: "کاتالوگ عمومی", desc: "لینک و QR — مشتری بدون اپ هم می‌بیند" },
] as const;

export default function LandingPage() {
    const router = useRouter();
    const { status } = useAuthStore();
    const [openFaq, setOpenFaq] = useState(0);

    useEffect(() => {
        document.title = "iMach | دستیار خرید و فروش اصناف";
        if (status === "authed") router.replace(myArmHref());
    }, [status, router]);

    return (
        <div className="flex min-h-screen flex-col bg-[#faf9f7]">
            <AppHeader />
            <main className="grow">
                <div className="mx-auto max-w-2xl px-4 pb-8">
                    {/* ═══ هیرو (طرح ۱۵) ═══ */}
                    <section className="relative mt-4 overflow-hidden rounded-3xl bg-gradient-to-br from-[#ffedd5] via-[#fef3e7] to-[#fdf8f3] px-5 pb-7 pt-8 text-center">
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-white/70 px-3 py-1 text-[11px] font-bold text-primary-strong">
                            <Sparkles className="size-3.5" />
                            دستیار هوشمند اصناف ایران
                        </span>
                        <h1 className="mt-4 text-[26px] font-extrabold leading-[1.6] text-stone-800">
                            خرید و فروشِ کسب‌وکارت،
                            <br />
                            <em className="not-italic text-primary-strong">ساده و حرفه‌ای</em>
                        </h1>
                        <p className="mx-auto mt-3 max-w-md text-[12.5px] leading-[2] text-stone-500">
                            کاتالوگ کالاهایت را بساز، از خریداران درخواست قیمت بگیر و برای خریدهایت بهترین تأمین‌کننده را پیدا کن — همه در یک اپ.
                        </p>
                        <div className="mt-5 flex justify-center gap-2.5">
                            <Button className="h-11 px-7 text-[14.5px]" onClick={() => router.push("/start?mode=register")}>
                                ساخت حساب
                            </Button>
                            <Button variant="outline" className="h-11 px-7 text-[14.5px]" onClick={() => router.push("/login")}>
                                ورود
                            </Button>
                        </div>
                        <p className="mt-4 flex items-center justify-center gap-1.5 text-[10.5px] text-stone-500">
                            <Check className="size-3.5 text-emerald-600" />
                            ثبت‌نام فقط با شماره موبایل · کمتر از ۲ دقیقه
                        </p>
                    </section>

                    {/* ═══ کروسل: از داخل ای‌مچ (اسکرین‌شات واقعی) ═══ */}
                    <section className="mt-8">
                        <SectionHead icon={<Sparkles className="size-4 text-primary" />} title="از داخل ای‌مچ" desc="صفحات واقعی اپ — با انگشت بکشید" />
                        <div className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                            {SHOTS.map((s) => (
                                <figure key={s.src} className="w-[172px] shrink-0 snap-start overflow-hidden rounded-2xl border bg-white shadow-sm">
                                    <div className="relative h-[240px] w-full overflow-hidden bg-white">
                                        <Image
                                            src={s.src}
                                            alt={s.cap}
                                            fill
                                            sizes="172px"
                                            className="object-cover object-top"
                                        />
                                    </div>
                                    <figcaption className="flex items-center justify-between gap-1 px-3 py-2">
                                        <span className="text-[11.5px] font-bold">{s.cap}</span>
                                        <span className={`rounded-md px-2 py-0.5 text-[9px] text-white ${s.arm === "sell" ? "bg-primary" : "bg-stone-700"}`}>
                                            {s.arm === "sell" ? "فروش" : "خرید"}
                                        </span>
                                    </figcaption>
                                </figure>
                            ))}
                        </div>
                        <p className="mt-1 flex items-center gap-1.5 px-1 text-[10.5px] text-muted-foreground">
                            <ChevronLeft className="size-3.5" />
                            تصاویر واقعی از دموی زنده‌ی ای‌مچ
                        </p>
                    </section>

                    {/* ═══ یک اپ، دو دستیار ═══ */}
                    <section className="mt-8">
                        <SectionHead icon={<Sparkles className="size-4 text-primary" />} title="یک اپ، دو دستیار" desc="هر طرفِ کسب‌وکار، دستیارِ خودش را دارد — همیشه یک‌دست و بدون شلوغی." />
                        <div className="grid gap-2.5">
                            <div className="overflow-hidden rounded-2xl border bg-white shadow-sm">
                                <div className="flex items-center gap-2.5 bg-gradient-to-l from-[#f97316] to-[#ea580c] p-3.5 text-white">
                                    <span className="grid size-[38px] place-items-center rounded-[11px] bg-white/20">
                                        <Store className="size-5" strokeWidth={1.75} />
                                    </span>
                                    <div>
                                        <p className="text-[15px] font-bold">دستیار فروش</p>
                                        <p className="mt-0.5 text-[10.5px] opacity-85">فروشندگان، پخش‌ها و تولیدکننده‌ها</p>
                                    </div>
                                </div>
                                <ul className="grid gap-0 p-3.5">
                                    <ArmBullet icon={<Check className="size-4 text-primary" />} text="کاتالوگ عکس‌دار در چند دقیقه بساز" />
                                    <ArmBullet icon={<Inbox className="size-4 text-primary" />} text="درخواست‌های قیمت خریداران، یک‌جا" />
                                    <ArmBullet icon={<Users className="size-4 text-primary" />} text="مشتری پیدا کن، حتی بدون تماس" />
                                </ul>
                            </div>
                            <div className="overflow-hidden rounded-2xl border bg-white shadow-sm">
                                <div className="flex items-center gap-2.5 bg-gradient-to-l from-[#44403c] to-[#292524] p-3.5 text-white">
                                    <span className="grid size-[38px] place-items-center rounded-[11px] bg-white/20">
                                        <ShoppingBasket className="size-5" strokeWidth={1.75} />
                                    </span>
                                    <div>
                                        <p className="text-[15px] font-bold">دستیار خرید</p>
                                        <p className="mt-0.5 text-[10.5px] opacity-85">رستوران‌ها، تالارها و خریداران عمده</p>
                                    </div>
                                </div>
                                <ul className="grid gap-0 p-3.5">
                                    <ArmBullet icon={<Check className="size-4 text-stone-500" />} text="لیست خرید همیشه به‌روز" />
                                    <ArmBullet icon={<LayoutGrid className="size-4 text-stone-500" />} text="تابلوی تأمین: قیمت‌ها کنارِ هم" />
                                    <ArmBullet icon={<Sparkles className="size-4 text-stone-500" />} text="iMatch: جورچینِ نیاز و کالا" />
                                </ul>
                            </div>
                        </div>
                    </section>

                    {/* ═══ امکانات کلیدی ═══ */}
                    <section className="mt-8">
                        <SectionHead icon={<Check className="size-4 text-primary" />} title="ابزارهایی که کار را جلو می‌برند" />
                        <div className="grid grid-cols-2 gap-2.5">
                            {FEATURES.map((f) => (
                                <div key={f.title} className="rounded-xl border bg-white p-3 shadow-sm">
                                    <span className="grid size-[34px] place-items-center rounded-[10px] bg-accent text-primary-strong">
                                        <f.icon className="size-[17px]" strokeWidth={1.75} />
                                    </span>
                                    <p className="mt-2 text-[12.5px] font-bold">{f.title}</p>
                                    <p className="mt-1 text-[10.5px] leading-[1.9] text-muted-foreground">{f.desc}</p>
                                </div>
                            ))}
                        </div>
                    </section>

                    {/* ═══ چطور کار می‌کند؟ ═══ */}
                    <section className="mt-8">
                        <SectionHead icon={<ChevronLeft className="size-4 text-primary" />} title="چطور کار می‌کند؟" />
                        <div className="grid gap-2.5">
                            {STEPS.map((s) => (
                                <div key={s.number} className="flex items-start gap-3 rounded-xl border bg-white p-3.5 shadow-sm">
                                    <span className="grid size-[30px] shrink-0 place-items-center rounded-full bg-accent text-[14px] font-bold text-primary-strong">
                                        {s.number}
                                    </span>
                                    <div>
                                        <p className="text-[13px] font-bold">{s.title}</p>
                                        <p className="mt-0.5 text-[11.5px] leading-[1.9] text-muted-foreground">{s.desc}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>

                    {/* ═══ نظرات کاربران ═══ */}
                    <section className="mt-8">
                        <SectionHead icon={<Users className="size-4 text-primary" />} title="از زبان خودشان" />
                        <div className="grid gap-2.5">
                            {TESTIMONIALS.map((t) => (
                                <div
                                    key={t.name}
                                    className={`relative rounded-2xl border bg-white p-3.5 shadow-sm ${
                                        t.tone === "sell" ? "border-r-[3px] border-r-primary" : "border-r-[3px] border-r-stone-700"
                                    }`}
                                >
                                    <span aria-hidden className="absolute left-3.5 top-2.5 text-[34px] font-bold leading-none text-accent">”</span>
                                    <div className="flex items-center gap-2.5">
                                        <span
                                            className={`grid size-9 place-items-center rounded-full text-[13px] font-bold text-white ${
                                                t.tone === "sell"
                                                    ? "bg-gradient-to-br from-[#c2703a] to-[#ea580c]"
                                                    : "bg-gradient-to-br from-[#57534e] to-[#292524]"
                                            }`}
                                        >
                                            {t.name.charAt(0)}
                                        </span>
                                        <div>
                                            <p className="text-[12.5px] font-bold">{t.name}</p>
                                            <p className="mt-0.5 text-[10.5px] text-muted-foreground">{t.role}</p>
                                        </div>
                                    </div>
                                    <p className="mt-2 text-[12px] leading-[2] text-stone-600">{t.quote}</p>
                                </div>
                            ))}
                        </div>
                    </section>

                    {/* ═══ سوالات پرتکرار ═══ */}
                    <section className="mt-8">
                        <SectionHead icon={<ChevronLeft className="size-4 text-primary" />} title="سوالات پرتکرار" />
                        <div className="grid gap-2">
                            {FAQS.map((faq, i) => {
                                const open = openFaq === i;
                                return (
                                    <div key={faq.q} className="overflow-hidden rounded-xl border bg-white shadow-sm">
                                        <button
                                            type="button"
                                            onClick={() => setOpenFaq(open ? -1 : i)}
                                            aria-expanded={open}
                                            className="flex w-full items-center gap-2.5 px-3.5 py-3 text-start"
                                        >
                                            <span className="grow text-[13px] font-bold">{faq.q}</span>
                                            <ChevronDown
                                                className={`size-4 shrink-0 text-muted-foreground transition-transform ${open ? "-rotate-90 text-primary" : ""}`}
                                            />
                                        </button>
                                        {open && (
                                            <p className="px-3.5 pb-3 pe-8 text-[12px] leading-[2.1] text-muted-foreground">{faq.a}</p>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </section>

                    {/* ═══ CTA پایانی ═══ */}
                    <section className="mt-8">
                        <div className="rounded-2xl bg-gradient-to-l from-[#f97316] to-[#e0490a] px-4 py-6 text-center text-white shadow-[0_14px_34px_rgba(224,73,10,0.28)]">
                            <p className="text-[17px] font-bold">همین حالا شروع کن</p>
                            <p className="mt-1.5 text-[11.5px] leading-[1.9] opacity-90">
                                اولین کاتالوگ یا لیست خریدت، ۵ دقیقه بعد آماده است.
                            </p>
                            <Button
                                variant="secondary"
                                className="mt-3.5 h-[46px] w-full bg-white text-[15px] font-bold text-primary-strong hover:bg-white/90"
                                onClick={() => router.push("/start?mode=register")}
                            >
                                ساخت حساب
                            </Button>
                        </div>
                    </section>

                    {/* فوتر */}
                    <footer className="mt-8 flex flex-col items-center gap-3 py-6 text-center">
                        <Image src="/logo3.svg" alt="iMach" width={100} height={35} className="opacity-90" />
                        <div className="flex items-center gap-2 text-[12px] font-bold">
                            <Link href="/login" className="text-primary-strong">ورود</Link>
                            <span className="text-stone-400">·</span>
                            <Link href="/start?mode=register" className="text-stone-600">ساخت حساب</Link>
                        </div>
                        <p className="text-[10px] text-muted-foreground">© ۱۴۰۵ iMach — دستیار خرید و فروش اصناف</p>
                    </footer>
                </div>
            </main>

            {/* ═══ نوار چسبان CTA (موبایل — طرح ۱۵) ═══ */}
            <div className="sticky bottom-0 z-40 flex gap-2.5 border-t bg-white/95 px-4 py-3 backdrop-blur-md pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:hidden">
                <Button className="h-[46px] grow text-[14.5px]" onClick={() => router.push("/start?mode=register")}>
                    ساخت حساب
                </Button>
                <Button variant="outline" className="h-[46px] text-[14.5px]" style={{ flex: "0.6" }} onClick={() => router.push("/login")}>
                    ورود
                </Button>
            </div>
        </div>
    );
}

function SectionHead({ icon, title, desc }: { icon: React.ReactNode; title: string; desc?: string }) {
    return (
        <div className="mb-3">
            <h2 className="flex items-center gap-1.5 text-[15.5px] font-bold text-stone-800">
                {icon}
                {title}
            </h2>
            {desc && <p className="mt-1 text-[11px] text-muted-foreground">{desc}</p>}
        </div>
    );
}

function ArmBullet({ icon, text }: { icon: React.ReactNode; text: string }) {
    return (
        <li className="flex items-start gap-2 py-[7px] text-[12.5px] leading-[1.9] text-stone-600">
            <span className="mt-1 shrink-0">{icon}</span>
            {text}
        </li>
    );
}
