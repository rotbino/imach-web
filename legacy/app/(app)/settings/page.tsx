import type { Metadata } from "next";
import { SettingsView } from "./settings-view";

/**
 * /settings — تنظیمات (پورت sc-settings · فاز ۶).
 * اعلان‌ها + زبان و منطقه + نما (تم روشن/تاریک و رنگ دلخواه هر arm —
 * الزام مالک) + فروشگاه (ساعت پاسخگویی/شرایط پرداخت) + خروج.
 */

export const metadata: Metadata = {
  title: "iMach — تنظیمات",
  robots: { index: false },
};

export default function SettingsPage() {
  return <SettingsView />;
}
