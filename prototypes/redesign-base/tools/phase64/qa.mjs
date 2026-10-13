// فاز ۶۴ — QA قطعی «سفارش» (فرایند اصلی) + پنهان‌سازی استعلام — حکم‌های مالک:
//  ۱) فوتر فروش: تب سوم «سفارشات» (سفارش‌های مشتریان) · فوتر خرید: تب سوم «سفارش‌های من»
//     — استعلام از فوتر رفت: ۰۵/۴۵ بدون تب‌بار (صفحهٔ پشته‌ای فرعی)
//  ۲) ورودهای پنهان استعلام: ردیف «درخواست‌های خرید» در تنظیمات ۰۷ (بج ۳) +
//     ردیف «استعلام‌های قیمت» در sheet-listset (۰۸) + نوار جاری ۰۸ (ماندگار)
//  ۳) ثبت سفارش: CTA صفحهٔ ۰۲ (کالا پیش‌پر) · buybar-۱۳ چهاردکته‌ای · ردیف sheet-catmenu (۱۰)
//     · دکتهٔ «ثبت سفارش جدید» (۶۴) — فیلد اختیاری «توضیحات / شرایط پرداخت»
//  ۴) پیام پس از ثبت (عین متن مالک): «سفارش شما برای … ارسال شد. شرایط پرداخت و تحویل
//     را مستقیماً با تامین‌کننده هماهنگ کنید.»
//  ۵) وضعیت‌های عملیاتی MVP: ثبت شده → پذیرفته شده (اصلاح مقدار/قیمت) → ارسال شده →
//     تحویل شده (تأیید اختیاری خریدار) · لغو/رد (هر دو طرف) — بدون «پرداخت شده»
//  ۶) انسجام شبکه: ORD مشترک — سفارش آریا (طارم) هم در ۶۴ هم در ۶۵
//  ۷) الگوی «مثل پیام‌ها»: سفارش تازه = بج «جدید» + بج فوتر ۲؛ ترک ۶۵ = پاک شدن
//  ۸) نوتیف ۲۷ «سفارش شما پذیرفته شد» (۱۰ نوتیف · ۵ خوانده‌نشده) + گام‌های راهنما ۶۰/۶۱ (۷ گام)
import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';
import { mkdirSync } from 'node:fs';

const RB = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const FILE = 'file://' + resolve(RB, 'index.html');
const SHOTS = '/home/z/my-project/shots-p64';
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

/* ═══ ۰. فوترها — سفارش جایگزین استعلام/درخواست‌ها ═══ */
await page.goto(FILE + '#08'); await page.reload(); await sleep(400);
const t08 = await page.locator('#scr-08 .tabbar .tab').allTextContents();
T('فوتر ۰۸: ۴ تب — لیست خرید · تأمین‌کنندگان · سفارش‌های من · پیام‌ها',
  t08.length === 4 && t08[0].includes('لیست خرید') && t08[1].includes('تأمین‌کنندگان') && t08[2].includes('سفارش‌های من') && t08[3].includes('پیام‌ها'));
T('فوتر ۰۸: استعلام در فوتر نیست (حکم مالک: فرایند فرعی)', !(await page.locator('#scr-08 .tabbar').textContent()).includes('استعلام'));
await shot('01-footer08');
await page.click('#scr-08 .tab:has-text("سفارش‌های من")'); await sleep(300);
T('تب «سفارش‌های من» (جای سوم) ← صفحهٔ ۶۴', await page.locator('#scr-64').isVisible());

await page.goto(FILE + '#01'); await page.reload(); await sleep(400);
const t01 = await page.locator('#scr-01 .tabbar .tab').allTextContents();
T('فوتر ۰۱: ۵ تب — کاتالوگ من · مشتریان · سفارشات · پیام‌ها · تنظیمات',
  t01.length === 5 && t01[0].includes('کاتالوگ من') && t01[1].includes('مشتریان') && t01[2].includes('سفارشات') && t01[4].includes('تنظیمات'));
T('فوتر ۰۱: تب سفارشات بج ۲ دارد (مهر + الماس)', t01[2].includes('۲'));
T('فوتر ۰۱: «درخواست‌ها» در فوتر نیست', !(await page.locator('#scr-01 .tabbar').textContent()).includes('درخواست'));
await shot('02-footer01');
await page.click('#scr-01 .tab:has-text("سفارشات")'); await sleep(300);
T('تب «سفارشات» (جای سوم) ← صفحهٔ ۶۵', await page.locator('#scr-65').isVisible());

/* ۱۸ (keep) — ست TABSET هر دو بازو */
await page.goto(FILE + '#01'); await page.reload(); await sleep(250);
await page.evaluate(() => { location.hash = '#18'; }); await sleep(350);
const t18s = await page.locator('#scr-18 .tabbar .tab').allTextContents();
T('فوتر ۱۸ (فروش): ۵ تب با «سفارشات» بج ۲', t18s.length === 5 && t18s[2].includes('سفارشات') && t18s[2].includes('۲'));
await page.goto(FILE + '#08'); await page.reload(); await sleep(250);
await page.evaluate(() => { location.hash = '#18'; }); await sleep(350);
const t18b = await page.locator('#scr-18 .tabbar .tab').allTextContents();
T('فوتر ۱۸ (خرید): ۴ تب — تب سوم «سفارش‌های من»', t18b.length === 4 && t18b[2].includes('سفارش‌های من'));

/* ۰۵/۴۵ = صفحهٔ فرعی پشته‌ای — بدون تب‌بار */
await page.goto(FILE + '#45'); await page.reload(); await sleep(300);
T('۴۵: بدون تب‌بار (استعلام = فرایند فرعی)', (await page.locator('#scr-45 .tabbar').count()) === 0);
T('۴۵: محتوای استعلام دست‌نخورده (جاری + پایان‌یافته)',
  (await page.locator('#scr-45 .inq-card').count()) === 3 && (await page.locator('#scr-45 .inq-done').count()) === 2);
await page.goto(FILE + '#05'); await page.reload(); await sleep(300);
T('۰۵: بدون تب‌بار', (await page.locator('#scr-05 .tabbar').count()) === 0);
T('۰۵: ۳ کارت درخواست دست‌نخورده', (await page.locator('#scr-05 .req-card').count()) === 3);

/* ═══ ۱. صفحهٔ ۶۴ — سفارش‌های من (خریدارِ نمونه = سوپرمارکت آریا) ═══ */
await page.goto(FILE + '#64'); await page.reload(); await sleep(400);
T('۶۴: عنوان + زیرعنوان', (await page.locator('#scr-64 .ttl').textContent()).includes('سفارش‌های من'));
T('۶۴: ۳ سفارش جاری (روغن sent · طارم ok · فجر ship)', (await page.locator('#ord-rows-buy .inq-card').count()) === 3);
T('۶۴: ۱ بایگانی (هاشمی ۱۰ کیلویی — تحویل‌شده)', (await page.locator('#ord-done-buy .inq-done').count()) === 1);
const tx64 = await page.locator('#scr-64').textContent();
T('۶۴: سه وضعیت جاری دیده می‌شوند (ثبت/پذیرفته/ارسال شده)',
  tx64.includes('ثبت شده') && tx64.includes('پذیرفته شده') && tx64.includes('ارسال شده'));
T('۶۴: «تحویل شده» بایگانی (b-done)', (await page.locator('#ord-done-buy .badge.b-done').count()) === 1);
T('۶۴: توضیحات/شرایط پرداخت روی کارت طارم', tx64.includes('پیش‌پرداخت ۳۰٪، مابقی هنگام تحویل'));
T('۶۴: قیمت توافتی روی کارت', tx64.includes('۲٬۷۵۰٬۰۰۰'));
T('۶۴: هیچ «پرداخت شده» وجود ندارد (حکم مالک: وضعیت مالی ممنوع)', !tx64.includes('پرداخت شده'));
T('۶۴: دکتهٔ «ثبت سفارش جدید»', (await page.locator('#ord-new[data-order]').count()) === 1);
await page.evaluate(() => { document.querySelector('#ord-rows-buy').scrollIntoView(); });
await shot('03-page64');

/* ═══ ۲. صفحهٔ ۶۵ — سفارشات (فروشندهٔ نمونه = پخش برنج پارس) ═══ */
await page.goto(FILE + '#65'); await page.reload(); await sleep(400);
T('۶۵: عنوان + زیرعنوان «مشتریان شما»', (await page.locator('#scr-65 .ttl').textContent()).includes('سفارشات'));
T('۶۵: ۴ سفارش جاری (مهر + الماس + آریا طارم + آریا فجر)', (await page.locator('#ord-rows-sell .inq-card').count()) === 4);
T('۶۵: ۲ بایگانی (تحویل‌شده + لغو‌شده)', (await page.locator('#ord-done-sell .inq-done').count()) === 2);
const tx65 = await page.locator('#ord-rows-sell').textContent();
T('۶۵: بج «جدید» روی سفارش‌های تازه (مهر + الماس)', (await page.locator('#ord-rows-sell .cust-new').count()) === 2);
T('۶۵: انسجام شبکه — سفارش آریا (طارم/فجر) این‌جا هم هست', tx65.includes('برنج طارم') && tx65.includes('برنج فجر'));
T('۶۵: بج فوتر = ۲ دیده‌نشده', (await page.locator('#scr-65 .tab[data-go="65"] .badge').textContent()).includes('۲'));
/* ترک ۶۵ = دیده‌شدن (الگوی ۶۲) */
await page.evaluate(() => { location.hash = '#01'; }); await sleep(300);
T('ترک ۶۵: بج فوتر پاک شد (دیده شد)', (await page.locator('#scr-01 .tab[data-go="65"] .badge').count()) === 0);
await page.evaluate(() => { location.hash = '#65'; }); await sleep(300);
T('بازگشت به ۶۵: بج «جدید» ردیف‌ها هم رفت', (await page.locator('#ord-rows-sell .cust-new').count()) === 0);
await shot('04-page65');

/* ═══ ۳. ثبت سفارش — e2e از صفحهٔ کالا (۰۲ · بازوی خرید) ═══ */
await page.goto(FILE + '#08'); await page.reload(); await sleep(250);
await page.evaluate(() => { location.hash = '#13'; }); await sleep(300);
await page.click('#scr-13 .pcard'); await sleep(300);
T('۰۲: CTA اصلی «ثبت سفارش» (جایگزین درخواست قیمت)',
  (await page.locator('#buybar-02 [data-order]').count()) === 1 && (await page.locator('#buybar-02').textContent()).includes('ثبت سفارش'));
await page.click('#buybar-02 [data-order]'); await sleep(300);
T('شیت ثبت سفارش باز شد', await page.locator('#sheet-order.show').count() === 1);
T('شیت: فیلد «توضیحات / شرایط پرداخت» (اختیاری — حکم مالک)', (await page.locator('#sheet-order').textContent()).includes('توضیحات / شرایط پرداخت'));
T('شیت: کالا از ۰۲ پیش‌پر شد', (await page.locator('#ord-good').inputValue()).includes('برنج هاشمی'));
/* اعتبارسنجی: بدون مقدار خطا */
await page.click('[data-ordsend]'); await sleep(200);
T('اعتبارسنجی: بدون مقدار، خطا + شیت می‌ماند', await page.locator('#ord-err').isVisible());
await page.fill('#ord-qty', '۲۰ کیسه');
await page.fill('#ord-note', 'پیش‌پرداخت ۳۰٪، مابقی هنگام تحویل');
await page.click('[data-ordsend]'); await sleep(400);
T('ارسال → صفحهٔ ۶۴ (سفارش‌های من)', await page.locator('#scr-64').isVisible());
const okMsg = await page.locator('#ord-ok-buy').textContent();
T('پیام عین متن مالک — «سفارش شما برای … ارسال شد. شرایط پرداخت و تحویل را مستقیماً با تامین‌کننده هماهنگ کنید.»',
  okMsg.includes('سفارش شما برای «پخش برنج پارس» ارسال شد') && okMsg.includes('شرایط پرداخت و تحویل را مستقیماً با تامین‌کننده هماهنگ کنید'));
const first64 = await page.locator('#ord-rows-buy .inq-card').first().textContent();
T('سفارش تازه بالای ۶۴ — «ثبت شده» + مقدار + توضیحات',
  first64.includes('۲۰ کیسه') && first64.includes('ثبت شده') && first64.includes('پیش‌پرداخت ۳۰٪'));
await page.evaluate(() => { document.querySelector('#ord-ok-buy').scrollIntoView(); });
await shot('05-sent64');

/* buybar-13 چهاردکته‌ای + ردیف sheet-catmenu */
await page.goto(FILE + '#13'); await page.reload(); await sleep(400);
const bb13 = await page.locator('#buybar-13').textContent();
T('۱۳: buybar چهاردکته‌ای — ذخیره | ثبت سفارش | پیام | تماس',
  (await page.locator('#buybar-13 .btn').count()) === 4 && bb13.includes('ثبت سفارش') && bb13.includes('ذخیره') && bb13.includes('پیام') && bb13.includes('تماس'));
T('۱۳: «ثبت سفارش» دکتهٔ اصلی (primary)', (await page.locator('#buybar-13 .btn-primary[data-order]').count()) === 1);
await page.goto(FILE + '#10'); await page.reload(); await sleep(400);
await page.click('#saved-cats .row-card [data-sheet="sheet-catmenu"]'); await sleep(250);
T('منوی تأمین‌کننده (۱۰): ردیف «ثبت سفارش» دارد', (await page.locator('#sheet-catmenu [data-order]').count()) === 1);
await shot('06-catmenu-order');

/* ═══ ۴. وضعیت‌ها — فروشنده: پذیرش با مقدار/قیمت → اعلام ارسال ═══ */
await page.goto(FILE + '#65'); await page.reload(); await sleep(400);
await page.click('#ord-rows-sell .inq-card:first-child'); await sleep(300);
T('شیت مدیریت فروشنده باز شد', await page.locator('#sheet-ordmgr.show').count() === 1);
T('فیلدهای پذیرش: مقدار نهایی + قیمت هر بسته', await page.locator('#ordm-accept').isVisible() && (await page.locator('#ordm-qty').inputValue()).length > 0);
await page.fill('#ordm-price', '۲٬۸۵۰٬۰۰۰');
await page.click('[data-ordok]'); await sleep(300);
T('پذیرش → پیام سبز + کارت «پذیرفته شده» با قیمت',
  (await page.locator('#ord-ok-sell').textContent()).includes('پذیرفته شد')
  && (await page.locator('#ord-rows-sell .inq-card').first().textContent()).includes('پذیرفته شده'));
await page.click('#ord-rows-sell .inq-card:first-child'); await sleep(250);
T('«اعلام ارسال» فقط بعد از پذیرش', await page.locator('#ordm-ship').isVisible() && (await page.locator('#ordm-accept').isHidden()));
await page.click('[data-ordship]'); await sleep(300);
T('اعلام ارسال → «ارسال شده»', (await page.locator('#ord-rows-sell .inq-card').first().textContent()).includes('ارسال شده'));
await shot('07-ordmgr-flow');

/* ═══ ۵. وضعیت‌ها — خریدار: تأیید تحویل (اختیاری) + لغو با دیالوگ ═══ */
await page.goto(FILE + '#64'); await page.reload(); await sleep(400);
await page.locator('#ord-rows-buy .inq-card', { hasText: 'ارسال شده' }).first().click(); await sleep(250);
T('شیت جزئیات خریدار: «تأیید تحویل» فقط برای ارسال‌شده', await page.locator('#ordv-done').isVisible() && await page.locator('#ordv-cancel').isHidden());
T('شیت: ردیف‌های واقعیت (وضعیت/تأمین‌کننده/قیمت/توضیحات)', (await page.locator('#ordv-facts .ord-frow').count()) >= 4);
await page.click('[data-orddone]'); await sleep(300);
T('تأیید تحویل → بایگانی «تحویل شد»', (await page.locator('#ord-done-buy').textContent()).includes('تحویل شد'));
await page.goto(FILE + '#64'); await page.reload(); await sleep(400);
await page.click('#ord-rows-buy .inq-card:first-child'); await sleep(250);
await page.click('#ordv-cancel'); await sleep(250);
T('لغو → دیالوگ تأیید (عنوان/متن هم‌گام نقش)', await page.locator('#dlg-ordcancel.show').count() === 1
  && (await page.locator('#ordc-q').textContent()).includes('لغو شود؟'));
await page.click('[data-ordcancelok]'); await sleep(300);
T('لغو ثبت شد → بایگانی «لغو شد»', (await page.locator('#ord-done-buy').textContent()).includes('لغو شد'));
/* فروشنده: رد سفارش — دیالوگ با فعل «رد» */
await page.goto(FILE + '#65'); await page.reload(); await sleep(400);
await page.click('#ord-rows-sell .inq-card:first-child'); await sleep(250);
await page.click('#ordm-cancel'); await sleep(250);
T('فروشنده: دیالوگ «رد سفارش» (فعل هم‌گام نقش)', (await page.locator('#ordc-h').textContent()).includes('رد سفارش'));
await page.click('#dlg-ordcancel [data-close]'); await sleep(250);
T('انصراف: دیالوگ بسته شد و سفارش دست‌نخورده ماند', (await page.locator('#dlg-ordcancel.show').count()) === 0
  && (await page.locator('#ord-rows-sell .inq-card').first().textContent()).includes('ثبت شده'));

/* ═══ ۶. استعلام پنهان — ورودی‌های تازه ═══ */
await page.goto(FILE + '#07'); await page.reload(); await sleep(400);
T('۰۷: ردیف «درخواست‌های خرید» + بج ۳', (await page.locator('#scr-07 [data-go="05"]').count()) === 1
  && (await page.locator('#scr-07 [data-go="05"] .badge').textContent()).includes('۳'));
await page.click('#scr-07 [data-go="05"]'); await sleep(300);
T('ردیف تنظیمات ← صفحهٔ ۰۵', await page.locator('#scr-05').isVisible());
await page.goto(FILE + '#08'); await page.reload(); await sleep(400);
await page.click('[data-sheet="sheet-listset"]'); await sleep(250);
T('تنظیمات لیست (۰۸): ردیف «استعلام‌های قیمت» → ۴۵', (await page.locator('#sheet-listset [data-go="45"]').count()) === 1);
await page.click('#sheet-listset [data-go="45"]'); await sleep(300);
T('ردیف شیت ← صفحهٔ ۴۵', await page.locator('#scr-45').isVisible());
await page.goto(FILE + '#08'); await page.reload(); await sleep(300);
T('۰۸: نوار «استعلام‌های جاری» ماند (ورودی زمینه‌ای)', (await page.locator('#scr-08 .bl-inq-title .more[data-go="45"]').count()) === 1);
await page.goto(FILE + '#09'); await page.reload(); await sleep(300);
T('۰۹: CTA استعلام در تابلوی مقایسه ماند (زمینهٔ چند-تأمین‌کننده‌ای)', (await page.locator('#scr-09 .action-bar [data-go="12"]').count()) === 1);

/* ═══ ۷. اعلان‌ها (۲۷) — تپ قلب چرخهٔ سفارش ═══ */
await page.goto(FILE + '#27'); await page.reload(); await sleep(400);
T('۲۷: شمار خوانده‌نشده ۴→۵', (await page.locator('#scr-27 .ttl small').textContent()).includes('۵ اعلان خوانده‌نشده'));
T('۲۷: ۱۰ نوتیف (۹ قبلی + ۱ تازه)', (await page.locator('#scr-27 .notif').count()) === 10);
const nt = await page.locator('#scr-27 .notif').allTextContents();
const ordNt = nt.find(x => x.includes('سفارش شما پذیرفته شد'));
T('۲۷: نوتیف تازه — «سفارش شما پذیرفته شد» + بج «جدید»', !!ordNt && ordNt.includes('جدید'));
T('۲۷: متن انتظار درست — قیمت + «مستقیماً با او هماهنگ کنید»',
  !!ordNt && ordNt.includes('برنج طارم') && ordNt.includes('۲٬۷۵۰٬۰۰۰') && ordNt.includes('مستقیماً با او هماهنگ کنید'));
T('۲۷: اکشن نوتیف ← ۶۴', (await page.locator('#scr-27 .notif .act[data-go="64"]').count()) === 1);
T('۲۷: نوتیف سفارش بدون افشای سیاست (بدون «شبکه»)', !ordNt || !ordNt.includes('شبکه'));
await page.evaluate(() => { const n = [...document.querySelectorAll('#scr-27 .notif')].find(x => x.textContent.includes('سفارش شما پذیرفته شد')); n?.scrollIntoView({ block: 'center' }); });
await shot('08-notif27-order');

/* ═══ ۸. راهنماها ۶۰/۶۱ — گام «سفارش» + واژگان فوتر تازه ═══ */
await page.goto(FILE + '#60'); await page.reload(); await sleep(350);
T('۶۰: ۷ گام (گام تازهٔ «سفارش بده»)', (await page.locator('#scr-60 .gd-row').count()) === 7);
const g60 = await page.locator('#scr-60 .gd-row').allTextContents();
T('۶۰: گام ۴ «سفارش بده» — پرداخت/تحویل مستقیم', g60[3].includes('سفارش بده') && g60[3].includes('مستقیماً با خودش هماهنگ'));
T('۶۰: گام ۵ استعلام (فرعی‌شده — «چند تأمین‌کننده از یک کالا داری؟»)', g60[4].includes('استعلام قیمت رقابتی') && g60[4].includes('چند تأمین‌کننده'));
T('۶۰: گام ۷ قیمت‌های همیشه تازه (جابه‌جایی شماره‌ها)', g60[6].includes('قیمت‌های همیشه تازه'));
T('۶۰: زیرعنوان «لیست خرید · تأمین‌کنندگان · سفارش»', (await page.locator('#scr-60 .ttl small').textContent()).includes('سفارش'));
await page.goto(FILE + '#61'); await page.reload(); await sleep(350);
T('۶۱: ۷ گام (گام تازهٔ «سفارش‌های مشتریانت را بپذیر»)', (await page.locator('#scr-61 .gd-row').count()) === 7);
const g61 = await page.locator('#scr-61 .gd-row').allTextContents();
T('۶۱: گام ۳ «سفارش‌های مشتریانت را بپذیر»', g61[2].includes('سفارش‌های مشتریانت را بپذیر') && g61[2].includes('«سفارشات»'));
T('۶۱: گام ۴ درخواست‌های خرید ماند (فرعی)', g61[3].includes('درخواست‌های خرید را دنبال کن'));
T('۶۱: زیرعنوان «کاتالوگ · سفارشات مشتریان · تبلیغ ویژه»', (await page.locator('#scr-61 .ttl small').textContent()).includes('سفارشات مشتریان'));
await page.evaluate(() => { document.querySelectorAll('#scr-61 .gd-row')[2]?.scrollIntoView({ block: 'center' }); });
await shot('09-guide61-order');

/* ═══ ۹. گشت ایمن — همهٔ ۳۳ صفحه بدون خطا ═══ */
const PAGES = ['01','02','04','05','07','08','09','10','12','13','15','16','17','18','19','22','23','27','29','30','34','42','43','44','45','46','48','53','60','61','62','64','65'];
for (const h of PAGES) {
  await page.goto(FILE + '#' + h); await sleep(150);
}
T('گشت: ۳۳ صفحه بدون هیچ خطای JS', errors.length === 0);
T('ساختار: ۳۳ صفحه داخل گوشی', await page.evaluate(() => document.querySelectorAll('#phone > section.scr').length === 33));

/* ═══ ۱۰. سرریز افقی — نقاط تازهٔ قطعی ═══ */
const ovf = async (sel, label) => {
  const good = await page.evaluate((s) => {
    const el = document.querySelector(s);
    const sb = el?.closest('.screen-body') || el;
    return !!el && el.scrollWidth <= el.clientWidth + 1 && sb.scrollWidth <= sb.clientWidth + 1;
  }, sel);
  T('سرریز: ' + label, good);
};
await page.goto(FILE + '#64'); await page.reload(); await sleep(350);
await ovf('#ord-rows-buy .inq-card', 'کارت سفارش ۶۴ (بج + توضیحات)');
await ovf('#scr-64 .tabbar', 'فوتر ۴ تبی ۶۴');
await page.goto(FILE + '#65'); await page.reload(); await sleep(350);
await ovf('#ord-rows-sell .inq-card', 'کارت سفارش ۶۵ (بج جدید + بج وضعیت)');
await ovf('#scr-65 .tabbar', 'فوتر ۵ تبی ۶۵');
await page.goto(FILE + '#08'); await page.reload(); await sleep(250);
await page.evaluate(() => { location.hash = '#13'; }); await sleep(300);
await ovf('#buybar-13', 'buybar-13 چهاردکته‌ای');
await page.goto(FILE + '#64'); await page.reload(); await sleep(300);
await page.click('#ord-rows-buy .inq-card:first-child'); await sleep(250);
await ovf('#ordv-facts .ord-frow', 'ردیف واقعیت شیت جزئیات');
await page.goto(FILE + '#65'); await page.reload(); await sleep(300);
await page.click('#ord-rows-sell .inq-card:first-child'); await sleep(250);
await ovf('#ordm-accept', 'فیلدهای پذیرش شیت مدیریت');
await page.goto(FILE + '#27'); await page.reload(); await sleep(300);
await ovf('#scr-27 .notif:nth-of-type(3)', 'نوتیف سفارش ۲۷');
await page.goto(FILE + '#07'); await page.reload(); await sleep(300);
await ovf('#scr-07 [data-go="05"]', 'ردیف درخواست‌های خرید ۰۷');

await browser.close();
console.log('\n═══ فاز ۶۴ ═══');
console.log('PASS: ' + ok + ' / FAIL: ' + bad);
if (errors.length) console.log('ERRORS:\n' + errors.join('\n'));
process.exit(bad ? 1 : 0);
