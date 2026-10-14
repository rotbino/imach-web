// tools/hero-shot.mjs — رندر تصویر هیرو لندینگ (d3-desktop-landing.jpg) از hero-mock.html
// فاز ۲۴: بوم ۷۰۰×۶۴۰ (کارت‌ها داخل گوشی‌ها) + خروجی ۲x برای وضوح متن در موبایل
import { chromium } from 'playwright';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = resolve(ROOT, 'png/d3-desktop-landing.jpg');

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 700, height: 640 },
  deviceScaleFactor: 2, // خروجی ۱۴۰۰×۱۲۸۰ — متن‌ها در موبایل واضح
});

await page.goto('file://' + resolve(ROOT, 'tools/hero-mock.html'));
await page.waitForTimeout(600); // فونت‌ها و عکس‌ها
await page.locator('.hero-canvas').screenshot({ path: OUT, type: 'jpeg', quality: 92 });
await browser.close();

console.log('hero rendered →', OUT);
