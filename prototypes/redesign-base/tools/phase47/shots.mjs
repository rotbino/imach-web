// فاز ۴۷ — اسکرین‌شات: فرم پیشنهاد (۴۷) · مقایسهٔ تک/چندقلمی (۴۸) · شیت درخواست چندقلمی ·
// سازندهٔ استعلام (۱۲) · ۴۵ با «استعلام جدید» · ۰۹ پاکسازی‌شده · ۴۲ پروفایل · ۳۰ فاصله‌ها · هدر ۰۱
import { chromium } from 'playwright';
import { mkdirSync } from 'fs';

const FILE = 'file://' + process.cwd() + '/index.html';
const OUT = 'png/p47';
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 402, height: 874 } });
await page.goto(FILE);
await page.evaluate(() => { localStorage.setItem('imach-assist', JSON.stringify({ sell: true, buy: true })); });
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// ۰۱ — هدر: پیل پس‌زمینه‌دار + آیکون پروفایل
await page.goto(FILE + '#01'); await page.reload(); await sleep(350);
await page.screenshot({ path: OUT + '/01-header.png' });
console.log('shot 01-header');

// ۰۹ — تابلوی پاکسازی‌شده (سورت ایمچ + تماس/کاتالوگ/ذخیره)
await page.goto(FILE + '#09'); await page.reload(); await sleep(350);
await page.screenshot({ path: OUT + '/09-supply-board.png' });
console.log('shot 09-supply-board');

// ۱۲ — سازندهٔ استعلام چندقلمی (برنج + روغن)
await page.goto(FILE + '#12'); await page.reload(); await sleep(350);
await page.click('#iq-add'); await sleep(200);
await page.fill('#iq-q', 'روغن'); await sleep(250);
await page.click('#iq-res .gf-row >> nth=0'); await sleep(300);
await page.screenshot({ path: OUT + '/12-composer-multi.png' });
console.log('shot 12-composer-multi');

// ۴۵ — استعلام‌ها + دکمهٔ استعلام جدید
await page.goto(FILE + '#45'); await page.reload(); await sleep(350);
await page.screenshot({ path: OUT + '/45-inquiries.png' });
console.log('shot 45-inquiries');

// ۴۸ — تک‌قلمی (برنج)
await page.click('#scr-45 .inq-card[data-inq="inq1"]'); await sleep(400);
await page.screenshot({ path: OUT + '/48-offers-single.png' });
console.log('shot 48-offers-single');

// ۴۸ — چندقلمی (۳ قلم: پوشش + دو عدد خلاصه + فیلتر)
await page.goto(FILE + '#45'); await page.reload(); await sleep(350);
await page.click('#scr-45 .inq-card[data-inq="inq2"]'); await sleep(400);
await page.screenshot({ path: OUT + '/48-offers-multi.png' });
console.log('shot 48-offers-multi');

// ۴۸ — چندقلمی + فیلتر «فقط پوشش کامل»
await page.click('#of48-sort .of48-full'); await sleep(300);
await page.screenshot({ path: OUT + '/48-offers-filtered.png' });
console.log('shot 48-offers-filtered');

// ۰۵ — درخواست‌های فروشنده (کارت ۳ قلمی)
await page.goto(FILE + '#05'); await page.reload(); await sleep(350);
await page.screenshot({ path: OUT + '/05-requests.png' });
console.log('shot 05-requests');

// شیت درخواست چندقلمی (۲ از ۳ قلم نزد شما)
await page.click('#scr-05 .req-card[data-req="rq2"]'); await sleep(450);
await page.screenshot({ path: OUT + '/sheet-reqview-multi.png' });
console.log('shot sheet-reqview-multi');

// ۴۷ — فرم پیشنهاد قیمت (فروشنده، ۲ قلم)
await page.click('#sheet-reqview .sheet-cta[data-go="47"]'); await sleep(450);
await page.screenshot({ path: OUT + '/47-offer-form.png' });
console.log('shot 47-offer-form');

// ۴۲ — پروفایل (فاصله‌ها + آیکون‌های جمع‌وجور)
await page.goto(FILE + '#42'); await page.reload(); await sleep(350);
await page.screenshot({ path: OUT + '/42-profile.png' });
console.log('shot 42-profile');

// ۳۰ — فرم تبلیغ با فاصله‌گذاری
await page.goto(FILE + '#30'); await page.reload(); await sleep(350);
await page.screenshot({ path: OUT + '/30-ads-spacing.png' });
console.log('shot 30-ads-spacing');

await browser.close();
console.log('done');
