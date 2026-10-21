"use client";

import { useCallback, useEffect, useState } from "react";
import { notificationsApi } from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";

/*
 * Web Push (VAPID) — استاندارد باز، بدون کلید گوگل.
 * جریان: کاربر «فعال‌سازی» را می‌زند → اجازه‌ی مرورگر → subscribe با کلید
 * عمومیِ بک‌اند → ارسال اشتراک به subscribePush → از این به بعد هر اعلانِ
 * درون‌برنامه‌ای، همزمان به‌صورت اعلان سیستمی هم می‌آید (سرویس‌ورکر sw.js).
 */

const SW_PATH = "/sw.js";

/** تبدیل کلید base64url به Uint8Array برای applicationServerKey */
function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  const buf = new ArrayBuffer(raw.length);
  const out = new Uint8Array(buf);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

/** پشتیبانی مرورگر (iOS باید ≥16.4 و به‌صورت PWA نصب‌شده باشد) */
export function pushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

export function usePushSetup() {
  const status = useAuthStore((s) => s.status);
  const [supported, setSupported] = useState(false);
  const [permission, setPermission] =
    useState<NotificationPermission>("default");
  const [subscribed, setSubscribed] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const ok = pushSupported();
    setSupported(ok);
    if (!ok) return;
    setPermission(Notification.permission);
    // اگر این مرورگر قبلاً subscribe بوده — بنر دوباره نشان داده نشود
    navigator.serviceWorker
      .ready
      .then((reg) =>
        reg.pushManager
          .getSubscription()
          .then((s) => setSubscribed(!!s))
          .catch(() => {})
      )
      .catch(() => {});
  }, [status]);

  /** فعال‌سازی کامل: اجازه → اشتراک → ثبت در بک‌اند */
  const enable = useCallback(async (): Promise<boolean> => {
    if (!pushSupported()) return false;
    setBusy(true);
    try {
      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== "granted") return false;

      // ۱) کلید عمومی VAPID از سرور (خالی = سرور پوش ندارد)
      const { publicKey } = await notificationsApi.getVapidPublicKey();
      if (!publicKey) return false;

      // ۲) ثبت سرویس‌ورکر و ساختن اشتراک
      const reg = await navigator.serviceWorker.register(SW_PATH);
      const ready = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });
      void ready;

      // ۳) اشتراک به بک‌اند — از اینجا سرور می‌تواند به این مرورگر push کند
      const json = sub.toJSON() as {
        endpoint: string;
        keys: { p256dh: string; auth: string };
      };
      await notificationsApi.subscribePush({
        endpoint: json.endpoint,
        keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
      });

      setSubscribed(true);
      return true;
    } catch {
      return false;
    } finally {
      setBusy(false);
    }
  }, []);

  return { supported, permission, subscribed, busy, enable };
}
