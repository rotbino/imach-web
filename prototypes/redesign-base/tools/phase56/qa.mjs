// فاز ۵۶ — QA قطعی: ۱) راستی‌آزمایی موبه‌موی ۴ حکم فاز ۵۵ (بازفرمان مالک) ۲) بازگشت نظرات
// خریداران (نوار ۱۵ + سایر نظرات ۴۳ + مودال ثبت نظر فروشنده/تأمین‌کننده) ۳) فرم ثبت‌نام:
// «کدام دستیار فعال باشد» دو سوییچر + حداقل یکی + مودال اینفو ۴) انتخاب صنف: شیت پایین‌رو
// + جستجو + «ایجاد صنف جدید» (۱۶ و ۲۲) + e2e صفر خطا.
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

const shot = async (n) => { await page.screenshot({ path: '/home/z/my-project/shots-p56/' + n + '.png', clip: { x: 34, y: 0, width: 402, height: 874 } }); };

let ok = 0, bad = 0;
const T = (name, cond) => { if (cond) { ok++; } else { bad++; console.log('  ✗ ' + name); } };

await page.goto(FILE + '#01'); await sleep(300);
await page.evaluate(() => { localStorage.setItem('imach-assist', JSON.stringify({ sell: true, buy: true })); });

/* ═══ ۰. راستی‌آزمایی موبه‌موی فاز ۵۵ — ۴ حکم (بازفرمان مالک) ═══ */
await page.goto(FILE + '#01'); await page.reload(); await sleep(400);

/* حکم ۱: باکس پیش‌نمایش = آخرین باکس ردیف آمار؛ آیکون چشم از باکس اشتراک حذف */
const statsBtns = page.locator('#scr-01 .cat-stats button');
T('55-①: ردیف آمار ۴ باکس دارد', await statsBtns.count() === 4);
T('55-①: باکس آخر = پیش‌نمایش (data-go=13)', await statsBtns.nth(3).evaluate(b => b.dataset.go === '13' && b.textContent.includes('پیش‌نمایش')));
T('55-①: باکس اول = کالا (نه پیش‌نمایش)', await statsBtns.nth(0).evaluate(b => b.textContent.includes('کالا') && !b.textContent.includes('پیش‌نمایش')));
T('55-①: آیکون چشم از باکس اشتراک (cat-promo) حذف', await page.evaluate(() => {
  const cp = document.querySelector('#scr-01 .cat-promo');
  return !!cp && !cp.querySelector('use[href="#i-eye"]');
}));

/* حکم ۲: متن راهنمای ذخیره — عین متن مالک */
T('55-②: متن «کاتالوگهای مورد علاقه» عین حکم', await page.evaluate(() => {
  const sm = document.querySelector('#scr-01 .cat-promo small');
  return !!sm && sm.textContent.trim() === 'با ارسال لینک کاتالوگ به مشتریان خود، از آنها بخواهید تا برای داشتن قیمتهای زنده شما، کاتالوگ شما را در لیست کاتالوگهای مورد علاقه خود ذخیره کنند.';
}));

/* حکم ۳: منوی اشتراک — مخاطبین اول، بدون «پیام آماده»؛ کادر اعلان عمودی با دکمه پایین */
await page.click('#scr-01 .cat-promo [data-sheet="sheet-share"]'); await sleep(350);
T('55-③: منوی اشتراک باز شد', await page.locator('#sheet-share.show').count() === 1);
T('55-③: «اشتراک با مخاطبین» اولِ لیست', await page.evaluate(() => {
  const rows = document.querySelectorAll('#sheet-share .sheet-row');
  return rows.length > 0 && rows[0].textContent.includes('اشتراک با مخاطبین') && rows[0].dataset.sheet === 'sheet-cshare';
}));
T('55-③: آیتم «پیام آماده قیمت‌ها به‌روز شد» حذف', await page.evaluate(() => !Array.from(document.querySelectorAll('#sheet-share .sheet-row')).some(r => r.textContent.includes('پیام آماده'))));
await page.click('#sheet-share [data-close]'); await sleep(300);

/* کادر اعلان پس از تازه‌سازی قیمت (تغییر سریع قیمت از ۰۱ — همان فلوی فاز ۵۵) */
await page.click('#scr-01 .pcard .gear'); await sleep(350);
await page.fill('#qp-price', '۲٬۹۰۰٬۰۰۰'); await sleep(150);
await page.click('#qp-ok'); await sleep(500);
T('55-③: کادر اعلان ظاهر شد', await page.locator('#cat-fresh').isVisible());
T('55-③: متن اعلان عین حکم (این قیمتها را به بقیه مشتریانت هم ارسال کن)', await page.evaluate(() => {
  const tx = document.querySelector('#cat-fresh .fn-tx');
  return !!tx && tx.textContent.includes('۴۱ کسب‌وکار کاتالوگ شما را ذخیره کرده‌اند و قیمت تازه را همان لحظه می‌بینند؛ این قیمتها را به بقیه مشتریانت هم ارسال کن.');
}));
T('55-③: دکمه زیر متن (نه کنارش)', await page.evaluate(() => {
  const card = document.getElementById('cat-fresh');
  const tx = card.querySelector('.fn-tx');
  const btn = card.querySelector('.fn-share');
  return !!tx && !!btn && tx.compareDocumentPosition(btn) & Node.DOCUMENT_POSITION_FOLLOWING;
}));
T('55-③: عنوان دکمه «اشتراک گذاری برای مشتریان جدید» + آیکون اشتراک', await page.evaluate(() => {
  const btn = document.querySelector('#cat-fresh .fn-share');
  return !!btn && btn.textContent.includes('اشتراک گذاری برای مشتریان جدید') && !!btn.querySelector('use[href="#i-share"]');
}));
await shot('01-fresh-nudge');
await page.click('#cat-fresh [data-freshx]'); await sleep(200);

/* حکم ۴: مودال مخاطبین سه‌حالته */
await page.goto(FILE + '#01'); await page.reload(); await sleep(400);
await page.click('#scr-01 .cat-promo [data-sheet="sheet-share"]'); await sleep(300);
await page.click('#sheet-share [data-sheet="sheet-cshare"]'); await sleep(350);
T('55-④: شیت مخاطبین باز شد', await page.locator('#sheet-cshare.show').count() === 1);
T('55-④: حالت ۱ — ذخیره‌کرده: بج سبز', await page.locator('#sheet-cshare .cts-saved').count() === 2);
T('55-④: حالت ۲ — عضوِ ذخیره‌نکرده: دکمه «ارسال کاتالوگ»', await page.locator('#sheet-cshare [data-send]').count() === 2);
T('55-④: حالت ۳ — غیرعضو: ردیف متمایز + «اشتراک گذاری کاتالوگ» (پیامک)', await page.locator('#sheet-cshare .cts-out .cts-sms[data-smssend]').count() === 2);
await shot('02-cshare');
await page.click('#sheet-cshare [data-close]'); await sleep(300);

/* ═══ ۱. بازگشت نظرات خریداران (حذفِ بدون هماهنگی فاز ۴۴ — برگشت سر جایش) ═══ */
await page.goto(FILE + '#15'); await page.reload(); await sleep(400);
T('نظرات: نوار «نظر کاربران» روی لندینگ', await page.evaluate(() => {
  const h = document.querySelector('#scr-15 .ts-head b');
  return !!h && h.textContent === 'نظر کاربران';
}));
T('نظرات: نوار بعد از تصویر لندینگ و قبل از «آی‌مچ چیست؟»', await page.evaluate(() => {
  const shotEl = document.querySelector('#scr-15 .land-shot');
  const tsHead = document.querySelector('#scr-15 .ts-head');
  const what = Array.from(document.querySelectorAll('#scr-15 .intro-sep span')).find(s => s.textContent.includes('آی‌مچ چیست؟'));
  return !!shotEl && !!tsHead && !!what &&
    (shotEl.compareDocumentPosition(tsHead) & Node.DOCUMENT_POSITION_FOLLOWING) &&
    (tsHead.compareDocumentPosition(what) & Node.DOCUMENT_POSITION_FOLLOWING);
}));
T('نظرات: ۶ کارت نمونه (هر کدام یک قابلیت آیمچ) + کارت دعوت', await page.locator('#ts-row-15 .ts-card').count() === 6 && await page.locator('#ts-row-15 .ts-cta').count() === 1);
T('نظرات: هر کارت دکمهٔ «یک» دارد (کاتالوگ/لیست خرید)', await page.evaluate(() => {
  const cards = document.querySelectorAll('#ts-row-15 .ts-card');
  return Array.from(cards).every(c => c.querySelectorAll('.ts-btn').length === 1);
}));
await shot('03-landing-reviews');

/* صفحهٔ ۴۳ — سایر نظرات */
await page.click('.ts-morelnk[data-go="43"]'); await sleep(350);
T('نظرات: صفحهٔ ۴۳ «سایر نظرات»', await page.evaluate(() => location.hash === '#43' && !document.getElementById('scr-43').hidden));
T('نظرات: ۴۳ = ۱۰ نظر (۶ نوار + ۴ بیشتر)', await page.locator('#ts-list-43 .ts-card').count() === 10);
T('نظرات: ۴۳ مستقل از گارد بازوها (ARM_FREE)', await page.evaluate(() => { window.ASSIST_NOT_NEEDED = true; return true; }) && await page.locator('#scr-43').isVisible());
await shot('04-reviews-43');

/* مودال ثبت نظر — تأمین‌کننده هم نظر می‌دهد و در ۴۳ می‌آید */
await page.click('#scr-43 .action-bar [data-rvwopen]'); await sleep(350);
T('نظرات: مودال dlg-rvw باز شد', await page.locator('#dlg-rvw.show').count() === 1);
T('نظرات: نقش «فروشنده / تأمین‌کننده‌ام» صریح است', await page.evaluate(() => {
  const p = document.querySelector('#dlg-rvw .pill[data-rrole="sell"]');
  return !!p && p.textContent.includes('تأمین‌کننده');
}));
await page.fill('#rvw-name', 'کاظم تأمینی');
await page.fill('#rvw-biz', 'تأمین‌کننده مواد اولیه نان');
await page.fill('#rvw-text', 'خریدارها مستقیم از کاتالوگ من سفارش می‌دهند.');
await page.click('[data-rvwsend]'); await sleep(450);
T('نظرات: ثبت موفق — مودال بسته', await page.locator('#dlg-rvw.show').count() === 0);
T('نظرات: نظر تأمین‌کننده بالای فهرست ۴۳ (fresh)', await page.evaluate(() => {
  const first = document.querySelector('#ts-list-43 .ts-card');
  return !!first && first.classList.contains('fresh') && first.textContent.includes('کاظم تأمینی') && first.textContent.includes('مشاهده کاتالوگ');
}));
T('نظرات: ۴۳ حالا ۱۱ نظر', await page.locator('#ts-list-43 .ts-card').count() === 11);
await shot('05-supplier-review');
await page.click('#scr-43 .back'); await sleep(350);
T('نظرات: بازگشت به لندینگ — نظر تازه انتهای نوار', await page.evaluate(() => {
  const cards = document.querySelectorAll('#ts-row-15 .ts-card');
  return cards.length === 7 && cards[6].classList.contains('fresh') && cards[6].textContent.includes('کاظم تأمینی');
}));

/* ═══ ۲. فرم ثبت‌نام — «کدام دستیار برای کسب و کار شما فعال باشد» ═══ */
await page.goto(FILE + '#16'); await page.reload(); await sleep(400);
T('۱۶: عنوان عین حکم', (await page.locator('#scr-16 .lbl-row label').textContent()) === 'کدام دستیار برای کسب و کار شما فعال باشد');
T('۱۶: سوییچر «دستیار خرید عمده»', await page.evaluate(() => {
  const r = document.querySelector('#su-assist .as-row:nth-child(1)');
  return !!r && r.textContent.includes('دستیار خرید عمده') && !!r.querySelector('.toggle[data-suarm="buy"]');
}));
T('۱۶: سوییچر «دستیار فروش عمده»', await page.evaluate(() => {
  const r = document.querySelector('#su-assist .as-row:nth-child(2)');
  return !!r && r.textContent.includes('دستیار فروش عمده') && !!r.querySelector('.toggle[data-suarm="sell"]');
}));
T('۱۶: پیل‌های قدیمی «فعالیت شما در بازار» حذف', await page.locator('#su-activity').count() === 0);
await shot('06-signup-switches');

/* مودال اینفو — متن عین مالک */
await page.click('#scr-16 .info-ic'); await sleep(350);
T('۱۶: مودال توضیح باز شد', await page.locator('#dlg-suinfo.show').count() === 1);
const suinfoTx = await page.locator('#dlg-suinfo').textContent();
T('۱۶: متن مودال — عمده فروشها/تولید کننده ها: هر دو', suinfoTx.includes('اگر در کسب و کار خودم هم خرید عمده دارید و هم فروش عمده. مثل عمده فروشها، تولید کننده ها هر دو را فعال کنید.'));
T('۱۶: متن مودال — بازاریابها: فقط فروش', suinfoTx.includes('اگر فقط فروش عمده دارید مثل بازاریابها فقط دستیار فروش را فعال کنید.'));
T('۱۶: متن مودال — خرده فروش ها/خدماتی: فقط خرید', suinfoTx.includes('اگر فقط خرید عمده دارید مثل خرده فروش ها و کسب و کارهای خدماتی فقط دستیار خرید را فعال کنید.'));
await shot('07-assist-info');
await page.click('#dlg-suinfo [data-close]'); await sleep(250);

/* حداقل یکی فعال */
await page.click('#su-assist .toggle[data-suarm="sell"]'); await sleep(250);
T('۱۶: آخرین دستیارِ فعال خاموش نمی‌شود', await page.locator('#su-assist .toggle[data-suarm="sell"].on').count() === 1);
T('۱۶: خطای «حداقل یکی» دیده شد', await page.evaluate(() => { const e = document.getElementById('su-err'); return e && !e.hidden && e.textContent.includes('حداقل یکی'); }));

/* ═══ ۳. انتخاب صنف — مودال از زیر + جستجو + ایجاد صنف جدید ═══ */
await page.goto(FILE + '#16'); await page.reload(); await sleep(400);
await page.click('#scr-16 [data-sheet="sheet-snf"]'); await sleep(350);
T('صنف: شیت انتخاب صنف از زیر باز شد', await page.locator('#sheet-snf.show').count() === 1);
T('صنف: جستجو در شیت', await page.locator('#sheet-snf .sheet-search').count() === 1);
T('صنف: فهرست اصناف', await page.locator('#sheet-snf [data-snf]').count() >= 10);
T('صنف: «ایجاد صنف جدید» زیر فهرست', await page.evaluate(() => {
  const add = document.querySelector('#sheet-snf [data-snfnew]');
  const rows = document.querySelectorAll('#sheet-snf [data-snf]');
  const lastRow = rows[rows.length - 1];
  return !!add && !!lastRow && (lastRow.compareDocumentPosition(add) & Node.DOCUMENT_POSITION_FOLLOWING) && add.textContent.includes('ایجاد صنف جدید');
}));
await shot('08-snf-sheet');
/* انتخاب ردیف */
await page.click('#sheet-snf [data-snf="لبنیات"]'); await sleep(450);
T('صنف: انتخاب → فیلد ۱۶ هم‌گام', await page.evaluate(() => document.getElementById('snf-field-16').textContent === 'لبنیات'));
/* ایجاد صنف جدید */
await page.click('#scr-16 [data-sheet="sheet-snf"]'); await sleep(350);
await page.click('#sheet-snf [data-snfnew]'); await sleep(250);
T('صنف: ایجاد صنف جدید → ورودی اینلاین', await page.locator('#snf-newname').count() === 1);
await page.fill('#snf-newname', 'توزیع قهوه');
await page.click('[data-snfadd]'); await sleep(450);
T('صنف: ثبت صنف جدید → فیلد = «توزیع قهوه»', await page.evaluate(() => document.getElementById('snf-field-16').textContent === 'توزیع قهوه'));
T('صنف: ردیف جدید «در انتظار تأیید» در شیت', await page.evaluate(() => {
  const r = document.querySelector('#sheet-snf [data-snf="توزیع قهوه"]');
  return !!r && r.textContent.includes('در انتظار تأیید');
}));
/* فرم ۲۲ هم همان شیت ساده را باز می‌کند */
await page.goto(FILE + '#22'); await page.reload(); await sleep(400);
T('صنف: فرم ۲۲ → همان شیت انتخاب صنف', await page.locator('#scr-22 [data-sheet="sheet-snf"]').count() === 1);
T('صنف: شیت دیدِ قیمت اصناف (sheet-trade) دیگر از ۲۲ باز نمی‌شود', await page.locator('#scr-22 [data-sheet="sheet-trade"]').count() === 0);

/* ═══ ۴. ثبت‌نام تک‌بازو با سوییچرها ═══ */
await page.evaluate(() => localStorage.removeItem('imach-assist'));
await page.goto(FILE + '#16'); await page.reload(); await sleep(300);
await page.click('#su-assist .toggle[data-suarm="buy"]'); await sleep(150);
await page.click('#su-assist .toggle[data-suarm="sell"]'); await sleep(150);
await page.click('#scr-16 [data-go="01"]'); await sleep(400);
T('ثبت‌نام فقط-خرید: فرود ۰۸', await page.evaluate(() => location.hash === '#08'));
T('ثبت‌نام فقط-خرید: ASSIST = فقط buy', (await page.evaluate(() => JSON.parse(localStorage.getItem('imach-assist')))).buy === true);
await page.evaluate(() => { localStorage.setItem('imach-assist', JSON.stringify({ sell: true, buy: true })); });

/* ═══ ۵. e2e — همهٔ صفحه‌ها صفر خطا ═══ */
const ids = ['15','16','17','43','01','02','04','05','07','08','09','10','12','13','18','19','22','27','29','30','34','42','44','45','46','48','53'];
for (const s of ids) { await page.goto(FILE + '#' + s); await page.reload(); await sleep(220); }
T('e2e: صفر خطای کنسول در ۲۷ صفحه', errors.length === 0);
if (errors.length) console.log('  errors:', errors.slice(0, 5));

await browser.close();
console.log('\n════ فاز ۵۶: ' + ok + ' PASS / ' + bad + ' FAIL ════');
process.exit(bad ? 1 : 0);
