// tools/phase33/shots.mjs — شات‌های دقیق فاز ۳۳ برای VLM (المان‌محور)
import { chromium } from 'playwright';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const URL = 'file://' + resolve(ROOT, 'index.html');
const OUT = resolve(ROOT, 'png/p33');

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1080, height: 900 }, deviceScaleFactor: 2 });
page.on('console', m => { if (m.type() === 'error') console.log('CONSOLE ERR:', m.text()); });
page.on('pageerror', e => console.log('PAGE ERR:', String(e)));

await page.goto(URL + '#15');
await page.evaluate(() => localStorage.removeItem('imach-assist'));
await page.reload();
await page.waitForTimeout(500);

/* ثبت یک نظر واقعی تا حالت fresh دیده شود */
await page.click('#ts-row-15 .ts-cta .ts-btn');
await page.waitForTimeout(320);
await page.fill('#rvw-name', 'پیمان شریفی');
await page.fill('#rvw-biz', 'رستوران زیتون');
await page.fill('#rvw-text', 'با درخواست خرید یک‌فرمه، مواد اولیه هفته‌ام رو یک‌جا از چند تأمین‌کننده می‌گیرم.');
await page.click('#dlg-rvw .pillchoice .pill[data-rrole="buy"]');
await page.click('#dlg-rvw [data-rvwsend]');
await page.waitForTimeout(700);

await page.locator('#ts-row-15').screenshot({ path: OUT + '/strip-after-submit.png' });
await page.locator('#ts-row-15 .ts-card.fresh').screenshot({ path: OUT + '/fresh-card.png' });
const freshBg = await page.evaluate(() => getComputedStyle(document.querySelector('#ts-row-15 .ts-card.fresh')).backgroundColor);
console.log('fresh bg =', freshBg);

/* مودال باز + خطای اعتبارسنجی */
await page.click('#ts-row-15 .ts-cta .ts-btn');
await page.waitForTimeout(320);
await page.click('#dlg-rvw [data-rvwsend]');
await page.waitForTimeout(200);
await page.locator('#dlg-rvw').screenshot({ path: OUT + '/dlg-rvw-error.png' });
await browser.close();
