"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { fa } from "@/lib/format";
import { useAuthStore } from "@/lib/auth-store";
import { myArmHref, useArm, useArmStore, type Arm } from "@/lib/active-biz";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LogIn, type LucideIcon } from "lucide-react";
import {
  Check,
  ChevronDown,
  CircleUserRound,
  Compass,
  Handshake,
  LayoutDashboard,
  ShoppingBasket,
  Store,
  Users,
} from "lucide-react";

/*
 * هدر پیج‌محور — دقیقا مثل اینستاگرام (خواسته‌ی کاربر):
 * • فقط لوگو (بدون متن iMach) هم‌تراز با عنوان صفحه‌ی جاری؛
 *   عنوان با دراپ‌داون سوییچ بین دو صفحه‌ی حساب: «کاتالوگ فروش من» ↔ «دستیار خرید»
 * • پنج آیتم نویگیشن در هر دو بازو یکسان‌اند، اما برچسب و مقصدشان
 *   متناسب با بازوی انتخاب‌شده عوض می‌شود — خریدارِ خرده‌فروش هیچ‌وقت
 *   «فروش» را کنار «خرید» نمی‌بیند.
 *   بازوی فروش: کاتالوگ · داشبورد · مشتریان من · خریدارها · پروفایل
 *   بازوی خرید: دستیار خرید · داشبورد · تامین من · فروشنده‌ها · پروفایل
 * • دکمه‌ی «+» حذف شد (خواسته‌ی کاربر) — افزودن کالا مستقیم از روی
 *   ویترین/میز خرید انجام می‌شود؛ جای آن شبکه‌ی دوطرفه نشسته است.
 * • لوگو → آخرین بازوی باز‌شده؛ مهمان فقط «ورود | ثبت‌نام» می‌بیند.
 */

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

// ─── عنوان صفحه‌ها در هدر ───
export function armTitle(arm: Arm): string {
  return arm === "sell" ? "کاتالوگ فروش من" : "دستیار خرید";
}

// ─── آیتم‌های نویگیشن — محتوای هر آیتم با بازو عوض می‌شود ───
export function useNavItems(arm: Arm): NavItem[] {
  const isSell = arm === "sell";
  return [
    isSell
      ? { href: "/sell", label: "کاتالوگ", icon: Store }
      : { href: "/buy", label: "میز خرید", icon: ShoppingBasket },
    isSell
      ? { href: "/sell/panel", label: "داشبورد", icon: LayoutDashboard }
      : { href: "/buy/panel", label: "داشبورد", icon: LayoutDashboard },
    // شبکه‌ی دوطرفه — جای دکمه‌ی «+» (خواسته‌ی کاربر)
    isSell
      ? { href: "/sell/customers", label: "مشتریان من", icon: Users }
      : { href: "/buy/suppliers", label: "تامین من", icon: Handshake },
    isSell
      ? { href: "/market", label: "بازار خرید", icon: Compass }
      : { href: "/market", label: "بازار فروش", icon: Compass },
    { href: "/profile", label: "پروفایل", icon: CircleUserRound },
  ];
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
    return pathname === "/sell" || (pathname.startsWith("/sell/") && !pathname.startsWith("/sell/panel") && !pathname.startsWith("/sell/customers"));
  if (base === "/buy")
    return pathname === "/buy" || (pathname.startsWith("/buy/") && !pathname.startsWith("/buy/panel") && !pathname.startsWith("/buy/suppliers"));
  return pathname === base || pathname.startsWith(`${base}/`);
}

// ─── سوییچ بازو — مثل سوییچ پیج اینستاگرام ───
function useArmSwitch() {
  const router = useRouter();
  const pathname = usePathname();
  const setArm = useArmStore((s) => s.setArm);
  return (target: Arm) => {
    if (pathname.startsWith("/buy") === (target === "buy")) return;
    setArm(target);
    // روی صفحات خودِ بازو، به صفحه‌ی متناظر بازوی دیگر می‌رویم؛
    // روی صفحات مشترک (بازار/پروفایل) فقط متن عوض می‌شود.
    if (pathname.startsWith("/sell/panel") || pathname.startsWith("/buy/panel")) {
      router.push(target === "sell" ? "/sell/panel" : "/buy/panel");
    } else if (pathname.startsWith("/sell/customers") || pathname.startsWith("/buy/suppliers")) {
      router.push(target === "sell" ? "/sell/customers" : "/buy/suppliers");
    } else if (pathname === "/sell" || pathname.startsWith("/sell/")) {
      router.push("/buy");
    } else if (pathname === "/buy" || pathname.startsWith("/buy/")) {
      router.push("/sell");
    }
  };
}

// ─── هدر بالا: لوگو + عنوان صفحه با سوییچر یک طرف، آیتم‌ها طرف دیگر ───
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
    <header className="sticky top-0 z-40 border-b bg-white/85 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
        {/* لوگو + سوییچر — یک ردیف، هم‌تراز افقی (خواسته‌ی کاربر: فقط لوگو، بدون متن) */}
        <div className="flex min-w-0 items-center">
          <button
            onClick={goHome}
            className="grid size-9 shrink-0 place-items-center rounded-xl transition hover:bg-accent"
            aria-label="iMach"
          >
            <Image src="/logo.svg" alt="iMach" width={26} height={27} className="size-6" priority />
          </button>

          {status === "authed" && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="flex min-w-0 items-center gap-1 rounded-xl px-2 py-1 transition hover:bg-accent"
                  aria-label="تعویض صفحه"
                >
                  <span className="truncate text-base font-extrabold">{armTitle(arm)}</span>
                  <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-52">
                <DropdownMenuItem onClick={() => switchArm("sell")} className="gap-2">
                  <Store className="size-4 text-primary" />
                  <span className="grow">کاتالوگ فروش من</span>
                  {arm === "sell" && <Check className="size-4 text-primary" />}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => switchArm("buy")} className="gap-2">
                  <ShoppingBasket className="size-4 text-stone-700" />
                  <span className="grow">دستیار خرید</span>
                  {arm === "buy" && <Check className="size-4 text-primary" />}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {status === "authed" ? (
          <nav className="hidden items-center gap-1 sm:flex" aria-label="نویگیشن اصلی">
            {items.map((it) => {
              const on = isActivePath(it.href, pathname ?? "");
              return (
                <Link
                  key={it.label}
                  href={it.href}
                  aria-current={on ? "page" : undefined}
                  className={`flex flex-col items-center gap-1 rounded-xl px-3 py-1.5 transition ${
                    on ? "text-primary" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <it.icon
                    className={`size-5 ${on ? "fill-primary/10" : ""}`}
                    strokeWidth={on ? 2 : 1.75}
                  />
                  <span className="text-[10px] font-normal leading-none">{it.label}</span>
                </Link>
              );
            })}
          </nav>
        ) : (
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => router.push("/start")}>
              ورود
            </Button>
            <Button size="sm" onClick={() => router.push("/start")}>
              <LogIn className="size-4" />
              ثبت‌نام
            </Button>
          </div>
        )}
        {status === "authed" && (
          <span className="sr-only">{user?.name}</span>
        )}
      </div>
    </header>
  );
}

// ─── فوتر چسبان موبایل — نویگیشن پیج‌محور ───
export function MobileTabBar() {
  const { status } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();
  const arm = useCurrentArm();
  const items = useNavItems(arm);

  return (
    <nav
      aria-label="نویگیشن موبایل"
      className="fixed inset-x-0 bottom-0 z-40 border-t bg-white/95 backdrop-blur-md sm:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      {status === "authed" ? (
        <div className="grid grid-cols-5">
          {items.map((it) => {
            const on = isActivePath(it.href, pathname ?? "");
            return (
              <Link
                key={it.label}
                href={it.href}
                className={`flex flex-col items-center gap-0.5 py-2 text-[10px] font-medium transition ${
                  on ? "text-primary" : "text-muted-foreground"
                }`}
                aria-current={on ? "page" : undefined}
              >
                <it.icon className={`size-5.5 ${on ? "fill-primary/10" : ""}`} strokeWidth={on ? 2.2 : 1.75} />
                {it.label}
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2 p-2">
          <Button variant="outline" onClick={() => router.push("/start")}>
            ورود
          </Button>
          <Button onClick={() => router.push("/start")}>ثبت‌نام</Button>
        </div>
      )}
    </nav>
  );
}

// ─── فوتر ───
export function AppFooter() {
  return null /*(
    <footer className="mb-[4.25rem] mt-auto border-t bg-white/60 pb-[env(safe-area-inset-bottom)] sm:mb-0">
      <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-2 px-4 py-4 text-xs text-muted-foreground sm:flex-row">
        <p>iMach — ارزان‌تر بخر، بیشتر بفروش</p>
        <p>کاتالوگ فروش و لیست خرید هوشمند — رایگان</p>
      </div>
    </footer>
  );*/
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

// ─── عنوان بخش ───
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
        <h2 className="flex items-center gap-2 text-base font-extrabold">
          {icon}
          {title}
        </h2>
        {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
      </div>
      {action}
    </div>
  );
}
