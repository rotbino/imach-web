// فاز ۵۵ (نسخهٔ ادغام) — شات‌های راستی‌آزمایی بصری
import { chromium } from 'playwright';
import { mkdirSync } from 'fs';

const OUT = '/home/z/my-project/shots/phase55';
mkdirSync(OUT, { recursive: true });
const FILE = 'file://' + process.cwd() + '/index.html';
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 402, height: 874 }, deviceScaleFactor: 2 });

await page.goto(FILE);
await page.evaluate(() => localStorage.setItem('imach-assist', JSON.stringify({ sell: true, buy: true })));

/* ۱ — سربرگ کاتالوگ: آمار (پیش‌نمایش آخر) + کادر اشتراک */
await page.goto(FILE + '#01'); await page.reload(); await sleep(400);
await page.screenshot({ path: OUT + '/01-header.png' });

/* ۲ — کادر اعلان تازگی (بعد از تغییر سریع قیمت) — طراحی عمودی */
await page.click('#scr-01 .pcard .gear'); await sleep(350);
await page.fill('#qp-price', '۲٬۹۰۰٬۰۰۰'); await sleep(150);
await page.click('#qp-ok'); await sleep(450);
await page.screenshot({ path: OUT + '/02-nudge.png' });

/* ۳ — شیت مخاطبین سه‌حالته (از دکته کادر) */
await page.click('#cat-fresh .fn-share'); await sleep(450);
await page.screenshot({ path: OUT + '/03-cshare.png' });
await page.click('#sheet-cshare .btn[data-close]'); await sleep(250);

/* ۴ — منوی اشتراک (مخاطبین اول، بدون پیام آماده) */
await page.click('#scr-01 .cat-promo .cp-ic[data-sheet="sheet-share"]'); await sleep(400);
await page.screenshot({ path: OUT + '/04-sharemenu.png' });
await page.click('#sheet-share .btn[data-close]'); await sleep(250);

/* ۵ — پیش‌نمایش ۱۳ برای فروشنده */
await page.click('#scr-01 .cat-stats button[data-go="13"]'); await sleep(450);
await page.screenshot({ path: OUT + '/05-preview13.png' });

await browser.close();
console.log('shots → ' + OUT);
