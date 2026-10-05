import type { Metadata } from "next";
import { ItemView } from "./item-view";

/**
 * /item/[goodId] — کالا در لیست خرید خریدار (پورت sc-buy-item · فاز ۳).
 * شل احراز‌شده؛ بدون index (§۱۵).
 */

export const metadata: Metadata = {
  title: "iMach — کالا",
  robots: { index: false },
};

export default async function ItemPage({ params }: { params: Promise<{ goodId: string }> }) {
  const { goodId } = await params;
  return <ItemView goodId={goodId} />;
}
