// فاز ۴۷ — QA رفتاری: فرم پیشنهاد قیمت (۴۷) · مقایسهٔ پیشنهادها (۴۸) · استعلام جدید (۱۲) ·
// پاکسازی ۰۹ (تماس/کاتالوگ/ذخیره + حذف کارت ۲٫۵٪ + سورت ایمچ) · پیل سوییچر · آیکون پروفایل ·
// فاصله‌گذاری فرم‌ها (۳۰/۴۲) · آیکون‌های ۴۲ + e2e همهٔ صفحه‌ها
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
const ALIVE = ['01','02','04','05','07','08','09','10','12','13','15','16','17','18','19','22','27','29','30','34','42','44','45','46','47','48'];
ok('همهٔ ۲۶ صفحه داخل قاب گوشی‌اند', await page.evaluate(() => document.querySelectorAll('#phone > section.scr').length === 26));
ok('هیچ صفحه‌ای بیرون از گوشی نیست', await page.evaluate(() => document.querySelectorAll('#stage > .scr, body > .scr').length === 0));
ok('ارتفاع سند در محدوده', await page.evaluate(() => document.documentElement.scrollHeight <= 1000));
for (const s of ALIVE) ok('صفحهٔ ' + s + ' موجود است', await page.locator('#scr-' + s).count() === 1);

/* ═══ ۲. پیل سوییچر (فاز ۴۷: پس‌زمینه‌دار + فلش پایین) ═══ */
ok('پیل سوییچر پس‌زمینه دارد', await page.evaluate(() => {
  const p = document.querySelector('#scr-01 .arm-pill');
  return p && getComputedStyle(p).backgroundColor !== 'rgba(0, 0, 0, 0)' && getComputedStyle(p).borderRadius === '999px';
}));
ok('فلش پیل رو به پایین است', await page.evaluate(() => {
  const want = 'M6 9.5l6 6 6-6';
  return Array.from(document.querySelectorAll('.arm-pill .caret')).every(c => c.querySelector('path').getAttribute('d') === want);
}));

/* ═══ ۳. آیکون پروفایل به‌جای آواتار (۵ هدر) ═══ */
for (const s of ['01','05','07','08','18']) {
  ok('آیکون پروفایل (i-user) در هدر ' + s, await page.locator('#scr-' + s + ' .appbar .icon-btn[data-go="42"] svg use[href="#i-user"]').count() === 1);
}
ok('هیچ آواتار متنی در هدرها نمانده', await page.evaluate(() => document.querySelectorAll('.appbar .avatar').length === 0));

/* ═══ ۴. صفحهٔ ۰۹ — فقط تماس/کاتالوگ/ذخیره + سورت ایمچ ═══ */
await page.goto(FILE + '#09'); await page.reload(); await sleep(250);
ok('۰۹: کارت «۲٫۵٪ ارزان‌تر از تأمین‌کنندگان فعلی» حذف شد', !(await page.locator('#scr-09').textContent()).includes('تأمین‌کنندگان فعلی'));
ok('۰۹: هیچ دکمهٔ «درخواست قیمت» روی کارت‌ها نیست', await page.locator('#scr-09 .sup-actions', { hasText: 'درخواست قیمت' }).count() === 0);
ok('۰۹: سه کارت تأمین‌کننده با ۳ ردیف اکشن', await page.locator('#scr-09 .supplier-card').count() === 3 && await page.locator('#scr-09 .sup-actions').count() === 3);
const acts9 = await page.locator('#scr-09 .sup-actions').allTextContents();
ok('۰۹: اکشن‌ها فقط تماس/کاتالوگ/ذخیره‌اند', acts9.every(a => a.includes('تماس') && a.includes('کاتالوگ') && a.includes('ذخیره')));
ok('۰۹: سورت «ایمچ» اول لیست و فعال', await page.evaluate(() => {
  const c = document.querySelectorAll('#scr-09 .chips .chip');
  return c[0].textContent.trim() === 'ایمچ' && c[0].classList.contains('active');
}));
ok('۰۹: اکشن‌بار استعلام مانده (ورودی درخواست از تابلو)', await page.locator('#scr-09 .action-bar [data-go="12"]').count() === 1);

/* ═══ ۵. فرم ۱۲ — سازندهٔ استعلام (تک/چندقلمی) ═══ */
await page.goto(FILE + '#12'); await page.reload(); await sleep(300);
ok('۱۲: پیش‌فرض برنج هاشمی (ورود از تابلو)', (await page.locator('#scr-12 #iq-sub').textContent()).includes('برنج هاشمی'));
ok('۱۲: یک قلم + استپر', await page.locator('#scr-12 .iq-item').count() === 1 && await page.locator('#scr-12 .iq-item .qty-stepper').count() === 1);
ok('۱۲: بج پوشش در حالت تک‌قلمی مخفی است', await page.evaluate(() => Array.from(document.querySelectorAll('#scr-12 .iq-cov')).every(b => b.hidden)));
ok('۱۲: دکمهٔ ارسال «۳ تأمین‌کننده»', (await page.locator('#rfq-send').textContent()).includes('۳'));

await page.click('#iq-add'); await sleep(200);
ok('۱۲: جستجوی افزودن کالا باز شد', await page.locator('#iq-search').isVisible());
await page.fill('#iq-q', 'روغن'); await sleep(250);
ok('۱۲: نتایج جستجو آمد', await page.locator('#iq-res .gf-row').count() >= 1);
await page.click('#iq-res .gf-row >> nth=0'); await sleep(250);
ok('۱۲: دو قلم شد', await page.locator('#scr-12 .iq-item').count() === 2);
ok('۱۲: بج پوشش ظاهر شد (n از ۲ قلم)', await page.evaluate(() => Array.from(document.querySelectorAll('#scr-12 .iq-cov')).filter(b => !b.hidden && /از ۲ قلم/.test(b.textContent)).length >= 2));
ok('۱۲: گیرنده‌ها = هر که حداقل یک قلم را دارد', (await page.locator('#iq-recip-more').textContent()).includes('حداقل یک قلم'));
ok('۱۲: همهٔ گیرنده‌ها تیک خوردند (اجتماع)', await page.evaluate(() => document.querySelectorAll('#scr-12 .checkbox.on').length === 4));
ok('۱۲: دکمهٔ ارسال ۴ تأمین‌کننده شد', (await page.locator('#rfq-send').textContent()).includes('۴'));
await page.click('#scr-12 .iq-rm'); await sleep(200);
ok('۱۲: حذف قلم کار می‌کند (۱ قلم ماند)', await page.locator('#scr-12 .iq-item').count() === 1);

await page.click('#rfq-send'); await sleep(1100);
ok('۱۲: پس از ارسال به استعلام‌ها (۴۵) می‌رویم', await page.locator('#scr-45').isVisible());

/* ═══ ۶. صفحهٔ ۴۵ — استعلام جدید + کارت‌ها ═══ */
ok('۴۵: دکمهٔ «استعلام جدید» هست', await page.locator('#scr-45 #inq-new[data-newinq]').count() === 1);
ok('۴۵: کارت چندقلمی (۳ قلمی) هست', (await page.locator('#scr-45').textContent()).includes('استعلام ۳ قلمی'));
ok('۴۵: برچسب «مقایسهٔ پیشنهادها» (نه گفتگو)', (await page.locator('#scr-45 .inq-act').first().textContent()).includes('مقایسهٔ پیشنهادها'));

await page.click('#scr-45 #inq-new'); await sleep(300);
ok('استعلام جدید → ۱۲ باز شد', await page.locator('#scr-12').isVisible());
ok('۱۲: حالت جدید — بدون قلم + راهنما', await page.locator('#scr-12 .iq-empty').count() === 1 && (await page.locator('#iq-sub').textContent()).includes('انتخاب کالاهای استعلام'));

/* ═══ ۷. صفحهٔ ۴۸ — مقایسهٔ پیشنهادها (تک‌قلمی) ═══ */
await page.goto(FILE + '#45'); await page.reload(); await sleep(300);
await page.click('#scr-45 .inq-card[data-inq="inq1"]'); await sleep(350);
ok('۴۵ → ۴۸: صفحهٔ مقایسه باز شد', await page.locator('#scr-48').isVisible());
ok('۴۸: ۳ پیشنهاد برنج', await page.locator('#scr-48 #of48-list .card').count() === 3);
ok('۴۸: سورت «ایمچ» فعال', await page.evaluate(() => document.querySelector('#of48-sort [data-ofsort="imch"]').classList.contains('active')));
ok('۴۸: ترتیب ایمچ = پارس، آریو، کیان', (await page.locator('#scr-48 .oc-head .n').allTextContents()).map(t => t.trim()).join('|').startsWith('پخش برنج پارس'));
ok('۴۸: مجموع برای ۲۰ کیسه (۵۶٬۸۰۰٬۰۰۰)', (await page.locator('#scr-48').textContent()).includes('۵۶٬۸۰۰٬۰۰۰'));
ok('۴۸: چیپ «فقط پوشش کامل» در حالت تک‌قلمی مخفی', await page.evaluate(() => document.querySelector('#of48-sort .of48-full').hidden));
await page.click('#of48-sort [data-ofsort="cheap"]'); await sleep(200);
ok('۴۸: سورت ارزان‌ترین → کیان غلات اول', (await page.locator('#scr-48 .oc-head .n').first().textContent()).includes('کیان غلات'));
ok('۴۸: دو عدد خلاصه در حالت تک‌قلمی نیست', await page.locator('#scr-48 .of48-sum').count() === 0);

/* ═══ ۸. صفحهٔ ۴۸ — چندقلمی: پوشش + دو عدد + فیلتر ═══ */
await page.goto(FILE + '#45'); await page.reload(); await sleep(300);
await page.click('#scr-45 .inq-card[data-inq="inq2"]'); await sleep(350);
ok('۴۸: استعلام ۳ قلمی باز شد', (await page.locator('#scr-48').textContent()).includes('استعلام ۳ قلمی'));
ok('۴۸: دو عدد خلاصه هست', await page.locator('#scr-48 .of48-sum .s').count() === 2);
const sum48 = await page.locator('#scr-48 .of48-sum').textContent();
ok('۴۸: «اگر از چند تأمین‌کننده بخریم» = ۱۷۴٬۷۵۰٬۰۰۰', sum48.includes('۱۷۴٬۷۵۰٬۰۰۰'));
ok('۴۸: «همه از یک تأمین‌کننده» = ۱۷۸٬۶۰۰٬۰۰۰', sum48.includes('۱۷۸٬۶۰۰٬۰۰۰'));
ok('۴۸: اختلاف ۳٬۸۵۰٬۰۰۰ اعلام می‌شود', sum48.includes('۳٬۸۵۰٬۰۰۰'));
ok('۴۸: بج پوشش «همهٔ ۳ قلم» و «۲ از ۳ قلم»', (await page.locator('#scr-48').textContent()).includes('همهٔ ۳ قلم') && (await page.locator('#scr-48').textContent()).includes('۲ از ۳ قلم'));
ok('۴۸: چیپ «فقط پوشش کامل» پیدا است', await page.evaluate(() => !document.querySelector('#of48-sort .of48-full').hidden));
ok('۴۸: ترتیب ایمچ چندقلمی = پوشش کامل اول', (await page.locator('#scr-48 .oc-head .n').first().textContent()).includes('تجارت گیل‌رنج'));
ok('۴۸: ردیف «ندارد» برای قلم غایب', (await page.locator('#scr-48').textContent()).includes('ندارد'));
await page.click('#of48-sort .of48-full'); await sleep(250);
ok('۴۸: فیلتر پوشش کامل → فقط ۱ کارت', await page.locator('#scr-48 #of48-list .card').count() === 1);
await page.click('#of48-sort .of48-full'); await sleep(250);
ok('۴۸: برداشتن فیلتر → ۴ کارت', await page.locator('#scr-48 #of48-list .card').count() === 4);
await page.click('#of48-sort [data-ofsort="cheap"]'); await sleep(200);
ok('۴۸: چندقلمی ارزان‌ترین → آریو غلات اول (کوچک‌ترین مجموع)', (await page.locator('#scr-48 .oc-head .n').first().textContent()).includes('آریو غلات'));

/* ═══ ۹. سمت فروشنده: ۰۵ → شیت → ۴۷ ═══ */
await page.goto(FILE + '#05'); await page.reload(); await sleep(300);
ok('۰۵: کارت استعلام ۳ قلمی هست', (await page.locator('#scr-05').textContent()).includes('استعلام ۳ قلمی'));
ok('۰۵: بج «۲ از ۳ قلم نزد شما»', (await page.locator('#scr-05').textContent()).includes('۲ از ۳ قلم نزد شما'));
await page.click('#scr-05 .req-card[data-req="rq2"]'); await sleep(400);
ok('شیت درخواست: اقلام قابل تأمین (روغن+رب)', (await page.locator('#sheet-reqview').textContent()).includes('روغن سرخ‌کردنی لادن') && (await page.locator('#sheet-reqview').textContent()).includes('رب گوجه‌فرنگی'));
ok('شیت درخواست: قلم غایب فقط شمارش', (await page.locator('#sheet-reqview').textContent()).includes('در کاتالوک شما نیست') || (await page.locator('#sheet-reqview').textContent()).includes('در کاتالوگ شما نیست'));
ok('شیت: CTA «ارسال پیشنهاد قیمت» (نه گفتگو)', await page.locator('#sheet-reqview .sheet-cta[data-go="47"]').count() === 1);
await page.click('#sheet-reqview .sheet-cta[data-go="47"]'); await sleep(350);
ok('۴۷: فرم پیشنهاد باز شد', await page.locator('#scr-47').isVisible());
ok('۴۷: فقط ۲ قلمِ موجود (قند نیست)', await page.locator('#scr-47 .of47-item').count() === 2 && !(await page.locator('#scr-47 .of47-item').allTextContents()).join(' ').includes('قند'));
ok('۴۷: شرایط پرداخت + حمل + توضیح', await page.locator('#of47-pay').count() === 1 && await page.locator('#of47-ship').count() === 1 && await page.locator('#of47-note').count() === 1);
await page.fill('#scr-47 .of47-price >> nth=0', '2520000'); await sleep(150);
await page.fill('#scr-47 .of47-price >> nth=1', '1105000'); await sleep(250);
ok('۴۷: مجموع زنده = ۱۶۷٬۱۰۰٬۰۰۰', (await page.locator('#of47-sum').textContent()).includes('۱۶۷٬۱۰۰٬۰۰۰'));
await page.click('#of47-send'); await sleep(1100);
ok('۴۷: پس از ارسال به درخواست‌ها (۰۵) برمی‌گردیم', await page.locator('#scr-05').isVisible());

/* ═══ ۱۰. فاصله‌گذاری فرم‌ها (قاعدهٔ طلایی ۱۳px) ═══ */
await page.goto(FILE + '#30'); await page.reload(); await sleep(300);
ok('۳۰: کادرها فاصلهٔ عمودی ≥ ۱۱px دارند', await page.evaluate(() => {
  const cards = Array.from(document.querySelectorAll('#scr-30 .screen-body > .card'));
  const out = [];
  for (let i = 1; i < cards.length; i++) out.push(cards[i].getBoundingClientRect().top - cards[i - 1].getBoundingClientRect().bottom);
  return out.length >= 3 && out.every(g => g >= 11);
}));
await page.goto(FILE + '#42'); await page.reload(); await sleep(300);
ok('۴۲: کادرها فاصلهٔ عمودی ≥ ۱۱px دارند', await page.evaluate(() => {
  const kids = Array.from(document.querySelectorAll('#scr-42 .screen-body > *')).filter(k => k.getBoundingClientRect().height > 0);
  const out = [];
  for (let i = 1; i < kids.length; i++) out.push(kids[i].getBoundingClientRect().top - kids[i - 1].getBoundingClientRect().bottom);
  return out.length >= 3 && out.every(g => g >= 11);
}));
ok('۴۲: آیکون‌های کادر کسب‌وکار جمع‌وجور (svg ≤ ۱۷px)', await page.evaluate(() => {
  const svgs = Array.from(document.querySelectorAll('#scr-42 .biz-card svg'));
  return svgs.length >= 2 && svgs.every(s => s.getBoundingClientRect().width <= 17);
}));
ok('۴۲: آواتار کسب‌وکار ۳۸px', await page.evaluate(() => {
  const a = document.querySelector('#scr-42 .biz-card .avatar-lg');
  return a && Math.round(a.getBoundingClientRect().width) === 38;
}));

/* ═══ ۱۱. سازگاری: شیت تک‌قلمی + ۰۸ نوار استعلام ═══ */
await page.goto(FILE + '#05'); await page.reload(); await sleep(300);
await page.click('#scr-05 .req-card[data-req="rq1"]'); await sleep(400);
ok('شیت تک‌قلمی: برنج هاشمی + ۲۰ کیسه', (await page.locator('#sheet-reqview').textContent()).includes('برنج هاشمی'));
await page.click('#sheet-reqview [data-close]'); await sleep(250);
await page.goto(FILE + '#08'); await page.reload(); await sleep(300);
ok('۰۸: نوار استعلام‌های جاری → ۴۵', await page.evaluate(() => Array.from(document.querySelectorAll('#scr-08 .bl-rfq')).every(r => r.dataset.go === '45')));
ok('۰۸: شمار «پیشنهاد» (نه پاسخ)', (await page.locator('#scr-08 .bl-rfq-n').first().textContent()).includes('پیشنهاد'));

/* ═══ ۱۲. e2e — همهٔ ۲۶ صفحه بدون خطای کنسول ═══ */
for (const s of ALIVE) {
  await page.goto(FILE + '#' + s); await page.reload(); await sleep(150);
}
ok('e2e: صفر خطای کنسول در همهٔ صفحه‌ها', errors.length === 0);
if (errors.length) console.log('  errors:', errors.slice(0, 8));

await browser.close();
console.log('\n════ فاز ۴۷: ' + pass + ' PASS / ' + fail + ' FAIL ════');
process.exit(fail ? 1 : 0);
