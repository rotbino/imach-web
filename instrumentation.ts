/**
 * iMach — sidecar hook (sandbox-only).
 *
 * در محیط توسعه‌ی سندباکس، پروسه‌های مستقل بین فراخوانی‌ها جمع می‌شوند؛ سرور
 * Next زنده می‌ماند. وقتی IMACH_SIDECAR=1 باشد، بک‌اند Fastify به‌عنوان
 * فرزند همین سرور بالا می‌آید تا /api/v1 همیشه در دسترس باشد — و با هر
 * استارت مجدد فرانت‌اند، خودبه‌خود هم‌راه‌اندازی می‌شود.
 *
 * ⚠️ چرا منطق spawn اینجا نیست؟ Next این فایل را برای *هر دو* runtime
 * (nodejs و edge) کامپایل می‌کند و تحلیلگر Turbopack هر API/ماژول Node را
 * — حتی پشت گارد runtime و اگر هرگز اجرا نشود — در bundle اِج فلگ می‌کند
 * («A Node.js API is used … Edge Runtime» + «Ecmascript file had an error»).
 * الگوی رسمی مستندات Next: کد Node در فایل جداگانه، و ایمپورتِ آن فقط داخل
 * گارد *مثبت* NEXT_RUNTIME. در build اِج، NEXT_RUNTIME به لیترال "edge"
 * اینلاین می‌شود → شرط `"edge" === "nodejs"` در زمان build فُلد و حذف
 * می‌شود → instrumentation-node.ts اصلاً وارد گراف bundle اِج نمی‌شود.
 *
 * در دیپلوی واقعی IMACH_SIDECAR وجود ندارد → این هوک no-op است و بک‌اند
 * مستقل اجرا می‌شود (مثل همیشه: node dist/main.js با env خودش).
 */
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    if (process.env.IMACH_SIDECAR === "1") {
      const { startSidecar } = await import("./instrumentation-node");
      await startSidecar();
    }
  }
}
