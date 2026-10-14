// tools/phase35/shots.mjs — اسکرین‌شات‌های فاز ۳۵ برای بازبینی چشمی
import { chromium } from 'playwright';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdirSync } from 'node:fs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const URL = 'file://' + resolve(ROOT, 'index.html');
const OUT = resolve(ROOT, 'png', 'p35');
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1080, height: 900 } });

async function shot(name, fn) {
  await fn();
  await page.waitForTimeout(250);
  await page.locator('#phone').screenshot({ path: OUT + '/' + name + '.png' });
  console.log('✓', name);
}

await page.goto(URL + '#07');
await shot('07-profile', () => {});
await page.evaluate(() => { document.querySelector('#scr-07 .screen-body').scrollTop = 400; });
await shot('07-profile-bottom', () => {});

await page.goto(URL + '#14');
await shot('14-profile', () => {});

await page.goto(URL + '#04');
await shot('04-initial', () => {}); /* سوال بدون انتخاب، هیچ بخشی لود نیست */

await page.click('#scr-04 .pill[data-gmode="brand"]');
await shot('04-brand-products', () => {}); /* محصولات برند + ساخت محصول */

await page.click('#bp-list .bp-item:first-child .bp-row');
await page.click('#bp-list .bp-item:nth-child(2) .bp-row');
await shot('04-brand-multitick', () => {}); /* دو ردیف تیک‌خورده با مشخصات */

await page.click('#gf-refs [data-reveal="bp-newprod"]');
await page.fill('#bp-newprod-input', 'پفک اشی مشی · بسته خانواده');
await page.click('[data-bpnew]');
await shot('04-brand-newprod', () => {});

await page.click('#scr-04 .pill[data-gmode="felle"]');
await shot('04-felle-packaging', () => {}); /* فله: بسته‌بندی نوع + تعداد + توضیحات */

await page.click('#scr-04 .pill.pkg-other');
await shot('04-unitpick-sheet', async () => {}); /* شیت واحدها باز */
await page.click('#sheet-unitpick [data-close]');

await page.goto(URL + '#02'); /* رفتن به صفحهٔ دیگر، سپس بازگشت با ری‌لود کامل برای فرم تازه */
await page.goto(URL + '#04');
await page.reload();
await page.waitForTimeout(300);
await page.click('#scr-04 .pill[data-gmode="brand"]'); /* بدون انتخاب، بخش برند لود نمی‌شود */
await page.click('#scr-04 [data-sheet="sheet-brandpick"]');
await shot('04-brandpick-sheet', () => {});
await page.click('#sheet-brandpick .sheet-row[data-bname="چیتوز"]');
await shot('04-norefs', () => {}); /* برند بدون محصول — متن جدید */

await page.goto(URL + '#02');
await page.evaluate(() => { document.querySelector('#scr-02 .screen-body').scrollTop = 120; });
await shot('02-seller-notes', () => {}); /* کارت توضیحات فروشنده */

await browser.close();
console.log('DONE');
