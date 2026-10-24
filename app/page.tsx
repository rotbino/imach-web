import type { Metadata } from "next";
import Link from "next/link";
import { cookies, headers } from "next/headers";
import { getServerMessages } from "@/i18n/messages/server";
import {
  DEFAULT_LOCALE,
  detectLocaleFromAcceptLanguage,
  getLocale,
} from "@/i18n/config";
import { Icon } from "@/components/ui/icon";
import { LogoMark } from "@/components/imach/auth-brand-panel";
import { LandingSessionChip, LandingHeroCtas, LandingFinalCta, LandingRepCta } from "@/components/imach/session-cta";
import { LandingTestimonials } from "@/components/imach/testimonials";
import { LandingLangButtons } from "./lang-buttons";

/**
 * `/` — اسکرین ۰۱: لندینگ (M1 · 01-landing پروتوتایپ نهایی).
 *
 * · هیرو دوستونهٔ دسکتاپ (FD-28/29) + دکمه‌های زبانِ نمایشی داخل بنر (D2/FD-34)
 * · دو کارت ویژگی (فروشنده/خریدار) + نوار نمایندهٔ فروش + نظرات خریداران (M10)
 *   + CTA پایانی
 * · عکس هیرو فلت با mix-blend-multiply — موبایل روی کِرِم، دسکتاپ داخل گرادیان هیرو
 * · متادیتای سه‌زبانه از الگوی موجود (کوکی زبان → سه زبان؛ ربات بدون کوکی → فارسی)
 */

const HERO_IMG = "/hero-landing.png"; // نسخهٔ flat پروتوتایپ (سفیدی‌ها کلیپ شده‌اند)

/** ارقام شمارهٔ گام‌ها به زبان صفحه */
const STEP_DIGITS: Record<string, string[]> = {
  fa: ["۱", "۲", "۳"],
  ar: ["١", "٢", "٣"],
  en: ["1", "2", "3"],
};

export async function generateMetadata(): Promise<Metadata> {
  const cookieStore = await cookies();
  const headerStore = await headers();
  const locale = getLocale(
    cookieStore.get("imach_locale")?.value ??
      detectLocaleFromAcceptLanguage(headerStore.get("accept-language")) ??
      DEFAULT_LOCALE
  );
  if (locale === "en") {
    return {
      title: "iMach — connecting suppliers of every product to its wholesale buyers",
      description:
        "Build your product catalog or purchase list, share it with customers and suppliers, and let iMach's matching engine grow your trade network. Sign-up with just a mobile number.",
      alternates: { canonical: "/" },
      openGraph: {
        title: "iMach — wholesale trade, always fresh prices",
        description:
          "Build your catalog or purchase list and share it — iMach's matching engine grows your trade network.",
        locale: "en_US",
        type: "website",
        images: [{ url: "/og.png", width: 1200, height: 630 }],
      },
    };
  }
  if (locale === "ar") {
    return {
      title: "آي‌ماتش — يصل مورّدي السلع إلى مشتريي الجملة",
      description:
        "أنشئ كتالوغ منتجاتك أو قائمة مشترياتك وشاركها مع عملائك ومورّديك؛ ودع محرك المطابقة في آي‌ماتش ينمّي شبكتك التجارية. التسجيل برقم الجوّال فقط.",
      alternates: { canonical: "/" },
      openGraph: {
        title: "آي‌ماتش — تجارة الجملة بأسعار دائمًا محدّثة",
        description: "أنشئ كتالوغك أو قائمة مشترياتك وشاركها — محرك المطابقة ينمّي شبكتك التجارية.",
        locale: "ar_AR",
        type: "website",
        images: [{ url: "/og.png", width: 1200, height: 630 }],
      },
    };
  }
  return {
    title: "آیمچ — تأمین‌کنندگان هر کالا را به خریداران عمدهٔ آن وصل می‌کند",
    description:
      "کاتالوگ محصولات یا فهرست خریدتان را بسازید و با مشتریان و تأمین‌کنندگان خود به اشتراک بگذارید؛ آیمچ با موتور تطبیق خود شبکهٔ تجاری شما را بزرگ‌تر می‌کند. ثبت‌نام با شمارهٔ موبایل.",
    alternates: { canonical: "/" },
    openGraph: {
      title: "آیمچ — بازار عمدهٔ واقعی",
      description:
        "کاتالوک یا فهرست خریدتان را بسازید و به اشتراک بگذارید — موتور تطبیق آیمچ شبکهٔ تجاری شما را بزرگ‌تر می‌کند.",
      locale: "fa_IR",
      type: "website",
      images: [{ url: "/og.png", width: 1200, height: 630 }],
    },
  };
}

export default async function LandingPage() {
  const { locale, messages: m } = await getServerMessages();
  const L = m.landing;
  const digits = STEP_DIGITS[locale] ?? STEP_DIGITS.en;

  return (
    <div data-arm="keep" className="min-h-dvh bg-bg">
      {/* ═══ اپ‌بار: موبایل ۵۶ / دسکتاپ ۶۸ با کانتینر ۱۲۸۰ ═══ */}
      <header className="sticky top-0 z-[5] border-b border-line bg-white/95 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-[1280px] items-center justify-between px-4 lg:h-[68px] lg:px-6">
          <Link
            href="/login"
            aria-label="iMach"
            className="flex min-w-0 items-center gap-2.5 rounded-[10px] transition-transform active:scale-[.97] active:bg-surface-2"
          >
            <span className="grid size-[34px] shrink-0 place-items-center rounded-[9px] bg-gradient-to-br from-primary to-primary-strong text-white">
              <LogoMark size={21} />
            </span>
            {/* FD-31: کنار لوگو «iMach» (لاتین) */}
            <span dir="ltr" className="text-[15px] font-bold tracking-[.3px] text-text lg:text-[18px] lg:font-extrabold">
              iMach
            </span>
          </Link>
          {/* M2 (حکم مالک): لاگین‌شده → «پنل من» با نام؛ مهمان → «ورود» */}
          <LandingSessionChip guestLabel={L.appbarLogin} panelLabel={L.myPanel} />
        </div>
      </header>

      {/* ═══ هیرو ═══ */}
      <section className="bg-[linear-gradient(180deg,#fdeedd_0%,#fcfbf8_100%)] px-5 py-8 text-center lg:bg-[radial-gradient(60%_90%_at_8%_10%,rgba(249,115,22,.07),transparent_60%),linear-gradient(120deg,#fdeedd_0%,#fcfbf8_62%)] lg:px-0 lg:py-0">
        <div className="mx-auto max-w-[1280px] lg:grid lg:grid-cols-[1.04fr_.96fr] lg:items-center lg:gap-x-16 lg:py-[88px] lg:px-14 lg:text-start">
          <div className="flex flex-col">
            {/* FD-34: دکمه‌های زبان جزئی از خود بنر — نه نوار جدا */}
            <LandingLangButtons />

            <h1 className="mt-0 text-[22px] font-bold leading-[1.6] text-text lg:mt-0 lg:text-[40px] lg:leading-[1.7] lg:tracking-[-.2px]">
              <em className="not-italic text-primary-strong">{L.h1Lead}</em>
              {L.h1Tail}
              <br />
              {L.h1Line2}
            </h1>
            <p className="mt-3 text-[13px] leading-[2] text-text-2 lg:mt-3 lg:text-[15.5px] lg:leading-[2.1]">
              {L.banner}
            </p>
            <p className="mt-1 font-bold text-accent-strong lg:text-[14.5px]">{L.strong}</p>

            {/* M2 (حکم مالک): لاگین‌شده فقط «ورود به پنل من» را می‌بیند */}
            <LandingHeroCtas
              signupLabel={L.ctaSignup}
              loginLabel={L.ctaLogin}
              enterLabel={L.enterPanel}
            />
          </div>

          {/* عکس هدر فلت (FD-31) — فقط دسکتاپ داخل هیرو */}
          {/* eslint-disable-next-line @next/next/no-img-element -- عکس تزئینی با blend؛ next/image برای multiply بی‌معناست */}
          <img
            src={HERO_IMG}
            alt={L.heroImgAlt}
            className="hidden w-full rounded-2xl mix-blend-multiply lg:block"
            draggable={false}
          />
        </div>
      </section>

      {/* ═══ بدنهٔ محتوا ═══ */}
      <div className="mx-auto flex max-w-[1280px] flex-col gap-3 bg-bg px-4 py-4 lg:grid lg:grid-cols-2 lg:gap-x-7 lg:gap-y-8 lg:px-14 lg:pb-0 lg:pt-[72px]">
        {/* عکس هدر — موبایل روی زمینهٔ کِرِم (FD-31: والد باید زمینهٔ رنگی داشته باشد تا multiply حل شود) */}
        {/* eslint-disable-next-line @next/next/no-img-element -- عکس تزئینی با blend */}
        <img
          src={HERO_IMG}
          alt={L.heroImgAlt}
          aria-hidden
          className="block w-full rounded-[14px] mix-blend-multiply lg:hidden"
          draggable={false}
        />

        {/* ── کارت ویژگی: فروشندگان ── */}
        <FeatureCard
          icon="store"
          title={L.sellTitle}
          items={L.sellItems}
          digits={digits}
          tone="sell"
        />

        {/* ── کارت ویژگی: خریداران ── */}
        <FeatureCard
          icon="basket"
          title={L.buyTitle}
          items={L.buyItems}
          digits={digits}
          tone="buy"
        />

        {/* ── نوار نمایندهٔ فروش (تمام‌عرض) ── */}
        <section className="flex flex-col rounded-[24px] border border-line bg-surface px-6 py-8 shadow-[0_1px_3px_rgba(31,29,26,.04)] transition-[border-color,box-shadow] hover:border-line-2 hover:shadow-[0_10px_30px_rgba(31,29,26,.07)] max-lg:gap-3 lg:col-span-2 lg:px-12 lg:py-11">
          <SectionHead icon="briefcase" title={L.repTitle} tone="rep" center />
          <div className="mx-auto mb-[26px] max-w-[620px] text-center">
            <h3 className="mb-2 text-[16px] font-extrabold text-text lg:text-[18px]">
              {L.repLeadTitle}
            </h3>
            <p className="m-0 text-[12.5px] leading-[2] text-text-2 lg:text-[13.5px] lg:leading-[2.2]">
              {L.repLeadText}
            </p>
          </div>

          {/* سه گام — موبایل: ردیف کارتی / دسکتاپ: ستون‌های خط‌مویی (پرهیز از کارت تودرتو) */}
          <div className="flex flex-col gap-2 lg:grid lg:grid-cols-3 lg:gap-x-[30px]">
            {L.repItems.map((it, i) => (
              <div
                key={it.t}
                className={
                  i > 0
                    ? "flex items-center gap-3 rounded-xl border border-line bg-surface p-3 lg:border-0 lg:bg-none lg:p-0 lg:ps-[30px] lg:[border-inline-start:1px_dashed_var(--color-line)]"
                    : "flex items-center gap-3 rounded-xl border border-line bg-surface p-3 lg:border-0 lg:bg-none lg:p-0"
                }
              >
                <span
                  className={repAvatarCls}
                  aria-hidden
                >
                  {digits[i]}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[13.5px] font-bold leading-[1.6] text-text lg:text-[14px]">
                    {it.t}
                  </p>
                  <p className="mt-[3px] text-[11.5px] leading-[1.8] text-text-3 lg:text-[12px] lg:leading-[2]">
                    {it.s}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-3 text-center text-[14px] font-extrabold text-primary-strong lg:mt-[30px] lg:text-[17px]">
            {L.repTag}
          </div>
          <LandingRepCta signupLabel={L.repCta} enterLabel="دیدن داشبورد نمایندهٔ فروش" />
        </section>

        {/* ── M10 (N4): نوار «نظر خریداران» — Testimonial‌های تأییدشده ── */}
        <LandingTestimonials />

        {/* ── CTA پایانی: پانل گرادیانی + واترمارک ── */}
        <div className="relative overflow-hidden rounded-[16px] bg-gradient-to-br from-primary to-primary-strong px-4 py-5 text-center text-white lg:col-span-2 lg:mx-auto lg:mt-6 lg:max-w-[960px] lg:rounded-[28px] lg:px-14 lg:py-[46px]">
          <div
            aria-hidden
            className="pointer-events-none absolute -bottom-[34px] end-[18px] select-none text-[84px] font-extrabold leading-none tracking-[-2px] text-white opacity-[.06] lg:text-[130px]"
          >
            {L.h1Lead}
          </div>
          <div className="text-[16px] font-bold lg:text-[23px] lg:font-extrabold">{L.finalTitle}</div>
          <div className="mt-2 text-[12px] leading-[1.9] opacity-90 lg:text-[13.5px] lg:leading-[2.1]">
            {L.finalSub}
          </div>
          {/* M2 — لاگین‌شده → «ورود به پنل من» به‌جای «ساخت حساب» */}
          <LandingFinalCta signupLabel={L.finalCta} enterLabel={L.enterPanel} />
          <div className="mt-[10px] text-[11px] opacity-85 lg:mt-[14px] lg:text-[11.5px]">
            {L.finalNote}
          </div>
        </div>

        {/* ── فوتر ── */}
        <footer className="max-lg:col-span-2 max-lg:pb-1 max-lg:pt-2 max-lg:text-center lg:col-span-2 lg:mt-14 lg:flex lg:items-center lg:justify-between lg:border-t lg:border-line lg:pt-[26px]">
          <span className="text-[10.5px] leading-[1.9] text-text-3 lg:text-[11.5px]">
            {L.copyright}
          </span>
          <span
            aria-hidden
            className="hidden text-[13.5px] font-extrabold text-text lg:block"
          >
            {L.h1Lead}
          </span>
        </footer>
      </div>
    </div>
  );
}

/* ═══════════ اجزای داخلی ═══════════ */

type Tone = "sell" | "buy" | "rep";

const TONE_AVATAR: Record<Tone, { mobile: string; desktop: string }> = {
  sell: {
    mobile: "bg-primary text-white",
    desktop: "bg-primary-soft text-primary-strong",
  },
  buy: {
    mobile: "bg-stone text-white",
    desktop: "bg-stone-tint text-stone",
  },
  rep: {
    mobile: "bg-accent text-white",
    desktop: "bg-accent-soft text-accent-strong",
  },
};

const TONE_ICON: Record<Tone, string> = {
  sell: "bg-primary-soft text-primary-strong",
  buy: "bg-stone-tint text-stone",
  rep: "bg-accent-soft text-accent-strong",
};

const repAvatarCls =
  "grid size-[32px] shrink-0 place-items-center rounded-full bg-accent text-[12px] font-bold text-white lg:size-[34px] lg:rounded-[11px] lg:bg-accent-soft lg:text-[14px] lg:font-extrabold lg:text-accent-strong";

/** سربرگ بخش — موبایل: آیکونِ رنگِ صفحه؛ دسکتاپ: چیپ آیکونی رنگ‌کدِ persona */
function SectionHead({
  icon,
  title,
  tone,
  center,
}: {
  icon: Parameters<typeof Icon>[0]["name"];
  title: string;
  tone: Tone;
  center?: boolean;
}) {
  return (
    <div
      className={
        center
          ? "mb-1 flex items-center justify-center gap-2 lg:mb-[6px] lg:gap-3"
          : "mb-1 flex items-center gap-2 lg:mb-[6px] lg:gap-3"
      }
    >
      <h2 className="flex items-center gap-2 text-[15px] font-bold text-text lg:gap-3 lg:text-[17.5px] lg:font-extrabold">
        <span
          className={`grid place-items-center rounded-[12px] p-[9px] max-lg:p-0 max-lg:rounded-none ${TONE_ICON[tone]}`}
        >
          <Icon name={icon} size={18} className="lg:hidden" />
          <Icon name={icon} size={22} className="hidden lg:block" />
        </span>
        {title}
      </h2>
    </div>
  );
}

/** کارت ویژگی (فروشنده/خریدار) — موبایل: ردیف‌های کارتی / دسکتاپ: خط‌های آرام داخل کاغذ */
function FeatureCard({
  icon,
  title,
  items,
  digits,
  tone,
}: {
  icon: Parameters<typeof Icon>[0]["name"];
  title: string;
  items: { t: string; s: string }[];
  digits: string[];
  tone: Tone;
}) {
  const av = TONE_AVATAR[tone];
  return (
    <section className="flex flex-col rounded-[24px] border border-line bg-surface px-5 pb-[18px] pt-[18px] shadow-[0_1px_3px_rgba(31,29,26,.04)] transition-[border-color,box-shadow] hover:border-line-2 hover:shadow-[0_10px_30px_rgba(31,29,26,.07)] lg:px-8 lg:pt-[30px]">
      <SectionHead icon={icon} title={title} tone={tone} />
      <div className="flex flex-col gap-2 lg:gap-0">
        {items.map((it, i) => (
          <div
            key={it.t}
            className={
              i > 0
                ? "flex items-center gap-3 rounded-xl border border-line bg-surface p-3 lg:border-b-0 lg:border-t lg:border-dashed lg:border-line lg:bg-none lg:p-4 lg:gap-[14px] lg:py-4"
                : "flex items-center gap-3 rounded-xl border border-line bg-surface p-3 lg:border-0 lg:bg-none lg:p-4 lg:gap-[14px] lg:py-4"
            }
          >
            <span
              className={`grid size-[32px] shrink-0 place-items-center rounded-full text-[12px] font-bold ${av.mobile} lg:size-[30px] lg:rounded-[9px] lg:text-[12.5px] lg:font-extrabold ${av.desktop}`}
              aria-hidden
            >
              {digits[i]}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[13.5px] font-bold leading-[1.6] text-text lg:text-[14.5px]">
                {it.t}
              </p>
              <p className="mt-[3px] text-[11.5px] leading-[1.8] text-text-3 lg:mt-1 lg:text-[12.5px] lg:leading-[2]">
                {it.s}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
