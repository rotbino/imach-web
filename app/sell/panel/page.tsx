import { redirect } from "next/navigation";

/* داشبورد قدیمی کاتالوگ — فاز ۱۰. همه‌ی کارکردهایش (آمار/درخواست‌ها/
 * تنظیمات/مشتریان) در /profile جمع شده است. */
export default function SellPanelRedirectPage() {
  redirect("/profile");
}
