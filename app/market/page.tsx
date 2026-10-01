import { redirect } from "next/navigation";

/* مسیر قدیمی «بازار» — فاز ۱۰ پاکسازی. کاتالوگ عمومی جای خود را به لندینگ
 * و صفحات دو-بازو داده است؛ لینک‌های قدیمی (اعلان‌ها/بوکمارک) این‌جا می‌رسند. */
export default function MarketRedirectPage() {
  redirect("/");
}
