/**
 * iMach — sidecar API server (sandbox-only).
 *
 * در محیط توسعه‌ی سندباکس، پروسه‌های مستقل بین فراخوانی‌ها جمع می‌شوند؛ سرور
 * Next زنده می‌ماند. وقتی IMACH_SIDECAR=1 باشد، بک‌اند Fastify به‌عنوان
 * فرزند همین سرور بالا می‌آید تا /api/v1 همیشه در دسترس باشد — و با هر
 * استارت مجدد فرانت‌اند، خودبه‌خود هم‌راه‌اندازی می‌شود.
 *
 * در دیپلوی واقعی این فلگ وجود ندارد → تابع no-op است و بک‌اند مستقل اجرا
 * می‌شود (مثل همیشه: node dist/main.js با env خودش).
 */
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (process.env.IMACH_SIDECAR !== "1") return;

  const { spawn } = await import("node:child_process");
  const { openSync } = await import("node:fs");
  const path = await import("node:path");

  const backDir = process.env.IMACH_SIDECAR_DIR ?? "/home/z/imach-back";
  const logDir = process.env.IMACH_SIDECAR_LOG_DIR ?? "/tmp";
  const out = openSync(path.join(logDir, "imach-back-sidecar.log"), "a");

  // .env بک‌اند را دستی می‌خوانیم (بدون وابستگی) و روی env فعلی سوار می‌کنیم
  const env: NodeJS.ProcessEnv = { ...process.env };
  try {
    const { readFileSync } = await import("node:fs");
    for (const line of readFileSync(path.join(backDir, ".env"), "utf8").split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq <= 0) continue;
      const key = trimmed.slice(0, eq).trim();
      let val = trimmed.slice(eq + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      env[key] = val;
    }
  } catch {
    /* بدون .env هم تلاش می‌کنیم — شل قبلاً export کرده باشد */
  }

  // Turbopack مسیر spawn را استاتیک resolve می‌کند — با join غیرقابل‌ردیابی می‌کنیم
  const entry = path.join(backDir, "dist", ["main", "js"].join("."));
  const child = spawn(process.execPath.includes("bun") ? "node" : "node", [entry], {
    cwd: backDir,
    env,
    stdio: ["ignore", out, out],
  });
  child.unref();
  console.log(`[imach-sidecar] backend spawned (pid=${child.pid}) → :4000`);
}
