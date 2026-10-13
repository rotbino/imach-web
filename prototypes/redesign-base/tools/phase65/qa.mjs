// فاز ۶۵ — QA قطعی «رفع آیکون‌های سفارش‌ها + شبکهٔ باز و بسته + گروه‌های مشتری» روی مبنای فاز ۶۴ ریموت
// حکم‌های مالک:
//  ۱) باگ گزارشی: «صفحه سفارش‌های من آیکون‌هاش به شدت بزرگ شده» — ریشه: خانوادهٔ .inq-* به #scr-45 اسکوپ بود
//  ۲) شبکهٔ باز/بسته: اختیاری + با شرایط (مسیر فعالیت / پرداخت به‌زودی) + چیزی می‌دهید چیزی می‌گیرید
//  ۳) گروه‌های مشتری روی ۶۲ (مثل قبل) + تخفیف گروه‌ها در کاتالوگ + قیمت گروهی خریدار
// درس‌های QA: بدون reload که state زنده را می‌شوید؛ قفل/باز از خود UI
import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';
import { mkdirSync } from 'node:fs';

const RB = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const FILE = 'file://' + resolve(RB, 'index.html');
const SHOTS = '/home/z/my-project/shots-p65';
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

/* ═══ ۰. باگ آیکون‌های غول‌آسای ۶۴/۶۵ (گزارش مالک) ═══ */
await page.goto(FILE + '#64'); await page.reload(); await sleep(450);
T('۶۴: هیچ svgی بزرگ‌تر از ۲۴px نیست (باگ آیکون‌ها رفع)', await page.evaluate(() =>
  [...document.querySelectorAll('#scr-64 svg')].every(s => s.getBoundingClientRect().width <= 24 && s.getBoundingClientRect().height <= 24)));
T('۶۴: آیکون‌های کارت سفارش جمع‌وجور (≤۱۲px)', await page.evaluate(() =>
  [...document.querySelectorAll('#scr-64 .inq-meta .mm svg')].every(s => s.getBoundingClientRect().width <= 12)));
T('۶۴: کارت‌های سفارش قاب‌دار رندر شدند (unscope .inq-*)', await page.evaluate(() => {
  const c = document.querySelector('#ord-rows-buy .inq-card');
  return c && getComputedStyle(c).borderRadius !== '0px' && getComputedStyle(c).backgroundColor !== 'rgba(0, 0, 0, 0)';
}));
T('۶۴: بایگانی استایل گرفته', await page.evaluate(() => {
  const d = document.querySelector('#ord-done-buy .inq-done');
  return d && getComputedStyle(d).display === 'flex';
}));
await shot('01-64-icons-fixed');
await page.goto(FILE + '#65'); await page.reload(); await sleep(450);
T('۶۵: هیچ svgی بزرگ‌تر از ۲۴px نیست', await page.evaluate(() =>
  [...document.querySelectorAll('#scr-65 svg')].every(s => s.getBoundingClientRect().width <= 24 && s.getBoundingClientRect().height <= 24)));
T('۶۵: تب پیام‌ها از symbol آمده (نه svg اینلاین)', await page.evaluate(() =>
  [...document.querySelectorAll('#scr-65 .tabbar .tab svg use')].every(u => !!u.getAttribute('href'))));
await shot('02-65-icons-fixed');

/* ═══ ۱. گروه‌های مشتری روی ۶۲ ═══ */
await page.goto(FILE + '#62'); await page.reload(); await sleep(450);
T('۶۲: چیپ‌بار (همه + ۳ گروه با شمار + +)', await page.evaluate(() => {
  const chips = [...document.querySelectorAll('#cg-bar .chip')];
  return chips.length === 4 && chips[1].textContent.includes('خرده‌فروشی') && chips[1].textContent.includes('۲') && document.querySelectorAll('#cg-bar .cg-add').length === 1;
}));
T('۶۲: بج گروه روی ردیف آریا (خرده‌فروشی)', (await page.locator('#cust-rows .row-card').nth(1).textContent()).includes('خرده‌فروشی'));
await shot('04-62-groups');
await page.locator('#cg-bar .chip').nth(2).click(); await sleep(250);
T('فیلتر رستوران‌ها = ۲', (await page.locator('#cust-rows .row-card').count()) === 2);
await page.locator('#cg-bar .chip').nth(1).click(); await sleep(250);
T('فیلتر خرده‌فروشی = ۲', (await page.locator('#cust-rows .row-card').count()) === 2);
await page.locator('#cg-bar .chip').nth(0).click(); await sleep(250);
T('همه = ۶', (await page.locator('#cust-rows .row-card').count()) === 6);
/* گروه جدید */
await page.click('#cg-bar .cg-add'); await sleep(300);
await page.fill('#cgn-name', 'قنادی‌ها');
await page.click('[data-cgnewok]'); await sleep(300);
T('گروه جدید در چیپ‌بار (۵ چیپ)', (await page.locator('#cg-bar .chip').count()) === 5 && (await page.locator('#cg-bar').textContent()).includes('قنادی\u200cها'));
/* انتساب گروه از منو */
await page.locator('#cust-rows .row-card [data-cdots]').nth(1).click(); await sleep(300);
T('منو: ردیف «گروه مشتری» + گروه فعلی', (await page.locator('#custmenu-grp').textContent()).includes('خرده‌فروشی'));
await page.click('#sheet-custmenu [data-cgset]'); await sleep(300);
T('شیت انتساب: بدون گروه + ۴ گروه', (await page.locator('#cga-rows .pk-row').count()) === 5);
await page.locator('#cga-rows .pk-row[data-cgap="3"]').click(); await sleep(300);
T('انتساب قنادی‌ها → بج روی ردیف', (await page.locator('#cust-rows .row-card').nth(1).textContent()).includes('قنادی\u200cها'));

/* ═══ ۲. تخفیف گروهی — از تنظیمات کالا (۰۲ بازوی فروش) ═══ */
await page.goto(FILE + '#02'); await sleep(350);
await page.evaluate(() => { document.getElementById('phone').dataset.arm = 'sell'; });
await page.goto(FILE + '#01'); await sleep(300);
await page.goto(FILE + '#02'); await sleep(400);
T('۰۲: دکتهٔ «تنظیمات کالا» هست', (await page.locator('#scr-02 [data-sheet="sheet-pset"]').count()) === 1);
await page.locator('#scr-02 [data-sheet="sheet-pset"]').first().click(); await sleep(300);
T('pset: ردیف «تخفیف گروه‌های مشتری»', (await page.locator('#sheet-pset [data-sheet="sheet-cgdisc"]').count()) === 1);
await page.click('#sheet-pset [data-sheet="sheet-cgdisc"]'); await sleep(300);
T('شیت تخفیف: ردیف هر گروه + قیمت گروهی', (await page.locator('#cgdisc-rows .cg-disc-row').count()) === 4 && (await page.locator('#cgdisc-rows').textContent()).includes('۲٬۶۲۲٬۰۰۰'));
await page.fill('#cgd-3', '10'); /* قنادی‌ها — گروه تازهٔ آریا */
await page.click('[data-cgdiscok]'); await sleep(300);
T('ذخیره: زیرنویس pset هم‌گام', (await page.locator('#cgdisc-sub').textContent()).includes('قیمت مخصوص'));
await shot('05-cgdisc');

/* ═══ ۳. قیمت گروهی خریدار روی ۱۳ و ۰۲ (٪۱۰ قنادی‌ها) — بدون reload ═══ */
await page.goto(FILE + '#08'); await sleep(350); /* ورود به ۰۸ = بازوی خرید */
await page.goto(FILE + '#13'); await sleep(400);
T('۱۳: قیمت گروهی ٪۱۰ → ۲٬۵۶۵٬۰۰۰ + بج گروه', await page.evaluate(() => {
  const p = document.getElementById('p13-hash');
  const g = document.getElementById('grp-13');
  return p.textContent.includes('۲٬۵۶۵٬۰۰۰') && p.querySelector('s') !== null && g.textContent.includes('٪۱۰') && g.textContent.includes('قنادی\u200cها');
}));
await shot('06-13-grpprice');
await page.goto(FILE + '#02'); await sleep(400);
T('۰۲: قیمت بزرگ خط‌خورده + بج گروه + یادداشت سفارش', await page.evaluate(() => {
  const p = document.getElementById('plg-02');
  const g = document.getElementById('grp-02');
  return p.textContent.includes('۲٬۵۶۵٬۰۰۰') && g.textContent.includes('٪۱۰') && g.textContent.includes('نسخهٔ نهایی در سفارش');
}));

/* ═══ ۴. شبکهٔ باز و بسته — درگاه با شرایط ═══ */
await page.goto(FILE + '#01'); await page.reload(); await sleep(350);
await page.click('#scr-01 .cat-set'); await sleep(300);
T('cset: ردیف «شبکه باز و بسته»', (await page.locator('#sheet-cset [data-sheet="sheet-netopen"]').count()) === 1);
await page.click('#sheet-cset [data-sheet="sheet-netopen"]'); await sleep(300);
T('شیت: توضیح «چیزی می‌دهید، چیزی می‌گیرید» + اختیاری', await page.evaluate(() =>
  document.getElementById('net-explain').textContent.includes('چیزی می\u200cدهید، چیزی می\u200cگیرید') && document.getElementById('net-explain').textContent.includes('کاملاً اختیاری')));
T('شرایط: ۳ ردیف + مسیر پرداخت «به‌زودی»', (await page.locator('#net-req .net-r').count()) === 3 && (await page.locator('#net-req .net-pay').count()) === 1 && (await page.locator('#net-req .net-pay').textContent()).includes('به‌زودی'));
T('seed: تعاملات ۴ از ۵ → سوییچر مخفی', await page.evaluate(() =>
  document.getElementById('net-req').textContent.includes('۴') && document.getElementById('net-swrow').hidden === true));
await shot('03-netopen-gated');
/* حلقهٔ زنده: پذیرش یک سفارش در ۶۵ → شرایط کامل → سوییچر پیدا */
await page.click('#sheet-netopen .btn[data-close]'); await sleep(250);
await page.goto(FILE + '#65'); await sleep(400);
await page.locator('#ord-rows-sell .inq-card').first().click(); await sleep(350);
T('۶۵: شیت مدیریت سفارش باز شد', await page.locator('#sheet-ordmgr').isVisible());
await page.click('[data-ordok]'); await sleep(400);
await page.goto(FILE + '#01'); await sleep(350);
await page.click('#scr-01 .cat-set'); await sleep(300);
await page.click('#sheet-cset [data-sheet="sheet-netopen"]'); await sleep(300);
T('بعد از پذیرش سفارش: تعاملات ۵ → سوییچر پیدا', await page.evaluate(() => document.getElementById('net-swrow').hidden === false));
await page.click('#netopen-sw'); await sleep(300);
T('سوییچر روشن + زیرنویس باز', (await page.locator('#netopen-sw.on').count()) === 1 && (await page.locator('#netopen-sub').textContent()).includes('باز است'));
T('شرایط مخفی شد (باز است)', await page.locator('#net-req').isHidden());
await page.click('#sheet-netopen .btn[data-close]'); await sleep(250);
T('۰۱: چیپ «شبکه باز» کنار چیپ خصوصی', await page.locator('#net-chip').isVisible());
await shot('07-01-netchip');

/* ═══ ۵. ردیف‌های شبکهٔ باز در تابلوی تأمین ۰۹ ═══ */
await page.goto(FILE + '#08'); await sleep(350); /* بازوی خرید — بدون reload */
await page.goto(FILE + '#09'); await sleep(400);
T('۰۹: ۲ ردیف شبکهٔ باز + بج + شمار «+ ۲ شبکهٔ باز»', (await page.locator('#net-rows-09 .supplier-card').count()) === 2 && (await page.locator('#net-rows-09').textContent()).includes('شبکه باز') && (await page.locator('#sup-count-09').textContent()).includes('۲ شبکهٔ باز'));
T('۰۹: لجند «تأمین‌کنندگانی که شبکه‌شان را باز کرده‌اند»', (await page.locator('.net-legend').textContent()).includes('باز کرده\u200cاند'));
await shot('08-09-openrows');
/* بستن شبکه = مخفی */
await page.goto(FILE + '#01'); await sleep(300);
await page.click('#scr-01 .cat-set'); await sleep(300);
await page.click('#sheet-cset [data-sheet="sheet-netopen"]'); await sleep(300);
await page.click('#netopen-sw'); await sleep(300);
T('بستن: زیرنویس cset «بسته»', (await page.locator('#netopen-cset-sub').textContent()).includes('بسته'));
await page.click('#sheet-netopen .btn[data-close]'); await sleep(250);
await page.goto(FILE + '#08'); await sleep(300);
await page.goto(FILE + '#09'); await sleep(400);
T('۰۹ بسته: ردیف‌ها مخفی + شمار عادی', await page.locator('#net-rows-09').isHidden() && (await page.locator('#sup-count-09').textContent()).includes('۳ تأمین\u200cکنندهٔ شما'));
T('۰۱ بسته: چیپ شبکه پنهان', await page.locator('#net-chip').isHidden());

/* ═══ ۶. درگاه خصوصی: دکتهٔ «ثبت سفارش» هم قفل می‌شود ═══ */
await page.goto(FILE + '#01'); await page.reload(); await sleep(350);
await page.click('#scr-01 .cat-set'); await sleep(300);
await page.click('#catpriv-sw'); await sleep(300);
await page.click('#sheet-cset .btn[data-close]'); await sleep(250);
await page.goto(FILE + '#08'); await sleep(350); /* بازوی خرید — بدون reload */
await page.goto(FILE + '#10'); await sleep(400);
await page.click('#saved-cats .row-card [data-sheet="sheet-catmenu"] >> nth=0'); await sleep(300);
await page.click('#sheet-catmenu [data-catdel]'); await sleep(350);
await page.goto(FILE + '#13'); await sleep(400);
T('درگاه: دکتهٔ «ثبت سفارش» مخفی (قیمت قفل)', await page.evaluate(() =>
  getComputedStyle(document.querySelector('#buybar-13 [data-order]')).display === 'none'));
T('درگاه: دکتهٔ «ذخیره» می‌ماند (مسیر بازگشت)', await page.evaluate(() =>
  getComputedStyle(document.querySelector('#buybar-13 [data-catsave]')).display !== 'none'));
await page.click('#priv13-save'); await sleep(450);
T('ذخیره از درگاه: دکتهٔ سفارش برگشت', await page.evaluate(() =>
  getComputedStyle(document.querySelector('#buybar-13 [data-order]')).display !== 'none'));

console.log('\nRESULT: ' + ok + '/' + (ok + bad));
console.log(errors.length ? 'ERRORS:\n' + errors.join('\n') : 'NO CONSOLE/PAGE ERRORS');
await browser.close();
process.exit(bad ? 1 : 0);
