import { redirect } from "next/navigation";

/**
 * /sell → /sell/catalog (فاز ۵ مهاجرت).
 * صفحهٔ legacy «کاتالوک فروش من» با پورت v18 جایگزین شد (app/(app)/sell/catalog).
 * این ریدایرکت لینک‌های قدیمی (تب‌بار/بوکمارک) را نگه می‌دارد.
 */
export default function SellRedirect() {
  redirect("/sell/catalog");
}
