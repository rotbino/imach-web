"use client";

import { useEffect } from "react";

/**
 * ثبت سرویس‌ورکر /sw.js در سطح اپ — بدون UI.
 *
 * چرا جدا از lib/push.ts؟ آنجا سرویس‌ورکر فقط وقتی ثبت می‌شود که کاربر
 * «فعال‌سازی اعلان‌ها» را بزند؛ برای نصب‌پذیریِ PWA و کارکرد آفلاین، باید
 * سرویس‌ورکر از همان ورود اول ثبت شود. register دوباره idempotent است.
 */
export function PwaRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    const register = () => {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        /* سرویس‌ورکر حیاتی نیست — شکست بی‌صدا */
      });
    };
    if (document.readyState === "complete") {
      register();
      return;
    }
    window.addEventListener("load", register, { once: true });
    return () => window.removeEventListener("load", register);
  }, []);

  return null;
}
