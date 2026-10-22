"use client";

/**
 * `/sell/orders` — اسکرین ۰۹: سفارش‌های رسیده (فاز M5).
 *
 * حکم مالک (فیکس‌بچ M3): کاشی «سفارشات رسیده» روی میز فروش باید باشد.
 * ماژول سفارش‌ها (مدل Order + چرخهٔ کامل) در فاز M5 سند ۰۸ ساخته می‌شود؛
 * تا آن موقع این صفحه صادقانه خالی است — نه فرم ناقص، نه دیتای فیک؛
 * فقط وضعیت واقعی: «هنوز سفارشی نرسیده» + راه رسیدن اولین سفارش.
 */

import { AuthGate } from "@/components/imach/auth-gate";
import { AppShell } from "@/components/imach/app-shell";
import { EmptyState } from "@/components/ui/feedback";
import { Icon } from "@/components/ui/icon";

export default function SellOrdersPage() {
  return (
    <AuthGate>
      <SellOrders />
    </AuthGate>
  );
}

function SellOrders() {
  return (
    <AppShell arm="sell" title="سفارش‌های رسیده" back="/sell">
      <EmptyState
        icon={<Icon name="receipt" size={30} />}
        title="هنوز سفارشی نرسیده"
        subtitle="وقتی خریداران از کاتالوگ تو سفارش ثبت کنند، همین‌جا می‌آید — با شمارهٔ مشتری، قلم‌ها و مبلغ."
      />
    </AppShell>
  );
}
