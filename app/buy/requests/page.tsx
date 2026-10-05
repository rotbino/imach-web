import { redirect } from "next/navigation";

/* مسیر legacy «درخواست‌های من» — فاز ۴ مهاجرت: جایگزین v18 = /offers
 * (پیشنهادها). لینک‌های قدیمی (اعلان‌ها/بوکمارک) این‌جا می‌رسند. */
export default function BuyRequestsRedirectPage() {
  redirect("/offers");
}
