"use client";

import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/auth-store";
import { AppFooter, AppHeader, MobileTabBar } from "@/app/components/chrome";

/**
 * حالت «کسب‌وکار وجود ندارد» — خوش‌آمدگویی شخصی‌سازی‌شده + دکمه شروع.
 * به‌جای متن‌های اضافی مثل «فقط نام و شهر — بقیه‌اش با ما»، فقط یک خوش‌آمد
 * کوتاه با نام کاربر و یک دکمه. UI خودش راهنمای کاربر است (قانون اینستاگرام).
 *
 * variant: sell → دکمه orange (primary)، buy → دکمه تیره (stone-800)
 */
export function NoBusinessState({ variant = "sell" }: { variant?: "sell" | "buy" }) {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const firstName = user?.firstName || (user?.name && !user.name.startsWith("کاربر ") ? user.name : "");

  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader />
      <main className="grow">
        <div className="mx-auto max-w-xl px-4 py-16 text-center">
          <p className="text-lg font-extrabold">
            {firstName ? `${firstName} خوش اومدی` : "خوش اومدی"}
          </p>
          <button
            onClick={() => router.push("/start")}
            className={`mt-4 rounded-xl px-5 py-2.5 text-sm font-bold text-white shadow-sm transition ${
              variant === "buy"
                ? "bg-stone-800 hover:bg-stone-900"
                : "bg-primary hover:bg-primary/90"
            }`}
          >
            شروع
          </button>
        </div>
      </main>
      <AppFooter />
      <MobileTabBar />
    </div>
  );
}
