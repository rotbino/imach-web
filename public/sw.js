/* iMach — Service Worker: دریافت Web Push و نمایش اعلان سیستمی.
 * همان اعلان‌های زنگِ اپ — ولی وقتی تب باز نیست هم می‌رسد. */
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { body: event.data ? event.data.text() : "" };
  }
  event.waitUntil(
    self.registration.showNotification(data.title || "iMach", {
      body: data.body || "",
      icon: "/push-icon.png",
      badge: "/push-icon.png",
      tag: "imach", // اعلان تازه جای کهنه می‌نشیند — انبار نشدن
      renotify: false,
      data: { url: data.url || "/" },
      dir: "rtl",
      lang: "fa",
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/";
  event.waitUntil(
    (async () => {
      const list = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      for (const c of list) {
        if ("focus" in c) {
          await c.focus().catch(() => {});
          try {
            await c.navigate(url);
          } catch {
            /* بعضی مرورگرها navigate را نمی‌دهند — فقط فوکوس */
          }
          return;
        }
      }
      await self.clients.openWindow(url);
    })()
  );
});
