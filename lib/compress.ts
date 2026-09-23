/**
 * فشرده‌سازی سمت کلاینت — پیش از آپلود (خواسته‌ی کاربر: «قبل از آپلود و بعد
 * از آپلود بهتره در اندازه‌های خاصی فشرده یا تغییر سایز داده بشن»).
 *
 * • باندwidth موبایل‌ها نجات پیدا می‌کند: یک عکس ۸ مگاپیکسلی گوشی معمولا به
 *   ۲۰۰–۴۰۰ کیلوبایت jpeg می‌رسد.
 * • سرور (sharp) حرف آخر را می‌زند: نسخه‌ی اصلی را تا ۱۶۰۰ پیکسل می‌خواباند
 *   و تامبنیل ۴۰۰ می‌سازد — اینجا فقط پیش‌پردازش سبک است.
 * • PNG دارای شفافیت (لوگوها) به PNG می‌ماند؛ بقیه به jpeg تبدیل می‌شوند.
 */

const MAX_EDGE = 1600;
const JPEG_QUALITY = 0.85;

export async function compressImage(file: File): Promise<File> {
  if (!file.type.startsWith("image/") || file.type === "image/gif") return file;
  if (typeof document === "undefined") return file; // SSR safety

  try {
    const bitmap = await loadImage(file);
    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, width, height);

    // PNG با آلفا → PNG بماند؛ بقیه → jpeg ۰٫۸۵
    const keepPng = file.type === "image/png" && hasAlpha(ctx, width, height);
    const mime = keepPng ? "image/png" : "image/jpeg";
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, mime, JPEG_QUALITY));
    if (!blob || blob.size >= file.size) return file; // فشرده‌سازی به‌درد نخورد — اصلی بماند

    const ext = keepPng ? "png" : "jpg";
    return new File([blob], `${file.name.replace(/\.[^.]+$/, "")}.${ext}`, { type: mime });
  } catch {
    return file; // هر خطایی = فایل اصلی، بک‌اند هم محافظت شده
  }
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

/** نمونه‌برداری آلفا — کافی است گوشه‌ها و مرکز را ببینیم */
function hasAlpha(ctx: CanvasRenderingContext2D, w: number, h: number): boolean {
  const points: [number, number][] = [
    [0, 0],
    [w - 1, 0],
    [0, h - 1],
    [w - 1, h - 1],
    [Math.floor(w / 2), Math.floor(h / 2)],
  ];
  for (const [x, y] of points) {
    const d = ctx.getImageData(x, y, 1, 1).data;
    if (d[3] < 250) return true;
  }
  return false;
}
