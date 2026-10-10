// tools/shots.mjs — اسکرین‌شات‌های mvp-final برای داوری VLM
import { chromium } from 'playwright';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdirSync } from 'node:fs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const URL = 'file://' + resolve(ROOT, 'index.html');
const OUT = resolve(ROOT, 'shots');
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1080, height: 900 } });
page.on('console', (m) => { if (m.type() === 'error') console.log('CONSOLE-ERR:', m.text()); });
page.on('pageerror', (e) => console.log('PAGE-ERR:', String(e)));

const shot = (name) => page.locator('#phone').screenshot({ path: resolve(OUT, name + '.png') });
async function nav(h) { await page.goto(URL + '#' + h); await page.waitForTimeout(200); }

/* لندینگ */
await nav('/');
await shot('01-landing-top');
await page.locator('.landing').evaluate((el) => { el.scrollTop = el.scrollHeight * 0.35; }); await page.waitForTimeout(150);
await shot('02-landing-mid');
await page.locator('.landing').evaluate((el) => { el.scrollTop = el.scrollHeight; }); await page.waitForTimeout(150);
await shot('03-landing-foot');

/* ورود و ثبت‌نام — اول کاربر تازه (برای شات فرم ثبت‌نام) */
await page.locator('.land-cta-bar .btn').first().click(); await page.waitForTimeout(200);
await shot('04-login-phone');
await page.locator('#phoneIn').fill('09351112233'); await page.waitForTimeout(80);
await page.locator('.action-bar .btn.primary').click(); await page.waitForTimeout(250);
await shot('05-login-otp');
for (const i of [0, 1, 2, 3]) await page.locator('.otp-row input').nth(i).fill('8');
await page.locator('.action-bar .btn.primary').click(); await page.waitForTimeout(260);
await page.locator('#bizName').fill('سوپرمارکت آفتاب'); await page.waitForTimeout(60);
await page.locator('[data-act="login-role"][data-r="buyer"]').click(); await page.waitForTimeout(100);
await page.locator('[data-act="login-citypick"]').click(); await page.waitForTimeout(140);
await page.locator('[data-act="login-city"][data-c="رشت"]').click(); await page.waitForTimeout(140);
await page.locator('[data-act="login-indpick"]').click(); await page.waitForTimeout(140);
await page.locator('[data-act="login-ind"][data-i="super"]').click(); await page.waitForTimeout(160);
await shot('06-signup');

/* حساب نمونه */
await page.goto(URL); await page.waitForTimeout(120);
await page.evaluate(() => localStorage.removeItem('imach-mvp-final-v1'));
await nav('/login');
await page.locator('.action-bar .btn.primary').click(); await page.waitForTimeout(220);
for (const i of [0, 1, 2, 3]) await page.locator('.otp-row input').nth(i).fill('7');
await page.locator('.action-bar .btn.primary').click(); await page.waitForTimeout(320);
await shot('07-catalog');

await nav('/buy'); await shot('08-buy');
await nav('/board/r:r1'); await shot('09-board-ref');
await nav('/board/g:g4'); await shot('10-board-good');
await nav('/shop/b3'); await shot('11-shop-gated');
await nav('/board/g:g3'); await shot('12-board-empty-cta');
await nav('/prices');
await page.locator('.st-btn[data-d="-0.5"]').click(); await page.waitForTimeout(60);
await page.locator('.st-btn[data-d="-0.5"]').click(); await page.waitForTimeout(60);
await page.locator('.st-btn[data-d="-0.5"]').click(); await page.waitForTimeout(120);
await shot('13-prices-stepper');
await nav('/notes'); await shot('14-notes');
await nav('/profile'); await shot('15-profile');
await page.locator('[data-act="vis-open"]').click(); await page.waitForTimeout(160);
await page.locator('[data-act="vis-mode"][data-m="some"]').click(); await page.waitForTimeout(120);
await page.locator('[data-act="vis-ind"][data-i="super"]').click(); await page.waitForTimeout(80);
await page.locator('[data-act="vis-ind"][data-i="grocery"]').click(); await page.waitForTimeout(120);
await shot('16-vis-sheet');
await page.keyboard.press('Escape'); await page.waitForTimeout(100);
await nav('/add'); await shot('17-add-common');

console.log('DONE →', OUT);
await browser.close();
