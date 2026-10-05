"use client";

/**
 * useShellData — دادهٔ واقعی شل (فاز ۲ مهاجرت · فاز ۴: بج پیشنهادها گروهی).
 * نام کسب‌وکار، شمارش بج‌ها و موجودی کیف — همه از API واقعی:
 *   · Appbar: dot زنگ = unreadCount اعلان‌ها
 *   · Tabbar/Deskbar: بج پیشنهادها = recentOfferCount (۷۲ساعت) · بج درخواست‌ها = خریدارانِ گوش‌به‌زنگ
 *   · Deskbar: نام/نقش کسب‌وکار · پایش buy = تعداد کاتالوگ‌های ذخیره (فالوها)
 *              پایش sell = موجودی کیف پول
 * چت هنوز بک‌اند ندارد (فاز ۶) → بج چت نمایش داده نمی‌شود (نه عدد ساختگی).
 */

import { useActiveBusiness } from "@/lib/active-biz";
import {
  useNotifications,
  useMyRfqs,
  useWatchedBuyerNeeds,
  useFollows,
  useWallet,
  useThreads,
} from "@/lib/queries";

export function useShellData() {
  const biz = useActiveBusiness();
  const bizId = biz?.id ?? null;

  const notif = useNotifications();
  const rfqs = useMyRfqs(bizId);
  const needs = useWatchedBuyerNeeds(bizId);
  const follows = useFollows(bizId);
  const wallet = useWallet(bizId);
  const threads = useThreads();

  return {
    biz,
    bizId,
    notifUnread: notif.data?.unreadCount ?? 0,
    offersCount: rfqs.data?.recentOfferCount ?? 0,
    requestsCount: needs.data?.buyers ?? 0,
    followsCount: follows.data?.length ?? 0,
    walletBalanceMinor: wallet.data?.balanceMinor ?? null,
    // فاز ۶ — بج چت: جمع نخواندهٔ واقعی گفتگوها
    chatUnread: threads.data?.unreadTotal ?? 0,
  };
}
