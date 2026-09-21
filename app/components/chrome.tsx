"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { fa } from "@/lib/format";
import { useAuthStore } from "@/lib/auth-store";
import { Button } from "@/components/ui/button";
import { LogIn } from "lucide-react";
import {
  CircleUserRound,
  Compass,
  House,
  Link2,
  SquarePlus,
  Store,
} from "lucide-react";

/*
 * نویگیشن به سبک اینستاگرام — پنج آیتم، همیشه و همه‌جا:
 * • هوم (فید دنبال‌شونده‌ها) · اکسپلور (پیشنهادهای تطبیق) ·
 *   کالای جدید (به‌علاوه، وسط) · بازوی من (ویترین خودم) · پروفایل
 * • دو لینک جدا برای بازوها نیست — «بازوی من» یک لینک است و سوییچر
 *   خرید/فروش مثل اکسپلور داخل خود صفحه است.
 * • موبایل → فوتر چسبان؛ دسکتاپ → بالا، سمت مقابل لوگو
 * • آیکن‌ها ظریف (خط نازک)، عنوان‌ها زیر آیکن، ریز و بدون بولد — خلوت.
 * • این نویگیشن روی همه صفحات اصلی هست، از جمله خود بازوها.
 * • مهمان فقط «ورود | ثبت‌نام» می‌بیند.
 */

// ─── آیتم‌های نویگیشن ───
export function useNavItems() {
  return [
    { href: "/home", label: "هوم", icon: House },
    { href: "/explore", label: "اکسپلور", icon: Compass },
    { href: "/new", label: "کالای جدید", icon: SquarePlus },
    { href: "/arm", label: "بازوی من", icon: Store },
    { href: "/profile", label: "پروفایل", icon: CircleUserRound },
  ];
}

function isActivePath(href: string, pathname: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

// ─── هدر بالا: لوگو یک طرف، آیتم‌ها طرف دیگر (دسکتاپ) ───
export function AppHeader() {
  const router = useRouter();
  const pathname = usePathname();
  const { status, user } = useAuthStore();
  const items = useNavItems();

  return (
    <header className="sticky top-0 z-40 border-b bg-white/85 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        <button
          onClick={() => router.push(status === "authed" ? "/arm" : "/")}
          className="flex items-center gap-2 text-lg font-extrabold"
          aria-label="iMach"
        >
          <span className="grid size-8 place-items-center rounded-xl bg-primary text-primary-foreground shadow-sm">
            <Link2 className="size-4" />
          </span>
          iMach
        </button>

        {status === "authed" ? (
          <nav className="hidden items-center gap-1 sm:flex" aria-label="نویگیشن اصلی">
            {items.map((it) => {
              const on = isActivePath(it.href, pathname);
              return (
                <Link
                  key={it.href}
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

// ─── فوتر چسبان موبایل — نویگیشن اینستاگرامی ───
export function MobileTabBar() {
  const { status } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();
  const items = useNavItems();

  return (
    <nav
      aria-label="نویگیشن موبایل"
      className="fixed inset-x-0 bottom-0 z-40 border-t bg-white/95 backdrop-blur-md sm:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      {status === "authed" ? (
        <div className="grid grid-cols-5">
          {items.map((it) => {
            const on = isActivePath(it.href, pathname);
            return (
              <Link
                key={it.href}
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
  return (
    <footer className="mb-[4.25rem] mt-auto border-t bg-white/60 pb-[env(safe-area-inset-bottom)] sm:mb-0">
      <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-2 px-4 py-4 text-xs text-muted-foreground sm:flex-row">
        <p>iMach — ارزان‌تر بخر، بیشتر بفروش</p>
        <p>کاتالوگ فروش و لیست خرید هوشمند — رایگان</p>
      </div>
    </footer>
  );
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
