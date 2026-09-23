/* iMach — Service Worker
 * ۱) Web Push: دریافت اعلان سرور و نمایش اعلان سیستمی —
 *    همان اعلان‌های زنگِ اپ، ولی وقتی تب باز نیست هم می‌رسد.
 * ۲) PWA: کشِ استاتیک‌های هش‌دار + پوسته‌ی اپ برای باز شدن سریع و آفلاین.
 *    داده‌ی زنده (/api/*) هرگز کش نمی‌شود.
 */

const STATIC_CACHE = "imach-static-v1";
const SHELL_CACHE = "imach-shell-v1";

const OFFLINE_HTML = `<!doctype html>
<html lang="fa" dir="rtl"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>iMach — آفلاین</title>
<style>
  body{margin:0;min-height:100dvh;display:grid;place-items:center;background:#fcfbf9;
       font-family:Tahoma,Arial,sans-serif;color:#44403c;text-align:center}
  .card{padding:40px 28px;max-width:340px}
  .dot{width:14px;height:14px;border-radius:50%;background:#f97316;margin:0 auto 18px}
  h1{font-size:17px;margin:0 0 8px;color:#1c1917}
  p{font-size:13px;line-height:1.9;margin:0;color:#78716c}
</style></head>
<body><div class="card"><div class="dot"></div>
<h1>اتصال اینترنت قطع است</h1>
<p>iMach به‌محض وصل شدن دوباره، در دسترس خواهد بود.</p>
</div></body></html>`;

/* ---------- lifecycle ---------- */

self.addEventListener("install", (event) => {
  // پوسته‌ی حداقلی برای حالت آفلاین
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((c) => c.add("/").catch(() => {}))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((k) => k !== STATIC_CACHE && k !== SHELL_CACHE)
          .map((k) => caches.delete(k))
      );
      await self.clients.claim();
    })()
  );
});

/* ---------- fetch: فقط هم‌مبدأ GET ---------- */

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // تایل‌های نقشه و …
  if (url.pathname.startsWith("/api/")) return; // داده‌ی زنده — همیشه شبکه

  // استاتیک‌های هش‌دار و آیکون‌ها: cache-first (محتوایشان تغییرناپذیر است)
  if (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/") ||
    url.pathname === "/logo.svg" ||
    url.pathname === "/push-icon.png"
  ) {
    event.respondWith(cacheFirst(req));
    return;
  }

  // ناوبری‌های اپ: شبکه اول، آفلاین → پوسته‌ی کش‌شده
  if (req.mode === "navigate") {
    event.respondWith(networkFirst(req));
  }
  // بقیه درخواست‌ها دست‌نخورده به مرورگر سپرده می‌شود.
});

async function cacheFirst(req) {
  const hit = await caches.match(req);
  if (hit) return hit;
  try {
    const res = await fetch(req);
    if (res.ok) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(req, res.clone());
    }
    return res;
  } catch {
    return Response.error();
  }
}

async function networkFirst(req) {
  const cache = await caches.open(SHELL_CACHE);
  try {
    const res = await fetch(req);
    if (res.ok) cache.put(req, res.clone());
    return res;
  } catch {
    const hit = (await cache.match(req)) || (await cache.match("/"));
    if (hit) return hit;
    return new Response(OFFLINE_HTML, {
      status: 503,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }
}

/* ---------- Web Push ---------- */

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
