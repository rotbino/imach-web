"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/auth-store";
import { setArmActive, useActiveBusiness } from "@/lib/active-biz";
import { AppFooter, AppHeader, MobileTabBar } from "@/app/components/chrome";
import { NoBusinessState } from "@/app/components/no-business";
import { CustomersSection } from "@/app/components/customers";
import { useMyBusinesses } from "@/lib/queries";
import { Loader2 } from "lucide-react";

/*
 * مشتریان من — صفحه‌ی مستقل. ردیف‌ها و ابزار رشد مشترک‌اند با آکاردئونِ
 * «مشتریان من» در پروفایل فروشنده (فاز ۸ · طرح ۰۷ — app/components/customers).
 * این مسیر فعلاً می‌ماند چون deep-link اعلان FOLLOW_SUPPLIER همین‌جاست؛
 * در پاکسازی فاز ۱۰ با ریدایرکت به /profile جمع می‌شود.
 */

export default function CustomersPage() {
  const router = useRouter();
  const { status } = useAuthStore();

  useEffect(() => {
    document.title = "مشتریان من | iMach";
    setArmActive("sell");
    if (status === "guest") router.replace("/start");
  }, [status, router]);

  if (status !== "authed") {
    return (
      <div className="flex min-h-screen flex-col">
        <AppHeader />
        <main className="grow">
          <div className="grid place-items-center py-32">
            <Loader2 className="size-6 animate-spin text-primary" />
          </div>
        </main>
        <AppFooter />
        <MobileTabBar />
      </div>
    );
  }

  return <CustomersBody />;
}

function CustomersBody() {
  const active = useActiveBusiness();
  const bizQ = useMyBusinesses();

  if (bizQ.isLoading) {
    return (
      <div className="grid place-items-center py-32">
        <Loader2 className="size-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!active) return <NoBusinessState variant="sell" />;

  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader />
      <main className="grow">
        <div className="mx-auto max-w-2xl px-4 py-6">
          <CustomersSection bizId={active.id} slug={active.slug} name={active.name} />
        </div>
      </main>
      <AppFooter />
      <MobileTabBar />
    </div>
  );
}
