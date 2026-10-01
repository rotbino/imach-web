/**
 * فشرده‌سازی سمت کلاینت — پیش از آپلود (خواسته‌ی کاربر):
 *   «عکس اگر بالای ۵۰۰ کیلوبایت بود همین سمت کلاینت با کوچک کردن به ۵۰۰
 *    کیلو برسون؛ اگر باز بیشتر بود باز فشرده‌ش کن، بعد بفرست که سریع آپلود بشه»
 *
 * چرا این اعداد (استاندارد رایج عکس محصول در فروشگاه‌های وب — Shopify/Amazon
 * محدوده‌ی ۱۶۰۰ تا ۲۰۴۸ پیکسل برای لبه‌ی بزرگ و کیفیت ۸۰–۸۵ را توصیه می‌کنند):
 *   • لبه‌ی بزرگ ≤ ۱۶۰۰px — برای زوم و نمای detal کافی است، کیفیت ادراکی
 *     عملا بدون افت؛ حجم خروجی معمولا زیر ۳۰۰ کیلوبایت.
 *   • هدف نهایی ≤ ۵۰۰KB — تفاوت ادراکی با فایل‌های چندمگابایتیِ دوربین
 *     تقریبا هیچ است؛ آپلود روی اینترنت موبایل ۱۰ برابر سریع‌تر.
 *   • تامبنیل (≤۴۰۰px) سمت سرور با sharp ساخته می‌شود — همیشه زیر ۲۰۰KB.
 *
 * PNG دارای شفافیت (لوگوها) به PNG می‌ماند و فقط کوچک می‌شود؛ بقیه jpeg.
 * سرور (sharp) حرف آخر را می‌زند و دوباره بهینه می‌کند — اینجا فقط
 * پهنای‌باند موبایل نجات داده می‌شود.
 */

/** هدف حجم بعد از فشرده‌سازی — ۵۰۰ کیلوبایت (خواسته‌ی کاربر) */
const TARGET_BYTES = 500 * 1024;

/** لبه‌ی بزرگ مجاز — استاندارد عکس محصول وب */
const MAX_EDGE = 1600;

/** پله‌های کیفیت jpeg — از استاندارد ۸۵ شروع، تا رسیدن به هدف */
const JPEG_QUALITY_STEPS = [0.85, 0.75, 0.62, 0.5, 0.4];

/** پله‌های کوچک‌کردن لبه اگر با کیفیت ۰٫۴ هم به هدف نرسیدیم */
const EDGE_STEPS = [MAX_EDGE, 1280, 1024, 800];

export async function compressImage(file: File): Promise<File> {
  if (!file.type.startsWith("image/") || file.type === "image/gif") return file;
  if (typeof document === "undefined") return file; // SSR safety

  try {
    const bitmap = await loadImage(file);
    const keepPng = file.type === "image/png" && hasAlpha(bitmap);
    const mime = keepPng ? "image/png" : "image/jpeg";
    const qualities = keepPng ? [undefined] : JPEG_QUALITY_STEPS;

    let best: Blob | null = null;
    // فشرده‌سازیِ بی‌دلیلِ عکس‌های از قبل کوچک ممنوع — همان اصلی بفرست
    if (file.size <= TARGET_BYTES && Math.max(bitmap.width, bitmap.height) <= MAX_EDGE) return file;

    for (const edge of EDGE_STEPS) {
      if (edge > MAX_EDGE) continue;
      const scale = Math.min(1, edge / Math.max(bitmap.width, bitmap.height));
      const width = Math.max(1, Math.round(bitmap.width * scale));
      const height = Math.max(1, Math.round(bitmap.height * scale));
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return file;
      ctx.drawImage(bitmap, 0, 0, width, height);

      for (const q of qualities) {
        const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, mime, q));
        if (!blob) continue;
        if (!best || blob.size < best.size) best = blob;
        if (blob.size <= TARGET_BYTES) {
          return toFile(blob, file.name, keepPng);
        }
      }
      // PNG کیفیت/گام ندارد — کوچک‌کردن لبه تنها اهرم است
      if (keepPng && best && best.size <= TARGET_BYTES) return toFile(best, file.name, true);
    }

    if (!best) return file;
    // حتی کوچک‌ترین نسخه هم از اصلیِ کاربر بزرگ‌تر شد؟ اصلی همان بهتر است
    if (best.size >= file.size) return file;
    return toFile(best, file.name, keepPng);
  } catch {
    return file; // هر خطایی = فایل اصلی، بک‌اند هم محافظت شده
  }
}

function toFile(blob: Blob, originalName: string, keepPng: boolean): File {
  const ext = keepPng ? "png" : "jpg";
  return new File([blob], `${originalName.replace(/\.[^.]+$/, "")}.${ext}`, {
    type: keepPng ? "image/png" : "image/jpeg",
  });
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("decode failed"));
    };
    img.src = url;
  });
}

/** نمونه‌برداری آلفا از خود bitmap — لوگوها با شفافیت شناسایی شوند */
function hasAlpha(img: HTMLImageElement): boolean {
  const w = 32;
  const h = 32;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return false;
  ctx.drawImage(img, 0, 0, w, h);
  const d = ctx.getImageData(0, 0, w, h).data;
  for (let i = 3; i < d.length; i += 4) {
    if (d[i] < 250) return true;
  }
  return false;
}
