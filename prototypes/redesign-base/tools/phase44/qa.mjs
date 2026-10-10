// فاز ۴۴ — QA رفتاری ساده‌سازی MVP + e2e همهٔ صفحه‌ها
// پوشش: ساختار (۲۴ صفحه) · فوترهای ۴/۳ تبی · پروفایل هاب (۴۲) · شارژ (۲۹) · تبلیغ (۳۰)
// · درخواست ساده (۱۲) · اعلان‌ها (۲۷) · ادغام مالک در ۰۲ · ۴۴ (تأیید همه + بدون تخفیف/اکسل) · ۰۸ → ۰۹ · ظرایف فرم ۰۴
import { chromium } from 'playwright';

const FILE = 'file://' + process.cwd() + '/index.html';
let pass = 0, fail = 0;
const ok = (name, cond) => { if (cond) { pass++; } else { fail++; console.log('  ✗ FAIL: ' + name); } };
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 402, height: 874 } });
const errors = [];
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });

await page.goto(FILE);
await page.evaluate(() => { localStorage.setItem('imach-assist', JSON.stringify({ sell: true, buy: true })); });
await page.goto(FILE + '#01');
await page.reload();
await sleep(250);

/* ═══ ۱. ساختار کلی ═══ */
const ALIVE = ['01','02','04','05','07','08','09','10','12','13','14','15','16','17','18','19','22','27','29','30','34','42','44'];
const DEAD = ['03','06','11','20','21','23','24','25','26','28','31','32','33','35','36','37','38','39','40','41','43','d1','d2'];

/* ═══ ۰. سلامت درخت DOM — فاز ۴۴-فیکس ═══
   دو </div> زائد (خط ۲۱۵۵ و ۴۵۴۷ قدیم) قاب #phone را زودتر از موعد می‌بستند:
   ۱۹ صفحه بیرون از گوشی رندر می‌شدند، ارتفاع سند تا ۴۰۰۰+ می‌رفت و شیت‌ها لنگر
   پوزیشن خود را از دست می‌دادند. این چک‌ها آن کلاس خرابی را برای همیشه قفل می‌کنند. */
ok('همهٔ ۲۳ صفحه داخل قاب گوشی‌اند', await page.evaluate(() => document.querySelectorAll('#phone > section.scr').length === 23));
ok('هیچ صفحه‌ای بیرون از گوشی نیست', await page.evaluate(() => document.querySelectorAll('#stage > .scr, body > .scr').length === 0));
ok('همهٔ شیت/دیالوگ‌ها داخل گوشی‌اند (لنگر position:absolute)', await page.evaluate(() => {
  const sheets = document.querySelectorAll('.sheet, .dlg');
  return sheets.length >= 30 && Array.from(sheets).every(s => document.getElementById('phone').contains(s));
}));
ok('ارتفاع سند = ارتفاع ویوپورت (صفحه‌ها انباشته نمی‌شوند)', await page.evaluate(() => document.documentElement.scrollHeight <= 1000));

for (const s of ALIVE) ok('صفحهٔ ' + s + ' موجود است', await page.locator('#scr-' + s).count() === 1);
for (const s of DEAD) ok('صفحهٔ ' + s + ' حذف شده', await page.locator('#scr-' + s).count() === 0);
ok('لندینگ دسکتاپ (d3) موجود', await page.locator('#scr-d3').count() === 1);
const DEAD_SHEETS = ['sheet-campaign','sheet-target','sheet-cgnew','sheet-cgroup','sheet-cmnts','sheet-cowork','sheet-follow','sheet-pdiscount','sheet-vgedit','sheet-vgpick','sheet-vgroups','sheet-video','sheet-xlsx','sheet-offerview','sheet-alertinfo','dlg-xlsbulk','dlg-campok','dlg-rvw'];
for (const s of DEAD_SHEETS) ok('شیت/دیالوگ ' + s + ' حذف شده', await page.locator('#' + s).count() === 0);
ok('dlg-pct مانده', await page.locator('#dlg-pct').count() === 1);
ok('dlg-terms مانده', await page.locator('#dlg-terms').count() === 1);
ok('dlg-lowcharge مانده', await page.locator('#dlg-lowcharge').count() === 1);

/* ═══ ۲. فوترها و هدر ═══ */
ok('فوتر فروش ۴ تب', await page.locator('#scr-01 .tabbar .tab').count() === 4);
ok('فوتر فروش: تنظیمات (نه پروفایل)', (await page.locator('#scr-01 .tab').nth(3).textContent()).includes('تنظیمات'));
ok('فوتر فروش بدون «کارها»', !(await page.locator('#scr-01 .tabbar').textContent()).includes('کارها'));
ok('فوتر خرید ۳ تب', await page.locator('#scr-08 .tabbar .tab').count() === 3);
ok('آواتار پروفایل در ۰۱', await page.locator('#scr-01 .appbar .avatar[data-go="42"]').count() === 1);
ok('آواتار پروفایل در ۰۸', await page.locator('#scr-08 .appbar .avatar[data-go="42"]').count() === 1);
ok('نوار «قیمت و موجودی» روی کاتالوگ', await page.locator('#scr-01 .bulk-bar[data-go="44"]').isVisible());
ok('بدون دکمهٔ selmode (کمپین)', await page.locator('#scr-01 .selmode-btn').count() === 0);
ok('بدون نوار انتخاب (selbar)', await page.locator('#scr-01 .selbar').count() === 0);
ok('بدون stat-strip مرده در ۰۱', await page.locator('#scr-01 .stat-strip').count() === 0);
ok('ویترین کاتالوگ مانده', (await page.locator('#scr-01 .showcase .name').first().textContent()).includes('پخش برنج پارس'));
ok('کارت کالا ← ۰۲ (ادغام ۰۳)', (await page.locator('#scr-01 .pcard').first().getAttribute('data-go')) === '02');
ok('چرخ‌دندهٔ کارت ← sheet-pset', (await page.locator('#scr-01 .pcard .gear').first().getAttribute('data-sheet')) === 'sheet-pset');

/* ═══ ۳. پروفایل هاب (۴۲) ═══ */
await page.click('#scr-01 .appbar .avatar');
await sleep(250);
ok('آواتار → ۴۲ باز شد', await page.locator('#scr-42').isVisible());
ok('۴۲: فرم شخصی', await page.locator('#pp-fn').count() === 1);
ok('۴۲: کارت کسب‌وکار', await page.locator('#scr-42 .biz-card').count() === 1);
ok('۴۲: کارت شارژ', await page.locator('#scr-42 .wallet-card[data-go="29"]').count() === 1);
ok('۴۲: کاتالوک‌های ذخیره‌شده', await page.locator('#scr-42 .card[data-go="10"]').count() === 1);
ok('۴۲: خروج از حساب', (await page.locator('#scr-42').textContent()).includes('خروج از حساب'));

/* ═══ ۴. شارژ (۲۹) ═══ */
await page.click('#scr-42 .wallet-card');
await sleep(250);
ok('شارژ باز شد', await page.locator('#scr-29').isVisible());
ok('عنوان «شارژ» (نه کیف پول)', !(await page.locator('#scr-29 .ttl').textContent()).includes('کیف پول'));
ok('کارت‌به‌کارت + فیش', await page.locator('#ch-receipt').isVisible());
ok('دکمهٔ ارسال فیش', await page.locator('#ch-send').isVisible());
ok('اشتراک‌گذاری (هدیه)', (await page.locator('#scr-29').textContent()).includes('ثبت‌نام از لینک شما'));
ok('بدون بسته‌های پرداخت قدیمی', await page.locator('#scr-29 .paypack').count() === 0);
const w0 = await page.locator('[data-wallet]').first().textContent();
await page.click('#ch-send');
await sleep(2300);
const w1 = await page.locator('[data-wallet]').first().textContent();
ok('ارسال فیش → شارژ (ماک تأیید)', w0 !== w1);

/* ═══ ۵. تبلیغات (۳۰) ═══ */
await page.goto(FILE + '#30'); await page.reload(); await sleep(250);
ok('۳۰: تبلیغات و افزایش فروش', await page.locator('#scr-30').isVisible());
ok('۳۰: سوییچ فروشندهٔ ویژه', await page.locator('#ad-toggle').isVisible());
ok('۳۰: گزارش داخلی', (await page.locator('#scr-30').textContent()).includes('گزارش این تبلیغ'));
ok('۳۰: بدون سوییچ کمپین/هدفمند', await page.locator('#rep-camp').count() === 0 && await page.locator('#rep-target').count() === 0);
ok('۳۰: هزینه فقط درخواست ۵٬۰۰۰', (await page.locator('#scr-30').textContent()).includes('۵٬۰۰۰ تومان'));
ok('۳۰: لینک شارژ', await page.locator('#scr-30 .wallet-card[data-go="29"]').count() === 1);

/* ═══ ۶. درخواست خرید ساده (۱۲) ═══ */
await page.goto(FILE + '#12'); await page.reload(); await sleep(250);
ok('۱۲: تأمین‌کننده‌ها با تیک', await page.locator('#scr-12 .checkrow').count() === 4);
ok('۱۲: فروشندهٔ ویژه بالا', (await page.locator('#scr-12 .checkrow').first().textContent()).includes('فروشندهٔ ویژه'));
ok('۱۲: بدون «شبکه iMach»', !(await page.locator('#scr-12').textContent()).includes('شبکه iMach'));
ok('۱۲: بدون «افزودن تأمین‌کننده»', !(await page.locator('#scr-12').textContent()).includes('تأمین‌کنندهٔ دیگر'));
await page.click('#scr-12 .qty-stepper button:last-child'); // +
await sleep(120);
ok('۱۲: استپر مقدار کار می‌کند', (await page.locator('#scr-12 .qty-stepper .val').textContent()).includes('۲۱'));
await page.click('#rfq-send');
await sleep(1100);
ok('۱۲: ارسال → پیام‌ها (۱۸)', await page.locator('#scr-18').isVisible());

/* ═══ ۷. درخواست‌های فروشنده (۰۵) + شیت reqview ═══ */
await page.goto(FILE + '#05'); await page.reload(); await sleep(250);
ok('۰۵: بدون تب سه‌گانه', await page.locator('#scr-05 .inner-tabs').count() === 0);
ok('۰۵: کارت درخواست ← شیت', (await page.locator('#scr-05 .req-card').first().getAttribute('data-sheet')) === 'sheet-reqview');
await page.click('#scr-05 .req-card');
await sleep(300);
ok('شیت reqview باز شد', await page.locator('#sheet-reqview.show').isVisible());
ok('reqview: پاسخ در گفتگو', (await page.locator('#sheet-reqview .btn-primary').getAttribute('data-go')) === '19');

/* ═══ ۸. اعلان‌ها (۲۷) ═══ */
await page.goto(FILE + '#27'); await page.reload(); await sleep(250);
ok('۲۷: درخواست جدید → ۰۵', await page.locator('#scr-27 .notif .act[data-go="05"]').count() === 1);
ok('۲۷: پاسخ → ۱۹', await page.locator('#scr-27 .notif .act[data-go="19"]').count() === 1);
ok('۲۷: قیمت لیست → ۰۹', await page.locator('#scr-27 .notif .act[data-go="09"]').count() === 1);
ok('۲۷: یادآور کهنگی → ۴۴', await page.locator('#scr-27 .notif .act[data-go="44"]').count() === 1);
ok('۲۷: مصرف تبلیغ → ۳۰', await page.locator('#scr-27 .notif .act[data-go="30"]').count() === 1);
ok('۲۷: بدون «گوش به زنگ/فرصت بازار»', !(await page.locator('#scr-27').textContent()).includes('فرصت‌های بازار'));

/* ═══ ۹. ۰۲ — ادغام مالک + خریدار ═══ */
await page.goto(FILE + '#13'); await page.reload(); await sleep(250);
ok('۱۳: بدون خط تخفیف همکار', await page.locator('#scr-13 .cowork-line').count() === 0);
ok('۱۳: بدون آیکون دنبال‌کردن روی کارت', await page.locator('#scr-13 .pcard .gear[data-sheet="sheet-follow"]').count() === 0);
ok('۱۳: بدون آیکون نظرات', await page.locator('#scr-13 .icon-btn[data-sheet="sheet-cmnts"]').count() === 0);
await page.click('#scr-13 .pcard');
await sleep(250);
ok('۱۳: کارت ← ۰۲', await page.locator('#scr-02').isVisible());
ok('۰۲: پنل مالک مخفی برای خریدار', await page.locator('#own-02').isHidden());
ok('۰۲: دکمهٔ افزودن به لیست', await page.locator('[data-addlist]').count() === 1);
await page.click('[data-addlist]');
await sleep(150);
ok('۰۲: افزودن به لیست → تیک سبز', await page.locator('[data-addlist].on').count() === 1);
await page.goto(FILE + '#01'); await page.reload(); await sleep(250);
await page.click('#scr-01 .pcard');
await sleep(250);
ok('۰۱: کارت ← ۰۲ (فروشنده)', await page.locator('#scr-02').isVisible());
ok('۰۲: پنل مالک پیداست برای مالک', await page.locator('#own-02').isVisible());
ok('۰۲: مدیریت — تغییر قیمت', (await page.locator('#own-02').textContent()).includes('تغییر قیمت'));
ok('۰۲: بدون خط همکار', await page.locator('#cw-02').count() === 0);

/* ═══ ۱۰. لیست خرید (۰۸) → تابلو (۰۹) ═══ */
await page.goto(FILE + '#08'); await page.reload(); await sleep(250);
ok('۰۸: کارت لیست ← تابلوی ۰۹', (await page.locator('#scr-08 .bl-card').first().getAttribute('data-go')) === '09');
ok('۰۸: کارت درخواست جاری ← گفتگو', (await page.locator('#scr-08 .bl-rfq').first().getAttribute('data-go')) === '19');
ok('۰۸: بدون لینک «همه درخواستها»', await page.locator('#scr-08 .morelnk[data-go="11"]').count() === 0);
ok('۰۸: مهر تازگی روی ردیف', (await page.locator('#scr-08 .bl-fresh').first().textContent()).length > 3);
ok('۰۸: بدون آیکون چشم ۲۳', await page.locator('#scr-08 .icon-btn[data-go="23"]').count() === 0);
await page.click('#scr-08 .bl-card');
await sleep(250);
ok('۰۸: لمس کارت ← ۰۹', await page.locator('#scr-09').isVisible());
ok('۰۹: بدون «تأمین‌کننده دیگری پیدا کن»', !(await page.locator('#scr-09').textContent()).includes('پیدا کن'));
ok('۰۹: اکشن‌بار ← ۱۲', (await page.locator('#scr-09 .action-bar .btn').getAttribute('data-go')) === '12');
ok('۰۹: فروشندهٔ ویژه (تبلیغ) مانده', (await page.locator('#scr-09').textContent()).includes('فروشندهٔ ویژه'));

/* ═══ ۱۱. ۴۴ — قیمت و موجودی ═══ */
await page.goto(FILE + '#44'); await page.reload(); await sleep(250);
ok('۴۴: بنر کهنگی قیمت', await page.locator('#bk-stale').isVisible());
ok('۴۴: بدون آیکون اکسل', await page.locator('#scr-44 .bk-xls').count() === 0);
ok('۴۴: بدون بخش تخفیف‌ها', await page.locator('#bk-disc').count() === 0 && await page.locator('.disc-toggle').count() === 0);
ok('۴۴: دکمهٔ «قیمت‌ها درست است»', await page.locator('#bk-fresh').isVisible());
ok('۴۴: گرید ۵ ردیف', await page.locator('#scr-44 .bk-row').count() === 5);
await page.click('#bk-fresh');
await sleep(1100);
ok('۴۴: تأیید همه → کاتالوگ', await page.locator('#scr-01').isVisible());
await page.goto(FILE + '#44'); await page.reload(); await sleep(250);
await page.fill('#scr-44 .bk-row .bk-price', '۲٬۹۰۰٬۰۰۰');
await sleep(150);
ok('۴۴: ردیف ویرایش‌شده نشان می‌گیرد', await page.locator('#scr-44 .bk-row.chg').count() >= 1);
await page.click('#bk-save');
await sleep(1100);
ok('۴۴: ثبت → کاتالوگ ۰۱', await page.locator('#scr-01').isVisible());
const cardP = await page.locator('#scr-01 .pcard').first().locator('.p').textContent();
ok('۴۴: قیمت روی کارت کاتالوگ نشست', cardP.includes('۲٬۹۰۰٬۰۰۰'));

/* ═══ ۱۲. فرم ۰۴ — ظرایف (حکم مالک) ═══ */
await page.goto(FILE + '#04'); await page.reload(); await sleep(250);
ok('۰۴: بدون کمترین بازار', await page.locator('.gf-mkt').count() === 0);
ok('۰۴: بدون خط قیمت نرمال‌شده', await page.locator('#gf-unithint').count() === 0);
ok('۰۴: بدون لینک اکسل', await page.locator('#scr-04 #gf-step1 .gf-alt').count() === 0);
await page.fill('#gf-q', 'هاشمی');
await sleep(200);
await page.click('.gf-row');
await sleep(250);
ok('۰۴: گام ۲ باز شد', await page.locator('#gf-step2').isVisible());
ok('۰۴: فیلد حداقل سفارش هست', await page.locator('#gf-min').count() === 1);
// چک هندسی: باکس حداقل سفارش داخل کادر والدش
const minBox = await page.locator('#gf-min').boundingBox();
const minWrap = await page.locator('#gf-min').locator('..').boundingBox();
ok('۰۴: حداقل سفارش از کادر بیرون نزده', minBox && minWrap && minBox.x >= minWrap.x - 1 && minBox.x + minBox.width <= minWrap.x + minWrap.width + 1);
const ta = await page.locator('#gf-note').boundingBox();
ok('۰۴: توضیحات بلندتر (≥۱۰۰px)', ta && ta.height >= 100);
// ریتم عمودی: فاصلهٔ همهٔ fieldها از ۱۳px شروع می‌شود
const tops = await page.evaluate(() => {
  return Array.from(document.querySelectorAll('#scr-04 #gf-step2 .field')).map(f => parseFloat(getComputedStyle(f).marginTop));
});
ok('۰۴: ریتم عمودی یکنواخت (۱۳px)', tops.length >= 3 && tops.every(t => Math.abs(t - 13) < 0.6));

/* ═══ ۱۳. تنظیمات دستیارها ═══ */
await page.goto(FILE + '#07'); await page.reload(); await sleep(250);
ok('۰۷: تبلیغات و افزایش فروش', await page.locator('#scr-07 [data-go="30"]').count() === 1);
ok('۰۷: بدون کمپین/مشتریان من', !(await page.locator('#scr-07').textContent()).includes('کمپین') && !(await page.locator('#scr-07').textContent()).includes('مشتریان من'));
ok('۰۷: تنظیمات کاتالوگ (cset)', await page.locator('#scr-07 [data-sheet="sheet-cset"]').count() === 1);
await page.goto(FILE + '#14'); await page.reload(); await sleep(250);
ok('۱۴: تنظیمات لیست خرید', await page.locator('#scr-14 [data-sheet="sheet-listset"]').count() === 1);
ok('۱۴: بدون تنظیمات اعلان‌ها', !(await page.locator('#scr-14').textContent()).includes('اعلان‌ها'));
ok('۱۴: بدون کاتالوک‌های ذخیره‌شده (رفت به ۴۲)', await page.locator('#scr-14 [data-go="10"]').count() === 0);

/* ═══ ۱۴. cset شیت ═══ */
await page.goto(FILE + '#01'); await page.reload(); await sleep(250);
await page.click('#scr-01 .showcase .icon-btn[data-sheet="sheet-cset"]');
await sleep(300);
ok('cset: باز شد', await page.locator('#sheet-cset.show').isVisible());
const csetTxt = await page.locator('#sheet-cset').textContent();
ok('cset: تبلیغات و افزایش فروش', csetTxt.includes('تبلیغات و افزایش فروش'));
ok('cset: قیمت‌ها را کی ببیند', csetTxt.includes('قیمت‌های من را کی ببیند'));
ok('cset: بدون کمپین/گزارش/کیف پول', !csetTxt.includes('کمپین') && !csetTxt.includes('گزارش تبلیغ') && !csetTxt.includes('کیف پول'));

/* ═══ ۱۵. e2e — همهٔ صفحه‌ها بدون خطای کنسول ═══ */
for (const s of ALIVE) {
  await page.goto(FILE + '#' + s);
  await page.reload();
  await sleep(140);
}
ok('e2e: صفر خطای کنسول/pageerror در همهٔ صفحه‌ها', errors.length === 0);
if (errors.length) console.log('  errors:', errors.slice(0, 6));

console.log('\n═══ فاز ۴۴ ═══');
console.log('PASS: ' + pass + ' / ' + (pass + fail));
if (fail) process.exitCode = 1;
await browser.close();
