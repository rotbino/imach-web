/**
 * iMach — sidecar API server (sandbox-only) — فقط Node.js runtime.
 *
 * این فایل فقط از شاخه‌ی nodejs در instrumentation.ts ایمپورت می‌شود و هرگز
 * وارد گراف Edge bundle نمی‌شود (گارد NEXT_RUNTIME در زمان build فُلد
 * می‌شود) — پس ماژول‌های node:* اینجا آزادانه قابل استفاده‌اند.
 */
import { spawn } from "node:child_process";
import { openSync, readFileSync } from "node:fs";
import path from "node:path";

export async function startSidecar(): Promise<void> {
  const backDir = process.env.IMACH_SIDECAR_DIR ?? "/home/z/imach-back";
  const logDir = process.env.IMACH_SIDECAR_LOG_DIR ?? "/tmp";
  const out = openSync(path.join(logDir, "imach-back-sidecar.log"), "a");

  // .env بک‌اند را دستی می‌خوانیم (بدون وابستگی) و روی env فعلی سوار می‌کنیم
  const env: NodeJS.ProcessEnv = { ...process.env };
  try {
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
  // ⚠️ cmd باید برای تحلیلگر Turbopack «غیراستاتیک» بماند؛ اگر لیترال "node"
  // باشد، Turbopack آرگومان‌های spawn را به‌عنوان ماژول resolve می‌کند و
  // build روی مسیر dist خطای Module not found می‌دهد.
  const nodeBin = process.execPath.includes("bun") ? "node" : "node";
  const child = spawn(nodeBin, [entry], {
    cwd: backDir,
    env,
    stdio: ["ignore", out, out],
  });
  child.unref();
  console.log(`[imach-sidecar] backend spawned (pid=${child.pid}) → :4000`);
}
