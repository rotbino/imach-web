// tools/phase39/shots.mjs — اسکرین‌شات‌های فاز ۳۹ برای بازبینی بصری
import { chromium } from 'playwright';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const URL = 'file://' + resolve(ROOT, 'index.html');
const OUT = resolve(ROOT, 'png', 'p39');

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1080, height: 900 } });
page.on('console', m => { if (m.type() === 'error') console.log('ERR:', m.text()); });

// ۱) صفحهٔ ۴۴ حالت اولیه (بدون نوار چیپ؛ آیکون‌های ٪ و اکسل)
await page.goto(URL + '#44');
await page.waitForTimeout(400);
await page.screenshot({ path: OUT + '/44-initial.png' });

// ۲) مدال درصدی باز + ۲٫۵٪ با استپر
await page.click('#scr-44 .bk-pct');
await page.waitForTimeout(300);
for (let i = 0; i < 5; i++) await page.click('.pct-plus');
await page.waitForTimeout(250);
await page.screenshot({ path: OUT + '/44-pct-modal.png' });

// ۳) اعمال ۲٫۵٪ → ردیف‌ها سبز
await page.click('#pct-apply');
await page.waitForTimeout(300);
await page.screenshot({ path: OUT + '/44-pct-applied.png' });

// ۴) مدال اکسل بازشده (آپلود بالا، دانلود پایین)
await page.click('#scr-44 .bk-xls');
await page.waitForTimeout(300);
await page.screenshot({ path: OUT + '/44-xls-modal.png' });
await page.click('#dlg-xlsbulk [data-close]');
await page.waitForTimeout(200);

// ۵) بخش تخفیف‌ها بازشده (اسکرول تا پایین)
await page.click('.disc-toggle');
await page.waitForTimeout(300);
await page.evaluate(() => document.querySelector('.disc-toggle').scrollIntoView({ block: 'center' }));
await page.waitForTimeout(150);
await page.screenshot({ path: OUT + '/44-disc-open.png' });
await page.evaluate(() => document.getElementById('bk-disc').scrollIntoView({ block: 'end' }));
await page.waitForTimeout(150);
await page.screenshot({ path: OUT + '/44-disc-bottom.png' });

// ۶) یک تخفیف تغییرکرده (سبز) + شمارنده
await page.evaluate(() => {
  const rows = document.querySelectorAll('#bk-disc .disc-row');
  const inp = rows[1].querySelector('[data-discinput]');
  inp.value = '۸';
  inp.dispatchEvent(new Event('input', { bubbles: true }));
  const inp2 = rows[4].querySelector('[data-discinput]');
  inp2.value = '۴٫۵';
  inp2.dispatchEvent(new Event('input', { bubbles: true }));
});
await page.waitForTimeout(200);
await page.screenshot({ path: OUT + '/44-disc-changed.png' });

await browser.close();
console.log('shots saved to', OUT);
