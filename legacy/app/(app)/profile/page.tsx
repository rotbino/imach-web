import type { Metadata } from "next";
import { ProfileView } from "./profile-view";

/**
 * /profile — پروفایل (پورت sc-buy-profile / sc-sell-profile · فاز ۶).
 * جایگزین v18 صفحهٔ legacy /profile (قدیمی حذف شد — URL یکسان).
 * arm صفحه = آخرین انتخاب صریح شل (رفتار Prototype برای صفحات مشترک).
 */

export const metadata: Metadata = {
  title: "iMach — پروفایل",
  robots: { index: false },
};

export default function ProfilePage() {
  return <ProfileView />;
}
