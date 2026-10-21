import type { Metadata } from "next";
import { SavedCatalogs } from "./saved-view";

/**
 * /saved — کاتالوگ‌های ذخیره‌شدهٔ خریدار (پورت sc-suppliers · فاز ۳).
 * جایگزین v18 مسیر legacy /buy/suppliers. شل احراز‌شده؛ بدون index (§۱۵).
 */

export const metadata: Metadata = {
  title: "iMach — ذخیره‌شده‌ها",
  robots: { index: false },
};

export default function SavedPage() {
  return <SavedCatalogs />;
}
