// فاز ۶۰ — اسموک سریع: بوت بدون خطا + رندر ۶۲ + فوترها + ردیف در انتظار عضویت
import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';

const RB = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const FILE = 'file://' + resolve(RB, 'index.html');
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 402, height: 874 } });
const errors = [];
page.on('pageerror', e => errors.push('pageerror: ' + e.message));
page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });

await page.goto(FILE + '#62'); await page.reload(); await sleep(400);
console.log('boot #62 errors:', errors.length, errors.slice(0, 3));
console.log('62 visible:', await page.locator('#scr-62').isVisible());
console.log('cust rows:', await page.locator('#cust-rows .row-card').count());
console.log('new chips:', await page.locator('#cust-rows .cust-new').count());
console.log('stats:', (await page.locator('#scr-62 .cust-stats').textContent()).trim());

await page.goto(FILE + '#01'); await page.reload(); await sleep(300);
console.log('01 footer cols:', await page.locator('#scr-01 .tabbar').getAttribute('data-cols'));
console.log('01 tabs text:', (await page.locator('#scr-01 .tabbar').textContent()).replace(/\s+/g, ' ').trim());
console.log('01 cust stat:', (await page.locator('#scr-01 .cat-stats button').nth(1).textContent()).trim());
await page.locator('#scr-01 .cat-stats button').nth(1).click(); await sleep(350);
console.log('click stat → hash:', await page.evaluate(() => location.hash), '62 visible:', await page.locator('#scr-62').isVisible());

await page.goto(FILE + '#08'); await page.reload(); await sleep(300);
console.log('08 footer:', (await page.locator('#scr-08 .tabbar').textContent()).replace(/\s+/g, ' ').trim());

await page.goto(FILE + '#10'); await page.reload(); await sleep(300);
console.log('10 title:', (await page.locator('#scr-10 .ttl').textContent()).trim());
console.log('10 rows:', await page.locator('#saved-cats > .row-card').count(), 'wait:', await page.locator('#saved-cats > .sup-wait').count());

// بج فوتر پس از ترک ۶۲
await page.goto(FILE + '#62'); await page.reload(); await sleep(300);
console.log('badge on 62 tab (before leave):', await page.locator('#scr-62 .tab[data-go="62"] .badge').count());
await page.click('#scr-62 .tab[data-go="01"]'); await sleep(300);
console.log('badge on 01 tab (after leave):', await page.locator('#scr-01 .tab[data-go="62"] .badge').count());
await page.click('#scr-01 .tab[data-go="62"]'); await sleep(300);
console.log('chips after revisit:', await page.locator('#cust-rows .cust-new').count());

// منوی مشتری + حذف
await page.click('#cust-rows .row-card [data-cdots]'); await sleep(300);
console.log('custmenu open:', await page.locator('#sheet-custmenu.show').isVisible(), 'title:', await page.locator('#custmenu-title').textContent());
await page.click('#sheet-custmenu [data-custdel]'); await sleep(300);
console.log('dlg open:', await page.locator('#dlg-custdel.show').isVisible());
await page.click('#dlg-custdel [data-custdelok]'); await sleep(300);
console.log('rows after delete:', await page.locator('#cust-rows .row-card').count(), 'stats:', (await page.locator('#cust-n').textContent()));

await page.goto(FILE + '#07'); await page.reload(); await sleep(300);
await page.click('#scr-07 [data-sheet="sheet-reach"]'); await sleep(300);
console.log('reach sheet:', (await page.locator('#sheet-reach h3').textContent()).trim(), '|', (await page.locator('#reach-sub').textContent()).trim());

console.log('TOTAL ERRORS:', errors.length, errors.slice(0, 5));
await browser.close();
