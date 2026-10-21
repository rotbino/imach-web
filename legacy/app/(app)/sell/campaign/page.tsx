import type { Metadata } from "next";
import { CampaignReport } from "./campaign-view";

/**
 * /sell/campaign — گزارش کمپین «فروشنده ویژه» (پورت sc-campaign · فاز ۶).
 * جایگزین v18 صفحهٔ legacy /sell/promos (ریدایرکت).
 */

export const metadata: Metadata = {
  title: "iMach — گزارش کمپین",
  robots: { index: false },
};

export default function CampaignPage() {
  return <CampaignReport />;
}
