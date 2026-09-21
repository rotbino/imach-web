"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/auth-store";
import { useActiveBusiness } from "@/lib/active-biz";
import { AppFooter, AppHeader, MobileTabBar } from "@/app/components/chrome";
import { LanguageSelect } from "@/app/components/language-select";
import { BusinessCard } from "./business-card";
import { Button } from "@/components/ui/button";
import { LogOut, ShieldCheck } from "lucide-react";

/*
 * پروفایل — فعلا ساده: نام کاربر، موبایل و خروج.
 * عکس پروفایل و تغییر رمز بعد از سیستم فایل‌ها اینجا اضافه می‌شود.
 */
export default function ProfilePage() {
  const router = useRouter();
  const { status, user, logout } = useAuthStore();
  const active = useActiveBusiness();

  useEffect(() => {
    if (status === "guest") router.replace("/start");
  }, [status, router]);

  if (status !== "authed" || !user) {
    return (
      <div className="flex min-h-screen flex-col">
        <AppHeader />
        <main className="grow" />
        <AppFooter />
        <MobileTabBar />
      </div>
    );
  }

  return (
    <>
      <AppHeader />
      <main className="grow">
        <div className="mx-auto max-w-2xl px-4 py-8">
          <div className="rounded-2xl border bg-white p-6 shadow-sm">
            <div className="flex items-center gap-4">
              <span className="grid size-16 place-items-center rounded-3xl bg-primary/10 text-2xl font-black text-primary">
                {user.name.slice(0, 1)}
              </span>
              <div className="min-w-0">
                <p className="truncate text-lg font-extrabold">{user.name}</p>
                <p dir="ltr" className="mt-0.5 text-sm text-muted-foreground">
                  {user.phone}
                </p>
              </div>
            </div>

            <div className="mt-6 border-t pt-4">
              <Button
                variant="outline"
                className="w-full text-destructive hover:bg-destructive/10 hover:text-destructive"
                onClick={() => void logout()}
              >
                <LogOut className="size-4" />
                خروج از حساب
              </Button>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between rounded-2xl border bg-white px-4 py-3 shadow-sm">
            <p className="text-sm text-muted-foreground">زبان / Language</p>
            <LanguageSelect />
          </div>

          {active && (
            <div className="mt-4">
              <BusinessCard biz={active} />
            </div>
          )}

          {user.role === "ADMIN" && (
            <Link
              href="/admin"
              className="mt-4 flex items-center gap-2.5 rounded-2xl border bg-white px-4 py-3 shadow-sm transition hover:shadow-md"
            >
              <span className="grid size-8 place-items-center rounded-lg bg-primary/10 text-primary">
                <ShieldCheck className="size-4.5" strokeWidth={1.75} />
              </span>
              <span className="text-sm font-extrabold">پنل مدیریت</span>
            </Link>
          )}
        </div>
      </main>
      <AppFooter />
      <MobileTabBar />
    </>
  );
}
