"use client";

import Link from "next/link";
import Image from "next/image";
import { useSyncExternalStore } from "react";
import { usePathname, useRouter } from "next/navigation";
import { fa } from "@/lib/format";
import { useAuthStore } from "@/lib/auth-store";
import { myArmHref, useArm, useArmStore, useActiveBusiness, type Arm } from "@/lib/active-biz";
import { useIncomingInquiries } from "@/lib/queries";
import { NotificationsBell } from "@/app/components/notifications";
import { Button } from "@/components/ui/button";
import { LogIn, type LucideIcon } from "lucide-react";
import { BUILD_ID } from "@/lib/build-info";
import {
  Building2,
  CircleUserRound,
  Inbox,
  List,
  Sparkles,
  Store,
  ShoppingBasket,
} from "lucide-react";

/**
 * Build stamp — فقط در client render می‌شود تا hydration mismatch نباشد
 * (server و client هش متفاوتی از NEXT_PUBLIC_BUILD_ID می‌بینند چون
 * next.config در dev چند بار اجرا می‌شود). useSyncExternalStore با
 * snapshot متفاوتِ server/client، الگوی رسمی React برای این کار است.
 */
const noopSubscribe = () => () => {};
function BuildStamp() {
  const id = useSyncExternalStore(
    noopSubscribe,
    () => BUILD_ID,
    () => "",
  );
  if (!id) return null;
  return (
    <span
      aria-label={`build ${id}`}
      title={`build ${id}`}
      className="-mt-1 select-none font-mono text-[8px] leading-none text-muted-foreground/50"
    >
      b{id}
    </span>
  );
}

/*
 * شل بازطراحی (design-reference/screens/01 · د۱) — دو تغییر بنیادی:
 *
 * ۱) سوییچ دستیار = سگمنت‌بار همیشه‌نمایان، نه دراپ‌داون پنهان.
 *    موبایل: نوار دوم زیر هدر · دسکتاپ: داخل هدر کنار لوگو (screens/d1).
 *    کاربر کم‌سوادِ دیجیتال هر لحظه می‌بیند در کدام دستیار است.
 *
 * ۲) تب‌بار ۳/۴ آیتمی — هر دستیار پیمایش خودش:
 *    فروش: کاتالوگ من · درخواست‌های قیمت · پروفایل
 *    خرید: لیست خرید · تأمین‌کنندگان · پیشنهادها · پروفایل
 *    داشبوردها/مشتریان من/بازار/برندها/ادمین از ناوبری خارج شدند؛
 *    مسیرشان (فعلاً) از پروفایل قابل دسترسی است (پل‌های انتقال).
 *
 * زبان رنگ: فروش = نارنجی برند (primary)، خرید = سنگی تیره #292524 (stone-800).
 */

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  badge?: number;
}

// ─── آیتم‌های نویگیشن — ۳ تب فروش / ۴ تب خرید ───
export function useNavItems(arm: Arm): NavItem[] {
  const biz = useActiveBusiness();
  // فاز ۴ (طرح ۰۵) — نشانگر «درخواست‌های قیمت» = شمار درخواست‌های فعالِ به‌من
  const inquiriesQ = useIncomingInquiries(arm === "sell" ? biz?.id ?? null : null);
  const activeInquiries = (inquiriesQ.data?.items ?? []).filter((q) => q.status !== "ARCHIVED").length;
  if (arm === "sell") {
    return [
      { href: "/sell", label: "کاتالوگ من", icon: Store },
      { href: "/sell/requests", label: "درخواست‌های قیمت", icon: Inbox, badge: activeInquiries || undefined },
      { href: "/profile", label: "پروفایل", icon: CircleUserRound },
    ];
  }
  return [
    { href: "/buy", label: "لیست خرید", icon: List },
    { href: "/buy/suppliers", label: "تأمین‌کنندگان", icon: Building2 },
    { href: "/buy/suggestions", label: "پیشنهادها", icon: Sparkles },
    { href: "/profile", label: "پروفایل", icon: CircleUserRound },
  ];
}

/** رنگ بازوی فعال — نارنجی فروش / سنگی خرید */
export function armColor(arm: Arm): string {
  return arm === "sell" ? "text-primary" : "text-stone-800";
}

/** بازوی جاری از روی مسیر — صفحات هر بازو خودشان مسیرشان گویاست؛ بقیه از آخرین بازو */
function useCurrentArm(): Arm {
  const stored = useArm();
  const pathname = usePathname();
  if (pathname.startsWith("/buy")) return "buy";
  if (pathname.startsWith("/sell")) return "sell";
  return stored;
}

function isActivePath(href: string, pathname: string): boolean {
  const base = href.split("?")[0];
  if (base === "/sell")
    return (
      pathname === "/sell" ||
      (pathname.startsWith("/sell/") &&
        !pathname.startsWith("/sell/panel") &&
        !pathname.startsWith("/sell/customers") &&
        !pathname.startsWith("/sell/requests"))
    );
  if (base === "/buy")
    return (
      pathname === "/buy" ||
      (pathname.startsWith("/buy/") &&
        !pathname.startsWith("/buy/panel") &&
        !pathname.startsWith("/buy/suppliers") &&
        !pathname.startsWith("/buy/suggestions"))
    );
  return pathname === base || pathname.startsWith(`${base}/`);
}

// ─── سوییچ دستیار — سگمنت‌بار همیشه‌نمایان ───
function useArmSwitch() {
  const router = useRouter();
  const pathname = usePathname();
  const setArm = useArmStore((s) => s.setArm);
  return (target: Arm) => {
    setArm(target);
    if (pathname.startsWith("/" + target)) return;
    // صفحات مشترک (پروفایل/…) — فقط بازو عوض می‌شود؛ جا نمی‌رویم
    if (!pathname.startsWith("/sell") && !pathname.startsWith("/buy")) return;
    // جعبه‌ی دریافت ↔ جعبه‌ی دریافت؛ بقیه‌ی صفحات → خانه‌ی بازوی مقصد
    if (pathname.startsWith("/sell/requests") || pathname.startsWith("/buy/suggestions")) {
      router.push(target === "sell" ? "/sell/requests" : "/buy/suggestions");
    } else {
      router.push(target === "sell" ? "/sell" : "/buy");
    }
  };
}

// ─── سگمنت‌بار: دستیار فروش / دستیار خرید (قلب بازطراحی — د۱) ───
function ArmSwitch({
  arm,
  onSwitch,
  variant,
}: {
  arm: Arm;
  onSwitch: (a: Arm) => void;
  variant: "mobile" | "desktop";
}) {
  const wrapCls =
    variant === "desktop"
      ? "hidden w-[300px] shrink-0 grid-cols-2 gap-1 rounded-xl bg-[#f1efe9] p-1 sm:grid"
      : "grid grid-cols-2 gap-1 rounded-[14px] bg-[#f1efe9] p-[5px]";
  const btnH = variant === "desktop" ? "h-9 rounded-[9px]" : "h-[38px] rounded-[10px]";
  const iconCls = variant === "desktop" ? "size-4" : "size-[17px]";
  // نکته: کلاس‌های حالت فعال/غیرفعال باید «انحصاری» باشند — ترکیب
  // bg-transparent و bg-primary در یک className باعث برتریِ ترتیب CSS می‌شود.
  const stateCls = (on: boolean) =>
    on
      ? "bg-primary text-white shadow-[0_2px_8px_rgba(42,39,35,0.18)]"
      : "bg-transparent text-muted-foreground";
  const stateClsBuy = (on: boolean) =>
    on
      ? "bg-stone-800 text-white shadow-[0_2px_8px_rgba(42,39,35,0.18)]"
      : "bg-transparent text-muted-foreground";
  return (
    <div role="tablist" aria-label="تعویض دستیار" className={wrapCls}>
      <button
        role="tab"
        aria-selected={arm === "sell"}
        onClick={() => onSwitch("sell")}
        className={`flex ${btnH} items-center justify-center gap-1.5 border-0 text-[13.5px] font-bold transition-all ${stateCls(
          arm === "sell"
        )}`}
      >
        <Store className={iconCls} strokeWidth={1.75} />
        دستیار فروش
      </button>
      <button
        role="tab"
        aria-selected={arm === "buy"}
        onClick={() => onSwitch("buy")}
        className={`flex ${btnH} items-center justify-center gap-1.5 border-0 text-[13.5px] font-bold transition-all ${stateClsBuy(
          arm === "buy"
        )}`}
      >
        <ShoppingBasket className={iconCls} strokeWidth={1.75} />
        دستیار خرید
      </button>
    </div>
  );
}

// ─── آواتار کاربر — گرهی به پروفایل ───
function HeaderAvatar({ name }: { name?: string | null }) {
  const initial = (name ?? "؟").trim().charAt(0) || "؟";
  return (
    <Link
      href="/profile"
      aria-label="پروفایل من"
      className="grid size-9 shrink-0 cursor-pointer place-items-center rounded-full text-sm font-bold text-white transition hover:opacity-90"
      style={{ background: "linear-gradient(135deg,#ea580c,#f97316)" }}
    >
      {initial}
    </Link>
  );
}

/** نشان شمارش کوچک روی تب/لینک — قالب طراحی `.badge` */
function CountBadge({ count }: { count: number }) {
  return (
    <span className="absolute left-[calc(50%-22px)] top-[3px] grid h-4 min-w-[16px] place-items-center rounded-[9px] bg-primary px-1 text-[9.5px] font-bold leading-none text-white">
      {count > 9 ? "۹+" : fa(count)}
    </span>
  );
}

// ─── هدر بالا: لوگو + سوییچ (دسکتاپ) + ناوبری + زنگ + آواتار ───
export function AppHeader() {
  const router = useRouter();
  const pathname = usePathname();
  const { status, user } = useAuthStore();
  const arm = useCurrentArm();
  const items = useNavItems(arm);
  const switchArm = useArmSwitch();

  const goHome = () => {
    router.push(status === "authed" ? myArmHref() : "/");
  };

  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md">
      <div className="border-b">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-3 px-4">
          {/* لوگو + سوییچ دسکتاپ */}
          <div className="flex min-w-0 items-center gap-5">
            <button
              onClick={goHome}
              className="grid shrink-0 place-items-center rounded-xl transition hover:bg-accent"
              aria-label="iMach"
            >
              <Image
                src="/logo3.svg"
                alt="iMach"
                width={100}
                height={35}
                priority
                className="pb-1"
              />
              {/* مُهر بیلد — هش گیتِ بیلدِ در حال اجرا؛ برای تشخیص فوری «بیلد کهنه»
                  (کلاس باگی که کاربر خودش یک بار تجربه کرد: بیلد نشده بود).
                  فقط در client render می‌شود تا hydration mismatch نباشد. */}
              <BuildStamp />
            </button>

            {status === "authed" && <ArmSwitch arm={arm} onSwitch={switchArm} variant="desktop" />}
          </div>

          {status === "authed" ? (
            <div className="flex items-center gap-2">
              {/* زنگ اعلان‌ها */}
              <NotificationsBell />
              {/* ناوبری دسکتاپ — همان تب‌ها، افقی */}
              <nav className="hidden items-center gap-1 lg:flex" aria-label="نویگیشن اصلی">
                {items.map((it) => {
                  const on = isActivePath(it.href, pathname ?? "");
                  return (
                    <Link
                      key={it.label}
                      href={it.href}
                      aria-current={on ? "page" : undefined}
                      className={`relative flex flex-col items-center gap-1 rounded-xl px-4 py-1.5 text-[11px] transition ${
                        on ? `${armColor(arm)} font-bold` : "font-normal text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <span className="relative">
                        <it.icon className="size-5" strokeWidth={on ? 2 : 1.75} />
                        {it.badge ? (
                          <span className="absolute -top-1 -left-2 grid h-3.5 min-w-[14px] place-items-center rounded-full bg-primary px-0.5 text-[9px] font-bold leading-none text-white">
                            {it.badge > 9 ? "۹+" : fa(it.badge)}
                          </span>
                        ) : null}
                      </span>
                      {it.label}
                    </Link>
                  );
                })}
              </nav>
              <HeaderAvatar name={user?.name} />
              <span className="sr-only">{user?.name}</span>
            </div>
          ) : pathname?.startsWith("/start") ? null : (
            // مهمان در صفحه‌ی شروع — دکمه‌ی ورود/ثبت‌نام معنا ندارد (خواسته‌ی کاربر)
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={() => router.push("/start")}>
                ورود
              </Button>
              <Button size="sm" onClick={() => router.push("/start?mode=register")}>
                <LogIn className="size-4" />
                ثبت‌نام
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* سوییچ موبایل — نوار دومِ همیشه‌نمایان زیر هدر (د۱) */}
      {status === "authed" && (
        <div className="px-4 pt-2.5 sm:hidden">
          <ArmSwitch arm={arm} onSwitch={switchArm} variant="mobile" />
        </div>
      )}
    </header>
  );
}

// ─── فوتر چسبان موبایل — تب‌بار ۳/۴ ستونی ───
export function MobileTabBar() {
  const { status } = useAuthStore();
  const pathname = usePathname();
  const arm = useCurrentArm();
  const items = useNavItems(arm);

  // مهمان/بوت: هیچ — ورود و ثبت‌نام فقط در هدر است؛ دوباره‌کاری پایین صفحه
  // کاربر را گیج می‌کرد (خواسته‌ی کاربر: عین دسکتاپ)
  if (status !== "authed") return null;

  return (
    <nav
      aria-label="ناوبری موبایل"
      className="fixed inset-x-0 bottom-0 z-40 border-t bg-white/95 backdrop-blur-md sm:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className={`grid ${items.length === 3 ? "grid-cols-3" : "grid-cols-4"}`}>
        {items.map((it) => {
          const on = isActivePath(it.href, pathname ?? "");
          return (
            <Link
              key={it.label}
              href={it.href}
              className={`relative flex flex-col items-center gap-[3px] px-0.5 pb-1 pt-2 text-[10px] transition ${
                on ? `${armColor(arm)} font-bold` : "font-normal text-muted-foreground"
              }`}
              aria-current={on ? "page" : undefined}
            >
              <span className="relative">
                <it.icon className="size-[22px]" strokeWidth={on ? 2.2 : 1.75} />
                {it.badge ? <CountBadge count={it.badge} /> : null}
              </span>
              {it.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

// ─── فوتر ───
export function AppFooter() {
  return null;
}

// ─── حلقه امتیاز تطبیق ───
export function MatchRing({ score, size = 44 }: { score: number; size?: number }) {
  const color = score >= 85 ? "#e0490a" : score >= 70 ? "#f97316" : "#a8a29e";
  return (
    <div
      className="relative grid shrink-0 place-items-center rounded-full"
      style={{
        width: size,
        height: size,
        background: `conic-gradient(${color} ${score}%, #e8e7e5 ${score}%)`,
      }}
      role="img"
      aria-label={`امتیاز تطبیق ${fa(score)} درصد`}
    >
      <span
        className="grid place-items-center rounded-full bg-white"
        style={{ width: size - 8, height: size - 8 }}
      >
        <span className="text-xs font-bold" style={{ color }}>
          {fa(score)}٪
        </span>
      </span>
    </div>
  );
}

// ─── عنوان بخش (قالب طراحی `.sec-title`) ───
export function SectionTitle({
  icon,
  title,
  hint,
  action,
}: {
  icon?: React.ReactNode;
  title: string;
  hint?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-3 flex items-end justify-between gap-2">
      <div>
        <h2 className="flex items-center gap-1.5 text-[15px] font-bold">
          {icon}
          {title}
        </h2>
        {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
      </div>
      {action}
    </div>
  );
}
