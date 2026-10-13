// فاز ۶۰ — QA قطعی «شبکهٔ تجاری خصوصی» (گام ۱) — حکم‌های مالک:
//  ۱) ذخیره‌کننده‌ها = مشتریان: فوتر فروش تب «مشتریان» (با بج جدید) + صفحهٔ ۶۲ «مشتریان من»
//     بدون تأیید — مثل پیام‌های تازه: بج «جدید» با ترک صفحه عادی می‌شود؛ حذف = قطع دسترسی
//  ۲) فوتر خرید «کاتالوک‌ها» → «تأمین‌کنندگان» + صفحهٔ ۱۰ «تأمین‌کنندگان من» + ردیف «در انتظار عضویت»
//  ۳) واژگان سراسری: آمار ۰۱ (مشتری → ۶۲) · reach/تنظیمات · cshare «مشتری شماست» · ۲۳ «تأمین‌کننده»
import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';
import { mkdirSync } from 'node:fs';

const RB = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const FILE = 'file://' + resolve(RB, 'index.html');
const SHOTS = '/home/z/my-project/shots-p60';
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

/* ═══ ۰. فوتر دستیار فروش — ۵ تبی با «مشتریان» ═══ */
await page.goto(FILE + '#01'); await page.reload(); await sleep(400);
T('فوتر ۰۱: ۵ تبی', (await page.locator('#scr-01 .tabbar .tab').count()) === 5);
T('فوتر ۰۱: تب دوم «مشتریان» + بج ۲', (await page.locator('#scr-01 .tab').nth(1).textContent()).includes('مشتریان') && (await page.locator('#scr-01 .tab').nth(1).textContent()).includes('۲'));
T('فوتر ۰۱/۰۵/۰۷: هر سه data-cols=5', (await page.locator('#scr-01 .tabbar').getAttribute('data-cols')) === '5'
  && await page.evaluate(() => ['scr-05', 'scr-07'].every(id => document.getElementById(id).querySelector('.tabbar').dataset.cols === '5')));
T('فوتر ۰۵/۰۷: تب مشتریان و بج دارند', await page.evaluate(() => ['scr-05', 'scr-07'].every(id => {
  const tb = document.getElementById(id).querySelectorAll('.tabbar .tab');
  return tb.length === 5 && tb[1].dataset.go === '62' && !!tb[1].querySelector('.badge');
})));
await page.goto(FILE + '#05'); await page.reload(); await sleep(300);
await page.click('#scr-05 .tab[data-go="62"]'); await sleep(350);
T('تب مشتریان (۰۵) ← صفحهٔ ۶۲', await page.locator('#scr-62').isVisible() && (await page.evaluate(() => location.hash)) === '#62');
await page.goto(FILE + '#18'); await page.reload(); await sleep(350);
T('صفحهٔ ۱۸ (بازوی فروش): ۵ تب با مشتریان', (await page.locator('#scr-18 .tabbar .tab').count()) === 5 && (await page.locator('#scr-18 .tabbar').textContent()).includes('مشتریان'));
await shot('01-18-keep-footer');

/* ═══ ۱. فوتر دستیار خرید — «تأمین‌کنندگان» ═══ */
await page.goto(FILE + '#08'); await page.reload(); await sleep(300);
const f08 = await page.locator('#scr-08 .tabbar').textContent();
T('فوتر ۰۸: «تأمین‌کنندگان» جای «کاتالوک‌ها»', f08.includes('تأمین‌کنندگان') && !f08.includes('کاتالوگ‌ها'));
await page.click('#scr-08 .tab:has-text("تأمین‌کنندگان")'); await sleep(300);
T('تب تأمین‌کنندگان ← صفحهٔ ۱۰', await page.locator('#scr-10').isVisible());
await page.goto(FILE + '#45'); await page.reload(); await sleep(300);
T('فوتر ۴۵: «تأمین‌کنندگان»', (await page.locator('#scr-45 .tabbar').textContent()).includes('تأمین‌کنندگان'));

/* ═══ ۲. صفحهٔ ۶۲ — مشتریان من ═══ */
await page.goto(FILE + '#62'); await page.reload(); await sleep(400);
T('۶۲: عنوان + زیرعنوان', (await page.locator('#scr-62 .ttl').textContent()).includes('مشتریان من') && (await page.locator('#scr-62 .ttl small').textContent()).includes('کسانی که کاتالوگ شما را ذخیره کرده‌اند'));
T('۶۲: عنوان سند', (await page.evaluate(() => document.title)).includes('۶۲ — مشتریان من'));
const stats62 = await page.locator('#scr-62 .cust-stats').textContent();
T('۶۲: نوار آمار ۴۱ مشتری · ۱۸ تماس · ۱۲۰ بازدید', stats62.includes('۴۱') && stats62.includes('مشتری') && stats62.includes('۱۸') && stats62.includes('۱۲۰'));
const note62 = await page.locator('#scr-62 .hintnote').first().textContent();
T('۶۲: قاعدهٔ ساده — بدون تأیید + حذف + بازگشت', note62.includes('جدید') && note62.includes('لازم نیست کسی را تأیید') && note62.includes('حذف') && note62.includes('دوباره برمی‌گردد'));
T('۶۲: ۶ ردیف مشتری', (await page.locator('#cust-rows .row-card').count()) === 6);
T('۶۲: ردیف‌ها نام و متادیتا دارند', (await page.locator('#cust-rows').textContent()).includes('رستوران مهر') && (await page.locator('#cust-rows').textContent()).includes('مهدی کاظمی') && (await page.locator('#cust-rows').textContent()).includes('از لینک شما'));
T('۶۲: ۲ بج «جدید»', (await page.locator('#cust-rows .cust-new').count()) === 2);
T('۶۲: بج فقط روی ردیف‌های تازه (امروز)', (await page.locator('#cust-rows .row-card').first().textContent()).includes('جدید') && (await page.locator('#cust-rows .row-card').nth(2).textContent()).includes('مشتری شد') && !(await page.locator('#cust-rows .row-card').nth(2).textContent()).includes('جدید'));
T('۶۲: یادداشت ۳۵ مشتری دیگر', (await page.locator('#cust-more').textContent()).includes('۳۵'));
await shot('02-62-list');

/* ═══ ۳. رفتار «جدید» — مثل پیام‌های تازه ═══ */
await page.goto(FILE + '#01'); await page.reload(); await sleep(300);
T('۰۱: بج «۲» روی تب مشتریان قبل از دیدن', (await page.locator('#scr-01 .tab[data-go="62"] .badge').count()) === 1);
await page.goto(FILE + '#62'); await page.reload(); await sleep(300);
T('ورود ۶۲: بج‌های «جدید» دیده می‌شوند', (await page.locator('#cust-rows .cust-new').count()) === 2);
await page.click('#scr-62 .tab[data-go="01"]'); await sleep(350);
T('ترک ۶۲: بج فوتر پاک شد (دیده شد)', (await page.locator('#scr-01 .tab[data-go="62"] .badge').count()) === 0);
await page.click('#scr-01 .tab[data-go="62"]'); await sleep(300);
T('بازگشت ۶۲: مشتری‌ها عادی شدند (بدون بج)', (await page.locator('#cust-rows .cust-new').count()) === 0);

/* ═══ ۴. منوی مشتری + حذف با تأیید ═══ */
await page.click('#cust-rows .row-card [data-cdots]'); await sleep(300);
T('شیت custmenu باز + نام/شماره هم‌گام', await page.locator('#sheet-custmenu.show').isVisible() && (await page.locator('#custmenu-title').textContent()) === 'رستوران مهر' && (await page.locator('#custmenu-tel').textContent()).includes('۰۹۱۲'));
T('custmenu: تماس (data-dial) + گفتگو (۱۹) + حذف', (await page.locator('#sheet-custmenu [data-dial]').count()) === 1 && (await page.locator('#sheet-custmenu [data-go="19"]').count()) === 1 && (await page.locator('#sheet-custmenu [data-custdel]').count()) === 1);
await shot('03-62-custmenu');
await page.click('#sheet-custmenu [data-custdel]'); await sleep(300);
T('دیالوگ تأیید باز + نام + پیامد صریح', await page.locator('#dlg-custdel.show').isVisible() && (await page.locator('#custdel-q').textContent()).includes('رستوران مهر') && (await page.locator('#dlg-custdel .dlg-p').textContent()).includes('نمی‌تواند از شما استعلام بگیرد') && (await page.locator('#dlg-custdel .dlg-p').textContent()).includes('دوباره مشتری شما می‌شود'));
await shot('04-62-delconf');
await page.click('#dlg-custdel [data-close]'); await sleep(250);
T('انصراف: ردیف حذف نشد', (await page.locator('#cust-rows .row-card').count()) === 6);
await page.click('#cust-rows .row-card [data-cdots]'); await sleep(250);
await page.click('#sheet-custmenu [data-custdel]'); await sleep(250);
await page.click('#dlg-custdel [data-custdelok]'); await sleep(350);
T('حذف: ردیف رفت (۶→۵)', (await page.locator('#cust-rows .row-card').count()) === 5);
T('حذف: آمار ۶۲ زنده شد (۴۰)', (await page.locator('#cust-n').textContent()) === '۴۰');
await page.click('#scr-62 .tab[data-go="01"]'); await sleep(350);
T('حذف: باکس آمار ۰۱ هم‌گام (۴۰ مشتری) — بدون ریلود', await page.locator('#scr-01').isVisible() && (await page.locator('#cat-cust-n').textContent()) === '۴۰');

/* ═══ ۵. آمار ۰۱ → ۶۲ + واژگان سراسری سمت فروش ═══ */
T('۰۱: باکس «مشتری» (نه ذخیره‌کننده) + data-go=62', (await page.locator('#scr-01 .cat-stats button').nth(1).textContent()).includes('مشتری') && (await page.locator('#scr-01 .cat-stats [data-go="62"]').count()) === 1 && (await page.locator('#scr-01 .cat-stats [data-sheet="sheet-reach"]').count()) === 0);
const promo01 = await page.locator('#scr-01 .cat-promo').textContent();
T('۰۱: متن کادر اشتراک — «تأمین‌کنندگان من»', promo01.includes('تأمین‌کنندگان من') && !promo01.includes('کاتالوگهای مورد علاقه'));
await shot('05-01-stats-footer');
await page.locator('#scr-01 .cat-stats button').nth(1).click(); await sleep(350);
T('لمس باکس مشتری ← ۶۲', await page.locator('#scr-62').isVisible() && (await page.evaluate(() => location.hash)) === '#62');
await page.goto(FILE + '#07'); await page.reload(); await sleep(300);
const t07 = await page.locator('#scr-07').textContent();
T('۰۷: ردیف «مشتریان شما» + مشتری‌شدنِ ثبت‌نام', t07.includes('مشتریان شما') && t07.includes('۴۱ مشتری · ۱۸ تماس · ۱۲۰ بازدید ماه') && t07.includes('مشتری شما می‌شود'));
await page.click('#scr-07 [data-sheet="sheet-reach"]'); await sleep(300);
const reach = await page.locator('#sheet-reach').textContent();
T('reach: گروه اول «مشتریان شما» (فاز ۶۰)', await page.locator('#sheet-reach.show').isVisible() && (await page.locator('#sheet-reach .grp').first().textContent()).trim() === 'مشتریان شما' && (await page.locator('#reach-sub').textContent()).includes('مشتری'));
T('reach: اشاره به مدیریت کامل در ۶۲', reach.includes('مشتریان من'));
await page.click('#sheet-reach .btn[data-close]'); await sleep(250);
await page.goto(FILE + '#01'); await page.reload(); await sleep(300);
await page.click('#scr-01 .cp-ic[data-sheet="sheet-share"]'); await sleep(300);
await page.click('#sheet-share [data-sheet="sheet-cshare"]'); await sleep(300);
T('cshare: بج «مشتری شماست» ×۲', (await page.locator('#sheet-cshare .cts-saved').count()) === 2 && (await page.locator('#sheet-cshare').textContent()).includes('مشتری شماست'));
await page.click('#sheet-cshare .btn[data-close]'); await sleep(250);
await page.goto(FILE + '#53'); await page.reload(); await sleep(300);
T('۵۳: سه‌نشان — مشتری همیشه به قیمت‌های به‌روز دسترسی دارد', (await page.locator('#scr-53 .ih-row').first().textContent()).includes('ذخیرهٔ آن توسط مشتری') && !(await page.locator('#scr-53').textContent()).includes('ذخیره‌کننده'));

/* ═══ ۶. صفحهٔ ۱۰ — تأمین‌کنندگان من + در انتظار عضویت ═══ */
await page.goto(FILE + '#10'); await page.reload(); await sleep(350);
T('۱۰: عنوان «تأمین‌کنندگان من» + شمارنده', (await page.locator('#scr-10 .ttl').textContent()).includes('تأمین‌کنندگان من') && (await page.locator('#saved-cats-count').textContent()).includes('۳ تأمین‌کننده'));
T('۱۰: ۳ ردیف عضو + ۱ ردیف در انتظار', (await page.locator('#saved-cats > .row-card:not(.sup-wait)').count()) === 3 && (await page.locator('#saved-cats > .sup-wait').count()) === 1);
T('۱۰: ردیف انتظار — چیپ + منشأ دعوت', (await page.locator('#saved-cats .sup-wait').textContent()).includes('در انتظار عضویت') && (await page.locator('#saved-cats .sup-wait').textContent()).includes('دعوت‌شده با لینک لیست خرید'));
await shot('06-10-waitrow');
await page.click('#saved-cats .sup-wait [data-supdots]'); await sleep(300);
T('شیت supwait باز + عضویت خودکار', await page.locator('#sheet-supwait.show').isVisible() && (await page.locator('#sheet-supwait .hintnote').textContent()).includes('به‌صورت خودکار'));
await shot('07-10-supwait');
await page.click('#sheet-supwait [data-supdel]'); await sleep(300);
T('حذف دعوت: ردیف رفت، شمارنده همان ۳', (await page.locator('#saved-cats > .row-card').count()) === 3 && (await page.locator('#saved-cats-count').textContent()).includes('۳ تأمین‌کننده'));
await page.goto(FILE + '#42'); await page.reload(); await sleep(300);
T('۴۲: کارت «تأمین‌کنندگان من»', (await page.locator('#scr-42 .card[data-go="10"]').textContent()).includes('تأمین‌کنندگان من'));
await page.goto(FILE + '#23'); await page.reload(); await sleep(300);
T('۲۳: آمار «۱۲ تأمین‌کننده» (نه ذخیره‌کننده)', (await page.locator('#scr-23 .insight-strip').textContent()).includes('۱۲ تأمین‌کننده') && !(await page.locator('#scr-23 .insight-strip').textContent()).includes('ذخیره‌کننده'));

/* ═══ ۷. حالت خالی ۶۲ — موتور رشد ═══ */
await page.goto(FILE + '#62'); await page.reload(); await sleep(300);
let guard = 0;
while ((await page.locator('#cust-rows .row-card').count()) > 0 && guard < 9) {
  guard++;
  await page.click('#cust-rows .row-card [data-cdots]'); await sleep(180);
  await page.click('#sheet-custmenu [data-custdel]'); await sleep(180);
  await page.click('#dlg-custdel [data-custdelok]'); await sleep(220);
}
T('خالی: همهٔ ردیف‌ها حذف شدند', (await page.locator('#cust-rows .row-card').count()) === 0);
T('خالی: کادر «هنوز مشتریای ندارید» + دکمهٔ اشتراک', await page.locator('#cust-empty').isVisible() && (await page.locator('#cust-empty').textContent()).includes('هنوز مشتریای ندارید') && (await page.locator('#cust-empty [data-sheet="sheet-share"]').count()) === 1);
await shot('08-62-empty');
await page.goto(FILE + '#62'); await page.reload(); await sleep(300);
T('ریلود: حالت اولیه برگشت (۶ ردیف)', (await page.locator('#cust-rows .row-card').count()) === 6);

/* e2e */
T('e2e: صفر خطای کنسول/صفحه', errors.length === 0);

await browser.close();
console.log('\n═══ فاز ۶۰ ═══');
console.log('PASS: ' + ok + ' / FAIL: ' + bad);
if (errors.length) console.log('ERRORS:\n' + errors.join('\n'));
process.exit(bad ? 1 : 0);
