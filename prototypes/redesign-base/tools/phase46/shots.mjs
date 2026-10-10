// فاز ۴۵ — اسکرین‌شات فرم تبلیغ ساده (۳۰) + شیت راهنما + گزارش تبلیغ (۴۵) + شارژ (۲۹)
import { chromium } from 'playwright';
import { mkdirSync } from 'fs';

const FILE = 'file://' + process.cwd() + '/index.html';
const OUT = 'png/p46';
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 402, height: 874 } });
await page.goto(FILE);
await page.evaluate(() => { localStorage.setItem('imach-assist', JSON.stringify({ sell: true, buy: true })); });
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// ۳۰ — فرم ساده
await page.goto(FILE + '#30'); await page.reload(); await sleep(320);
await page.screenshot({ path: OUT + '/30-ads-simple.png' });
console.log('shot 30-ads-simple');

// ۳۰ — شیت راهنما باز
await page.click('#scr-30 .guidebox[data-sheet="sheet-adguide"]'); await sleep(420);
await page.screenshot({ path: OUT + '/30-guide-sheet.png' });
console.log('shot 30-guide-sheet');
await page.click('#sheet-adguide .sheet-cta'); await sleep(250);

// ۳۰ — حالت خاموش (زیرنویس سوییچ)
await page.click('#ad-toggle'); await sleep(200);
await page.screenshot({ path: OUT + '/30-ads-off.png' });
console.log('shot 30-ads-off');
await page.click('#ad-toggle'); await sleep(200);

// ۴۵ — گزارش تبلیغ
await page.goto(FILE + '#46'); await page.reload(); await sleep(320);
await page.screenshot({ path: OUT + '/45-ad-report.png' });
console.log('shot 45-ad-report');

// ۲۹ — شارژ با قیمت‌های جدید
await page.goto(FILE + '#29'); await page.reload(); await sleep(320);
await page.screenshot({ path: OUT + '/29-charge-new.png' });
console.log('shot 29-charge-new');

// ۲۷ — اعلان با رویداد جدید
await page.goto(FILE + '#27'); await page.reload(); await sleep(320);
await page.screenshot({ path: OUT + '/27-notif-new.png' });
console.log('shot 27-notif-new');

await browser.close();
console.log('done');
