// فاز ۶۸ (مالک) — QA قطعی «آیکون سبد در هدر + جداسازی صنف/گروه + مدیریت گروه‌ها + واژگان»
// حکم‌های مالک:
//  ۱) سبد خرید = آیکون جمع‌وجور در هدر کاتالوگ (۱۳) کنار اشتراک‌گذاری — از هر جا یک شکل (پیش‌نمایش/خریدار)
//  ۲) گروه مشتری ≠ صنف: گروه = دسته‌بندی رابطه‌ای خودتان (تخفیف)؛ صنف = نوع کسب‌وکار مشتری (از پروفایل او)
//  ۳) آیکون تنظیمات هدر ۶۲ → شیت «مدیریت گروه‌های مشتری»: ساخت/تغییرنام/حذف + اعضای هر گروه + جابه‌جایی
//  ۴) نوار فیلتر دیواری: دو دکتهٔ مجزا [گروه مشتری][صنف] — هر کدام شیت انتخاب خودش را باز می‌کند
//  ۵) واژگان: املای واحد «سفارش‌ها» در فوتر فروش/عنوان ۶۵/TABSET
// درس‌های QA: بدون reload که state زنده را می‌شوید؛ مسیرهای UIمحور؛ سلکتورهای فارسی با includes
import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';
import { mkdirSync } from 'node:fs';

const RB = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const FILE = 'file://' + resolve(RB, 'index.html');
const SHOTS = '/home/z/my-project/shots-p68';
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

/* ═══ ۱. آیکون سبد در هدر کاتالوگ (۱۳) — بازوی خرید ═══ */
await page.goto(FILE + '#08'); await page.reload(); await sleep(450);
await page.goto(FILE + '#13'); await sleep(450);
T('۱۳: آیکون سبد در هدر (subheader) دیده می‌شود', await vis('#scr-13 .subheader [data-cartopen]'));
T('۱۳: آیکون سبد کنار اشتراک‌گذاری است', await page.evaluate(() => {
  const h = document.querySelector('#scr-13 .subheader');
  const cart = h.querySelector('[data-cartopen]');
  const share = h.querySelector('[data-sheet="sheet-share"]');
  return cart && share && cart.nextElementSibling === share;
}));
T('۱۳: آیکون سبد با آیکون cart', await page.evaluate(() => !!document.querySelector('#scr-13 .subheader [data-cartopen] svg use[href="#i-cart"]')));
T('۱۳: buybar سبک شد (بدون سبد) — ذخیره/پیام/تماس', await page.evaluate(() =>
  document.querySelectorAll('#buybar-13 .btn').length === 3 && document.querySelector('#buybar-13 [data-cartopen]') === null));
await shot('01-13-header-cart');
/* بج شمار + شیت سبد از هدر */
await page.click('.addcart[data-pid="hash50"]'); await sleep(250);
await page.click('[data-acadd]'); await sleep(350);
T('بج ۱ روی آیکون هدر', (await page.locator('#cart-badge-13').textContent()) === '۱');
await page.click('#scr-13 .subheader [data-cartopen]'); await sleep(300);
T('لمس آیکون هدر → شیت سبد باز شد', await page.evaluate(() => document.getElementById('sheet-cart').classList.contains('show')));
T('سبد: ۱ ردیف + جمع برآوردی', await page.locator('#sheet-cart .cart-row').count() === 1 && (await page.locator('#cart-total').textContent()).includes('تومان'));
await shot('02-cart-from-header');
await page.evaluate(() => document.getElementById('backdrop').click()); await sleep(250);
T('پیام «اضافه شد» به آیکون هدر اشاره می‌کند', (await page.locator('#priv-ok').textContent()).includes('آیکون سبد'));

/* ═══ ۲. پیش‌نمایش فروشنده: کاتالوگ همان یک شکل است ═══ */
await page.goto(FILE + '#01'); await page.reload(); await sleep(400);
const to13 = await page.evaluate(() => {
  const b = [...document.querySelectorAll('#scr-01 [data-go="13"]')][0];
  if (b) { b.click(); return true; }
  return false;
});
await sleep(500);
T('پیش‌نمایش: صفحهٔ ۱۳ در بازوی فروش باز شد', to13 && await page.evaluate(() => location.hash === '#13'));
T('پیش‌نمایش: نوار «پیش‌نمایش» دیده می‌شود', await vis('#own-13'));
T('پیش‌نمایش: آیکون سبد هدر همان‌طور دیده می‌شود (یک شکل)', await vis('#scr-13 .subheader [data-cartopen]'));
T('پیش‌نمایش: buybar خریدار مخفی', await page.evaluate(() => document.getElementById('buybar-13').hidden === true));
await shot('03-13-preview-same');

/* ═══ ۳. مدیریت گروه‌های مشتری — آیکون تنظیمات هدر ۶۲ ═══ */
await page.goto(FILE + '#62'); await page.reload(); await sleep(450);
T('۶۲: آیکون تنظیمات در هدر (جای درست)', await page.evaluate(() => {
  const h = document.querySelector('#scr-62 .subheader');
  const gear = h.querySelector('[data-cgmopen]');
  const share = h.querySelector('[data-sheet="sheet-share"]');
  return gear && share && gear.nextElementSibling === share;
}));
await page.click('#scr-62 .subheader [data-cgmopen]'); await sleep(300);
T('شیت «مدیریت گروه‌های مشتری» باز شد', await page.evaluate(() => document.getElementById('sheet-cgmgr').classList.contains('show')));
T('مدیریت: زیرنویس جداسازی صنف/گروه', (await page.locator('#sheet-cgmgr .sub').textContent()).includes('صنف'));
T('مدیریت: ۳ کارت گروه + «بدون گروه»', await page.locator('#cgm-rows .cgm-g').count() === 4);
T('مدیریت: نام‌های رابطه‌ای (همکاران/ویژه/جدید)', (await page.locator('#cgm-rows').textContent()).includes('همکاران') && (await page.locator('#cgm-rows').textContent()).includes('مشتریان ویژه') && (await page.locator('#cgm-rows').textContent()).includes('مشتریان جدید'));
T('مدیریت: بج تخفیف گروه‌ها (٪۵/٪۱۰)', (await page.locator('#cgm-rows').textContent()).includes('٪۵') && (await page.locator('#cgm-rows').textContent()).includes('٪۱۰'));
T('مدیریت: دکتهٔ ساخت گروه جدید', await page.locator('#sheet-cgmgr [data-cgnew]').count() === 1);
T('مدیریت: اعضای هر گروه با صنف در زیرنویس', (await page.locator('#cgm-rows .cgm-m').first().textContent()).includes('سوپرمارکت'));
await shot('04-62-cgmgr');
/* جابه‌جایی مشتری از داخل مدیریت: آریا (همکاران) → مشتریان ویژه */
await page.evaluate(() => { [...document.querySelectorAll('#cgm-rows .cgm-m')].find(x => x.textContent.includes('آریا')).click(); });
await sleep(300);
T('عضو: شیت گروه همان مشتری باز شد', await page.evaluate(() => document.getElementById('sheet-cgassign').classList.contains('show') && document.getElementById('cga-sub').textContent.includes('آریا')));
await page.locator('#cga-rows .pk-row[data-cgap="1"]').click(); await sleep(350);
T('جابه‌جایی: مدیریت خودش برگشت (بدون لمس دوبارهٔ gear)', await page.evaluate(() => document.getElementById('sheet-cgmgr').classList.contains('show')));
T('جابه‌جایی: آریا در کارت مشتریان ویژه', await page.evaluate(() => {
  const cards = [...document.querySelectorAll('#cgm-rows .cgm-g')];
  const v = cards.find(c => c.textContent.includes('مشتریان ویژه'));
  return v && v.textContent.includes('آریا');
}));
T('جابه‌جایی: بج ردیف ۶۲ هم‌گام', (await page.locator('#cust-rows .row-card').nth(1).textContent()).includes('مشتریان ویژه'));
await page.evaluate(() => document.getElementById('backdrop').click()); await sleep(250);
/* ادامه: الماس هنوز در «همکاران» است — آزمون تغییر نام روی گروه ۰ */

/* تغییر نام گروه: همکاران → همکاران شهرستان */
await page.click('#scr-62 .subheader [data-cgmopen]'); await sleep(300);
await page.evaluate(() => { [...document.querySelectorAll('[data-cgpen]')][0].click(); });
await sleep(300);
T('شیت تغییر نام با مقدار فعلی', await page.evaluate(() => document.getElementById('sheet-cgrename').classList.contains('show') && document.getElementById('cgr-name').value === 'همکاران'));
await page.fill('#cgr-name', 'همکاران شهرستان');
await page.click('[data-cgrok]'); await sleep(350);
T('تغییر نام: پیام موفقیت', (await page.locator('#priv-ok').textContent()).includes('همکاران شهرستان'));
T('تغییر نام: بج ردیف‌ها هم‌زمان مهاجرت کردند', await page.evaluate(() =>
  [...document.querySelectorAll('#cust-rows .row-card')].some(x => x.textContent.includes('همکاران شهرستان'))));
await page.click('#scr-62 .subheader [data-cgmopen]'); await sleep(300);
T('تغییر نام: کارت گروه با نام جدید', (await page.locator('#cgm-rows').textContent()).includes('همکاران شهرستان'));
await page.evaluate(() => document.getElementById('backdrop').click()); await sleep(250);
/* شیت فیلتر گروه هم نام جدید را می‌فهمد */
await page.click('#flbar-62 .fl-b[data-flg]'); await sleep(300);
T('فیلتر گروه: نام جدید در گزینه‌ها', (await page.locator('#cgf-rows').textContent()).includes('همکاران شهرستان'));
await page.evaluate(() => { document.querySelector('#cgf-rows .pk-row').click(); }); await sleep(250);

/* حذف گروه: مشتریان جدید (عضو: رستوران مهر) */
await page.click('#scr-62 .subheader [data-cgmopen]'); await sleep(300);
await page.evaluate(() => { [...document.querySelectorAll('[data-cgdel]')].find(b => b.closest('.cgm-g').textContent.includes('مشتریان جدید')).click(); });
await sleep(300);
T('دیالوگ حذف با نام گروه', (await page.locator('#cgdel-q').textContent()).includes('مشتریان جدید'));
await shot('05-cgdel-dlg');
await page.click('[data-cgdelok]'); await sleep(350);
T('حذف: گروه از مدیریت رفت (۳ کارت)', await page.locator('#cgm-rows .cgm-g').count() === 3);
T('حذف: عضو به «بدون گروه» رفت', await page.evaluate(() => {
  const no = [...document.querySelectorAll('#cgm-rows .cgm-g')].find(c => c.textContent.includes('بدون گروه'));
  return no && no.textContent.includes('رستوران مهر');
}));
T('حذف: ردیف ۶۲ بدون بج گروه (مهر)', await page.evaluate(() => {
  const r = [...document.querySelectorAll('#cust-rows .row-card')].find(x => x.textContent.includes('رستوران مهر'));
  return r && !r.querySelector('.cg-tag');
}));
await page.evaluate(() => document.getElementById('backdrop').click()); await sleep(250);

/* ═══ ۴. فیلتر صنف — شیت انتخاب با شمار ═══ */
await page.click('#flbar-62 .fl-b[data-fltc]'); await sleep(300);
T('شیت صنف: عنوان + توضیح «از پروفایل خود او»', (await page.locator('#cgf-title').textContent()).includes('صنف') && (await page.locator('#cgf-sub').textContent()).includes('پروفایل'));
T('شیت صنف: همه + ۴ صنف', await page.locator('#cgf-rows .pk-row').count() === 5);
await page.evaluate(() => { [...document.querySelectorAll('#cgf-rows .pk-row')].find(x => x.textContent.includes('رستوران')).click(); });
await sleep(250);
T('فیلتر صنف رستوران = ۱ ردیف', await page.locator('#cust-rows .row-card').count() === 1);
await page.click('#flbar-62 [data-fltcx]'); await sleep(250);
T('✕ صنف: پاک شد (۶ ردیف)', await page.locator('#cust-rows .row-card').count() === 6);

/* ═══ ۵. واژگان: املای واحد «سفارش‌ها» ═══ */
await page.goto(FILE + '#01'); await sleep(350);
T('فوتر ۰۱: تب «سفارش‌ها» (نه سفارشات)', await page.evaluate(() => {
  const t = document.querySelectorAll('#scr-01 .tabbar .tab')[2];
  return t && t.textContent.includes('سفارش‌ها') && !t.textContent.includes('سفارشات');
}));
await page.goto(FILE + '#65'); await sleep(350);
T('۶۵: عنوان «سفارش‌ها»', (await page.locator('#scr-65 .ttl').textContent()).includes('سفارش‌ها'));
await page.goto(FILE + '#01'); await sleep(300);
await page.goto(FILE + '#18'); await sleep(400);
T('۱۸ (فروش): TABSET با «سفارش‌ها»', await page.evaluate(() => {
  const t = document.querySelectorAll('#scr-18 .tabbar .tab')[2];
  return t && t.textContent.includes('سفارش‌ها') && !t.textContent.includes('سفارشات') && !t.textContent.includes('سفارش‌های من');
}));
T('۱۸ (فروش): نگاشت تب سوم = ۶۵', await page.evaluate(() => document.querySelectorAll('#scr-18 .tabbar .tab')[2].dataset.go === '65'));

/* ═══ ۶. جاروی صفحات متأثر — بدون خطای کنسول و سرریز ═══ */
const ids = ['13', '62', '64', '65', '18', '01', '02', '08', '14'];
const sweep = [];
for (const id of ids) {
  await page.goto(FILE + '#' + id); await sleep(240);
  const sw = await page.evaluate(() => {
    const scr = document.querySelector('.scr:not([hidden])');
    return { ov: scr ? scr.scrollWidth - scr.clientWidth : 1, vis: !!scr };
  });
  if (!sw.vis || sw.ov > 1) sweep.push(id + (sw.ov > 1 ? '(ov=' + sw.ov + ')' : '(missing)'));
}
T('جارو: ۹ صفحهٔ متأثر بدون سرریز', sweep.length === 0);

const counts = await page.evaluate(() => ({
  pages: document.querySelectorAll('#phone > section.scr').length,
  sheets: new Set([...document.querySelectorAll('.sheet')].map(s => s.id)).size,
  dlgs: new Set([...document.querySelectorAll('.dlg')].map(s => s.id)).size
}));
T('اسکلت: ۳۴ صفحه · ۶۴ شیت · ۹ دیالوگ', counts.pages === 34 && counts.sheets === 64 && counts.dlgs === 9);

console.log('\nRESULT: ' + ok + '/' + (ok + bad));
console.log(errors.length ? 'ERRORS:\n' + errors.join('\n') : 'NO CONSOLE/PAGE ERRORS');
await browser.close();
process.exit(bad ? 1 : 0);
