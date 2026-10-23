"use client";

import { useEffect } from "react";
import { saveReferralCode } from "@/lib/referral";

/**
 * M7 — ثبتِ کد دعوت (?ref) روی صفحات عمومی (کاتالوک /c/ و لیست خرید /buy/).
 * مهمان که با لینک دعوت بیاید، کد همان لحظه در localStorage می‌نشیند تا اگر
 * بین صفحه‌ها چرخید و پارامتر از URL افتاد، ثبت‌نامِ بعدی همچنان منتسب
 * بماند (همان منطق /start — الگوی سالواح M1).
 */
export function RefCapture({ code }: { code: string | undefined }) {
  useEffect(() => {
    if (code) saveReferralCode(code);
  }, [code]);
  return null;
}
