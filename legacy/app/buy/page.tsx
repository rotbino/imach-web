import { redirect } from "next/navigation";

/**
 * /buy → /home — خانهٔ خریدار v18 (فاز ۲+).
 * درخت legacy صفحات خریدار در فاز ۹ حذف شد؛ این ریدایرکت بوکمارک‌ها و
 * لینک‌های بیرونی قدیمی را نگه می‌دارد (همان الگوی /sell → /sell/catalog).
 */
export default function BuyRedirect() {
  redirect("/home");
}
