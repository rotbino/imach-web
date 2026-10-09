// tools/phase34/shots.mjs — شات‌های فاز ۳۴ برای مستند
import { chromium } from 'playwright';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const URL = 'file://' + resolve(ROOT, 'index.html');
const OUT = resolve(ROOT, 'png/p34');

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1080, height: 900 }, deviceScaleFactor: 2 });
page.on('console', m => { if (m.type() === 'error') console.log('CONSOLE ERR:', m.text()); });
page.on('pageerror', e => console.log('PAGE ERR:', String(e)));

/* ۱) نوار نظرات با فلش «بعدی» (ابتدای نوار) */
await page.goto(URL + '#15');
await page.evaluate(() => { const sb = document.querySelector('#scr-15 .screen-body'); if (sb) sb.scrollTop = 640; });
await page.waitForTimeout(600);
await page.locator('.hs-wrap:has(#ts-row-15)').screenshot({ path: OUT + '/15-strip-arrows.png' });

/* ۲) وسط نوار — هر دو فلش */
await page.evaluate(() => { document.getElementById('ts-row-15').parentElement.querySelector('.hs-next').click(); });
await page.waitForTimeout(700);
await page.locator('.hs-wrap:has(#ts-row-15)').screenshot({ path: OUT + '/15-strip-mid.png' });

/* ۳) ساخت حساب — هدر + نوار پیشرفت مینیمال + فیلد نقش */
await page.goto(URL + '#16');
await page.waitForTimeout(400);
await page.locator('#scr-16 .screen-body').screenshot({ path: OUT + '/16-top.png' });

/* ۴) مدال شرایط — باز */
await page.click('#scr-16 .terms-lnk');
await page.waitForTimeout(400);
await page.locator('#dlg-terms').screenshot({ path: OUT + '/16-terms-modal.png' });

/* ۵) مدال اسکرول‌شده به ماده ۷ — سربرگ/پاص ثابت */
await page.evaluate(() => {
  const body = document.querySelector('#dlg-terms .tm-body');
  const h = Array.from(body.querySelectorAll('h4')).find(x => x.textContent.includes('ماده ۷'));
  if (h) h.scrollIntoView({ block: 'start' });
});
await page.waitForTimeout(300);
await page.locator('#dlg-terms').screenshot({ path: OUT + '/16-terms-scrolled.png' });
await page.click('#dlg-terms [data-termsok]');
await page.waitForTimeout(300);

/* ۶) ورود — هدر با آیکون راست‌گرد */
await page.goto(URL + '#17');
await page.waitForTimeout(300);
await page.locator('#scr-17 .subheader').screenshot({ path: OUT + '/17-header.png' });

await browser.close();
console.log('shots done →', OUT);
