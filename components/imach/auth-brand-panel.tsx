"use client";

import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import { useMessages } from "@/i18n/messages/use-messages";

/**
 * Logo2 — واژه‌نشان کامل آیمچ (public/logo2.svg — «iMach» با M گرافیکی،
 * ۱۱۲×۴۴). حکم مالک (فیکس دستهٔ لوگو): هر جا لوگو لازم است همین
 * واژه‌نشان به‌کار می‌رود — نه نشان کوچک + واژهٔ جدا.
 */
export function Logo2({ height = 36, className }: { height?: number; className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- SVG ایستا عمومی؛ رندر عین فایل (گرادیان+انیمیشن نقطه)
    <img
      src="/logo2.svg"
      alt="iMach"
      width={Math.round((height * 112) / 44)}
      height={height}
      className={className}
      draggable={false}
    />
  );
}

/**
 * LogoMark — نشان آیمچ (سمبل i-logo پروتوتایپ؛ viewBox 32×33).
 * جدا از <Icon> چون viewBox غیر-۲۴ دارد؛ فقط واترمارک/موارد خاص.
 */
export function LogoMark({ size = 38, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={Math.round((size * 33) / 32)}
      viewBox="0 0 32 33"
      fill="none"
      className={className}
      aria-hidden
    >
      <path
        d="M5 30 V19 L16 23 L27 11 V28"
        stroke="currentColor"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="6" cy="6" r="5.5" fill="currentColor" />
    </svg>
  );
}

/**
 * AuthBrandPanel — پانل برند تمام‌قدِ چپِ صفحات ورود/ثبت‌نام دسکتاپ
 * (پورت dk-brand پروتوتایپ FD-28/29 روی Tailwind).
 *
 * · گرادیان عمیق نارنجی + هالهٔ radial + واترمارک لوگو
 * · دکمهٔ بازگشت به صفحهٔ اصلی در گوشهٔ بالا
 * · سه گلولهٔ متن (مجموعهٔ ورود / ثبت‌نام — متن‌ها عین حکم مالک)
 * · فقط ≥lg رندر می‌شود؛ موبایل هویت را از سرصفحهٔ خود صفحه می‌گیرد
 */
export function AuthBrandPanel({ kind }: { kind: "login" | "signup" }) {
  const m = useMessages();
  const b = m.auth.brand;
  const bullets = kind === "signup" ? b.signupBullets : b.loginBullets;

  return (
    <aside
      className={cnBrand}
      style={{
        background:
          "radial-gradient(70% 55% at 85% 12%, rgba(255,255,255,.14), transparent 60%), linear-gradient(168deg, #F97316 0%, #EA580C 46%, #C2410C 100%)",
      }}
    >
      {/* بازگشت به صفحهٔ اصلی — گوشهٔ بالا (فلش استاندارد ←؛ در RTL آینه‌ای به سمت آغاز) */}
      <Link
        href="/"
        className="absolute top-[26px] start-[28px] inline-flex h-[38px] items-center gap-2 rounded-xl border border-white/35 bg-white/12 px-4 text-[12.5px] font-semibold text-white backdrop-blur-sm transition-colors hover:border-white/55 hover:bg-white/20"
      >
        <Icon name="back" size={15} className="rtl:-scale-x-100" />
        <span>{b.backHome}</span>
      </Link>

      {/* واژه‌نشان کامل آیمچ روی کاشی سفید (حکم مالک: logo2 در ورود/ثبت‌نام) */}
      <div className="mb-[22px] grid h-[66px] w-[148px] place-items-center rounded-[19px] bg-white/95 shadow-[0_10px_30px_rgba(0,0,0,.18)]">
        <Logo2 height={34} />
      </div>
      <div className="my-[6px] mb-[30px] text-[13.5px] leading-[2.2] text-white/85">{b.tag}</div>

      <ul className="flex flex-col">
        {bullets.map((text) => (
          <li
            key={text}
            className="flex items-center gap-3 border-t border-white/15 py-[13px] text-[13px] font-semibold leading-[1.9] text-white first:border-t-0"
          >
            <span className="grid size-[26px] shrink-0 place-items-center rounded-full bg-white/20">
              <Icon name="check" size={13} className="text-white" />
            </span>
            <span>{text}</span>
          </li>
        ))}
      </ul>

      {/* واترمارک واژه‌نشان — گوشهٔ پایین، فیزیکی مثل پروتوتایپ (سمت start) */}
      <div
        aria-hidden
        className="pointer-events-none absolute bottom-[-56px] start-[-46px] opacity-[.07]"
      >
        <Logo2 height={160} className="select-none" />
      </div>
    </aside>
  );
}

const cnBrand =
  "relative hidden w-[min(44%,560px)] shrink-0 flex-col justify-center overflow-hidden px-16 py-16 lg:flex";
