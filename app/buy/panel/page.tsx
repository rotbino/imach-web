import { redirect } from "next/navigation";

/* داشبورد قدیدی خرید — فاز ۱۰. آمار و ابزارهای خرید در /profile و
 * زنده‌ترین نمای آن‌ها در /buy نگه داشته می‌شود. */
export default function BuyPanelRedirectPage() {
  redirect("/profile");
}
