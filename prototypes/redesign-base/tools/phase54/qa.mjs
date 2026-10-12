// فاز ۵۴ — QA قطعی: اصلاحات فرم استعلام ۱۲ + ثبت‌نام
// ۱) مودال «افزودن کالا»: اینپوت جستجو کل کادر را می‌گیرد + دیگر هیچ شیت مزاحمی (باگ اسکرول #phone)
//    داخل قاب نمی‌آید (فرم پروفایل!) ۲) «تأمین‌کنندگان بیشتر» درجا تا ۲۰ (مودال حذف شد)
// ۳) بج درصد انطباق نزولی + توقیح مرتب‌سازی ۴) پلیس‌هولدر توضیح برای فروشنده (متن مالک)
// ۵) مدال «شرایط استفاده» ثبت‌نام باز می‌شود + پذیرش تیک را روشن می‌کند (بازگردانی فاز ۳۴)
import { chromium } from 'playwright';
import { mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const OUT = resolve(ROOT, '..', '..', '..', 'shots-p54'); /* خارج از ریپو — قاعدهٔ فاز ۵۰+ */
mkdirSync(OUT, { recursive: true });
const FILE = 'file://' + resolve(ROOT, 'index.html');
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 402, height: 874 } });
const errors = [];
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });

await page.goto(FILE);
await page.evaluate(() => localStorage.setItem('imach-assist', JSON.stringify({ sell: true, buy: true })));

const shot = async (n) => { await page.screenshot({ path: OUT + '/' + n + '.png' }); };
let ok = 0, bad = 0;
const T = (name, cond) => { if (cond) { ok++; } else { bad++; console.log('  ✗ ' + name); } };

/* ═══ ۱. مودال «افزودن کالا» — اینپوت جستجو کل کادر را می‌گیرد (باگ ۱ مالک) ═══ */
await page.goto(FILE + '#12'); await page.reload(); await sleep(350);
await page.click('#iq-add'); await sleep(520);
T('مودال کالا: باز شد', await page.locator('#sheet-iqpick.show').count() === 1);
T('جستجو: اینپوت تقریباً کل کادر را پر می‌کند (≥۸۴٪ عرض)', await page.evaluate(() => {
  const bar = document.querySelector('#sheet-iqpick .searchbar').getBoundingClientRect();
  const inp = document.querySelector('#iqp-q').getBoundingClientRect();
  return bar.width > 0 && inp.width >= bar.width * 0.84;
}));
T('جستجو: ارتفاع بصری یکدست (اینپوت مرکز ۴۴px کادر)', await page.evaluate(() => {
  const bar = document.querySelector('#sheet-iqpick .searchbar').getBoundingClientRect();
  const inp = document.querySelector('#iqp-q').getBoundingClientRect();
  const mid = (inp.top + inp.bottom) / 2;
  return mid > bar.top + 8 && mid < bar.bottom - 8;
}));

/* ═══ ۲. باگ «فرم پروفایل» — گوشی دیگر اسکرول نمی‌خورد؛ هیچ شیت مخفی‌ای در قاب نیست ═══ */
T('باگ اسکرول: #phone قابل اسکرول نیست (overflow:clip → scrollTop=0)', await page.evaluate(() => {
  const ph = document.getElementById('phone');
  ph.scrollTop = 40; /* تلاش برای اسکرول برنامه‌ای */
  return ph.scrollTop === 0 && getComputedStyle(ph).overflow === 'clip';
}));
T('باگ پروفایل: هیچ شیت مخفی‌ای داخل قاب نیامده', await page.evaluate(() => {
  const bads = [];
  document.querySelectorAll('.sheet').forEach(sh => {
    if (sh.classList.contains('show')) return;
    const r = sh.getBoundingClientRect();
    if (r.top < innerHeight - 8 && r.bottom > 8) bads.push(sh.id);
  });
  return bads.length === 0;
}));
T('باگ پروفایل: فرم ویرایش پروفایل (sheet-ppedit) بیرون قاب است', await page.evaluate(() => {
  const r = document.getElementById('sheet-ppedit').getBoundingClientRect();
  return r.top >= innerHeight - 2;
}));
T('مودال: فرم ۱۲ پشت مودال سالم است (تیتر سر جای خودش)', (await page.locator('#scr-12 .ttl').textContent()).includes('درخواست قیمت'));
await shot('01-iqpick-fixed');

/* ═══ ۳. پلیس‌هولدر «توضیح برای فروشنده» (متن دقیق مالک) ═══ */
await page.click('#sheet-iqpick .iqp-bar .btn'); await sleep(300);
const ph = await page.getAttribute('#iq-note', 'placeholder');
T('۱۲: پلیس‌هولدر توضیح برای فروشنده = متن مالک', ph.includes('جزئیات درخواست مانند کیفیت، شرایط پرداخت، نحوه تحویل') && ph.includes('پیشنهادات و جوابهای دقیقتری دریافت کنید'));
T('۱۲: پلیس‌هولدر قدیمی حذف شد', !ph.includes('مثلاً: تحویل قزوین'));

/* ═══ ۴. درصد انطباق — بج روی همهٔ ردیف‌ها + نزولی + توقیح مرتب‌سازی ═══ */
T('۱۲: توقیح «مرتب بر اساس درصد انطباق» بالای لیست', (await page.locator('.iq-sorthint').textContent()).includes('درصد انطباق'));
T('۱۲: بج انطباق روی ۵ ردیف اول', await page.locator('#iq-recips .iq-match').count() === 5);
T('۱۲: بج انطباق متن فارسی دارد (٪ انطباق)', (await page.locator('#iq-recips .iq-match').first().textContent()).includes('انطباق'));
T('۱۲: انطباق نزولی است (۹۶ → …)', await page.evaluate(() => {
  const ms = Array.from(document.querySelectorAll('#iq-recips .iq-recip')).map(r => +r.dataset.match);
  return ms.length === 5 && ms.every((v, i) => i === 0 || ms[i - 1] >= v) && ms[0] === 96;
}));
T('۱۲: اولین ردیف هم بج ویژه دارد و هم ٪۹۶', (await page.locator('#iq-recips .iq-recip').first().textContent()).includes('فروشندهٔ ویژه') && (await page.locator('#iq-recips .iq-recip').first().textContent()).includes('۹۶'));

/* ═══ ۵. «تأمین‌کنندگان بیشتر» درجا (مودال حذف شد) ═══ */
T('۱۲: مودال suppick از DOM حذف شده', await page.locator('#sheet-suppick').count() === 0);
await page.click('#iq-more'); await sleep(320);
T('۱۲: «بیشتر» درجا ۱۲ ردیف لود کرد (بدون مودال)', await page.locator('#iq-recips .iq-recip').count() === 12);
T('۱۲: شمارندهٔ سرتیتر = ۱۲ تأمین‌کننده', (await page.locator('#iq-recip-more').textContent()).includes('۱۲'));
T('۱۲: دکمه به «نمایش کمتر» + حالت open تغییر کرد', (await page.locator('#iq-more span').textContent()).includes('نمایش کمتر') && await page.locator('#iq-more.open').count() === 1);
T('۱۲: بج انطباق روی هر ۱۲ ردیف', await page.locator('#iq-recips .iq-match').count() === 12);
T('۱۲: انطباق نزولی در کل ۱۲ ردیف', await page.evaluate(() => {
  const ms = Array.from(document.querySelectorAll('#iq-recips .iq-recip')).map(r => +r.dataset.match);
  return ms.length === 12 && ms.every((v, i) => i === 0 || ms[i - 1] >= v);
}));
await shot('02-more-inline');
/* تیک ردیف ششم (پخش برنج عطایی) */
await page.click('#iq-recips .iq-recip:nth-child(6)'); await sleep(220);
T('۱۲: تیک آزاد در تک‌قلمی — ارسال به ۴', (await page.locator('#rfq-send').textContent()).includes('۴'));
await page.click('#iq-more'); await sleep(320); /* جمع‌کردن */
T('۱۲: جمع‌کردن → ۵ ردیف + ردیف تیک‌خورده می‌ماند (۶)', await page.locator('#iq-recips .iq-recip').count() === 6);
T('۱۲: دکمه به «مشاهدهٔ … بیشتر» برگشت', (await page.locator('#iq-more span').textContent()).includes('بیشتر'));

/* ═══ ۶. چندقلمی — اجماع درجا (تیک قفل + متن صادق) ═══ */
await page.click('#iq-add'); await sleep(320);
await page.click('[data-iqid="r4"]'); await sleep(220); /* پفک مینو */
await page.click('#sheet-iqpick .iqp-bar .btn'); await sleep(300);
T('۱۲: چندقلمی → متن اجماع دیده می‌شود', (await page.locator('#iq-recips').textContent()).includes('استعلام چندقلمی به همهٔ کسانی') && (await page.locator('#iq-recips').textContent()).includes('تیک‌ها قفلند'));
T('۱۲: چندقلمی → همهٔ ردیف‌ها data-lock (اجماع = همه گیرنده‌اند)', await page.locator('#iq-recips [data-lock]').count() === 12);
await page.click('#iq-recips .iq-recip:nth-child(2)'); await sleep(200);
T('۱۲: چندقلمی → تیک قفل است (کلیک تیک را خاموش نمی‌کند)', await page.locator('#iq-recips .checkbox.on').count() === 12);
await page.click('#iq-more'); await sleep(300);
T('۱۲: چندقلمی «بیشتر» → همهٔ ۱۲ دارندگان', await page.locator('#iq-recips .iq-recip').count() === 12 && await page.locator('#iq-recips .checkbox.on').count() === 12);
await shot('03-multi-inline');

/* ═══ ۷. مدال «شرایط استفاده» ثبت‌نام ۱۶ (بازگردانی) ═══ */
await page.goto(FILE + '#16'); await page.reload(); await sleep(350);
T('۱۶: لینک «شرایط استفاده» موجود', await page.locator('[data-termsopen]').count() === 1);
await page.click('[data-termsopen]'); await sleep(400);
T('مدال شرایط: باز شد', await page.locator('#dlg-terms.show').count() === 1);
T('مدال شرایط: متن کامل (مقدمه تا مادهٔ ۱۲)', await page.evaluate(() => {
  const tx = document.querySelector('#dlg-terms .tm-body').textContent;
  return tx.includes('مقدمه') && tx.includes('ماده ۱ ') && tx.includes('ماده ۱۲');
}));
T('مدال شرایط: کلیک روی لینک تیک چک‌باکس را برنگرداند (تیک روشن ماند)', await page.locator('#scr-16 .checkrow .checkbox.on').count() === 1);
await shot('04-terms');
/* بستن با × بعد پذیرش */
await page.evaluate(() => document.querySelector('#scr-16 .checkrow .checkbox').classList.remove('on'));
await page.click('#dlg-terms [data-close]'); await sleep(250);
await page.click('[data-termsopen]'); await sleep(350);
await page.click('[data-termsok]'); await sleep(300);
T('مدال شرایط: «مطالعه کردم و می‌پذیرم» → تیک روشن + بستن', await page.locator('#scr-16 .checkrow .checkbox.on').count() === 1 && await page.locator('#dlg-terms.show').count() === 0);

/* ═══ ۸. e2e — همهٔ ۲۶ صفحه بدون خطا ═══ */
const PAGES = ['01','02','04','05','07','08','09','10','12','13','15','16','17','18','19','22','27','29','30','34','42','44','45','46','48','53'];
let e2e = 0;
for (const p of PAGES) {
  await page.goto(FILE + '#' + p); await page.reload(); await sleep(170);
  if (errors.length) { console.log('  ✗ console/page error در صفحهٔ ' + p + ': ' + errors[0]); bad++; errors.length = 0; }
  else e2e++;
}
T('e2e: همهٔ ۲۶ صفحه بدون خطای کنسول', e2e === PAGES.length);

console.log('\n═══ فاز ۵۴ ═══');
console.log('PASS: ' + ok + ' / FAIL: ' + bad);
if (errors.length) console.log('errors:', errors.join(' | '));
await browser.close();
process.exit(bad ? 1 : 0);
