"use client";

/**
 * `/home/orders` — اسکرین ۲۸: سفارش‌های من (فاز M5).
 *
 * قرینهٔ /sell/orders برای میز خرید (پروتوتایپ 19-home-buy کاشی «سفارات من»).
 * ماژول سفارش‌ها در M5 ساخته می‌شود؛ تا آن موقع صفحه صادقانه خالی است.
 */

import { AuthGate } from "@/components/imach/auth-gate";
import { AppShell } from "@/components/imach/app-shell";
import { EmptyState } from "@/components/ui/feedback";
import { Icon } from "@/components/ui/icon";

export default function BuyOrdersPage() {
  return (
    <AuthGate>
      <BuyOrders />
    </AuthGate>
  );
}

function BuyOrders() {
  return (
    <AppShell arm="buy" title="سفارش‌های من" back="/home">
      <EmptyState
        icon={<Icon name="receipt" size={30} />}
        title="هنوز سفارشی ثبت نکرده‌ای"
        subtitle="از کاتالوگ تأمین‌کننده‌هایت سفارش بده تا وضعیتش را همین‌جا دنبال کنی."
      />
    </AppShell>
  );
}
