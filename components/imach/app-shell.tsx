"use client";

import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Icon, type IconName } from "@/components/ui/icon";
import { useAuthStore } from "@/lib/auth-store";

/**
 * AppShell — پوستهٔ M0: data-arm روی ریشه + اپ‌بار چسبان + تب‌بار موبایل
 * + سایدبار دسکتاپ ۲۵۶ (قانون FD-29). مسیرهای فازهای بعدی به تب‌ها اضافه می‌شوند.
 */

export type Arm = "sell" | "buy" | "keep";

const TABS: { href: string; icon: IconName; label: string }[] = [
  { href: "/me", icon: "home", label: "میز کار" },
  { href: "/me?tab=msgs", icon: "msg", label: "پیام‌ها" },
  { href: "/me?tab=notifs", icon: "bell", label: "زنگ" },
  { href: "/me?tab=profile", icon: "user", label: "پروفایل" },
];

export function AppShell({
  arm = "sell",
  title,
  children,
}: {
  arm?: Arm;
  title?: string;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const activeTab = pathname;

  return (
    <div data-arm={arm} className="flex min-h-dvh flex-col bg-bg lg:flex-row-reverse">
      {/* ── سایدبار دسکتاپ (راست، ۲۵۶، چسبان — FD-29) ── */}
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-s border-line bg-surface lg:flex">
        <div className="flex items-center gap-2.5 px-5 pt-6 pb-5">
          <div className="grid size-9 place-items-center rounded-lg bg-primary text-[15px] font-black text-white">i</div>
          <span className="text-[17px] font-black text-text">آی‌مچ</span>
        </div>
        <nav className="flex flex-1 flex-col gap-1 px-3">
          {TABS.map((t) => (
            <button
              key={t.href}
              type="button"
              onClick={() => router.push(t.href)}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3.5 py-2.5 text-[14px] font-bold transition-colors",
                activeTab === t.href ? "bg-arm-soft text-arm-strong" : "text-text-2 hover:bg-surface-2"
              )}
            >
              <Icon name={t.icon} size={20} />
              {t.label}
            </button>
          ))}
        </nav>
        <div className="border-t border-line p-4">
          <div className="flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-full bg-arm-soft text-[15px] font-black text-arm-strong">
              {(user?.firstName ?? "؟").slice(0, 1)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13.5px] font-bold text-text">
                {user ? `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() : "کاربر"}
              </p>
              <p className="truncate text-[11.5px] text-text-3" dir="ltr">
                {user?.phone ?? ""}
              </p>
            </div>
            <button
              type="button"
              onClick={() => void logout("/")}
              aria-label="خروج"
              title="خروج از حساب"
              className="grid size-9 place-items-center rounded-full text-text-3 hover:bg-red-bg hover:text-red"
            >
              <Icon name="power" size={18} />
            </button>
          </div>
        </div>
      </aside>

      {/* ── ستون اصلی: اپ‌بار چسبان + محتوا + تب‌بار موبایل ── */}
      <div className="flex min-h-dvh flex-1 flex-col">
        {title && (
          <header className="sticky top-0 z-30 flex h-14 items-center justify-center border-b border-line bg-surface/90 backdrop-blur">
            <h1 className="text-[15.5px] font-black text-text">{title}</h1>
          </header>
        )}
        <main className="mx-auto w-full max-w-[880px] flex-1 px-4 pb-24 pt-4 lg:max-w-[1120px] lg:px-8 lg:pb-10">
          {children}
        </main>

        {/* تب‌بار موبایل (الگوی پروتوتایپ) */}
        <nav className="sticky bottom-0 z-30 grid h-16 grid-cols-4 border-t border-line bg-surface/95 backdrop-blur lg:hidden">
          {TABS.map((t) => (
            <button
              key={t.href}
              type="button"
              onClick={() => router.push(t.href)}
              className={cn(
                "flex flex-col items-center justify-center gap-1",
                activeTab === t.href ? "text-arm" : "text-text-3"
              )}
            >
              <Icon name={t.icon} size={22} />
              <span className="text-[10.5px] font-bold">{t.label}</span>
            </button>
          ))}
        </nav>
      </div>
    </div>
  );
}
