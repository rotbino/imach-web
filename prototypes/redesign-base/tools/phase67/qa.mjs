// فاز ۶۷ (مالک) — QA قطعی «سبد سفارش + تنظیمات خرید بازگشت + گروه‌ها/سطوح/فیلتربار»
// حکم‌های مالک:
//  ۱) سفارش = فروشگاه اینترنتی: سبد خرید روی کاتالوگ، کالا با تعداد، ارسال یکجا به تأمین‌کننده؛ پرداخت بیرون
//  ۲) صفحهٔ ۱۴ «تنظیمات خرید» که در فاز ۴۵ حذف شده بود بازگشت (تب پنجم فوتر خرید)
//  ۳) گروه‌های مشتری: سطوح ۱..۵ · خودانتسابی گروه توسط مشتری · فیلتر گروه+صنف در نوار فیلتر (الگوی دیوار)
// فاز ۶۸: سبد = آیکون هدر (نه buybar) · نوار فیلتر = دو دکتهٔ مجزا با شیت انتخاب · گروه‌های دمو رابطه‌ای شدند
// درس‌های QA: بدون reload که state زنده را می‌شوید؛ مسیرهای UIمحور؛ سلکتورهای فارسی با includes
import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';
import { mkdirSync } from 'node:fs';

const RB = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const FILE = 'file://' + resolve(RB, 'index.html');
const SHOTS = '/home/z/my-project/shots-p67';
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
const vis = async (sel) => await page.locator(sel).first().isVisible().catch(() => false);

/* ═══ ۱. سبد سفارش روی کاتالوگ (۱۳) — بازوی خرید ═══ */
await page.goto(FILE + '#08'); await page.reload(); await sleep(450);
await page.goto(FILE + '#13'); await sleep(450);
T('۱۳: آیکون سبد در هدر (کنار اشتراک)', await vis('#scr-13 .subheader [data-cartopen]'));
T('۱۳: buybar دیگر دکتهٔ سبد ندارد', await page.locator('#buybar-13 [data-cartopen]').count() === 0);
T('۱۳: چهار دکتهٔ «افزودن به سبد» روی کارت‌ها', await page.locator('#scr-13 .pcard .addcart').count() === 4);
T('۱۳: بج سبد در حالت خالی مخفی است', await page.evaluate(() => getComputedStyle(document.getElementById('cart-badge-13')).display === 'none'));
T('۱۳: شمار کارت‌ها در حالت خالی مخفی', await page.evaluate(() => getComputedStyle(document.querySelector('.addcart .cart-n')).display === 'none'));
T('۱۳: شیت سفارش متنی قدیمی حذف شد', await page.locator('#sheet-order').count() === 0);
T('۱۳: ردیف «گروه خرید من» برای مشتری دیده می‌شود', await vis('#mygrp-13'));
T('۱۳: قیمت گروهی خط‌خورده (همکاران ٪۵)', await page.evaluate(() => document.getElementById('p13-hash').innerHTML.includes('<s>')));

/* افزودن قلم اول: برنج هاشمی × ۲ */
await page.click('.addcart[data-pid="hash50"]'); await sleep(300);
T('شیت «افزودن به سبد» باز شد', await page.evaluate(() => document.getElementById('sheet-addcart').classList.contains('show')));
T('شیت: نام و قیمت کالا', (await page.locator('#ac-prod').textContent()).includes('برنج هاشمی') && (await page.locator('#ac-prod').textContent()).includes('تومان'));
T('شیت: جمع قلم زنده', (await page.locator('#ac-line').textContent()).includes('='));
await page.click('[data-acinc]'); await sleep(150);
T('استپر+: مقدار ۲', (await page.inputValue('#ac-qty')) === '۲');
await page.click('[data-acadd]'); await sleep(400);
T('بج شمار روی کارت هاشمی', (await page.locator('.addcart[data-pid="hash50"] .cart-n').textContent()) === '۲');
T('بج آیکون هدر = ۲', (await page.locator('#cart-badge-13').textContent()) === '۲');
T('پیام «اضافه شد»', (await page.locator('#priv-ok').textContent()).includes('اضافه شد'));
await shot('01-cart-added');

/* قلم دوم: برنج فجر × ۱ و بازبینی سبد */
await page.click('.addcart[data-pid="faj50"]'); await sleep(250);
await page.click('[data-acadd]'); await sleep(300);
await page.click('#scr-13 .subheader [data-cartopen]'); await sleep(300);
T('شیت سبد باز شد', await page.evaluate(() => document.getElementById('sheet-cart').classList.contains('show')));
T('سبد: ۲ ردیف', await page.locator('#sheet-cart .cart-row').count() === 2);
T('سبد: جمع برآوردی با تخفیف گروه (۷٬۸۹۵٬۰۰۰)', (await page.locator('#cart-total').textContent()).includes('۷٬۸۹۵٬۰۰۰'));
T('سبد: قیمت خط‌خوردهٔ هاشمی', (await page.locator('#sheet-cart .cart-row[data-cartrow="hash50"] .p').innerHTML()).includes('<s>'));
await shot('02-cart-sheet');
await page.click('.cart-row[data-cartrow="faj50"] [data-cartinc]'); await sleep(200);
T('استپر داخل سبد: بج ۴', (await page.locator('#cart-badge-13').textContent()) === '۴');
await page.click('.cart-row[data-cartrow="hash50"] [data-cartdec]'); await sleep(200);
T('استپر −: ردیف هاشمی ۱', (await page.locator('.cart-row[data-cartrow="hash50"] b').textContent()) === '۱');
await page.click('.cart-row[data-cartrow="hash50"] [data-cartdel]'); await sleep(200);
T('حذف قلم: ۱ ردیف ماند', await page.locator('#sheet-cart .cart-row').count() === 1);
T('جمع بعد از حذف (۴٬۹۶۰٬۰۰۰)', (await page.locator('#cart-total').textContent()).includes('۴٬۹۶۰٬۰۰۰'));
/* قلم حذف‌شده را دوباره اضافه می‌کنیم تا سفارش ارسالی دو-قلمی باشد */
await page.evaluate(() => document.getElementById('backdrop').click()); await sleep(250);
await page.click('.addcart[data-pid="hash50"]'); await sleep(250);
await page.click('[data-acinc]'); await sleep(150);
await page.click('[data-acadd]'); await sleep(300);
await page.click('#scr-13 .subheader [data-cartopen]'); await sleep(250);
T('سبد دوباره ۲ ردیف شد', await page.locator('#sheet-cart .cart-row').count() === 2);

/* ارسال سفارش — متن عین مالک */
await page.fill('#cart-note', 'چک ۳۰ روزه');
await page.click('[data-cartsend]'); await sleep(500);
T('ارسال → صفحهٔ ۶۴', await page.evaluate(() => location.hash === '#64'));
T('پیام عین متن مالک', (await page.locator('#ord-ok-buy').textContent()).includes('سفارش شما برای «پخش برنج پارس» ارسال شد. شرایط پرداخت و تحویل را مستقیماً با تامین‌کننده هماهنگ کنید.'));
T('کارت سفارش تازه چندقلمی', (await page.locator('#ord-rows-buy .inq-card').first().textContent()).includes('قلم کالا'));
T('یادداشت شرایط پرداخت روی کارت', (await page.locator('#ord-rows-buy .inq-card').first().textContent()).includes('چک ۳۰ روزه'));
await shot('03-order-sent');
/* بازگشت به ۱۳: سبد خالی شد */
await page.goto(FILE + '#13'); await sleep(400);
T('بعد از ارسال: سبد خالی (بج مخفی)', await page.evaluate(() => getComputedStyle(document.getElementById('cart-badge-13')).display === 'none'));

/* ═══ ۲. جزئیات چندقلمی سمت خریدار (۶۴) ═══ */
await page.goto(FILE + '#64'); await sleep(400);
await page.click('#ord-rows-buy .inq-card'); await sleep(300);
T('شیت جزئیات: عنوان چندقلمی', (await page.locator('#ordv-title').textContent()).includes('قلم کالا'));
T('شیت جزئیات: بخش «اقلام سفارش»', (await page.locator('#ordv-facts').textContent()).includes('اقلام سفارش'));
T('شیت جزئیات: ردیف قلم با قیمت', await page.locator('#ordv-facts .ord-irow').count() >= 2);
await page.evaluate(() => document.getElementById('backdrop').click()); await sleep(200);

/* ═══ ۳. CTA صفحهٔ کالا (۰۲) = افزودن به سبد ═══ */
await page.goto(FILE + '#02'); await sleep(400);
T('۰۲: CTA «افزودن به سبد سفارش»', await vis('#buybar-02 [data-addcart]'));
await page.click('#buybar-02 [data-addcart]'); await sleep(300);
T('۰۲: شیت تعداد با کالای پیش‌فرض', (await page.locator('#ac-prod').textContent()).includes('برنج هاشمی'));
await page.click('[data-acadd]'); await sleep(400);
T('۰۲: افزودن → کاتالوگ ۱۳ + بج ۱', (await page.locator('#cart-badge-13').textContent()) === '۱');

/* ═══ ۴. سمت فروشنده (۶۵): پذیرش با ویرایش هر قلم ═══ */
await page.goto(FILE + '#65'); await sleep(450);
T('۶۵: کارت تازه در صدر با بج جدید', (await page.locator('#ord-rows-sell .inq-card').first().textContent()).includes('جدید'));
await page.click('#ord-rows-sell .inq-card'); await sleep(300);
T('شیت مدیریت: عنوان چندقلمی', (await page.locator('#ordm-title').textContent()).includes('قلم کالا'));
T('شیت مدیریت: ورودی مقدار قلم‌ها', await page.locator('#ordm-items [data-oeqty]').count() === 2);
T('شیت مدیریت: ورودی قیمت قلم‌ها', await page.locator('#ordm-items [data-oeprice]').count() === 2);
await shot('04-ordmgr-items');
await page.fill('[data-oeqty="0"]', '۳');
await page.fill('[data-oeprice="0"]', '۲٬۸۰۰٬۰۰۰');
await page.fill('[data-oeprice="1"]', '۲٬۵۰۰٬۰۰۰');
await page.click('[data-ordok]'); await sleep(400);
T('پذیرش: پیام ثبت قیمت و مقدار', (await page.locator('#ord-ok-sell').textContent()).includes('پذیرفته شد'));
T('کارت: مجموع توافقی (۳×۲٬۸۰۰٬۰۰۰ + ۲×۲٬۵۰۰٬۰۰۰ = ۱۳٬۴۰۰٬۰۰۰)', (await page.locator('#ord-rows-sell .inq-card').first().textContent()).includes('۱۳٬۴۰۰٬۰۰۰'));
/* سمت خریدار قیمت نهایی را می‌بیند */
await page.goto(FILE + '#64'); await sleep(400);
T('۶۴: وضعیت پذیرفته شده', (await page.locator('#ord-rows-buy .inq-card').first().textContent()).includes('پذیرفته شده'));
await page.click('#ord-rows-buy .inq-card'); await sleep(300);
T('۶۴: قیمت نهایی قلم در جزئیات', (await page.locator('#ordv-facts').textContent()).includes('۲٬۸۰۰٬۰۰۰'));
await page.evaluate(() => document.getElementById('backdrop').click()); await sleep(200);

/* ═══ ۵. درگاه خصوصی: سبد هم قفل می‌شود ═══ */
await page.evaluate(() => {
  document.getElementById('scr-13').classList.add('priv-gate');
});
T('درگاه: آیکون سبد هدر قفل', await page.evaluate(() => getComputedStyle(document.querySelector('#scr-13 .subheader [data-cartopen]')).display === 'none'));
T('درگاه: افزودن‌های کارت قفل', await page.evaluate(() => getComputedStyle(document.querySelector('#scr-13 .pcard .addcart')).display === 'none'));
await page.evaluate(() => {
  document.getElementById('scr-13').classList.remove('priv-gate');
});

/* ═══ ۶. ورودهای سفارش: منوی ۱۰ و دکتهٔ ۶۴ ═══ */
await page.goto(FILE + '#10'); await sleep(400);
await page.click('#saved-cats .row-card [data-sheet="sheet-catmenu"]'); await sleep(300);
T('منوی ۱۰: ردیف «سفارش از کاتالوگ» → ۱۳', await page.evaluate(() => {
  const r = [...document.querySelectorAll('#sheet-catmenu .sheet-row')].find(x => x.textContent.includes('سفارش از کاتالوگ'));
  return r && r.dataset.go === '13';
}));
await page.evaluate(() => document.getElementById('backdrop').click()); await sleep(200);
await page.goto(FILE + '#64'); await sleep(400);
T('۶۴: دکتهٔ «سفارش جدید از کاتالوک تأمین‌کننده» → ۱۰', await page.evaluate(() => document.getElementById('ord-new').dataset.go === '10'));

/* ═══ ۷. صفحهٔ ۱۴ «تنظیمات خرید» — بازگشت ═══ */
await page.goto(FILE + '#14'); await sleep(450);
T('۱۴: صفحه رندر شد (appbar + بدنه)', await vis('#scr-14 .appbar') && await vis('#scr-14 .screen-body'));
T('۱۴: پنج تب فوتر خرید', await page.locator('#scr-14 .tabbar .tab').count() === 5);
T('۱۴: تب فعال = تنظیمات', (await page.locator('#scr-14 .tab.active').textContent()).includes('تنظیمات'));
T('۱۴: ردیف تنظیمات لیست خرید', await page.locator('#scr-14 [data-sheet="sheet-listset"]').count() === 1);
T('۱۴: ردیف گروه‌های کالا', await page.locator('#scr-14 [data-sheet="sheet-lgroups"]').count() === 1);
T('۱۴: ویرایش کسب‌وکار → ۲۲', await page.evaluate(() => [...document.querySelectorAll('#scr-14 [style*="cursor:pointer"]')].some(x => x.textContent.includes('ویرایش کسب‌وکار') && x.dataset.go === '22')));
T('۱۴: خروج از حساب → ۱۵', await page.evaluate(() => [...document.querySelectorAll('#scr-14 [style*="cursor:pointer"]')].some(x => x.textContent.includes('خروج از حساب') && x.dataset.go === '15')));
await shot('05-page14');
await page.click('#scr-14 .subheader .back, #scr-14 .tabbar .tab'); await sleep(300);
T('۱۴: بدون سرریز افقی', await page.evaluate(() => document.getElementById('scr-14').querySelector('.screen-body').scrollWidth <= 402));
/* ورود از فوتر ۰۸ و ۶۴ */
await page.goto(FILE + '#08'); await sleep(350);
T('۰۸: تب پنجم تنظیمات → ۱۴', await page.evaluate(() => {
  const t = document.querySelector('#scr-08 .tabbar .tab:nth-child(5)');
  return t && t.dataset.go === '14' && t.textContent.includes('تنظیمات');
}));
await page.goto(FILE + '#64'); await sleep(350);
T('۶۴: تب پنجم تنظیمات → ۱۴', await page.evaluate(() => {
  const t = document.querySelector('#scr-64 .tabbar .tab:nth-child(5)');
  return t && t.dataset.go === '14';
}));
/* ۱۸ (keep) در بازوی خرید: پنج تب با تنظیمات */
await page.goto(FILE + '#08'); await sleep(300);
await page.goto(FILE + '#18'); await sleep(400);
T('۱۸ (خرید): پنج تب رندر شد', await page.locator('#scr-18 .tabbar .tab').count() === 5);
T('۱۸ (خرید): تب تنظیمات آخرین', (await page.locator('#scr-18 .tabbar .tab').last().textContent()).includes('تنظیمات'));

/* ═══ ۸. گروه خرید من — خودانتسابی مشتری (۱۳) ═══ */
await page.goto(FILE + '#08'); await sleep(300);
await page.goto(FILE + '#13'); await sleep(400);
T('۱۳: برچسب گروه فعلی (همکاران)', (await page.locator('#mygrp-t').textContent()).includes('همکاران'));
await page.click('#mygrp-13'); await sleep(300);
T('شیت «گروه خرید من» باز شد', await page.evaluate(() => document.getElementById('sheet-mygrp').classList.contains('show')));
T('شیت: گروه‌های فروشنده فهرست شد', await page.locator('#mygrp-rows .pk-row').count() === 4);
await shot('06-mygrp');
await page.evaluate(() => { [...document.querySelectorAll('#mygrp-rows .pk-row')].find(x => x.textContent.includes('مشتریان ویژه')).click(); });
await sleep(300);
T('خودانتسابی: قیمت با ٪۱۰ گروه جدید', await page.evaluate(() => document.getElementById('p13-hash').innerHTML.includes('۲٬۵۶۵٬۰۰۰')));
T('برچسب گروه به‌روز', (await page.locator('#mygrp-t').textContent()).includes('مشتریان ویژه'));
/* سبد هم قیمت تازه می‌گیرد */
await page.click('.addcart[data-pid="hash50"]'); await sleep(250);
T('شیت تعداد: قیمت گروه جدید (۲٬۵۶۵٬۰۰۰)', (await page.locator('#ac-prod').textContent()).includes('۲٬۵۶۵٬۰۰۰'));
await page.evaluate(() => document.getElementById('backdrop').click()); await sleep(200);

/* ═══ ۹. نوار فیلتر ۶۲ (الگوی دیوار — فاز ۶۸): دو دکمهٔ مجزا [گروه مشتری][صنف] ═══ */
await page.goto(FILE + '#62'); await page.reload(); await sleep(450);
T('۶۲: نوار فیلتر رندر شد', await vis('#flbar-62'));
T('۶۲: چیپ‌بار قدیمی حذف شد', await page.locator('#cg-bar').count() === 0);
T('۶۲: دو دکمهٔ فیلتر (گروه + صنف)', await page.locator('#flbar-62 .fl-b').count() === 2);
T('۶۲: دکمهٔ گروه با آیکون users', await page.evaluate(() => !!document.querySelector('#flbar-62 .fl-b[data-flg] svg use[href="#i-users"]')));
T('۶۲: دکمهٔ صنف با آیکون store', await page.evaluate(() => !!document.querySelector('#flbar-62 .fl-b[data-fltc] svg use[href="#i-store"]')));
T('۶۲: هر دو دکمه مقدار پیش‌فرض «همه»', (await page.locator('#flbar-62 .fl-b').first().textContent()).includes('همه') && (await page.locator('#flbar-62 .fl-b').last().textContent()).includes('همه'));
T('۶۲: نوار اسکرول افقی دارد', await page.evaluate(() => {
  const b = document.getElementById('flbar-62');
  return getComputedStyle(b).overflowX === 'auto' || b.scrollWidth > b.clientWidth;
}));
await shot('07-62-flbar');
/* فیلتر صنف: دکمه → شیت انتخاب → گزینه */
await page.click('#flbar-62 .fl-b[data-fltc]'); await sleep(300);
T('شیت فیلتر صنف باز شد', await page.evaluate(() => document.getElementById('sheet-cgflt').classList.contains('show') && document.getElementById('cgf-title').textContent.includes('صنف')));
T('شیت صنف: همه + ۴ گزینه', await page.locator('#cgf-rows .pk-row').count() === 5);
await page.evaluate(() => { [...document.querySelectorAll('#cgf-rows .pk-row')].find(x => x.textContent.includes('سوپرمارکت')).click(); });
await sleep(250);
T('فیلتر صنف سوپرمارکت = ۳ ردیف', await page.locator('#cust-rows .row-card').count() === 3);
T('دکمهٔ صنف فعال: مقدار + ✕', (await page.locator('#flbar-62 .fl-b[data-fltc]').textContent()).includes('سوپرمارکت') && await page.locator('#flbar-62 [data-fltcx]').count() === 1);
await shot('07-62-fltc-on');
/* ترکیب گروه + صنف */
await page.click('#flbar-62 .fl-b[data-flg]'); await sleep(300);
T('شیت فیلتر گروه باز شد', await page.evaluate(() => document.getElementById('sheet-cgflt').classList.contains('show') && document.getElementById('cgf-title').textContent.includes('گروه')));
await page.evaluate(() => { [...document.querySelectorAll('#cgf-rows .pk-row')].find(x => x.textContent.includes('همکاران')).click(); });
await sleep(250);
T('ترکیب گروه+صنف = ۲ ردیف', await page.locator('#cust-rows .row-card').count() === 2);
T('دکمهٔ گروه فعال شد', await page.evaluate(() => document.querySelector('#flbar-62 .fl-b[data-flg]').classList.contains('on')));
/* ✕: پاک‌کردن فقط گروه */
await page.click('#flbar-62 [data-flgx]');
await sleep(250);
T('✕ گروه: صنف ماند (۳ ردیف)', await page.locator('#cust-rows .row-card').count() === 3);
T('✕ گروه: دکمهٔ گروه به «همه»', (await page.locator('#flbar-62 .fl-b[data-flg]').textContent()).includes('همه'));
/* شیت: «همه» = پاک‌کردن صنف */
await page.click('#flbar-62 .fl-b[data-fltc]'); await sleep(300);
await page.evaluate(() => { document.querySelector('#cgf-rows .pk-row').click(); });
await sleep(250);
T('«همه»: فیلتر پاک شد (۶ ردیف)', await page.locator('#cust-rows .row-card').count() === 6);

/* ═══ ۱۰. سطوح مشتری ۱..۵ ═══ */
T('۶۲: بج سطح در ردیف‌ها', (await page.locator('#cust-rows').innerHTML()).includes('lv-b'));
await page.click('#cust-rows .row-card [data-cdots]'); await sleep(300);
T('منوی مشتری: گروه + سطح', (await page.locator('#custmenu-grp').textContent()).includes('سطح'));
await page.evaluate(() => document.querySelector('[data-cgset]').click()); await sleep(300);
T('شیت گروه: ۵ پیل سطح', await page.locator('#cga-lv .lv-p').count() === 5);
await page.click('#cga-lv [data-cglvl="5"]'); await sleep(250);
T('انتخاب سطح ۵', await page.evaluate(() => {
  const on = document.querySelector('#cga-lv .lv-p.on');
  return on && on.dataset.cglvl === '5';
}));
await page.evaluate(() => document.getElementById('backdrop').click()); await sleep(200);
T('ردیف: بج سطح ۵ نشست', (await page.locator('#cust-rows .row-card').first().textContent()).includes('سطح ۵'));

/* ═══ ۱۱. اسکلت و جاروی کامل ═══ */
const ids = await page.evaluate(() => [...document.querySelectorAll('#phone > section.scr')].map(s => s.id.slice(4)));
T('اسکلت: ۳۴ صفحه (۱۴ بازگشت)', ids.length === 34 && ids.includes('14'));
await page.goto(FILE + '#14'); await sleep(300);
const sweep = [];
for (const id of ids) {
  await page.goto(FILE + '#' + id); await sleep(240);
  const sw = await page.evaluate(() => {
    /* متریک هم‌سان خط پایهٔ p66: سرریز خودِ صفحه (scr) — سرریز ۱۶pxHero لندینگ (۱۵) پیش‌موجود و
       در سطح scr مهارشده است؛ پس متریک scr-level ملاک است. */
    const scr = document.querySelector('.scr:not([hidden])');
    return { ov: scr ? scr.scrollWidth - scr.clientWidth : 1, vis: !!scr };
  });
  if (!sw.vis || sw.ov > 1) sweep.push(id + (sw.ov > 1 ? '(ov=' + sw.ov + ')' : '(missing)'));
}
T('جارو: همهٔ ۳۴ صفحه بدون خطا و سرریز', sweep.length === 0);
const counts = await page.evaluate(() => ({
  pages: document.querySelectorAll('#phone > section.scr').length,
  sheets: document.querySelectorAll('.sheet').length,
  dlgs: document.querySelectorAll('.dlg').length
}));
T('اسکلت: ۳۴ صفحه · ۶۴ شیت · ۹ دیالوگ (فاز ۶۸: +فیلتر/مدیریت/تغییرنام +دیالوگ حذف گروه)', counts.pages === 34 && counts.sheets === 64 && counts.dlgs === 9);
const arms = await page.evaluate(() => ({
  sellTabs: document.querySelectorAll('#scr-62 .tabbar .tab').length,
  buyTabs: document.querySelectorAll('#scr-64 .tabbar .tab').length
}));
T('فوترها: فروش و خرید هر دو پنج‌تبی', arms.sellTabs === 5 && arms.buyTabs === 5);

console.log('\nRESULT: ' + ok + '/' + (ok + bad));
console.log(errors.length ? 'ERRORS:\n' + errors.join('\n') : 'NO CONSOLE/PAGE ERRORS');
await browser.close();
process.exit(bad ? 1 : 0);
