import type { Metadata } from "next";
import { BuyerHome } from "./buyer-home";

/**
 * /home — خانهٔ خریدار (پورت sc-buy-list از Prototype v18).
 * فاز ۲: Vertical Slice واقعی — داده از API/دیتابیس زنده.
 */

export const metadata: Metadata = {
  title: "iMach — لیست خرید",
  robots: { index: false }, // شل احراز‌شده؛ بی‌دلیل index نمی‌شود (§۱۵)
};

export default function BuyerHomePage() {
  return <BuyerHome />;
}
