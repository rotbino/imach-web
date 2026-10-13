// فاز ۶۲ — QA قطعی «پایان مهاجرت شبکهٔ تجاری خصوصی — پاک‌سازی پیام‌ها» — حکم مالک:
//  ۱) سیاست داخلی آیمچ هرگز برای کاربر فاش نمی‌شود — هیچ «بدون شبکه‌ای» در هیچ صفحه/شیتی نیست
//  ۲) ۰۵: کادر راهنما = پیام منفعت‌محور (دعوت از مشتریان → لیست مشتریان → فروش بالاتر)
//  ۳) راهنمای ۶۰ (خریدار): گام ۶ = قیمت‌های همیشه تازه — بدون افشا
//  ۴) راهنمای ۶۱ (فروشنده): گام ۶ = با دعوت از مشتریانت بفروش — بدون «هزار خریدار» (افشای cold-start)
//  ۵) دربارهٔ آیمچ (۴۲): پاراگراف دوم منفعت‌محور — مکانیک/سیاست حذف
//  ۶) فقط متن عوض شده — ساختار (netguide · ۶ گام · ۳ پاراگراف about) دست‌نخورده
import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';
import { mkdirSync } from 'node:fs';

const RB = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const FILE = 'file://' + resolve(RB, 'index.html');
const SHOTS = '/home/z/my-project/shots-p62';
mkdirSync(SHOTS, { recursive: true });
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 402, height: 874 } });
const errors = [];
page.on('pageerror', e => errors.push('pageerror: ' + e.message));
page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });

const shot = async (n) => { await page.screenshot({ path: SHOTS + '/' + n + '.png', clip: { x: 34, y: 0, width: 402, height: 874 } }); };
let ok = 0, bad = 0;
const T = (name, cond) => { if (cond) { ok++; } else { bad++; console.log('  ✗ ' + name); } };

/* ═══ ۰. جاروی سراسری — افشای سیاست داخلی در هیچ متنی نیست ═══ */
await page.goto(FILE + '#01'); await page.reload(); await sleep(400);
T('جارو: «بدون شبکه» در هیچ متن صفحه‌ای نیست', await page.evaluate(() => {
  const t = document.body.textContent;
  return !t.includes('بدون شبکه') && !t.includes('بدون\u200cشبکه');
}));
T('جارو: عبارت مکانیکی «در آیمچ ماندگار» (متن قدیمی about) نیست', await page.evaluate(() => !document.body.textContent.includes('در آیمچ ماندگار')));
T('جارو: «هزار خریدار» (افشای cold-start) نیست', await page.evaluate(() => !document.body.textContent.includes('هزار خریدار')));

/* ═══ ۱. صفحهٔ ۰۵ — کادر راهنمای منفعت‌محور ═══ */
await page.goto(FILE + '#05'); await sleep(400);
T('۰۵: کادر راهنما سرِ جایش (netguide#rq-guide)', (await page.locator('#rq-guide').count()) === 1 && (await page.locator('#rq-guide .ng-ic').count()) === 1);
T('۰۵: عنوان «با دعوت از مشتریانت، لیست مشتریانت را بساز»', (await page.locator('#rq-guide .ng-t').textContent()).includes('با دعوت از مشتریانت، لیست مشتریانت را بساز'));
T('۰۵: زیرمتن — قیمت‌های همیشه تازه + رسیدن درخواست‌ها', (await page.locator('#rq-guide .ng-s').textContent()).includes('قیمت\u200cهای همیشه تازه') && (await page.locator('#rq-guide .ng-s').textContent()).includes('درخواست\u200cهای خریدشان مستقیم به همین صفحه'));
T('۰۵: کادر بدون هیچ افشایی', !(await page.locator('#rq-guide').textContent()).includes('بدون شبکه'));
await page.evaluate(() => { const g = document.getElementById('rq-guide'); g?.scrollIntoView({ block: 'center' }); });
await shot('01-sell05-guide');

/* ═══ ۲. راهنمای خریدار (۶۰) — گام ۶ منفعت‌محور ═══ */
await page.goto(FILE + '#60'); await page.reload(); await sleep(400);
T('۶۰: هفت گام + کارت آغاز + قانون — ساختار سالم (فاز ۶۴: +گام سفارش)', (await page.locator('#scr-60 .gd-row').count()) === 7 && (await page.locator('#scr-60 .gd-lead').count()) === 1 && (await page.locator('#scr-60 .legend').count()) === 1);
T('۶۰: گام ۷ «قیمت\u200cهای همیشه تازه بگیر» (جابه‌جا شد)', (await page.locator('#scr-60 .gd-row').nth(6).textContent()).includes('قیمت\u200cهای همیشه تازه بگیر'));
T('۶۰: گام ۷ به «تأمین\u200cکنندگان من» اشاره می\u200cکند (هم\u200cزبان فاز ۶۰)', (await page.locator('#scr-60 .gd-row').nth(6).textContent()).includes('تأمین\u200cکنندگان من'));
T('۶۰: گام ۷ بدون افشا', !(await page.locator('#scr-60 .gd-row').nth(6).textContent()).includes('بدون شبکه'));
T('۶۰: گام‌های اصلی دست‌نخورده + گام ۴ «سفارش بده» تازه (فاز ۶۴)', (await page.locator('#scr-60 .gd-row').nth(0).textContent()).includes('لیست خریدت را بساز') && (await page.locator('#scr-60 .gd-row').nth(3).textContent()).includes('سفارش بده') && (await page.locator('#scr-60 .gd-row').nth(5).textContent()).includes('زنگوله'));
await page.evaluate(() => { const r = document.querySelectorAll('#scr-60 .gd-row')[6]; r?.scrollIntoView({ block: 'center' }); });
await shot('02-guide60-step6');

/* ═══ ۳. راهنمای فروشنده (۶۱) — گام ۶ منفعت‌محور ═══ */
await page.goto(FILE + '#61'); await page.reload(); await sleep(400);
T('۶۱: هفت گام + کارت آغاز + قانون — ساختار سالم (فاز ۶۴: +گام سفارش)', (await page.locator('#scr-61 .gd-row').count()) === 7 && (await page.locator('#scr-61 .gd-lead').count()) === 1 && (await page.locator('#scr-61 .legend').count()) === 1);
T('۶۱: گام ۷ «با دعوت از مشتریانت بفروش» (جابه‌جا شد)', (await page.locator('#scr-61 .gd-row').nth(6).textContent()).includes('با دعوت از مشتریانت بفروش'));
T('۶۱: گام ۷ — فروش بالاتر + قیمت تازه', (await page.locator('#scr-61 .gd-row').nth(6).textContent()).includes('فروشت را بالا ببر') && (await page.locator('#scr-61 .gd-row').nth(6).textContent()).includes('همیشه تازه'));
T('۶۱: حذف افشای cold-start («هزار خریدار» / «لازم نیست اول»)', !(await page.locator('#scr-61 .gd-row').nth(6).textContent()).includes('هزار خریدار') && !(await page.locator('#scr-61 .gd-row').nth(6).textContent()).includes('لازم نیست اول'));
T('۶۱: گام\u200cهای ۱ تا ۵ دست\u200cنخورده (گام ۵ = تبلیغ با ۴\u200c٬۰۰۰)', (await page.locator('#scr-61 .gd-row').nth(0).textContent()).includes('کاتالوگت را بساز') && (await page.locator('#scr-61 .gd-row').nth(2).textContent()).includes('سفارش‌های مشتریانت را بپذیر') && (await page.locator('#scr-61 .gd-row').nth(5).textContent()).includes('۴٬۰۰۰'));
await page.evaluate(() => { const r = document.querySelectorAll('#scr-61 .gd-row')[6]; r?.scrollIntoView({ block: 'center' }); });
await shot('03-guide61-step6');

/* ═══ ۴. دربارهٔ آیمچ (۴۲ → sheet-about) ═══ */
await page.goto(FILE + '#42'); await page.reload(); await sleep(400);
await page.click('#scr-42 [data-sheet="sheet-about"]'); await sleep(300);
T('شیت درباره باز شد', await page.locator('#sheet-about.show').isVisible());
T('درباره: ۳ پاراگراف + ردیف نسخه — ساختار دست‌نخورده', (await page.locator('#sheet-about .adg-p').count()) === 3 && (await page.locator('#sheet-about .grp').count()) === 1);
T('درباره: پاراگراف ۲ منفعت‌محور — «لیست مشتریانش»', (await page.locator('#sheet-about .adg-p').nth(1).textContent()).includes('لیست مشتریانش') && (await page.locator('#sheet-about .adg-p').nth(1).textContent()).includes('همیشه تازه'));
T('درباره: پاراگراف ۲ بدون «بدون شبکه» و بدون مکانیک عضویت', !(await page.locator('#sheet-about .adg-p').nth(1).textContent()).includes('بدون شبکه') && !(await page.locator('#sheet-about .adg-p').nth(1).textContent()).includes('عضویت هر طرف'));
T('درباره: پاراگراف ۱ و ۳ دست‌نخورده', (await page.locator('#sheet-about .adg-p').nth(0).textContent()).includes('قیمت چند شد؟') && (await page.locator('#sheet-about .adg-p').nth(2).textContent()).includes('رایگان'));
await shot('04-about-sheet');
await page.click('#sheet-about .btn[data-close]'); await sleep(250);

/* ═══ ۵. گشت ایمن — صفحات کلیدی بدون خطا ═══ */
for (const h of ['#08', '#10', '#13', '#45', '#48', '#62']) {
  await page.goto(FILE + h); await sleep(250);
}
T('گشت: هیچ خطای JS در کل مسیر', errors.length === 0);

/* ═══ ۶. سرریز — متن‌های جدید در هیچ محور نمی‌شکنند (جایگزین قطعیِ VLMِ این جلسه) ═══ */
await page.goto(FILE + '#05'); await page.reload(); await sleep(400);
T('سرریز: کادر ۰۵ بدون سرریز افقی', await page.evaluate(() => {
  const g = document.getElementById('rq-guide');
  const sb = document.querySelector('#scr-05 .screen-body');
  return g.scrollWidth <= g.clientWidth + 1 && sb.scrollWidth <= sb.clientWidth + 1;
}));
await page.goto(FILE + '#60'); await page.reload(); await sleep(350);
T('سرریز: ۶۰ بدون سرریز (صفحه + گام ۶)', await page.evaluate(() => {
  const sb = document.querySelector('#scr-60 .screen-body');
  const r = document.querySelectorAll('#scr-60 .gd-row')[5];
  return sb.scrollWidth <= sb.clientWidth + 1 && r.scrollWidth <= r.clientWidth + 1;
}));
await page.goto(FILE + '#61'); await page.reload(); await sleep(350);
T('سرریز: ۶۱ بدون سرریز (صفحه + گام ۶)', await page.evaluate(() => {
  const sb = document.querySelector('#scr-61 .screen-body');
  const r = document.querySelectorAll('#scr-61 .gd-row')[5];
  return sb.scrollWidth <= sb.clientWidth + 1 && r.scrollWidth <= r.clientWidth + 1;
}));
await page.goto(FILE + '#42'); await page.reload(); await sleep(350);
await page.click('#scr-42 [data-sheet="sheet-about"]'); await sleep(300);
T('سرریز: شیت درباره بدون سرریز افقی', await page.evaluate(() => {
  const sh = document.getElementById('sheet-about');
  return sh.scrollWidth <= sh.clientWidth + 1;
}));
await page.click('#sheet-about .btn[data-close]'); await sleep(250);

await browser.close();
console.log('\n═══ فاز ۶۲ ═══');
console.log('PASS: ' + ok + ' / FAIL: ' + bad);
if (errors.length) console.log('ERRORS:\n' + errors.join('\n'));
process.exit(bad ? 1 : 0);
