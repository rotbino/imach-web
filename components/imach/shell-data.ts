"use client";

/**
 * useShellData — دادهٔ واقعی شل (فاز ۲ مهاجرت).
 * نام کسب‌وکار، شمارش بج‌ها و موجودی کیف — همه از API واقعی:
 *   · Appbar: dot زنگ = unreadCount اعلان‌ها
 *   · Tabbar/Deskbar: بج پیشنهادها = answeredCount · بج درخواست‌ها = خریدارانِ گوش‌به‌زنگ
 *   · Deskbar: نام/نقش کسب‌وکار · پایش buy = تعداد کاتالوگ‌های ذخیره (فالوها)
 *              پایش sell = موجودی کیف پول
 * چت هنوز بک‌اند ندارد (فاز ۶) → بج چت نمایش داده نمی‌شود (نه عدد ساختگی).
 */

import { useActiveBusiness } from "@/lib/active-biz";
import {
  useNotifications,
  useMyInquiries,
  useWatchedBuyerNeeds,
  useFollows,
  useWallet,
} from "@/lib/queries";

export function useShellData() {
  const biz = useActiveBusiness();
  const bizId = biz?.id ?? null;

  const notif = useNotifications();
  const inquiries = useMyInquiries(bizId);
  const needs = useWatchedBuyerNeeds(bizId);
  const follows = useFollows(bizId);
  const wallet = useWallet(bizId);

  return {
    biz,
    bizId,
    notifUnread: notif.data?.unreadCount ?? 0,
    offersCount: inquiries.data?.answeredCount ?? 0,
    requestsCount: needs.data?.buyers ?? 0,
    followsCount: follows.data?.length ?? 0,
    walletBalanceMinor: wallet.data?.balanceMinor ?? null,
  };
}
