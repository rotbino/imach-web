import type { Metadata } from "next";
import { SupplyBoardPage } from "./board-page";

/**
 * /board/[goodId] — تابلوی تأمین یک کالا (پورت sc-board · فاز ۳).
 * جایگزین v18 مسیر legacy /buy/board/[goodId] (بازطراحی روی نقشهٔ هدف).
 * شل احراز‌شده؛ بدون index (§۱۵).
 */

export const metadata: Metadata = {
  title: "iMach — تابلوی تأمین",
  robots: { index: false },
};

export default async function BoardPage({ params }: { params: Promise<{ goodId: string }> }) {
  const { goodId } = await params;
  return <SupplyBoardPage goodId={goodId} />;
}
