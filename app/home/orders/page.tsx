import { redirect } from "next/navigation";

/** `/home/orders` → `/buy/orders` — مسیر کاشی میز خرید (M5) به دفتر سفارش‌های اصلی. */
export default function HomeOrdersRedirect() {
  redirect("/buy/orders");
}
