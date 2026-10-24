"use client";

import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import { useAuthStore } from "@/lib/auth-store";
import { routeAfterAuth } from "@/lib/active-biz";
import { cn } from "@/lib/utils";

/**
 * M2 (حکم مالک) — لندینگِ نشست‌آگاه:
 * کاربرِ واردشده دیگر دکمه‌های «ساخت حساب / ورود» را نمی‌بیند؛ به‌جایش
 * در هدر چیپ «پنل من» با نامش را می‌بیند و با آن وارد میزش می‌شود.
 *   · هدر: guest → «ورود» · authed → «پنل من · نام»
 *   · هیرو: guest → دو CTA · authed → تک‌CTA «ورود به پنل من»
 * booting = مهمانِ ساکت (بدون پرش چیدمان).
 */

export function LandingSessionChip({ guestLabel, panelLabel }: { guestLabel: string; panelLabel: string }) {
  const status = useAuthStore((s) => s.status);
  const user = useAuthStore((s) => s.user);
  const businesses = useAuthStore((s) => s.businesses);

  if (status !== "authed") {
    return (
      <Link
        href="/login"
        className="inline-flex min-h-[34px] items-center rounded-[10px] px-3 text-[12px] font-bold text-text-2 transition-colors hover:bg-surface-2"
      >
        {guestLabel}
      </Link>
    );
  }

  const name = user ? `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() : "";
  const dest = routeAfterAuth(businesses);
  return (
    <Link
      href={dest}
      className="group inline-flex min-h-[34px] items-center gap-2 rounded-[10px] border border-line-2 bg-arm-soft px-3 text-[12px] font-bold text-arm-strong transition-colors hover:border-arm/40"
    >
      <span className="grid size-6 place-items-center rounded-full bg-arm text-[11px] font-black text-white">
        {(user?.firstName ?? user?.name ?? "؟").slice(0, 1)}
      </span>
      <span className="max-w-[140px] truncate">
        {name ? (
          <>
            {panelLabel}
            <span className="mx-1 font-extrabold text-arm-strong/70">·</span>
            <span className="text-text-2">{name}</span>
          </>
        ) : (
          panelLabel
        )}
      </span>
    </Link>
  );
}

export function LandingHeroCtas({
  signupLabel,
  loginLabel,
  enterLabel,
}: {
  signupLabel: string;
  loginLabel: string;
  enterLabel: string;
}) {
  const status = useAuthStore((s) => s.status);
  const businesses = useAuthStore((s) => s.businesses);
  const authed = status === "authed";
  const dest = routeAfterAuth(businesses);

  const base =
    "inline-flex min-h-[44px] items-center justify-center rounded-xl px-[18px] text-[13.5px] font-bold transition-[filter] hover:brightness-95 active:translate-y-px lg:min-h-[50px] lg:min-w-[176px] lg:text-[14.5px]";

  if (authed) {
    return (
      <div className="mt-5 flex justify-center gap-2 lg:mt-7 lg:justify-start">
        <Link href={dest} className={cn(base, "bg-primary text-white lg:min-w-[240px]")}>
          {enterLabel}
        </Link>
      </div>
    );
  }

  return (
    <div className="mt-5 flex justify-center gap-2 lg:mt-7 lg:justify-start">
      <Link href="/start" className={cn(base, "bg-primary text-white")}>
        {signupLabel}
      </Link>
      <Link
        href="/login"
        className={cn(
          base,
          "border border-line-2 bg-surface text-text hover:border-line-3"
        )}
      >
        {loginLabel}
      </Link>
    </div>
  );
}

/** CTA نوار نمایندهٔ فروش (M9 · FD-17) — ورود داشبورد نماینده:
 *  مهمان → ثبت‌نام (نیاز به حساب) · واردشده → مستقیم /rep (فضای سوم) */
export function LandingRepCta({ signupLabel, enterLabel }: { signupLabel: string; enterLabel: string }) {
  const status = useAuthStore((s) => s.status);
  const authed = status === "authed";
  return (
    <Link
      href={authed ? "/rep" : "/start"}
      data-rep-cta={authed ? "rep" : "start"}
      className="mt-3 inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-white text-[13.5px] font-bold text-accent-strong shadow-sm transition-[filter] hover:brightness-95 active:translate-y-px lg:mx-auto lg:mt-[14px] lg:max-w-[400px] lg:min-h-[50px] lg:text-[14.5px]"
    >
      {authed ? enterLabel : signupLabel}
      <Icon name="arrow-left" size={15} className="shrink-0 rtl:-scale-x-100" />
    </Link>
  );
}

/** CTA پایانی لندینگ — لاگین‌شده به‌جای «ساخت حساب» → «ورود به پنل من» */
export function LandingFinalCta({
  signupLabel,
  enterLabel,
}: {
  signupLabel: string;
  enterLabel: string;
}) {
  const status = useAuthStore((s) => s.status);
  const businesses = useAuthStore((s) => s.businesses);
  const authed = status === "authed";
  const dest = routeAfterAuth(businesses);
  return (
    <Link
      href={authed ? dest : "/start"}
      className="mt-[14px] inline-flex min-h-[44px] w-full items-center justify-center rounded-xl bg-white text-[13.5px] font-bold text-primary-strong transition-[filter] hover:brightness-95 active:translate-y-px lg:min-h-[52px] lg:min-w-[240px]"
    >
      {authed ? enterLabel : signupLabel}
    </Link>
  );
}
