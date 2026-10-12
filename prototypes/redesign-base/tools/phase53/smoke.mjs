// فاز ۵۳ — اسموک سریع: بارگذاری + کنسول پاک + عناصر کلیدی جدید
import { chromium } from 'playwright';
const FILE = 'file://' + process.cwd() + '/index.html';
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 402, height: 874 } });
const errors = [];
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
await page.goto(FILE);
await page.evaluate(() => localStorage.setItem('imach-assist', JSON.stringify({ sell: true, buy: true })));
const checks = [
  ['scr-53 موجود', await page.locator('#scr-53').count() === 1],
  ['sheet-qr موجود', await page.locator('#sheet-qr').count() === 1],
  ['dlg-addls موجود', await page.locator('#dlg-addls').count() === 1],
  ['sheet-pick الآن sheet است نه dlg', (await page.locator('#sheet-pick.sheet').count()) === 1 && (await page.locator('#sheet-pick.dlg').count()) === 0],
  ['nوار آمار ۰۱ = ۴ چیپ', await page.locator('#scr-01 .cat-stats button').count() === 4],
  ['QR رندر شد', await page.locator('#qr-svg rect').count() > 60],
];
await page.goto(FILE + '#53'); await page.reload(); await sleep(300);
checks.push(['۵۳ باز می‌شود', await page.locator('#scr-53').isVisible()]);
await page.goto(FILE + '#01'); await page.reload(); await sleep(300);
checks.push(['۰۱ بدون خطا + نudge مخفی', await page.locator('#cat-fresh').isHidden()]);
let bad = 0;
for (const [n, c] of checks) { if (!c) { bad++; console.log('  ✗ ' + n); } else console.log('  ✓ ' + n); }
if (errors.length) { bad++; console.log('  ✗ کنسول: ' + errors.slice(0, 3).join(' | ')); } else console.log('  ✓ کنسول پاک');
await browser.close();
process.exit(bad ? 1 : 0);
