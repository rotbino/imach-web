import type { MetadataRoute } from "next";

/**
 * PWA manifest — همان چیزی که مدال «نصب برنامه» (components/install-prompt.tsx)
 * به مرورگر معرفی می‌کند. آیکون‌ها از public/logo.svg ساخته شده‌اند
 * (scripts/gen-icons.mjs — یک‌بار تولید و کامیت شده‌اند).
 *
 * رنگ‌ها با توکن‌های تم هم‌خوان‌اند:
 *   theme      ← #f97316 (نارنجی برند، همان themeColor در layout)
 *   background ← نزدیک‌ترین معادل hex برای oklch(0.987 0.0025 75)
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "iMach | تطبیق هوشمند خریدار عمده و تامین‌کننده",
    short_name: "iMach",
    description:
      "کاتالوگ فروش هوشمندت را رایگان بساز؛ لیست خریدت را برای تامین‌کننده‌ها بفرست و پیشنهادها را یک‌جا مقایسه کن.",
    lang: "fa",
    dir: "rtl",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#fcfbf9",
    theme_color: "#f97316",
    categories: ["business", "shopping"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      {
        src: "/icons/maskable-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icons/maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
