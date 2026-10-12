// فاز ۵۶ — اسموک سریع: خطاهای کنسول + وجود عناصر کلیدی + جریان‌های رفتاری
import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';

const RB = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const URL = 'file://' + resolve(RB, 'index.html');

const errors = [];
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push('CONSOLE: ' + m.text()); });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const T = (name, ok) => console.log((ok ? 'PASS ' : 'FAIL ') + name) || !ok;

let fails = 0;

// ── لندینگ: نوار نظرات ──
await page.goto(URL + '#15'); await sleep(400);
fails += T('۱۵: نوار «نظر کاربران» موجود', await page.locator('#scr-15 .ts-head b').textContent() === 'نظر کاربران');
fails += T('۱۵: ۶ کارت نظر + کارت دعوت', await page.locator('#ts-row-15 .ts-card').count() === 6 && await page.locator('#ts-row-15 .ts-cta').count() === 1);
fails += T('۱۵: لینک «سایر نظرات» → ۴۳', await page.locator('.ts-morelnk[data-go="43"]').count() === 1);

// ── ناوبری به ۴۳ ──
await page.click('.ts-morelnk[data-go="43"]'); await sleep(350);
fails += T('۴۳: صفحهٔ سایر نظرات باز شد', await page.locator('#scr-43').isVisible());
fails += T('۴۳: ۱۰ نظر رندر شد', await page.locator('#ts-list-43 .ts-card').count() === 10);
fails += T('۴۳: دکمهٔ «ثبت نظر شما» در اکشن‌بار', await page.locator('#scr-43 .action-bar [data-rvwopen]').count() === 1);

// ── مودال ثبت نظر — فروشنده/تأمین‌کننده ──
await page.click('#scr-43 .action-bar [data-rvwopen]'); await sleep(350);
fails += T('مودال dlg-rvw باز شد', await page.locator('#dlg-rvw.show').count() === 1);
fails += T('مودال: پیل «فروشنده / تأمین‌کننده‌ام»', await page.locator('#dlg-rvw .pill[data-rrole="sell"]').textContent() === 'فروشنده / تأمین‌کننده‌ام');
// ارسال خالی → خطا
await page.click('[data-rvwsend]'); await sleep(150);
fails += T('مودال: ارسال خالی → خطا', await page.evaluate(() => !document.getElementById('rvw-err').hidden));
// پر کردن و ارسال
await page.fill('#rvw-name', 'رضا تستی');
await page.fill('#rvw-biz', 'تأمین‌کننده تستی');
await page.fill('#rvw-text', 'کاتالوگ آیمچ فروش من را منظم کرد.');
await page.click('[data-rvwsend]'); await sleep(400);
fails += T('ثبت: مودال بسته شد', await page.locator('#dlg-rvw.show').count() === 0);
fails += T('ثبت: نظر تازه بالای فهرست ۴۳ (live)', await page.evaluate(() => {
  var first = document.querySelector('#ts-list-43 .ts-card');
  return !!first && first.classList.contains('fresh') && first.textContent.indexOf('رضا تستی') >= 0;
}));
fails += T('ثبت: ۴۳ حالا ۱۱ نظر', await page.locator('#ts-list-43 .ts-card').count() === 11);

// ── نوار لندینگ هم نظر تازه را دارد ──
await page.click('#scr-43 .back'); await sleep(350);
fails += T('۱۵: برگشت از ۴۳ → نوار ۷ کارت (۶+تازه)', await page.locator('#ts-row-15 .ts-card').count() === 7);
fails += T('۱۵: کارت دعوت «ثبت نظر شما»', await page.locator('#ts-row-15 .ts-cta [data-rvwopen]').count() === 1);

// ── فرم ثبت‌نام ۱۶ ──
await page.goto(URL + '#16'); await sleep(400);
fails += T('۱۶: عنوان «کدام دستیار برای کسب و کار شما فعال باشد»', await page.locator('#scr-16 .lbl-row label').textContent() === 'کدام دستیار برای کسب و کار شما فعال باشد');
fails += T('۱۶: دو سوییچر خرید/فروش', await page.locator('#su-assist .toggle[data-suarm]').count() === 2);
fails += T('۱۶: پیش‌فرض فروش روشن', await page.locator('#su-assist .toggle[data-suarm="sell"].on').count() === 1);
fails += T('۱۶: آیکون اینفو مودال', await page.locator('#scr-16 .info-ic[data-sheet="dlg-suinfo"]').count() === 1);
// مودال اینفو
await page.click('#scr-16 .info-ic'); await sleep(350);
fails += T('مودال dlg-suinfo باز شد + متن مالک', await page.evaluate(() => {
  var d = document.getElementById('dlg-suinfo');
  return !!d && d.classList.contains('show') && d.textContent.indexOf('مثل عمده فروشها، تولید کننده ها') >= 0;
}));
await page.click('#dlg-suinfo [data-close]'); await sleep(250);
// خاموش‌کردن آخرین دستیار → خطا
await page.click('#su-assist .toggle[data-suarm="sell"]'); await sleep(200);
fails += T('۱۶: خاموش‌کردن آخرین دستیار بلاک + خطا', await page.evaluate(() => {
  var tg = document.querySelector('#su-assist .toggle[data-suarm="sell"]');
  var er = document.getElementById('su-err');
  return tg.classList.contains('on') && er && !er.hidden;
}));
// روشن‌کردن خرید + ثبت‌نام → فرود خانهٔ خرید (۰۱)
await page.click('#su-assist .toggle[data-suarm="buy"]'); await sleep(150);
await page.click('#scr-16 .action-bar [data-go="01"]'); await sleep(500);
fails += T('ثبت‌نام با هر دو روشن → فرود ۰۱', await page.evaluate(() => !document.getElementById('scr-01').hidden));

// ── شیت انتخاب صنف (از ۱۶) ──
await page.goto(URL + '#16'); await sleep(400);
await page.click('#scr-16 [data-sheet="sheet-snf"]'); await sleep(350);
fails += T('شیت صنف باز شد', await page.locator('#sheet-snf.show').count() === 1);
fails += T('شیت صنف: جستجو + «ایجاد صنف جدید»', await page.locator('#sheet-snf .sheet-search').count() === 1 && await page.locator('#sheet-snf [data-snfnew]').count() === 1);
fails += T('شیت صنف: ۱۰ ردیف صنف', await page.locator('#sheet-snf [data-snf]').count() === 10);
// انتخاب ردیف دوم
await page.click('#sheet-snf [data-snf="سوپرمارکت"]'); await sleep(400);
fails += T('انتخاب: فیلد ۱۶ هم‌گام شد', await page.evaluate(() => document.getElementById('snf-field-16').textContent === 'سوپرمارکت'));
// ایجاد صنف جدید
await page.click('#scr-16 [data-sheet="sheet-snf"]'); await sleep(350);
await page.click('#sheet-snf [data-snfnew]'); await sleep(200);
fails += T('ایجاد صنف: ورودی اینلاین ظاهر شد', await page.locator('#snf-newname').count() === 1);
await page.fill('#snf-newname', 'پخش شوینده');
await page.click('[data-snfadd]'); await sleep(400);
fails += T('ایجاد صنف: فیلد = صنف جدید', await page.evaluate(() => document.getElementById('snf-field-16').textContent === 'پخش شوینده'));
fails += T('ایجاد صنف: ردیف جدید در شیت', await page.evaluate(() => !!document.querySelector('#sheet-snf [data-snf="پخش شوینده"]')));

// ── فرم ۲۲: صنف هم از همان شیت ──
await page.goto(URL + '#22'); await sleep(400);
fails += T('۲۲: فیلد صنف → sheet-snf', await page.locator('#scr-22 [data-sheet="sheet-snf"]').count() === 1);

// ── console/page errors در همهٔ صفحات ──
const ids = ['15','16','17','43','01','02','05','07','08','09','10','12','13','18','19','22','27','29','30','34','42','44','45','46','48','53'];
for (const id of ids) {
  await page.goto(URL + '#' + id); await sleep(160);
}
if (errors.length) { console.log('JS ERRORS:\n' + errors.join('\n')); fails++; }
else console.log('NO JS ERRORS across ' + ids.length + ' screens');

await browser.close();
console.log(fails === 0 ? 'ALL SMOKE PASS' : 'FAILURES: ' + fails);
process.exit(fails ? 1 : 0);
