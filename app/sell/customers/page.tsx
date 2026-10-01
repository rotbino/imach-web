import { redirect } from "next/navigation";

/* «مشتریان من» مستقل — فاز ۱۰. ردیف‌های مشتری با همان ابزار، داخل
 * آکاردئون پروفایل فروشنده (app/components/customers) زندگی می‌کنند. */
export default function SellCustomersRedirectPage() {
  redirect("/profile");
}
